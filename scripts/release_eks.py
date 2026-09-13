"""Actions-side rollout: AWS CLI handles short-lived OIDC credentials."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time


def aws(*args):
    return json.loads(subprocess.check_output(['aws', *args, '--output', 'json'], text=True))


def main():
    sha = os.environ['GITHUB_SHA']
    registry = os.environ['ECR_REGISTRY']
    images = {}
    for name in ('ui', 'api'):
        detail = aws('ecr', 'describe-images', '--repository-name', f'perform-plus/{name}', '--image-ids', f'imageTag={sha}')
        images[name] = f'{registry}/perform-plus/{name}@' + detail['imageDetails'][0]['imageDigest']
    event = {'action': 'deploy', 'sha': sha, 'images': images}
    with tempfile.TemporaryDirectory() as folder:
        response = Path(folder) / 'response.json'
        def invoke():
            metadata = aws('lambda', 'invoke', '--function-name', 'perform-plus-release', '--cli-binary-format', 'raw-in-base64-out', '--payload', json.dumps(event), str(response))
            payload = json.loads(response.read_text())
            if metadata.get('FunctionError'):
                raise RuntimeError(f'Release bridge rejected the request: {payload}')
            return payload
        if not invoke().get('accepted'):
            raise RuntimeError('Deployment was not accepted')
        event['action'] = 'status'
        for _ in range(72):
            status = invoke()
            print(json.dumps(status), flush=True)
            if status.get('ready'):
                print('Both components are serving the requested source and image digests.')
                return
            time.sleep(10)
        raise RuntimeError('Timed out waiting for both component rollouts')


if __name__ == '__main__':
    main()
