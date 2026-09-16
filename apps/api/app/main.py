"""Local-only Perform+ demo: protected fixtures, PostgreSQL state, real local RBAC."""
from __future__ import annotations
from . import display, assessment, risk_store, risk_workflow, risk_inputs, people, florida_population
from copy import deepcopy
import csv
import io
import json
import os
import secrets
import hashlib
import psycopg
from psycopg.rows import dict_row
import time
import zipfile
from collections import Counter
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
from fastapi import FastAPI, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

ROOT = Path(__file__).resolve().parents[3]
LOCAL = Path(os.getenv('CT_DATA_DIR', str(ROOT / '.local')))
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL and (LOCAL / 'database-url').exists():
    DATABASE_URL = (LOCAL / 'database-url').read_text().strip()
SEED = ROOT / 'seed' / 'demo.json'
SESSION_SECONDS = 8 * 3600
COOKIE = 'ct_session'
PASSWORD_HASHER = PasswordHasher()
ALL_SCREENS = ['overview','analytics','suspects','campaigns','members','chase','intake','reviews','qa','providers','previsit','scenarios','submissions','audit','data','admin']
ROLES = {
 'executive': {'screens':['overview','analytics','suspects','members'], 'actions':['export','open_evidence']},
 'risk_analyst': {'screens':['overview','analytics','suspects','campaigns','members','providers','scenarios'], 'actions':['analyze','campaign','activate_campaign','assign','defer','suppress','request_evidence','export','open_evidence','query']},
 'retrieval_coordinator': {'screens':['members','chase','intake','providers','data'], 'actions':['receive','intake','contact','request_evidence','export','open_evidence','retry']},
 'coder': {'screens':['suspects','members','reviews'], 'actions':['review','query','defer','open_evidence','export','request_evidence','start_review','pause_review','complete_review']},
 'qa_reviewer': {'screens':['members','reviews','qa','audit','suspects'], 'actions':['qa','open_evidence','export']},
 'provider': {'screens':['members','providers','previsit'], 'actions':['respond','later_encounter','open_evidence','export']},
 'submission_analyst': {'screens':['members','submissions','audit'], 'actions':['prepare','receiver','correction','export','open_evidence']},
 'administrator': {'screens':['overview','analytics','members','data','admin'], 'actions':['reset','users','retry','export','open_evidence']},
}
ROLES['risk_analyst']['actions'].extend(['risk_calculate','risk_scenario'])
ROLES['administrator']['actions'].extend(['model_manage','risk_import'])
for role in ROLES.values():
    if any(action in role['actions'] for action in ('respond','request_evidence','intake')):role['actions'].append('close_task')
ROLES['superuser'] = {'screens':ALL_SCREENS.copy(), 'actions':list(dict.fromkeys(action for role in ROLES.values() for action in role['actions']))}
ROLE_NAMES = {'executive':'Executive','risk_analyst':'Risk analyst','retrieval_coordinator':'Retrieval coordinator','coder':'Coder','qa_reviewer':'QA reviewer','provider':'Provider','submission_analyst':'Submission analyst','administrator':'Administrator','superuser':'Superuser'}
EMAILS = {'executive':'executive','risk_analyst':'analyst','retrieval_coordinator':'retrieval','coder':'coder','qa_reviewer':'qa','provider':'provider','submission_analyst':'submission','administrator':'admin'}

class Database:
    def __init__(self, conn): self.conn = conn
    def execute(self, sql, args=()): return self.conn.execute(sql.replace('?', '%s'), args)
    def executescript(self, sql):
        for statement in sql.split(';'):
            if statement.strip(): self.conn.execute(statement)
    def commit(self): self.conn.commit()

@contextmanager
def db():
    if not DATABASE_URL: raise RuntimeError('DATABASE_URL is required. Run scripts/dev.py or set the database connection.')
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        yield Database(conn)

def token_key(token): return hashlib.sha256(token.encode()).hexdigest()

def now(): return datetime.now(timezone.utc).isoformat()
def fail(code, message, status=400): raise HTTPException(status_code=status, detail={'code':code,'message':message})
def get_state(conn, lock=False):
    state=json.loads(conn.execute('SELECT body FROM state WHERE id=1' + (' FOR UPDATE' if lock else '')).fetchone()['body'])
    assessment.upgrade(state)
    florida_population.migrate(state)
    people.refresh_owners(conn,state)
    grouped={}
    for finding in state['opportunities']:grouped.setdefault(finding['member_id'],[]).append(finding)
    for m in state['members']:
        m.update(assessment.member_summary(state,m['id'],grouped.get(m['id'],[])))
    return state
def save_state(conn, state):
    assessment.upgrade(state)
    florida_population.migrate(state)
    people.refresh_owners(conn,state)
    conn.execute('UPDATE state SET body=? WHERE id=1',(json.dumps(state),))

def ensure_superuser(conn):
    # Never overwrite an existing account, password, or intentional access change.
    if conn.execute('SELECT id FROM users WHERE role=? OR id=?',('superuser','superuser')).fetchone():
        return
    password = os.getenv('CT_SUPERUSER_PASSWORD') or secrets.token_urlsafe(24)
    email = 'superuser.demo@example.test'
    credentials = LOCAL / 'superuser-account.json'
    descriptor = os.open(credentials, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, 'w') as saved:
        os.fchmod(saved.fileno(), 0o600)
        json.dump({'email':'superuser@perform.test','password':password,'role':'superuser'}, saved, indent=2)
        saved.write('\n')
    conn.execute('INSERT INTO users VALUES (?,?,?,?,?,1,?)',('superuser',email,people.ACCOUNT_NAMES['superuser'],'superuser',PASSWORD_HASHER.hash(password),''))

def initialize():
    LOCAL.mkdir(parents=True, exist_ok=True)
    os.chmod(LOCAL, 0o700)
    with db() as conn:
        conn.execute('SELECT pg_advisory_xact_lock(728314)')
        conn.executescript('''CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT UNIQUE,name TEXT,role TEXT,password TEXT,active INTEGER DEFAULT 1,provider_id TEXT);
        CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY,user_id TEXT,csrf TEXT,expires DOUBLE PRECISION);
        CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY,body TEXT);
        CREATE TABLE IF NOT EXISTS events (id BIGSERIAL PRIMARY KEY,actor TEXT,action TEXT,resource TEXT,detail TEXT,created_at TEXT);
        CREATE TABLE IF NOT EXISTS login_attempts (key TEXT PRIMARY KEY, failures INTEGER, retry_at DOUBLE PRECISION);''')
        risk_store.initialize(conn)
        if not conn.execute('SELECT id FROM users LIMIT 1').fetchone():
            password = os.getenv('CT_DEMO_PASSWORD') or secrets.token_urlsafe(14)
            accounts=[]
            for role in ROLES:
                if role == 'superuser': continue
                email=f'{EMAILS[role]}.demo@example.test'
                scope='PR-001' if role=='provider' else ''
                conn.execute('INSERT INTO users VALUES (?,?,?,?,?,1,?)',(role,email,people.ACCOUNT_NAMES[role],role,PASSWORD_HASHER.hash(password),scope))
                accounts.append({'role':role,'email':email,'password':password})
            credentials=LOCAL/'demo-accounts.json'
            credentials.write_text(json.dumps(accounts,indent=2))
            os.chmod(credentials,0o600)
        # Each showcase practice has its own local login and isolated member scope.
        credentials=LOCAL/'demo-accounts.json'
        saved=json.loads(credentials.read_text()) if credentials.exists() else []
        password=os.getenv('CT_DEMO_PASSWORD') or (saved[0]['password'] if saved else None)
        if password:
            for number in range(2,7):
                account_id=f'provider_{number}'
                if not conn.execute('SELECT id FROM users WHERE id=?',(account_id,)).fetchone():
                    email=f'provider{number}.demo@example.test'
                    conn.execute('INSERT INTO users VALUES (?,?,?,?,?,1,?)',(account_id,email,people.ACCOUNT_NAMES[account_id],'provider',PASSWORD_HASHER.hash(password),f'PR-{number:03}'))
                    saved.append({'role':'provider','email':email,'password':password})
            credentials.write_text(json.dumps(saved,indent=2));os.chmod(credentials,0o600)
        ensure_superuser(conn)
        people.migrate_accounts(conn,ROLE_NAMES)
        if not conn.execute('SELECT id FROM state').fetchone():
            if not SEED.exists(): raise RuntimeError('Missing seed/demo.json. Run setup first.')
            initial=json.loads(SEED.read_text())
            initial['runs']=[]
            initial['tasks']=[]
            initial['tour_started']=now()
            assessment.upgrade(initial)
            florida_population.migrate(initial)
            people.refresh_owners(conn,initial)
            conn.execute('INSERT INTO state VALUES (1,?)',(json.dumps(initial),))
        else:
            save_state(conn,get_state(conn,lock=True))
        risk_inputs.mark_legacy_aca_stale(conn,get_state(conn)['members'])


app=FastAPI(title='CitusTech Perform+ local demo',version='0.1.0',docs_url='/api/docs',openapi_url='/api/openapi.json')

@app.on_event('startup')
def startup(): initialize()

@app.exception_handler(HTTPException)
async def errors(request, exc):
    content=exc.detail if isinstance(exc.detail,dict) else {'code':'REQUEST_FAILED','message':str(exc.detail)}
    return JSONResponse({'error':content},status_code=exc.status_code)

@app.middleware('http')
async def local_headers(request: Request, call_next):
    if request.method not in ('GET','HEAD','OPTIONS'):
        origin=request.headers.get('origin')
        allowed=set(os.getenv('CT_ALLOWED_ORIGINS','http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000,http://testserver').split(','))
        if origin and origin not in allowed:
            return JSONResponse({'error':{'code':'ORIGIN_DENIED','message':'This local application does not accept that origin.'}},status_code=403)
    response=await call_next(request)
    response.headers['Cache-Control']='no-store'
    response.headers['X-Content-Type-Options']='nosniff'
    response.headers['Referrer-Policy']='same-origin'
    return response

def user(request:Request):
    token=request.cookies.get(COOKIE,'')
    with db() as conn:
        row=conn.execute('SELECT users.*,sessions.csrf,sessions.expires FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token=?',(token_key(token),)).fetchone()
    if not row or not row['active'] or row['expires']<=time.time(): fail('AUTHENTICATION_REQUIRED','Please sign in to continue.',401)
    account=dict(row)
    if request.method not in ('GET','HEAD') and not secrets.compare_digest(request.headers.get('x-csrf-token',''),account['csrf']): fail('CSRF_FAILED','Refresh your session and try again.',403)
    return account

def account_email(email):
    return email.removesuffix('.demo@example.test')+'@perform.test' if email.endswith('.demo@example.test') else email

def presentation(u):
    return {k:(ROLE_NAMES[u['role']] if k=='name' and u[k]==ROLE_NAMES[u['role']]+' demo' else account_email(u[k]) if k=='email' else u[k]) for k in ('id','email','name','role','provider_id')} | {'screens':ROLES[u['role']]['screens'],'permissions':ROLES[u['role']]['actions'],'csrf_token':u.get('csrf')}

def permit(u, action):
    if action not in ROLES[u['role']]['actions']: fail('ACTION_FORBIDDEN','Your role cannot perform this action.',403)

def allowed_members(s,u):
    if u['role']=='provider': return [m for m in s['members'] if m['provider_id']==u['provider_id']]
    if u['role'] in ('coder','qa_reviewer','retrieval_coordinator'):
        return [m for m in s['members'] if int(m['id'].split('-')[1])<=30]
    return s['members']

def member(s,u,id):
    m=next((m for m in allowed_members(s,u) if m['id']==id),None)
    if not m: fail('RESOURCE_NOT_FOUND','The record is unavailable.',404)
    return m

def event(conn,u,action,resource,detail):
    conn.execute('INSERT INTO events (actor,action,resource,detail,created_at) VALUES (?,?,?,?,?)',(u['email'],action,resource,detail,now()))

def rows_for(s,u,kind):
    ids={m['id'] for m in allowed_members(s,u)}
    return [r for r in s.get(kind,[]) if r.get('member_id') in ids]

def scoped_eligibility(s,u,mid,finding_id=None):
    result=assessment.eligibility(s,mid,finding_id)
    example=next((m['id'] for m in allowed_members(s,u) if m['id'] in assessment.CASE_IDS),None)
    result['example_href']=('/reviews/' if 'reviews' in ROLES[u['role']]['screens'] else '/members/')+example if example else '/members'
    return result

def resolve_finding(s,u,target='',finding_id='',required=False):
    selected=finding_id or (target if any(o['id']==target for o in s['opportunities']) else '')
    if selected:
        row=next((o for o in s['opportunities'] if o['id']==selected),None)
        if not row:fail('RESOURCE_NOT_FOUND','The finding is unavailable.',404)
        member(s,u,row['member_id'])
        if target.startswith('MB-') and row['member_id']!=target:fail('FINDING_MISMATCH','The selected finding belongs to a different member.')
        return row
    if target.startswith('MB-'):
        member(s,u,target);rows=assessment.opportunities(s,target)
        if len(rows)>1 and required:fail('FINDING_REQUIRED','Select the individual finding before changing this member’s work.',409)
        if len(rows)==1:return rows[0]
    if required:fail('RESOURCE_NOT_FOUND','Open a finding to continue.',404)
    return None

def new_task(s,mid,kind,title,owner,**fields):
    row={'id':'TK-'+secrets.token_hex(5),'member_id':mid,'title':title,'type':kind,'status':'open',
         'owner':owner['name'],'owner_id':owner['id'],'created_at':now(),**fields}
    assessment.task_requirements(s,row)
    s['tasks'].append(row)
    return row

def selected_findings(s,u,ids,finding_ids):
    if finding_ids:
        rows=[resolve_finding(s,u,fid,required=True) for fid in dict.fromkeys(finding_ids)]
        if set(ids)!={o['member_id'] for o in rows}:fail('FINDING_MISMATCH','Selected findings must match the exact selected member cohort.')
        return rows
    return [resolve_finding(s,u,mid,required=True) for mid in ids]

def assignment_options(conn,s,u):
    visible={m['id'] for m in allowed_members(s,u)}
    result=[]
    for row in conn.execute('SELECT id,email,name,role,provider_id FROM users WHERE active=1 ORDER BY id'):
        account=dict(row);actions=ROLES[account['role']]['actions'];interventions=[]
        if 'review' in actions:interventions.extend(['coding_review','integrity_review'])
        if 'qa' in actions:interventions.append('independent_qa')
        if 'intake' in actions:interventions.append('source_remediation')
        if 'respond' in actions:interventions.append('pre_visit')
        if 'prepare' in actions:interventions.append('submission')
        mids=[m['id'] for m in allowed_members(s,account) if m['id'] in assessment.CASE_IDS and m['id'] in visible]
        if interventions and mids:result.append({'id':account['id'],'name':account['name'].removesuffix(' demo'),'email':account_email(account['email']),'role':account['role'],'provider_id':account['provider_id'],'member_ids':mids,'interventions':interventions})
    return result

def allocation(conn,s,u,ids,owner='',intervention='coding_review'):
    intervention=assessment.normalize_intervention(intervention)
    for mid in ids:
        member(s,u,mid)
        if mid not in assessment.CASE_IDS:fail('CASE_NOT_ACTIONABLE','Choose complete cases for actionable work. Population illustrations cannot be assigned.')
    aliases={'Coding team':'coder','QA team':'qa_reviewer','Retrieval team':'retrieval_coordinator','Provider practice':'provider'}
    chosen=aliases.get(owner,owner) or {'coding_review':'coder','integrity_review':'coder','independent_qa':'qa_reviewer','source_remediation':'retrieval_coordinator','pre_visit':'provider'}.get(intervention,'coder')
    options=assignment_options(conn,s,u)
    if not owner and intervention=='pre_visit':chosen=next((a['id'] for a in options if a['role']=='provider' and set(ids)<=set(a['member_ids'])),'')
    assignee=next((a for a in options if a['id']==chosen or a['name']==chosen or a['email']==chosen),None)
    if not assignee or intervention not in assignee['interventions'] or not set(ids)<=set(assignee['member_ids']):
        fail('ASSIGNEE_SCOPE','Choose an active account with the required action and access to every selected member.')
    return assignee,intervention

def save_review(conn,s,o,u,decision,note):
    mid=o['member_id'];refs=assessment.source_refs(s,mid,o['id']);finding=assessment.current_finding(s,mid,o['id'])
    refs=[r for r in refs if r['document_id'] in finding['source_ids']]
    risk_context=risk_workflow.decision_context(conn,s,u,o)
    risk_context['source_refs']=deepcopy(refs)
    if o.get('prepared_code',{}).get('source_eligibility'):
        risk_context['source_eligibility']=deepcopy(o['prepared_code']['source_eligibility'])
        risk_context['code_reference']=deepcopy(o['prepared_code']['code_reference'])
        risk_context['mapping_reference']=deepcopy(o['prepared_code']['mapping_reference'])
    if refs:
        source=assessment.document(s,refs[0]['document_id'])
        risk_context.update(source_id=source['id'],source_version=refs[0]['source_version'],source_content_hash=refs[0]['content_hash'],service_date=source['date'])
    record={'id':'DEC-'+secrets.token_hex(5),'member_id':mid,'finding_id':o['id'],'actor':account_email(u['email']),'actor_id':u['id'],
      'at':now(),'decision':decision,'note':note,'recommendation_version':o['recommendation_version'],
      'basis_key':assessment.basis_key(s,mid,o['id']),'source_refs':deepcopy(refs),'code':deepcopy(o.get('prepared_code')),
      'evidence_episode_id':o['evidence_episode_id'],'rule_version':o['clinical_rule_version'],'category_refs':deepcopy(o.get('category_refs',[])),
      'risk_context':risk_context,
      'recommendation_snapshot':deepcopy(o.get('recommendation_history',[])[-1] if o.get('recommendation_history') else {})}
    o.setdefault('decision_history',[]).append(record)
    o.update(review_state='completed',draft_note='',draft_decision='',status=decision,reviewer=u['id'],decision_note=note,qa_status='awaiting_qa',review_completed_at=record['at'],current_decision_id=record['id'])
    o.pop('qa_note',None);o.pop('qa_reviewer',None)
    return record

def approved_decision(s,mid,finding_id=None):
    o=assessment.opportunity(s,mid,finding_id)
    if not o or not assessment.completion(s,mid,finding_id=finding_id)['complete']:fail('APPROVAL_REQUIRED','Complete a terminal review and independent QA before preparing this record.')
    review=next((r for r in o['decision_history'] if r['id']==o.get('current_decision_id')),None)
    qa=next((q for q in reversed(o['qa_history']) if q['decision_id']==o.get('current_decision_id') and q['status']=='passed'),None)
    if not review or not qa or review['actor_id']==qa['actor_id'] or review.get('basis_key')!=assessment.basis_key(s,mid,o['id']):
        fail('APPROVAL_REQUIRED','The exact current evidence requires a fresh independently approved decision.')
    return o,review,qa

def prepare_record(s,mid,u,finding_id=None):
    o,review,qa=approved_decision(s,mid,finding_id)
    operation='add' if o.get('case_rule_id')=='MB-000001' and review['decision']=='resolved_supported' else 'delete' if o.get('case_rule_id')=='MB-000004' and review['decision']=='resolved_unsupported' else None
    if not operation:fail('PREPARED_RECORD_UNAVAILABLE','Prepared transmission is configured for Jordan’s approved addition and Taylor’s approved deletion only.')
    existing=next((r for r in s['submissions'] if r.get('decision_id')==review['id'] and r.get('qa_id')==qa['id']),None)
    if existing:return existing,False
    if not o.get('prepared_code'):fail('CODE_REFERENCE_REQUIRED','The reviewed code reference is not configured.')
    row={'id':'SUB-'+secrets.token_hex(5),'member_id':mid,'finding_id':o['id'],'type':'original' if operation=='add' else 'correction',
      'operation':operation,'status':'prepared','receiver':'Simulated receiver · SYN-RECEIVER-2026','receiver_fixture_id':'SYN-RECEIVER-2026',
      'original_id':'SUB-0001' if operation=='delete' else None,'reason':'Prepared from this exact independently approved review. No external transmission occurs.',
      'code':o['prepared_code']['code'],'code_release':o['prepared_code']['release'],'code_reference':deepcopy(o['prepared_code']),
      'condition':o['condition'],'corrected':False,'transport_status':'not_acknowledged','receiver_status':'not_processed','eligibility_status':'not_evaluated',
      'reported_status':'not_compared','reconciliation_status':'unreconciled','history':[],'simulation':True,'synthetic':True,
      'owner':account_email(u['email']),'created_at':now(),'decision_id':review['id'],'qa_id':qa['id'],
      'recommendation_snapshot':deepcopy(review['recommendation_snapshot']),'review_snapshot':deepcopy(review),'qa_snapshot':deepcopy(qa),'source_refs':deepcopy(review['source_refs']),
      'evidence_episode_id':o['evidence_episode_id'],'risk_context':deepcopy(review.get('risk_context',{}))}
    s['submissions'].append(row)
    return row,True

class Login(BaseModel):
    model_config=ConfigDict(extra='forbid')
    email:str=Field(max_length=150)
    password:str=Field(max_length=200)

@app.get('/api/v1/live')
def live(): return {'status':'ok'}

@app.get('/api/v1/ready')
def ready():
    try:
        with db() as conn:
            if not conn.execute('SELECT id FROM state WHERE id=1').fetchone():
                return JSONResponse({'status':'initializing'},status_code=503)
    except psycopg.Error:
        return JSONResponse({'status':'database_unavailable'},status_code=503)
    return {'status':'ready'}

@app.get('/api/v1/health')
def health():
    with db() as conn: conn.execute('SELECT 1')
    return {'status':'ok','mode':'demo','database':'postgresql'}

@app.get('/api/v1/auth/accounts')
def accounts():
    with db() as conn:
        return [{'role':r['role'],'label':r['name'].removesuffix(' demo') if r['name'] in [n+' demo' for n in ROLE_NAMES.values()] else r['name'],'email':account_email(r['email'])} for r in conn.execute('SELECT name,role,email FROM users WHERE active=1 ORDER BY id')]

@app.post('/api/v1/auth/login')
def login(body:Login,request:Request,response:Response):
    email=body.email.lower().strip()
    if email.endswith('@perform.test'):email=email.removesuffix('@perform.test')+'.demo@example.test'
    with db() as conn:
        key=f'{request.client.host}:{email}'
        attempt=conn.execute('SELECT * FROM login_attempts WHERE key=?',(key,)).fetchone()
        if attempt and attempt['failures']>=8 and attempt['retry_at']>time.time(): fail('LOGIN_PAUSED','Too many attempts. Try again in one minute.',429)
        row=conn.execute('SELECT * FROM users WHERE email=?',(email,)).fetchone()
        valid=False
        try: valid=bool(row and row['active'] and PASSWORD_HASHER.verify(row['password'],body.password))
        except (VerifyMismatchError,InvalidHashError): pass
        if not valid:
            count=(attempt['failures'] if attempt and attempt['retry_at']>time.time() else 0)+1
            conn.execute('INSERT INTO login_attempts VALUES (?,?,?) ON CONFLICT (key) DO UPDATE SET failures=EXCLUDED.failures,retry_at=EXCLUDED.retry_at',(key,count,time.time()+60));conn.commit()
            fail('INVALID_CREDENTIALS','Email or password is incorrect.',401)
        conn.execute('DELETE FROM login_attempts WHERE key=?',(key,))
        conn.execute('DELETE FROM sessions WHERE token=?',(token_key(request.cookies.get(COOKIE,'')),))
        token,csrf=secrets.token_urlsafe(40),secrets.token_urlsafe(24)
        conn.execute('INSERT INTO sessions VALUES (?,?,?,?)',(token_key(token),row['id'],csrf,time.time()+SESSION_SECONDS))
        response.set_cookie(COOKIE,token,max_age=SESSION_SECONDS,httponly=True,samesite='lax',secure=os.getenv('CT_SECURE_COOKIE')=='true')
        return presentation(dict(row)|{'csrf':csrf})

@app.get('/api/v1/auth/session')
def session(u=Depends(user)): return presentation(u)

@app.delete('/api/v1/auth/session')
def logout(request:Request,response:Response,u=Depends(user)):
    with db() as conn: conn.execute('DELETE FROM sessions WHERE token=?',(token_key(request.cookies.get(COOKIE,'')),))
    response.delete_cookie(COOKIE)
    return {'ok':True}

@app.get('/api/v1/bootstrap')
def bootstrap(u=Depends(user)):
    with db() as conn:
        s=get_state(conn)
        ms=allowed_members(s,u)
        ids={m['id'] for m in ms}
        lookup={m['id']:m for m in ms}
        example_id=next((m['id'] for m in ms if m['id'] in assessment.CASE_IDS),None)
        example_href=(('/reviews/' if 'reviews' in ROLES[u['role']]['screens'] else '/members/')+example_id) if example_id else '/members'
        opps=[o|{'eligibility':o['eligibility']|{'example_href':example_href},'name':lookup[o['member_id']]['name'],'initials':lookup[o['member_id']]['initials'],'provider':lookup[o['member_id']]['provider']} for o in rows_for(s,u,'opportunities')]
        events=[dict(r) for r in conn.execute('SELECT * FROM events ORDER BY id DESC LIMIT 100').fetchall() if r['resource'] in ids or (u['role'] in ('executive','risk_analyst','administrator','superuser') and not str(r['resource']).startswith('MB-'))]
        counts=Counter(o['status'] for o in opps)
        screens=ROLES[u['role']]['screens']
        data={'members':ms[:30],'population_count':len(ms),'opportunities':opps,'counts':dict(counts),'events':events,'tour_started':s.get('tour_started'), 'runs':s.get('runs',[]) if 'data' in screens or 'suspects' in screens else [],'tasks':[t for t in s.get('tasks',[]) if t.get('member_id') in ids]}
        data['campaigns']=[c|{'member_ids':[i for i in c['member_ids'] if i in ids]} for c in s.get('campaigns',[]) if 'campaigns' in screens or 'overview' in screens]
        data['chases']=rows_for(s,u,'chases') if 'chase' in screens or 'overview' in screens else []
        data['submissions']=rows_for(s,u,'submissions') if 'submissions' in screens or 'audit' in screens or 'overview' in screens else []
        pids={m['provider_id'] for m in ms}
        data['providers']=[p for p in s.get('providers',[]) if p['id'] in pids]
        data['comparison']=s.get('comparison',{}) if 'analytics' in screens else None
        data['issues']=source_issues(s,u) if 'data' in screens or 'intake' in screens else []
        data['program_context']=s['program_context']
        data['assignment_options']=assignment_options(conn,s,u)
        data['case_catalog']=[{'member_id':m['id'],'name':m['name'],'scenario_id':'CASE-'+m['id'],'transitions':assessment.scenario(s,m['id'])['transitions']} for m in ms if m['id'] in assessment.CASE_IDS]
        data['import_summary']=assessment.import_summary(s,ids) if 'data' in screens or 'intake' in screens else None
        data['scenarios']=[assessment.scoring_scenario()] if 'scenarios' in screens else []
        data['completion_counts']={'eligible_cases':sum(o['member_id'] in assessment.CASE_IDS for o in opps),'qa_approved':sum(o['completion']['complete'] for o in opps),'awaiting_qa':sum(o.get('qa_status')=='awaiting_qa' for o in opps),'recorded_dispositions':sum(o['status'].startswith('resolved_') for o in opps)}
        data['members']=[display.member(m)|{'eligibility':scoped_eligibility(s,u,m['id'])} for m in data['members']]
        data['submissions']=[display.submission(r) for r in data['submissions']]
        data['issues']=[r|{'title':display.text(r['title']),'reason':display.text(r['reason'])} for r in data['issues']]
        return data

@app.get('/api/v1/members')
def members(q:str='',provider:str='',status:str='',page:int=1,size:int=25,u=Depends(user)):
    with db() as conn:
        state=get_state(conn);ms=allowed_members(state,u)
        if q: ms=[m for m in ms if q.lower() in json.dumps(m).lower()]
        if provider: ms=[m for m in ms if m['provider_id']==provider]
        if status: ms=[m for m in ms if m['status']==status]
        size=max(1,min(size,100)); page=max(page,1)
        return {'items':[display.member(m)|{'eligibility':scoped_eligibility(state,u,m['id'])} for m in ms[(page-1)*size:page*size]],'total':len(ms),'page':page}

@app.get('/api/v1/members/{id}')
def member_detail(id:str,finding:str='',u=Depends(user)):
    with db() as conn:
        s=get_state(conn);m=member(s,u,id)
        for o in s['opportunities']:
            if o['member_id']==id:o['eligibility']=scoped_eligibility(s,u,id,o['id'])
        selected=resolve_finding(s,u,id,finding,required=bool(finding))
        fid=selected['id'] if selected else None
        return display.member(m)|{'selected_finding_id':fid,'finding_summary':assessment.member_summary(s,id),'summary':assessment.current_finding(s,id,fid)['summary'],'eligibility':scoped_eligibility(s,u,id,fid),'claims':assessment.claims(s,id,fid),'basis_key':assessment.basis_key(s,id,fid),'next_steps':assessment.next_steps(s,id,fid),'scenario':assessment.scenario(s,id),'audit_trace':assessment.audit_trace(s,id),'submissions':[display.submission(r) for r in s['submissions'] if r['member_id']==id],'documents':[display.document(d) for d in s.get('documents',[]) if d['member_id']==id and d.get('available',True) and d['source_status']!='not_loaded'], 'opportunities':[o for o in s['opportunities'] if o['member_id']==id], 'tasks':[t for t in s.get('tasks',[]) if t.get('member_id')==id], 'history':[dict(r) for r in conn.execute('SELECT * FROM events WHERE resource=? ORDER BY id DESC',(id,))]}

@app.get('/api/v1/evidence/{id}')
def evidence(id:str,u=Depends(user)):
    with db() as conn:
        s=get_state(conn);doc=next((d for d in s['documents'] if d['id']==id),None)
        if not doc or not doc.get('available',True) or doc['source_status']=='not_loaded': fail('RESOURCE_NOT_FOUND','Document not found.',404)
        member(s,u,doc['member_id']);return display.document(doc)

class Action(BaseModel):
    model_config=ConfigDict(extra='forbid')
    action:str
    expected_versions:dict[str,int]|None=None
    expected_covered:list[str]|None=None
    id:str=''
    finding_id:str=Field(default='',max_length=100)
    finding_ids:list[str]=Field(default_factory=list,max_length=500)
    task_id:str=Field(default='',max_length=100)
    decision_id:str=Field(default='',max_length=100)
    evidence_episode_id:str=Field(default='',max_length=100)
    required_source_ids:list[str]=Field(default_factory=list,max_length=50)
    member_ids:list[str]=Field(default_factory=list,max_length=500)
    value:str=Field(default='',max_length=300)
    note:str=Field(default='',max_length=2000)
    name:str=Field(default='',max_length=100)
    owner:str=Field(default='',max_length=100)
    document_id:str=Field(default='',max_length=100)
    page:int=Field(default=1,ge=1)
    section:str=Field(default='',max_length=300)
    due_date:str=Field(default='',pattern=r'^(|20[0-9]{2}-[0-9]{2}-[0-9]{2})$')

@app.post('/api/v1/actions')
def action(body:Action,u=Depends(user)):
    permit(u,body.action)
    with db() as conn:
        s=get_state(conn,lock=True);resource=body.id;message='Updated successfully.'
        if body.member_ids and body.action in ('assign','defer','suppress','request_evidence'):
            ids=list(dict.fromkeys(body.member_ids))
            for id in ids:
                member(s,u,id)
                if not any(o['member_id']==id for o in s['opportunities']):fail('VALIDATION','Every selected member must have an opportunity.')
            for id in ids:
                if id not in assessment.CASE_IDS:fail('CASE_NOT_ACTIONABLE','Choose complete cases for actionable work.')
            findings=selected_findings(s,u,ids,body.finding_ids)
            if body.action=='assign':assignee,_=allocation(conn,s,u,ids,body.value)
            if body.action in ('defer','suppress') and not body.note.strip():fail('VALIDATION','Add a reason for the selected work.')
            for finding in findings:
                id=finding['member_id'];record=member(s,u,id)
                if body.action=='assign':finding['owner']=assignee['name'];finding['owner_id']=assignee['id']
                elif body.action=='request_evidence':
                    receiver,_=allocation(conn,s,u,[id],'retrieval_coordinator','source_remediation')
                    if not any(t.get('finding_id')==finding['id'] and t['type']=='request_evidence' and t['status']=='open' for t in s['tasks']):
                        new_task(s,id,'request_evidence',body.note or 'Request current encounter documentation',receiver,finding_id=finding['id'])
                    finding['status']='awaiting_evidence'
                else:finding['status']='deferred' if body.action=='defer' else 'suppressed';finding['disposition_note']=body.note
                finding['version']=finding.get('version',1)+1;record.update(assessment.member_summary(s,id))
                event(conn,u,body.action,id,body.note or f'Assigned to {body.value}' if body.action=='assign' else body.note or 'Current documentation requested.')
            save_state(conn,s)
            return {'ok':True,'message':f'{body.action.replace("_"," ").capitalize()} completed for {len(ids)} members.','affected':len(ids)}
        task=next((t for t in s['tasks'] if t['id']==(body.task_id or body.id)),None)
        target=task['member_id'] if task else body.id
        if body.task_id and not task:fail('RESOURCE_NOT_FOUND','The task is unavailable.',404)
        if task and body.id.startswith('MB-') and task['member_id']!=body.id:fail('TASK_MISMATCH','The task belongs to a different member.')
        if task and task.get('finding_id') and body.finding_id and task['finding_id']!=body.finding_id:fail('FINDING_MISMATCH','The task belongs to a different finding.')
        mid=target if target.startswith('MB-') else ''
        finding_action=body.action in ('review','qa','defer','suppress','assign','start_review','pause_review','complete_review','query','request_evidence') or (body.action=='prepare' and bool(mid))
        o=resolve_finding(s,u,target,body.finding_id or (task.get('finding_id') or '' if task else ''),required=finding_action)
        if o: mid=o['member_id']
        if mid: m=member(s,u,mid);resource=mid
        if body.action=='campaign':
            ids=list(dict.fromkeys(body.member_ids))
            if not ids or not body.name.strip():fail('VALIDATION','Choose members and name the campaign.')
            findings=selected_findings(s,u,ids,body.finding_ids)
            assignee,intervention=allocation(conn,s,u,ids,body.owner,body.value)
            selected_ids={finding['id'] for finding in findings}
            prior=next((c for c in s['campaigns'] if c['name'].strip()==body.name.strip() and set(c['member_ids'])==set(ids)
                        and set(c.get('finding_ids') or [finding['id'] for finding in s['opportunities'] if finding['member_id'] in c['member_ids']])==selected_ids),None)
            if prior and (prior.get('owner_id')!=assignee['id'] or prior['due_date']!=(body.due_date or '2026-09-30') or prior.get('intervention')!=intervention):
                fail('ALLOCATION_CONFLICT','This named cohort already exists with a different allocation. Use a new campaign name.',409)
            if not prior and body.expected_versions is not None:
                actual={finding['id']:finding.get('version',1) for finding in findings}
                covered=sorted(id for id in ids if any(c['status']=='active' and id in c['member_ids'] for c in s['campaigns']))
                if actual!=body.expected_versions or covered!=sorted(body.expected_covered or []):
                    fail('STALE_PREVIEW','The selected cohort or campaign coverage changed. Refresh the preview before activating.',409)
            if not prior:
                c={'id':'CP-'+secrets.token_hex(3),'name':body.name.strip(),'type':intervention,'intervention':intervention,'owner':assignee['name'],'owner_id':assignee['id'],'status':'active','member_ids':ids,'finding_ids':[o['id'] for o in findings],'created_at':now(),'due_date':body.due_date or '2026-09-30','progress':0}
                s['campaigns'].append(c)
                for finding in findings:new_task(s,finding['member_id'],'campaign',body.name,assignee,intervention=intervention,finding_id=finding['id'],campaign_id=c['id'],due_date=c['due_date'])
            message=f'Campaign activated for {len(ids)} members.';resource=prior['id'] if prior else c['id']
        elif body.action=='activate_campaign':
            c=next((c for c in s['campaigns'] if c['id']==body.id),None)
            if not c:fail('RESOURCE_NOT_FOUND','Campaign not found.',404)
            assignee,intervention=allocation(conn,s,u,c['member_ids'],body.owner or c.get('owner_id',''),c.get('intervention',c['type']))
            c.update(status='active',owner=assignee['name'],owner_id=assignee['id'])
            findings=selected_findings(s,u,c['member_ids'],c.get('finding_ids',[]))
            for finding in findings:
                if not any(t.get('campaign_id')==c['id'] and t.get('finding_id')==finding['id'] for t in s['tasks']):new_task(s,finding['member_id'],'campaign',c['name'],assignee,intervention=intervention,finding_id=finding['id'],campaign_id=c['id'],due_date=c['due_date'])
            message=f'Campaign activated for {len(c["member_ids"])} members.'
        elif body.action=='analyze':
            targets=list(dict.fromkeys(body.member_ids or ([mid] if mid else [])))
            if not targets:fail('VALIDATION','Select at least one member.')
            results=[]
            for id in targets:
                member(s,u,id)
                selected=[o] if o and o['member_id']==id else assessment.opportunities(s,id)
                if not selected:results.append(assessment.analyze(s,id))
                for finding in selected:results.append(assessment.analyze(s,id,finding['id']))
            run={'id':'RUN-'+secrets.token_hex(3),'mode':'prepared_analysis','status':'succeeded','members':len(targets),'created_at':now(),'results':results,'stages':['Read published sources','Evaluated named prepared transition','Retained changed or no-change result']}
            s['runs'].insert(0,run)
            changes=sum(r['result']=='changed' for r in results)
            message=f'Prepared analysis: {changes} changed, {sum(r["result"]=="no_change" for r in results)} no change, {sum(r["result"]=="no_result" for r in results)} unavailable.';resource=targets[0]
        elif body.action in ('review','defer','suppress','assign','qa','start_review','pause_review','complete_review'):
            if not o:fail('RESOURCE_NOT_FOUND','Open a finding to continue.',404)
            eligible=assessment.eligibility(s,mid,o['id'])
            if not eligible['reviewable']:fail('CASE_NOT_ACTIONABLE',eligible['reason'])
            if body.action=='review':
                if body.value not in ('resolved_supported','resolved_unsupported','awaiting_assessment'):fail('VALIDATION','Choose a review decision.')
                if not body.note.strip():fail('VALIDATION','Add a reason for the decision.')
                if body.value not in eligible['allowed_decisions']:fail('EVIDENCE_REQUIRED',eligible['reason'])
                if body.document_id:
                    refs=assessment.source_refs(s,mid,o['id'])
                    if not any(r['document_id']==body.document_id and r['document_id'] in eligible['source_ids'] and r['page']==body.page and (not body.section or r['section']==body.section) for r in refs):fail('EVIDENCE_REQUIRED','Choose the exact prepared finding passage for this member.')
                save_review(conn,s,o,u,body.value,body.note)
            elif body.action=='qa':
                if o.get('reviewer')==u['id']:fail('ACTION_FORBIDDEN','QA requires a separate reviewer.',403)
                if o.get('qa_status')!='awaiting_qa' or not o.get('current_decision_id'):fail('VALIDATION','Submit a fresh current review to QA first.')
                if body.value not in ('passed','rework'):fail('VALIDATION','Choose pass or return for rework.')
                if not body.note.strip():fail('VALIDATION','Add a concise QA pass rationale or a reason for rework.')
                decision=next((r for r in o['decision_history'] if r['id']==o['current_decision_id']),None)
                if body.decision_id and body.decision_id!=o['current_decision_id']:fail('DECISION_CHANGED','Review the current decision version before recording QA.',409)
                if not decision or decision.get('basis_key')!=assessment.basis_key(s,mid,o['id']):fail('EVIDENCE_CHANGED','Evidence has changed. Submit a fresh decision before QA.',409)
                record={'id':'QA-'+secrets.token_hex(5),'decision_id':o['current_decision_id'],'finding_id':o['id'],'evidence_episode_id':o['evidence_episode_id'],'actor':account_email(u['email']),'actor_id':u['id'],'at':now(),'status':body.value,'note':body.note,'source_basis_key':decision['basis_key']}
                o.setdefault('qa_history',[]).append(record);o['qa_status']=body.value;o['qa_reviewer']=account_email(u['email']);o['qa_note']=body.note
                if body.value=='rework':o['status']='in_review';o['review_state']='rework'
                else:
                    decision['qa_id']=record['id'];decision['qa_snapshot']=deepcopy(record)
                    decision['risk_context']=risk_workflow.transition(conn,s,u,'qa_pass',decision)
                    record['risk_context']=deepcopy(decision['risk_context'])
            elif body.action=='assign':
                assignee,_=allocation(conn,s,u,[mid],body.value);o['owner']=assignee['name'];o['owner_id']=assignee['id']
            elif body.action in ('defer','suppress'):
                if not body.note.strip():fail('VALIDATION','Add a reason for this disposition.')
                o['status']='deferred' if body.action=='defer' else 'suppressed';o['disposition_note']=body.note
            elif body.action=='start_review':o['status']='in_review';o['review_state']='active';o['review_started_at']=now()
            elif body.action=='pause_review':
                if body.value and body.value not in eligible['allowed_decisions']:fail('EVIDENCE_REQUIRED',eligible['reason'])
                o.update(review_state='paused',draft_note=body.note,draft_decision=body.value)
            elif body.action=='complete_review':
                if body.value!='no_finding' or not body.note.strip():fail('VALIDATION','Add a reason to complete without a supported finding.')
                save_review(conn,s,o,u,'resolved_unsupported',body.note);o['review_state']='completed_no_finding'
            m.update(assessment.member_summary(s,mid));o['version']=o.get('version',1)+1
            message='Review saved; independent QA is the next step.' if body.action=='review' else 'Workflow updated.'
        elif body.action=='close_task':
            if not task:fail('TASK_REQUIRED','Choose the exact documentation or response task.')
            intervention=assessment.normalize_intervention(task.get('intervention') or {'query':'pre_visit','request_evidence':'source_remediation'}.get(task['type'],''))
            if intervention not in ('pre_visit','source_remediation'):fail('TASK_NOT_ACTIONABLE','Coding, QA and submission tasks require their own outcome gates.')
            if body.value not in ('not_supported','unable_to_obtain','not_current') or not body.note.strip():fail('VALIDATION','Choose a no-positive outcome and record its reason.')
            if assessment.task_completion(s,task)['complete']:fail('TASK_COMPLETE','This task already has a retained outcome.',409)
            task.update(closure_disposition=body.value,closure_reason=body.note.strip(),closed_at=now(),closed_by=account_email(u['email']),status='closed')
            message='Task closed with its reason. Source usability, coding and independent QA are unchanged.'
        elif body.action in ('query','request_evidence','respond','later_encounter','open_evidence'):
            if not mid: fail('VALIDATION','Choose a member.')
            if body.action in ('query','request_evidence','respond') and mid not in assessment.CASE_IDS:fail('CASE_NOT_ACTIONABLE','Choose a complete case for the prepared follow-up workflow.')
            if body.action in ('query','request_evidence'):
                title=body.note.strip() or (assessment.current_finding(s,mid,o['id'])['next_action']+' Please document your findings, including no support, uncertainty or need for further information. No diagnosis is presumed.' if body.action=='query' else 'Request current encounter documentation')
                receiver,_=allocation(conn,s,u,[mid],'','pre_visit' if body.action=='query' else 'source_remediation')
                for did in body.required_source_ids:
                    doc=assessment.document(s,did)
                    if not doc or doc['member_id']!=mid or doc.get('evidence_relation')=='mismatch':fail('SOURCE_MISMATCH','A requested source must belong to this member.')
                duplicate=next((t for t in s['tasks'] if t.get('finding_id')==o['id'] and t['type']==body.action and t['status']=='open' and (not body.evidence_episode_id or t.get('evidence_episode_id')==body.evidence_episode_id)),None)
                if not duplicate:
                    fields={'finding_id':o['id']}
                    if body.evidence_episode_id:fields['evidence_episode_id']=body.evidence_episode_id
                    if body.required_source_ids:fields['required_source_ids']=body.required_source_ids
                    created_task=new_task(s,mid,body.action,title,receiver,**fields)
                    if task and body.action=='query' and task.get('intervention')=='pre_visit':task['response_task_id']=created_task['id'];created_task['response_episode_id']=task['response_episode_id']
                else:created_task=duplicate
                if o:o['status']='awaiting_assessment' if body.action=='query' else 'awaiting_evidence'
                message='Task created.'
            if body.action=='respond':
                if body.value not in ('supported','not_supported','needs_information','deferred'):fail('VALIDATION','Choose a response.')
                candidates=[t for t in s['tasks'] if t['member_id']==mid and t['status']=='open' and (t['type']=='query' or t.get('intervention')=='pre_visit') and not t.get('response_task_id') and (not o or t.get('finding_id')==o['id'])]
                if task:
                    if task not in candidates:fail('TASK_NOT_ACTIONABLE','Choose an open provider-response task for this episode.')
                    response_task=task
                elif len(candidates)>1:fail('TASK_REQUIRED','Select the provider-response task before recording a response.',409)
                else:response_task=candidates[0] if candidates else None
                response={'id':'RESP-'+secrets.token_hex(5),'member_id':mid,'finding_id':response_task.get('finding_id') if response_task else o['id'] if o else None,
                          'task_id':response_task['id'] if response_task else None,'response_episode_id':response_task['response_episode_id'] if response_task else 'UNLINKED-'+secrets.token_hex(5),
                          'disposition':body.value,'note':body.note,'actor_id':u['id'],'at':now()}
                s['provider_responses'].append(response)
                m['provider_response']=body.value
                if response_task:response_task.update(status='responded',response=body.value,response_id=response['id'])
                message='Response saved. Coding awaits documentation and review.'
            if body.action=='later_encounter':
                transitions=assessment.TRANSITIONS.get(mid,[])
                transition=next((t for t in transitions if t['id']==body.value or t['document_id']==body.value),None) if body.value else next(iter(transitions),None)
                if not transition:fail('PREPARED_SOURCE_UNAVAILABLE','No authored later encounter is configured for this case. A response or indirect signal cannot manufacture a diagnosis.')
                prepared=assessment.document(s,transition['document_id'])
                if prepared.get('available',True) and prepared['source_status']!='not_loaded':message='This prepared source is already received. Validate and publish it in Document Intake.'
                else:
                    prepared.update(available=True,source_status='quarantined' if prepared.get('evidence_relation')=='mismatch' else 'received',later_example=True,received_at=now())
                    m['scenario_date']=max(m.get('scenario_date',assessment.PROGRAM['scenario_date']),transition['date'])
                    m['later_encounter_received']=True
                    message='Prepared source received. Intake validation and publication are required before a fresh coding review.'
            if o:m.update(assessment.member_summary(s,mid))
            if body.action=='open_evidence':message='Evidence inspection recorded.'
        elif body.action in ('receive','intake','contact'):
            row=next((c for c in s['chases'] if c['id']==body.id or c['member_id']==body.id),None)
            if not row:fail('RESOURCE_NOT_FOUND','No matching chart request.',404)
            member(s,u,row['member_id']);resource=row['member_id']
            if body.action=='contact':
                if not body.note.strip():fail('VALIDATION','Add a contact note.')
                row.setdefault('contact_history',[]).append({'at':now(),'actor':u['email'],'channel':body.value or 'Local note','note':body.note})
                message='Local contact note saved. No message was sent.'
            else:
                if body.value not in ('requested','in_progress','partially_received','received','usable','unavailable','quarantined'):fail('VALIDATION','Choose a valid document state.')
                if body.value=='usable':fail('VALIDATION','Validate and publish eligible documentation in Document Intake before marking it usable.')
                row['status']=body.value;row.setdefault('contact_history',[]).append({'at':now(),'actor':u['email'],'channel':'Status update','note':body.note or body.value.replace('_',' ')})
                message='Chart request updated. Receipt remains separate from document usability.'
        elif body.action in ('prepare','receiver','correction'):
            row=next((r for r in s['submissions'] if r['id']==body.id),None)
            if body.action=='prepare' and mid:
                row,created=prepare_record(s,mid,u,o['id']);resource=mid
                if created:row['risk_context']=risk_workflow.transition(conn,s,u,'submitted',row)
                message='Approved record prepared for the simulated receiver.' if created else 'This approved decision already has a retained submission record.'
            else:
                if not row:fail('RESOURCE_NOT_FOUND','Submission record not found.',404)
                member(s,u,row['member_id']);resource=row['member_id']
                if body.action=='prepare' and body.value=='reconcile':
                    if not row.get('decision_id') or row['status']!='accepted':fail('VALIDATION','Compare an accepted linked record to the prepared report first.')
                    row['report_comparison']={'id':'REPORT-'+row['id'],'report_fixture_id':'SYN-REPORTED-2026-09','name':'September prepared reported-record comparison',
                       'basis':'Synthetic prepared report comparison; no external report was received.','at':now(),'submission_id':row['id'],'member_id':row['member_id'],'decision_id':row['decision_id'],'qa_id':row['qa_id'],
                       'source_refs':deepcopy(row['source_refs']),'expected':{'code':row['code'],'operation':row['operation'],'record_presence':'present' if row['operation']=='add' else 'absent'},
                       'reported':{'code':row['code'],'record_presence':'present' if row['operation']=='add' else 'absent'},'status':'matched',
                       'explanation':'The prepared report contains the added record.' if row['operation']=='add' else 'The prepared report omits the deleted record; the original and rejected attempts remain retained.',
                       'diagnosis_eligibility':'not_evaluated','payment_reconciliation':'unreconciled'}
                    row['reported_status']='matched_prepared_report';message='Prepared report compared. Eligibility and payment remain separate and unevaluated.'
                elif body.action=='prepare':
                    if row['status'] in ('accepted','rejected'):fail('VALIDATION','Preserve the terminal record; prepare a linked remediation attempt.')
                    row['status']='prepared';message='Prepared sample record retained; no external transmission occurs.'
                elif body.action=='receiver':
                    if body.value not in ('acknowledged','accepted','rejected'):fail('VALIDATION','Choose a receiver response.')
                    if row['status'] in ('accepted','rejected'):fail('VALIDATION','A terminal response is retained. Prepare a linked remediation record to retry.')
                    if row.get('decision_id'):
                        _,review,qa=approved_decision(s,row['member_id'],row.get('finding_id'))
                        if review['id']!=row['decision_id'] or qa['id']!=row['qa_id']:fail('APPROVAL_REQUIRED','This attempt belongs to a superseded decision. Prepare the current approved result.')
                    row['status']=body.value
                    row['reason']={'acknowledged':'Simulated transport receipt recorded. Terminal record processing is still pending.','accepted':'Simulated receiver accepted this record. Diagnosis eligibility, reported reconciliation and payment remain separate.','rejected':'Simulated receiver rejected this attempt. Preserve its history and prepare a linked retry.'}[body.value]
                    row.setdefault('history',[]).append({'id':'ACK-'+secrets.token_hex(4),'stage':'transport' if body.value=='acknowledged' else 'record_processing','status':body.value,'at':now(),'terminal':body.value!='acknowledged','basis':'Simulated receiver','reason':body.note or row['reason']})
                    if body.value=='acknowledged':row['transport_status']='acknowledged'
                    else:row['receiver_status']=body.value
                    if body.value=='accepted' and row.get('original_id') and row.get('operation')=='delete':
                        original=next((r for r in s['submissions'] if r['id']==row['original_id']),None)
                        if original:original['corrected']=True
                    row['risk_context']=risk_workflow.transition(conn,s,u,'receiver',row)
                    message='Simulated receiver response recorded.'
                else:
                    if row['status']!='rejected':fail('VALIDATION','A linked retry requires a rejected attempt. Prepare approved additions or deletions from the reviewed case.')
                    if row['member_id'] in assessment.CASE_IDS:
                        current,review,qa=approved_decision(s,row['member_id'],row.get('finding_id'))
                        if row.get('decision_id')!=review['id'] or row.get('qa_id')!=qa['id']:
                            prepared,created=prepare_record(s,row['member_id'],u,row.get('finding_id'))
                            row=prepared
                            if created:row['risk_context']=risk_workflow.transition(conn,s,u,'submitted',row)
                            message='Prepared the current approved result; the earlier attempt remains retained.'
                        else:
                            pending=next((r for r in s['submissions'] if r.get('retry_of')==row['id']),None)
                            if not pending:
                                pending=deepcopy(row);pending.update(id='SUB-'+secrets.token_hex(5),status='correction_pending',retry_of=row['id'],history=[],created_at=now(),corrected=False,transport_status='not_acknowledged',receiver_status='not_processed',reported_status='not_compared',reconciliation_status='unreconciled',reason='Linked retry preserves the approved decision and intended operation. The rejected attempt remains retained.')
                                pending.pop('report_comparison',None);s['submissions'].append(pending)
                                pending['risk_context']=risk_workflow.transition(conn,s,u,'submitted',pending)
                            row=pending;message='Linked retry prepared with the original operation preserved.'
                    else:fail('CASE_NOT_ACTIONABLE','This population sample has no linked approved decision. Open Jordan or Taylor for the connected preparation workflow.')
        elif body.action=='retry':
            issues=source_issues(s,u)
            run={'id':'CHECK-'+secrets.token_hex(3),'mode':'source_validation','status':'needs_attention' if issues else 'succeeded','members':len({i['member_id'] for i in issues}),'created_at':now(),'stages':['Checked sample member matching','Checked signature metadata',f'{len(issues)} source issues remain']}
            s['runs'].insert(0,run)
            message=f'Sources rechecked. {len(issues)} issue(s) still need attention; no duplicate rows created.'
        else:fail('INVALID_ACTION','Use the dedicated endpoint for this action.')
        save_state(conn,s);event(conn,u,body.action,resource,body.note or message)
        result={'ok':True,'message':message}
        if body.action in ('prepare','receiver','correction'):result['submission_id']=row['id']
        if body.action=='analyze':result['results']=results
        if body.action in ('query','request_evidence'):result['task_id']=created_task['id']
        if body.action=='respond':result['response_id']=response['id'];result['task_id']=response['task_id']
        return result

class Export(BaseModel):
    kind:str='members'
    ids:list[str]=Field(default_factory=list,max_length=10000)
    q:str=''
    provider:str=''

@app.post('/api/v1/downloads')
def downloads(body:Export,u=Depends(user)):
    permit(u,'export')
    with db() as conn:
        s=get_state(conn)
        kind=body.kind
        required={'members':'members','opportunities':'suspects','campaigns':'campaigns','chases':'chase','submissions':'submissions','audit':'audit','comparison':'analytics'}
        if kind not in required or required[kind] not in ROLES[u['role']]['screens']:fail('ACTION_FORBIDDEN','This export is unavailable to your role.',403)
        if kind=='comparison':return Response(json.dumps(s['comparison'],indent=2),media_type='application/json',headers={'Content-Disposition':'attachment; filename="perform-plus-synthetic-comparison.json"'})
        if kind=='audit':
            ids=list(dict.fromkeys(body.ids or [m['id'] for m in allowed_members(s,u) if m['id'] in assessment.CASE_IDS]))
            for id in ids:member(s,u,id)
            docs=[d for d in s['documents'] if d['member_id'] in ids and d.get('available',True) and d['source_status']!='not_loaded']
            traces=[assessment.audit_trace(s,id) for id in ids]
            from . import risk_exports
            try:risk_manifest,risk_files=risk_exports.selected_case_artifacts(conn,s,ids)
            except ValueError:fail('RISK_EVIDENCE_SCOPE','A stored calculation reference could not be verified within the selected member scope.',409)
            manifest={'synthetic':True,'basis':'Prepared synthetic case trace; not formal audit readiness.','program_context':s['program_context'],'members':ids,'documents':[d['id'] for d in docs],'created_at':now(),
              'decisions':[o for o in s['opportunities'] if o['member_id'] in ids],'case_traces':traces,'history':[dict(r) for r in conn.execute('SELECT * FROM events ORDER BY id') if r['resource'] in ids],
              'risk_evidence':{'manifest_path':'risk/manifest.json','run_count':sum(row['run_count'] for row in risk_manifest['members']),
                'input_snapshot_count':sum(row['snapshot_count'] for row in risk_manifest['members']),'scope':'Selected members only; original saved calculation evidence.'}}
            lines=['Perform+ selected-case evidence package','',manifest['basis'],f"Program: {s['program_context']['program']}; service {s['program_context']['service_year']}; payment {s['program_context']['payment_year']}.",'Source quotations are retained exactly in evidence/*.json. Actual action times differ from each staged scenario date.','']
            lines.extend(['Calculation evidence: risk/manifest.json indexes retained runs, actual input snapshots, original configurations, component ledgers, current stage pointers, saved scenario references and AI evidence.',
                'No calculation is performed by export. Earlier runs remain distinct from current stages. Missing artifacts and any scoped shared-metadata projections are identified explicitly.',''])
            for trace in traces:
                lines.extend([trace['member_id']+': '+trace['readiness'],'Unavailable stages: '+(', '.join(trace['missing_links']) or 'None'),
                  f"Retained recommendations: {len(trace['recommendations'])}; reviews: {len(trace['decisions'])}; QA: {len(trace['qa'])}; submissions and attempts: {len(trace['submissions'])}."])
                for row in trace['submissions']:lines.append(f"  {row['id']} | {row.get('operation','unavailable')} | {row['status']} | decision {row.get('decision_id','unavailable')} | eligibility {row.get('eligibility_status','unknown')} | payment {row.get('reconciliation_status','unreconciled')}")
            buffer=io.BytesIO()
            with zipfile.ZipFile(buffer,'w',zipfile.ZIP_DEFLATED) as archive:
                archive.writestr('manifest.json',json.dumps(manifest,indent=2));archive.writestr('README.txt','\n'.join(lines))
                for trace in traces:archive.writestr('cases/'+trace['member_id']+'.json',json.dumps(trace,indent=2))
                for doc in docs:archive.writestr(f'evidence/{doc["id"]}.json',json.dumps(doc,indent=2))
                archive.writestr('risk/manifest.json',json.dumps(risk_manifest,ensure_ascii=False,indent=2))
                for path,payload in risk_files.items():archive.writestr(path,payload)
            return Response(buffer.getvalue(),media_type='application/zip',headers={'Content-Disposition':'attachment; filename="perform-plus-synthetic-audit.zip"'})
        rows=allowed_members(s,u) if kind=='members' else (s['campaigns'] if kind=='campaigns' else rows_for(s,u,kind))
        if body.ids:rows=[r for r in rows if r['id'] in body.ids or r.get('member_id') in body.ids]
        if body.provider:rows=[r for r in rows if r.get('provider_id')==body.provider]
        if body.q:rows=[r for r in rows if body.q.lower() in json.dumps(r).lower()]
        fields=list(rows[0]) if rows else ['id']
        out=io.StringIO();writer=csv.DictWriter(out,fieldnames=fields+['data_basis'],extrasaction='ignore');writer.writeheader()
        for row in rows:
            values={k:("'"+str(v) if str(v).startswith(('=','+','-','@')) else v) for k,v in row.items()}
            writer.writerow(values|{'data_basis':'Synthetic product demonstration'})
        return Response(out.getvalue(),media_type='text/csv',headers={'Content-Disposition':f'attachment; filename="perform-plus-{kind}.csv"'})

@app.get('/api/v1/admin/users')
def users(u=Depends(user)):
    permit(u,'users')
    with db() as conn:return {'users':[dict(r)|{'email':account_email(r['email']),'name':r['name'].removesuffix(' demo') if r['name'] in [n+' demo' for n in ROLE_NAMES.values()] else r['name']} for r in conn.execute('SELECT id,email,name,role,active,provider_id FROM users')],'roles':list(ROLES)}

class UserUpdate(BaseModel):
    model_config=ConfigDict(extra='forbid')
    role:str
    active:bool
    provider_id:str|None=None

@app.patch('/api/v1/admin/users/{id}')
def update_user(id:str,body:UserUpdate,u=Depends(user)):
    permit(u,'users')
    if body.role not in ROLES:fail('VALIDATION','Unknown role.')
    if id==u['id'] and (body.role!=u['role'] or not body.active):fail('VALIDATION','Keep your current account role and active access enabled.')
    with db() as conn:
        current=conn.execute('SELECT * FROM users WHERE id=?',(id,)).fetchone()
        if not current:fail('RESOURCE_NOT_FOUND','User not found.',404)
        provider_id=(body.provider_id if body.provider_id is not None else current['provider_id']) if body.role=='provider' else ''
        if body.role=='provider' and provider_id not in {p['id'] for p in get_state(conn)['providers']}:fail('VALIDATION','Choose a valid provider practice when assigning the provider role.')
        conn.execute('UPDATE users SET role=?,active=?,provider_id=? WHERE id=?',(body.role,int(body.active),provider_id,id))
        conn.execute('DELETE FROM sessions WHERE user_id=?',(id,));event(conn,u,'user_updated',id,f'Role: {body.role}; active: {body.active}')
    return {'ok':True}

class Reset(BaseModel):
    confirmation:str

@app.post('/api/v1/admin/reset')
def reset(body:Reset,u=Depends(user)):
    permit(u,'reset')
    if body.confirmation not in ('RESET WORKSPACE','RESET DEMO'):fail('VALIDATION','Type RESET WORKSPACE to confirm.')
    with db() as conn:
        prior=get_state(conn,lock=True)
        if conn.execute("SELECT id FROM risk_batches WHERE status IN ('queued','running') LIMIT 1").fetchone():
            fail('VALIDATION','Finish or resolve active scoring batches before restoring the workspace.',409)
        from . import risk_store
        retained=risk_store.record(conn,'workspace_reset',{'actor_id':u['id'],'workflow_snapshot':prior,
            'policy':'Restore synthetic workflow stage pointers; preserve immutable calculations, inputs, external imports and local accounts.'})
        conn.execute("""DELETE FROM risk_stages s USING risk_runs r WHERE s.run_id=r.id
          AND s.score_basis <> 'captured_baseline' AND r.body->>'origin'='calculated'
          AND r.body->>'synthetic'='true'""")
        conn.execute("""UPDATE risk_stages s SET stale=TRUE,reason='Clinical workspace restored; external feed refresh is required.'
          FROM risk_runs r WHERE s.run_id=r.id AND r.body->>'origin'='external_import'""")
        s=json.loads(SEED.read_text());s.update({'runs':[],'tasks':[],'tour_started':now()})
        save_state(conn,s);conn.execute('DELETE FROM events');event(conn,u,'reset','demo','Workspace restored; accounts and scoring evidence preserved. '+retained['id'])
    return {'ok':True,'message':'Workspace restored. Accounts, baseline scores and calculation history are preserved.'}


def source_issues(s,u):
    ids={m['id'] for m in allowed_members(s,u)}
    return [{'id':d['id'],'member_id':d['member_id'],'title':d['title'],'status':d['source_status'],'reason':d.get('source_policy',{}).get('reason','The source member differs from the requested member.'),'date':d['date']} for d in s['documents'] if d['member_id'] in ids and d['source_status'] in ('remediation_required','quarantined') and not d.get('superseded_by')]

class IntakeRequest(BaseModel):
    model_config=ConfigDict(extra='forbid')
    document_id:str=Field(max_length=100)
    member_id:str=Field(max_length=100)

def validate_source(s,u,body):
    doc=next((d for d in s['documents'] if d['id']==body.document_id),None)
    if not doc:fail('RESOURCE_NOT_FOUND','Document not found.',404)
    member(s,u,doc['member_id']);member(s,u,body.member_id)
    matched=doc['member_id']==body.member_id and doc.get('evidence_relation')!='mismatch'
    signed=doc.get('signature_status')=='signed'
    current=doc.get('available',True) and doc.get('kind') in ('current_encounter','intake_sample','prepared_encounter','later_encounter_example') and doc.get('source_status') not in ('not_loaded','quarantined')
    checks=[{'label':'Member matches requested chart','passed':matched,'detail':f"Source {doc.get('source_member_id',doc['member_id'])} / requested {body.member_id}"},{'label':'Clinician signature present','passed':signed,'detail':doc.get('signature_status','No signature metadata')},{'label':'Current-period eligible encounter','passed':current,'detail':doc['source_status'].replace('_',' ')}]
    return {'valid':all(c['passed'] for c in checks),'checks':checks,'document':doc,'requested_member_id':body.member_id}

@app.get('/api/v1/intake/samples')
def intake_samples(u=Depends(user)):
    permit(u,'intake')
    with db() as conn:
        s=get_state(conn);ids={m['id'] for m in allowed_members(s,u)}
        return [display.document(d) for d in s['documents'] if d['member_id'] in ids and (d['id'] in ('DOC-0010','DOC-0011','DOC-0009') or (d.get('requires_publication') and d.get('available',True) and d['source_status']!='not_loaded'))]

@app.post('/api/v1/intake/validate')
def intake_validate(body:IntakeRequest,u=Depends(user)):
    permit(u,'intake')
    with db() as conn:
        result=validate_source(get_state(conn),u,body)
        return result|{'document':display.document(result['document'])}

@app.post('/api/v1/intake/publish')
def intake_publish(body:IntakeRequest,u=Depends(user)):
    permit(u,'intake')
    with db() as conn:
        s=get_state(conn,True);result=validate_source(s,u,body)
        if not result['valid']:fail('SOURCE_INELIGIBLE','Resolve the failed source checks before publishing.')
        doc=result['document'];already=bool(doc.get('published_at'))
        doc['source_status']='usable'
        row=next((c for c in s['chases'] if c['member_id']==body.member_id),None)
        if row:row['status']='usable';row['document_ids']=list(dict.fromkeys(row.get('document_ids',[])+[doc['id']]))
        analysis=None
        if not already:
            doc['published_at']=now();doc['published_by']=account_email(u['email'])
            if doc.get('requires_publication'):
                results=[]
                for finding in assessment.opportunities(s,body.member_id):
                    relevant=doc['id'] in finding.get('document_ids',[]) or doc['id'] in finding.get('required_source_ids',[]) or doc['id'] in finding.get('clinical_context',{}).get('source_ids',[]) or (finding.get('case_rule_id')==body.member_id and any(t['document_id']==doc['id'] for t in assessment.TRANSITIONS.get(body.member_id,[])))
                    if relevant:
                        finding['document_ids']=list(dict.fromkeys(finding.get('document_ids',[])+[doc['id']]))
                        results.append(assessment.analyze(s,body.member_id,finding['id']))
                analysis=results[0] if len(results)==1 else {'results':results,'result':'changed' if any(r['result']=='changed' for r in results) else 'no_change'}
                if doc['id']=='DOC-RILEY-SIGNED':assessment.document(s,'DOC-0009')['superseded_by']=doc['id']
            doc['risk_context']=risk_workflow.transition(conn,s,u,'source_published',doc)
            event(conn,u,'intake_published',body.member_id,f"Published {doc['id']} after member and signature checks.")
        save_state(conn,s)
        return {'ok':True,'message':'This document was already published; no duplicate transition was created.' if already else 'Document published. The same case is ready for a fresh review.','document_id':doc['id'],'analysis':analysis,'member_id':body.member_id}


class AssistantRequest(BaseModel):
    model_config=ConfigDict(extra='forbid')
    question:str=Field(max_length=500)
    member_id:str=Field(default='',max_length=100)

@app.post('/api/v1/assistant')
def assistant_answer(body:AssistantRequest,u=Depends(user)):
    with db() as conn:
        s=get_state(conn);question=body.question.lower();ids={m['id'] for m in allowed_members(s,u)}
        if any(word in question for word in ('cohort','priority','campaign')):
            if 'suspects' not in ROLES[u['role']]['screens']:fail('ACTION_FORBIDDEN','Cohort suggestions require population review access.',403)
            integrity='integrity' in question or 'correction' in question
            rows=[o for o in s['opportunities'] if o['member_id'] in ids and o['member_id'] in assessment.CASE_IDS and o['priority']=='High' and o['evidence']=='Strong' and o['status'] not in ('resolved_supported','resolved_unsupported','suppressed') and (o['type']=='integrity_review')==integrity]
            rows.sort(key=lambda o:(o.get('due_date','9999'),o.get('status')!='in_review',o['member_id']))
            chosen=rows[:6];rankings=[]
            for index,o in enumerate(chosen):
                covered=[c['name'] for c in s['campaigns'] if c['status']=='active' and o['member_id'] in c['member_ids']]
                rankings.append({'member_id':o['member_id'],'rank':index+1,'reasons':['High priority','Strong evidence',f"Due {o.get('due_date','not set')}",f"Current disposition: {o['status'].replace('_',' ')}",'Existing coverage: '+(', '.join(covered) or 'none'),assessment.eligibility(s,o['member_id'])['reason']]})
            return {'answer':f"The stable proposal contains {len(chosen)} complete {'integrity' if integrity else 'evidence-review'} cases, ranked by due date, review disposition and member identifier. Review the exact cohort and eligible owner before activation. Integrity correction work is proposed separately.",'basis':'Current protected prepared-case data','basis_key':hashlib.sha256(json.dumps(rankings,sort_keys=True).encode()).hexdigest()[:20],
              'sources':[{'label':o['member_id']+' · '+o['condition'],'href':'/members/'+o['member_id']} for o in chosen],
              'proposal':{'member_ids':[o['member_id'] for o in chosen],'name':'Priority integrity review' if integrity else 'Priority evidence review','filter':'/suspects?status=active&priority=High&evidence=Strong'+('&kind=integrity_review' if integrity else ''),'rankings':rankings,'intervention':'integrity_review' if integrity else 'coding_review'}}
        if any(word in question for word in ('precision','recall','time','metric','impact')):
            if 'analytics' not in ROLES[u['role']]['screens']:fail('ACTION_FORBIDDEN','Comparison explanations require analytics access.',403)
            metrics=s['comparison']['metrics']
            return {'answer':f"The reference comparison has AI precision {metrics['ai_precision']:.0%} (108/135) and recall {metrics['ai_recall']:.0%} (108/120). Mean active review time is 22 versus 36 minutes per chart. Operational actions do not change these reference results.",'basis':s['comparison']['id'],'sources':[{'label':'AI Impact · methodology and underlying records','href':'/analytics'}]}
        if body.member_id and any(word in question for word in ('summary','summarize','member','evidence')):
            m=member(s,u,body.member_id)
            claims=assessment.claims(s,m['id'])
            return {'answer':assessment.current_finding(s,m['id'])['summary'],'basis':'Prepared source-linked explanation','basis_key':assessment.basis_key(s,m['id']),'claims':claims,'sources':[{'label':c['document_id']+' · page '+str(c['page'])+' · '+c['section'],'href':c['href']} for c in claims]}
        return {'answer':'Ask about priority cohorts, a member summary or reference review metrics. It cannot answer arbitrary clinical questions or generate new diagnoses. Choose a supported prompt below.','basis':'Prepared analysis','sources':[]}


from . import risk_api
risk_api.register(app, db=db, user=user, get_state=get_state, save_state=save_state, member=member,
                  allowed_members=allowed_members, permit=permit, event=event, roles=ROLES)
from . import risk_reconciliation
risk_reconciliation.register(app, db=db, user=user, get_state=get_state, save_state=save_state,
                             member=member, permit=permit, event=event)
from . import risk_financial
risk_financial.register(app, db=db, user=user, get_state=get_state,
                        allowed_members=allowed_members, member=member, permit=permit, event=event)
from . import risk_ai
risk_ai.register(app, db=db, user=user, get_state=get_state, member=member)

from . import analytics_api
analytics_api.register(app, db=db, user=user, get_state=get_state, allowed_members=allowed_members, permit=permit, roles=ROLES)
