"""Local API checks in the existing isolated test schema; no application reset."""
import io
import json
import zipfile
from test_demo import baseline, database, login, main

BASE='/api/v1/analytics'

def test_auth_scope_and_contract_filter():
    provider=login('provider2')
    report=provider.get(BASE+'/experience').json()
    assert all(c['provider_id']=='PR-002' or (c['provider_id']=='M360-PR-002' and c['member_id']=='M-204175') for c in report['cases'])
    assert {c['member_id'] for c in report['cases'] if c.get('profile_reference')} == {'M-204175'}
    assert {p['id'] for p in report['options']['practices']} == {'PR-002','M360-PR-002'}
    denied=provider.get(BASE+'/experience',params={'context':json.dumps({'practices':['PR-001']})}).json()
    assert denied['summary']['enrolled']==0
    assert provider.post(BASE+'/scenario',json={'ids':[report['cases'][0]['id']]}).status_code==403


def test_save_open_export_and_permission_change():
    client=login('superuser')
    report=client.get(BASE+'/experience').json()
    payload={'snapshot_hash':report['snapshot_hash'],'report_id':'R08','name':'Arithmetic snapshot'}
    saved=client.post(BASE+'/reports',json=payload)
    assert saved.status_code==200, saved.text
    sid=saved.json()['id']
    reopened=client.get(BASE+'/reports/'+sid).json()
    assert reopened['report']['snapshot_hash']==report['snapshot_hash']
    exported=client.post(BASE+'/export',json={**payload,'format':'zip','saved_id':sid})
    assert exported.status_code==200
    z=zipfile.ZipFile(io.BytesIO(exported.content))
    assert json.loads(z.read('manifest.json'))['snapshot_hash']==report['snapshot_hash']
    assert 'members.csv' not in z.namelist() and 'suspects.csv' not in z.namelist()
    with main.db() as conn:
        conn.execute("UPDATE users SET role='provider',provider_id='PR-002' WHERE id='superuser'")
    try:
        assert client.get(BASE+'/reports/'+sid).status_code==403
        assert client.post(BASE+'/export',json={**payload,'saved_id':sid}).status_code==403
        assert client.get(BASE+'/reports').json()['items'][0]['name']=='Restricted saved report'
    finally:
        with main.db() as conn: conn.execute("UPDATE users SET role='superuser',provider_id='' WHERE id='superuser'")


def test_full_filter_export_and_context_conflict():
    client=login('superuser');report=client.get(BASE+'/experience').json()
    result=client.post(BASE+'/export',json={'report_id':'registry','format':'json','snapshot_hash':report['snapshot_hash']})
    assert result.status_code==200 and len(result.json()['suspects'])==report['summary']['cases']
    assert client.post(BASE+'/export',json={'report_id':'registry','ids':['not-permitted']}).status_code==403
    assert client.post(BASE+'/reports',json={'snapshot_hash':'stale-hash'}).status_code==409
    assert client.post(BASE+'/export',json={'snapshot_hash':'stale-hash'}).status_code==409


def test_illustrative_scenario_keeps_clinical_state_and_stages():
    client=login('superuser');report=client.get(BASE+'/experience').json()
    ids=[c['id'] for c in report['cases'] if not c.get('profile_reference') and c['delta'] is not None][:3]
    with main.db() as conn:
        before=conn.execute('SELECT body FROM state WHERE id=1').fetchone()['body']
        stages=conn.execute('SELECT COUNT(*) AS n FROM risk_stages').fetchone()['n']
    result=client.post(BASE+'/scenario',json={'ids':ids,'mode':'illustrative'})
    assert result.status_code==200,result.text
    assert result.json()['mode']=='illustrative' and result.json()['delta'] is not None
    with main.db() as conn:
        assert conn.execute('SELECT body FROM state WHERE id=1').fetchone()['body']==before
        assert conn.execute('SELECT COUNT(*) AS n FROM risk_stages').fetchone()['n']==stages


def test_model_absence_does_not_prevent_populated_presentation():
    client=login('superuser')
    report=client.get(BASE+'/experience',params={'config_id':'ma_blend_py2024'}).json()
    assert report['origin']=='authored_synthetic_fixture'
    assert report['bases']['captured_baseline'] is not None
    result=client.post(BASE+'/scenario',json={'config_id':'ma_blend_py2024','ids':[report['cases'][0]['id']],'mode':'calculated'})
    assert result.status_code in (400,409)


def test_native_scenario_does_not_publish_stages():
    client=login('superuser');report=client.get(BASE+'/experience').json()
    case=next(c for c in report['cases'] if 'OP-0001' in c['aliases'])
    with main.db() as conn: before=conn.execute('SELECT COUNT(*) AS n FROM risk_stages').fetchone()['n']
    response=client.post(BASE+'/scenario',json={'ids':[case['id']],'mode':'calculated'})
    assert response.status_code==200,response.text
    assert response.json()['result']['member_count']==1
    with main.db() as conn: assert conn.execute('SELECT COUNT(*) AS n FROM risk_stages').fetchone()['n']==before


def test_linked_profiles_are_first_exportable_and_not_native_score_inputs():
    client=login('superuser');report=client.get(BASE+'/experience').json()
    expected=['M-104829','M-318820','M-204175','M-441098','M-559214']
    assert [c['member_id'] for c in report['cases'][:5]] == expected
    export=client.post(BASE+'/export',json={'report_id':'registry','format':'json','snapshot_hash':report['snapshot_hash']})
    assert [c['member_id'] for c in export.json()['suspects'][:5]] == expected
    ids=[report['cases'][0]['id']]
    for mode in ('calculated','illustrative'):
        assert client.post(BASE+'/scenario',json={'ids':ids,'mode':mode}).status_code==409
    aca=client.get(BASE+'/experience',params={'config_id':'hhs_v08_by2026'}).json()
    assert not any(c.get('profile_reference') for c in aca['cases'])
