"""Imported profiles remain inert, source-linked and confined to their access scope."""
from copy import deepcopy
import hashlib
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from apps.api.app import member360

ROLES = {'executive': {'screens': ['members']}, 'provider': {'screens': ['members']}, 'blocked': {'screens': []}}


def walk(value):
    if isinstance(value, dict):
        yield value
        for child in value.values(): yield from walk(child)
    elif isinstance(value, list):
        for child in value: yield from walk(child)


def test_profiles_preserve_source_and_complete_sections():
    output = member360.profiles_for({'role': 'executive'}, ROLES)
    source = Path(__file__).parents[3] / output['source']['file']
    assert hashlib.sha256(source.read_bytes()).hexdigest() == output['source']['sha256']
    assert len(output['members']) == 5
    assert len({m['id'] for m in output['members']}) == 5
    for member in output['members']:
        assert {p['id'] for p in member['panes']} == {'summary', 'enrollment', 'quality', 'risk', 'clinical', 'claims', 'sdoh'}
        assert all(p['content'] for p in member['panes'])
        assert 'provider_scope' not in member
    assert 'separate from the scored analytics population' in output['source']['notes']
    assert 'have not been validated' in output['source']['notes']


def test_all_imported_nodes_are_inert_and_tables_have_semantic_sections():
    tags = {'div', 'span', 'p', 'b', 'strong', 'i', 'small', 'br', 'h2', 'h3', 'ul', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'details', 'summary', 'button'}
    attrs = {'className', 'id', 'colSpan', 'scope', 'style', 'historyTable', 'historyMax', 'historyAll'}
    nodes = [n for n in walk(member360._DATA) if 'tag' in n]
    ids = {n['attrs']['id'] for n in nodes if 'id' in n['attrs']}
    for node in nodes:
        assert node['tag'] in tags
        assert set(node['attrs']) <= attrs
        if node['tag'] == 'table': assert [n['tag'] for n in node['children']] == ['thead', 'tbody']
        if node['tag'] == 'button':
            assert node['attrs']['historyTable'] in ids
            assert node['attrs']['historyMax'] >= 1
    history_buttons = [n for n in nodes if n['tag'] == 'button']
    assert len(history_buttons) == 12


@pytest.mark.parametrize('scope,ids', [
    ('PR-001', {'M-104829', 'M-441098'}), ('PR-002', {'M-204175'}),
    ('PR-003', {'M-318820'}), ('PR-005', {'M-559214'}), ('PR-999', set()), (None, set()),
])
def test_provider_payload_contains_only_assigned_reference_profiles(scope, ids):
    result = member360.profiles_for({'role': 'provider', 'provider_id': scope}, ROLES)
    assert {m['id'] for m in result['members']} == ids
    assert all('provider_scope' not in m for m in result['members'])


def test_reading_or_mutating_return_value_cannot_change_reference_store():
    before = deepcopy(member360._DATA)
    result = member360.profiles_for({'role': 'executive'}, ROLES)
    result['members'][0]['panes'].clear()
    result['source']['notes'] = ''
    assert member360._DATA == before


def test_api_requires_session_member_permission_and_has_no_write_route():
    from fastapi import HTTPException
    app = FastAPI()
    def session(): raise HTTPException(401)
    member360.register(app, user=session, roles=ROLES)
    client = TestClient(app)
    assert client.get('/api/v1/member360').status_code == 401
    app.dependency_overrides[session] = lambda: {'role': 'blocked'}
    assert client.get('/api/v1/member360').status_code == 403
    app.dependency_overrides[session] = lambda: {'role': 'provider', 'provider_id': 'PR-001'}
    result = client.get('/api/v1/member360')
    assert result.status_code == 200
    assert {m['id'] for m in result.json()['members']} == {'M-104829', 'M-441098'}
    assert client.post('/api/v1/member360', json={}).status_code == 405


def test_clinical_confirmation_gate_and_financial_assumptions_stay_visible():
    for member in member360._DATA['members']:
        risk = next(p for p in member['panes'] if p['id'] == 'risk')
        text = str(risk)
        assert 'confidence scores do not establish a diagnosis' in text
        assert '$12,000' in text and 'not an actual plan-specific' in text
        assert 'confidence alone never confirms a diagnosis' in text
    assert 'eGFR 22 confirms Stage 4' not in str(member360._DATA)
