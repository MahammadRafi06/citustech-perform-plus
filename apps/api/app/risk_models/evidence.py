"""A reviewed acceptance receipt binds a real test run to these adapter bytes."""
import hashlib
import json
from pathlib import Path

DIRECTORY = Path(__file__).resolve().parent
RECEIPT = DIRECTORY / 'validation-receipt.json'
DIGEST_RECIPE = 'Sorted package-relative *.py paths and assets.json: path UTF-8 + NUL + file bytes + NUL; excludes receipt and bytecode.'


def adapter_identity():
    digest = hashlib.sha256()
    files = {}
    for path in sorted([*DIRECTORY.glob('*.py'), DIRECTORY / 'assets.json'], key=lambda p: p.name):
        data = path.read_bytes()
        digest.update(path.name.encode() + b'\0' + data + b'\0')
        files[path.name] = hashlib.sha256(data).hexdigest()
    return {'sha256': digest.hexdigest(), 'files': files, 'recipe': DIGEST_RECIPE}


def validation_evidence(config):
    identity = adapter_identity()
    missing = {'status': 'reference_evidence_required', 'adapter_sha256': identity['sha256']}
    try:
        receipt = json.loads(RECEIPT.read_text())
        scope = receipt['configurations'][config['id']]
        execution = receipt['acceptance_execution']
        if (receipt['adapter']['sha256'] != identity['sha256'] or
                receipt['adapter']['files'] != identity['files'] or
                scope['asset_sha256'] != config['asset_sha256'] or
                scope['component_sha256'] != config['component_sha256'] or
                scope['segments'] != config['supported_segments'] or
                execution['exit_code'] != 0 or execution['failures'] != 0 or
                execution['errors'] != 0 or execution['skipped'] != 0 or
                execution['tests'] < receipt['required_reference_cases'] or
                not scope['reference_case_ids']):
            return dict(missing, reason='Acceptance receipt does not match current adapter, assets, or declared scope.')
    except (OSError, ValueError, KeyError, TypeError):
        return missing
    return {'status': 'validated for declared scope', 'adapter_sha256': identity['sha256'],
            'receipt_sha256': hashlib.sha256(RECEIPT.read_bytes()).hexdigest(),
            'executed_at': execution['completed_at'], 'tests_passed': execution['tests'],
            'reference_cases': len(scope['reference_case_ids']), 'scope': scope,
            'limits': receipt['limits'], 'reference_artifacts': receipt['reference_artifacts']}
