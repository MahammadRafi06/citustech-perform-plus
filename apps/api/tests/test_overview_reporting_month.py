"""Reporting-period selection projects retained scores without changing source runs."""
from test_demo import baseline, database, login, main
from apps.api.app import risk_inputs, risk_store

CONFIG = risk_inputs.DEFAULT_CONFIG


def retain(conn, member, months, config=CONFIG, basis='captured_baseline'):
    snapshot = risk_store.snapshot(conn, config, {'member_id': member, 'synthetic': True})
    return risk_store.save_run(conn, snapshot, {'config_id': config, 'status': 'completed',
        'raw_score': 9, 'adjusted_score': 8, 'categories': [], 'monthly_scores': months},
        basis, actor='reporting-month-test')


def test_month_changes_metrics_distribution_export_and_preserves_runs():
    with main.db() as conn:
        first = retain(conn, 'MB-000001', [
            {'month': '2027-01', 'raw_score': 0, 'adjusted_score': 0},
            {'month': '2027-02', 'raw_score': 3, 'adjusted_score': 2.7}])
        retain(conn, 'MB-000002', [{'month': '2027-01', 'raw_score': 2, 'adjusted_score': 1.8}])
        conn.execute('UPDATE risk_stages SET stale=TRUE WHERE run_id=?', (first['id'],))
    client = login('superuser')
    path = '/api/v1/risk/overview'
    january = client.get(path, params={'run_month': '2027-01'}).json()
    february = client.get(path, params={'run_month': '2027-02'}).json()
    assert january['portfolio']['raw_score'] == 1
    assert january['portfolio']['adjusted_score'] == .9
    assert january['portfolio']['denominator'] == 2
    assert january['coverage']['scored_members'] == 2
    assert january['reporting_period']['month'] == '2027-01'
    assert january['stale'] is True
    assert [bucket['count'] for bucket in january['distribution']] == [1, 0, 0, 1, 0]
    assert february['portfolio']['raw_score'] == 3
    assert february['coverage']['scored_members'] == 1
    assert february['members'][0]['raw_score'] == 3
    assert client.get(path).json()['portfolio']['raw_score'] == 5 / 3
    with main.db() as conn:
        original = conn.execute('SELECT body FROM risk_runs WHERE id=?', (first['id'],)).fetchone()['body']
        assert original['raw_score'] == 9 and len(original['monthly_scores']) == 2
    scoped = login('provider2').get(path, params={'run_month': '2027-02'}).json()
    assert scoped['portfolio']['raw_score'] is None
    assert scoped['coverage']['scored_members'] == 0
    assert scoped['members'] == []


def test_empty_null_and_invalid_months_do_not_fall_back_to_annual_scores():
    with main.db() as conn:
        retain(conn, 'MB-000001', [{'month': '2027-03', 'raw_score': None, 'adjusted_score': None}])
    client = login('superuser')
    path = '/api/v1/risk/overview'
    for month in ['2027-03', '2027-12']:
        result = client.get(path, params={'run_month': month}).json()
        assert result['portfolio']['raw_score'] is None
        assert result['portfolio']['denominator'] == 0
        assert result['coverage']['scored_members'] == 0
        assert sum(bucket['count'] for bucket in result['distribution']) == 0
        assert month in result['portfolio']['incomplete_reason']
    for invalid in ['2027-13', '2027-1', '2026-01', 'not-a-month']:
        assert client.get(path, params={'run_month': invalid}).status_code == 400
    assert client.get(path, params={'config_id': 'medicaid_fl_external', 'run_month': '2026-01'}).status_code == 400


def test_aca_monthly_coverage_respects_authored_enrollment_window():
    client = login('superuser')
    path = '/api/v1/risk/overview'
    september = client.get(path, params={'config_id': 'hhs_v08_by2026', 'run_month': '2026-09'}).json()
    october = client.get(path, params={'config_id': 'hhs_v08_by2026', 'run_month': '2026-10'}).json()
    assert september['coverage']['expected_scoreable'] == 110000
    assert september['coverage']['enrolled_member_months'] == 110000
    assert october['coverage']['expected_scoreable'] == 0
    assert october['coverage']['enrolled_member_months'] == 0


def test_score_tiles_keep_each_retained_basis_independent():
    values = {'captured_baseline': 1, 'potential': 1.5, 'submitted': 1.2, 'accepted': 1.1}
    with main.db() as conn:
        for basis, value in values.items():
            retain(conn, 'MB-000001', [{'month': '2027-01', 'raw_score': value, 'adjusted_score': value}], basis=basis)
    client = login('superuser')
    for basis, value in values.items():
        result = client.get('/api/v1/risk/overview', params={'basis': basis}).json()
        assert result['portfolio']['raw_score'] == value
        assert result['score_basis'] == basis
        assert result['reporting_period']['label'] == 'Latest 2027'


def test_blend_options_preserve_calculation_availability_and_have_empty_results():
    client = login('superuser')
    configurations = {item['id']: item for item in client.get('/api/v1/risk/configurations').json()['items']}
    for year, expected in [(2024, [67, 33]), (2025, [33, 67])]:
        config = configurations[f'ma_blend_py{year}']
        assert [part['percent'] for part in config['blend_components']] == expected
        assert config['capabilities']['calculate'] is False
        result = client.get('/api/v1/risk/overview', params={'config_id': config['id']})
        assert result.status_code == 200
        assert result.json()['portfolio']['raw_score'] is None
    assert configurations[CONFIG]['validation_status'] == 'validated for declared scope'
