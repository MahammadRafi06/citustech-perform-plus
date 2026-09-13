"""Private EKS image rollout bridge; intentionally cannot apply arbitrary manifests."""
import base64
import json
import os
import re
import ssl
import urllib.request


def validate(event, registry):
    if event.get('action') not in ('deploy', 'status'):
        raise ValueError('Action must be deploy or status')
    if not re.fullmatch(r'[0-9a-f]{40}', event.get('sha', '')):
        raise ValueError('A full source commit SHA is required')
    images = event.get('images', {})
    if set(images) != {'ui', 'api'}:
        raise ValueError('Both app images are required')
    for component, image in images.items():
        expected = re.escape(f'{registry}/perform-plus/{component}@sha256:')
        if not isinstance(image, str) or not re.fullmatch(expected + r'[0-9a-f]{64}', image):
            raise ValueError('Only configured ECR repositories pinned by digest are accepted')
    return images


def token():
    import boto3
    from botocore.signers import RequestSigner
    session = boto3.session.Session()
    region = os.environ['AWS_REGION']
    service = session.client('sts', region_name=region)
    signer = RequestSigner(service.meta.service_model.service_id, region, 'sts', 'v4', session.get_credentials(), session.events)
    url = signer.generate_presigned_url({
        'method': 'GET',
        'url': f'https://sts.{region}.amazonaws.com/?Action=GetCallerIdentity&Version=2011-06-15',
        'body': {},
        'headers': {'x-k8s-aws-id': os.environ['CLUSTER_NAME']},
        'context': {},
    }, region_name=region, expires_in=60, operation_name='')
    return 'k8s-aws-v1.' + base64.urlsafe_b64encode(url.encode()).decode().rstrip('=')


def request(component, bearer, body=None):
    context = ssl.create_default_context(cadata=base64.b64decode(os.environ['CLUSTER_CA']).decode())
    url = os.environ['CLUSTER_ENDPOINT'] + '/apis/apps/v1/namespaces/perform-plus/deployments/' + component
    headers = {'Authorization': 'Bearer ' + bearer}
    if body is not None:
        headers['Content-Type'] = 'application/strategic-merge-patch+json'
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None, headers=headers, method='PATCH' if body is not None else 'GET')
    with urllib.request.urlopen(req, context=context, timeout=20) as response:
        return json.load(response)


def ready(deployment, component, image, sha):
    spec, status = deployment['spec'], deployment.get('status', {})
    template = spec['template']
    current = next(c['image'] for c in template['spec']['containers'] if c['name'] == component)
    count = spec.get('replicas', 1)
    return (
        current == image
        and template['metadata'].get('annotations', {}).get('perform-plus/source-sha') == sha
        and status.get('observedGeneration', 0) >= deployment['metadata']['generation']
        and status.get('updatedReplicas', 0) == count
        and status.get('availableReplicas', 0) == count
        and status.get('replicas', 0) == count
    )


def handler(event, _context):
    images = validate(event, os.environ['ECR_REGISTRY'])
    bearer = token()
    # Read both targets before making either change; namespace RBAC restricts these names.
    deployments = {name: request(name, bearer) for name in images}
    if event['action'] == 'deploy':
        for name, image in images.items():
            request(name, bearer, {'spec': {'template': {
                'metadata': {'annotations': {'perform-plus/source-sha': event['sha']}},
                'spec': {'containers': [{'name': name, 'image': image}]},
            }}})
        return {'accepted': True, 'sha': event['sha']}
    states = {name: ready(deployments[name], name, image, event['sha']) for name, image in images.items()}
    return {'ready': all(states.values()), 'components': states, 'sha': event['sha']}
