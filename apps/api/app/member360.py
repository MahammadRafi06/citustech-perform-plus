"""Authenticated, read-only profiles supplied with the Member 360 reference design.

Linked to read-only suspect analytics, separate from native clinical scores. Provider scope IDs
are presentation access assignments, not assertions that these are native patients.
"""
from copy import deepcopy
import json
from pathlib import Path

from fastapi import Depends, HTTPException

_DATA = json.loads((Path(__file__).parent / 'fixtures/member360.json').read_text())


def profiles_for(account, roles):
    if 'members' not in roles.get(account['role'], {}).get('screens', []):
        raise HTTPException(403, detail={'code': 'ACTION_FORBIDDEN', 'message': 'Member access is required.'})
    result = deepcopy(_DATA)
    if account['role'] == 'provider':
        result['members'] = [m for m in result['members'] if m['provider_scope'] == account.get('provider_id')]
    for member in result['members']:
        member.pop('provider_scope')
    return result


def register(app, *, user, roles):
    @app.get('/api/v1/member360', tags=['Member 360'])
    def profiles(u=Depends(user)):
        return profiles_for(u, roles)
