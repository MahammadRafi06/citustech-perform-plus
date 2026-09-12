"""Smoke-test the three running acceptance containers through the public UI proxy."""
import http.cookiejar
import json
import os
import urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
env=dict(line.split('=',1) for line in (ROOT/'.local/acceptance.env').read_text().splitlines() if '=' in line)
base='http://localhost:3002'
jar=http.cookiejar.CookieJar()
client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
csrf=''
def request(path,body=None,method=None):
    headers={'Origin':base,'Content-Type':'application/json'}
    if csrf:headers['X-CSRF-Token']=csrf
    req=urllib.request.Request(base+path,data=json.dumps(body).encode() if body is not None else None,headers=headers,method=method)
    with client.open(req,timeout=30) as response:return response.status,json.loads(response.read())
assert request('/health')[0]==200
_,account=request('/api/v1/auth/login',{'email':'analyst.demo@example.test','password':env['CT_ACCEPTANCE_PASSWORD']})
csrf=account['csrf_token']
_,state=request('/api/v1/bootstrap')
assert state['population_count']==10000
_,result=request('/api/v1/actions',{'action':'analyze','member_ids':['MB-000001']})
assert result['ok']
assert request('/api/v1/auth/session')[1]['role']=='risk_analyst'
_,state=request('/api/v1/bootstrap')
assert any(r['members']==1 and r['mode']=='fixture' for r in state['runs'])
request('/api/v1/auth/session',method='DELETE')
print('Container acceptance passed: standalone UI → separate API → PostgreSQL, real cookie login/CSRF, scoped data, saved workflow and logout.')
