"""Display migration and dimension reconciliation on the isolated test schema."""
from copy import deepcopy
import json

import pytest
from test_demo import action, baseline, database, login, main
from apps.api.app import florida_population, people, risk_inputs, risk_store

CONFIG = risk_inputs.DEFAULT_CONFIG


def test_directory_migration_preserves_sources_scoring_and_access():
    original = json.loads(main.SEED.read_text())
    state = deepcopy(original)
    original_inputs = [risk_inputs.member_input(m) for m in original['members']]
    florida_population.migrate(state)
    assert len(state['members']) == 10000
    assert state['documents'] == original['documents']
    assert state['opportunities'] == original['opportunities']
    assert state['members'][:7] == [dict(m, county=state['members'][i]['county'], city=state['members'][i]['city'], state='FL', plan='Medicare Advantage') for i, m in enumerate(original['members'][:7])]
    # Display-only plan relabel for the MA Part C story; scoring inputs are asserted unchanged below.
    assert {m['plan'] for m in state['members']} == {'Medicare Advantage'}
    assert [risk_inputs.member_input(m) for m in state['members']] == original_inputs
    assert len({m['name'] for m in state['members']}) > 9900
    assert {m['state'] for m in state['members']} == {'FL'}
    assert {m['county'] for m in state['members']} == {c + ' County' for c, _ in florida_population.LOCATIONS}
    assert len({(m['county'], m['provider_id']) for m in state['members']}) > 30
    assert [p['id'] for p in state['providers']] == [p['id'] for p in original['providers']]
    once = deepcopy(state)
    florida_population.migrate(state)
    assert state == once


def test_account_labels_migrate_without_password_scope_or_session_changes():
    client = login('superuser')
    with main.db() as conn:
        original = [dict(u) for u in conn.execute('SELECT * FROM users ORDER BY id')]
        conn.execute('UPDATE users SET name=? WHERE id=?', ('Coder demo', 'coder'))
        conn.execute('UPDATE users SET name=? WHERE id=?', ('Practice 2 provider', 'provider_2'))
        conn.execute('UPDATE users SET name=? WHERE id=?', ('Dr. Custom Name', 'provider_3'))
        conn.execute('UPDATE users SET name=? WHERE id=?', ('Avery Morgan', 'superuser'))
        sessions = [dict(s) for s in conn.execute('SELECT * FROM sessions ORDER BY token')]
    try:
        main.initialize()
        main.initialize()
        with main.db() as conn:
            actual = {u['id']: dict(u) for u in conn.execute('SELECT * FROM users')}
            assert [dict(s) for s in conn.execute('SELECT * FROM sessions ORDER BY token')] == sessions
            for before in original:
                assert {k: v for k, v in actual[before['id']].items() if k != 'name'} == {k: v for k, v in before.items() if k != 'name'}
            assert actual['superuser']['name'] == 'Albert Riera'
            assert actual['coder']['name'] == 'Alex Chen'
            assert actual['provider_2']['name'] == 'Dr. Daniel Reyes'
            assert actual['provider_3']['name'] == 'Dr. Custom Name'
        snapshot = client.get('/api/v1/bootstrap').json()
        owners = {o['member_id']: o for o in snapshot['opportunities']}
        assert owners['MB-000001']['owner'] == 'Alex Chen'
        assert owners['MB-000002']['owner'] == 'Dr. Daniel Reyes'
        assert owners['MB-000003']['owner'] == 'Dr. Custom Name'
        assert owners['MB-000006']['owner'] == 'Jamie Rivera'
        result = action(client, 'campaign', name='Named owner cohort', member_ids=['MB-000001'], owner='coder')
        assert result.status_code == 200, result.text
        assert client.get('/api/v1/bootstrap').json()['tasks'][-1]['owner'] == 'Alex Chen'
    finally:
        with main.db() as conn:
            for u in original:
                conn.execute('UPDATE users SET name=? WHERE id=?', (u['name'], u['id']))


def test_geography_weighting_intersection_pagination_and_scope():
    with main.db() as conn:
        state = main.get_state(conn)
        # Unequal month counts, a valid zero, a missing score, and a stale run.
        samples = [('MB-000001', [1, 1], 'Miami-Dade County', 'PR-001'),
                   ('MB-000002', [3], 'Miami-Dade County', 'PR-002'),
                   ('MB-000003', [0], 'Broward County', 'PR-002')]
        ids = {}
        for mid, values, county, provider in samples:
            m = next(m for m in state['members'] if m['id'] == mid)
            m.update(county=county, provider_id=provider)
            frozen = risk_store.snapshot(conn, CONFIG, {'member_id': mid, 'synthetic': True})
            run = risk_store.save_run(conn, frozen, {'config_id': CONFIG, 'status': 'completed',
                'raw_score': sum(values) / len(values), 'categories': [],
                'monthly_scores': [{'month': f'2027-{n:02}', 'raw_score': value} for n, value in enumerate(values, 1)]},
                'captured_baseline', actor='geography-test')
            ids[mid] = run['id']
        conn.execute('UPDATE risk_stages SET stale=TRUE WHERE run_id=?', (ids['MB-000002'],))
        main.save_state(conn, state)
    client = login('superuser')
    url = '/api/v1/risk/analytics/geography'
    result = client.get(url).json()
    assert result['summary']['members'] == 10000
    assert result['summary']['value'] == 1.25  # 5 / 4, not average of member or group averages.
    assert result['summary']['denominator'] == 4
    assert result['summary']['scored_members'] == 3
    assert result['summary']['unscored_members'] == 9997
    assert result['summary']['stale_members'] == 1
    for grouping in ['counties', 'providers', 'matrix']:
        assert sum(g['numerator'] for g in result[grouping]) == 5
        assert sum(g['denominator'] for g in result[grouping]) == 4
        assert sum(g['members'] for g in result[grouping]) == 10000
    assert len(result['members_page']['items']) == 10
    filtered = client.get(url, params={'county': 'Miami-Dade County', 'provider_id': 'PR-002', 'dimension': 'county_provider'}).json()
    assert filtered['summary']['value'] == 3
    assert filtered['summary']['denominator'] == 1
    assert filtered['summary']['run_ids'] == [ids['MB-000002']]
    assert all(m['county'] == 'Miami-Dade County' and m['provider_id'] == 'PR-002' for m in filtered['members_page']['items'])
    for size in (25, 50, 100):
        response = client.get(url, params={'size': size, 'page': 2}).json()['members_page']
        assert len(response['items']) == size and response['page'] == 2
        assert response['items'][0]['member_id'] == f'MB-{size + 1:06}'
    empty = client.get(url, params={'county': 'Not in scope'}).json()
    assert empty['summary']['value'] is None and empty['summary']['members'] == 0
    assert not empty['groups'] and not empty['members_page']['items']
    scoped = login('provider2').get(url).json()
    assert scoped['options']['providers'] == [{'id': 'PR-002', 'name': 'Lakeside Medical Group'}]
    assert scoped['summary']['value'] == 1.5
    assert set(scoped['summary']['run_ids']) == {ids['MB-000002'], ids['MB-000003']}
    assert all(m['provider_id'] == 'PR-002' for m in scoped['members_page']['items'])
    assert client.get(url, params={'size': 11}).status_code == 400
    assert client.get(url, params={'dimension': 'invalid'}).status_code == 400
    stage = client.get(url, params={'basis': 'qa_supported'}).json()
    assert stage['summary']['value'] is None and stage['summary']['denominator'] == 0


def test_external_scores_cannot_be_mixed_in_geographic_average():
    admin = login('admin')
    feed = admin.get('/api/v1/risk/external-scores/example').json()
    assert admin.post('/api/v1/risk/external-scores', json=feed).status_code == 200
    result = admin.get('/api/v1/risk/analytics/geography?config_id=medicaid_fl_external&basis=reported').json()
    assert result['limitation']
    assert result['summary']['scored_members'] == 3
    assert result['summary']['value'] is None and result['summary']['numerator'] is None
    assert all(g['value'] is None for g in result['matrix'])
