"""Financial assumptions change only saved scenarios; no model/clinical execution."""
from contextlib import contextmanager
from copy import deepcopy
import json
import sqlite3

from fastapi import FastAPI, HTTPException, Request
from fastapi.testclient import TestClient
import pytest

from apps.api.app import risk_financial as financial


def run(id, score, *, program='MA', member='MB-000001', months=9):
    year = 2027 if program == 'MA' else 2026
    return {'id': id, 'member_id': member, 'program': program, 'config_id': 'CONFIG-' + program,
            'year': year, 'status': 'completed', 'raw_score': score, 'adjusted_score': score,
            'score_basis': 'captured_baseline' if id == 'BASE' else 'potential', 'input_hash': 'retained-' + id,
            'snapshot_id': 'IN-' + id, 'monthly_scores': [{'month': f'{year}-{m:02}', 'raw_score': score, 'adjusted_score': score} for m in range(1, months+1)]}


def aca_assumptions():
    value = deepcopy(financial.EXAMPLES['ACA'])
    # Deliberately simple two-plan pool permits independent hand calculation:
    # (1.5 / 1.125 - 1) * (600 * .86) * 9 = $1,548 before equal separate items.
    value['market_plans'] = [dict(plan_id='TARGET', enrollment_share=.25, idf=1, av=.7, arf=1, gcf=1),
                             dict(plan_id='OTHER', enrollment_share=.75, plrs=1, idf=1, av=.7, arf=1, gcf=1)]
    return value


def external(id, score, normalized=None, months=9):
    return dict(run(id, score, program='Medicaid · MMA', months=months), origin='external_import', run_type='external_score',
                config_id='medicaid_fl_external', rate_cell='Adults', rating_period='2026', coverage_months=months,
                monthly_scores=[], adjusted_score=normalized)


def test_ma_uses_actual_months_and_saved_adjusted_score_without_second_normalization():
    before, after = run('BASE', 1, months=3), run('NEXT', 1.5, months=3)
    for row in before['monthly_scores']: row['adjusted_score'] = .9
    for row in after['monthly_scores']: row['adjusted_score'] = 1.35
    frozen = deepcopy([before, after])
    actual = financial.evaluate('MA', [before], [after], financial.EXAMPLES['MA'])
    assert actual['status'] == 'complete' and actual['estimate']['difference'] == 1350
    assert actual['score_comparison']['eligible_member_months'] == 3
    assert actual['estimate']['baseline'] == 2700
    assert [row['label'] for row in actual['sensitivities']] == ['Monthly payment basis: −10%', 'Monthly payment basis: +10%']
    assert [row['difference'] for row in actual['sensitivities']] == [1215, 1485]
    assert [before, after] == frozen
    changed = dict(financial.EXAMPLES['MA'], payment_basis_pmpm=2000)
    assert financial.evaluate('MA', [before], [after], changed)['estimate']['difference'] == 2700
    assert [before, after] == frozen


def test_aca_recomputes_market_denominator_and_itemizes_nontransfer_amounts():
    a = aca_assumptions()
    before, after = run('BASE', 1, program='ACA'), run('NEXT', 1.5, program='ACA')
    result = financial.evaluate('ACA', [before], [after], a)
    assert result['status'] == 'complete', result['errors']
    assert result['score_comparison']['risk_denominators'] == [1, 1.125]
    assert result['estimate']['difference'] == 1548
    assert result['estimate']['baseline'] == -1.8 and result['estimate']['scenario'] == 1546.2
    assert result['components'][0]['difference'] == 1548
    assert result['components'][3]['scenario'] == -1.8
    assert len(result['sensitivities']) == 4
    assert len({row['label'] for row in result['sensitivities']}) == 4
    assert result['actual_payment_status'] == 'unreconciled'
    corrected = financial.evaluate('ACA', [after], [before], a)
    assert corrected['estimate']['difference'] == -1548
    a['market_plans'][0]['enrollment_share'] = .5
    a['market_plans'][1]['enrollment_share'] = .5
    assert financial.evaluate('ACA', [before], [after], a)['estimate']['difference'] == 928.8


def test_aca_plan_with_entire_market_has_no_risk_selection_transfer():
    a = aca_assumptions()
    a['market_plans'] = [dict(a['market_plans'][0], enrollment_share=1)]
    result = financial.evaluate('ACA', [run('BASE', 1, program='ACA')], [run('NEXT', 2, program='ACA')], a)
    assert result['status'] == 'complete' and result['estimate']['difference'] == 0
    assert result['components'][0]['baseline'] == result['components'][0]['scenario'] == 0


def test_same_score_difference_has_program_specific_financial_methods():
    ma = financial.evaluate('MA', [run('BASE', 1)], [run('NEXT', 1.5)], financial.EXAMPLES['MA'])
    aca = financial.evaluate('ACA', [run('BASE', 1, program='ACA')], [run('NEXT', 1.5, program='ACA')], aca_assumptions())
    assumptions = dict(financial.EXAMPLES['Medicaid'], eligible_months=9)
    medicaid = financial.evaluate('Medicaid', [external('BASE', 1)], [external('NEXT', 1.5)], assumptions)
    assert [r['status'] for r in (ma, aca, medicaid)] == ['complete']*3
    assert [r['estimate']['difference'] for r in (ma, aca, medicaid)] == [4500, 1548, 3272.73]


def test_medicaid_retains_external_normalization_and_rate_cell_scope():
    a = dict(financial.EXAMPLES['Medicaid'], normalization_method='provided_normalized', normalization_divisor=999, eligible_months=9, state_factor=1.2)
    before, after = external('BASE', 1, .8), external('NEXT', 1.5, 1.2)
    result = financial.evaluate('Medicaid', [before], [after], a)
    assert result['status'] == 'complete' and result['estimate']['difference'] == 3456
    assert result['score_comparison']['normalization_divisor'] == 1
    after['rate_cell'] = 'Children'
    wrong_cell = financial.evaluate('Medicaid', [before], [after], a)
    assert wrong_cell['status'] == 'incomplete' and wrong_cell['estimate'] is None
    assert any('rate cell' in error for error in wrong_cell['errors'])


@pytest.mark.parametrize('change', [{'target_plan_member_months': 999}, {'benefit_year': 2027}, {'market': 'Medicare'}, {'market_plans': [{'plan_id': 'TARGET', 'enrollment_share': .4, 'idf': 1, 'av': .7, 'arf': 1, 'gcf': 1, 'plrs': 99}]}])
def test_aca_incomplete_market_basis_cannot_produce_money(change):
    a = {**aca_assumptions(), **change}
    result = financial.evaluate('ACA', [run('BASE', 1, program='ACA')], [run('NEXT', 1.5, program='ACA')], a)
    assert result['status'] == 'incomplete' and result['estimate'] is None and result['errors']


def test_missing_assumptions_preserve_scores_and_unknown_program_has_no_fallback():
    before, after = run('BASE', 1), run('NEXT', 1.5)
    frozen = deepcopy([before, after])
    result = financial.evaluate('MA', [before], [after], {})
    assert result['status'] == 'incomplete' and 'payment_basis_pmpm' in result['missing'] and result['estimate'] is None
    assert [before, after] == frozen
    assert financial.evaluate('Part D', [before], [after], {})['estimate'] is None
    assert financial.evaluate('MA', [], [], {})['missing'][:2] == ['baseline_run_id', 'scenario_run_id']
    after['member_id'] = 'MB-000002'
    mismatch = financial.evaluate('MA', [before], [after], financial.EXAMPLES['MA'])
    assert mismatch['status'] == 'incomplete' and mismatch['estimate'] is None


@pytest.fixture
def api():
    # This in-memory SQL store exercises the production persistence helper, with
    # only PostgreSQL's JSONB cast removed. No running application database is used.
    connection = sqlite3.connect(':memory:', check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.executescript('CREATE TABLE risk_runs(id TEXT PRIMARY KEY,body TEXT); CREATE TABLE risk_records(id TEXT PRIMARY KEY,kind TEXT,member_id TEXT,body TEXT,created_at TEXT);')
    for value in [run('BASE', 1), run('NEXT', 1.5), run('HIDDEN', 1.5, member='MB-000002')]:
        connection.execute('INSERT INTO risk_runs VALUES (?,?)', (value['id'], json.dumps(value)))
    class Connection:
        def execute(self, sql, args=()): return connection.execute(sql.replace('::jsonb', ''), args)
    @contextmanager
    def db():
        yield Connection()
        connection.commit()
    def user(request: Request):
        actor = request.headers.get('x-test-user')
        if not actor: raise HTTPException(401)
        return {'id': actor, 'role': actor}
    state = {'members': [{'id': 'MB-000001'}, {'id': 'MB-000002'}]}
    def allowed(s, u): return s['members'][:1] if u['id'] == 'scoped' else s['members']
    def member(s, u, mid):
        if not any(m['id'] == mid for m in allowed(s, u)): raise HTTPException(404)
    def permit(u, action):
        assert action == 'risk_scenario'
        if u['id'] == 'readonly': raise HTTPException(403)
    events = []
    app = FastAPI()
    financial.register(app, db=db, user=user, get_state=lambda c: state, allowed_members=allowed, member=member, permit=permit, event=lambda *args: events.append(args[2:]))
    yield TestClient(app), connection, events
    connection.close()


def test_api_persists_assumptions_and_rejects_unauthorized_run_ids_without_score_mutation(api):
    client, db, events = api
    prior = [tuple(r) for r in db.execute('SELECT * FROM risk_runs ORDER BY id')]
    body = {'program': 'MA', 'name': 'Reviewed sensitivity', 'baseline_run_id': 'BASE', 'scenario_run_id': 'NEXT', 'assumptions': financial.EXAMPLES['MA']}
    assert client.get('/api/v1/risk/financial/schema').status_code == 401
    assert client.post('/api/v1/risk/financial', json=body, headers={'x-test-user': 'readonly'}).status_code == 403
    result = client.post('/api/v1/risk/financial', json=body, headers={'x-test-user': 'analyst'})
    assert result.status_code == 200 and result.json()['status'] == 'complete'
    saved = result.json()
    retrieved = client.get('/api/v1/risk/financial/' + saved['id'], headers={'x-test-user': 'analyst'})
    assert retrieved.json()['assumptions_hash'] == saved['assumptions_hash']
    assert retrieved.json()['score_provenance'][0]['input_hash'] == 'retained-BASE'
    assert len(events) == 1 and events[0][0] == 'financial_sensitivity'
    body['scenario_run_id'] = 'HIDDEN'
    assert client.post('/api/v1/risk/financial', json=body, headers={'x-test-user': 'scoped'}).status_code == 404
    assert [tuple(r) for r in db.execute('SELECT * FROM risk_runs ORDER BY id')] == prior
    assert db.execute('SELECT count(*) FROM risk_records').fetchone()[0] == 1


def test_incomplete_records_without_member_scope_are_visible_only_to_their_author(api):
    client, db, events = api
    saved = client.post('/api/v1/risk/financial', json={'program': 'ACA', 'assumptions': {}}, headers={'x-test-user': 'analyst'}).json()
    assert saved['status'] == 'incomplete' and saved['estimate'] is None
    assert client.get('/api/v1/risk/financial/' + saved['id'], headers={'x-test-user': 'scoped'}).status_code == 404
    assert client.get('/api/v1/risk/financial', headers={'x-test-user': 'scoped'}).json()['items'] == []
    assert client.get('/api/v1/risk/financial', headers={'x-test-user': 'analyst'}).json()['items'][0]['id'] == saved['id']


def test_history_includes_records_beyond_one_hundred_with_reader_scope(api):
    client, db, _ = api
    expected = []
    for index in range(106):
        mid = 'MB-000002' if index == 105 else 'MB-000001'
        record = {'id': f'FIN-{index:04}', 'member_ids': [mid], 'actor_id': 'analyst'}
        db.execute('INSERT INTO risk_records VALUES (?,?,?,?,?)',
                   (record['id'], 'financial', mid, json.dumps(record), f'2026-09-13T00:{index // 60:02}:{index % 60:02}'))
        if index < 105:
            expected.append(record['id'])
    db.commit()
    assert len(client.get('/api/v1/risk/financial', headers={'x-test-user': 'analyst'}).json()['items']) == 106
    scoped = client.get('/api/v1/risk/financial', headers={'x-test-user': 'scoped'}).json()['items']
    assert [item['id'] for item in scoped] == list(reversed(expected))
