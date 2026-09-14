"""Identity and finding isolation regressions from the complete browser audit."""
from copy import deepcopy

from test_demo import action, baseline, database, login, main
from apps.api.app import assessment, risk_inputs, risk_service, risk_store
from apps.api.app.clinical_fixtures import CASEY_FINDING, CASEY_SOURCE


def test_same_member_identity_across_programs_and_retained_aca_correction():
    with main.db() as conn:
        state = main.get_state(conn)
        member = next(m for m in state['members'] if m['id'] == 'MB-000005')
        configs = ['ma_v28_py2026', 'ma_v28_py2027_forecast', 'rxhcc_py2027_pdp_forecast', 'hhs_v08_by2026']
        values = [risk_inputs.member_input(member, config) for config in configs]
        assert {(v['dob'], v['sex']) for v in values} == {('1950-01-15', 2)}
        old = deepcopy(values[-1])
        old.update(dob='2006-01-15', fixture_version=risk_inputs.FIXTURE_VERSION)
        before = risk_service.calculate(conn, member, 'hhs_v08_by2026', old)
        old_input = risk_store.get_input(conn, before['snapshot_id'])
        assert before['selected_segment'] == 'CHILD_PLATINUM'
        risk_inputs.mark_legacy_aca_stale(conn, state['members'])
        current = risk_store.current(conn, member['id'], 'hhs_v08_by2026')
        assert current['id'] == before['id'] and current['stale']
        assert 'demographics corrected' in current['stale_reason']
        updated = risk_service.calculate(conn, member, 'hhs_v08_by2026')
        assert updated['status'] == 'completed' and updated['selected_segment'] == 'ADULT_PLATINUM'
        assert updated['snapshot_id'] != before['snapshot_id']
        assert risk_store.get_input(conn, updated['snapshot_id'])['dob'] == '1950-01-15'
        risk_inputs.mark_legacy_aca_stale(conn, state['members'])
        assert not risk_store.current(conn, member['id'], 'hhs_v08_by2026')['stale']
        assert risk_store.get_run(conn, before['id']) == before
        assert risk_store.get_input(conn, before['snapshot_id']) == old_input
        profile = risk_service.member_profile(conn, state, member, 'hhs_v08_by2026')
        assert profile['identity']['dob'] == profile['input_snapshot']['dob']
        assert len(profile['history']) == 2


def test_multi_finding_fixture_is_additive_and_preserves_separate_gates():
    coder, qa, analyst = login('coder'), login('qa'), login()
    mid = 'MB-000005'
    detail = coder.get('/api/v1/members/' + mid).json()
    assert detail['selected_finding_id'] is None and detail['eligibility']['finding_selection_required']
    findings = {o['id']: o for o in detail['opportunities']}
    assert set(findings) == {'OP-0005', CASEY_FINDING}
    assert findings['OP-0005']['eligibility']['support_allowed']
    assert not findings[CASEY_FINDING]['eligibility']['support_allowed']
    assert findings[CASEY_FINDING]['eligibility']['source_ids'] == [CASEY_SOURCE]
    assert action(coder, 'review', id=mid, value='resolved_supported', note='Ambiguous.').status_code == 409
    assert action(coder, 'review', id=mid, finding_id=CASEY_FINDING, value='resolved_supported', note='Unconfirmed signal.').status_code == 400
    campaign = action(analyst, 'campaign', name='Casey independent findings', member_ids=[mid],
                      finding_ids=['OP-0005', CASEY_FINDING], owner='coder', value='coding_review')
    assert campaign.status_code == 200
    for fid, decision, note in [('OP-0005', 'resolved_supported', 'Chronic-condition source inspected.'),
                                 (CASEY_FINDING, 'resolved_unsupported', 'Observation does not establish a diagnosis.')]:
        assert action(coder, 'pause_review', id=mid, finding_id=fid, value=decision, note=note).status_code == 200
    selected = coder.get('/api/v1/members/' + mid + '?finding=' + CASEY_FINDING).json()
    assert {c['document_id'] for c in selected['claims']} == {CASEY_SOURCE}
    for index, (fid, decision, note) in enumerate([
            ('OP-0005', 'resolved_supported', 'Chronic-condition source inspected.'),
            (CASEY_FINDING, 'resolved_unsupported', 'Observation does not establish a diagnosis.')], 1):
        assert action(coder, 'review', id=mid, finding_id=fid, value=decision, note=note).status_code == 200
        before_qa = coder.get('/api/v1/members/' + mid + '?finding=' + fid).json()
        finding = next(o for o in before_qa['opportunities'] if o['id'] == fid)
        assert action(coder, 'qa', id=mid, finding_id=fid, decision_id=finding['current_decision_id'], value='passed', note='Self review').status_code == 403
        assert action(qa, 'qa', id=mid, finding_id=fid, decision_id=finding['current_decision_id'], value='passed', note='Independent exact-source review.').status_code == 200
        detail = coder.get('/api/v1/members/' + mid).json()
        assert detail['finding_summary']['completed_finding_count'] == index
        plan = next(c for c in analyst.get('/api/v1/bootstrap').json()['campaigns'] if c['name'] == 'Casey independent findings')
        assert plan['completion_denominator'] == 2 and plan['progress'] == 50 * index
    with main.db() as conn:
        state = main.get_state(conn)
        before = deepcopy(next(o for o in state['opportunities'] if o['id'] == CASEY_FINDING))
        assessment.upgrade(state)
        assert next(o for o in state['opportunities'] if o['id'] == CASEY_FINDING) == before
        assert sum(d['id'] == CASEY_SOURCE for d in state['documents']) == 1
        assert next(d for d in state['documents'] if d['id'] == 'DOC-0008')['pages'] == next(d for d in detail['documents'] if d['id'] == 'DOC-0008')['pages']
