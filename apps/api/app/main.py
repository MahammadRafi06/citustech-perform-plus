"""Local-only Perform+ demo: protected fixtures, PostgreSQL state, real local RBAC."""
from __future__ import annotations
from . import display
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
ROLE_NAMES = {'executive':'Executive','risk_analyst':'Risk analyst','retrieval_coordinator':'Retrieval coordinator','coder':'Coder','qa_reviewer':'QA reviewer','provider':'Provider','submission_analyst':'Submission analyst','administrator':'Administrator'}
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
    current={o['member_id']:o for o in state['opportunities']}
    for m in state['members']:
        if m['id'] in current:
            m.update({key:current[m['id']][key] for key in ('status','evidence','owner') if key in current[m['id']]})
    return state
def save_state(conn, state): conn.execute('UPDATE state SET body=? WHERE id=1',(json.dumps(state),))

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
        if not conn.execute('SELECT id FROM users LIMIT 1').fetchone():
            password = os.getenv('CT_DEMO_PASSWORD') or secrets.token_urlsafe(14)
            accounts=[]
            for role in ROLES:
                email=f'{EMAILS[role]}.demo@example.test'
                scope='PR-001' if role=='provider' else ''
                conn.execute('INSERT INTO users VALUES (?,?,?,?,?,1,?)',(role,email,ROLE_NAMES[role]+' demo',role,PASSWORD_HASHER.hash(password),scope))
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
                    conn.execute('INSERT INTO users VALUES (?,?,?,?,?,1,?)',(account_id,email,f'Practice {number} provider','provider',PASSWORD_HASHER.hash(password),f'PR-{number:03}'))
                    saved.append({'role':'provider','email':email,'password':password})
            credentials.write_text(json.dumps(saved,indent=2));os.chmod(credentials,0o600)
        if not conn.execute('SELECT id FROM state').fetchone():
            if not SEED.exists(): raise RuntimeError('Missing seed/demo.json. Run setup first.')
            initial=json.loads(SEED.read_text())
            initial['runs']=[]
            initial['tasks']=[]
            initial['tour_started']=now()
            conn.execute('INSERT INTO state VALUES (1,?)',(json.dumps(initial),))


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
        opps=[o|{'name':lookup[o['member_id']]['name'],'initials':lookup[o['member_id']]['initials'],'provider':lookup[o['member_id']]['provider']} for o in rows_for(s,u,'opportunities')]
        events=[dict(r) for r in conn.execute('SELECT * FROM events ORDER BY id DESC LIMIT 100').fetchall() if r['resource'] in ids or (u['role'] in ('executive','risk_analyst','administrator') and not str(r['resource']).startswith('MB-'))]
        counts=Counter(o['status'] for o in opps)
        screens=ROLES[u['role']]['screens']
        data={'members':ms[:30],'population_count':len(ms),'opportunities':opps,'counts':dict(counts),'events':events,'tour_started':s.get('tour_started'), 'runs':s.get('runs',[]) if 'data' in screens or 'suspects' in screens else [],'tasks':[t for t in s.get('tasks',[]) if t.get('member_id') in ids]}
        data['campaigns']=[c|{'member_ids':[i for i in c['member_ids'] if i in ids],'progress':round(100*sum(1 for o in s['opportunities'] if o['member_id'] in c['member_ids'] and o['status'].startswith('resolved_'))/max(len(c['member_ids']),1))} for c in s.get('campaigns',[]) if 'campaigns' in screens or 'overview' in screens]
        data['chases']=rows_for(s,u,'chases') if 'chase' in screens or 'overview' in screens else []
        data['submissions']=rows_for(s,u,'submissions') if 'submissions' in screens or 'audit' in screens or 'overview' in screens else []
        pids={m['provider_id'] for m in ms}
        data['providers']=[p for p in s.get('providers',[]) if p['id'] in pids]
        data['comparison']=s.get('comparison',{}) if 'analytics' in screens else None
        data['issues']=source_issues(s,u) if 'data' in screens or 'intake' in screens else []
        data['members']=[display.member(m) for m in data['members']]
        data['submissions']=[display.submission(r) for r in data['submissions']]
        data['issues']=[r|{'title':display.text(r['title']),'reason':display.text(r['reason'])} for r in data['issues']]
        return data

@app.get('/api/v1/members')
def members(q:str='',provider:str='',status:str='',page:int=1,size:int=25,u=Depends(user)):
    with db() as conn:
        ms=allowed_members(get_state(conn),u)
        if q: ms=[m for m in ms if q.lower() in json.dumps(m).lower()]
        if provider: ms=[m for m in ms if m['provider_id']==provider]
        if status: ms=[m for m in ms if m['status']==status]
        size=max(1,min(size,100)); page=max(page,1)
        return {'items':[display.member(m) for m in ms[(page-1)*size:page*size]],'total':len(ms),'page':page}

@app.get('/api/v1/members/{id}')
def member_detail(id:str,u=Depends(user)):
    with db() as conn:
        s=get_state(conn);m=member(s,u,id)
        return display.member(m)|{'documents':[display.document(d) for d in s.get('documents',[]) if d['member_id']==id and d.get('available',True) and d['source_status']!='not_loaded'], 'opportunities':[o for o in s['opportunities'] if o['member_id']==id], 'tasks':[t for t in s.get('tasks',[]) if t.get('member_id')==id], 'history':[dict(r) for r in conn.execute('SELECT * FROM events WHERE resource=? ORDER BY id DESC',(id,))]}

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
    member_ids:list[str]=Field(default_factory=list,max_length=500)
    value:str=Field(default='',max_length=300)
    note:str=Field(default='',max_length=2000)
    name:str=Field(default='',max_length=100)
    owner:str=Field(default='',max_length=100)
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
            if body.action=='assign' and not body.value.strip():fail('VALIDATION','Choose an allocation owner.')
            if body.action in ('defer','suppress') and not body.note.strip():fail('VALIDATION','Add a reason for the selected work.')
            for id in ids:
                record=member(s,u,id);finding=next(o for o in s['opportunities'] if o['member_id']==id)
                if body.action=='assign':finding['owner']=body.value
                elif body.action=='request_evidence':
                    if not any(t['member_id']==id and t['type']=='request_evidence' and t['status']=='open' for t in s['tasks']):
                        s['tasks'].append({'id':'TK-'+secrets.token_hex(3),'member_id':id,'title':body.note or 'Request current encounter documentation','type':'request_evidence','status':'open','owner':u['name']})
                    finding['status']='awaiting_evidence'
                else:finding['status']='deferred' if body.action=='defer' else 'suppressed';finding['disposition_note']=body.note
                finding['version']=finding.get('version',1)+1;record['status']=finding['status']
                event(conn,u,body.action,id,body.note or f'Assigned to {body.value}' if body.action=='assign' else body.note or 'Current documentation requested.')
            save_state(conn,s)
            return {'ok':True,'message':f'{body.action.replace("_"," ").capitalize()} completed for {len(ids)} members.','affected':len(ids)}
        mid=body.id if body.id.startswith('MB-') else ''
        o=next((o for o in s['opportunities'] if o['id']==body.id or o['member_id']==body.id),None)
        if o: mid=o['member_id']
        if mid: m=member(s,u,mid);resource=mid
        if body.action=='campaign':
            ids=list(dict.fromkeys(body.member_ids))
            if not ids or not body.name.strip(): fail('VALIDATION','Choose members and name the campaign.')
            for id in ids: member(s,u,id)
            prior=next((c for c in s['campaigns'] if c['name'].strip()==body.name.strip() and set(c['member_ids'])==set(ids)),None)
            if prior and (prior['owner']!=(body.owner or 'Coding team') or prior['due_date']!=(body.due_date or '2026-09-30') or prior['type']!=(body.value or 'Retrospective review')):
                fail('ALLOCATION_CONFLICT','This named cohort already exists with a different allocation. Use a new campaign name.',409)
            if not prior and body.expected_versions is not None:
                actual={o['id']:o.get('version',1) for o in s['opportunities'] if o['member_id'] in ids}
                covered=sorted(id for id in ids if any(c['status']=='active' and id in c['member_ids'] for c in s['campaigns']))
                if actual != body.expected_versions or covered != sorted(body.expected_covered or []):
                    fail('STALE_PREVIEW','The selected cohort or campaign coverage changed. Refresh the preview before activating.',409)
            if not prior:
                c={'id':'CP-'+secrets.token_hex(3),'name':body.name.strip(),'type':body.value or 'Retrospective review','owner':body.owner or 'Coding team','status':'active','member_ids':ids,'created_at':now(),'due_date':body.due_date or '2026-09-30','progress':0}
                s['campaigns'].append(c)
                for id in ids: s['tasks'].append({'id':'TK-'+secrets.token_hex(3),'member_id':id,'title':body.name,'type':'campaign','status':'open','owner':c['owner'],'campaign_id':c['id'],'due_date':c['due_date']})
            message=f'Campaign activated for {len(ids)} members.';resource=prior['id'] if prior else c['id']
        elif body.action=='activate_campaign':
            c=next((c for c in s['campaigns'] if c['id']==body.id),None)
            if not c:fail('RESOURCE_NOT_FOUND','Campaign not found.',404)
            for id in c['member_ids']:member(s,u,id)
            c['status']='active'
            for id in c['member_ids']:
                if not any(t.get('campaign_id')==c['id'] and t['member_id']==id for t in s['tasks']):
                    s['tasks'].append({'id':'TK-'+secrets.token_hex(3),'member_id':id,'title':c['name'],'type':'campaign','status':'open','owner':c['owner'],'campaign_id':c['id'],'due_date':c['due_date']})
            message=f'Campaign activated for {len(c["member_ids"])} members.'
        elif body.action=='analyze':
            targets=body.member_ids or ([mid] if mid else [])
            if not targets: fail('VALIDATION','Select at least one member.')
            for id in targets:
                member(s,u,id)
                for item in s['opportunities']:
                    if item['member_id']==id: item['version']=item.get('version',1)+1;item['last_analysis']='2026-09-12'
            run={'id':'RUN-'+secrets.token_hex(3),'mode':'fixture','status':'succeeded','members':len(targets),'created_at':now(),'stages':['Selected sources','Loaded precomputed findings','Linked evidence','Saved recommendation version']}
            s['runs'].insert(0,run);message=f'Precomputed analysis complete for {len(targets)} member(s).';resource=targets[0]
        elif body.action in ('review','defer','suppress','assign','qa','start_review','pause_review','complete_review'):
            if not o: fail('RESOURCE_NOT_FOUND','Open a finding to continue.',404)
            if body.action=='review':
                if body.value not in ('resolved_supported','resolved_unsupported','awaiting_assessment'): fail('VALIDATION','Choose a review decision.')
                if not body.note.strip(): fail('VALIDATION','Add a reason for the decision.')
                if body.value=='resolved_supported' and (mid in ('MB-000002','MB-000003','MB-000006') and not m.get('later_encounter')): fail('EVIDENCE_REQUIRED','Eligible current documentation is required before supported coding.')
                o['review_state']='completed';o['draft_note']='';o['status']=body.value;o['reviewer']=u['id'];o['decision_note']=body.note;o['qa_status']='awaiting_qa';o['review_completed_at']=now()
            elif body.action=='qa':
                if o.get('reviewer')==u['id']: fail('ACTION_FORBIDDEN','QA requires a separate reviewer.',403)
                if o.get('qa_status')!='awaiting_qa': fail('VALIDATION','This case must be reviewed and submitted to QA first.')
                if body.value not in ('passed','rework'): fail('VALIDATION','Choose pass or return for rework.')
                o['qa_status']=body.value
                if body.value=='rework':o['status']='in_review'
            elif body.action=='assign':o['owner']=body.value or u['name']
            elif body.action=='defer':o['status']='deferred'
            elif body.action=='suppress':o['status']='suppressed'
            elif body.action=='start_review':o['status']='in_review';o['review_state']='active';o['review_started_at']=now()
            elif body.action=='pause_review':o['review_state']='paused';o['draft_note']=body.note
            elif body.action=='complete_review':
                if body.value!='no_finding' or not body.note.strip():fail('VALIDATION','Add a reason to complete without a supported finding.')
                o.update({'review_state':'completed_no_finding','status':'resolved_unsupported','decision_note':body.note,'reviewer':u['id'],'qa_status':'awaiting_qa','review_completed_at':now()})
            m['status']=o['status'];o['version']=o.get('version',1)+1
            for task in s['tasks']:
                if task['member_id']==mid and task['type']=='campaign':task['status']='completed' if o['status'].startswith('resolved_') else 'open'
            if body.action=='qa':o['qa_reviewer']=u['email'];o['qa_note']=body.note
            message='Review saved.' if body.action=='review' else 'Workflow updated.'
        elif body.action in ('query','request_evidence','respond','later_encounter','open_evidence'):
            if not mid: fail('VALIDATION','Choose a member.')
            if body.action in ('query','request_evidence'):
                title=body.note.strip() or ('Please review the current documentation and clarify the assessment.' if body.action=='query' else 'Request current encounter documentation')
                duplicate=next((t for t in s['tasks'] if t['member_id']==mid and t['type']==body.action and t['status']=='open'),None)
                if not duplicate:s['tasks'].append({'id':'TK-'+secrets.token_hex(3),'member_id':mid,'title':title,'type':body.action,'status':'open','owner':u['name']})
                if o:o['status']='awaiting_assessment' if body.action=='query' else 'awaiting_evidence'
                message='Task created.'
            if body.action=='respond':
                if body.value not in ('supported','not_supported','needs_information','deferred'):fail('VALIDATION','Choose a response.')
                m['provider_response']=body.value
                for t in s['tasks']:
                    if t['member_id']==mid and t['type']=='query' and t['status']=='open':t['status']='responded';t['response']=body.value
                message='Response saved. Coding awaits documentation and review.'
            if body.action=='later_encounter':
                if not m.get('later_encounter'):
                    m['later_encounter']=True
                    prepared=next((d for d in s['documents'] if d['member_id']==mid and d['kind']=='later_encounter_example'),None)
                    if prepared:
                        prepared.update({'available':True,'source_status':'eligible','signature_status':'signed','kind':'current_encounter','later_example':True})
                    else:
                        prepared={'id':f'DOC-LATER-{mid}','member_id':mid,'title':'Later completed encounter · synthetic example','date':'2026-09-15','provider':m['provider'],'source_status':'eligible','signature_status':'signed','kind':'current_encounter','later_example':True,'synthetic':True,'pages':[{'number':1,'sections':[{'heading':'Current assessment','text':f'Synthetic later encounter. {m["name"]} was assessed at the visit. The clinician documents {m["condition"]} in the current assessment and records the follow-up plan.','highlight':True},{'heading':'Signature','text':'Electronically signed by the synthetic treating clinician at the completed encounter.'}]}]}
                        s['documents'].append(prepared)
                    if o:
                        o['status']='in_review';o['evidence']='Strong';o['qa_status']='not_submitted';o['version']=o.get('version',1)+1
                        o['document_ids']=list(dict.fromkeys(o.get('document_ids',[])+[prepared['id']]))
                    for doc in s['documents']:
                        if doc['member_id']==mid and doc['source_status']=='remediation_required':doc['superseded_by']=prepared['id']
                    message='Follow-up encounter added. A new review is required.'
                else:message='The later encounter is already available; the current review is unchanged.'
            if o:m['status']=o['status']
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
            if not row:fail('RESOURCE_NOT_FOUND','Submission record not found.',404)
            member(s,u,row['member_id']);resource=row['member_id']
            if body.action=='prepare':
                if row['status'] in ('accepted','rejected'):fail('VALIDATION','Preserve the terminal record; prepare a linked remediation attempt.')
                row['status']='prepared'
            elif body.action=='receiver':
                if body.value not in ('acknowledged','accepted','rejected'):fail('VALIDATION','Choose a receiver response.')
                if row['status'] in ('accepted','rejected'):fail('VALIDATION','A terminal response is retained. Prepare a linked remediation record to retry.')
                row['status']=body.value
                row['reason']={'acknowledged':'Transport receipt recorded. A terminal record response is still pending.','accepted':'Simulated receiver accepted this record. Payment reconciliation remains separate.','rejected':'Simulated receiver rejected this attempt. Preserve its history and prepare linked remediation.'}[body.value]
                row.setdefault('history',[]).append({'stage':'transport' if body.value=='acknowledged' else 'record_processing','status':body.value,'at':now(),'terminal':body.value!='acknowledged'})
                if body.value=='accepted' and row.get('original_id'):
                    original=next((r for r in s['submissions'] if r['id']==row['original_id']),None)
                    if original:original['corrected']=True
            else:
                original_id=row.get('original_id') or row['id']
                pending=next((r for r in s['submissions'] if r.get('original_id')==original_id and r['status'] in ('correction_pending','prepared','acknowledged')),None)
                if not pending:
                    s['submissions'].append({**row,'id':'SUB-'+secrets.token_hex(3),'type':'correction','operation':'delete','original_id':original_id,'status':'correction_pending','corrected':False,'history':[],'created_at':now(),'reason':'Linked remediation awaiting a simulated terminal response. Original record retained.'})
            message='Response recorded.'
        elif body.action=='retry':
            issues=source_issues(s,u)
            run={'id':'CHECK-'+secrets.token_hex(3),'mode':'source_validation','status':'needs_attention' if issues else 'succeeded','members':len({i['member_id'] for i in issues}),'created_at':now(),'stages':['Checked sample member matching','Checked signature metadata',f'{len(issues)} source issues remain']}
            s['runs'].insert(0,run)
            message=f'Sources rechecked. {len(issues)} issue(s) still need attention; no duplicate rows created.'
        else:fail('INVALID_ACTION','Use the dedicated endpoint for this action.')
        save_state(conn,s);event(conn,u,body.action,resource,body.note or message)
        return {'ok':True,'message':message}

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
            ids=body.ids or [m['id'] for m in allowed_members(s,u)[:6]]
            for id in ids:member(s,u,id)
            docs=[d for d in s['documents'] if d['member_id'] in ids and d.get('available',True) and d['source_status']!='not_loaded']
            buffer=io.BytesIO()
            with zipfile.ZipFile(buffer,'w',zipfile.ZIP_DEFLATED) as archive:
                archive.writestr('manifest.json',json.dumps({'synthetic':True,'members':ids,'documents':[d['id'] for d in docs],'created_at':now(),'decisions':[o for o in s['opportunities'] if o['member_id'] in ids],'history':[dict(r) for r in conn.execute('SELECT * FROM events ORDER BY id') if r['resource'] in ids]},indent=2))
                for doc in docs:archive.writestr(f'evidence/{doc["id"]}.json',json.dumps(doc,indent=2))
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

@app.patch('/api/v1/admin/users/{id}')
def update_user(id:str,body:UserUpdate,u=Depends(user)):
    permit(u,'users')
    if body.role not in ROLES:fail('VALIDATION','Unknown role.')
    if id==u['id'] and (body.role!='administrator' or not body.active):fail('VALIDATION','Keep your active administrator account enabled.')
    with db() as conn:
        if not conn.execute('SELECT id FROM users WHERE id=?',(id,)).fetchone():fail('RESOURCE_NOT_FOUND','User not found.',404)
        conn.execute('UPDATE users SET role=?,active=?,provider_id=? WHERE id=?',(body.role,int(body.active),'PR-001' if body.role=='provider' else '',id))
        conn.execute('DELETE FROM sessions WHERE user_id=?',(id,));event(conn,u,'user_updated',id,f'Role: {body.role}; active: {body.active}')
    return {'ok':True}

class Reset(BaseModel):
    confirmation:str

@app.post('/api/v1/admin/reset')
def reset(body:Reset,u=Depends(user)):
    permit(u,'reset')
    if body.confirmation not in ('RESET WORKSPACE','RESET DEMO'):fail('VALIDATION','Type RESET WORKSPACE to confirm.')
    with db() as conn:
        get_state(conn,lock=True)
        s=json.loads(SEED.read_text());s.update({'runs':[],'tasks':[],'tour_started':now()})
        save_state(conn,s);conn.execute('DELETE FROM events');event(conn,u,'reset','demo','Workspace restored; accounts preserved.')
    return {'ok':True,'message':'Workspace restored. Users and roles are unchanged.'}


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
    current=doc.get('kind') in ('current_encounter','intake_sample') and doc.get('source_status') not in ('not_loaded','quarantined')
    checks=[{'label':'Member matches requested chart','passed':matched,'detail':f"Source {doc['member_id']} / requested {body.member_id}"},{'label':'Clinician signature present','passed':signed,'detail':doc.get('signature_status','No signature metadata')},{'label':'Current-period eligible encounter','passed':current,'detail':doc['source_status'].replace('_',' ')}]
    return {'valid':all(c['passed'] for c in checks),'checks':checks,'document':doc,'requested_member_id':body.member_id}

@app.get('/api/v1/intake/samples')
def intake_samples(u=Depends(user)):
    permit(u,'intake')
    with db() as conn:
        s=get_state(conn);ids={m['id'] for m in allowed_members(s,u)}
        return [display.document(d) for d in s['documents'] if d['member_id'] in ids and (d['id'] in ('DOC-0010','DOC-0011','DOC-0009') or (d.get('later_example') and d.get('available',True)))]

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
        doc=result['document'];doc['source_status']='usable'
        row=next((c for c in s['chases'] if c['member_id']==body.member_id),None)
        if row:
            row['status']='usable';row['document_ids']=list(set(row.get('document_ids',[])+[doc['id']]))
        if not doc.get('published_at'):
            doc['published_at']=now();event(conn,u,'intake_published',body.member_id,f"Published {doc['id']} after member and signature checks.")
        save_state(conn,s)
        return {'ok':True,'message':'Document published. The chart request is ready for use.','document_id':doc['id']}

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
            rows=[o for o in s['opportunities'] if o['member_id'] in ids and o['priority']=='High' and o['evidence']=='Strong' and o['status'] not in ('resolved_supported','resolved_unsupported','suppressed')]
            chosen=rows[:20]
            return {'answer':f"There are {len(rows)} active high-priority opportunities with strong evidence in your scope. The proposal contains the first {len(chosen)} members for review; it does not approve coding or create tasks.",'basis':'Current protected operational data','sources':[{'label':o['member_id']+' · '+o['condition'],'href':'/members/'+o['member_id']} for o in chosen[:6]],'proposal':{'member_ids':[o['member_id'] for o in chosen],'name':'Priority evidence review','filter':'/suspects?status=active&priority=High&evidence=Strong'}}
        if any(word in question for word in ('precision','recall','time','metric','impact')):
            if 'analytics' not in ROLES[u['role']]['screens']:fail('ACTION_FORBIDDEN','Comparison explanations require analytics access.',403)
            metrics=s['comparison']['metrics']
            return {'answer':f"The reference comparison has AI precision {metrics['ai_precision']:.0%} (108/135) and recall {metrics['ai_recall']:.0%} (108/120). Mean active review time is 22 versus 36 minutes per chart. Operational actions do not change these reference results.",'basis':s['comparison']['id'],'sources':[{'label':'AI Impact · methodology and underlying records','href':'/analytics'}]}
        if body.member_id and any(word in question for word in ('summary','summarize','member','evidence')):
            m=member(s,u,body.member_id)
            return {'answer':display.text(m['summary']),'basis':'Prepared member summary','sources':[{'label':display.text(d['title'])+' · '+d['date'],'href':'/members/'+m['id']+'?tab=Evidence+%26+documents&document='+d['id']} for d in s['documents'] if d['member_id']==m['id'] and d.get('available',True) and d['source_status']!='not_loaded']}
        return {'answer':'Ask about priority cohorts, a member summary or reference review metrics. It cannot answer arbitrary clinical questions or generate new diagnoses. Choose a supported prompt below.','basis':'Prepared analysis','sources':[]}
