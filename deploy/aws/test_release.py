import unittest
from release import ready, validate

REGISTRY = '703671901662.dkr.ecr.us-west-2.amazonaws.com'
SHA = 'a' * 40
IMAGES = {name: f'{REGISTRY}/perform-plus/{name}@sha256:' + 'b' * 64 for name in ('ui', 'api')}


class ReleaseBoundaryTests(unittest.TestCase):
    def test_digest_release(self):
        self.assertEqual(validate({'action': 'deploy', 'sha': SHA, 'images': IMAGES}, REGISTRY), IMAGES)

    def test_reject_arbitrary_repository_tag_and_missing_component(self):
        for bad in ('docker.io/other/ui:latest', IMAGES['api'], IMAGES['ui'].split('@')[0] + ':latest'):
            with self.assertRaises(ValueError):
                validate({'action': 'deploy', 'sha': SHA, 'images': {**IMAGES, 'ui': bad}}, REGISTRY)
        with self.assertRaises(ValueError):
            validate({'action': 'deploy', 'sha': SHA, 'images': {'ui': IMAGES['ui']}}, REGISTRY)

    def test_reject_missing_source_and_unsupported_action(self):
        for patch in ({'sha': 'main'}, {'action': 'delete'}):
            with self.assertRaises(ValueError):
                validate({'action': 'deploy', 'sha': SHA, 'images': IMAGES, **patch}, REGISTRY)

    def test_old_ready_pods_do_not_count_as_new_release(self):
        deployment = {'metadata': {'generation': 3}, 'spec': {'replicas': 1, 'template': {'metadata': {'annotations': {'perform-plus/source-sha': SHA}}, 'spec': {'containers': [{'name': 'ui', 'image': IMAGES['ui']}]}}}, 'status': {'observedGeneration': 2, 'updatedReplicas': 1, 'availableReplicas': 1, 'replicas': 1}}
        self.assertFalse(ready(deployment, 'ui', IMAGES['ui'], SHA))
        deployment['status']['observedGeneration'] = 3
        self.assertTrue(ready(deployment, 'ui', IMAGES['ui'], SHA))
        self.assertFalse(ready(deployment, 'ui', IMAGES['ui'], 'c' * 40))


if __name__ == '__main__':
    unittest.main()
