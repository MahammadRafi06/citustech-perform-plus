#!/usr/bin/env python3
"""Run acceptance, then record evidence only for the exact unchanged tested bytes."""
from collections import defaultdict
from datetime import datetime, timezone
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from xml.etree import ElementTree

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
sys.path.insert(0, str(ROOT))
from apps.api.app.risk_models.catalog import CONFIGS, MANIFEST
from apps.api.app.risk_models.evidence import adapter_identity, RECEIPT


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    identity = adapter_identity()
    artifacts = {str(path.relative_to(ROOT)): sha(path) for path in
                 [HERE / 'cases.json', HERE / 'expected.json', HERE / 'generate.py', Path(__file__), HERE.parent / 'test_risk_models.py']}
    reference = json.loads((HERE / 'expected.json').read_text())
    cases = json.loads((HERE / 'cases.json').read_text())
    if reference['cases_sha256'] != sha(HERE / 'cases.json'):
        raise SystemExit('Stock reference inputs changed; regenerate the independent reference first.')
    groups = defaultdict(list)
    for case in cases:
        groups[case['package']].append(case)
    configurations = {}
    for config in CONFIGS.values():
        package = config['package']
        if not package:
            continue
        spec = MANIFEST['packages'][package]
        if reference['packages'][package]['tree_sha256'] != spec['tree_sha256']:
            raise SystemExit('Stock reference and installed package identities differ.')
        observed = {case['segment'] for case in groups[package]}
        if not set(config['supported_segments']).issubset(observed):
            raise SystemExit(f'Missing independent reference segment for {config["id"]}')
        configurations[config['id']] = {
            'asset_sha256': config['asset_sha256'], 'component_sha256': config['component_sha256'],
            'segments': config['supported_segments'], 'service_start': config['service_start'], 'service_end': config['service_end'],
            'run_type': config['run_type'], 'reference_case_ids': [case['id'] for case in groups[package]],
            'source_policy': 'Explicit reviewed eligible-service metadata, date/modality/CRR switch filters; PACE unavailable and MA ESRD unavailable.',
            'forecast_scope': config.get('forecast_assumptions'),
        }
    with tempfile.TemporaryDirectory(prefix='perform-model-acceptance-') as temp:
        junit = Path(temp) / 'acceptance.xml'
        command = [sys.executable, '-m', 'pytest', 'apps/api/tests/test_risk_models.py', '-q', '--junitxml', str(junit)]
        completed = subprocess.run(command, cwd=ROOT, env=dict(os.environ, CT_MODEL_PYTHON=os.environ.get('CT_MODEL_PYTHON', sys.executable)))
        if completed.returncode:
            raise SystemExit(completed.returncode)
        suites = ElementTree.parse(junit).getroot().findall('testsuite')
        counts = {key: sum(int(suite.attrib[key]) for suite in suites) for key in ('tests', 'failures', 'errors', 'skipped')}
        if counts['tests'] < len(cases) or any(counts[k] for k in ('failures', 'errors', 'skipped')):
            raise SystemExit('The complete reference acceptance scope must pass without skips.')
        if adapter_identity() != identity or any(sha(ROOT / path) != digest for path, digest in artifacts.items()):
            raise SystemExit('Source or reference evidence changed during execution; rerun validation.')
        receipt = {
            'schema_version': 1, 'adapter': identity, 'required_reference_cases': len(cases), 'configurations': configurations,
            'acceptance_execution': dict(counts, exit_code=completed.returncode, command=command[:-2],
                completed_at=datetime.now(timezone.utc).isoformat(), python=sys.version,
                dependencies={name: importlib.metadata.version(name) for name in ('numpy', 'pandas', 'PyYAML', 'pytest')},
                junit_sha256=sha(junit)),
            'reference_artifacts': artifacts,
            'independent_reference_method': reference['method'],
            'limits': [
                'Numeric parity with separately executed unchanged official packages for the declared synthetic cases and all listed model segments; not exhaustive proof of every ICD code or clinical source classification.',
                'Clinical eligibility must be supplied from reviewed source and encounter metadata; the scoring engine cannot establish a diagnosis.',
                'Historical V24 remains unvalidated and unavailable. PACE and ordinary MA ESRD are not supported by these packages.',
                'Forecasts use Initial software through September 2026 and are not official Initial or final payment runs.',
                'HHS validation is July 2026 DIY release scope through September, not EDGE replication or actual transfers.',
                'Annual MA and Part D adjustments are application transformations using the cited CMS factors; they are not final payment calculations.'
            ],
        }
        RECEIPT.write_text(json.dumps(receipt, indent=2, sort_keys=True) + '\n')
        print(json.dumps({'tests_passed': counts['tests'], 'adapter_sha256': identity['sha256'], 'receipt_sha256': sha(RECEIPT), 'validated_configurations': list(configurations)}))


if __name__ == '__main__':
    main()
