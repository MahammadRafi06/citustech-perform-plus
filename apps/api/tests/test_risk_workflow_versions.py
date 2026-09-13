"""Approved finding versions replace their contribution without rewriting old scores."""
from copy import deepcopy

from test_demo import action, baseline, database, login, main
from apps.api.app import assessment, risk_inputs, risk_store

CONFIG = risk_inputs.DEFAULT_CONFIG
MEMBER = 'MB-000001'


def approve(coder, qa, finding_id='OP-0001', disposition='resolved_supported'):
    result=action(coder,'review',id=finding_id,value=disposition,
                  note='Reviewed this exact finding and retained source for the revised disposition.')
    assert result.status_code==200,result.text
    member=coder.get('/api/v1/members/'+MEMBER+'?finding='+finding_id).json()
    decision=next(o for o in member['opportunities'] if o['id']==finding_id)['current_decision_id']
    result=action(qa,'qa',id=finding_id,decision_id=decision,value='passed',
                  note='Independent review confirms the source-bound disposition for this exact decision version.')
    assert result.status_code==200,result.text
    return decision


def current(basis='qa_supported'):
    with main.db() as conn:
        run=risk_store.current(conn,MEMBER,CONFIG,basis)
        return run, risk_store.get_input(conn,run['snapshot_id']) if run else None


def test_later_unsupported_qa_removes_prior_finding_and_preserves_downstream_history():
    analyst=login();coder=login('coder');qa=login('qa');submission=login('submission');retrieval=login('retrieval')
    baseline_run=analyst.post('/api/v1/risk/calculate',json={'member_id':MEMBER,'config_id':CONFIG}).json()
    assert baseline_run['status']=='completed'
    first_decision=approve(coder,qa)
    first_run,first_inputs=current()
    assert first_run['raw_score']>baseline_run['raw_score']
    with main.db() as conn:
        retained_run=deepcopy(risk_store.get_run(conn,first_run['id']))
    prepared=action(submission,'prepare',id=MEMBER).json()
    assert action(submission,'receiver',id=prepared['submission_id'],value='accepted').status_code==200
    downstream={basis:current(basis)[0]['id'] for basis in ('submitted','accepted')}

    assert action(login('superuser'),'later_encounter',id=MEMBER,value='jordan-clarification').status_code==200
    assert retrieval.post('/api/v1/intake/publish',json={'member_id':MEMBER,'document_id':'DOC-JORDAN-CLARIFICATION'}).status_code==200
    assert current()[0]['id']==first_run['id']
    second_decision=approve(coder,qa,disposition='resolved_unsupported')
    latest,latest_inputs=current()
    assert latest['status']=='completed' and latest['id']!=first_run['id']
    assert latest['raw_score']==baseline_run['raw_score']
    assert not any(d.get('decision_id')==first_decision for d in latest_inputs['diagnoses'])
    assert latest_inputs['diagnoses']==current('captured_baseline')[1]['diagnoses']
    assert latest_inputs['workflow_basis']['decisions']==[{
        'finding_id':'OP-0001','decision_id':second_decision,
        'qa_id':latest_inputs['workflow_basis']['decisions'][0]['qa_id'],
        'decision':'resolved_unsupported','operation':'add','contribution':'none'}]
    assert current('captured_baseline')[0]['id']==baseline_run['id']
    assert {basis:current(basis)[0]['id'] for basis in downstream}==downstream
    assert all(current(basis)[0] is None for basis in ('eligible','reported','potential'))
    with main.db() as conn:
        assert risk_store.get_run(conn,first_run['id'])==retained_run
        assert risk_store.get_input(conn,first_run['snapshot_id'])==first_inputs
        state=main.get_state(conn)
        finding=assessment.opportunity(state,MEMBER)
    assert [d['id'] for d in finding['decision_history']]==[first_decision,second_decision]
    assert all(d.get('qa_id') for d in finding['decision_history'])


def test_successive_positive_versions_preserve_baseline_and_other_finding(monkeypatch):
    original_inventory=risk_inputs.member_input
    def inventory(member,config_id=CONFIG):
        value=original_inventory(member,config_id)
        if member['id']==MEMBER and config_id==CONFIG:
            value['diagnoses'].append(risk_inputs.diagnosis(MEMBER,'J449','2026-08-20','INDEPENDENT','CLAIM-INDEPENDENT'))
        return value
    monkeypatch.setattr(risk_inputs,'member_input',inventory)
    with main.db() as conn:
        state=main.get_state(conn,lock=True)
        original=assessment.opportunity(state,MEMBER)
        other={k:deepcopy(v) for k,v in original.items() if k not in ('analysis_basis_key','recommendation_history','current_decision_id')}
        other.update(id='OP-JORDAN-INDEPENDENT',finding_id='OP-JORDAN-INDEPENDENT',case_rule_id='',
                     condition='Independently reviewed overlapping heart failure evidence',
                     evidence_episode_id='EP-JORDAN-INDEPENDENT',decision_history=[],qa_history=[],
                     status='new',qa_status='not_submitted',reviewer=None,duplicate_of='OP-0001',
                     overlap_group='JORDAN-HF',clinical_context={
                         'state':'documented_gap','summary':'Independent review of the same explicitly authored assessment.',
                         'source_ids':['DOC-0001'],'support_allowed':True,'evidence':'Strong'})
        state['opportunities'].append(other)
        main.save_state(conn,state)
    analyst=login();coder=login('coder');qa=login('qa')
    baseline_run=analyst.post('/api/v1/risk/calculate',json={'member_id':MEMBER,'config_id':CONFIG}).json()
    assert baseline_run['status']=='completed'
    baseline_inputs=current('captured_baseline')[1]
    first_decision=approve(coder,qa)
    other_decision=approve(coder,qa,'OP-JORDAN-INDEPENDENT')
    previous,previous_inputs=current()
    with main.db() as conn:
        immutable=deepcopy(risk_store.get_run(conn,previous['id']))
    revised=approve(coder,qa)
    latest,latest_inputs=current()
    assert revised!=first_decision and latest['id']!=previous['id']
    assert latest['raw_score']==previous['raw_score']  # A new version/overlap is a valid zero score change.
    approved=[d for d in latest_inputs['diagnoses'] if d.get('decision_id')]
    assert {d['decision_id'] for d in approved}=={revised,other_decision}
    assert {d['finding_id'] for d in approved}=={'OP-0001','OP-JORDAN-INDEPENDENT'}
    assert len(approved)==2
    assert [d for d in latest_inputs['diagnoses'] if not d.get('decision_id')]==baseline_inputs['diagnoses']
    other_input=next(d for d in previous_inputs['diagnoses'] if d.get('decision_id')==other_decision)
    assert next(d for d in approved if d['decision_id']==other_decision)==other_input
    approve(coder,qa,disposition='resolved_unsupported')
    final,final_inputs=current()
    assert [d['decision_id'] for d in final_inputs['diagnoses'] if d.get('decision_id')]==[other_decision]
    assert final['raw_score']==latest['raw_score']  # The other qualifying finding still retains the category.
    assert [d for d in final_inputs['diagnoses'] if not d.get('decision_id')]==baseline_inputs['diagnoses']
    with main.db() as conn:
        assert risk_store.get_run(conn,previous['id'])==immutable
        assert risk_store.get_input(conn,previous['snapshot_id'])==previous_inputs
    assert current('captured_baseline')[0]['id']==baseline_run['id']
    assert all(current(basis)[0] is None for basis in ('submitted','accepted','eligible','reported','potential'))
