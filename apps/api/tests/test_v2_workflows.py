"""Clinical v2 regressions share the existing disposable-schema harness."""
from copy import deepcopy

from test_demo import action, baseline, database, login, main
from apps.api.app import assessment, risk_inputs, risk_store


def add_second_finding():
    with main.db() as conn:
        state=main.get_state(conn,lock=True)
        original=next(o for o in state['opportunities'] if o['id']=='OP-0001')
        second={k:deepcopy(v) for k,v in original.items() if k not in ('prepared_code','analysis_basis_key','recommendation_history','current_decision_id')}
        second.update(id='OP-JORDAN-SECOND',finding_id='OP-JORDAN-SECOND',condition='Separate authored review question',
                      case_rule_id='',evidence_episode_id='EP-JORDAN-SECOND',decision_history=[],qa_history=[],
                      status='new',qa_status='not_submitted',reviewer=None,duplicate_of='OP-0001',overlap_group='OVERLAP-JORDAN',
                      clinical_context={'state':'documented_gap','summary':'Inspect the same source for the second explicitly authored review question.',
                                        'source_ids':['DOC-0001'],'support_allowed':True,'evidence':'Strong'})
        state['opportunities'].append(second)
        main.save_state(conn,state)
    return second['id']


def test_finding_actions_require_unambiguous_identity_and_keep_separate_histories():
    second=add_second_finding();coder=login('coder');qa=login('qa')
    ambiguous=action(coder,'review',id='MB-000001',value='resolved_supported',note='Source reviewed.')
    assert ambiguous.status_code==409 and ambiguous.json()['error']['code']=='FINDING_REQUIRED'
    detail=coder.get('/api/v1/members/MB-000001').json()
    assert detail['selected_finding_id'] is None
    assert detail['eligibility']['finding_selection_required'] and not detail['eligibility']['support_allowed']
    selected=coder.get('/api/v1/members/MB-000001?finding='+second).json()
    assert selected['selected_finding_id']==second and selected['claims']
    assert action(coder,'review',id='MB-000002',finding_id=second,value='resolved_supported',note='Wrong member.').status_code==400
    assert action(coder,'review',id='MB-000001',finding_id=second,value='resolved_supported',note='Reviewed the exact source for this finding.').status_code==200
    detail=coder.get('/api/v1/members/MB-000001?finding='+second).json()
    selected=next(o for o in detail['opportunities'] if o['id']==second)
    decision=selected['decision_history'][-1]
    assert decision['finding_id']==second and decision['evidence_episode_id']=='EP-JORDAN-SECOND'
    assert len(decision['source_refs'][0]['content_hash'])==64
    assert decision['source_refs'][0]['source_version']==1
    assert action(qa,'qa',id=second,decision_id=decision['id'],value='passed',note='The source and independent disposition agree.').status_code==200
    final=coder.get('/api/v1/members/MB-000001?finding='+second).json()
    first=next(o for o in final['opportunities'] if o['id']=='OP-0001')
    second_row=next(o for o in final['opportunities'] if o['id']==second)
    assert not first['decision_history'] and not first['completion']['complete']
    assert second_row['completion']['complete'] and len(second_row['qa_history'])==1
    assert final['finding_summary']['completed_finding_count']==1
    assert set(final['audit_trace']['finding_ids'])=={'OP-0001',second}


def test_qa_requires_pass_reason_and_current_source_and_decision_version():
    coder=login('coder');qa=login('qa');mid='MB-000001'
    assert action(coder,'review',id=mid,value='resolved_supported',note='Signed current assessment reviewed.').status_code==200
    detail=coder.get('/api/v1/members/'+mid).json();decision=detail['opportunities'][0]['current_decision_id']
    assert action(qa,'qa',id=mid,value='passed').status_code==400
    assert action(qa,'qa',id=mid,decision_id='DEC-stale',value='passed',note='Checked.').status_code==409
    assert action(coder,'qa',id=mid,decision_id=decision,value='passed',note='Self review.').status_code==403
    with main.db() as conn:
        state=main.get_state(conn,lock=True)
        source=next(d for d in state['documents'] if d['id']=='DOC-0001')
        source['version']=2
        source['pages'][0]['sections'][0]['text']+=' Retained updated source version.'
        main.save_state(conn,state)
    stale=action(qa,'qa',id=mid,decision_id=decision,value='passed',note='Checked older source.')
    assert stale.status_code==409 and stale.json()['error']['code']=='EVIDENCE_CHANGED'
    assert action(coder,'review',id=mid,value='resolved_supported',note='Reviewed the new source version.').status_code==200
    detail=coder.get('/api/v1/members/'+mid).json();latest=detail['opportunities'][0]['current_decision_id']
    assert latest!=decision
    assert action(qa,'qa',id=mid,decision_id=latest,value='passed',note='Independent review of the latest exact source.').status_code==200
    history=coder.get('/api/v1/members/'+mid).json()['opportunities'][0]['decision_history']
    assert len(history)==2 and history[0]['source_refs'][0]['source_version']==1
    assert history[1]['source_refs'][0]['source_version']==2


def test_provider_response_is_bound_to_one_requested_episode():
    analyst=login();provider=login('provider2');mid='MB-000002'
    assert action(provider,'respond',id=mid,value='supported').status_code==200
    first=action(analyst,'query',id=mid,evidence_episode_id='MORGAN-FIRST',note='Please assess the first unanswered question.').json()['task_id']
    second=action(analyst,'query',id=mid,evidence_episode_id='MORGAN-SECOND',note='Please assess the second unanswered question.').json()['task_id']
    tasks=provider.get('/api/v1/members/'+mid).json()['tasks']
    assert all(t['status']=='open' and not t['completion']['complete'] for t in tasks)
    assert action(provider,'respond',id=mid,value='not_supported').status_code==409
    assert action(provider,'respond',id=mid,task_id=first,value='not_supported',note='This question is not supported.').status_code==200
    tasks={t['id']:t for t in provider.get('/api/v1/members/'+mid).json()['tasks']}
    assert tasks[first]['completion']['complete'] and not tasks[second]['completion']['complete']
    assert action(login('provider'),'respond',id=mid,task_id=second,value='supported').status_code==404


def test_requested_source_does_not_complete_from_unrelated_existing_note():
    analyst=login();retrieval=login('retrieval');provider=login('provider2');mid='MB-000002'
    result=action(analyst,'request_evidence',id=mid,note='Obtain current COPD assessment.')
    assert result.status_code==200
    task_id=result.json()['task_id']
    task=lambda:next(t for t in retrieval.get('/api/v1/members/'+mid).json()['tasks'] if t['id']==task_id)
    assert task()['required_source_ids']==['DOC-0005']
    assert not task()['completion']['complete']
    assert action(provider,'respond',id=mid,value='supported').status_code==200
    assert not task()['completion']['complete']
    assert action(provider,'later_encounter',id=mid).status_code==200
    assert not task()['completion']['complete']
    response=retrieval.post('/api/v1/intake/publish',json={'member_id':mid,'document_id':'DOC-0005'})
    assert response.status_code==200 and task()['completion']['complete']
    detail=retrieval.get('/api/v1/members/'+mid).json()
    assert not detail['opportunities'][0]['completion']['complete']
    newer=action(analyst,'request_evidence',id=mid,evidence_episode_id='MORGAN-NEXT-EPISODE',note='Obtain documentation for the next assessment episode.').json()['task_id']
    newer_task=next(t for t in retrieval.get('/api/v1/members/'+mid).json()['tasks'] if t['id']==newer)
    assert not newer_task['completion']['complete']


def test_intake_receipt_partition_reconciles_and_preview_does_not_mutate():
    retrieval=login('retrieval')
    before=retrieval.get('/api/v1/bootstrap').json()['import_summary']
    assert before['received']==before['matched']+before['quarantined']+before['unmatched_pending']
    assert before['matched']==before['accepted_for_processing']==1
    assert before['identity_matched']==2 and before['quarantined']==2
    assert sum(r['received_partition']!='not_received' for r in before['rows'])==before['received']
    assert retrieval.post('/api/v1/intake/validate',json={'member_id':'MB-000006','document_id':'DOC-0009'}).status_code==200
    after=retrieval.get('/api/v1/bootstrap').json()['import_summary']
    assert after==before


def test_campaign_tracks_two_findings_without_cross_completion():
    second=add_second_finding();analyst=login();coder=login('coder');qa=login('qa')
    result=action(analyst,'campaign',name='Two finding reviews',member_ids=['MB-000001'],finding_ids=['OP-0001',second],owner='coder',value='coding_review')
    assert result.status_code==200
    campaign=next(c for c in analyst.get('/api/v1/bootstrap').json()['campaigns'] if c['name']=='Two finding reviews')
    assert campaign['completion_denominator']==2
    assert action(coder,'review',id=second,value='resolved_unsupported',note='Reasoned no-addition conclusion for this question.').status_code==200
    assert action(qa,'qa',id=second,value='passed',note='Independent review confirms the no-addition disposition.').status_code==200
    campaign=next(c for c in analyst.get('/api/v1/bootstrap').json()['campaigns'] if c['name']=='Two finding reviews')
    assert campaign['completed_count']==1 and campaign['progress']==50
    assert len({t['finding_id'] for t in analyst.get('/api/v1/bootstrap').json()['tasks'] if t.get('campaign_id')==campaign['id']})==2


def test_reasoned_source_task_closure_does_not_publish_or_complete_coding():
    analyst=login();retrieval=login('retrieval');mid='MB-000006'
    task_id=action(analyst,'request_evidence',id=mid,note='Request a signed replacement.').json()['task_id']
    assert action(retrieval,'close_task',task_id=task_id,value='unable_to_obtain').status_code==400
    assert action(retrieval,'close_task',task_id=task_id,value='unable_to_obtain',note='The requested signed replacement could not be obtained.').status_code==200
    detail=retrieval.get('/api/v1/members/'+mid).json()
    task=next(t for t in detail['tasks'] if t['id']==task_id)
    assert task['status']=='closed' and task['completion']['complete']
    assert not detail['eligibility']['support_allowed'] and not detail['opportunities'][0]['completion']['complete']
    assert all(d['source_status']!='usable' for d in detail['documents'])
    assert action(analyst,'campaign',name='Coding must retain QA gate',member_ids=[mid],owner='coder',value='coding_review').status_code==200
    campaign_task=next(t for t in retrieval.get('/api/v1/members/'+mid).json()['tasks'] if t['type']=='campaign')
    assert action(retrieval,'close_task',task_id=campaign_task['id'],value='not_supported',note='Must not skip QA.').status_code==400


def test_campaign_exact_finding_preview_and_idempotency():
    second=add_second_finding();analyst=login()
    snapshot=analyst.get('/api/v1/bootstrap').json()
    row=next(o for o in snapshot['opportunities'] if o['id']==second)
    covered=['MB-000001'] if any(c['status']=='active' and 'MB-000001' in c['member_ids'] for c in snapshot['campaigns']) else []
    payload={'name':'Same member distinct findings','member_ids':['MB-000001'],'finding_ids':[second],
             'owner':'coder','value':'coding_review','expected_versions':{second:row['version']},'expected_covered':covered}
    assert action(analyst,'campaign',**payload).status_code==200
    assert action(analyst,'campaign',**payload).status_code==200
    other={**payload,'finding_ids':['OP-0001']}
    other.pop('expected_versions');other.pop('expected_covered')
    assert action(analyst,'campaign',**other).status_code==200
    campaigns=[c for c in analyst.get('/api/v1/bootstrap').json()['campaigns'] if c['name']==payload['name']]
    assert len(campaigns)==2 and {tuple(c['finding_ids']) for c in campaigns}=={(second,),('OP-0001',)}


def test_current_morgan_source_and_independent_qa_change_only_supported_score():
    mid='MB-000002';config=risk_inputs.DEFAULT_CONFIG
    analyst=login();coder=login('coder');qa=login('qa');provider=login('provider2');retrieval=login('retrieval')
    baseline_run=analyst.post('/api/v1/risk/calculate',json={'member_id':mid,'config_id':config}).json()
    assert baseline_run['status']=='completed'
    def stage_rows():
        with main.db() as conn:
            return {basis:risk_store.current(conn,mid,config,basis) for basis in risk_inputs.BASES}
    historical=deepcopy(coder.get('/api/v1/members/'+mid).json()['documents'][0])
    detail=coder.get('/api/v1/members/'+mid).json()
    assert 'prepared_code' not in detail['opportunities'][0]
    assert action(coder,'review',id=mid,value='resolved_supported',note='History alone is insufficient.').status_code==400
    assert action(coder,'review',id=mid,value='resolved_unsupported',note='No current assessment in the retained historical-only record.').status_code==200
    assert action(qa,'qa',id=mid,value='passed',note='Historical evidence cannot support a current addition.').status_code==200
    assert stage_rows()['qa_supported'] is None
    assert action(provider,'later_encounter',id=mid).status_code==200
    assert 'prepared_code' not in coder.get('/api/v1/members/'+mid).json()['opportunities'][0]
    assert retrieval.post('/api/v1/intake/publish',json={'member_id':mid,'document_id':'DOC-0005'}).status_code==200
    detail=coder.get('/api/v1/members/'+mid).json();finding=detail['opportunities'][0]
    code=finding['prepared_code']
    assert code['code']=='J44.9' and code['description']=='Chronic obstructive pulmonary disease, unspecified'
    assert code['source_eligibility']['document_id']=='DOC-0005' and code['source_eligibility']['signed']
    assert code['code_reference']['validity_column']=='valid_ICD10_2026'
    assert code['mapping_reference']['category']=='HCC280'
    assert stage_rows()['qa_supported'] is None
    assert action(coder,'review',id=mid,value='resolved_supported',note='The exact published September assessment supports J44.9.').status_code==200
    assert stage_rows()['qa_supported'] is None
    assert action(qa,'qa',id=mid,value='passed',note='Independent inspection confirms the current signed source and code reference.').status_code==200
    stages=stage_rows()
    assert stages['captured_baseline']['id']==baseline_run['id']
    assert stages['qa_supported']['status']=='completed' and stages['qa_supported']['raw_score']>baseline_run['raw_score']
    assert all(stages[basis] is None for basis in ('submitted','accepted','eligible','reported','potential'))
    with main.db() as conn:
        inputs=risk_store.get_input(conn,stages['qa_supported']['snapshot_id'])
    approved=next(d for d in inputs['diagnoses'] if d['code']=='J449')
    assert approved['source_id']=='DOC-0005' and approved['service_date']=='2026-09-18'
    detail=coder.get('/api/v1/members/'+mid).json()
    assert next(d for d in detail['documents'] if d['id']==historical['id'])==historical
    history=detail['opportunities'][0]['decision_history']
    assert len(history)==2 and history[0]['code'] is None
    assert history[-1]['risk_context']['source_eligibility']['content_hash']==code['source_eligibility']['content_hash']


def test_riley_code_reference_requires_matching_signed_published_canonical_source():
    retrieval=login('retrieval');admin=login('superuser');mid='MB-000006'
    assert 'prepared_code' not in retrieval.get('/api/v1/members/'+mid).json()['opportunities'][0]
    assert action(admin,'later_encounter',id=mid,value='riley-mismatch').status_code==200
    assert retrieval.post('/api/v1/intake/publish',json={'member_id':mid,'document_id':'DOC-RILEY-MISMATCH'}).status_code==400
    assert action(admin,'later_encounter',id=mid,value='riley-replacement').status_code==200
    assert 'prepared_code' not in retrieval.get('/api/v1/members/'+mid).json()['opportunities'][0]
    assert retrieval.post('/api/v1/intake/publish',json={'member_id':mid,'document_id':'DOC-RILEY-SIGNED'}).status_code==200
    detail=retrieval.get('/api/v1/members/'+mid).json()
    code=detail['opportunities'][0]['prepared_code']
    assert code['source_eligibility']['document_id']=='DOC-RILEY-SIGNED'
    assert next(d for d in detail['documents'] if d['id']=='DOC-0009')['signature_status']=='missing'
    with main.db() as conn:
        state=main.get_state(conn);finding=assessment.opportunity(state,mid)
        extra=deepcopy(finding);extra['id']='OP-RILEY-SECOND'
        assert assessment.prepared_copd_code(state,extra) is None
        source=assessment.document(state,'DOC-RILEY-SIGNED')
        source['source_member_id']='MB-000007'
        assert assessment.prepared_copd_code(state,finding) is None
        source['source_member_id']=mid;source['signature_status']='missing'
        assert assessment.prepared_copd_code(state,finding) is None
        source['signature_status']='signed';source['date']='2026-10-01'
        assert assessment.prepared_copd_code(state,finding) is None
