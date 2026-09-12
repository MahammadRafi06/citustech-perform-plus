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
TEMP = tempfile.TemporaryDirectory(prefix='ct-tests-')
os.environ['CT_DATA_DIR'] = TEMP.name
os.environ['CT_DEMO_PASSWORD'] = 'Synthetic-test-password-8!'
os.environ['DATABASE_URL'] = make_conninfo(BASE_URL, options=f'-c search_path={SCHEMA}')
from apps.api.app import main

@pytest.fixture(scope='session', autouse=True)
def database():
    with psycopg.connect(BASE_URL, autocommit=True) as conn:
        conn.execute(sql.SQL('CREATE SCHEMA {}').format(sql.Identifier(SCHEMA)))
    main.initialize()
    yield
    with psycopg.connect(BASE_URL, autocommit=True) as conn:
        conn.execute(sql.SQL('DROP SCHEMA {} CASCADE').format(sql.Identifier(SCHEMA)))
    TEMP.cleanup()

@pytest.fixture(autouse=True)
def baseline(database):
    with main.db() as conn:
        state=json.loads(main.SEED.read_text());state.update(tasks=[],runs=[],tour_started=main.now())
        main.save_state(conn,state)
        conn.execute('DELETE FROM events')
        conn.execute('DELETE FROM sessions')
        conn.execute('DELETE FROM login_attempts')


def login(role='analyst'):
    client=TestClient(main.app)
    result=client.post('/api/v1/auth/login',json={'email':f'{role}@perform.test','password':os.environ['CT_DEMO_PASSWORD']})
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
    assert action(qa,'qa',id='MB-000001',value='passed').status_code==200
    case=coder.get('/api/v1/members/MB-000001').json()
    assert case['opportunities'][0]['qa_status']=='passed'
    assert case['opportunities'][0]['reviewer']=='coder'
    assert case['status']=='resolved_supported'
    assert len(case['history'])==2
    assert coder.get('/api/v1/members?q=MB-000001').json()['items'][0]['status']==case['status']


def test_historical_predictive_and_invalid_source_require_later_encounter():
    coder=login('coder')
    for number in (2,3,6):
        member=f'MB-{number:06}'
        assert action(coder,'review',id=member,value='resolved_supported',note='Insufficient current evidence').status_code==400
        provider=login(f'provider{number}')
        assert action(provider,'respond',id=member,value='supported').status_code==200
        assert action(coder,'review',id=member,value='resolved_supported',note='Response alone is insufficient').status_code==400
        assert action(provider,'later_encounter',id=member).status_code==200
        assert action(coder,'review',id=member,value='resolved_supported',note='Later completed encounter reviewed.').status_code==200


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
    assert action(client,'correction',id='SUB-0002').status_code==200
    records=client.get('/api/v1/bootstrap').json()['submissions']
    original=next(r for r in records if r['id']=='SUB-0001')
    rejected=next(r for r in records if r['id']=='SUB-0002')
    retry=next(r for r in records if r['status']=='correction_pending' and r['original_id']=='SUB-0001')
    assert original['status']=='accepted' and rejected['status']=='rejected'
    assert not original['corrected']
    assert action(client,'receiver',id=retry['id'],value='acknowledged').status_code==200
    assert action(client,'receiver',id=retry['id'],value='accepted').status_code==200
    records=client.get('/api/v1/bootstrap').json()['submissions']
    assert next(r for r in records if r['id']=='SUB-0001')['corrected']
    assert len(next(r for r in records if r['id']==retry['id'])['history'])==2
    assert action(client,'receiver',id=retry['id'],value='rejected').status_code==400


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
    assert action(analyst,'campaign',**{**body,'owner':'Coding team'}).status_code==409
    state=analyst.get('/api/v1/bootstrap').json()
    tasks=[t for t in state['tasks'] if t['type']=='campaign']
    assert len(tasks)==2 and all(t['owner']=='QA team' and t['due_date']=='2026-10-05' for t in tasks)


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
    assert doc['signature_status']=='signed' and doc['source_status']=='eligible'
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
