"""Population identities, persistence, report denominators and scope reconciliation."""
import json
from copy import deepcopy
from pathlib import Path
import pytest
from apps.api.app import population_expansion as p, florida_population, analytics_experience as a

@pytest.fixture(scope='module')
def expanded():
    state=json.loads((Path(__file__).parents[3]/'seed/demo.json').read_text())
    florida_population.migrate(state)
    original=deepcopy(state)
    p.expand(state)
    return state,original


def test_exact_growth_preserves_sources_and_is_idempotent(expanded):
    state, original=expanded
    assert len(state['members'])==len(original['members'])+100_000==p.TARGET_POPULATION
    assert len({m['id'] for m in state['members']})==p.TARGET_POPULATION
    assert state['members'][:10000]==original['members']
    for key in ['documents','opportunities','providers']:
        assert state[key]==original[key]
    p.expand(state)
    assert len(state['members'])==p.TARGET_POPULATION
    assert all(m['state']=='FL' for m in state['members'])


def test_compact_roundtrip_preserves_edits_without_persisting_100k_rows(expanded):
    state=deepcopy(expanded[0])
    member=state['members'][-1]
    member.update(name='Retained Member Edit',county='Polk County')
    saved=json.loads(json.dumps(p.compact(state)))
    assert len(saved['members'])==10001
    p.expand(saved)
    assert {m['id']:m for m in saved['members']}=={m['id']:m for m in state['members']}
    assert len(p.compact(saved)['members'])==10001


def test_full_population_analytics_reconcile(expanded):
    state,_=expanded
    config=dict(id='ma_v28_py2027_forecast',program='MA',year=2027,name='2027 CMS-HCC V28',model_version='V28')
    report=a.build(state,state['members'],config,{})
    summary=report['summary']
    assert summary['enrolled']==p.TARGET_POPULATION
    assert report['percentiles']['median']>1.0
    for key in ['counties','practices']:
        assert sum(r['members'] for r in report[key])==summary['enrolled']
        assert sum(r['eligible'] for r in report[key])==summary['eligible']
        assert sum(r['scored'] for r in report[key])==summary['scored']
    assert sum(r['count'] for r in report['histogram'])==summary['scored']
    assert sum(r['count'] for r in report['categories'])==summary['cases']==len(report['cases'])
    assert summary['cases']>25000
    assert summary['qualified_members']<=summary['eligible']
    for row in report['prevalence']:
        assert row['denominator']==summary['eligible']
        assert row['recaptured']+row['gap']==row['prior']
        assert row['prevalence']==pytest.approx(row['members']*100/summary['eligible'])
    assert sum(r['members'] for r in report['landing']['networks'])==summary['eligible']
    for network in report['landing']['networks']:
        for row in network['series']:
            assert row['identified_to_date']==row['closed_to_date']+row['open_to_date']
            assert row['confirmed_to_date']<=row['closed_to_date']
    assert report['financial']['net']>0
    assert sum(r['net'] for r in report['financial']['scenarios'][1]['monthly'])==pytest.approx(report['financial']['net'])
    for point in report['trend']:
        assert point['baseline']<point['accepted']<=point['submitted']<point['potential']
