"""Authorized presentation reports, immutable saves and reproducible exports."""
from collections import OrderedDict
from copy import deepcopy
import json
from threading import RLock

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel, Field

from . import analytics_experience as model, risk_service, risk_store, member360_analytics

_CACHE = OrderedDict()
_LOCK = RLock()


class AnalysisRequest(BaseModel):
    config_id: str = 'ma_v28_py2027_forecast'
    context: dict = Field(default_factory=dict)
    report_id: str = 'R01'
    name: str = Field(default='Saved analysis', max_length=120)
    snapshot_hash: str | None = None
    saved_id: str | None = None
    format: str = 'json'
    ids: list[str] | None = Field(default=None, max_length=10000)
    excerpts: bool = False
    mode: str = 'illustrative'
    operation: str = 'combined'


def register(app, *, db, user, get_state, allowed_members, permit, roles):
    router = APIRouter(prefix='/api/v1/analytics', tags=['Analytics and suspecting'])

    def fail(message, status=400):
        raise HTTPException(status, detail={'code':'ANALYTICS_REQUEST', 'message':message})

    def access(u):
        if not set(roles[u['role']]['screens']) & {'overview','analytics','suspects','providers'}:
            fail('Your role does not have analytics or suspect-inspection access.',403)

    def scoped_members(state, u):
        return allowed_members(state, u) + member360_analytics.members_for(u, roles)

    def make(conn, u, config_id, context):
        access(u)
        state=get_state(conn); members=scoped_members(state,u)
        try: config=risk_service.configuration(config_id,conn)
        except ValueError as e: fail(str(e))
        if config['program'] != 'MA':
            members = [m for m in members if not m.get('profile_reference')]
        key=model.digest([config_id,context,sorted(m['id'] for m in members),
            [(m['id'],m.get('county'),m['provider_id'],m.get('provider'),m.get('age'),m.get('sex'),m.get('condition')) for m in members],
            state['opportunities'],state.get('documents',[]),model.VERSION,model.METHOD,roles[u['role']]['actions']])
        with _LOCK:
            cached=_CACHE.get(key)
            if cached:
                _CACHE.move_to_end(key)
                return deepcopy(cached),members
        try: report=model.build(state,members,config,context,include_evidence='open_evidence' in roles[u['role']]['actions'])
        except (ValueError,TypeError,KeyError) as e: fail(str(e))
        with _LOCK:
            _CACHE[key]=deepcopy(report)
            while len(_CACHE)>16: _CACHE.popitem(last=False)
        return report,members

    def saved(conn,u,sid):
        access(u)
        row=conn.execute('SELECT body FROM risk_records WHERE id=? AND kind=?',(sid,'analytics_report')).fetchone()
        value=risk_store.body(row)
        if not value or value['actor_id']!=u['id']: fail('Saved report is unavailable.',404)
        current={m['id'] for m in scoped_members(get_state(conn),u)}
        if not set(value['member_scope']) <= current:
            fail('Your authorized scope changed. Create a new authorized report from the current filters; the original snapshot is unchanged.',403)
        if value.get('included_evidence') and 'open_evidence' not in roles[u['role']]['actions']:
            fail('Source access changed. Create a new report with your current permissions.',403)
        return value

    @router.get('/experience')
    def experience(config_id: str='ma_v28_py2027_forecast', context: str='{}', u=Depends(user)):
        try:
            ctx=json.loads(context)
            if not isinstance(ctx,dict): raise ValueError()
        except (ValueError,TypeError): fail('Invalid analysis context.')
        with db() as conn:
            return make(conn,u,config_id,ctx)[0]

    @router.get('/reports')
    def reports(u=Depends(user)):
        access(u)
        with db() as conn:
            current={m['id'] for m in scoped_members(get_state(conn),u)}
            items=[]
            for v in risk_store.records(conn,'analytics_report',limit=100):
                if v['actor_id']!=u['id']: continue
                permitted=set(v['member_scope']) <= current
                # Do not leak saved restricted totals or titles after a scope loss.
                items.append(dict(id=v['id'],name=v['name'] if permitted else 'Restricted saved report',
                    report_id=v['report_id'] if permitted else '',created_at=v['created_at'],available=permitted,
                    snapshot_hash=v['report']['snapshot_hash'] if permitted else None))
            return {'items':items}

    @router.post('/reports')
    def save(body:AnalysisRequest,u=Depends(user)):
        permit(u,'export')
        with db() as conn:
            report,members=make(conn,u,body.config_id,body.context)
            if body.snapshot_hash and body.snapshot_hash!=report['snapshot_hash']:
                fail('The underlying analysis changed. Refresh before saving a new version.',409)
            record=risk_store.record(conn,'analytics_report',dict(actor_id=u['id'],name=body.name,
                report_id=body.report_id,report=report,member_scope=[m['id'] for m in members],
                included_evidence='open_evidence' in roles[u['role']]['actions']))
            return {'id':record['id'],'name':record['name'],'snapshot_hash':report['snapshot_hash']}

    @router.get('/reports/{sid}')
    def open_saved(sid:str,u=Depends(user)):
        with db() as conn:
            value=saved(conn,u,sid)
            return dict(id=value['id'],name=value['name'],report_id=value['report_id'],report=value['report'])

    @router.post('/export')
    def export(body:AnalysisRequest,u=Depends(user)):
        permit(u,'export')
        if body.excerpts: permit(u,'open_evidence')
        if body.format not in ('csv','json','zip'): fail('Choose CSV, JSON or ZIP.')
        if body.report_id not in {r[0] for r in model.REPORTS}|{'registry'}: fail('Unknown report.')
        with db() as conn:
            report=saved(conn,u,body.saved_id)['report'] if body.saved_id else make(conn,u,body.config_id,body.context)[0]
            if body.snapshot_hash and report['snapshot_hash']!=body.snapshot_hash:
                fail('The visible report has changed. Refresh it or export a saved snapshot.',409)
            if body.ids is not None and not set(body.ids) <= {c['id'] for c in report['cases']}:
                fail('The selected cases are outside the current report scope.',403)
            data,mime=model.export_bundle(report,body.report_id,body.format,body.ids,body.excerpts)
            return Response(data,media_type=mime,headers={'Content-Disposition':f'attachment; filename="perform-plus-{body.report_id}.{body.format}"','Cache-Control':'no-store'})

    @router.post('/scenario')
    def scenario(body:AnalysisRequest,u=Depends(user)):
        permit(u,'risk_scenario')
        with db() as conn:
            report,members=make(conn,u,body.config_id,body.context)
            requested=set(body.ids or [])
            candidates=[c for c in report['cases'] if c['id'] in requested]
            if not requested or len(candidates)!=len(requested): fail('Select authorized cases from the current report.')
            if body.mode=='calculated':
                if any(c.get('profile_reference') for c in candidates):
                    fail('Member 360 reference cases require validated model inputs before calculation.',409)
                from collections import defaultdict
                from . import risk_inputs
                state=get_state(conn)
                member_map={m['id']:m for m in members}
                grouped=defaultdict(list)
                for c in candidates:
                    proposals=risk_inputs.candidate_changes(state,member_map[c['member_id']],body.config_id)
                    proposal=next((p for p in proposals if p['finding_id'] in c['aliases'] and p.get('code')),None)
                    if proposal is None: fail('A selected question has no executable native input. Select retained-source cases or use the illustrative scenario.',409)
                    grouped[c['member_id']].append(proposal)
                comparisons=[]
                try:
                    for mid,proposals in grouped.items():
                        baseline=risk_store.current(conn,mid,body.config_id,body.context.get('basis','captured_baseline'))
                        if baseline and baseline.get('stale'): fail('The selected native baseline is stale. Refresh its retained model inputs before comparison.',409)
                        if not baseline:
                            if body.context.get('basis','captured_baseline')!='captured_baseline': fail('No retained native result exists for the selected score basis.',409)
                            baseline=risk_service.calculate(conn,member_map[mid],body.config_id,actor=u['id'],publish=False)
                        if baseline['status']!='completed': fail('A complete native baseline is required.',409)
                        frozen=risk_store.get_input(conn,baseline['snapshot_id'])
                        additions=[];removals=[]
                        for p in proposals:
                            if p['operation']=='delete':
                                removals += [d['id'] for d in frozen['diagnoses'] if d.get('original_record_id')=='SUB-0001']
                            else: additions.append({'code':p['code'],'service_date':p.get('service_date') or risk_service.configuration(body.config_id)['service_end'],'source_id':p.get('source_id')})
                        comparison=risk_service.scenario(conn,member_map[mid],body.config_id,baseline_run_id=baseline['id'],additions=additions,removals=list(set(removals)),save=True,actor=u['id'],name=body.name)
                        stage_key='adjusted_score' if body.context.get('stage','adjusted')=='adjusted' else 'raw_score'
                        after=comparison['scenario'].get(stage_key);before=baseline.get(stage_key)
                        if before is None or after is None: fail('Native output is unavailable for the selected stage.',409)
                        comparisons.append({'delta':after-before,'weight':len(baseline.get('monthly_scores',[])),'baseline_run_id':baseline['id'],'scenario_run_id':comparison['scenario']['id']})
                    denominator=sum(c['weight'] for c in comparisons)
                    if not denominator: fail('The selected native cohort has no comparable exposure.',409)
                    result={'finding_count':len(candidates),'member_count':len(grouped),'selected_cohort_weighted_delta':sum(c['delta']*c['weight'] for c in comparisons)/denominator,'score_stage':body.context.get('stage','adjusted'),'basis':'Full-profile joint calculation; retained run references preserved; no clinical or stage mutation.','run_references':comparisons}
                    return {'mode':'calculated','result':result}
                except (ValueError,KeyError) as exc: fail(str(exc),409)
            if body.operation not in ('add','remove','combined'): fail('Choose add, remove or combined.')
            # A fixture joint effect de-duplicates same-HCC additions per member.
            # It is deliberately never labelled as a native full-profile calculation.
            joint={}; exclusions=[]
            for c in candidates:
                if c['delta'] is None or c['status']!='open': exclusions.append({'id':c['id'],'reason':'No compatible open scenario input'}); continue
                if body.operation=='add' and c['delta']<0 or body.operation=='remove' and c['delta']>=0: continue
                key=(c['member_id'],c['hcc'],c['direction'])
                old=joint.get(key)
                if old is None or abs(c['delta'])>abs(old['delta']):
                    if old: exclusions.append({'id':old['id'],'reason':'Overlapping member/category proposal'})
                    joint[key]=c
                else: exclusions.append({'id':c['id'],'reason':'Overlapping member/category proposal'})
            if not joint:
                fail('The selected conditions have no compatible score estimate. Inspect their member profiles and model mapping first.',409)
            pop={r['id']:r for r in model.population(members,report['config'],body.context)}
            weighted_delta=sum(c['delta']*pop[c['member_id']]['weight'] for c in joint.values() if pop[c['member_id']]['score'] is not None)
            denominator=report['summary']['member_months']
            delta=weighted_delta/denominator if denominator else None
            baseline=report['bases']['captured_baseline']
            result=dict(mode='illustrative',baseline=baseline,delta=delta,potential=baseline+delta if baseline is not None and delta is not None else None,
                cases=len(joint),members=len({c['member_id'] for c in joint.values()}),exclusions=exclusions,
                origin='Authored joint scenario; not native model execution',context=report['context'],snapshot_hash=report['snapshot_hash'])
            risk_store.record(conn,'analytics_scenario',dict(actor_id=u['id'],name=body.name,result=result,case_ids=sorted(requested)))
            return result

    app.include_router(router)
