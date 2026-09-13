"""Explain official flags using the pinned official factor and hierarchy tables."""
from collections import Counter, defaultdict
import csv
from functools import lru_cache
import math
import re
from xml.etree import ElementTree
from zipfile import ZipFile

from .catalog import MANIFEST, output_segment, assets_root
from .runner import verified_package


def _csv(path):
    with path.open(encoding='utf-8-sig', newline='') as stream:
        return list(csv.DictReader(stream))


def _number(value):
    try:
        number = float(value)
        return number if math.isfinite(number) else 0.0
    except (TypeError, ValueError):
        return 0.0


def _category(config, value):
    if config['program'] == 'ACA':
        # HHS split categories preserve the underscore suffix (e.g. 35.1 → 035_1).
        text = str(value).replace('.0', '')
        parts = text.split('.')
        return 'HHS_HCC' + parts[0].zfill(3) + ('_' + parts[1] if len(parts) > 1 else '')
    prefix = 'RXHCC' if config['program'] == 'Part D' else 'HCC'
    return prefix + str(int(float(value)))


def _hhs_descriptions(root):
    """Read labels from the original release workbook using only the stdlib."""
    namespace = {'x': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    with ZipFile(next(root.glob('HHS HCC software *tables*.xlsx'))) as workbook:
        shared = ElementTree.fromstring(workbook.read('xl/sharedStrings.xml'))
        strings = [''.join(item.itertext()) for item in shared]

        def rows(sheet):
            document = ElementTree.fromstring(workbook.read(f'xl/worksheets/sheet{sheet}.xml'))
            for row in document.findall('.//x:sheetData/x:row', namespace):
                result = {}
                for cell in row.findall('x:c', namespace):
                    value = cell.find('x:v', namespace)
                    if value is not None:
                        result[re.sub('[0-9]', '', cell.attrib['r'])] = strings[int(value.text)] if cell.attrib.get('t') == 's' else value.text
                yield result

        categories = {_category({'program': 'ACA'}, row['B']): row['D'] for row in rows(4)
                      if row.get('B', '').replace('.', '').isdigit() and row.get('D')}
        diagnoses = {row['B']: row['C'] for row in rows(3)
                     if re.fullmatch('[A-Z][0-9A-Z]{2,6}', row.get('B', '')) and row.get('C')}
        return categories, diagnoses


@lru_cache(maxsize=16)
def _tables(package, root_string):
    from pathlib import Path
    root = Path(root_string)
    verified_package(package)
    module = MANIFEST['packages'][package]['model_module']
    folder = root / 'software' / module / 'data/input/internal'
    mapping = _csv(next(folder.glob('ICD10*csv')))
    by_code = defaultdict(list)
    for row in mapping:
        by_code[row['ICD10']].append(row)
    hierarchy = _csv(next(folder.glob('*[Hh]ierarch*.csv')))
    factors = {}
    for path in list(folder.glob('*Relative_Factors.csv')) + list(folder.glob('*model_factors.csv')):
        factors[path.name] = _csv(path)
    labels, code_labels = _hhs_descriptions(root) if package == 'hhs_2026' else ({}, {})
    return {'mapping': mapping, 'by_code': by_code, 'hierarchy': hierarchy, 'factors': factors, 'labels': labels, 'code_labels': code_labels}


def tables(config):
    # Calculation already verifies the complete immutable package once per batch.
    # Avoid thousands of repeated per-member filesystem inventories.
    root = assets_root() / config['package']
    return _tables(config['package'], str(root))


def _kind(variable):
    if re.match(r'^(?:NE)?[MF][0-9]|^[MF]AGE|MCAID|NMCAID|NESRD', variable):
        return 'demographic'
    if re.match(r'^(HCC|RXHCC|HHS_HCC)[0-9_]+$', variable):
        return 'condition'
    if variable.startswith('ACF'):
        return 'affiliated_cost'
    if variable.startswith('RXC') and '_X_' not in variable:
        return 'prescription'
    if 'ED' in variable or 'ENROLL' in variable:
        return 'enrollment_duration'
    return 'interaction'


def _flag(row, variable):
    choices = [variable, variable.upper(), variable.replace('HHS_HCC', 'HCC')]
    for key in choices:
        if key in row:
            return _number(row[key])
    return 0.0


def components(config, prepared, row, monthly):
    data = tables(config)
    weights = Counter(month['segment'] for month in monthly)
    result = []
    for segment, count in weights.items():
        weight = count / len(monthly)
        if config['program'] == 'ACA':
            group, metal = segment.split('_', 1)
            factors = data['factors'][group.lower() + '_model_factors.csv']
            column = metal.title() + ' Level'
        else:
            column = output_segment(config, segment)
            factors = next((rows for rows in data['factors'].values() if rows and column in rows[0]), [])
        for term in factors:
            variable = term['Variable'].strip()
            value = _flag(row, variable)
            value_origin = None
            if config['program'] == 'ACA' and segment.startswith('INFANT') and prepared['aca']['age_last'] == 0 and prepared['sex'] == 1:
                # Stock utils.py reassigns male age 0 without newborn HCCs before
                # scoring, but transform.py exports the original age flags.
                if any(_flag(row, f'AGE1_X_SEVERITY{n}') for n in range(1, 6)) and variable in ('AGE0_MALE', 'AGE1_MALE'):
                    value = 1.0 if variable == 'AGE1_MALE' else 0.0
                    value_origin = 'Official infant scoring age reassignment; export flag is pre-reassignment'
            coefficient = _number(term.get(column))
            if not value:
                continue
            result.append({'factor': variable, 'description': (term.get('Label') or term.get('New Enrollees') or data['labels'].get(variable) or variable).strip(),
                           'kind': _kind(variable), 'coefficient': coefficient, 'value': value,
                           'contribution': round(value * coefficient * weight, 9), 'segment': segment,
                           'months': count, 'weight': weight,
                           **({'value_origin': value_origin} if value_origin else {})})
    return result


def categories(config, prepared, row):
    data = tables(config)
    by_code = data['by_code']
    result = []
    for diagnosis in prepared['diagnoses']:
        mappings = by_code.get(diagnosis['code'], [])
        if not mappings:
            result.append({'code': diagnosis['code'], 'category': None, 'status': 'excluded',
                           'reason': 'No mapping in the selected official model',
                           'diagnosis_ids': [diagnosis['id']], 'source_ids': [diagnosis['source_id']]})
        for mapping in mappings:
            category = _category(config, mapping['CC'])
            cc = category.replace('HHS_HCC', 'CC').replace('RXHCC', 'RXCC').replace('HCC', 'CC')
            kept = _flag(row, category)
            assigned = _flag(row, cc)
            result.append({'code': diagnosis['code'], 'category': category,
                           'status': 'retained' if kept else 'suppressed' if assigned else 'excluded',
                           'reason': 'Retained after official hierarchy' if kept else 'Suppressed by official hierarchy' if assigned else 'Not assigned after official age/sex/model edits',
                           'diagnosis_ids': [diagnosis['id']], 'source_ids': [diagnosis['source_id']]})
    return result


def lookup(config, query, limit=30):
    verified_package(config['package'])
    data = tables(config)
    term = (query or '').strip().upper().replace('.', '')
    descriptions = dict(data['labels'])
    coeffs = defaultdict(dict)
    for filename, values in data['factors'].items():
        for row in values:
            variable = row['Variable'].strip()
            descriptions[variable] = (row.get('Label') or row.get('New Enrollees') or descriptions.get(variable) or variable).strip()
            for column, value in row.items():
                if column not in ('Variable', 'Label', 'New Enrollees') and value:
                    coeffs[variable][column] = _number(value)
    hierarchies = {}
    for row in data['hierarchy']:
        key = next(iter(row))
        category = row[key]
        if config['program'] == 'Part D':
            category = 'RXHCC' + str(int(float(category)))
        suppressed = []
        for value in list(row.values())[1:]:
            if value:
                suppressed.append('RXHCC' + str(int(float(value))) if config['program'] == 'Part D' else value)
        hierarchies[category] = suppressed
    found = []
    seen = set()
    for row in data['mapping']:
        category = _category(config, row['CC'])
        description = descriptions.get(category, category)
        code_description = data['code_labels'].get(row['ICD10'])
        if term and term not in row['ICD10'] and term not in description.upper() and term not in category and term not in (code_description or '').upper():
            continue
        identity = (row['ICD10'], category)
        if identity in seen:
            continue
        seen.add(identity)
        found.append({'code': row['ICD10'], 'category': category, 'description': description, 'code_description': code_description,
                      'coefficients': coeffs.get(category, {}), 'suppresses': hierarchies.get(category, []),
                      'edits': {key: value for key, value in row.items() if 'CONDITION' in key and value},
                      'config_id': config['id'], 'model_version': config['model_version'], 'year': config['year'],
                      'asset_sha256': config['asset_sha256']})
        if len(found) >= min(max(int(limit), 1), 100):
            break
    return found
