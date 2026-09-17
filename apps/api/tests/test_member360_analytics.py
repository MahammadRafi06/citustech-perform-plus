"""Identity joins, ordering, scoping and unvalidated-score boundaries."""
from copy import deepcopy
from pathlib import Path
import json
from apps.api.app import member360_analytics as linked, member360_evidence, analytics_experience as model, florida_population

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
    assert james['illustrative_exposure'] is None and len(james['document_ids']) == 2
    assert all(c['profile_reference']['source_sha256'] == linked._DATA['source']['sha256'] for c in cases)


def test_provider_scope_and_screen_permission():
    members = linked.members_for({'role': 'provider','provider_id': 'PR-001'}, ROLES)
    assert {m['id'] for m in members} == {'M-104829','M-441098'}
    assert {c['member_id'] for c in linked.fixtures(members)} == {m['id'] for m in members}
    assert linked.members_for({'role': 'blocked'}, ROLES) == []
    assert linked.members_for({'role': 'provider','provider_id': 'PR-999'}, ROLES) == []


def test_every_linked_suspect_matches_its_member_risk_tab():
    members = linked.members_for({'role': 'executive'}, ROLES)
    findings = linked.fixtures(members)
    by_source = {finding['id']: finding for finding in findings}
    expected = 0
    for member in linked._DATA['members']:
        source_rows = linked.tables(member, 'risk')[0]['children'][1]['children']
        for index, row in enumerate(source_rows, 1):
            condition, category, delta, confidence, inclusion, evidence, compliance = [linked.text(cell).strip() for cell in row['children']]
            key = f'M360-{member["id"]}-{index}'
            if category == 'Validated':
                assert key not in by_source
                continue
            expected += 1
            finding = by_source[key]
            source = finding['profile_reference']
            assert source['condition'] == condition.replace(' High-Risk HCC', '')
            assert source['category'] == category
            assert source['confidence'] == confidence
            assert source['delta'] == float(delta)
            assert source['inclusion'] == inclusion
            assert source['evidence'] == finding['summary'] == evidence
            assert source['compliance_note'] == finding['countercheck'] == compliance
            assert source['member_id'] == member['id']
            assert source['year'] == 2026 and source['model_version'] == 'V28'
    assert len(findings) == expected == 9
    cases = model.canonicalize(findings, members, CFG)
    assert all(case['probability']['base'] is None for case in cases)
    assert all(case['probability']['method'] == 'MEMBER360_SOURCE_CONFIDENCE' for case in cases)
    assert all(case['evidence'] == 'Unknown' for case in cases)
    audit = next(case for case in cases if case['category'] == 'OC')
    assert audit['member_name'] == 'Robert Klein'
    assert audit['profile_reference']['confidence'] == '32%'
    assert audit['profile_reference']['delta'] == .161
    assert audit['direction'] == 'remove' and audit['delta'] is None
    anne = next(case for case in cases if case['member_id'] == 'M-559214')
    assert anne['profile_reference']['hcc'] is None
    assert anne['profile_reference']['confidence'] == '45%'


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
    assert len(refs) == 9 and all(c['delta'] is None and c['source_available'] for c in refs)
    assert all(len(c['sources']) == 2 and all(s['origin']=='authored_member360_evidence' for s in c['sources']) for c in refs)
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


def test_authored_profile_records_preserve_provenance_and_coding_uncertainty():
    profiles = linked.members_for({'role': 'executive'}, ROLES)
    findings = linked.fixtures(profiles)
    documents = member360_evidence.documents(findings)
    assert len(documents) == len({d['id'] for d in documents}) == 18
    by_id = {d['id']: d for d in documents}
    for finding in findings:
        assert finding['discovery']['record_count'] == 2
        assert finding['profile_reference']['evidence_strength'] in {'Strong','Moderate','Limited'}
        for doc_id in finding['document_ids']:
            document = by_id[doc_id]
            assert document['member_id'] == document['source_member_id'] == finding['member_id']
            assert document['source_profile_sha256'] == linked._DATA['source']['sha256']
            assert document['source_finding_id'] == finding['id']
            assert document['origin'] == 'authored_member360_evidence'
            assert document['date'] <= finding['analysis_date']
            assert document['pages'][0]['sections'][0]['text']
    robert = next(f for f in findings if f['business_category']=='OC')
    claim, review = [by_id[k] for k in robert['document_ids']]
    assert claim['date'] == '2026-03-14' and claim['date_kind'] == 'encounter_date'
    assert 'No BMI, weight' in review['pages'][0]['sections'][0]['text']
    assert robert['profile_reference']['confidence'] == '32%'
    assert robert['profile_reference']['evidence_strength'] == 'Limited'
    assert robert['profile_reference']['delta'] == .161
    assert all(d['member_id']==profiles[0]['id'] for d in member360_evidence.documents(linked.fixtures(profiles[:1])))


def test_hcc_only_registry_excludes_unmapped_records_from_counts_and_exports():
    state = json.loads((Path(__file__).parents[3] / 'seed/demo.json').read_text())
    florida_population.migrate(state)
    members = state['members'] + linked.members_for({'role':'executive'}, ROLES)
    full = model.build(state, members, CFG, {'discovery':'all'})
    filtered = model.build(state, members, CFG, {'discovery':'all', 'hcc_only':True})
    expected = [c for c in full['cases'] if (c.get('profile_reference') or {}).get('hcc')]
    source_cases = [c for c in filtered['cases'] if c.get('profile_reference')]
    assert len(source_cases) == len(expected) == 8
    assert not any(c['member_id'] == 'M-559214' for c in filtered['cases'])
    assert all((c.get('profile_reference') or {}).get('hcc') or c['hcc'].startswith('HCC ')
               for c in filtered['cases'])
    assert filtered['summary']['cases'] == len(filtered['cases']) < len(full['cases'])
    assert sum(g['count'] for g in filtered['discovery_groups']) == len(filtered['cases'])
    body, _ = model.export_bundle(filtered, 'registry', 'json')
    assert {c['id'] for c in json.loads(body)['suspects']} == {c['id'] for c in filtered['cases']}
    assert filtered['bases'] == full['bases']
    assert next(c for c in full['cases'] if c['member_id'] == 'M-559214')['profile_reference']['hcc'] is None
