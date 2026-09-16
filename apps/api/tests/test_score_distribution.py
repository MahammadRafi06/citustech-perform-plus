"""Aggregate distribution semantics: scoped, zero-safe and no individual listings."""
from test_demo import baseline, database, login, main
from apps.api.app import risk_inputs, risk_store

CONFIG = risk_inputs.DEFAULT_CONFIG
PRIOR = 'ma_v28_py2026'


def add_run(conn, mid, values, config=CONFIG):
    snapshot = risk_store.snapshot(conn, config, {'member_id': mid, 'synthetic': True})
    return risk_store.save_run(conn, snapshot, {'config_id': config, 'status': 'completed',
        'raw_score': sum(values)/len(values), 'categories': [],
        'monthly_scores': [{'month': f'2027-{i:02}', 'raw_score': value} for i, value in enumerate(values, 1)]},
        'captured_baseline', actor='distribution-test')


def test_distribution_scored_zero_missing_singleton_and_scope():
    with main.db() as conn:
        run = add_run(conn, 'MB-000001', [0, 0])
        conn.execute('UPDATE risk_stages SET stale=TRUE WHERE run_id=?', (run['id'],))
    client = login('superuser')
    path = '/api/v1/risk/analytics/distribution'
    result = client.get(path).json()
    assert result['scored_members'] == 1 and result['unscored_members'] == 9999
    assert result['mean'] == 0 and result['median'] == 0
    assert result['stale_members'] == 1
    assert sum(b['members'] for b in result['histogram']) == 1
    with main.db() as conn:
        add_run(conn, 'MB-000002', [2])
    result = client.get(path).json()
    assert result['mean'] == 1  # equal member weights, not 2/3 member-month weighting
    assert result['median'] == 1
    assert sum(b['members'] for b in result['histogram']) == 2
    scoped = login('provider2').get(path).json()
    assert scoped['scored_members'] == 1 and scoped['mean'] == 2
    assert client.get(path, params={'basis': 'invented'}).status_code == 400


def test_distribution_period_movement_is_aggregate():
    with main.db() as conn:
        prior = PRIOR
        for mid, before, after in [('MB-000001', 1, 2), ('MB-000002', 2, 1), ('MB-000003', 1, 1)]:
            add_run(conn, mid, [before], prior)
            add_run(conn, mid, [after])
    result = login('superuser').get('/api/v1/risk/analytics/distribution', params={'prior_config_id': prior}).json()
    movement = result['movement']
    assert movement['status'] == 'available'
    assert movement['increase'] == movement['decrease'] == movement['unchanged'] == 1
    assert movement['matched_members'] == 3
    assert 'top_increase' not in movement and 'top_decrease' not in movement
