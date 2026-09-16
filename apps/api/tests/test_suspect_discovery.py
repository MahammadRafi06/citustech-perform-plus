"""Clinical-context fixtures retain stable scope, evidence and confirmation gates."""
import json
from copy import deepcopy
from pathlib import Path

import pytest

from apps.api.app import analytics_experience as analytics, florida_population, suspect_discovery

CONFIG = {'id': 'ma_v28_py2027_forecast', 'name': '2027 CMS-HCC V28',
          'program': 'MA', 'year': 2027, 'model_version': 'V28'}


@pytest.fixture(scope='module')
def state():
    value = json.loads((Path(__file__).parents[3] / 'seed/demo.json').read_text())
    florida_population.migrate(value)
    return value


def report(state, **context):
    return analytics.build(state, state['members'], CONFIG, {'discovery': 'all', **context})


def test_context_cases_have_separate_stable_synthetic_sources(state):
    before = deepcopy(state)
    findings, documents = suspect_discovery.fixtures(state['members'])
    assert len(findings) == 120 and len(documents) == 280
    assert suspect_discovery.fixtures(list(reversed(state['members']))) == (findings, documents)
    assert suspect_discovery.fixtures([{**m, 'synthetic': False} for m in state['members']]) == ([], [])
    output = report(state)
    assert [g['count'] for g in output['discovery_groups']] == [20] * 6
    for case in output['cases']:
        assert len(case['aliases']) == 1 and case['aliases'][0].startswith('DISC-')
        assert case['source_available'] and len(case['sources']) == case['discovery']['record_count']
        assert case['discovery']['confirm'] and case['discovery']['why_missed']
        for source in case['sources']:
            original = next(d for d in documents if d['id'] == source['id'])
            assert original['member_id'] == original['source_member_id'] == case['member_id']
            assert source['origin'] == 'authored_synthetic_fixture'
            assert source['content_hash'] == analytics.digest(original)
            assert source['date'] <= output['as_of']
            assert source['excerpts'] and all(e['page'] and e['section'] for e in source['excerpts'])
    assert state == before


def test_patterns_search_scope_and_exports_are_consistent(state):
    output = report(state)
    for group in output['discovery_groups']:
        filtered = report(state, discovery=group['id'])
        assert len(filtered['cases']) == 20
        assert all(c['discovery']['kind'] == group['id'] for c in filtered['cases'])
        assert filtered['discovery_groups'] == output['discovery_groups']
    first = output['cases'][0]
    assert first['id'] in {c['id'] for c in report(state, q=first['member_name'])['cases']}
    scoped_members = [m for m in state['members'] if m['provider_id'] == first['provider_id']]
    scoped = analytics.build(state, scoped_members, CONFIG, {'discovery': 'all'})
    assert {c['id'] for c in scoped['cases']} == {c['id'] for c in output['cases'] if c['provider_id'] == first['provider_id']}
    payload, _ = analytics.export_bundle(report(state, discovery='timeline'), 'registry', 'json')
    exported = json.loads(payload)
    assert len(exported['suspects']) == 20 and exported['manifest']['context']['discovery'] == 'timeline'
    assert all('sources' not in c and c['discovery']['kind'] == 'timeline' for c in exported['suspects'])
    payload, _ = analytics.export_bundle(output, 'registry', 'json', ids=[first['id']], excerpts=True)
    assert json.loads(payload)['suspects'] == [first]


def test_clinical_uncertainty_dates_and_evidence_access_remain_explicit(state):
    output = report(state)
    for case in output['cases']:
        if case['discovery']['kind'] == 'timeline':
            assert case['delta'] is None and case['category'] == 'NC'
            assert 'alone' in case['discovery']['confirm']
        if case['discovery']['kind'] == 'conflicting':
            assert (case['delta'] is None or case['delta'] < 0) and case['direction'] == 'remove'
            assert case['probability']['base'] is None
    restricted = analytics.build(state, state['members'], CONFIG, {'discovery': 'all'}, include_evidence=False)
    assert len(restricted['cases']) == 120 and all(not c['sources'] for c in restricted['cases'])
    assert not report(state, snapshot='2026-07-15')['cases']
    general = analytics.build(state, state['members'], CONFIG, {})
    all_signals = report(state, discovery='any')
    assert {c['id'] for c in general['cases']} == {c['id'] for c in all_signals['cases']}
    assert general['bases'] == output['bases']
