"""Reconciliation and drill-through contracts for the landing analytics."""
import json
from collections import Counter
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
    clicked=a.build(state,state['members'],CFG,{'closure':str(group['closure']),'quadrant':group['quadrant'],'category':'capture','condition':group['name']})
    assert clicked['summary']['qualified_members']==group['members']
    assert clicked['summary']['cases']==group['cases']
    body,_=a.export_bundle(clicked,'registry','json')
    assert len(json.loads(body)['suspects'])==group['cases']


def test_all_opportunity_quadrants_reconcile_with_drillthrough_and_exports(state, report):
    seen=set()
    for group in report['landing']['quadrants']:
        context={'quadrant':group['quadrant'],'category':'capture'}
        target=a.build(state,state['members'],CFG,context)
        assert not group['suppressed']
        assert target['summary']['cases']==group['cases']>0
        assert target['summary']['qualified_members']==group['members']>0
        assert all(landing.opportunity_quadrant(c)==group['quadrant'] for c in target['cases'])
        ids={c['id'] for c in target['cases']}
        assert seen.isdisjoint(ids)
        seen.update(ids)
        body,_=a.export_bundle(target,'registry','json')
        assert {c['id'] for c in json.loads(body)['suspects']}==ids
    expected={c['id'] for c in report['cases'] if c['qualified'] and c['category'] not in ('OC','DR') and (c['delta'] or 0)>0 and c['probability']['base'] is not None}
    assert seen==expected


def test_condition_and_quadrant_use_the_same_member_counts(state, report):
    group=next(g for g in report['landing']['quadrant_conditions'] if not g['suppressed'] and g['cases']>0 and g['quadrant']=='high_value')
    target=a.build(state,state['members'],CFG,{'quadrant':group['quadrant'],'condition':group['name'],'category':'capture'})
    assert target['summary']['cases']==group['cases']
    assert target['summary']['qualified_members']==group['members']
    assert all(c['domain']==group['name'] for c in target['cases'])
    for point in report['landing']['matrix']:
        if point['suppressed']: continue
        high_value=point['gain']>=.14
        high_chance=point['closure']>=.65
        expected=('priority' if high_chance else 'high_value') if high_value else ('likely_to_close' if high_chance else 'lower_priority')
        assert point['quadrant']==expected


def test_closure_levels_reconcile_with_quadrants_and_filtered_conditions(state, report):
    totals={}
    for level in ('low','medium','high'):
        quadrant='priority' if level=='high' else 'high_value'
        summary=next(g for g in report['landing']['closure_bands'] if g['name']=='' and g['quadrant']==quadrant and g['band']==level)
        target=a.build(state,state['members'],CFG,{'closure':level,'quadrant':quadrant,'category':'capture'})
        assert not summary['suppressed']
        assert target['summary']['cases']==summary['cases']>0
        assert target['summary']['qualified_members']==summary['members']
        assert all(landing.opportunity_band(landing.opportunity(c)[0])==level for c in target['cases'])
        totals[level]=summary['cases']
        body,_=a.export_bundle(target,'registry','json')
        exported=json.loads(body)
        assert len(exported['suspects'])==summary['cases']
        assert exported['context']['closure']==level
    left=next(g for g in report['landing']['quadrants'] if g['quadrant']=='high_value')
    assert totals['low']+totals['medium']==left['cases']


def test_bubbles_use_distributed_reproducible_closure_positions(report):
    points=[p for p in report['landing']['matrix'] if not p['suppressed']]
    positions={p['closure'] for p in points}
    assert len(positions)>20
    assert min(positions)<.2 and max(positions)>.9
    for point in points:
        cohort=[c for c in report['cases'] if c['domain']==point['name'] and landing.opportunity_matches(c,{'quadrant':point['quadrant'],'closure':str(point['closure'])})]
        assert len(cohort)==point['cases']
        assert point['gain']==pytest.approx(sum(landing.opportunity(c)[1] for c in cohort)/len(cohort))


def test_continuing_members_compare_the_same_paired_cohort(state, report):
    context={'snapshot':a.AS_OF,'stage':'adjusted','run_month':'all'}
    rows=a.population(state['members'],{**CFG,'year':2026,'run_type':'final'},context)
    records=landing.continuing_member_records(rows,context)
    comparison=report['landing']['continuing_members']
    expected_ids={r['id'] for r in rows if r['eligible'] and r['score'] is not None and landing.seed(r['id']+':enrolled-2025')%10!=0}
    assert {r['id'] for r in records}==expected_ids
    assert 0<comparison['members']==len(expected_ids)<report['summary']['scored']
    assert all(r['score_2025']>0 and r['score_2026']>0 and r['weight']==9 for r in records)
    assert comparison['member_months']==9*len(records)
    for year,key in [(2025,'start'),(2026,'end')]:
        assert comparison[key]==pytest.approx(sum(r[f'score_{year}']*r['weight'] for r in records)/comparison['member_months'])
    assert comparison['end']-comparison['start']==pytest.approx(comparison['delta'])
    assert sum(c['change'] for c in comparison['changes'])==pytest.approx(comparison['delta'])
    assert comparison['delta']>0
    assert comparison['percent_change']==pytest.approx(comparison['delta']/comparison['start'])
    assert comparison['origin']=='authored_paired_annual_risk_v1'


def test_continuing_comparison_respects_scope_and_fixed_comparison_years(state, report):
    provider=report['options']['practices'][0]['id']
    context={'practices':[provider],'run_month':'07','basis':'potential'}
    scoped=a.build(state,state['members'],CFG,context)
    comparison=scoped['landing']['continuing_members']
    assert 0<comparison['members']<report['landing']['continuing_members']['members']
    assert comparison['member_months']==7*comparison['members']
    other_year=a.build(state,state['members'],{**CFG,'year':2025,'run_type':'initial'},context)
    assert other_year['landing']['continuing_members']==comparison
    assert comparison['start_year']==2025 and comparison['end_year']==2026
    body,_=a.export_bundle(scoped,'R01','json')
    assert json.loads(body)['landing']['continuing_members']==comparison


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


def test_provider_comparison_reconciles_with_population_and_condition_reports(report):
    providers=report['providers']
    assert providers and all(p['name'].startswith('Dr. ') for p in providers)
    assert not any(p['suppressed'] for p in providers)
    assert sum(p['members'] for p in providers)==report['summary']['eligible']
    weights=sum(p['member_months'] for p in providers)
    assert sum(p['score']*p['member_months'] for p in providers)/weights==pytest.approx(report['bases']['captured_baseline'])
    assert sum(p['prior_conditions'] for p in providers)==sum(c['prior'] for c in report['prevalence'])
    assert sum(p['recaptured_conditions'] for p in providers)==sum(c['recaptured'] for c in report['prevalence'])
    assert sum(p['open_suspects'] for p in providers)==sum(c['status']=='open' for c in report['cases'])
    for p in providers:
        outcomes=next(row for row in report['landing']['providers'] if row['id']==p['id'])['series']
        assert p['capture_rate']==pytest.approx(sum(m['added'] for m in outcomes)/sum(m['rules'] for m in outcomes))
        assert p['recapture_rate']==pytest.approx(p['recaptured_conditions']/p['prior_conditions'])
        assert 0<=p['capture_rate']<=1 and 0<=p['recapture_rate']<=1


def test_provider_view_respects_scopes_score_basis_and_exports(state,report):
    first=report['providers'][0]
    county=Counter(m['county'] for m in state['members'] if m['provider_id']==first['id']).most_common(1)[0][0]
    scope={'practices':[first['id']], 'run_month':'07', 'basis':'accepted', 'counties':[county]}
    scoped=a.build(state,state['members'],CFG,scope)
    assert len(scoped['providers'])==1
    provider=scoped['providers'][0]
    assert provider['name']==first['name']
    assert provider['members']==scoped['summary']['eligible']
    assert provider['score']==pytest.approx(scoped['bases']['accepted'])
    assert provider['recaptured_conditions']==scoped['landing']['recapture']['confirmed']
    assert len(scoped['landing']['providers'][0]['series'])==7
    body,_=a.export_bundle(scoped,'R12','json')
    exported=json.loads(body)
    assert exported['manifest']['report_id']=='R12'
    assert exported['providers']==scoped['providers']
    assert exported['context']['counties']==[county]
    assert 'cases' not in exported and 'suspects' not in exported
    body,_=a.export_bundle(scoped,'R12','csv')
    assert b'capture_rate' in body and b'recapture_rate' in body and provider['name'].encode() in body


def test_provider_small_panels_do_not_leak_rates_or_counts(state):
    report=a.build(state,state['members'][:12],CFG,{})
    for provider in report['providers']:
        assert provider['suppressed']
        for field in ('members','score','member_months','captured_suspects','identified_suspects','capture_rate','prior_conditions','recaptured_conditions','recapture_rate','open_suspects'):
            assert provider[field] is None


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
    for name in ['matrix','providers','networks','social','quadrants','quadrant_conditions','closure_bands']:
        for group in r[name]:
            assert (group['suppressed'] and group['members'] is None) or group['members']==0
    assert all(h['members'] is None for h in r['recapture']['heat'])


def test_dashboard_preserves_scores_and_financials(report):
    bases=report['bases']
    assert bases['captured_baseline']<bases['accepted']<=bases['submitted']<bases['potential']
    assert report['financial']['net']>0
    assert report['landing']['model']['start']==round(bases['captured_baseline'],4)
    assert all(isinstance(c['change'],float) for c in report['landing']['model']['changes'])
    assert report['landing']['origin']=='authored_sample_analytics'


def test_multi_condition_union_matches_matrix_counts_and_drillthrough(state, report):
    names = ['Diabetes with complications', 'Cardiovascular conditions']
    for quadrant, level in [('priority', 'high'), ('high_value', 'medium')]:
        context = dict(conditions=names, quadrant=quadrant, closure=level, category='capture')
        selected = a.build(state, state['members'], CFG, context)
        groups = [g for g in report['landing']['closure_bands']
                  if g['name'] in names and g['quadrant'] == quadrant and g['band'] == level]
        assert all(not g['suppressed'] for g in groups)
        assert selected['summary']['cases'] == sum(g['cases'] for g in groups) > 0
        expected = {c['id'] for c in report['cases'] if c['domain'] in names
                    and landing.opportunity_matches(c, context) and c['category'] not in ('OC', 'DR')}
        assert {c['id'] for c in selected['cases']} == expected
        assert selected['summary']['qualified_members'] == len({c['member_id'] for c in selected['cases'] if c['qualified']})
        body, _ = a.export_bundle(selected, 'registry', 'json')
        assert json.loads(body)['context']['conditions'] == names


def test_cumulative_provider_outcomes_reconcile_at_every_period(report):
    for provider in report['landing']['providers']:
        if provider['suppressed']:
            continue
        identified = closed = confirmed = 0
        for period in provider['series']:
            identified += period['rules']
            closed += period['closed']
            confirmed += period['added']
            assert period['identified_to_date'] == identified
            assert period['closed_to_date'] == closed
            assert period['open_to_date'] == identified - closed >= 0
            assert period['confirmed_to_date'] == confirmed <= closed
        assert identified == provider['identified_suspects']
        assert confirmed == provider['captured_suspects']


def test_complete_provider_hierarchy_preserves_population_and_provider_scope(state, report):
    from apps.api.app import provider_hierarchy, member360_analytics
    hierarchy = report['options']['hierarchy']
    assert {r['practiceId'] for r in hierarchy} == {m['provider_id'] for m in state['members']}
    group = hierarchy[0]['group']
    grouped = a.build(state, state['members'], CFG, dict(health_network='Central MA Network', provider_group=group))
    expected = [m for m in state['members'] if provider_hierarchy.identity(m)['group'] == group
                and provider_hierarchy.identity(m)['network'] == 'Central MA Network']
    assert grouped['summary']['enrolled'] == len(expected) > 1000
    physician = hierarchy[0]['provider']
    scoped = a.build(state, state['members'], CFG, dict(provider=physician))
    ids = {m['id'] for m in state['members'] if provider_hierarchy.identity(m)['provider'] == physician}
    assert scoped['summary']['enrolled'] == len(ids) > 100
    assert all(c['member_id'] in ids for c in scoped['cases'])
    assert all(p['name'] == physician for p in scoped['providers'] if not p['suppressed'])
    profiles = member360_analytics.members_for({'role':'superuser'}, {'superuser':{'screens':['members']}})
    for member in profiles:
        row = provider_hierarchy.identity(member)
        assert row['network'] == member['health_network']
        assert row['group'] == member['provider_group']
        assert row['provider'] == member['physician']


def test_social_county_filter_is_the_same_population_filter(state, report):
    county = 'Broward County'
    scoped = a.build(state, state['members'], CFG, dict(counties=[county]))
    assert scoped['summary']['enrolled'] == sum(m.get('county') == county for m in state['members'])
    assert {r['id'] for r in scoped['landing']['social']} == {county}
    assert all(c['county'] == county for c in scoped['cases'])


def test_health_network_entity_options_filter_their_population(state):
    from apps.api.app import provider_hierarchy, member360_analytics
    profiles = member360_analytics.members_for({'role':'superuser'}, {'superuser':{'screens':['members']}})
    members = state['members'] + profiles
    scopes = []
    for entity in provider_hierarchy.NETWORKS:
        expected = {m['id'] for m in members if provider_hierarchy.identity(m)['network'] == entity}
        assert not any(expected & previous for previous in scopes)
        scopes.append(expected)
        result = a.build(state, members, CFG, {'health_network':entity})
        assert result['summary']['enrolled'] == len(expected) > 0
        assert all(c['member_id'] in expected for c in result['cases'])
        assert [n['name'] for n in result['landing']['networks']] == [entity]
    assert set.union(*scopes) == {m['id'] for m in members}
    narrowed = a.build(state, members, CFG, {'health_network':'Northside Medical', 'provider_group':'Harbor Primary Care'})
    expected = {m['id'] for m in members if provider_hierarchy.identity(m)['network'] == 'Northside Medical'
                and provider_hierarchy.identity(m)['group'] == 'Harbor Primary Care'}
    assert narrowed['summary']['enrolled'] == len(expected) > 0


def test_network_recapture_and_cumulative_outcomes_reconcile(state, report):
    from apps.api.app.provider_hierarchy import NETWORKS
    data = report['landing']
    assert {n['name'] for n in data['recapture']['networks']} == set(NETWORKS)
    assert {n['name'] for n in data['networks']} == set(NETWORKS)
    assert sum(n['members'] for n in data['networks']) == report['summary']['eligible']
    for prevalence in report['prevalence']:
        cells = [h for h in data['recapture']['heat'] if h['dimension']=='network' and h['condition']==prevalence['name']]
        if any(h['suppressed'] for h in cells):
            assert all(h['members'] is None and h['confirmed'] is None and h['rate'] is None
                       for h in cells if h['suppressed'])
        else:
            assert sum(h['members'] for h in cells) == prevalence['prior']
            assert sum(h['confirmed'] for h in cells) == prevalence['recaptured']
    for network in data['networks']:
        scoped = a.build(state, state['members'], CFG, {'health_network':network['name']})
        assert scoped['landing']['networks'][0]['series'] == network['series']
        for period in network['series']:
            assert period['identified_to_date'] == period['closed_to_date'] + period['open_to_date']
            assert period['confirmed_to_date'] <= period['closed_to_date'] <= period['identified_to_date']
    for index in range(len(data['recapture']['months'])):
        for key in ['rules','closed','added','identified_to_date','closed_to_date','open_to_date','confirmed_to_date']:
            assert sum(n['series'][index][key] for n in data['networks']) == sum(p['series'][index][key] for p in data['providers'])


def test_plan_display_cleanup_preserves_source_evidence(state):
    assert not any(m.get('plan') in ('Northstar Health','Meridian Care') for m in state['members'])
    assert not any('Northstar' in label or 'Meridian' in label for _,label in a.CONTRACTS)
