"""Receiver results stay separate from clinical approval and full-member scoring."""
from copy import deepcopy

from test_demo import action, baseline, database, login, main
from apps.api.app import risk_inputs, risk_store

CONFIG = risk_inputs.DEFAULT_CONFIG


def accepted_record(mid='MB-000001'):
    analyst=login();coder=login('coder');qa=login('qa');submission=login('submission')
    body={'member_id':mid,'config_id':CONFIG}
    baseline_result=analyst.post('/api/v1/risk/calculate',json=body)
    assert baseline_result.status_code==200,baseline_result.text
    assert baseline_result.json()['status']=='completed',baseline_result.json()
    disposition='resolved_unsupported' if mid=='MB-000004' else 'resolved_supported'
    assert action(coder,'review',id=mid,value=disposition,note='Reviewed the exact authored source and intended code operation.').status_code==200
    assert action(qa,'qa',id=mid,value='passed',note='Independent review confirms this exact source-bound operation.').status_code==200
    prepared=action(submission,'prepare',id=mid)
    assert prepared.status_code==200,prepared.text
    sid=prepared.json()['submission_id']
    assert action(submission,'receiver',id=sid,value='accepted').status_code==200
    return analyst,submission,sid,baseline_result.json()


def stage_rows(client,mid):
    value=client.get('/api/v1/risk/members/'+mid+'/reconciliation?config_id='+CONFIG)
    assert value.status_code==200,value.text
    return value.json(),{r['basis']:r['run'] for r in value.json()['stages']}


def test_acceptance_eligibility_and_independent_report_are_distinct():
    analyst,submission,sid,baseline_run=accepted_record()
    before,stages=stage_rows(submission,'MB-000001')
    assert stages['accepted']['status']=='completed' and stages['eligible'] is None and stages['reported'] is None
    accepted_run_id=stages['accepted']['id']
    result=submission.post('/api/v1/risk/submissions/'+sid+'/eligibility',json={'fixture_id':'ELIG-JORDAN-NOT-ELIGIBLE'})
    assert result.status_code==200,result.text
    assert result.json()['eligibility_status']=='ineligible' and result.json()['score_status']=='completed'
    after,stages=stage_rows(submission,'MB-000001')
    assert stages['accepted']['id']==accepted_run_id
    assert stages['eligible']['raw_score']==baseline_run['raw_score']
    with main.db() as conn:
        eligible=risk_store.get_input(conn,stages['eligible']['snapshot_id'])
        assert {d['code'] for d in eligible['diagnoses']}=={'I10'}
    repeated=submission.post('/api/v1/risk/submissions/'+sid+'/eligibility',json={'fixture_id':'ELIG-JORDAN-NOT-ELIGIBLE'})
    assert repeated.json()['replayed'] and repeated.json()['id']==result.json()['id']
    assert len(stage_rows(submission,'MB-000001')[0]['eligibility_results'])==1
    report=submission.post('/api/v1/risk/submissions/'+sid+'/report',json={'fixture_id':'REPORT-JORDAN-MISSING'}).json()
    assert report['status']=='discrepancy' and report['discrepancies'][0]['kind']=='missing_diagnosis'
    assert report['reported_score'] is None and report['payment_reconciliation']=='unreconciled'
    assert stage_rows(submission,'MB-000001')[1]['reported'] is None
    qualified=submission.post('/api/v1/risk/submissions/'+sid+'/eligibility',json={'fixture_id':'ELIG-JORDAN-QUALIFIED'}).json()
    assert qualified['eligibility_status']=='eligible'
    current,stages=stage_rows(submission,'MB-000001')
    assert stages['eligible']['raw_score']==stages['accepted']['raw_score']
    assert len(current['eligibility_results'])==2
    assert current['report_results'][0]['diagnosis_eligibility']=='ineligible'


def test_report_model_period_and_record_versions_remain_independent():
    analyst,submission,sid,_=accepted_record()
    expected={'REPORT-JORDAN-OTHER-MODEL':'model_mismatch','REPORT-JORDAN-PRIOR-PERIOD':'period_mismatch','REPORT-JORDAN-SUPERSEDED':'superseded_record'}
    for fixture,kind in expected.items():
        response=submission.post('/api/v1/risk/submissions/'+sid+'/report',json={'fixture_id':fixture})
        assert response.status_code==200,response.text
        result=response.json()
        assert not result['comparable'] and kind in {d['kind'] for d in result['discrepancies']}
    matched=submission.post('/api/v1/risk/submissions/'+sid+'/report',json={'fixture_id':'REPORT-JORDAN-PRESENT'}).json()
    assert matched['status']=='matched' and matched['expected']['record_presence']==matched['reported']['record_presence']=='present'
    assert matched['reported_score'] is None
    value,_=stage_rows(submission,'MB-000001')
    assert len(value['report_results'])==4 and len(next(r for r in value['submissions'] if r['id']==sid)['report_history'])==4
    assert len({r['fixture']['content_hash'] for r in value['report_results']})==4


def test_eligible_deletion_removes_only_approved_occurrence(monkeypatch):
    with main.db() as conn:
        state=main.get_state(conn)
        member=next(m for m in state['members'] if m['id']=='MB-000004')
        baseline_input=risk_inputs.member_input(member,CONFIG)
    retained=deepcopy(baseline_input['diagnoses'][0])
    retained.update(id='DX-TAYLOR-INDEPENDENT',original_record_id='SUB-INDEPENDENT',source_id='CLAIM-INDEPENDENT')
    baseline_input['diagnoses'].append(retained)
    original_inventory=risk_inputs.member_input
    monkeypatch.setattr(risk_inputs,'member_input',lambda member,config_id=CONFIG:deepcopy(baseline_input) if member['id']=='MB-000004' and config_id==CONFIG else original_inventory(member,config_id))
    analyst,submission,sid,baseline_run=accepted_record('MB-000004')
    result=submission.post('/api/v1/risk/submissions/'+sid+'/eligibility',json={'fixture_id':'ELIG-TAYLOR-DELETION'})
    assert result.status_code==200,result.text
    assert result.json()['score_status']=='completed'
    value,stages=stage_rows(submission,'MB-000004')
    with main.db() as conn:
        eligible=risk_store.get_input(conn,stages['eligible']['snapshot_id'])
    assert [d['id'] for d in eligible['diagnoses']]==['DX-TAYLOR-INDEPENDENT']
    assert stages['eligible']['raw_score']==baseline_run['raw_score']
    report=submission.post('/api/v1/risk/submissions/'+sid+'/report',json={'fixture_id':'REPORT-TAYLOR-REMOVED'}).json()
    assert report['status']=='matched' and report['expected']['operation']=='delete'
    assert report['fixture']['coverage'].startswith('Selected diagnosis occurrence only')


def test_receiver_fixture_requires_accepted_approved_operation_and_scoped_actor():
    submission=login('submission');coder=login('coder')
    before=submission.post('/api/v1/risk/submissions/SUB-0001/eligibility',json={'fixture_id':'ELIG-TAYLOR-DELETION'})
    assert before.status_code==400 and before.json()['error']['code']=='APPROVAL_REQUIRED'
    _,submission,sid,_=accepted_record()
    assert coder.post('/api/v1/risk/submissions/'+sid+'/report',json={'fixture_id':'REPORT-JORDAN-PRESENT'}).status_code==403
    assert login('provider2').get('/api/v1/risk/members/MB-000001/reconciliation').status_code==404
    assert submission.post('/api/v1/risk/submissions/'+sid+'/eligibility',json={'fixture_id':'ELIG-TAYLOR-DELETION'}).status_code==400
    assert submission.post('/api/v1/risk/submissions/'+sid+'/report',json={'fixture_id':'REPORT-JORDAN-PRESENT','reported_score':100}).status_code==422
