"""Execute untouched official packages in disposable directories and processes."""
from collections import OrderedDict
import csv
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import threading

from .catalog import MANIFEST, assets_root
from .validation import stable_hash

_verified = {}
_cache = OrderedDict()
_lock = threading.RLock()


def verified_package(key):
    spec = MANIFEST['packages'][key]
    root = assets_root() / key
    if not root.is_dir():
        raise ValueError('Official package is not installed')
    paths = [(name, root / name) for name in sorted(spec['files'])]
    signature = tuple((name, path.stat().st_size, path.stat().st_mtime_ns) for name, path in paths)
    if _verified.get(str(root)) != signature:
        for name, path in paths:
            if hashlib.sha256(path.read_bytes()).hexdigest() != spec['files'][name]:
                raise ValueError(f'Installed official asset changed: {name}')
        _verified[str(root)] = signature
    return root


def _write_csv(path, columns, rows):
    with path.open('w', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=columns)
        writer.writeheader()
        writer.writerows(rows)


def numeric_inputs(config, item):
    """Only model-effective inputs; source eligibility was evaluated before this step."""
    base = {'dob': item['dob'], 'sex': item['sex'], 'orec': item['orec']}
    if config['program'] == 'ACA':
        base.update(aca=item['aca'], diagnoses=sorted({(d['code'], d['service_date']) for d in item['diagnoses']}),
                    ndc=sorted({d['code'] for d in item['ndc']}), hcpcs=sorted({d['code'] for d in item['hcpcs']}))
    else:
        months = item['enrollment']
        base.update(diagnoses=sorted({d['code'] for d in item['diagnoses']}),
                    medicaid=any(m['medicaid'] for m in months),
                    ne_medicaid=any(m['medicaid'] and m['new_enrollee'] for m in months),
                    esrd=any(m['esrd'] for m in months))
    return base


def _stage_inputs(root, config, inputs):
    module = MANIFEST['packages'][config['package']]['model_module']
    directory = root / 'software' / module / 'data/input/user_defined'
    people, diagnoses, ndc, hcpcs = [], [], [], []
    for index, item in enumerate(inputs, 1):
        dob = item['dob'].split('-')
        if config['program'] == 'MA':
            people.append(dict(ID=index, DOB=f'{dob[1]}/{dob[2]}/{dob[0]}', SEX=item['sex'], OREC=item['orec'], LTIMCAID=int(item['medicaid']), NEMCAID=int(item['ne_medicaid'])))
        elif config['program'] == 'Part D':
            people.append(dict(ID=index, DOB=''.join(dob), SEX=item['sex'], OREC=item['orec'], ESRD=int(item['esrd'])))
        else:
            aca = item['aca']
            people.append(dict(ID=index, DOB=''.join(dob), SEX=item['sex'], AGE_LAST=aca['age_last'], METAL=aca['metal'], CSR_INDICATOR=aca['csr_indicator'], ENROLDURATION=aca['enrollment_duration']))
            ndc.extend({'ID': index, 'NDC': code} for code in item['ndc'])
            hcpcs.extend({'ID': index, 'HCPCS': code} for code in item['hcpcs'])
        for diagnosis in item['diagnoses']:
            if config['program'] == 'ACA':
                code, service = diagnosis
                diagnoses.append(dict(ID=index, ICD10=code, DIAGNOSIS_SERVICE_DATE=service.replace('-', '')))
            else:
                diagnoses.append(dict(ID=index, ICD10=diagnosis))
    if config['program'] == 'ACA':
        _write_csv(directory / 'PERSON.csv', ['ID', 'SEX', 'DOB', 'AGE_LAST', 'METAL', 'CSR_INDICATOR', 'ENROLDURATION'], people)
        _write_csv(directory / 'DIAGNOSES.csv', ['ID', 'ICD10', 'DIAGNOSIS_SERVICE_DATE'], diagnoses)
        _write_csv(directory / 'NDC.csv', ['ID', 'NDC'], ndc)
        _write_csv(directory / 'HCPCS.csv', ['ID', 'HCPCS'], hcpcs)
    else:
        columns = ['ID', 'DOB', 'SEX', 'OREC', 'LTIMCAID', 'NEMCAID'] if config['program'] == 'MA' else ['ID', 'SEX', 'OREC', 'ESRD', 'DOB']
        _write_csv(directory / 'beneficiaries.csv', columns, people)
        _write_csv(directory / 'diagnoses.csv', ['ID', 'ICD10'], diagnoses)


def _parse(row):
    result = {}
    for key, value in row.items():
        if value is None or value == '':
            result[key] = None
            continue
        try:
            number = float(value)
            result[key] = number if math.isfinite(number) else None
        except ValueError:
            result[key] = value
    return result


def execute_many(config, prepared):
    root = verified_package(config['package'])
    interpreter = os.environ.get('CT_MODEL_PYTHON', sys.executable)
    vectors = [numeric_inputs(config, row) for row in prepared]
    keys = [stable_hash({'package': config['component_sha256'], 'runtime': interpreter, 'inputs': v}) for v in vectors]
    missing = OrderedDict()
    with _lock:
        for key, vector in zip(keys, vectors):
            if key not in _cache:
                missing.setdefault(key, vector)
        newly_executed = set(missing)
        if missing:
            spec = MANIFEST['packages'][config['package']]
            module = spec['model_module']
            with tempfile.TemporaryDirectory(prefix='perform-cms-') as temp:
                staging = Path(temp) / 'official'
                shutil.copytree(root, staging, ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
                _stage_inputs(staging, config, list(missing.values()))
                env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1', PYTHONHASHSEED='0')
                env.pop('PYTHONPATH', None)
                command = [interpreter, f'software/{module}/transform.py']
                process = subprocess.run(command, cwd=staging, env=env, capture_output=True, text=True,
                                         timeout=int(os.environ.get('CT_MODEL_TIMEOUT', '300')))
                if process.returncode:
                    detail = (process.stderr or process.stdout)[-1800:]
                    raise ValueError(f'Official {module} runner failed: {detail}')
                outputs = list((staging / 'software' / module / 'data/output').glob('*.csv'))
                if len(outputs) != 1:
                    raise ValueError('Official runner did not produce exactly one current output CSV')
                raw_bytes = outputs[0].read_bytes()
                with outputs[0].open(encoding='utf-8-sig', newline='') as stream:
                    rows = list(csv.DictReader(stream))
                indexed = {int(float(row['ID'])): _parse(row) for row in rows}
                if len(indexed) != len(missing) or set(indexed) != set(range(1, len(missing) + 1)):
                    raise ValueError('Official output member inventory does not match staged input')
                output_sha = hashlib.sha256(raw_bytes).hexdigest()
                for index, key in enumerate(missing, 1):
                    row = indexed[index]
                    row.pop('ID', None)
                    _cache[key] = {'row': row, 'output_sha256': output_sha,
                                   'canonical_input_hash': key, 'official_command': command,
                                   'runtime': interpreter, 'output_filename': outputs[0].name}
        values = []
        for key in keys:
            cached = dict(_cache[key])
            cached['cache_reused'] = key not in newly_executed
            values.append(cached)
        # Materialize the whole requested batch before evicting entries: a batch
        # may legitimately contain more distinct vectors than the reusable cache.
        while len(_cache) > 2048:
            _cache.popitem(last=False)
        return values


def clear_cache():
    with _lock:
        _cache.clear()
        _verified.clear()
