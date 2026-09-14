"""Focused acceptance checks against an isolated schema, never the running demo state."""
import io
import json
import os
import tempfile
import uuid
import zipfile
from pathlib import Path

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo
import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[3]
BASE_URL = os.environ.get('DATABASE_URL') or (ROOT / '.local/database-url').read_text().strip()
SCHEMA = 'ct_test_' + uuid.uuid4().hex[:12]
DATABASE_USERS = 0
TEMP = tempfile.TemporaryDirectory(prefix='ct-tests-')
os.environ['CT_DATA_DIR'] = TEMP.name
os.environ['CT_DEMO_PASSWORD'] = 'Synthetic-test-password-8!'
os.environ['CT_SUPERUSER_PASSWORD'] = 'Synthetic-superuser-password-9!'
os.environ['DATABASE_URL'] = make_conninfo(BASE_URL, options=f'-c search_path={SCHEMA}')
from apps.api.app import main

@pytest.fixture(scope='session', autouse=True)
def database():
    # Additional focused modules reuse this harness; pytest may register the
    # imported fixture once per module, while they share this exact schema.
    global DATABASE_USERS
    if not DATABASE_USERS:
        with psycopg.connect(BASE_URL, autocommit=True) as conn:
            conn.execute(sql.SQL('CREATE SCHEMA {}').format(sql.Identifier(SCHEMA)))
        main.initialize()
    DATABASE_USERS+=1
    try:
        yield
    finally:
        DATABASE_USERS-=1
        if not DATABASE_USERS:
            with psycopg.connect(BASE_URL, autocommit=True) as conn:
                conn.execute(sql.SQL('DROP SCHEMA {} CASCADE').format(sql.Identifier(SCHEMA)))
            TEMP.cleanup()

@pytest.fixture(autouse=True)
def baseline(database):
    with main.db() as conn:
        state=json.loads(main.SEED.read_text());state.update(tasks=[],runs=[],tour_started=main.now())
        main.save_state(conn,state)
        # These tables exist only in this test's disposable schema. Keep saved
        # calculations from one clinical example out of the next example.
        conn.execute('TRUNCATE risk_stages, risk_runs, risk_inputs, risk_records, risk_batches')
        conn.execute('DELETE FROM events')
        conn.execute('DELETE FROM sessions')
        conn.execute('DELETE FROM login_attempts')


def login(role='analyst'):
    client=TestClient(main.app)
    password=os.environ['CT_SUPERUSER_PASSWORD' if role=='superuser' else 'CT_DEMO_PASSWORD']
    result=client.post('/api/v1/auth/login',json={'email':f'{role}@perform.test','password':password})
    assert result.status_code==200, result.text
    client.headers['x-csrf-token']=result.json()['csrf_token']
    return client


def action(client, action_name, **kwargs):
    return client.post('/api/v1/actions',json={'action':action_name,**kwargs})


def test_login_csrf_and_logout():
    guest=TestClient(main.app)
    assert guest.get('/api/v1/bootstrap').status_code==401
    assert guest.post('/api/v1/auth/login',json={'email':'coder.demo@example.test','password':'wrong'}).status_code==401
    client=login()
    assert client.get('/api/v1/auth/session').json()['role']=='risk_analyst'
    token=client.cookies.get(main.COOKIE)
    with main.db() as conn:
        assert conn.execute('SELECT token FROM sessions').fetchone()['token']!=token
    csrf=client.headers.pop('x-csrf-token')
    assert action(client,'analyze',id='MB-000001').status_code==403
    client.headers['x-csrf-token']=csrf
    assert client.delete('/api/v1/auth/session').status_code==200
    assert client.get('/api/v1/auth/session').status_code==401


def test_role_and_practice_scope():
    analyst=login()
    assert action(analyst,'review',id='MB-000001',value='resolved_supported',note='source').status_code==403
    assert analyst.get('/api/v1/admin/users').status_code==403
    provider=login('provider2')
    assert provider.get('/api/v1/members/MB-000002').status_code==200
    assert provider.get('/api/v1/members/MB-000001').status_code==404
    assert provider.get('/api/v1/evidence/DOC-0001').status_code==404
    assert provider.post('/api/v1/downloads',json={'kind':'audit'}).status_code==403
    assert all(m['provider_id']=='PR-002' for m in provider.get('/api/v1/members').json()['items'])


def test_superuser_backfills_existing_database_without_resetting_accounts(monkeypatch):
    with main.db() as conn:
        admin_before=dict(conn.execute('SELECT * FROM users WHERE id=?',('administrator',)).fetchone())
        state_before=main.get_state(conn)
        conn.execute('DELETE FROM users WHERE id=?',('superuser',))
    main.initialize()
    credentials=main.LOCAL/'superuser-account.json'
    assert credentials.stat().st_mode & 0o777 == 0o600
    assert json.loads(credentials.read_text())['email']=='superuser@perform.test'
    client=login('superuser')
    assert client.get('/api/v1/auth/session').json()['role']=='superuser'
    with main.db() as conn:
        first=dict(conn.execute('SELECT * FROM users WHERE id=?',('superuser',)).fetchone())
        assert dict(conn.execute('SELECT * FROM users WHERE id=?',('administrator',)).fetchone())==admin_before
        assert main.get_state(conn)==state_before
    monkeypatch.setenv('CT_SUPERUSER_PASSWORD','Changed-env-must-not-reset-the-account')
    main.initialize()
    with main.db() as conn:
        assert dict(conn.execute('SELECT * FROM users WHERE id=?',('superuser',)).fetchone())==first
        assert conn.execute('SELECT count(*) AS count FROM users WHERE role=?',('superuser',)).fetchone()['count']==1


def test_superuser_full_workspace_and_action_access():
    client=login('superuser')
    account=client.get('/api/v1/auth/session').json()
    assert set(account['screens'])==set(main.ALL_SCREENS)
    assert set(account['permissions'])=={a for name,role in main.ROLES.items() if name!='superuser' for a in role['actions']}
    assert client.get('/api/v1/bootstrap').json()['population_count']==10000
    assert client.get('/api/v1/members/MB-001500').status_code==200
    assert client.get('/api/v1/admin/users').status_code==200
    assert action(client,'campaign',name='Superuser cohort',member_ids=['MB-000001'],owner='coder').status_code==200
    assert action(client,'receive',id='CH-0001',value='partially_received').status_code==200
    assert action(client,'respond',id='MB-000002',value='needs_information').status_code==200
    assert action(client,'prepare',id='SUB-0003').status_code==200
    assert any(e['action']=='campaign' for e in client.get('/api/v1/bootstrap').json()['events'])
    assert client.patch('/api/v1/admin/users/superuser',json={'role':'administrator','active':True}).status_code==400
    assert client.patch('/api/v1/admin/users/superuser',json={'role':'superuser','active':False}).status_code==400
    assert action(login('admin'),'review',id='MB-000001',value='resolved_supported',note='source').status_code==403


def test_superuser_preserves_clinical_and_independent_qa_gates():
    client=login('superuser')
    for mid in ('MB-000002','MB-000003','MB-000006'):
        response=action(client,'review',id=mid,value='resolved_supported',note='Current source is still required.')
        assert response.status_code==400 and response.json()['error']['code']=='EVIDENCE_REQUIRED'
    assert action(client,'review',id='MB-000001',value='resolved_supported',note='Signed current assessment inspected.').status_code==200
    assert action(client,'qa',id='MB-000001',value='passed').status_code==403
    assert action(login('qa'),'qa',id='MB-000001',value='passed',note='Reviewed the exact current source and decision; the disposition is supported.').status_code==200
    assert action(login('coder'),'review',id='MB-000005',value='resolved_supported',note='Source reviewed independently.').status_code==200
    assert action(client,'qa',id='MB-000005',value='passed',note='Reviewed the exact current source and decision; the disposition is supported.').status_code==200


def test_campaign_dedup_and_frozen_comparison():
    client=login();before=client.get('/api/v1/bootstrap').json()
    payload=dict(name='Acceptance cohort',member_ids=['MB-000001','MB-000002'])
    assert action(client,'campaign',**payload).status_code==200
    assert action(client,'campaign',**payload).status_code==200
    assert action(client,'analyze',member_ids=payload['member_ids']).status_code==200
    after=client.get('/api/v1/bootstrap').json()
    assert len(after['campaigns'])==len(before['campaigns'])+1
    assert len(after['tasks'])==2
    assert after['comparison']==before['comparison']
    assert len(after['runs'])==1


def test_review_qa_and_directory_persistence():
    coder=login('coder')
    assert action(coder,'review',id='MB-000001',value='resolved_supported',note='Current signed assessment inspected.').status_code==200
    qa=login('qa')
    assert action(qa,'qa',id='MB-000001',value='passed',note='Reviewed the exact current source and decision; the disposition is supported.').status_code==200
    case=coder.get('/api/v1/members/MB-000001').json()
    assert case['opportunities'][0]['qa_status']=='passed'
    assert case['opportunities'][0]['reviewer']=='coder'
    assert case['status']=='resolved_supported'
    assert len(case['history'])==2
    assert coder.get('/api/v1/members?q=MB-000001').json()['items'][0]['status']==case['status']


def test_historical_predictive_and_invalid_source_require_published_authored_encounter():
    coder=login('coder');retrieval=login('retrieval')
    for number,did in ((2,'DOC-0005'),(6,'DOC-RILEY-SIGNED')):
        mid=f'MB-{number:06}'
        assert action(coder,'review',id=mid,value='resolved_supported',note='Insufficient current evidence').status_code==400
        provider=login(f'provider{number}')
        assert action(provider,'respond',id=mid,value='supported').status_code==200
        assert action(coder,'review',id=mid,value='resolved_supported',note='Response alone is insufficient').status_code==400
        assert action(provider,'later_encounter',id=mid).status_code==200
        assert action(coder,'review',id=mid,value='resolved_supported',note='Received only').status_code==400
        assert retrieval.post('/api/v1/intake/publish',json={'document_id':did,'member_id':mid}).status_code==200
        assert action(coder,'review',id=mid,value='resolved_supported',note='Published signed source reviewed.').status_code==200
    assert action(login('provider3'),'later_encounter',id='MB-000003').status_code==400
    assert action(coder,'review',id='MB-000003',value='resolved_supported',note='Signals do not establish support.').status_code==400


def test_response_does_not_complete_other_work():
    analyst=login()
    assert action(analyst,'campaign',name='Follow-up',member_ids=['MB-000002']).status_code==200
    assert action(analyst,'query',id='MB-000002',note='Please document the current assessment.').status_code==200
    assert action(login('provider2'),'respond',id='MB-000002',value='needs_information').status_code==200
    member=analyst.get('/api/v1/members/MB-000002').json()
    assert {t['type']:t['status'] for t in member['tasks']}=={'campaign':'open','query':'responded'}
    assert member['status']=='awaiting_assessment'


def test_correction_preserves_original_and_receiver_history():
    client=login('submission')
    assert action(client,'correction',id='SUB-0002').status_code==400
    assert action(login('coder'),'review',id='MB-000004',value='resolved_unsupported',note='Current source contradicts the original condition.').status_code==200
    assert action(login('qa'),'qa',id='MB-000004',value='passed',note='Reviewed the exact current source and decision; the disposition is supported.').status_code==200
    prepared=action(client,'prepare',id='MB-000004').json()['submission_id']
    assert action(client,'receiver',id=prepared,value='rejected').status_code==200
    retry_id=action(client,'correction',id=prepared).json()['submission_id']
    records=client.get('/api/v1/bootstrap').json()['submissions']
    original=next(r for r in records if r['id']=='SUB-0001')
    rejected=next(r for r in records if r['id']==prepared)
    retry=next(r for r in records if r['id']==retry_id)
    assert original['status']=='accepted' and rejected['status']=='rejected'
    assert retry['operation']==rejected['operation']=='delete' and retry['retry_of']==prepared
    assert not original['corrected']
    assert action(client,'receiver',id=retry['id'],value='acknowledged').status_code==200
    assert action(client,'receiver',id=retry['id'],value='accepted').status_code==200
    records=client.get('/api/v1/bootstrap').json()['submissions']
    assert next(r for r in records if r['id']=='SUB-0001')['corrected']
    assert len(next(r for r in records if r['id']==retry['id'])['history'])==2
    assert action(client,'receiver',id=retry['id'],value='rejected').status_code==400
    assert action(client,'prepare',id=retry['id'],value='reconcile').status_code==200
    package=client.post('/api/v1/downloads',json={'kind':'audit','ids':['MB-000004']})
    with zipfile.ZipFile(io.BytesIO(package.content)) as archive:
        trace=json.loads(archive.read('cases/MB-000004.json'))
        assert len(trace['submissions'])==4 and trace['missing_links']==[]
        assert all(r['member_id']=='MB-000004' for r in trace['submissions'])
        accepted=next(r for r in trace['submissions'] if r['id']==retry['id'])
        assert accepted['code']=='I50.9' and accepted['source_refs'][0]['document_id']=='DOC-0007'
        assert accepted['report_comparison']['reported']['record_presence']=='absent'
        assert accepted['report_comparison']['payment_reconciliation']=='unreconciled'
        assert 'DOC-0001' not in ''.join(archive.namelist())
        original_doc=next(d for d in json.loads(main.SEED.read_text())['documents'] if d['id']=='DOC-0007')
        assert json.loads(archive.read('evidence/DOC-0007.json'))['pages']==original_doc['pages']


def test_chase_export_and_audit_manifest():
    client=login('retrieval')
    assert action(client,'receive',id='CH-0001',value='partially_received').status_code==200
    analyst=login()
    csv=analyst.post('/api/v1/downloads',json={'kind':'members','q':'MB-000002','provider':'PR-002'})
    assert csv.status_code==200 and 'Morgan Reed' in csv.text and 'Jordan Ellis' not in csv.text
    assert 'Synthetic product demonstration' in csv.text
    qa=login('qa')
    payload=qa.post('/api/v1/downloads',json={'kind':'audit','ids':['MB-000001']})
    with zipfile.ZipFile(io.BytesIO(payload.content)) as archive:
        manifest=json.loads(archive.read('manifest.json'))
        assert manifest['members']==['MB-000001'] and manifest['decisions'][0]['member_id']=='MB-000001'
        assert 'evidence/DOC-0001.json' in archive.namelist()


def test_reset_preserves_accounts_and_revokes_changed_role_sessions():
    analyst=login();admin=login('admin')
    assert action(analyst,'analyze',id='MB-000001').status_code==200
    with main.db() as conn:
        password=conn.execute('SELECT password FROM users WHERE id=?',('risk_analyst',)).fetchone()['password']
    assert admin.post('/api/v1/admin/reset',json={'confirmation':'RESET DEMO'}).status_code==200
    assert analyst.get('/api/v1/bootstrap').json()['runs']==[]
    assert admin.patch('/api/v1/admin/users/risk_analyst',json={'role':'executive','active':True}).status_code==200
    assert analyst.get('/api/v1/auth/session').status_code==401
    assert admin.patch('/api/v1/admin/users/risk_analyst',json={'role':'risk_analyst','active':True}).status_code==200
    with main.db() as conn:
        assert conn.execute('SELECT password FROM users WHERE id=?',('risk_analyst',)).fetchone()['password']==password


def test_frozen_metrics_recompute_from_chart_slots():
    data=json.loads(main.SEED.read_text())['comparison'];records=data['evaluation_records']
    assisted=[r for r in records if r['arm']=='assisted'];manual=[r for r in records if r['arm']=='manual']
    assert len(assisted)==len(manual)==100
    ai=[slot for r in assisted for slot in r['slots']]
    assert len(ai)==1000
    tp=sum(s['reference_positive'] and s['ai_flagged'] for s in ai)
    fp=sum(not s['reference_positive'] and s['ai_flagged'] for s in ai)
    fn=sum(s['reference_positive'] and not s['ai_flagged'] for s in ai)
    assert (tp,fp,fn)==(108,27,12)
    assert data['metrics']['ai_precision']==tp/(tp+fp)
    assert data['metrics']['ai_recall']==tp/(tp+fn)
    assert sum(r['active_review_minutes'] for r in assisted)/100==22
    assert sum(r['active_review_minutes'] for r in manual)/100==36


def test_atomic_bulk_changes_and_campaign_allocation():
    analyst=login()
    before=analyst.get('/api/v1/members/MB-000001').json()['status']
    assert action(analyst,'suppress',member_ids=['MB-000001','MB-999999'],note='Follow-up').status_code==404
    assert analyst.get('/api/v1/members/MB-000001').json()['status']==before
    assert action(analyst,'suppress',member_ids=['MB-000001'],note='').status_code==400
    assert action(analyst,'assign',member_ids=['MB-000001','MB-000002'],value='Coding team').json()['affected']==2
    assert action(analyst,'request_evidence',member_ids=['MB-000001','MB-000002']).status_code==200
    assert action(analyst,'request_evidence',member_ids=['MB-000001','MB-000002']).status_code==200
    state=analyst.get('/api/v1/bootstrap').json()
    assert len([t for t in state['tasks'] if t['type']=='request_evidence'])==2
    assert action(analyst,'defer',member_ids=['MB-000001','MB-000002'],note='Current documentation needed').status_code==200
    assert action(analyst,'suppress',member_ids=['MB-000001'],note='Duplicate review context').status_code==200
    body=dict(name='Allocated cohort',member_ids=['MB-000001','MB-000002'],owner='QA team',due_date='2026-10-05',value='Independent QA')
    assert action(analyst,'campaign',**body).status_code==200
    assert action(analyst,'campaign',**{**body,'member_ids':list(reversed(body['member_ids']))}).status_code==200
    assert action(analyst,'campaign',**{**body,'owner':'Coding team'}).status_code==400
    state=analyst.get('/api/v1/bootstrap').json()
    tasks=[t for t in state['tasks'] if t['type']=='campaign']
    with main.db() as conn:
        reviewer_name=conn.execute('SELECT name FROM users WHERE id=?',('qa_reviewer',)).fetchone()['name']
    assert len(tasks)==2 and all(t['owner_id']=='qa_reviewer' and t['owner']==reviewer_name and t['due_date']=='2026-10-05' for t in tasks)


def test_intake_validates_identity_signature_and_publishes_once():
    retrieval=login('retrieval')
    valid={'document_id':'DOC-0010','member_id':'MB-000007'}
    result=retrieval.post('/api/v1/intake/validate',json=valid)
    assert result.json()['valid'] and all(c['passed'] for c in result.json()['checks'])
    assert retrieval.post('/api/v1/intake/publish',json=valid).status_code==200
    assert retrieval.post('/api/v1/intake/publish',json=valid).status_code==200
    state=retrieval.get('/api/v1/bootstrap').json()
    assert next(c for c in state['chases'] if c['id']=='CH-0007')['status']=='usable'
    assert len([e for e in state['events'] if e['action']=='intake_published'])==1
    published=retrieval.get('/api/v1/evidence/DOC-0010').json()
    assert published['source_status']=='usable' and published['published_at']
    assert published['title']=='Sample intake · signed primary care note'
    with main.db() as conn:
        raw=next(d for d in main.get_state(conn)['documents'] if d['id']=='DOC-0010')
    assert published['title']==raw['title'] and published['pages']==raw['pages']
    assert raw['title']=='Sample intake · signed primary care note'
    assert raw['source_status']=='usable' and raw['published_at']

    invalid={'document_id':'DOC-0009','member_id':'MB-000006'}
    check=retrieval.post('/api/v1/intake/validate',json=invalid).json()
    assert check['checks'][0]['passed'] and not check['checks'][1]['passed']
    assert retrieval.post('/api/v1/intake/publish',json=invalid).status_code==400
    mismatch={'document_id':'DOC-0011','member_id':'MB-000007'}
    assert not retrieval.post('/api/v1/intake/validate',json=mismatch).json()['valid']
    assert retrieval.post('/api/v1/intake/publish',json=mismatch).status_code==400
    assert action(retrieval,'receive',id='CH-0006',value='usable').status_code==400
    assert login().get('/api/v1/intake/samples').status_code==403


def test_contact_history_and_source_issue_recheck():
    retrieval=login('retrieval')
    assert action(retrieval,'contact',id='CH-0006',value='Phone follow-up',note='Signed record requested locally.').status_code==200
    assert action(retrieval,'receive',id='CH-0006',value='partially_received').status_code==200
    state=retrieval.get('/api/v1/bootstrap').json()
    assert len(next(c for c in state['chases'] if c['id']=='CH-0006')['contact_history'])==2
    assert not next(c for c in state['chases'] if c['id']=='CH-0001').get('contact_history')
    assert len(state['issues'])==2
    assert action(retrieval,'retry',id='sample-import').status_code==200
    state=retrieval.get('/api/v1/bootstrap').json()
    assert state['runs'][0]['mode']=='source_validation' and state['runs'][0]['status']=='needs_attention'
    assert action(login('provider6'),'later_encounter',id='MB-000006').status_code==200
    assert len(retrieval.get('/api/v1/bootstrap').json()['issues'])==2
    assert retrieval.post('/api/v1/intake/publish',json={'document_id':'DOC-RILEY-SIGNED','member_id':'MB-000006'}).status_code==200
    assert len(retrieval.get('/api/v1/bootstrap').json()['issues'])==1


def test_fixture_assistant_is_scoped_and_requires_explicit_apply():
    analyst=login();before=analyst.get('/api/v1/bootstrap').json()
    answer=analyst.post('/api/v1/assistant',json={'question':'Find a priority cohort'}).json()
    assert answer['proposal']['member_ids']
    assert analyst.get('/api/v1/bootstrap').json()['tasks']==before['tasks']
    ids=set(answer['proposal']['member_ids'])
    assert all(o['priority']=='High' and o['evidence']=='Strong' for o in before['opportunities'] if o['member_id'] in ids)
    metric=analyst.post('/api/v1/assistant',json={'question':'Explain precision and recall'}).json()
    assert '80%' in metric['answer'] and '90%' in metric['answer']
    provider=login('provider2')
    assert provider.post('/api/v1/assistant',json={'question':'Summarize member evidence','member_id':'MB-000001'}).status_code==404
    assert provider.post('/api/v1/assistant',json={'question':'Explain precision'}).status_code==403
    own=provider.post('/api/v1/assistant',json={'question':'Summarize this member','member_id':'MB-000002'}).json()
    assert own['sources'] and all('/MB-000002' in s['href'] for s in own['sources'])
    assert 'cannot answer arbitrary' in analyst.post('/api/v1/assistant',json={'question':'Diagnose a new condition'}).json()['answer']


def test_later_encounter_hidden_until_loaded_and_repeat_safe():
    coder=login('coder');provider=login('provider2')
    original=coder.get('/api/v1/members/MB-000002').json()
    assert 'DOC-0005' not in [d['id'] for d in original['documents']]
    assert coder.get('/api/v1/evidence/DOC-0005').status_code==404
    assert action(provider,'later_encounter',id='MB-000002').status_code==200
    later=coder.get('/api/v1/members/MB-000002').json()
    doc=next(d for d in later['documents'] if d['id']=='DOC-0005')
    assert doc['signature_status']=='signed' and doc['source_status']=='received'
    retrieval=login('retrieval')
    assert 'DOC-0005' in [d['id'] for d in retrieval.get('/api/v1/intake/samples').json()]
    assert retrieval.post('/api/v1/intake/publish',json={'document_id':'DOC-0005','member_id':'MB-000002'}).status_code==200
    assert next(c for c in retrieval.get('/api/v1/bootstrap').json()['chases'] if c['member_id']=='MB-000002')['status']=='usable'
    answer=coder.post('/api/v1/assistant',json={'question':'Summarize this member','member_id':'MB-000002'}).json()
    assert any('document=DOC-0005' in source['href'] for source in answer['sources'])
    assert action(coder,'review',id='MB-000002',value='resolved_supported',note='Later signed source inspected').status_code==200
    assert action(provider,'later_encounter',id='MB-000002').status_code==200
    repeat=coder.get('/api/v1/members/MB-000002').json()
    assert repeat['status']=='resolved_supported' and repeat['evidence']=='Strong' and len(repeat['documents'])==len(later['documents'])


def test_session_expiry_disabled_account_and_self_qa_denial():
    analyst=login();token=analyst.cookies.get(main.COOKIE)
    with main.db() as conn:conn.execute('UPDATE sessions SET expires=0 WHERE token=?',(main.token_key(token),))
    assert analyst.get('/api/v1/members').status_code==401
    admin=login('admin');coder=login('coder')
    assert action(coder,'review',id='MB-000001',value='resolved_supported',note='Current signed evidence').status_code==200
    assert admin.patch('/api/v1/admin/users/coder',json={'role':'qa_reviewer','active':True}).status_code==200
    changed=login('coder')
    assert action(changed,'qa',id='MB-000001',value='passed').status_code==403
    assert admin.patch('/api/v1/admin/users/coder',json={'role':'coder','active':False}).status_code==200
    assert changed.get('/api/v1/auth/session').status_code==401
    guest=TestClient(main.app)
    assert guest.post('/api/v1/auth/login',json={'email':'coder.demo@example.test','password':os.environ['CT_DEMO_PASSWORD']}).status_code==401
    assert admin.patch('/api/v1/admin/users/coder',json={'role':'coder','active':True}).status_code==200
    assert admin.patch('/api/v1/admin/users/administrator',json={'role':'coder','active':False}).status_code==400


def test_login_pause_and_untrusted_origin():
    guest=TestClient(main.app)
    for _ in range(8):assert guest.post('/api/v1/auth/login',json={'email':'analyst.demo@example.test','password':'wrong'}).status_code==401
    assert guest.post('/api/v1/auth/login',json={'email':'analyst.demo@example.test','password':os.environ['CT_DEMO_PASSWORD']}).status_code==429
    assert guest.post('/api/v1/auth/login',headers={'origin':'https://untrusted.example.test'},json={'email':'coder.demo@example.test','password':os.environ['CT_DEMO_PASSWORD']}).status_code==403


def test_campaign_frozen_preview_rejects_changed_versions_and_coverage():
    client=login()
    selected=['MB-000001']
    before=client.get('/api/v1/bootstrap').json()
    versions={o['id']:o['version'] for o in before['opportunities'] if o['member_id'] in selected}
    covered=sorted(id for id in selected if any(c['status']=='active' and id in c['member_ids'] for c in before['campaigns']))
    payload=dict(name='Frozen preview acceptance',member_ids=selected,expected_versions=versions,expected_covered=covered)
    assert action(client,'analyze',member_ids=selected).status_code==200
    rejected=action(client,'campaign',**payload)
    assert rejected.status_code==409 and 'STALE_PREVIEW' in rejected.text
    latest=client.get('/api/v1/bootstrap').json()
    assert len(latest['campaigns'])==len(before['campaigns'])
    payload['expected_versions']={o['id']:o['version'] for o in latest['opportunities'] if o['member_id'] in selected}
    assert action(client,'campaign',**{**payload,'expected_covered':['MB-999999']}).status_code==409
    assert action(client,'campaign',**payload).status_code==200
    assert action(client,'campaign',**payload).status_code==200
    final=client.get('/api/v1/bootstrap').json()
    assert len(final['campaigns'])==len(before['campaigns'])+1
    assert final['comparison']==before['comparison']


def test_assessment_provider_noop_and_disable_preserve_each_practice():
    admin=login('admin')
    for number in range(2,7):
        uid=f'provider_{number}'
        for active in (True,False,True):
            assert admin.patch('/api/v1/admin/users/'+uid,json={'role':'provider','active':active}).status_code==200
        provider=login(f'provider{number}')
        assert provider.get('/api/v1/auth/session').json()['provider_id']==f'PR-{number:03}'
        assert provider.get(f'/api/v1/members/MB-{number:06}').status_code==200
        assert provider.get('/api/v1/members/MB-000001').status_code==404


def test_assessment_finding_specific_gates_and_reachable_allocations():
    coder=login('coder');analyst=login();superuser=login('superuser')
    for mid in ('MB-000002','MB-000003','MB-000004','MB-000006','MB-000007'):
        assert action(coder,'review',id=mid,value='resolved_supported',note='A generic signed note is not finding-specific support.').status_code==400
    generic=coder.get('/api/v1/members/MB-000007').json()
    assert not generic['eligibility']['reviewable'] and not generic['eligibility']['support_allowed']
    assert generic['claims']==[] and generic['eligibility']['example_href']=='/reviews/MB-000001'
    assert action(superuser,'assign',member_ids=['MB-000001','MB-000031'],value='coder').status_code==400
    assert action(analyst,'campaign',name='Wrong practice',member_ids=['MB-000001','MB-000002'],owner='provider_2',value='pre_visit').status_code==400
    options=analyst.get('/api/v1/bootstrap').json()['assignment_options']
    assert options
    for option in options:
        role=option['email'].split('@')[0]
        client=login(role)
        for mid in option['member_ids']:
            detail=client.get('/api/v1/members/'+mid)
            assert detail.status_code==200
            for doc in detail.json()['documents']:assert client.get('/api/v1/evidence/'+doc['id']).status_code==200
    assert action(analyst,'campaign',name='Practice 2 response',member_ids=['MB-000002'],owner='provider_2',value='pre_visit').status_code==200


def test_assessment_qa_completion_rework_and_new_source_reopen():
    analyst=login();coder=login('coder');qa=login('qa')
    mid='MB-000001'
    assert action(analyst,'campaign',name='Connected review',member_ids=[mid],owner='coder',value='coding_review').status_code==200
    def case():return coder.get('/api/v1/members/'+mid).json()
    assert action(coder,'review',id=mid,value='resolved_supported',note='Signed assessment inspected.').status_code==200
    assert not case()['opportunities'][0]['completion']['complete']
    assert case()['tasks'][0]['status']=='open'
    assert action(qa,'qa',id=mid,value='rework').status_code==400
    assert action(qa,'qa',id=mid,value='rework',note='Specify the exact current encounter passage.').status_code==200
    assert case()['opportunities'][0]['qa_note']=='Specify the exact current encounter passage.'
    assert not case()['opportunities'][0]['completion']['complete']
    assert action(coder,'review',id=mid,value='resolved_supported',note='DOC-0001 assessment and plan reviewed.').status_code==200
    assert action(qa,'qa',id=mid,value='passed',note='Reviewed the exact current source and decision; the disposition is supported.').status_code==200
    approved=case()['opportunities'][0]
    assert approved['completion']['complete'] and case()['tasks'][0]['status']=='completed'
    assert len(approved['decision_history'])==2 and len(approved['qa_history'])==2
    campaign=next(c for c in analyst.get('/api/v1/bootstrap').json()['campaigns'] if c['name']=='Connected review')
    assert campaign['progress']==100 and campaign['completion_denominator']==1
    assert action(login('provider'),'later_encounter',id=mid,value='jordan-clarification').status_code==200
    assert login('retrieval').post('/api/v1/intake/publish',json={'document_id':'DOC-JORDAN-CLARIFICATION','member_id':mid}).status_code==200
    reopened=case()['opportunities'][0]
    assert reopened['qa_status']=='not_submitted' and not reopened['completion']['complete']
    assert not reopened['eligibility']['support_allowed'] and 'withdraws' in case()['summary']
    assert case()['tasks'][0]['status']=='open'
    assert len(reopened['decision_history'])==2 and len(reopened['qa_history'])==2
    latest=analyst.get('/api/v1/bootstrap').json()
    assert next(c for c in latest['campaigns'] if c['name']=='Connected review')['progress']==0


def test_assessment_recommendation_changes_citations_and_intake_batch():
    analyst=login();coder=login('coder');retrieval=login('retrieval');provider=login('provider2');mid='MB-000002'
    original=coder.get('/api/v1/members/'+mid).json();version=original['opportunities'][0]['recommendation_version'];key=original['basis_key']
    result=action(analyst,'analyze',id=mid).json()
    assert result['results'][0]['result']=='no_change'
    assert action(analyst,'assign',id=mid,value='coder').status_code==200
    assert coder.get('/api/v1/members/'+mid).json()['opportunities'][0]['recommendation_version']==version
    assert action(provider,'respond',id=mid,value='supported').status_code==200
    assert action(provider,'later_encounter',id=mid).status_code==200
    received=coder.get('/api/v1/members/'+mid).json()
    assert received['basis_key']==key and not received['eligibility']['support_allowed']
    assert received['scenario']['date']=='2026-09-18'
    before=retrieval.get('/api/v1/bootstrap').json()['import_summary']
    payload={'document_id':'DOC-0005','member_id':mid}
    published=retrieval.post('/api/v1/intake/publish',json=payload).json()
    assert published['analysis']['result']=='changed'
    current=coder.get('/api/v1/members/'+mid).json()
    assert current['basis_key']!=key and current['opportunities'][0]['recommendation_version']==version+1
    assert current['eligibility']['support_allowed'] and 'September 18' in current['summary']
    assert current['claims'] and all(c['document_id']=='DOC-0005' and c['quote'] in json.dumps(next(d for d in current['documents'] if d['id']=='DOC-0005')) for c in current['claims'])
    assert all('page=1' in c['href'] and 'section=' in c['href'] for c in current['claims'])
    assert retrieval.post('/api/v1/intake/publish',json=payload).json()['analysis'] is None
    assert action(analyst,'analyze',id=mid).json()['results'][0]['result']=='no_change'
    assert coder.get('/api/v1/members/'+mid).json()['opportunities'][0]['recommendation_version']==version+1
    batch=retrieval.get('/api/v1/bootstrap').json()['import_summary']
    assert batch['total']==before['total'] and batch['published']==before['published']+1
    assert batch['received']==sum(r['received'] for r in batch['rows'])
    assert action(login('provider6'),'later_encounter',id='MB-000006',value='riley-mismatch').status_code==200
    mismatch={'document_id':'DOC-RILEY-MISMATCH','member_id':'MB-000006'}
    check=retrieval.post('/api/v1/intake/validate',json=mismatch).json()
    assert not check['valid'] and not check['checks'][0]['passed']
    assert retrieval.post('/api/v1/intake/publish',json=mismatch).status_code==400
    riley=coder.get('/api/v1/members/MB-000006').json()
    mismatch_step=next(step for step in riley['next_steps'] if 'DOC-RILEY-MISMATCH' in step['href'])
    assert mismatch_step['label']=='Inspect quarantined source · DOC-RILEY-MISMATCH'
    assert mismatch_step['href']=='/intake?member=MB-000006&document=DOC-RILEY-MISMATCH'
    assert action(login('provider6'),'later_encounter',id='MB-000006',value='riley-replacement').status_code==200
    received=coder.get('/api/v1/members/MB-000006').json()
    signed_step=next(step for step in received['next_steps'] if 'DOC-RILEY-SIGNED' in step['href'])
    assert signed_step['label']=='Validate and publish DOC-RILEY-SIGNED'
    assert retrieval.post('/api/v1/intake/publish',json={'document_id':'DOC-RILEY-SIGNED','member_id':'MB-000006'}).status_code==200
    published=coder.get('/api/v1/members/MB-000006').json()
    assert published['eligibility']['support_allowed']
    assert next(d for d in published['documents'] if d['id']=='DOC-RILEY-SIGNED')['source_status']=='usable'
    assert any(step['label']=='Inspect quarantined source · DOC-RILEY-MISMATCH' for step in published['next_steps'])
    assert action(analyst,'analyze',id='MB-000031').json()['results'][0]['result']=='no_result'


def test_assessment_linked_addition_retry_report_and_complete_audit():
    coder=login('coder');qa=login('qa');submission=login('submission');mid='MB-000001'
    assert action(submission,'prepare',id=mid).status_code==400
    assert action(coder,'review',id=mid,value='resolved_supported',note='Exact DOC-0001 assessment supports the prepared code.').status_code==200
    assert action(submission,'prepare',id=mid).status_code==400
    assert action(qa,'qa',id=mid,value='passed',note='Reviewed the exact current source and decision; the disposition is supported.').status_code==200
    first=action(submission,'prepare',id=mid).json()['submission_id']
    assert action(submission,'prepare',id=mid).json()['submission_id']==first
    assert action(submission,'receiver',id=first,value='rejected',note='Prepared source reference rejection.').status_code==200
    retry=action(submission,'correction',id=first).json()['submission_id']
    assert action(submission,'correction',id=first).json()['submission_id']==retry
    records=submission.get('/api/v1/bootstrap').json()['submissions']
    original=next(r for r in records if r['id']==first);new=next(r for r in records if r['id']==retry)
    assert original['status']=='rejected' and new['operation']==original['operation']=='add'
    assert new['review_snapshot']['actor_id']!=new['qa_snapshot']['actor_id']
    assert new['source_refs'][0]['document_id']=='DOC-0001' and new['code']=='I50.22'
    assert action(submission,'receiver',id=retry,value='acknowledged').status_code==200
    assert action(submission,'receiver',id=retry,value='accepted').status_code==200
    accepted=next(r for r in submission.get('/api/v1/bootstrap').json()['submissions'] if r['id']==retry)
    assert accepted['transport_status']=='acknowledged' and accepted['receiver_status']=='accepted'
    assert accepted['eligibility_status']=='not_evaluated' and accepted['reported_status']=='not_compared' and accepted['reconciliation_status']=='unreconciled'
    assert action(submission,'prepare',id=retry,value='reconcile').status_code==200
    package=submission.post('/api/v1/downloads',json={'kind':'audit','ids':[mid]})
    with zipfile.ZipFile(io.BytesIO(package.content)) as archive:
        trace=json.loads(archive.read('cases/'+mid+'.json'))
        assert trace['missing_links']==[] and not trace['formal_audit_readiness']
        assert len(trace['submissions'])==2 and len(trace['decisions'])==len(trace['qa'])==1
        assert trace['submissions'][1]['report_comparison']['payment_reconciliation']=='unreconciled'
        assert 'DOC-0007' not in ''.join(archive.namelist())
        assert 'MB-000004' not in archive.read('manifest.json').decode()
        original_doc=next(d for d in json.loads(main.SEED.read_text())['documents'] if d['id']=='DOC-0001')
        assert json.loads(archive.read('evidence/DOC-0001.json'))['pages']==original_doc['pages']
    # Editing a decision cannot reuse the prior approval or transmit its pending records.
    assert action(coder,'review',id=mid,value='resolved_supported',note='Fresh review after prior preparation.').status_code==200
    assert action(submission,'prepare',id=mid).status_code==400


def test_assessment_fallback_and_ranking_have_explicit_basis():
    analyst=login();data=analyst.get('/api/v1/bootstrap').json()
    scenario=data['scenarios'][0]
    assert scenario['numeric_status']=='deferred_reference_unavailable'
    assert scenario['baseline_score'] is scenario['combined_score'] is scenario['delta'] is None
    assert len(scenario['combined_inputs'])>len(scenario['baseline_inputs'])
    assert data['program_context']['service_year']==2026 and data['program_context']['payment_year']==2027
    request={'question':'Find a priority cohort'}
    first=analyst.post('/api/v1/assistant',json=request).json();second=analyst.post('/api/v1/assistant',json=request).json()
    assert first['proposal']==second['proposal']
    assert 'MB-000004' not in first['proposal']['member_ids']
    integrity=analyst.post('/api/v1/assistant',json={'question':'Find a priority integrity cohort'}).json()
    assert integrity['proposal']['member_ids']==['MB-000004']
    for mid in first['proposal']['member_ids']:assert action(analyst,'suppress',id=mid,note='Exclude prepared case from proposal.').status_code==200
    assert analyst.post('/api/v1/assistant',json=request).json()['proposal']['member_ids']==[]


def test_assessment_additive_upgrade_retains_legacy_qa_before_fresh_review():
    with main.db() as conn:
        raw=json.loads(main.SEED.read_text());raw.update(tasks=[],runs=[])
        o=raw['opportunities'][0]
        o.update(status='resolved_supported',reviewer='coder',decision_note='Original saved review.',review_completed_at='2026-09-11T12:00:00Z',qa_status='passed',qa_reviewer='qa.demo@example.test',qa_note='Original saved QA.')
        main.save_state(conn,raw)
    coder=login('coder')
    case=coder.get('/api/v1/members/MB-000001').json()
    o=case['opportunities'][0]
    assert o['decision_history'][0]['note']=='Original saved review.'
    assert o['qa_history'][0]['note']=='Original saved QA.' and o['qa_history'][0]['at'] is None
    assert not o['completion']['complete']
    assert action(coder,'review',id='MB-000001',value='resolved_supported',note='Fresh exact-source review.').status_code==200
    current=coder.get('/api/v1/members/MB-000001').json()['opportunities'][0]
    assert len(current['decision_history'])==2 and current['qa_history'][0]['note']=='Original saved QA.'
    assert current['current_decision_id']!=current['decision_history'][0]['id']
