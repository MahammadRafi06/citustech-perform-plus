"""Prepared, source-bound case workflows. No clinical inference or external delivery."""
from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import json
from urllib.parse import urlencode
from .people import ACCOUNT_NAMES

CASE_IDS = [f'MB-{n:06}' for n in range(1, 7)]
PROGRAM = {'program':'Medicare Advantage Part C', 'service_year':2026, 'payment_year':2027,
           'model':'CMS-HCC V28 context; numeric model not installed', 'scenario_date':'2026-09-12',
           'basis':'Prepared synthetic records', 'analysis_basis':'Prepared analysis',
           'receiver_basis':'Simulated receiver', 'unconfigured_programs':['Part D','ACA','Florida']}
INTERVENTIONS = {'Retrospective review':'coding_review', 'Coding review':'coding_review',
 'Integrity review':'integrity_review','Pre-visit assessment':'pre_visit','Pre-visit':'pre_visit',
 'Chart retrieval':'source_remediation','Source remediation':'source_remediation',
 'Independent QA':'independent_qa','Provider query':'pre_visit'}
TRANSITIONS = {
 'MB-000001':[{'id':'jordan-clarification','label':'Receive later clarification','document_id':'DOC-JORDAN-CLARIFICATION','date':'2026-09-20'}],
 'MB-000002':[{'id':'morgan-assessment','label':'Receive September 18 encounter','document_id':'DOC-0005','date':'2026-09-18'}],
 'MB-000006':[{'id':'riley-replacement','label':'Receive signed replacement','document_id':'DOC-RILEY-SIGNED','date':'2026-08-30'},
              {'id':'riley-mismatch','label':'Inspect mismatched replacement','document_id':'DOC-RILEY-MISMATCH','date':'2026-08-30'}],
}

def timestamp(): return datetime.now(timezone.utc).isoformat()
def opportunities(s, mid): return [o for o in s['opportunities'] if o['member_id']==mid]
def opportunity(s, mid, finding_id=None):
    rows=opportunities(s,mid)
    if finding_id:return next((o for o in rows if o['id']==finding_id),None)
    return rows[0] if len(rows)==1 else None
def document(s, did): return next((d for d in s['documents'] if d['id']==did), None)
def normalize_intervention(value): return INTERVENTIONS.get(value, value or 'coding_review')

def source_version(d):
    retained={k:d.get(k) for k in ('id','version','member_id','date','pages','signature_status','source_policy','source_member_id','evidence_relation')}
    return hashlib.sha256(json.dumps(retained,sort_keys=True).encode()).hexdigest()

def member_summary(s, mid, rows=None):
    rows=opportunities(s,mid) if rows is None else rows
    if len(rows)==1:return {k:rows[0][k] for k in ('status','evidence','owner') if k in rows[0]}
    if not rows:return {}
    complete=sum(completion(s,mid,finding_id=o['id'])['complete'] for o in rows)
    return {'status':'review_complete' if complete==len(rows) else 'multiple_findings',
            'evidence':'Mixed','owner':'Multiple owners','finding_count':len(rows),
            'completed_finding_count':complete}

def authored_documents():
    def doc(did, mid, name, provider, date, relation, sections):
        return {'id':did,'member_id':mid,'title':name,'provider':provider,'date':date,'kind':'prepared_encounter',
                'source_status':'not_loaded','signature_status':'signed','evidence_relation':relation,'synthetic':True,
                'available':False,'requires_publication':True,'pages':[{'number':1,'sections':sections}]}
    return [
      doc('DOC-RILEY-SIGNED','MB-000006','Signed replacement · August 30 encounter','Brookfield Community Care','2026-08-30','supports',[
        {'heading':'Member and encounter','text':'Riley Parker · MB-000006 · Encounter August 30, 2026. Prepared synthetic replacement of DOC-0009.'},
        {'heading':'Assessment and plan','text':'COPD is documented as a current condition and was addressed in the encounter narrative.','highlight':True},
        {'heading':'Signature','text':'Electronically signed by the synthetic treating clinician at Brookfield Community Care on August 30, 2026. The member and encounter identifiers match DOC-0009.'}]),
      doc('DOC-RILEY-MISMATCH','MB-000006','Replacement received · identifier discrepancy','Brookfield Community Care','2026-08-30','mismatch',[
        {'heading':'Requested chart','text':'The request targets Riley Parker · MB-000006.'},
        {'heading':'Source identifier conflict','text':'The supplied replacement identifies MB-000007, which differs from the requested MB-000006. Quarantine this prepared sample; it is not evidence for Riley Parker.','highlight':True}]),
      doc('DOC-JORDAN-CLARIFICATION','MB-000001','Later clarification · reassessment required','Northbrook Family Care','2026-09-20','contradicts',[
        {'heading':'Member and encounter','text':'Jordan Ellis · MB-000001 · Prepared synthetic clarification dated September 20, 2026, following the August 28 encounter.'},
        {'heading':'Clarification of prior assessment','text':'The clinician withdraws the prior chronic systolic heart failure assessment pending clarification of the underlying cardiac findings. Do not carry the earlier statement forward as a confirmed current diagnosis from this clarification.','highlight':True},
        {'heading':'Signature','text':'Electronically signed by the synthetic treating clinician at Northbrook Family Care on September 20, 2026.'}])]

def usable(doc):
    return bool(doc and doc.get('available',True) and doc.get('signature_status')=='signed'
                and doc.get('source_status') in ('eligible','usable')
                and (not doc.get('requires_publication') or doc.get('published_at')))

def prepared_copd_code(s, finding):
    """A bounded authored code reference, never inferred from a historical signal."""
    mid=finding['member_id']
    sources={
      'MB-000002':('OP-0002','DOC-0005','2026-09-18',"COPD was assessed at today's completed encounter. Current symptoms and the ongoing respiratory management plan were reviewed and documented."),
      'MB-000006':('OP-0006','DOC-RILEY-SIGNED','2026-08-30','COPD is documented as a current condition and was addressed in the encounter narrative.'),
    }
    if mid not in sources or finding.get('case_rule_id')!=mid:return None
    fid,did,service_date,assessment_text=sources[mid]
    source=document(s,did)
    if (finding['id']!=fid or not usable(source) or source['member_id']!=mid
        or source.get('source_member_id',mid)!=mid or source.get('date')!=service_date
        or source.get('evidence_relation')!='supports'
        or not any(section.get('highlight') and section.get('text')==assessment_text
                   for page in source.get('pages',[]) for section in page.get('sections',[]))):return None
    # The installed official lookup verifies the code label and FY2026 validity.
    # The MA lookup is separate mapping evidence, not source/receiver eligibility.
    from . import risk_models
    from .risk_models.catalog import CONFIGS, MANIFEST
    from .risk_models.trace import tables
    try:
        code_row=next(r for r in risk_models.lookup('hhs_v08_by2026','J449') if r['code']=='J449')
        validity=next(r for r in tables(CONFIGS['hhs_v08_by2026'])['by_code']['J449'] if r.get('valid_ICD10_2026')=='TRUE')
        mapping=next(r for r in risk_models.lookup('ma_v28_py2027_forecast','J449') if r['code']=='J449')
    except (OSError,ValueError,KeyError,StopIteration):
        return None
    if not code_row.get('code_description') or not validity:return None
    spec=MANIFEST['packages']['hhs_2026']
    mapping_file='software/HHS_HCC/data/input/internal/ICD10_HHS_CC_mappings_2026.csv'
    return {'code':'J44.9','description':code_row['code_description'],'operation':'add',
      'release':'ICD-10-CM FY2026 · verified in the July 31, 2026 official HHS package',
      'reference_url':CONFIGS['hhs_v08_by2026']['source_url'],
      'code_reference':{'config_id':'hhs_v08_by2026','software_release':spec['directory'],
        'asset_sha256':code_row['asset_sha256'],'source_file':mapping_file,
        'source_file_sha256':spec['files'][mapping_file],'validity_column':'valid_ICD10_2026',
        'service_date_scope':{'from':'2026-01-01','through':'2026-09-30'}},
      'mapping_reference':{k:mapping[k] for k in ('config_id','model_version','year','category','asset_sha256')},
      'source_eligibility':{'document_id':did,'member_id':mid,'service_date':service_date,
        'source_version':source.get('version',1),'content_hash':source_version(source),
        'published_at':source['published_at'],'member_matched':True,'signed':True,'current_assessment':True,
        'basis':'Exact authored current COPD assessment passed member, signature and publication checks; independent review and QA are still required.'},
      'basis':'Source-bound prepared code selection. Official code validity and model mapping do not establish receiver eligibility or payment.'}

def source_refs(s, mid, finding_id=None):
    rows=opportunities(s,mid) if not finding_id else [opportunity(s,mid,finding_id)]
    refs=[]
    for did in dict.fromkeys(did for o in rows if o for did in o.get('document_ids',[])):
        d=document(s,did)
        if not d or d['member_id']!=mid or not d.get('available',True) or d.get('source_status')=='not_loaded': continue
        for page in d.get('pages',[]):
            for section in page.get('sections',[]):
                if section.get('highlight'):
                    refs.append({'member_id':mid,'document_id':did,'page':page['number'],'section':section['heading'],
                                 'quote':section['text'],'relation':d.get('evidence_relation','context'),
                                 'source_version':d.get('version',1),'content_hash':source_version(d)})
    return refs

def current_finding(s, mid, finding_id=None):
    m=next(m for m in s['members'] if m['id']==mid)
    o=opportunity(s,mid,finding_id)
    if not o:
        return {'state':'selection_required' if opportunities(s,mid) else 'no_result','summary':'Select an individual finding to inspect its evidence and review state.','evidence':'Unavailable','support':False,'source_ids':[],'next_action':'Select a finding.'}
    if o.get('clinical_context'):
        context=o['clinical_context'];dids=context.get('source_ids',[])
        support=bool(context.get('support_allowed') and dids and all(usable(document(s,did)) and document(s,did)['member_id']==mid for did in dids))
        return {'state':context.get('state','prepared_finding'),'summary':context.get('summary',o['condition']),
                'evidence':context.get('evidence',o.get('evidence','Unavailable')),'support':support,
                'source_ids':dids,'next_action':context.get('next_action','Inspect the finding-specific evidence.')}
    if o.get('case_rule_id')!=mid:
        return {'state':'no_result','summary':'This finding has no prepared clinical review rule.','evidence':o.get('evidence','Unavailable'),'support':False,'source_ids':[],'next_action':'Open a prepared clinical finding.'}
    d=lambda did: document(s,did)
    if mid=='MB-000001' and usable(d('DOC-JORDAN-CLARIFICATION')):
        return {'state':'clarification_required','summary':'The published September 20 clarification withdraws the earlier assessment pending clarification. A new review is required; the earlier support is no longer current.','evidence':'Strong','support':False,'source_ids':['DOC-JORDAN-CLARIFICATION'],'next_action':'Review the contradiction and request clarification.'}
    if mid=='MB-000002' and usable(d('DOC-0005')):
        return {'state':'current_documentation','summary':'The published September 18 encounter explicitly assesses COPD. Inspect the new signed assessment and submit a fresh decision to independent QA.','evidence':'Strong','support':True,'source_ids':['DOC-0005'],'next_action':'Review the published current encounter.'}
    if mid=='MB-000006' and usable(d('DOC-RILEY-SIGNED')):
        return {'state':'source_remediated','summary':'The matched signed replacement for Riley’s August 30 encounter has passed intake and is published. The original unsigned source remains retained; a fresh coding review is required.','evidence':'Strong','support':True,'source_ids':['DOC-RILEY-SIGNED'],'next_action':'Review the signed replacement.'}
    defaults={
      'MB-000001':('documented_gap',True,['DOC-0001'],'Inspect the current signed assessment.'),
      'MB-000002':('historical_only',False,['DOC-0003','DOC-0004'],'Request a current assessment; the signed current note does not assess COPD.'),
      'MB-000003':('assessment_signal',False,['DOC-0006'],'Request a neutral assessment; laboratory and pharmacy signals do not establish a diagnosis.'),
      'MB-000004':('integrity_contradiction',False,['DOC-0007'],'Review the contradiction and route a deletion decision to independent QA.'),
      'MB-000005':('scenario_context',True,['DOC-0008'],'Review the documented conditions; code selection and numeric scoring remain unconfigured.'),
      'MB-000006':('source_blocked',False,['DOC-0009'],'Receive, validate and publish the matching signed replacement.'),
    }
    if mid not in defaults:
        return {'state':'no_result','summary':'This population record has no prepared finding-specific source set. Open a complete case to perform the connected review workflow.','evidence':m.get('evidence','Unavailable'),'support':False,'source_ids':[],'next_action':'Open Jordan Ellis for a complete example.'}
    state,support,dids,next_action=defaults[mid]
    summary=m.get('original_summary',m.get('summary',''))
    if mid=='MB-000004':
        latest=next((r for r in reversed(s['submissions']) if r['member_id']==mid and r.get('decision_id')),None)
        summary='The current signed source contradicts the existing heart failure record. The contradiction supports an integrity review, not a supported addition. '+('The linked deletion attempt is '+latest['status'].replace('_',' ')+'. Eligibility and payment remain separate.' if latest else 'Prepare a deletion only after a fresh review and independent QA; the original and historical rejected correction remain retained.')
    return {'state':state,'summary':summary,'evidence':m.get('original_evidence',m.get('evidence','')),'support':support and all(usable(d(i)) for i in dids if i in ('DOC-0001','DOC-0008')),'source_ids':dids,'next_action':next_action}

def basis_key(s, mid, finding_id=None):
    f=current_finding(s,mid,finding_id);o=opportunity(s,mid,finding_id)
    basis={k:f[k] for k in ('state','source_ids','support')}
    basis['finding_id']=o['id'] if o else None
    basis['rule_version']=o.get('clinical_rule_version','prepared-rules-v1') if o else None
    basis['sources']=[{'id':did,'published_at':document(s,did).get('published_at'),'content_hash':source_version(document(s,did))} for did in f['source_ids'] if document(s,did)]
    return hashlib.sha256(json.dumps(basis,sort_keys=True).encode()).hexdigest()[:20]

def eligibility(s, mid, finding_id=None):
    o=opportunity(s,mid,finding_id)
    f=current_finding(s,mid,finding_id);reviewable=bool(mid in CASE_IDS and o and (o.get('case_rule_id')==mid or o.get('clinical_context')))
    allowed=['resolved_unsupported','awaiting_assessment'] if reviewable else []
    if f['support']: allowed.insert(0,'resolved_supported')
    result={'reviewable':reviewable,'support_allowed':f['support'],'allowed_decisions':allowed,'reason':f['next_action'],
            'source_ids':f['source_ids'],'example_href':'/reviews/MB-000001'}
    result['finding_id']=o['id'] if o else None
    result['finding_selection_required']=len(opportunities(s,mid))>1 and not finding_id
    result['transmission_configured']=bool(o and o.get('case_rule_id') in ('MB-000001','MB-000004'))
    if o and o.get('prepared_code'):result['prepared_code']=o['prepared_code']
    return result

def task_requirements(s, task):
    """Capture the requested episode once; unrelated earlier sources cannot satisfy it."""
    mid=task['member_id'];o=opportunity(s,mid,task.get('finding_id'))
    task.setdefault('evidence_episode_id',o.get('evidence_episode_id') if o else 'EP-'+task['id'])
    task.setdefault('response_episode_id','RESPONSE-'+task['id'])
    task.setdefault('finding_id',o['id'] if o else None)
    task.setdefault('required_source_ids',list((o or {}).get('required_source_ids',[])))
    if not task['required_source_ids'] and (o or {}).get('case_rule_id')==mid:
        task['required_source_ids']={'MB-000002':['DOC-0005'],'MB-000006':['DOC-RILEY-SIGNED']}.get(mid,[])
    task.setdefault('source_versions_at_request',{d['id']:source_version(d) for d in s['documents'] if d['member_id']==mid and usable(d)})
    return task

def task_completion(s, task):
    mid=task['member_id'];intervention=normalize_intervention(task.get('intervention') or {'query':'pre_visit','request_evidence':'source_remediation'}.get(task.get('type'),'coding_review'))
    if task.get('closure_reason') and task.get('closure_disposition') in ('not_supported','unable_to_obtain','not_current'):
        return {'complete':True,'reason':'Closed with recorded outcome: '+task['closure_reason']}
    if intervention=='pre_visit':
        done=any(r.get('task_id')==task.get('response_task_id',task['id']) and r.get('response_episode_id')==task.get('response_episode_id') and r.get('disposition') in ('supported','not_supported','needs_information','deferred') for r in s.get('provider_responses',[]))
        return {'complete':done,'reason':'Response recorded for this task; documentation and coding remain separate.' if done else 'Awaiting response to this task.'}
    if intervention=='source_remediation':
        required=task.get('required_source_ids',[])
        docs=[d for d in s['documents'] if d['member_id']==mid and usable(d)]
        if required:done=bool(required) and all(any(d['id']==did and task.get('source_versions_at_request',{}).get(did)!=source_version(d) for d in docs) for did in required)
        else:
            finding=opportunity(s,mid,task.get('finding_id'))
            applicable=set(current_finding(s,mid,finding['id'])['source_ids']) if finding else set()
            done=any(d['id'] in applicable and task.get('source_versions_at_request',{}).get(d['id'])!=source_version(d) for d in docs)
        return {'complete':done,'reason':'Required source for this evidence episode is usable.' if done else 'Awaiting the required source for this evidence episode.'}
    if intervention=='submission':
        records=[r for r in s.get('submissions',[]) if r.get('task_id')==task['id']]
        done=any(r['status']==task.get('required_outcome','accepted') for r in records)
        return {'complete':done,'reason':'Required submission outcome recorded.' if done else 'Awaiting the task’s defined receiver outcome.'}
    return completion(s,mid,intervention,task.get('finding_id'))

def completion(s, mid, intervention='coding_review', finding_id=None):
    o=opportunity(s,mid,finding_id) or {}
    intervention=normalize_intervention(intervention)
    if mid not in CASE_IDS:return {'complete':False,'reason':'Population illustration; no prepared actionable case.'}
    if intervention in ('pre_visit','source_remediation','submission'):
        tasks=[t for t in s.get('tasks',[]) if t['member_id']==mid and normalize_intervention(t.get('intervention') or {'query':'pre_visit','request_evidence':'source_remediation'}.get(t.get('type'),''))==intervention and (not finding_id or t.get('finding_id')==finding_id)]
        return {'complete':bool(tasks) and all(task_completion(s,t)['complete'] for t in tasks),'reason':'Completion follows the requested task episodes.' if tasks else 'No completed task episode recorded.'}
    if not o and not finding_id:
        rows=opportunities(s,mid)
        return {'complete':bool(rows) and all(completion(s,mid,intervention,r['id'])['complete'] for r in rows),'reason':'All member findings require independent completion.'}
    decision=next((r for r in o.get('decision_history',[]) if r['id']==o.get('current_decision_id')),None)
    qa=next((q for q in reversed(o.get('qa_history',[])) if q['decision_id']==o.get('current_decision_id')),None)
    done=bool(decision and qa and qa['status']=='passed' and qa.get('actor_id')!=decision.get('actor_id') and o.get('qa_status')=='passed'
              and o.get('status') in ('resolved_supported','resolved_unsupported') and decision.get('basis_key')==basis_key(s,mid,o['id']))
    return {'complete':done,'reason':'Terminal review approved independently.' if done else 'Awaiting terminal review and independent QA approval.'}

def upgrade(s):
    """Add fields and retain existing source text, accounts, decisions and population totals."""
    s.setdefault('program_context',deepcopy(PROGRAM));s.setdefault('runs',[]);s.setdefault('tasks',[]);s.setdefault('provider_responses',[])
    existing={d['id'] for d in s['documents']}
    for d in authored_documents():
        if d['id'] not in existing:s['documents'].append(d)
    document(s,'DOC-RILEY-MISMATCH')['source_member_id']='MB-000007'
    for did in ('DOC-0005','DOC-RILEY-SIGNED','DOC-RILEY-MISMATCH','DOC-JORDAN-CLARIFICATION'):
        d=document(s,did)
        if d: d['requires_publication']=True
    for m in s['members']:
        if m['id'] in CASE_IDS:
            m.setdefault('original_summary',m['summary']);m.setdefault('original_evidence',m['evidence'])
    for o in s['opportunities']:
        mid=o['member_id']
        o['finding_id']=o['id']
        o.setdefault('evidence_episode_id','EP-'+o['id'])
        o.setdefault('category_refs',[])
        o.setdefault('duplicate_of',None);o.setdefault('overlap_group',None)
        o.setdefault('clinical_rule_version','prepared-rules-v1')
        canonical='OP-'+mid.split('-')[-1].zfill(4)[-4:]
        if mid in CASE_IDS and o['id']==canonical:o.setdefault('case_rule_id',mid)
        if mid not in CASE_IDS:
            o['eligibility']={'reviewable':False,'support_allowed':False,'allowed_decisions':[],'reason':'This population record has no prepared finding-specific source set. Open a complete case.','source_ids':[],'example_href':'/reviews/MB-000001'}
            o['completion']={'complete':False,'reason':'Population illustration; no prepared actionable case.'}
            o.setdefault('recommendation_version',1)
            continue
        if mid in CASE_IDS and not o.get('owner_id'):
            o.setdefault('previous_owner',o.get('owner'))
            owner_id='retrieval_coordinator' if mid=='MB-000006' else 'provider_2' if mid=='MB-000002' else 'provider_3' if mid=='MB-000003' else 'coder'
            o.update(owner_id=owner_id,owner=ACCOUNT_NAMES[owner_id])
        if o.get('case_rule_id') in ('MB-000001','MB-000004'):
            o['prepared_code']={'code':'I50.22' if mid=='MB-000001' else 'I50.9','description':'Chronic systolic (congestive) heart failure' if mid=='MB-000001' else 'Heart failure, unspecified','operation':'add' if mid=='MB-000001' else 'delete','release':'ICD-10-CM April 1, 2026 release','reference_url':'https://ftp.cdc.gov/pub/Health_Statistics/NCHS/Publications/ICD10CM/2026-update/icd10cm-April-1-2026-XML.zip','basis':'Prepared source-to-code example; not a model mapping or eligibility determination.' if mid=='MB-000001' else 'Authored prior-record reference for deletion only; the contradictory source does not support coding this diagnosis.'}
        elif o.get('case_rule_id') in ('MB-000002','MB-000006'):
            current_code=prepared_copd_code(s,o)
            if current_code:o['prepared_code']=current_code
            else:o.pop('prepared_code',None)
        o.setdefault('recommendation_version',max([h.get('version',1) for h in o.get('recommendation_history',[])] or [1]))
        o.setdefault('decision_history',[]);o.setdefault('qa_history',[])
        # Legacy decisions remain visible, but cannot masquerade as a newly approved linked record.
        if o.get('reviewer') and not o['decision_history']:
            o['decision_history'].append({'id':'LEGACY-'+o['id'],'actor_id':o['reviewer'],'actor':o['reviewer'],'at':o.get('review_completed_at'),
             'decision':o['status'],'note':o.get('decision_note',''),'recommendation_version':o['recommendation_version'],
             'source_refs':source_refs(s,mid,o['id']),'basis':'Retained legacy decision; fresh review required for linked preparation.'})
        if o.get('qa_reviewer') and o.get('qa_status') in ('passed','rework') and not o['qa_history'] and any(r['id'].startswith('LEGACY-') for r in o['decision_history']):
            o['qa_history'].append({'id':'LEGACY-QA-'+o['id'],'decision_id':'LEGACY-'+o['id'],'actor':o['qa_reviewer'],'actor_id':o['qa_reviewer'],
             'at':None,'status':o['qa_status'],'note':o.get('qa_note',''),'basis':'Retained legacy QA metadata; the original QA timestamp and exact source snapshot were not recorded.'})
        o.setdefault('analysis_basis_key',basis_key(s,mid,o['id']))
        if mid in CASE_IDS and not o.get('recommendation_history'):
            f=current_finding(s,mid,o['id'])
            o['recommendation_history']=[{'version':o['recommendation_version'],'created_at':'2026-09-12T00:00:00Z','evidence':f['evidence'],'summary':f['summary'],'document_ids':f['source_ids'],'source_refs':source_refs(s,mid,o['id']),'state':f['state'],'basis':'Prepared baseline','finding_id':o['id'],'evidence_episode_id':o['evidence_episode_id'],'rule_version':o['clinical_rule_version']}]
        o['eligibility']=eligibility(s,mid,o['id']);o['completion']=completion(s,mid,finding_id=o['id'])
    for t in s['tasks']:
        if t.get('type')=='campaign':
            c=next((c for c in s['campaigns'] if c['id']==t.get('campaign_id')),None)
            t['intervention']=t.get('intervention') or (normalize_intervention(c['type']) if c else 'coding_review')
        task_requirements(s,t)
        if t.get('type') in ('campaign','query','request_evidence'):
            t['completion']=task_completion(s,t)
            t['status']='closed' if t.get('closure_reason') and t['completion']['complete'] else 'responded' if t['completion']['complete'] and t.get('type')=='query' else 'completed' if t['completion']['complete'] else 'open'
    for c in s.get('campaigns',[]):
        c['intervention']=normalize_intervention(c['type']);c['actionable_member_ids']=[mid for mid in c['member_ids'] if mid in CASE_IDS]
        c['population_illustration']=any(mid not in CASE_IDS for mid in c['member_ids'])
        if c['population_illustration']:
            c.setdefault('population_completed_count',c.get('completed_count',0));c.setdefault('population_progress',c.get('progress',0))
        tasks=[t for t in s['tasks'] if t.get('campaign_id')==c['id']]
        c['completion_denominator']=len(tasks) if tasks else len(c['actionable_member_ids'])
        c['completed_count']=sum(t['completion']['complete'] for t in tasks) if tasks else sum(completion(s,mid,c['intervention'])['complete'] for mid in c['actionable_member_ids'])
        c['progress']=round(100*c['completed_count']/max(c['completion_denominator'],1))
    original=next((r for r in s['submissions'] if r['id']=='SUB-0001'),None)
    if original:original.setdefault('prepared_record_reference',{'id':'PRIOR-TAYLOR-I509','code':'I50.9','release':'ICD-10-CM April 1, 2026 release','basis':'Additive authored prior-record code reference for the prepared deletion story. Original code field and receiver history are retained unchanged.'})
    s['assessment_schema_version']=2
    return s

def analyze(s, mid, finding_id=None):
    o=opportunity(s,mid,finding_id)
    if not o or mid not in CASE_IDS:return {'member_id':mid,'result':'no_result','explanation':'No prepared finding-specific source set is configured.'}
    f=current_finding(s,mid,o['id']);key=basis_key(s,mid,o['id']);changed=o.get('analysis_basis_key')!=key
    if f['state']=='no_result':return {'member_id':mid,'finding_id':o['id'],'result':'no_result','explanation':f['summary']}
    if changed:
        before=deepcopy(o.get('recommendation_history',[])[-1] if o.get('recommendation_history') else None)
        o['recommendation_version']+=1;o['analysis_basis_key']=key
        snapshot={'version':o['recommendation_version'],'created_at':timestamp(),'evidence':f['evidence'],'summary':f['summary'],
                  'document_ids':f['source_ids'],'source_refs':[r for r in source_refs(s,mid,o['id']) if r['document_id'] in f['source_ids']],
                  'finding_id':o['id'],'evidence_episode_id':o['evidence_episode_id'],'rule_version':o['clinical_rule_version'],
                  'state':f['state'],'basis':'Prepared analysis','previous_version':before['version'] if before else None,'next_action':f['next_action']}
        o.setdefault('recommendation_history',[]).append(snapshot)
        o.update(status='in_review',evidence=f['evidence'],qa_status='not_submitted',review_state='fresh_review_required')
        o.pop('current_decision_id',None)
        m=next(m for m in s['members'] if m['id']==mid)
        if len(opportunities(s,mid))==1:m.update(summary=f['summary'],evidence=f['evidence'],status=o['status'])
    o['version']=o.get('version',1)+1;o['last_analysis']=timestamp()
    return {'member_id':mid,'finding_id':o['id'],'result':'changed' if changed else 'no_change','explanation':f['summary'] if changed else 'No change: the published evidence and prepared finding are unchanged.','recommendation_version':o['recommendation_version']}

def claims(s,mid,finding_id=None):
    f=current_finding(s,mid,finding_id);refs=source_refs(s,mid,finding_id)
    relevant=[r for r in refs if r['document_id'] in f['source_ids']]
    return [r|{'text':r['quote'],'href':'/members/'+mid+'?'+urlencode({'tab':'Evidence & documents','document':r['document_id'],'page':r['page'],'section':r['section']})} for r in relevant]

def scenario(s, mid):
    transitions=[]
    for t in TRANSITIONS.get(mid,[]):
        d=document(s,t['document_id'])
        transitions.append(t|{'status':'published' if d.get('published_at') else 'received' if d.get('available') else 'prepared'})
    return {'id':'CASE-'+mid,'date':next((m.get('scenario_date') for m in s['members'] if m['id']==mid and m.get('scenario_date')),PROGRAM['scenario_date']),
            'basis':'Prepared synthetic scenario','transitions':transitions}

def next_steps(s, mid, finding_id=None):
    if mid not in CASE_IDS:return [{'label':'Open complete review example','role':'coder','href':'/reviews/MB-000001'}]
    o=opportunity(s,mid,finding_id) or {};result=[]
    suffix='&finding='+o['id'] if o and len(opportunities(s,mid))>1 else ''
    if not o and len(opportunities(s,mid))>1:return [{'label':'Review '+row['condition'],'role':'coder','href':'/reviews/'+mid+'?finding='+row['id']} for row in opportunities(s,mid)]
    if o.get('qa_status')=='awaiting_qa' and o.get('current_decision_id'):result.append({'label':'Independent QA review','role':'qa_reviewer','href':'/qa?member='+mid+suffix})
    if completion(s,mid,finding_id=o.get('id'))['complete'] and o.get('case_rule_id') in ('MB-000001','MB-000004'):
        result.append({'label':'Prepare approved record','role':'submission_analyst','href':'/submissions?member='+mid+suffix,'action':'prepare','value':o['id']})
    for t in scenario(s,mid)['transitions']:
        if t['status']=='prepared':result.append({'label':t['label'],'role':'provider','href':'/previsit?member='+mid,'action':'later_encounter','value':t['id']})
        elif t['status']=='received':
            source=document(s,t['document_id'])
            quarantined=source.get('source_status')=='quarantined' or source.get('evidence_relation')=='mismatch'
            label=('Inspect quarantined source · ' if quarantined else 'Validate and publish ')+t['document_id']
            result.append({'label':label,'role':'retrieval_coordinator','href':'/intake?member='+mid+'&document='+t['document_id']})
    result.append({'label':'Review current evidence','role':'coder','href':'/reviews/'+mid+('?finding='+o['id'] if suffix else '')})
    return result

def import_summary(s, allowed_ids):
    dids=['DOC-0009','DOC-0010','DOC-0011','DOC-0005','DOC-RILEY-SIGNED','DOC-RILEY-MISMATCH','DOC-JORDAN-CLARIFICATION']
    rows=[]
    for did in dids:
        d=document(s,did)
        if not d or d['member_id'] not in allowed_ids:continue
        received=d.get('available',True) and d['source_status']!='not_loaded';matched=d.get('evidence_relation')!='mismatch'
        valid=matched and d.get('signature_status')=='signed'
        partition='not_received' if not received else 'unmatched_pending' if not d.get('member_id') or d.get('identity_match_status')=='pending' else 'matched' if valid else 'quarantined'
        rows.append({'document_id':did,'member_id':d['member_id'],'requested_member_id':d.get('requested_member_id',d['member_id']),
          'title':d['title'],'received':received,'matched':matched if received else None,'published':bool(d.get('published_at')),'received_partition':partition,
          'status':'not_received' if not received else 'published' if d.get('published_at') else 'ready_to_publish' if valid else 'quarantined',
          'reason':'Awaiting staged receipt.' if not received else 'Member identifier differs.' if not matched else 'Clinician signature missing.' if not valid else 'Published usable source.' if d.get('published_at') else 'Matched; awaiting validation and publication.',
          'href':'/intake?member='+d.get('requested_member_id',d['member_id'])+'&document='+did})
    return {'id':'BATCH-PREPARED-2026-09','name':'September prepared source batch','unit':'documents','total':len(rows),'received':sum(r['received'] for r in rows),
      'matched':sum(r['received_partition']=='matched' for r in rows),'accepted_for_processing':sum(r['received_partition']=='matched' for r in rows),
      'quarantined':sum(r['received_partition']=='quarantined' for r in rows),'unmatched_pending':sum(r['received_partition']=='unmatched_pending' for r in rows),
      'identity_matched':sum(r['received'] and r['matched'] for r in rows),'published':sum(r['published'] for r in rows),
      'basis':'Received documents partition into accepted for processing, quarantined and unmatched/pending. Validation and publication are separate stages.','rows':rows}

def scoring_scenario():
    return {'id':'CASEY-HIERARCHY-2026','member_id':'MB-000005','basis':'Nonnumeric prepared hierarchy illustration','numeric_status':'deferred_reference_unavailable',
     'program':'Medicare Advantage Part C','service_year':2026,'payment_year':2027,'model':'CMS-HCC V28 context','segment':'Community non-dual aged (illustrative assumption, not scored)',
     'demographics':{'age':77,'sex':'Female'},'baseline_inputs':['Demographic context','Documented diabetes mellitus'],
     'combined_inputs':['Demographic context','Documented diabetes mellitus','Documented chronic kidney disease'],
     'source_ids':['DOC-0008'],'baseline_score':None,'combined_score':None,'delta':None,
     'steps':[{'label':'Assemble full-member inputs','detail':'Retain demographics and the complete documented condition set for each comparison.'},
              {'label':'Resolve code detail','detail':'The prepared source does not specify the complete coding detail. Do not infer diabetes type, complications or kidney stage.'},
              {'label':'Apply the configured hierarchy once','detail':'A configured model would select applicable categories and evaluate interactions over the combined set; individual candidate effects cannot be added.'},
              {'label':'Compare retained outputs','detail':'Official mapping, coefficients and independently checked full-member outputs are unavailable. Numeric scores and financial amounts remain blank.'}],
     'limitation':'No claim is made that these two unspecified conditions trigger a particular hierarchy or interaction. Model/year switching and official numeric scoring remain unimplemented.'}

def audit_trace(s,mid):
    findings=opportunities(s,mid);records=[r for r in s['submissions'] if r['member_id']==mid]
    history=lambda key:[deepcopy(item)|{'finding_id':o['id']} for o in findings for item in o.get(key,[])]
    recommendations=history('recommendation_history');decisions=history('decision_history');qa=history('qa_history')
    stages={'sources':bool(source_refs(s,mid)),'recommendations':bool(recommendations),'review':bool(decisions),
            'independent_qa':any(q.get('status')=='passed' for q in qa),'linked_submission':any(r.get('decision_id') for r in records),
            'receiver_outcome':any(r.get('decision_id') and r.get('status') in ('accepted','rejected') for r in records),'prepared_report':any(r.get('report_comparison') for r in records)}
    return {'member_id':mid,'program_context':s['program_context'],'scenario':scenario(s,mid),'source_refs':source_refs(s,mid),
            'recommendations':recommendations,'decisions':decisions,'qa':qa,'finding_ids':[o['id'] for o in findings],
            'submissions':deepcopy(records),'stages':stages,'missing_links':[k for k,v in stages.items() if not v],
            'readiness':'Trace complete for the recorded prepared workflow' if all(stages.values()) else 'Trace has unavailable stages',
            'formal_audit_readiness':False}
