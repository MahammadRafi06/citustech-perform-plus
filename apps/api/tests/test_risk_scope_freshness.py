"""Current aggregate scope and milestones must not overwrite retained evidence."""
from copy import deepcopy

from test_demo import baseline, database, login, main
from test_v2_reconciliation import accepted_record
from apps.api.app import risk_inputs, risk_service, risk_store


CONFIG = risk_inputs.DEFAULT_CONFIG
EXTERNAL = risk_service.EXTERNAL_CONFIG['id']
JORDAN = 'MB-000001'


def test_external_cohort_shrink_filters_aggregates_and_retains_original_runs():
    admin = login('admin')
    feed = admin.get('/api/v1/risk/external-scores/example').json()
    original_import = admin.post('/api/v1/risk/external-scores', json=feed)
    assert original_import.status_code == 200, original_import.text
    with main.db() as conn:
        original_runs = [risk_store.get_run(conn, rid) for rid in original_import.json()['run_ids']]
        original_inputs = {r['snapshot_id']: risk_store.get_input(conn, r['snapshot_id']) for r in original_runs}
    assert {r['member_id'] for r in original_runs} == {JORDAN, 'MB-000002', 'MB-000004'}

    narrowed = deepcopy(feed)
    narrowed['metadata'].update(expected_member_ids=[JORDAN], coverage_basis='Only Jordan; twelve supplied covered months')
    narrowed['rows'] = [dict(feed['rows'][0], raw_score=2.0, normalized_score=1.8)]
    replacement_import = admin.post('/api/v1/risk/external-scores', json=narrowed)
    assert replacement_import.status_code == 200, replacement_import.text
    replacement_id = replacement_import.json()['run_ids'][0]

    response = admin.get('/api/v1/risk/overview?config_id=' + EXTERNAL + '&basis=reported')
    assert response.status_code == 200, response.text
    overview = response.json()
    coverage = overview['coverage']
    assert coverage['enrolled_members'] == coverage['expected_scoreable'] == coverage['scored_members'] == 1
    assert coverage['scored_member_months'] == 12 and coverage['unscored_members'] == 0
    assert overview['portfolio']['raw_score'] == 2.0 and overview['portfolio']['adjusted_score'] == 1.8
    assert overview['portfolio']['numerator'] == 24 and overview['portfolio']['denominator'] == 12
    assert overview['portfolio']['run_ids'] == [replacement_id]
    assert [r['member_id'] for r in overview['members']] == [JORDAN]
    assert len(overview['external_groups']) == 1
    assert overview['external_groups'][0]['run_ids'] == [replacement_id]
    assert sum(row['count'] for row in overview['distribution']) == 1
    assert overview['incomplete'] is False

    # Exclusion from the latest cohort is not deletion or rewriting of earlier evidence.
    with main.db() as conn:
        for run in original_runs:
            assert risk_store.get_run(conn, run['id']) == run
            assert risk_store.get_input(conn, run['snapshot_id']) == original_inputs[run['snapshot_id']]
            if run['member_id'] != JORDAN:
                assert risk_store.current(conn, run['member_id'], EXTERNAL, 'reported')['id'] == run['id']
    for run in original_runs:
        assert admin.get('/api/v1/risk/runs/' + run['id']).json() == run


def test_failed_eligibility_refresh_removes_current_recapture_milestone_only(monkeypatch):
    analyst, submission, sid, baseline_run = accepted_record()
    # A test-specific historical occurrence establishes an actual comparable category;
    # it does not alter Jordan's authored current clinical or captured baseline inputs.
    prior_config = 'ma_v28_py2026'
    with main.db() as conn:
        member = next(m for m in main.get_state(conn)['members'] if m['id'] == JORDAN)
        prior_input = risk_inputs.member_input(member, prior_config)
        prior_input['diagnoses'].append(risk_inputs.diagnosis(JORDAN, 'I5022', '2025-08-20', 'TEST-PRIOR-HF'))
        prior = risk_service.calculate(conn, member, prior_config, prior_input, actor='test-historical-inventory')
        assert prior['status'] == 'completed'

    qualified = submission.post('/api/v1/risk/submissions/' + sid + '/eligibility', json={'fixture_id': 'ELIG-JORDAN-QUALIFIED'})
    assert qualified.status_code == 200, qualified.text
    assert qualified.json()['score_status'] == 'completed'
    with main.db() as conn:
        old_eligible = risk_store.get_run(conn, qualified.json()['run_id'])
        old_input = risk_store.get_input(conn, old_eligible['snapshot_id'])
        supported = risk_store.current(conn, JORDAN, CONFIG, 'qa_supported')
        accepted = risk_store.current(conn, JORDAN, CONFIG, 'accepted')
    assert old_eligible['raw_score'] > baseline_run['raw_score']
    before = analyst.get('/api/v1/risk/recapture').json()
    assert before['clinical'] == before['receiver_eligible'] == {'numerator': 1, 'denominator': 1}
    assert before['items'][0]['clinical_recaptured'] and before['items'][0]['receiver_eligible_recaptured']

    def unavailable(config_id, value):
        assert config_id == CONFIG and {d['code'] for d in value['diagnoses']} == {'I10'}
        assert value['eligibility_exclusions'] and value['enrollment']
        raise RuntimeError('Test-only interruption while recalculating the revised eligible input set.')

    monkeypatch.setattr(risk_service.engine(), 'calculate', unavailable)
    failed_refresh = submission.post('/api/v1/risk/submissions/' + sid + '/eligibility', json={'fixture_id': 'ELIG-JORDAN-NOT-ELIGIBLE'})
    assert failed_refresh.status_code == 200, failed_refresh.text
    assert failed_refresh.json()['eligibility_status'] == 'ineligible'
    assert failed_refresh.json()['score_status'] == 'awaiting_calculation'

    after = analyst.get('/api/v1/risk/recapture').json()
    assert after['clinical'] == {'numerator': 1, 'denominator': 1}
    assert after['receiver_eligible'] == {'numerator': 0, 'denominator': 1}
    assert after['items'][0]['clinical_recaptured'] is True
    assert after['items'][0]['receiver_eligible_recaptured'] is False
    assert after['items'][0]['prior_run_id'] == prior['id']
    assert after['items'][0]['current_run_id'] == baseline_run['id']
    with main.db() as conn:
        retained = risk_store.current(conn, JORDAN, CONFIG, 'eligible')
        assert retained['id'] == old_eligible['id'] and retained['stale'] is True
        assert risk_store.get_run(conn, old_eligible['id']) == old_eligible
        assert risk_store.get_input(conn, old_eligible['snapshot_id']) == old_input
        assert risk_store.current(conn, JORDAN, CONFIG, 'qa_supported') == supported
        assert risk_store.current(conn, JORDAN, CONFIG, 'accepted') == accepted
        assert risk_store.current(conn, JORDAN, CONFIG)['id'] == baseline_run['id']
