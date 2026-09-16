"""Identity joins, ordering, scoping and unvalidated-score boundaries."""
from copy import deepcopy
from pathlib import Path
import json
from apps.api.app import member360_analytics as linked, analytics_experience as model, florida_population

ROLES = {'executive': {'screens': ['members']}, 'provider': {'screens': ['members']}, 'blocked': {'screens': []}}
CFG = {'id': 'ma_v28_py2027_forecast', 'program': 'MA', 'year': 2027, 'model_version': 'V28', 'name': '2027 CMS-HCC V28'}


def test_profile_identity_and_evidence_come_from_the_same_member():
    members = linked.members_for({'role': 'executive'}, ROLES)
    assert [m['name'] for m in members] == ['Maria Santos','Ellen Brooks','Robert Klein','James Patel','Anne Foster']
    assert {m['county'] for m in members} == {'Hillsborough County'}
    assert {m['analytics_contract'] for m in members} == {'H1234'}
    cases = linked.fixtures(members)
    assert len(cases) == 9
    assert not any(c['profile_reference']['category'] == 'Validated' for c in cases)
    assert not any('Currently Coded' in c['condition'] for c in cases)
    james = [c for c in cases if c['member_id'] == 'M-441098' and c['business_category'] == 'SP'][0]
    assert 'eGFR 24' in james['summary'] and 'reconciliation' in james['countercheck']
    assert james['profile_reference']['delta'] == .185
    assert james['illustrative_exposure'] is None and james['document_ids'] == []
    assert all(c['profile_reference']['source_sha256'] == linked._DATA['source']['sha256'] for c in cases)


def test_provider_scope_and_screen_permission():
    members = linked.members_for({'role': 'provider','provider_id': 'PR-001'}, ROLES)
    assert {m['id'] for m in members} == {'M-104829','M-441098'}
    assert {c['member_id'] for c in linked.fixtures(members)} == {m['id'] for m in members}
    assert linked.members_for({'role': 'blocked'}, ROLES) == []
    assert linked.members_for({'role': 'provider','provider_id': 'PR-999'}, ROLES) == []


def test_member_first_order_preserves_other_members_and_filtered_scope():
    members = linked.members_for({'role': 'executive'}, ROLES)
    other = [{'member_id':'other1','id':'a'},{'member_id':'other2','id':'b'}]
    cases = other + linked.fixtures(members)
    ordered = linked.prioritize(cases)
    assert [c['member_id'] for c in ordered[:5]] == [m['id'] for m in members]
    assert ordered[-2:] == other
    assert len(ordered) == len(cases)
    filtered = [c for c in ordered if c.get('business_category') == 'OC']
    assert {c['member_id'] for c in linked.prioritize(filtered)} == {'M-204175'}


def test_report_filters_export_and_scores_keep_their_boundaries():
    state = json.loads((Path(__file__).parents[3] / 'seed/demo.json').read_text())
    florida_population.migrate(state)
    before = deepcopy(state)
    members = linked.members_for({'role':'executive'}, ROLES)
    report = model.build(state, state['members'] + members, CFG, {'discovery':'all'})
    assert [c['member_id'] for c in report['cases'][:5]] == [m['id'] for m in members]
    refs = [c for c in report['cases'] if c.get('profile_reference')]
    assert len(refs) == 9 and all(c['delta'] is None and not c['source_available'] for c in refs)
    assert all(c['hcc'] == 'Model mapping pending' for c in refs)
    assert not set(c['id'] for c in refs) & set(report['financial']['selected_ids'])
    assert not any(p['id'].startswith('M360-') for p in report['landing']['recapture']['practices'])
    rows = model.population(members, CFG, {})
    assert all(r['score'] is None and not r['conditions'] for r in rows)
    scoped = model.build(state, members[:1], CFG, {'discovery':'all'})
    assert {c['member_id'] for c in scoped['cases']} == {members[0]['id']}
    filtered = model.build(state, members, CFG, {'contract':'H1032','discovery':'all'})
    assert filtered['cases'] == []
    assert state == before
