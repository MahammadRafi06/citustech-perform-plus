"""Selected-case packages retain old calculations and scope shared feed metadata."""
from copy import deepcopy
import hashlib
import io
import json
import zipfile

from test_demo import baseline, database, login, main
from apps.api.app import risk_exports, risk_inputs, risk_store

CONFIG=risk_inputs.DEFAULT_CONFIG
MID='MB-000001'


def calculate(client,mid=MID):
    result=client.post('/api/v1/risk/calculate',json={'member_id':mid,'config_id':CONFIG})
    assert result.status_code==200,result.text
    assert result.json()['status']=='completed',result.json()
    return result.json()


def package(client):
    result=client.post('/api/v1/downloads',json={'kind':'audit','ids':[MID]})
    assert result.status_code==200,result.text
    assert result.headers['content-type']=='application/zip'
    return result.content


def read(payload):
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        values={name:json.loads(archive.read(name)) for name in archive.namelist() if name.endswith('.json')}
        risk_manifest=values['risk/manifest.json']
        for entry in risk_manifest['files']:
            assert hashlib.sha256(archive.read(entry['path'])).hexdigest()==entry['sha256']
        return values


def test_reopened_case_export_preserves_actual_old_inputs_after_recalculation(monkeypatch):
    analyst=login();qa=login('qa')
    original=calculate(analyst)
    other=calculate(analyst,'MB-000002')
    scenario=analyst.post('/api/v1/risk/scenarios',json={'member_id':MID,'config_id':CONFIG,
        'baseline_run_id':original['id'],'add_codes':[{'code':'I50.22'},{'code':'NOT_A_CODE'}],
        'name':'Retained baseline with valid and excluded inputs','save':True})
    assert scenario.status_code==200,scenario.text
    comparison=scenario.json()
    assert comparison['scenario']['exclusions']
    with main.db() as conn:
        first_input=deepcopy(risk_store.get_input(conn,original['snapshot_id']))
        original_run=deepcopy(risk_store.get_run(conn,original['id']))
    first_zip=package(qa);first=read(first_zip)
    original_inventory=risk_inputs.member_input
    def updated_inventory(member,config_id=CONFIG):
        value=original_inventory(member,config_id)
        if member['id']==MID and config_id==CONFIG:
            value['diagnoses'].append(risk_inputs.diagnosis(MID,'J449','2026-08-20','NEW-CAPTURE','CLAIM-NEW-CAPTURE'))
        return value
    monkeypatch.setattr(risk_inputs,'member_input',updated_inventory)
    latest=calculate(analyst)
    assert latest['id']!=original['id'] and latest['snapshot_id']!=original['snapshot_id']
    with main.db() as conn:
        runs_before=conn.execute('SELECT count(*) n FROM risk_runs').fetchone()['n']
        state_before=main.get_state(conn)
    second=read(package(qa))
    prefix='risk/members/'+MID
    assert second[prefix+'/runs/'+original['id']+'.json']==original_run
    assert second[prefix+'/inputs/'+original['snapshot_id']+'.json']==first_input
    assert second[prefix+'/configurations/'+original['id']+'.json']==original_run['configuration_snapshot']
    assert [row['code'] for row in first_input['diagnoses']]==['I10']
    assert {row['code'] for row in second[prefix+'/inputs/'+latest['snapshot_id']+'.json']['diagnoses']}=={'I10','J449'}
    ledger=second[prefix+'/ledgers/'+comparison['scenario']['id']+'.json']
    assert ledger['exclusions']==comparison['scenario']['exclusions']
    assert ledger['precision']==comparison['scenario']['precision'] and ledger['components']==comparison['scenario']['components']
    assert ledger['provenance']==comparison['scenario']['provenance']
    stages=second[prefix+'/stages.json']['items']
    assert next(row for row in stages if row['score_basis']=='captured_baseline')['run_id']==latest['id']
    saved=second[prefix+'/scenarios.json']['items'][0]
    assert saved['references']['baseline_run_id']==original['id']
    assert saved['references']['baseline_snapshot_id']==original['snapshot_id']
    assert saved['references']['scenario_run_id']==comparison['scenario']['id']
    replays=second[prefix+'/ai-replays.json']['items']
    assert replays[0]['artifact']['member_id']==MID and replays[0]['mode']=='retained_evidence_only'
    assert replays[0]['artifact']['provenance']['exact_model_version'] is None
    assert second['manifest.json']['members']==[MID] and second['risk/manifest.json']['member_ids']==[MID]
    assert second['manifest.json']['risk_evidence']['run_count']==3
    assert 'cases/'+MID+'.json' in second and 'evidence/DOC-0001.json' in second
    original_doc=next(doc for doc in json.loads(main.SEED.read_text())['documents'] if doc['id']=='DOC-0001')
    assert second['evidence/DOC-0001.json']['pages']==original_doc['pages']
    serialized=json.dumps(second)
    assert 'MB-000002' not in serialized and other['id'] not in serialized
    assert read(first_zip)==first  # Reopening the earlier archive retains its original artifacts.
    with main.db() as conn:
        assert conn.execute('SELECT count(*) n FROM risk_runs').fetchone()['n']==runs_before
        assert main.get_state(conn)==state_before


def test_external_feed_cohort_metadata_is_projected_with_original_hash_and_scope():
    admin=login('admin');qa=login('qa')
    feed=json.loads((main.ROOT/'seed/risk/medicaid-external-example.json').read_text())
    response=admin.post('/api/v1/risk/external-scores',json=feed)
    assert response.status_code==200,response.text
    with main.db() as conn:
        run=risk_store.current(conn,MID,'medicaid_fl_external','reported')
        original_run=risk_store.get_run(conn,run['id'])
        original_input=risk_store.get_input(conn,run['snapshot_id'])
    assert len(original_input['metadata']['expected_member_ids'])==6
    exported=read(package(qa));prefix='risk/members/'+MID
    snapshot=exported[prefix+'/inputs/'+run['snapshot_id']+'.json']
    assert snapshot['external_input']==original_input['external_input']
    assert snapshot['metadata']['expected_member_ids']==[MID]
    assert snapshot['scope_projection']['original_sha256']==risk_store.digest(original_input)
    assert snapshot['scope_projection']['redacted_count']==5
    assert snapshot['scope_projection']['redacted_fields']==[{'path':'/metadata/expected_member_ids','excluded_count':5}]
    copied_run=exported[prefix+'/runs/'+run['id']+'.json']
    assert copied_run['raw_score']==original_run['raw_score'] and copied_run['origin']=='external_import'
    assert copied_run['provenance']['expected_member_ids']==[MID]
    assert copied_run['scope_projection']['original_sha256']==risk_store.digest(original_run)
    assert all('MB-00000'+str(number) not in json.dumps(exported) for number in range(2,7))
    with main.db() as conn:
        assert risk_store.get_input(conn,run['snapshot_id'])==original_input
        assert risk_store.get_run(conn,run['id'])==original_run
    assert risk_exports.projection(original_input,feed['metadata']['expected_member_ids'])==original_input
    assert login('provider2').post('/api/v1/downloads',json={'kind':'audit','ids':[MID]}).status_code==403
    assert qa.post('/api/v1/downloads',json={'kind':'audit','ids':['MB-UNKNOWN']}).status_code==404
