"""Risk persistence, scope and stage acceptance on the disposable local schema."""
import json
from pathlib import Path
import time

from test_demo import action, baseline, database, login, main
from apps.api.app import risk_store, risk_service, risk_inputs


CONFIG = risk_inputs.DEFAULT_CONFIG


def test_overview_includes_all_scored_members_in_stable_order_with_reader_scope():
    admin = login('admin')
    feed = admin.get('/api/v1/risk/external-scores/example').json()
    with main.db() as conn:
        members = main.get_state(conn)['members'][:105]
    member_ids = sorted(m['id'] for m in members)
    feed['metadata']['expected_member_ids'] = member_ids
    feed['rows'] = [dict(feed['rows'][0], member_id=mid) for mid in reversed(member_ids)]
    imported = admin.post('/api/v1/risk/external-scores', json=feed)
    assert imported.status_code == 200, imported.text
    assert imported.json()['imported'] == 105

    url = '/api/v1/risk/overview?config_id=medicaid_fl_external&basis=reported'
    overview = admin.get(url).json()
    assert [row['member_id'] for row in overview['members']] == member_ids
    assert overview['coverage']['scored_members'] == len(overview['members']) == 105
    assert overview['portfolio']['denominator'] == 105 * feed['rows'][0]['coverage_months']
    assert {row['run_id'] for row in overview['members']} == set(imported.json()['run_ids'])

    scoped = login('provider2').get(url).json()
    expected = sorted(m['id'] for m in members if m['provider_id'] == 'PR-002')
    assert [row['member_id'] for row in scoped['members']] == expected
    assert scoped['coverage']['scored_members'] == len(expected)


def test_period_comparison_includes_every_matched_member_and_retained_run():
    client = login('admin')
    with main.db() as conn:
        members = main.get_state(conn)['members'][:105]
        run_ids = {}
        for config_id, score in [('ma_v28_py2026', 1.0), (CONFIG, 1.5)]:
            run_ids[config_id] = {}
            for member in reversed(members):
                frozen = risk_store.snapshot(conn, config_id, {'member_id': member['id'], 'synthetic': True})
                run = risk_store.save_run(conn, frozen, {
                    'config_id': config_id, 'status': 'completed', 'raw_score': score,
                    'monthly_scores': [{'month': f'2026-{month:02}', 'raw_score': score} for month in range(1, 13)],
                    'categories': [],
                }, 'captured_baseline', actor='pagination-test')
                run_ids[config_id][member['id']] = run['id']
    url = '/api/v1/risk/analytics?config_id=' + CONFIG + '&prior_config_id=ma_v28_py2026'
    comparison = client.get(url).json()['comparison']
    assert comparison['matched_members'] == len(comparison['members']) == 105
    assert comparison['before']['denominator'] == comparison['after']['denominator'] == 1260
    assert comparison['raw_change'] == 0.5
    assert [row['member_id'] for row in comparison['members']] == sorted(m['id'] for m in members)
    for row in comparison['members']:
        assert row['prior_run_id'] == run_ids['ma_v28_py2026'][row['member_id']]
        assert row['current_run_id'] == run_ids[CONFIG][row['member_id']]
    scoped = login('provider2').get(url).json()['comparison']
    assert [row['member_id'] for row in scoped['members']] == sorted(m['id'] for m in members if m['provider_id'] == 'PR-002')
    assert scoped['matched_members'] == len(scoped['members'])


def test_status_drilldown_and_analytics_reconcile_without_zero_stages():
    client = login()
    run = calculate(client, 'MB-000005')
    scored = client.get('/api/v1/risk/members?status=completed').json()
    assert scored['total'] == 1 and scored['items'][0]['run_id'] == run['id']
    assert client.get('/api/v1/risk/members?status=unscored').json()['total'] == 9999
    assert client.get('/api/v1/risk/members?status=wrong').status_code == 400
    result = client.get('/api/v1/risk/analytics').json()
    assert len(result['monthly']) == 12
    assert all(row['denominator'] == 1 and row['value'] == run['raw_score'] for row in result['monthly'])
    stages = {s['basis']: s for s in result['stages']}
    assert stages['captured_baseline']['value'] == run['raw_score']
    assert stages['qa_supported']['value'] is None and stages['qa_supported']['movement']['delta'] is None
    assert result['category_prevalence'] and all(row['member_ids'] == ['MB-000005'] for row in result['category_prevalence'])
    outside = login('provider2').get('/api/v1/risk/analytics').json()
    assert not outside['monthly'] and outside['stages'][0]['run_ids'] == []


def test_incompatible_external_feed_bases_are_not_averaged():
    admin = login('admin')
    sample = admin.get('/api/v1/risk/external-scores/example').json()
    assert admin.post('/api/v1/risk/external-scores', json=sample).status_code == 200
    sample['metadata']['normalization_basis'] = 'A distinct external producer normalization'
    sample['rows'] = [r for r in sample['rows'] if r['member_id'] == 'MB-000002']
    assert admin.post('/api/v1/risk/external-scores', json=sample).status_code == 200
    overview = admin.get('/api/v1/risk/overview?config_id=medicaid_fl_external&basis=reported').json()
    assert overview['coverage']['scored_members'] == 3
    assert overview['coverage']['expected_scoreable'] == 6 and overview['coverage']['enrolled_member_months'] is None
    assert len(overview['external_groups']) == 2
    assert overview['portfolio']['raw_score'] is None and overview['portfolio']['adjusted_score'] is None
    assert overview['portfolio']['numerator'] is None and overview['portfolio']['incomplete_reason']


def test_case_proposal_does_not_leak_to_second_finding():
    with main.db() as conn:
        state = main.get_state(conn)
        m = next(m for m in state['members'] if m['id'] == 'MB-000001')
        original = next(o for o in state['opportunities'] if o['id'] == 'OP-0001')
        state['opportunities'].append({**original, 'id': 'OP-INDEPENDENT', 'condition': 'Unrelated condition'})
        candidates = risk_inputs.candidate_changes(state, m, CONFIG)
        assert [c['finding_id'] for c in candidates] == ['OP-0001']


def test_recapture_uses_actual_prior_category_without_current_carryforward():
    client = login()
    prior = calculate(client, 'MB-000002', 'ma_v28_py2026')
    current = calculate(client, 'MB-000002')
    prior_input = client.get('/api/v1/risk/runs/' + prior['id'] + '/input').json()
    current_input = client.get('/api/v1/risk/runs/' + current['id'] + '/input').json()
    assert prior_input['dob'] == current_input['dob']
    result = client.get('/api/v1/risk/recapture').json()
    assert result['clinical']['denominator'] == 1 and result['clinical']['numerator'] == 0
    row = result['items'][0]
    assert row['prior_run_id'] == prior['id'] and row['current_run_id'] == current['id']
    assert row['state'] == 'assessment_due' and row['clinical_recaptured'] is False
    assert not any(c.get('code') == 'J449' for c in current['categories'])
    assert client.get('/api/v1/risk/recapture?config_id=ma_v28_py2026').json()['status'] == 'not_comparable'


def test_controlled_reset_retains_runs_accounts_and_external_evidence():
    analyst = login(); coder = login('coder'); qa = login('qa'); admin = login('admin')
    captured = calculate(analyst)
    assert action(coder, 'review', id='MB-000001', value='resolved_supported', note='Current assessment reviewed.').status_code == 200
    finding = coder.get('/api/v1/members/MB-000001').json()['opportunities'][0]
    assert action(qa, 'qa', id='MB-000001', value='passed', decision_id=finding['current_decision_id'], note='Independent source verification.').status_code == 200
    supported = next(s['run'] for s in analyst.get('/api/v1/risk/member/MB-000001').json()['stages'] if s['basis'] == 'qa_supported')
    feed = admin.get('/api/v1/risk/external-scores/example').json()
    assert admin.post('/api/v1/risk/external-scores', json=feed).status_code == 200
    assert admin.post('/api/v1/admin/reset', json={'confirmation': 'RESET WORKSPACE'}).status_code == 200
    profile = analyst.get('/api/v1/risk/member/MB-000001').json()
    assert profile['run']['id'] == captured['id']
    assert next(s['run'] for s in profile['stages'] if s['basis'] == 'qa_supported') is None
    assert analyst.get('/api/v1/risk/runs/' + supported['id']).json()['raw_score'] == supported['raw_score']
    external = admin.get('/api/v1/risk/overview?config_id=medicaid_fl_external&basis=reported').json()
    assert external['coverage']['scored_members'] == 3 and external['stale'] is True
    assert admin.get('/api/v1/auth/session').status_code == 200


def test_prior_aged_entitlement_is_excluded_without_invented_disability():
    with main.db() as conn:
        m = next(m for m in main.get_state(conn)['members'] if m['age'] == 65)
    client = login()
    result = client.post('/api/v1/risk/calculate', json={'member_id': m['id'], 'config_id': 'ma_v28_py2026'}).json()
    assert result['status'] == 'unavailable' and result['raw_score'] is None
    assert result['exclusions'][0]['code'] == 'BEFORE_AGED_ENTITLEMENT'
    frozen = client.get('/api/v1/risk/runs/' + result['id'] + '/input').json()
    assert frozen['orec'] == 0 and frozen['enrollment'] == []
    overview = client.get('/api/v1/risk/overview?config_id=ma_v28_py2026').json()
    assert overview['coverage']['expected_scoreable'] == 9600 and overview['coverage']['excluded_members'] == 400
    assert overview['coverage']['failed_members'] == 0


def test_external_detail_projects_cohort_metadata_to_actual_reader_scope():
    admin = login('admin')
    feed = admin.get('/api/v1/risk/external-scores/example').json()
    imported = admin.post('/api/v1/risk/external-scores', json=feed).json()
    with main.db() as conn:
        run = risk_store.current(conn, 'MB-000002', 'medicaid_fl_external', 'reported')
    provider = login('provider2')
    viewed = provider.get('/api/v1/risk/runs/' + run['id']).json()
    assert 'MB-000001' not in viewed['provenance']['expected_member_ids']
    assert viewed['scope_projection']['redacted_count'] > 0
    frozen = provider.get('/api/v1/risk/runs/' + run['id'] + '/input').json()
    assert 'MB-000001' not in frozen['metadata']['expected_member_ids']
    with main.db() as conn:
        retained = risk_store.get_run(conn, run['id'])
    assert 'MB-000001' in retained['provenance']['expected_member_ids']


def calculate(client, mid='MB-000001', config=CONFIG):
    response = client.post('/api/v1/risk/calculate', json={'member_id': mid, 'config_id': config})
    assert response.status_code == 200, response.text
    result = response.json()
    assert result['status'] == 'completed', result
    return result


def test_calculation_scope_and_workflow_stage_authority():
    provider = login('provider2')
    assert provider.get('/api/v1/risk/member/MB-000001').status_code == 404
    assert provider.post('/api/v1/risk/calculate', json={'member_id': 'MB-000002'}).status_code == 403
    analyst = login()
    assert analyst.post('/api/v1/risk/calculate', json={'member_id': 'MB-000001', 'basis': 'qa_supported'}).status_code == 400
    assert analyst.post('/api/v1/risk/calculate', json={'member_id': 'MB-000001', 'input_snapshot': {'member_id': 'MB-000001'}}).status_code == 400
    baseline_run = calculate(analyst)
    assert login('provider2').get('/api/v1/risk/runs/' + baseline_run['id']).status_code == 404
    assert login('provider2').get('/api/v1/risk/runs/' + baseline_run['id'] + '/export').status_code == 404


def test_saved_scenario_recomputes_union_without_clinical_mutation_and_exports_old_inputs():
    client = login()
    original = calculate(client)
    before = client.get('/api/v1/members/MB-000001').json()['opportunities'][0]
    payload = {'member_id': 'MB-000001', 'config_id': CONFIG, 'baseline_run_id': original['id'],
               'add_codes': [{'code': 'I50.22'}, {'code': 'I50.22'}], 'save': True, 'name': 'Duplicate-neutral supported hypothesis'}
    first = client.post('/api/v1/risk/scenarios', json=payload)
    assert first.status_code == 200, first.text
    first = first.json()
    assert first['scenario']['status'] == 'completed' and first['delta'] > 0
    payload['add_codes'] = [{'code': 'I50.22'}]
    second = client.post('/api/v1/risk/scenarios', json=payload).json()
    assert first['scenario']['raw_score'] == second['scenario']['raw_score']
    after = client.get('/api/v1/members/MB-000001').json()['opportunities'][0]
    assert before['status'] == after['status'] and before['decision_history'] == after['decision_history']
    profile = client.get('/api/v1/risk/member/MB-000001').json()
    assert profile['run']['id'] == original['id']
    assert all(s['run'] is None for s in profile['stages'] if s['basis'] != 'captured_baseline')
    exported = client.get('/api/v1/risk/runs/' + original['id'] + '/export').json()
    assert exported['run']['raw_score'] == original['raw_score']
    assert [d['code'] for d in exported['input_snapshot']['diagnoses']] == ['I10']
    assert all(d['id'].startswith('DX-MB-000001') for d in exported['input_snapshot']['diagnoses'])


def test_independent_qa_updates_only_supported_basis_with_exact_saved_run():
    analyst = login(); coder = login('coder'); qa = login('qa')
    original = calculate(analyst)
    assert action(coder, 'review', id='MB-000001', value='resolved_supported', note='Reviewed the exact current signed assessment.').status_code == 200
    saved = coder.get('/api/v1/members/MB-000001').json()['opportunities'][0]
    assert saved['decision_history'][-1]['risk_context']['baseline_run_id'] == original['id']
    assert action(qa, 'qa', id='MB-000001', value='passed', decision_id=saved['current_decision_id'], note='Independent source and code verification.').status_code == 200
    profile = analyst.get('/api/v1/risk/member/MB-000001').json()
    stages = {s['basis']: s['run'] for s in profile['stages']}
    assert stages['captured_baseline']['id'] == original['id']
    assert stages['qa_supported']['raw_score'] > original['raw_score']
    assert stages['submitted'] is None and stages['accepted'] is None and stages['reported'] is None
    with main.db() as conn:
        frozen = risk_store.get_input(conn, stages['qa_supported']['snapshot_id'])
    approved = [d for d in frozen['diagnoses'] if d.get('decision_id')]
    assert len(approved) == 1 and approved[0]['source_id'] == 'DOC-0001' and approved[0]['service_date'] == '2026-08-28'


def test_external_feed_partitions_and_raw_import_provenance():
    admin = login('admin')
    sample = admin.get('/api/v1/risk/external-scores/example')
    assert sample.status_code == 200
    imported = admin.post('/api/v1/risk/external-scores', json=sample.json())
    assert imported.status_code == 200, imported.text
    imported = imported.json()
    assert (imported['received'], imported['imported'], imported['excluded']) == (7, 3, 4)
    assert imported['missing_member_ids'] == []
    assert len(imported['run_ids']) == 3
    run = admin.get('/api/v1/risk/runs/' + imported['run_ids'][0]).json()
    assert run['origin'] == 'external_import' and run['score_basis'] == 'reported'
    assert run['raw_score'] == 1.25 and run['components'] == []
    assert 'Component detail unavailable' in run['warnings'][0]
    with main.db() as conn:
        risk_store.mark_stale(conn, 'MB-000001', 'Awaiting external refresh', 'medicaid_fl_external')
        stale = risk_store.current(conn, 'MB-000001', 'medicaid_fl_external', 'reported')
        assert stale['stale'] and stale['raw_score'] == 1.25
    assert login().post('/api/v1/risk/calculate', json={'member_id': 'MB-000001', 'config_id': 'medicaid_fl_external'}).status_code == 400


def test_paged_directory_never_invents_zero_for_unscored_members():
    client = login(); calculated = calculate(client)
    page = client.get('/api/v1/risk/members?page=1&page_size=2').json()
    assert page['total'] == 10000 and len(page['items']) == 2
    assert page['items'][0]['run_id'] == calculated['id']
    assert page['items'][1]['status'] == 'not_calculated' and page['items'][1]['raw_score'] is None
    overview = client.get('/api/v1/risk/overview').json()
    assert overview['coverage']['scored_members'] == 1 and overview['coverage']['scored_member_months'] == 12
    assert overview['portfolio']['raw_score'] == calculated['raw_score']
    assert overview['incomplete'] and len(overview['portfolio']['run_ids']) == 1
    provider = login('provider2').get('/api/v1/risk/members').json()
    assert all(m['provider_id'] == 'PR-002' for m in provider['items'])


def test_batch_progress_retry_and_member_run_identity(monkeypatch):
    client = login()
    original = risk_service.engine().calculate_many
    failed_once = False
    def interrupted(config_id, values):
        nonlocal failed_once
        results = original(config_id, values)
        if not failed_once:
            results[-1].update(status='failed', raw_score=None, adjusted_score=None, errors=['Injected recoverable execution failure'])
            failed_once = True
        return results
    monkeypatch.setattr(risk_service.engine(), 'calculate_many', interrupted)
    created = client.post('/api/v1/risk/batches', json={'config_id': CONFIG, 'member_ids': ['MB-000001', 'MB-000002']})
    assert created.status_code == 200, created.text
    bid = created.json()['id']
    def completed():
        deadline = time.monotonic() + 45
        while time.monotonic() < deadline:
            result = client.get('/api/v1/risk/batches/' + bid).json()
            if result['status'] in ('completed', 'partially_scored', 'interrupted'):
                return result
            time.sleep(.1)
        raise AssertionError('Batch did not finish in the bounded test window')
    first = completed()
    assert first['status'] == 'partially_scored' and first['succeeded'] == 1 and first['failed'] == 1, first
    assert client.post('/api/v1/risk/batches/' + bid + '/resume').status_code == 200
    final = completed()
    assert final['status'] == 'completed' and final['processed'] == final['succeeded'] == 2
    assert final['failed'] == 0 and final['errors'] == []
    with main.db() as conn:
        assert len(risk_store.history(conn, 'MB-000001', CONFIG)) == 1
        assert len(risk_store.history(conn, 'MB-000002', CONFIG)) == 2
