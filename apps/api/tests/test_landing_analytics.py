"""Reconciliation and drill-through contracts for the landing analytics."""
import json
from pathlib import Path
import pytest
from apps.api.app import analytics_experience as a, analytics_landing as landing, florida_population

CFG={'id':'ma_v28_py2027_forecast','name':'2027 CMS-HCC V28','program':'MA','year':2027,'model_version':'V28'}

@pytest.fixture(scope='module')
def state():
    value=json.loads((Path(__file__).parents[3]/'seed/demo.json').read_text())
    florida_population.migrate(value)
    return value

@pytest.fixture(scope='module')
def report(state):
    return a.build(state,state['members'],CFG,{})


def test_matrix_priority_drillthrough_and_export(state,report):
    target=a.build(state,state['members'],CFG,{'closure':'priority','category':'capture'})
    assert target['summary']['cases']==report['landing']['priority_cases']>0
    assert target['summary']['qualified_members']==report['landing']['priority_members']>0
    assert all(landing.opportunity(c)[0]>=.65 and landing.opportunity(c)[1]>=.14 for c in target['cases'])
    group=next(p for p in report['landing']['matrix'] if not p['suppressed'])
    clicked=a.build(state,state['members'],CFG,{'closure':str(group['closure']),'category':'capture','condition':group['name']})
    assert clicked['summary']['qualified_members']==group['members']
    assert clicked['summary']['cases']==group['cases']
    body,_=a.export_bundle(clicked,'registry','json')
    assert len(json.loads(body)['suspects'])==group['cases']


def test_recapture_funnel_heatmap_and_prevalence_reconcile(report):
    r=report['landing']['recapture']
    assert r['prior']==r['confirmed']+r['missing']
    assert r['prior']==sum(p['prior'] for p in report['prevalence'])
    assert r['confirmed']==sum(p['recaptured'] for p in report['prevalence'])
    for p in report['prevalence']:
        final=next(h for h in r['heat'] if h['condition']==p['name'] and h['dimension']=='month' and h['key']==str(len(r['months'])))
        assert final['confirmed']==p['recaptured']
        monthly=[h['confirmed'] for h in r['heat'] if h['condition']==p['name'] and h['dimension']=='month']
        assert monthly==sorted(monthly)


def test_provider_outcomes_are_coherent_and_do_not_close_real_cases(state,report):
    original=json.dumps(state,sort_keys=True)
    providers=report['landing']['providers']
    assert sum(len(p['series']) for p in providers if p['series'])>0
    for p in providers:
        if p['suppressed']: continue
        for month in p['series']:
            assert 0<=month['added']<=month['closed']<=month['rules']
            assert month['rate']==pytest.approx(month['closed']/month['rules'] if month['rules'] else 0)
    first=providers[0]
    scoped=a.build(state,state['members'],CFG,{'practices':[first['id']]})
    assert scoped['landing']['providers'][0]['name']==first['name']
    assert scoped['landing']['providers'][0]['series']==first['series']
    assert json.dumps(state,sort_keys=True)==original


def test_social_filters_use_authorized_scope_and_export_context(state):
    members=state['members'][:700]
    context={'age_band':'75–84','gender':'Female','social_need':'food'}
    expected={m['id'] for m in members if landing.member_matches(m,context)}
    r=a.build(state,members,CFG,context)
    assert r['summary']['enrolled']==len(expected)>0
    assert {c['member_id'] for c in r['cases']}<=expected
    body,_=a.export_bundle(r,'R01','json')
    value=json.loads(body)
    assert value['context']['social_need']=='food'
    assert 'cases' not in value and 'suspects' not in value
    for g in value['landing']['social']:
        if g['suppressed']: assert g['members'] is None and g['share'] is None


def test_small_group_protection_for_all_new_dimensions(state):
    r=a.build(state,state['members'][:12],CFG,{})['landing']
    for name in ['matrix','providers','social']:
        for group in r[name]:
            assert group['suppressed'] and group['members'] is None
    assert all(h['members'] is None for h in r['recapture']['heat'])


def test_dashboard_preserves_scores_and_financials(report):
    bases=report['bases']
    assert bases['captured_baseline']<bases['accepted']<=bases['submitted']<bases['potential']
    assert report['financial']['net']>0
    assert report['landing']['model']['start']==round(bases['captured_baseline'],4)
    assert all(isinstance(c['change'],float) for c in report['landing']['model']['changes'])
    assert report['landing']['origin']=='authored_sample_analytics'
