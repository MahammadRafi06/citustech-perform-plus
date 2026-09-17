"""Independent arithmetic and scope fixtures for the analytics presentation."""
import io
import json
import zipfile
from copy import deepcopy
from pathlib import Path
import pytest
from apps.api.app import analytics_experience as a, florida_population

CFG={'id':'ma_v28_py2027_forecast','name':'2027 CMS-HCC V28','program':'MA','year':2027,'model_version':'V28'}

@pytest.fixture(scope='module')
def state():
    value=json.loads((Path(__file__).parents[3]/'seed/demo.json').read_text())
    florida_population.migrate(value)
    return value


def case(mid='A',cid='A',e=.2,p=.8,category='CG'):
    return dict(id=cid,member_id=mid,delta=e,evidence='Strong',category=category,status='open',
        probability=dict(base=p,low=max(0,p-.1) if p is not None else None,high=min(1,p+.1) if p is not None else None))


def test_t01_weighted_mean_and_null_zero():
    assert a.weighted([dict(score=1,weight=12),dict(score=2,weight=6)])==pytest.approx(4/3)
    assert a.weighted([dict(score=0,weight=12)])==0
    assert a.weighted([dict(score=None,weight=12)]) is None
    assert a.quantile([0,1,2,3],.25)==.75

@pytest.mark.parametrize('category,evidence,expected,band',[
    ('CG','Strong',.8,'High'),('RC','Strong',.7,'High'),('NC','Strong',.65,'Medium'),
    ('NC','Limited',.05,'Low'),('CG','Missing',None,'Unknown'),('OC','Strong',None,'Not applicable'),('DR','Strong',None,'Not applicable')])
def test_t05_t20_support_target(category,evidence,expected,band):
    value=a.probability(category,evidence)
    assert value['base']==expected and value['band']==band
    assert value['method']=='SYN_SUPPORT90_V1'


def test_closed_stale_and_unknown_status_never_assumed_open():
    assert a.disposition('unexpected')=='unknown'
    assert a.probability('CG','Strong','resolved')['base'] is None
    assert a.probability('CG','Strong',stale=True)['band']=='Unknown'
    assert a.probability('CG','Strong',excluded=True)['base'] is None


def test_t04_aliases_and_distinct_hcc_questions(state):
    finding=dict(state['opportunities'][0]);duplicate={**finding,'id':'DUPLICATE'}
    other={**finding,'id':'OTHER','condition':'Different heart failure clinical question'}
    rows=a.canonicalize([finding,duplicate,other],state['members'],CFG)
    assert len(rows)==2 and sorted(len(c['aliases']) for c in rows)==[1,2]
    assert len({c['member_id'] for c in rows})==1


def test_t07_financial_golden():
    rows=[case(e=.20,p=.8),case('B','B',.10,.5),case('C','C',.15,.2),case('D','D',-.05,None,'OC')]
    f=a.finance(rows)
    for key,value in dict(gross=5400,support=2160,realized=1944,corrections=-600,net=1344).items():
        assert f[key]==pytest.approx(value)
    assert f['curve'][-1]['Base']==pytest.approx(f['net'])
    assert sum(m['net'] for m in f['scenarios'][1]['monthly'])==pytest.approx(f['net'])


def test_t08_schedule_and_recognition_separation():
    f=a.finance([case()],dict(months=12,recognition=7))
    assert f['realized']==pytest.approx(648)
    assert all(m['realized']==0 for m in f['scenarios'][1]['monthly'][:6])
    correction=a.finance([case(),case('D','D',-.05,None,'OC')],dict(reach=0,realization=0))
    assert correction['realized']==0 and correction['corrections']==-600


def test_t12_frozen_winner_and_child_filter():
    rows=[case(e=.2,p=.8),case('A','second',.3,.5)]
    result=a.finance(rows)
    assert result['selected_ids']==['A'] and result['excluded_ids']==['second']
    filtered=a.finance(rows,visible_ids={'second'})
    assert filtered['selected_ids']==[] and filtered['gross']==0
    assert result['scenarios'][0]['gross']==result['scenarios'][2]['gross']


def test_t27_unknown_correction_makes_net_partial():
    result=a.finance([case(),case('B','B',None,None,'OC')])
    assert result['partial'] and result['unvalued_corrections']==1


def test_invalid_financial_inputs():
    for settings in [dict(reach=2),dict(benchmark=float('nan')),dict(months=25),dict(recognition=0),dict(start='2027-13')]:
        with pytest.raises(ValueError): a.finance([case()],settings)


def test_scope_filters_snapshots_and_no_population_export(state):
    report=a.build(state,state['members'],CFG,{})
    assert report['summary']['enrolled']==10000
    assert all(report['bases'][b] is not None for b in ['captured_baseline','potential','submitted','accepted'])
    assert sum(r['count'] for r in report['histogram'])==report['summary']['scored']
    scoped=a.build(state,state['members'],CFG,dict(contract='H1032',counties=['Miami-Dade County']))
    assert 0<scoped['summary']['enrolled']<report['summary']['enrolled']
    assert all(c['contract']=='H1032' and c['county']=='Miami-Dade County' for c in scoped['cases'])
    older=a.build(state,state['members'],CFG,dict(snapshot='2026-07-15'))
    assert older['bases']['captured_baseline']<report['bases']['captured_baseline']
    empty=a.build(state,state['members'],CFG,dict(counties=['No such county']))
    assert empty['summary']['eligible']==0 and empty['bases']['captured_baseline'] is None
    payload,_=a.export_bundle(report,'R01','json')
    exported=json.loads(payload)
    assert 'cases' not in exported and 'suspects' not in exported and 'members' not in exported
    assert exported['snapshot_hash']==report['snapshot_hash']


def test_qualified_rule_breakdown_and_condition_filter(state):
    report=a.build(state,state['members'],CFG,{})
    assert sum(r['count'] for r in report['rules'])==report['summary']['cases']
    assert report['summary']['qualified_members']<=report['summary']['cases']
    condition=a.build(state,state['members'],CFG,dict(condition='Heart failure'))
    assert 0<condition['summary']['eligible']<report['summary']['eligible']
    assert all(c['domain']=='Heart failure' for c in condition['cases'])


def test_t17_suppression_survives_export(state):
    report=a.build(state,state['members'][:12],CFG,{})
    assert all(r['suppressed'] and r['score'] is None and r['members'] is None for r in report['counties'])
    data,_=a.export_bundle(report,'R05','csv')
    assert 'True' in data.decode()


def test_future_evidence_and_probability_version(state):
    f={**state['opportunities'][0],'analysis_date':'2026-10-01'}
    assert not a.canonicalize([f],state['members'],CFG)


def test_t21_exports_full_filter_selection_and_zip(state):
    report=a.build(state,state['members'],CFG,{})
    data,_=a.export_bundle(report,'registry','json')
    assert len(json.loads(data)['suspects'])==report['summary']['cases']>100
    ids=[report['cases'][0]['id']]
    selected,_=a.export_bundle(report,'registry','json',ids)
    assert len(json.loads(selected)['suspects'])==1
    assert 'sources' not in json.loads(selected)['suspects'][0]
    bundle,_=a.export_bundle(report,'R08','zip')
    z=zipfile.ZipFile(io.BytesIO(bundle))
    assert {'manifest.json','summary.csv','aggregates.csv','metric_definitions.json','assumptions.json','exclusions.csv','README.md'}<=set(z.namelist())
    assert 'suspects.csv' not in z.namelist()
    assert "'=2+2" in a.csv_bytes([dict(label='=2+2')]).decode()


def test_frozen_ai_and_seed_untouched(state):
    before=deepcopy(state)
    report=a.build(state,state['members'],CFG,{})
    changed=a.build(state,state['members'],CFG,dict(contract='H1032',financial={'benchmark':2000}))
    assert report['ai']==changed['ai']==state['comparison']
    assert state==before
    assert a.build(state,state['members'],CFG,{})['snapshot_hash']==report['snapshot_hash']


@pytest.mark.parametrize('baseline', [0, .99949, 1.23451, 2.75, 5.1239])
@pytest.mark.parametrize('uplift', [0, .00001, .002, .02, .34])
def test_requested_score_order_in_values_and_three_decimal_display(baseline, uplift):
    values=a.score_bases(baseline,uplift)
    for render in [lambda x:x, lambda x:round(x,3)]:
        assert render(values['captured_baseline']) < render(values['accepted']) <= render(values['submitted']) < render(values['potential'])


def test_score_order_does_not_invent_an_empty_population():
    assert all(value is None for value in a.score_bases(None,0).values())


def test_monthly_trend_varies_and_ends_at_current_score_sets():
    bases = a.score_bases(1.014, .042)
    points = a.score_trend(bases, 2)
    assert [point['month'] for point in points] == ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb']
    for series, basis in [('baseline', 'captured_baseline'), ('accepted', 'accepted'),
                          ('submitted', 'submitted'), ('potential', 'potential')]:
        values = [point[series] for point in points]
        changes = [right-left for left, right in zip(values, values[1:])]
        assert min(changes) < 0 < max(changes)
        assert values[-1] == bases[basis]
    for point in points:
        assert point['baseline'] < point['accepted'] <= point['submitted'] < point['potential']
    assert min(point['submitted']-point['accepted'] for point in points[:-1]) > .015


def test_monthly_trend_does_not_fabricate_scores_for_unscored_members():
    assert a.score_trend(a.score_bases(None, 0), 9) == []


def test_score_order_and_basis_reconcile_across_scopes_and_reports(state):
    contexts = [{}, {'contract':'H1032'}, {'snapshot':'2026-07-15'},
                {'run_month':'02','stage':'raw'}, {'condition':'Heart failure'}]
    for ctx in contexts:
        baseline=a.build(state,state['members'],CFG,ctx)
        potential=a.build(state,state['members'],CFG,{**ctx,'basis':'potential'})
        b=baseline['bases']
        assert round(b['captured_baseline'],3)<round(b['accepted'],3)<=round(b['submitted'],3)<round(b['potential'],3)
        for point in baseline['trend']:
            assert point['baseline']<point['accepted']<=point['submitted']<point['potential']
        for before,after in zip(baseline['counties'],potential['counties']):
            if not before['suppressed']:
                assert after['score']>before['score']
        assert baseline['bases']==potential['bases']
        assert baseline['trend'][-1]['month']==('Feb' if ctx.get('run_month')=='02' else 'Jul' if ctx.get('snapshot') else 'Sep')


def test_illustrative_year_variation_and_snapshot_values(state):
    report=a.build(state,state['members'],CFG,{})
    prior_year=a.build(state,state['members'],{**CFG,'year':2025,'id':'ma_blend_py2025'},{})
    assert prior_year['bases']['captured_baseline']<report['bases']['captured_baseline']
    assert report['snapshots'][0]['baseline']<report['snapshots'][1]['baseline']<report['snapshots'][2]['baseline']
    assert report['snapshots'][2]['baseline']==report['bases']['captured_baseline']
    assert len({s['scored'] for s in report['snapshots']})==1


def test_unmapped_concepts_never_receive_a_random_hcc_or_exposure(state):
    finding={**state['opportunities'][0],'condition':'Blood pressure finding','type':'unmapped_signal'}
    result=a.canonicalize([finding],state['members'],CFG)[0]
    assert result['hcc']=='Mapping unresolved' and result['delta'] is None
    assert result['category_label']=='Unmapped' and not result['qualified']


def test_capture_view_includes_all_positive_categories_and_matrix_cell_filters(state):
    report=a.build(state,state['members'],CFG,{'category':'capture'})
    assert {c['category'] for c in report['cases']}=={'CG','RC','NC','SP','ST'}
    cell=a.build(state,state['members'],CFG,{'evidence':'Strong','band':'Medium'})
    assert cell['cases'] and all(c['evidence']=='Strong' and c['probability']['band']=='Medium' for c in cell['cases'])


def test_prior_snapshots_have_separate_authored_questions_without_backdated_sources(state):
    july=a.build(state,state['members'],CFG,{'snapshot':'2026-07-15'})
    august=a.build(state,state['members'],CFG,{'snapshot':'2026-08-15'})
    assert sum(c['aliases'][0].startswith('PRESENTATION-') for c in july['cases'])==600
    assert sum(c['aliases'][0].startswith('PRESENTATION-') for c in august['cases'])==800
    assert all(not c['sources'] and c['analysis_date']<=july['as_of'] for c in july['cases'])
    assert all(c['aliases'][0].startswith(('PRESENTATION-', 'CAPTURE-')) for c in july['cases'])


@pytest.mark.parametrize('snapshot', a.SNAPSHOTS)
def test_populated_default_financial_outlooks_are_positive_and_reconcile(state, snapshot):
    report=a.build(state,state['members'],CFG,{'snapshot':snapshot})
    f=report['financial']
    assert f['scenarios'][0]['net'] < f['net'] < f['scenarios'][2]['net']
    for scenario in f['scenarios']:
        assert scenario['net'] > 0 and scenario['corrections'] < 0
        assert scenario['net']==pytest.approx(scenario['realized']+scenario['corrections'])
        assert scenario['net']==pytest.approx(sum(m['net'] for m in scenario['monthly']))
        assert all(point[scenario['name']]>0 for point in f['curve'])
    # Negative results remain legitimate when positive opportunities are not reached.
    zero=a.finance(report['cases'],{'reach':0})
    assert zero['net']==zero['corrections'] < 0
    corrections=a.finance([c for c in report['cases'] if c['category']=='OC'])
    assert corrections['net'] < 0 and corrections['selected_count']==0


def test_default_geography_practice_and_contract_outlooks_are_positive(state):
    report=a.build(state,state['members'],CFG,{})
    for key in ['county','provider_id','contract']:
        for value in {c[key] for c in report['cases']}:
            f=a.finance([c for c in report['cases'] if c[key]==value])
            assert all(s['net']>0 for s in f['scenarios']), (key,value)


def test_authored_capture_cohort_has_stable_scope_and_no_invented_evidence(state):
    retained=state['opportunities']+a.extensions(state['members'])
    questions=a.capture_questions(state['members'],retained,a.AS_OF)
    assert len(questions)==1200 and len({q['member_id'] for q in questions})==1200
    assert not {q['member_id'] for q in questions}.intersection(f['member_id'] for f in retained)
    assert questions==a.capture_questions(list(reversed(state['members'])),retained,a.AS_OF)
    assert all(not q['document_ids'] and 'authored scenario assumptions' in q['summary'] for q in questions)
    full=a.build(state,state['members'],CFG,{})
    scoped_members=[m for m in state['members'] if m['provider_id']==state['members'][0]['provider_id']]
    scoped=a.build(state,scoped_members,CFG,{})
    expected={c['id'] for c in full['cases'] if c['provider_id']==scoped_members[0]['provider_id']}
    assert {c['id'] for c in scoped['cases']}==expected
    assert all(not c['source_available'] for c in full['cases'] if c['aliases'][0].startswith('CAPTURE-'))
