"""Directory ordering is global and stays inside the caller's member scope."""
import pytest
from test_demo import baseline, database, login, main
from apps.api.app.table_sorting import sort_records


def test_stable_numeric_sort_keeps_missing_last_without_mutation():
    rows = [{'id': 'a', 'score': 10}, {'id': 'b', 'score': None}, {'id': 'c', 'score': 2}, {'id': 'd', 'score': 10}]
    assert [r['id'] for r in sort_records(rows, 'score')] == ['c', 'a', 'd', 'b']
    assert [r['id'] for r in sort_records(rows, 'score', 'desc')] == ['a', 'd', 'c', 'b']
    assert [r['id'] for r in rows] == ['a', 'b', 'c', 'd']


@pytest.mark.parametrize('path,size_key', [('/api/v1/members', 'size'), ('/api/v1/risk/members', 'page_size')])
def test_directory_sort_precedes_pagination_and_preserves_provider_scope(path, size_key):
    client = login('provider2')
    with main.db() as conn:
        state = main.get_state(conn)
        account = {'role': 'provider', 'provider_id': 'PR-002'}
        allowed = main.allowed_members(state, account)
    expected = sort_records(allowed, 'name', 'desc')
    records = []
    for page in (1, 2):
        response = client.get(path, params={'sort_field': 'name', 'sort_direction': 'desc', size_key: 5, 'page': page})
        assert response.status_code == 200
        data = response.json()
        assert data['total'] == len(allowed)
        records.extend(data['items'])
    assert [r.get('member_id', r.get('id')) for r in records] == [m['id'] for m in expected[:10]]
    assert client.get(path, params={'sort_field': 'password_hash'}).status_code == 400
    assert client.get(path, params={'sort_direction': 'invalid'}).status_code == 400
