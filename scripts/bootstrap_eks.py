"""Render verified remote-main image digests and apply only the app manifests."""
import argparse
import json
from pathlib import Path
import re
import subprocess
import yaml

ROOT = Path(__file__).resolve().parents[1]
REPO = 'MahammadRafi06/citustech-perform-plus'
CONTEXT = 'meshalloc-control-plane'
REGISTRY = '703671901662.dkr.ecr.us-west-2.amazonaws.com'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--sha', required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    if not re.fullmatch('[0-9a-f]{40}', args.sha):
        raise SystemExit('A full source SHA is required')
    head = subprocess.check_output(['gh', 'api', f'repos/{REPO}/commits/main', '--jq', '.sha'], text=True).strip()
    if head != args.sha:
        raise SystemExit('The requested release is not current remote main')
    images = {}
    for name in ('ui', 'api'):
        raw = subprocess.check_output(['aws', 'ecr', 'describe-images', '--region', 'us-west-2', '--repository-name', f'perform-plus/{name}', '--image-ids', f'imageTag={args.sha}', '--output', 'json'], text=True)
        digest = json.loads(raw)['imageDetails'][0]['imageDigest']
        images[name] = f'{REGISTRY}/perform-plus/{name}@{digest}'
    rendered = subprocess.check_output(['kubectl', 'kustomize', str(ROOT / 'deploy/eks')], text=True)
    documents = list(yaml.safe_load_all(rendered))
    for item in documents:
        if item['kind'] == 'Deployment' and item['metadata']['name'] in images:
            name = item['metadata']['name']
            template = item['spec']['template']
            template['metadata'].setdefault('annotations', {})['perform-plus/source-sha'] = args.sha
            for container in template['spec']['containers']:
                if container['name'] == name:
                    container['image'] = images[name]
    target = ROOT / '.local/aws-deploy/release.yaml'
    target.write_text(yaml.safe_dump_all(documents, sort_keys=False))
    command = ['kubectl', '--context', CONTEXT, 'apply', '-f', str(target)]
    subprocess.run(command + ['--dry-run=server'], check=True)
    if args.apply:
        subprocess.run(command, check=True)
    print('Release manifests:', target)


if __name__ == '__main__':
    main()
