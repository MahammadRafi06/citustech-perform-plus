"""Selected-member projections and stored calculation evidence; never recalculates."""
from __future__ import annotations

from copy import deepcopy
import hashlib
import json

from . import risk_store as store


def projection(value, allowed_member_ids):
    """Copy JSON; scope shared cohort identities without disguising a projection."""
    allowed=set(allowed_member_ids)
    redactions=[]
    cohort_fields={'expected_member_ids','member_ids','missing_member_ids'}
    def scoped(item,path=''):
        if isinstance(item,dict):
            result={}
            for key,child in item.items():
                child_path=path+'/'+key
                if key in cohort_fields and isinstance(child,list):
                    kept=[mid for mid in child if isinstance(mid,str) and mid in allowed]
                    if len(kept)!=len(child):
                        redactions.append({'path':child_path,'excluded_count':len(child)-len(kept)})
                    result[key]=kept
                else:result[key]=scoped(child,child_path)
            return result
        if isinstance(item,list):return [scoped(child,path+'/'+str(index)) for index,child in enumerate(item)]
        return deepcopy(item)
    result=scoped(value)
    if redactions:
        details={'redacted_fields':redactions,'redacted_count':sum(row['excluded_count'] for row in redactions),
                 'original_sha256':store.digest(value),'projection_sha256':store.digest(result),
                 'basis':'Shared cohort identities outside the requested member scope were removed. Original stored evidence is unchanged; this exported representation is a scoped projection.'}
        if isinstance(result,dict):result['scope_projection']=details
        else:result={'value':result,'scope_projection':details}
    return result


def selected_case_artifacts(conn,state,member_ids):
    """Return ZIP files for already-authorized selected members and a hash index."""
    selected=list(dict.fromkeys(member_ids));files={}
    manifest={'schema_version':1,'member_ids':selected,'exported_at':store.timestamp(),
              'basis':'Stored member calculation evidence; this export performs no calculation or model/configuration refresh.',
              'stage_basis':'Stage pointers describe export-time state. Each retained run and input keeps its original calculation basis.',
              'scope':'Selected members only. Population batches and multi-member import reports are excluded.',
              'members':[]}
    def retain(path,value):
        files[path]=json.dumps(projection(value,selected),ensure_ascii=False,indent=2).encode('utf-8')
        return path
    for mid in selected:
        prefix='risk/members/'+mid
        runs=[store.body(row) for row in conn.execute('SELECT body FROM risk_runs WHERE member_id=? ORDER BY created_at,id',(mid,))]
        snapshots=[store.body(row) for row in conn.execute('SELECT body FROM risk_inputs WHERE member_id=? ORDER BY created_at,id',(mid,))]
        if any(row.get('member_id')!=mid for row in runs+snapshots):
            raise ValueError('A stored calculation artifact does not match its selected member scope.')
        run_by_id={row['id']:row for row in runs};input_by_id={row['id']:row for row in snapshots}
        entry={'member_id':mid,'runs':[],'input_snapshots':[],'missing_links':[],
               'run_count':len(runs),'snapshot_count':len(snapshots)}
        if not runs:entry['missing_links'].append({'kind':'calculation','reason':'No calculation run is retained for this member.'})
        for snapshot in snapshots:
            path=retain(prefix+'/inputs/'+snapshot['id']+'.json',snapshot)
            entry['input_snapshots'].append({'id':snapshot['id'],'input_hash':snapshot.get('input_hash'),'path':path,
                'run_ids':[run['id'] for run in runs if run['snapshot_id']==snapshot['id']]})
        for run in runs:
            rid=run['id'];sid=run['snapshot_id']
            item={'id':rid,'config_id':run['config_id'],'score_basis':run['score_basis'],'status':run['status'],
                  'snapshot_id':sid,'created_at':run['created_at'],
                  'run_path':retain(prefix+'/runs/'+rid+'.json',run),
                  'input_path':prefix+'/inputs/'+sid+'.json' if sid in input_by_id else None}
            if sid not in input_by_id:entry['missing_links'].append({'kind':'input_snapshot','run_id':rid,'snapshot_id':sid,'reason':'The original stored input is unavailable; no current input was substituted.'})
            configuration=run.get('configuration_snapshot')
            if configuration is None:
                configuration={'basis':'Only configuration identity retained on the original run is available; no current configuration was substituted.',
                    'full_snapshot_available':False,**{key:run[key] for key in
                     ('config_id','program','year','run_type','model_version','software_release','asset_sha256','component_sha256','adapter_sha256','precision','service_start','service_end') if key in run}}
                entry['missing_links'].append({'kind':'configuration_snapshot','run_id':rid,'reason':'Full configuration snapshot was not retained on this original run.'})
            item['configuration_path']=retain(prefix+'/configurations/'+rid+'.json',configuration)
            ledger={key:deepcopy(run[key]) for key in ('member_id','config_id','score_basis','status','raw_score','adjusted_score',
                'selected_segment','precision','components','categories','exclusions','transformations','monthly_scores',
                'reference_output','monthly_reference_outputs','provenance','warnings','errors','input_hash','asset_sha256',
                'component_sha256','adapter_sha256','origin','synthetic') if key in run}
            ledger.update(run_id=rid,snapshot_id=sid)
            item['ledger_path']=retain(prefix+'/ledgers/'+rid+'.json',ledger)
            entry['runs'].append(item)
        stages=[dict(row) for row in conn.execute('SELECT member_id,config_id,score_basis,run_id,stale,reason FROM risk_stages WHERE member_id=? ORDER BY config_id,score_basis',(mid,))]
        if any(row['run_id'] not in run_by_id for row in stages):
            raise ValueError('A current stage does not reference a retained calculation for its selected member.')
        entry['stages_path']=retain(prefix+'/stages.json',{'member_id':mid,'as_of':manifest['exported_at'],'items':stages})
        records=[];scenarios=[]
        kinds={'scenario','workflow_input','receiver_eligibility','reported_reconciliation','opportunity_impact','combined_impact'}
        for stored in conn.execute('SELECT kind,body FROM risk_records WHERE member_id=? ORDER BY created_at,id',(mid,)):
            if stored['kind'] not in kinds:continue
            record=store.body(stored)
            if record.get('member_id',mid)!=mid:
                raise ValueError('A stored workflow reference does not match its selected member scope.')
            if stored['kind']=='scenario':
                references={}
                for key in ('baseline','scenario'):
                    retained=record.get(key) or {};rid=retained.get('id')
                    if retained.get('member_id')!=mid or rid not in run_by_id:
                        raise ValueError('A saved scenario contains an unavailable or out-of-scope calculation reference.')
                    references[key+'_run_id']=rid
                    references[key+'_snapshot_id']=run_by_id[rid]['snapshot_id']
                scenarios.append({'record':record,'references':references})
            else:records.append({'kind':stored['kind'],'record':record})
        entry['scenarios_path']=retain(prefix+'/scenarios.json',{'member_id':mid,'items':scenarios,
            'basis':'Saved comparisons retain their original baseline and comparison run references. Unpublished potential runs remain in runs even without a saved comparison.'})
        entry['scenario_count']=len(scenarios)
        entry['workflow_records_path']=retain(prefix+'/workflow-records.json',{'member_id':mid,'items':records})
        from . import risk_ai
        replay_evidence=[]
        for replay in risk_ai.load_replays():
            if replay['member_id']!=mid:continue
            validation=risk_ai.validate_replay(replay,state,mid)
            if any(error['code'] in ('MEMBER_MISMATCH','SOURCE_MEMBER_MISMATCH','OUTPUT_MEMBER_MISMATCH','CITATION_SCOPE') for error in validation['errors']):
                raise ValueError('Retained AI evidence contains an out-of-scope member reference.')
            replay_evidence.append({'artifact':replay,'current_input_validation':validation,
                'usable_for_current_source_set':validation['valid'],'mode':'retained_evidence_only',
                'basis':'Original model-authored output retained as evidence. Export is not a live inference, replay exposure or clinical approval.'})
        entry['ai_replays_path']=retain(prefix+'/ai-replays.json',{'member_id':mid,'items':replay_evidence})
        entry['ai_replay_count']=len(replay_evidence)
        manifest['members'].append(entry)
    manifest['files']=[{'path':path,'sha256':hashlib.sha256(payload).hexdigest(),'bytes':len(payload)} for path,payload in sorted(files.items())]
    return manifest,files
