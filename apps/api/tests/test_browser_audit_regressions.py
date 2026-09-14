"""Regressions found while exercising the UI against an isolated workspace."""
from test_demo import action, baseline, database, login, main
from apps.api.app import risk_reconciliation, risk_store


def test_unavailable_model_does_not_look_like_removed_risk_factors():
    analyst = login('analyst')
    config = 'ma_v28_py2027_forecast'
    response = analyst.post('/api/v1/risk/scenarios', json={
        'member_id': 'MB-000005', 'config_id': config,
        'compare_config_id': 'ma_v24_py2025', 'save': True,
        'name': 'Unavailable reference comparison'})
    assert response.status_code == 200, response.text
    comparison = response.json()
    assert comparison['baseline']['status'] == 'completed'
    assert comparison['scenario']['status'] == 'unavailable'
    assert comparison['scenario']['raw_score'] is None
    assert comparison['delta'] is None
    assert comparison['differences'] == []


def test_paused_review_retains_decision_without_bypassing_source_gate():
    coder = login('coder')
    assert action(coder, 'pause_review', id='MB-000001', value='resolved_supported', note='Signed source inspected.').status_code == 200
    finding = coder.get('/api/v1/members/MB-000001').json()['opportunities'][0]
    assert finding['draft_decision'] == 'resolved_supported'
    assert finding['draft_note'] == 'Signed source inspected.'
    assert not finding.get('current_decision_id')
    assert action(coder, 'pause_review', id='MB-000002', value='resolved_supported', note='Historical only.').status_code == 400
    assert action(coder, 'review', id='MB-000001', value='resolved_supported', note='Current source reviewed.').status_code == 200
    finding = coder.get('/api/v1/members/MB-000001').json()['opportunities'][0]
    assert not finding['draft_decision'] and not finding['draft_note']


def test_archived_receiver_evidence_is_retained_but_excluded_from_current_workflow():
    admin = login('superuser')
    config = 'ma_v28_py2027_forecast'
    with main.db() as conn:
        state = main.get_state(conn)
        member = next(m for m in state['members'] if m['id'] == 'MB-000001')
        archived = {'member_id': member['id'], 'submission_id': 'SUB-before-reset',
                    'decision_id': 'DEC-before-reset', 'config_id': config,
                    'eligibility_status': 'eligible', 'created_at': risk_store.timestamp()}
        evidence_id = risk_store.record(conn, 'receiver_eligibility', archived, member['id'])['id']
        rebuilt = risk_reconciliation.qualifying_inputs(conn, state, member, config, [archived])
        assert rebuilt['eligibility_result_ids'] == []
    current = admin.get('/api/v1/risk/members/MB-000001/reconciliation?config_id=' + config)
    assert current.status_code == 200
    assert current.json()['eligibility_results'] == []
    with main.db() as conn:
        assert any(row['id'] == evidence_id for row in risk_store.records(conn, 'receiver_eligibility', member['id']))
