"""Prepared, source-bound case workflows. No clinical inference or external delivery."""
from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import json
from urllib.parse import urlencode

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
def opportunity(s, mid): return next((o for o in s['opportunities'] if o['member_id']==mid), None)
def document(s, did): return next((d for d in s['documents'] if d['id']==did), None)
def normalize_intervention(value): return INTERVENTIONS.get(value, value or 'coding_review')

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

def source_refs(s, mid):
    o=opportunity(s,mid)
    if not o: return []
    refs=[]
    for did in o.get('document_ids',[]):
        d=document(s,did)
        if not d or not d.get('available',True) or d.get('source_status')=='not_loaded': continue
        for page in d.get('pages',[]):
            for section in page.get('sections',[]):
                if section.get('highlight'):
                    refs.append({'member_id':mid,'document_id':did,'page':page['number'],'section':section['heading'],
                                 'quote':section['text'],'relation':d.get('evidence_relation','context')})
    return refs

def current_finding(s, mid):
    m=next(m for m in s['members'] if m['id']==mid)
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

def basis_key(s, mid):
    f=current_finding(s,mid)
    basis={k:f[k] for k in ('state','source_ids','support')}
    basis['sources']=[{'id':did,'published_at':document(s,did).get('published_at'),'pages':document(s,did).get('pages')} for did in f['source_ids'] if document(s,did)]
    return hashlib.sha256(json.dumps(basis,sort_keys=True).encode()).hexdigest()[:20]

def eligibility(s, mid):
    f=current_finding(s,mid);reviewable=mid in CASE_IDS
    allowed=['resolved_unsupported','awaiting_assessment'] if reviewable else []
    if f['support']: allowed.insert(0,'resolved_supported')
    result={'reviewable':reviewable,'support_allowed':f['support'],'allowed_decisions':allowed,'reason':f['next_action'],
            'source_ids':f['source_ids'],'example_href':'/reviews/MB-000001'}
    o=opportunity(s,mid)
    if o and o.get('prepared_code'):result['prepared_code']=o['prepared_code']
    return result

def completion(s, mid, intervention='coding_review'):
    o=opportunity(s,mid) or {};m=next(m for m in s['members'] if m['id']==mid)
    intervention=normalize_intervention(intervention)
    if mid not in CASE_IDS:return {'complete':False,'reason':'Population illustration; no prepared actionable case.'}
    if intervention=='pre_visit':return {'complete':bool(m.get('provider_response')),'reason':'Provider response is a separate milestone; it does not approve coding.'}
    if intervention=='source_remediation':
        complete=any(d['member_id']==mid and usable(d) for d in s['documents'])
        return {'complete':complete,'reason':'Usable signed source available.' if complete else 'Awaiting source validation and publication.'}
    done=o.get('qa_status')=='passed' and o.get('status') in ('resolved_supported','resolved_unsupported') and bool(o.get('current_decision_id'))
    return {'complete':done,'reason':'Terminal review approved independently.' if done else 'Awaiting terminal review and independent QA approval.'}

def upgrade(s):
    """Add fields and retain existing source text, accounts, decisions and population totals."""
    s.setdefault('program_context',deepcopy(PROGRAM));s.setdefault('runs',[]);s.setdefault('tasks',[])
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
        if mid not in CASE_IDS:
            o['eligibility']={'reviewable':False,'support_allowed':False,'allowed_decisions':[],'reason':'This population record has no prepared finding-specific source set. Open a complete case.','source_ids':[],'example_href':'/reviews/MB-000001'}
            o['completion']={'complete':False,'reason':'Population illustration; no prepared actionable case.'}
            o.setdefault('recommendation_version',1)
            continue
        if mid in CASE_IDS and not o.get('owner_id'):
            o.setdefault('previous_owner',o.get('owner'))
            owner_id,name=('retrieval_coordinator','Retrieval coordinator') if mid=='MB-000006' else ('provider_2','Practice 2 provider') if mid=='MB-000002' else ('provider_3','Practice 3 provider') if mid=='MB-000003' else ('coder','Coder')
            o.update(owner_id=owner_id,owner=name)
        if mid in ('MB-000001','MB-000004'):
            o['prepared_code']={'code':'I50.22' if mid=='MB-000001' else 'I50.9','description':'Chronic systolic (congestive) heart failure' if mid=='MB-000001' else 'Heart failure, unspecified','operation':'add' if mid=='MB-000001' else 'delete','release':'ICD-10-CM April 1, 2026 release','reference_url':'https://ftp.cdc.gov/pub/Health_Statistics/NCHS/Publications/ICD10CM/2026-update/icd10cm-April-1-2026-XML.zip','basis':'Prepared source-to-code example; not a model mapping or eligibility determination.' if mid=='MB-000001' else 'Authored prior-record reference for deletion only; the contradictory source does not support coding this diagnosis.'}
        o.setdefault('recommendation_version',max([h.get('version',1) for h in o.get('recommendation_history',[])] or [1]))
        o.setdefault('decision_history',[]);o.setdefault('qa_history',[])
        # Legacy decisions remain visible, but cannot masquerade as a newly approved linked record.
        if o.get('reviewer') and not o['decision_history']:
            o['decision_history'].append({'id':'LEGACY-'+o['id'],'actor_id':o['reviewer'],'actor':o['reviewer'],'at':o.get('review_completed_at'),
             'decision':o['status'],'note':o.get('decision_note',''),'recommendation_version':o['recommendation_version'],
             'source_refs':source_refs(s,mid),'basis':'Retained legacy decision; fresh review required for linked preparation.'})
        if o.get('qa_reviewer') and o.get('qa_status') in ('passed','rework') and not o['qa_history'] and any(r['id'].startswith('LEGACY-') for r in o['decision_history']):
            o['qa_history'].append({'id':'LEGACY-QA-'+o['id'],'decision_id':'LEGACY-'+o['id'],'actor':o['qa_reviewer'],'actor_id':o['qa_reviewer'],
             'at':None,'status':o['qa_status'],'note':o.get('qa_note',''),'basis':'Retained legacy QA metadata; the original QA timestamp and exact source snapshot were not recorded.'})
        o.setdefault('analysis_basis_key',basis_key(s,mid))
        if mid in CASE_IDS and not o.get('recommendation_history'):
            f=current_finding(s,mid)
            o['recommendation_history']=[{'version':o['recommendation_version'],'created_at':'2026-09-12T00:00:00Z','evidence':f['evidence'],'summary':f['summary'],'document_ids':f['source_ids'],'state':f['state'],'basis':'Prepared baseline'}]
        o['eligibility']=eligibility(s,mid);o['completion']=completion(s,mid)
    for c in s.get('campaigns',[]):
        c['intervention']=normalize_intervention(c['type']);c['actionable_member_ids']=[mid for mid in c['member_ids'] if mid in CASE_IDS]
        c['population_illustration']=any(mid not in CASE_IDS for mid in c['member_ids'])
        if c['population_illustration']:
            c.setdefault('population_completed_count',c.get('completed_count',0));c.setdefault('population_progress',c.get('progress',0))
        c['completion_denominator']=len(c['actionable_member_ids']);c['completed_count']=sum(completion(s,mid,c['intervention'])['complete'] for mid in c['actionable_member_ids'])
        c['progress']=round(100*c['completed_count']/max(c['completion_denominator'],1))
    for t in s['tasks']:
        if t.get('type')=='campaign':
            c=next((c for c in s['campaigns'] if c['id']==t.get('campaign_id')),None)
            t['intervention']=t.get('intervention') or (c['intervention'] if c else 'coding_review')
            t['completion']=completion(s,t['member_id'],t['intervention']);t['status']='completed' if t['completion']['complete'] else 'open'
        elif t.get('type')=='request_evidence' and completion(s,t['member_id'],'source_remediation')['complete']:t['status']='completed'
    original=next((r for r in s['submissions'] if r['id']=='SUB-0001'),None)
    if original:original.setdefault('prepared_record_reference',{'id':'PRIOR-TAYLOR-I509','code':'I50.9','release':'ICD-10-CM April 1, 2026 release','basis':'Additive authored prior-record code reference for the prepared deletion story. Original code field and receiver history are retained unchanged.'})
    s['assessment_schema_version']=1
    return s

def analyze(s, mid):
    o=opportunity(s,mid)
    if not o or mid not in CASE_IDS:return {'member_id':mid,'result':'no_result','explanation':'No prepared finding-specific source set is configured.'}
    f=current_finding(s,mid);key=basis_key(s,mid);changed=o.get('analysis_basis_key')!=key
    if changed:
        before=deepcopy(o.get('recommendation_history',[])[-1] if o.get('recommendation_history') else None)
        o['recommendation_version']+=1;o['analysis_basis_key']=key
        snapshot={'version':o['recommendation_version'],'created_at':timestamp(),'evidence':f['evidence'],'summary':f['summary'],
                  'document_ids':f['source_ids'],'source_refs':[r for r in source_refs(s,mid) if r['document_id'] in f['source_ids']],
                  'state':f['state'],'basis':'Prepared analysis','previous_version':before['version'] if before else None,'next_action':f['next_action']}
        o.setdefault('recommendation_history',[]).append(snapshot)
        o.update(status='in_review',evidence=f['evidence'],qa_status='not_submitted',review_state='fresh_review_required')
        o.pop('current_decision_id',None)
        m=next(m for m in s['members'] if m['id']==mid);m.update(summary=f['summary'],evidence=f['evidence'],status=o['status'])
    o['version']=o.get('version',1)+1;o['last_analysis']=timestamp()
    return {'member_id':mid,'result':'changed' if changed else 'no_change','explanation':f['summary'] if changed else 'No change: the published evidence and prepared finding are unchanged.','recommendation_version':o['recommendation_version']}

def claims(s,mid):
    f=current_finding(s,mid);refs=source_refs(s,mid)
    relevant=[r for r in refs if r['document_id'] in f['source_ids']]
    return [r|{'text':r['quote'],'href':'/members/'+mid+'?'+urlencode({'tab':'Evidence & documents','document':r['document_id'],'page':r['page'],'section':r['section']})} for r in relevant]

def scenario(s, mid):
    transitions=[]
    for t in TRANSITIONS.get(mid,[]):
        d=document(s,t['document_id'])
        transitions.append(t|{'status':'published' if d.get('published_at') else 'received' if d.get('available') else 'prepared'})
    return {'id':'CASE-'+mid,'date':next((m.get('scenario_date') for m in s['members'] if m['id']==mid and m.get('scenario_date')),PROGRAM['scenario_date']),
            'basis':'Prepared synthetic scenario','transitions':transitions}

def next_steps(s, mid):
    if mid not in CASE_IDS:return [{'label':'Open complete review example','role':'coder','href':'/reviews/MB-000001'}]
    o=opportunity(s,mid) or {};result=[]
    if o.get('qa_status')=='awaiting_qa' and o.get('current_decision_id'):result.append({'label':'Independent QA review','role':'qa_reviewer','href':'/qa?member='+mid})
    if completion(s,mid)['complete'] and mid in ('MB-000001','MB-000004'):
        result.append({'label':'Prepare approved record','role':'submission_analyst','href':'/submissions?member='+mid,'action':'prepare','value':mid})
    for t in scenario(s,mid)['transitions']:
        if t['status']=='prepared':result.append({'label':t['label'],'role':'provider','href':'/previsit?member='+mid,'action':'later_encounter','value':t['id']})
        elif t['status']=='received':
            source=document(s,t['document_id'])
            quarantined=source.get('source_status')=='quarantined' or source.get('evidence_relation')=='mismatch'
            label=('Inspect quarantined source · ' if quarantined else 'Validate and publish ')+t['document_id']
            result.append({'label':label,'role':'retrieval_coordinator','href':'/intake?member='+mid+'&document='+t['document_id']})
    result.append({'label':'Review current evidence','role':'coder','href':'/reviews/'+mid})
    return result

def import_summary(s, allowed_ids):
    dids=['DOC-0009','DOC-0010','DOC-0011','DOC-0005','DOC-RILEY-SIGNED','DOC-RILEY-MISMATCH','DOC-JORDAN-CLARIFICATION']
    rows=[]
    for did in dids:
        d=document(s,did)
        if not d or d['member_id'] not in allowed_ids:continue
        received=d.get('available',True) and d['source_status']!='not_loaded';matched=d.get('evidence_relation')!='mismatch'
        valid=matched and d.get('signature_status')=='signed'
        rows.append({'document_id':did,'member_id':d['member_id'],'requested_member_id':d.get('requested_member_id',d['member_id']),
          'title':d['title'],'received':received,'matched':matched if received else None,'published':bool(d.get('published_at')),
          'status':'not_received' if not received else 'published' if d.get('published_at') else 'ready_to_publish' if valid else 'quarantined',
          'reason':'Awaiting staged receipt.' if not received else 'Member identifier differs.' if not matched else 'Clinician signature missing.' if not valid else 'Published usable source.' if d.get('published_at') else 'Matched; awaiting validation and publication.',
          'href':'/intake?member='+d.get('requested_member_id',d['member_id'])+'&document='+did})
    return {'id':'BATCH-PREPARED-2026-09','name':'September prepared source batch','unit':'documents','total':len(rows),'received':sum(r['received'] for r in rows),
      'matched':sum(r['received'] and r['matched'] for r in rows),'quarantined':sum(r['status']=='quarantined' for r in rows),'published':sum(r['published'] for r in rows),
      'basis':'Prepared sample batch; receipt, identity match and source usability are separate stages.','rows':rows}

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
    o=opportunity(s,mid) or {};records=[r for r in s['submissions'] if r['member_id']==mid]
    stages={'sources':bool(source_refs(s,mid)),'recommendations':bool(o.get('recommendation_history')),'review':bool(o.get('decision_history')),
            'independent_qa':any(q.get('status')=='passed' for q in o.get('qa_history',[])),'linked_submission':any(r.get('decision_id') for r in records),
            'receiver_outcome':any(r.get('decision_id') and r.get('status') in ('accepted','rejected') for r in records),'prepared_report':any(r.get('report_comparison') for r in records)}
    return {'member_id':mid,'program_context':s['program_context'],'scenario':scenario(s,mid),'source_refs':source_refs(s,mid),
            'recommendations':deepcopy(o.get('recommendation_history',[])),'decisions':deepcopy(o.get('decision_history',[])),'qa':deepcopy(o.get('qa_history',[])),
            'submissions':deepcopy(records),'stages':stages,'missing_links':[k for k,v in stages.items() if not v],
            'readiness':'Trace complete for the recorded prepared workflow' if all(stages.values()) else 'Trace has unavailable stages',
            'formal_audit_readiness':False}
