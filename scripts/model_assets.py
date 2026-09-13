#!/usr/bin/env python3
"""Install byte-verified official CMS software without committing third-party archives.

python scripts/model_assets.py install --cache .local/research --dest .local/model-assets
Mount the destination read-only at CT_MODEL_ASSETS in the API container.
This installer never installs Python dependencies or executes the downloaded software.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import shutil
import tempfile
from urllib.request import urlopen
import zipfile

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'apps/api/app/risk_models/assets.json'


def extract(archive, target):
    with zipfile.ZipFile(archive) as bundle:
        for entry in bundle.infolist():
            if not (target / entry.filename).resolve().is_relative_to(target.resolve()):
                raise ValueError('Archive contains a path outside its destination')
            if entry.external_attr >> 16 & 0o170000 == 0o120000:
                raise ValueError('Archive symbolic links are not accepted')
        bundle.extractall(target)


def verify(root, spec):
    digest = hashlib.sha256()
    actual = {p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file() and '__pycache__' not in p.parts}
    if actual != set(spec['files']):
        raise ValueError(f'Unexpected package file inventory: {root.name}')
    for name, expected in sorted(spec['files'].items()):
        data = (root / name).read_bytes()
        if hashlib.sha256(data).hexdigest() != expected:
            raise ValueError(f'Package fingerprint mismatch: {name}')
        digest.update(name.encode() + b'\0' + data + b'\0')
    if digest.hexdigest() != spec['tree_sha256']:
        raise ValueError('Package tree fingerprint mismatch')


def install(cache, destination, offline=False):
    metadata = json.loads(MANIFEST.read_text())
    cache.mkdir(parents=True, exist_ok=True)
    destination.mkdir(parents=True, exist_ok=True)
    for archive_id, archive in metadata['archives'].items():
        path = cache / archive['cache_name']
        if not path.exists():
            if offline:
                raise ValueError(f'Offline archive missing: {path}')
            with urlopen(archive['url'], timeout=120) as response:
                data = response.read()
            if hashlib.sha256(data).hexdigest() != archive['sha256']:
                raise ValueError(f'Official download changed: {archive_id}; review a new manifest first')
            path.write_bytes(data)
        if hashlib.sha256(path.read_bytes()).hexdigest() != archive['sha256']:
            raise ValueError(f'Archive fingerprint mismatch: {path.name}')
        for key, spec in metadata['packages'].items():
            if spec['archive'] != archive_id:
                continue
            target = destination / key
            if target.exists():
                verify(target, spec)
                continue
            with tempfile.TemporaryDirectory(prefix='cms-install-', dir=destination) as temp:
                staging = Path(temp) / 'package'
                staging.mkdir()
                if spec['nested_zip']:
                    with zipfile.ZipFile(path) as outer:
                        inner = io.BytesIO(outer.read(spec['nested_zip']))
                    extract(inner, staging)
                    source = staging
                else:
                    extract(path, staging)
                    source = staging / spec['directory']
                verify(source, spec)
                shutil.copytree(source, target)
    receipt = {'manifest_sha256': hashlib.sha256(MANIFEST.read_bytes()).hexdigest(),
               'packages': {key: spec['tree_sha256'] for key, spec in metadata['packages'].items()}}
    (destination / 'installation.json').write_text(json.dumps(receipt, indent=2) + '\n')
    return receipt


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['install', 'verify'])
    parser.add_argument('--cache', type=Path, default=ROOT / '.local/model-downloads')
    parser.add_argument('--dest', type=Path, default=ROOT / '.local/model-assets')
    parser.add_argument('--offline', action='store_true')
    args = parser.parse_args()
    if args.command == 'install':
        result = install(args.cache, args.dest, args.offline)
    else:
        specs = json.loads(MANIFEST.read_text())['packages']
        for key, spec in specs.items():
            verify(args.dest / key, spec)
        result = {'verified_packages': list(specs)}
    print(json.dumps(result, indent=2))
