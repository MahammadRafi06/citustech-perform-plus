"""Scoped risk endpoints using the application's existing local auth and transaction boundaries."""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from threading import Lock
from pathlib import Path
import json
import hashlib
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from . import risk_inputs as inputs, risk_service as service, risk_store as store
from .risk_exports import projection

_workers = ThreadPoolExecutor(max_workers=1, thread_name_prefix='risk-batch')
_running = set()
_guard = Lock()


class Calculation(BaseModel):
    member_id: str
    config_id: str = inputs.DEFAULT_CONFIG
    basis: str = 'captured_baseline'
    input_snapshot: dict[str, Any] | None = None


class Scenario(BaseModel):
    member_id: str
    config_id: str = inputs.DEFAULT_CONFIG
    baseline_run_id: str | None = None
    add_codes: list[dict[str, str]] = Field(default_factory=list, max_length=100)
    remove_diagnosis_ids: list[str] = Field(default_factory=list, max_length=100)
    compare_config_id: str | None = None
    name: str = Field(default='', max_length=160)
    save: bool = False


class Batch(BaseModel):
    config_id: str = inputs.DEFAULT_CONFIG
    member_ids: list[str] | None = None


class Feed(BaseModel):
    metadata: dict[str, Any]
    rows: list[dict[str, Any]] = Field(max_length=10000)


class OpportunityCalculation(BaseModel):
    config_id: str = inputs.DEFAULT_CONFIG
    finding_ids: list[str] = Field(min_length=1, max_length=100)


def bad(message, status=400):
    raise HTTPException(status, detail={'code': 'RISK_REQUEST_INVALID', 'message': str(message)})


def public_batch(value):
    if not value:
        return None
    return {k: v for k, v in value.items() if k not in ('member_ids', 'pending_ids', 'completed_ids', 'actor_scope')}


def input_adapter_identity():
    return hashlib.sha256(Path(inputs.__file__).read_bytes()).hexdigest()


def register(app, *, db, user, get_state, save_state, member, allowed_members, permit, event, roles):
    router = APIRouter(prefix='/api/v1/risk', tags=['Risk adjustment'])

    def access(conn, u, mid):
        s = get_state(conn)
        return s, member(s, u, mid)

    def run_access(conn, u, rid):
        run = store.get_run(conn, rid)
        if not run:
            bad('Calculation run not found.', 404)
        state, _ = access(conn, u, run['member_id'])
        return projection(run, {m['id'] for m in allowed_members(state, u)})

    def batch_access(conn, u, bid):
        value = store.get_batch(conn, bid)
        if not value:
            bad('Batch not found.', 404)
        allowed = {m['id'] for m in allowed_members(get_state(conn), u)}
        if not set(value['member_ids']) <= allowed:
            bad('Batch is outside your member scope.', 404)
        return value

    def execute_batch(bid):
        try:
            with db() as conn:
                batch = store.get_batch(conn, bid)
                state = get_state(conn)
                selected_ids = set(batch['member_ids'])
                selected = {m['id']: m for m in state['members'] if m['id'] in selected_ids}
                batch['status'] = 'running'
                cfg = service.configuration(batch['config_id'], conn)
                retained_cfg = batch.get('configuration_snapshot')
                binding = ('asset_sha256', 'component_sha256', 'adapter_sha256', 'service_start', 'service_end')
                if retained_cfg and any(retained_cfg.get(k) != cfg.get(k) for k in binding):
                    raise ValueError('The model configuration changed. Start a new batch; the earlier batch remains retained.')
                if batch.get('fixture_version') != inputs.FIXTURE_VERSION:
                    raise ValueError('The scoring fixture changed. Start a new batch for the revised inputs.')
                if batch.get('input_adapter_sha256') != input_adapter_identity():
                    raise ValueError('The input adapter changed or was not bound by this older batch. Start a new batch; retained results are unchanged.')
                batch['configuration_snapshot'] = retained_cfg or cfg
                store.save_batch(conn, batch)
            pending = list(batch['pending_ids'])
            for start in range(0, len(pending), 100):
                mids = pending[start:start+100]
                values = [inputs.member_input(selected[mid], batch['config_id']) for mid in mids]
                model = service.engine()
                if not hasattr(model, 'calculate_many'):
                    raise RuntimeError('The configured model has no batch execution contract installed.')
                results = model.calculate_many(batch['config_id'], values)
                if len(results) != len(values):
                    raise RuntimeError('Model output does not reconcile to the batch input count.')
                with db() as conn:
                    batch = store.get_batch(conn, bid)
                    for value, result in zip(values, results):
                        if result.get('member_id') != value['member_id']:
                            raise RuntimeError('Model output member identity does not match its input snapshot.')
                        if service.member_eligibility_excluded(value):
                            result = service.eligibility_exclusion(cfg, value)
                        result['configuration_snapshot'] = cfg
                        result['adapter_sha256'] = cfg.get('adapter_sha256')
                        frozen = store.snapshot(conn, batch['config_id'], value)
                        run = store.save_run(conn, frozen, result, 'captured_baseline', actor=batch['actor_id'])
                        mid = value['member_id']
                        batch['pending_ids'].remove(mid)
                        batch['completed_ids'].append(mid)
                        if run['status'] == 'completed':
                            batch['succeeded'] += 1
                        else:
                            batch['failed'] += 1
                            batch['errors'].append({'member_id': mid, 'run_id': run['id'], 'errors': run.get('errors', [])})
                    batch['processed'] = len(batch['completed_ids'])
                    store.save_batch(conn, batch)
            with db() as conn:
                batch = store.get_batch(conn, bid)
                batch['status'] = 'completed' if batch['failed'] == 0 else 'partially_scored'
                store.save_batch(conn, batch)
        except Exception as exc:
            with db() as conn:
                batch = store.get_batch(conn, bid)
                if batch:
                    batch['status'] = 'interrupted'
                    batch['last_error'] = str(exc)
                    store.save_batch(conn, batch)
        finally:
            with _guard:
                _running.discard(bid)

    def dispatch(bid):
        with _guard:
            if bid not in _running:
                _running.add(bid)
                _workers.submit(execute_batch, bid)

    @router.get('/configurations')
    def configs(u=Depends(user)):
        with db() as conn:
            return {'items': service.configurations(conn), 'default_config_id': inputs.DEFAULT_CONFIG,
                    'permissions': roles[u['role']]['actions']}

    @router.post('/configurations/{config_id}/activate')
    def activate(config_id: str, u=Depends(user)):
        permit(u, 'model_manage')
        with db() as conn:
            try:
                cfg = service.configuration(config_id, conn)
            except ValueError as exc:
                bad(exc)
            if cfg.get('status') not in ('validated', 'validated for declared scope', 'active'):
                bad('Independent declared-scope validation must pass before activation.', 409)
            record = store.record(conn, 'activation', {'config_id': config_id, 'asset_sha256': cfg.get('asset_sha256'),
                                   'component_sha256': cfg.get('component_sha256'), 'adapter_sha256': cfg.get('adapter_sha256'),
                                   'configuration': cfg, 'actor_id': u['id']})
            event(conn, u, 'model_activate', config_id, record['id'])
            return record

    @router.get('/member/{mid}')
    def profile(mid: str, config_id: str = inputs.DEFAULT_CONFIG, basis: str = 'captured_baseline', u=Depends(user)):
        with db() as conn:
            s, m = access(conn, u, mid)
            try:
                return projection(service.member_profile(conn, s, m, config_id, basis), {m['id'] for m in allowed_members(s, u)})
            except ValueError as exc:
                bad(exc)

    @router.post('/calculate')
    def calculate(request: Calculation, u=Depends(user)):
        permit(u, 'risk_calculate')
        if request.basis != 'captured_baseline':
            bad('Clinical and receiver stages change only through their linked workflow events; use scenarios for hypotheses.')
        if request.input_snapshot:
            bad('Use an isolated scenario to change inputs; the baseline comes from the versioned scoring inventory.')
        with db() as conn:
            s, m = access(conn, u, request.member_id)
            try:
                run = service.calculate(conn, m, request.config_id, basis=request.basis, actor=u['id'])
            except ValueError as exc:
                bad(exc)
            event(conn, u, 'risk_calculate', m['id'], run['id'])
            return run

    @router.post('/scenarios')
    def scenario(request: Scenario, u=Depends(user)):
        permit(u, 'risk_scenario')
        with db() as conn:
            s, m = access(conn, u, request.member_id)
            if request.baseline_run_id:
                run_access(conn, u, request.baseline_run_id)
            try:
                value = service.scenario(conn, m, request.config_id, baseline_run_id=request.baseline_run_id,
                     additions=request.add_codes, removals=request.remove_diagnosis_ids, compare_config_id=request.compare_config_id,
                     name=request.name, save=request.save, actor=u['id'])
            except ValueError as exc:
                bad(exc)
            event(conn, u, 'risk_scenario', m['id'], value['id'])
            return value

    @router.get('/runs/{rid}')
    def run(rid: str, u=Depends(user)):
        with db() as conn:
            return run_access(conn, u, rid)

    @router.get('/runs/{rid}/export')
    def export(rid: str, u=Depends(user)):
        permit(u, 'export')
        with db() as conn:
            run = run_access(conn, u, rid)
            payload = {'schema_version': 1, 'exported_at': store.timestamp(), 'run': run,
                       'input_snapshot': projection(store.get_input(conn, run['snapshot_id']), {run['member_id']}),
                       'basis': 'Immutable calculation evidence; synthetic input and external origin are recorded per result.'}
            payload = projection(payload, {run['member_id']})
            return Response(json.dumps(payload, indent=2), media_type='application/json',
                            headers={'Content-Disposition': f'attachment; filename="perform-plus-{rid}.json"'})

    @router.get('/runs/{rid}/input')
    def run_input(rid: str, u=Depends(user)):
        with db() as conn:
            run = run_access(conn, u, rid)
            return projection(store.get_input(conn, run['snapshot_id']), {m['id'] for m in allowed_members(get_state(conn), u)})

    @router.get('/overview')
    def overview(config_id: str = inputs.DEFAULT_CONFIG, basis: str = 'captured_baseline', u=Depends(user)):
        with db() as conn:
            s = get_state(conn)
            try:
                result = service.overview(conn, s, allowed_members(s, u), config_id, basis)
                result['batch'] = public_batch(result['batch'])
                return result
            except ValueError as exc:
                bad(exc)

    @router.get('/recapture')
    def recapture(config_id: str = inputs.DEFAULT_CONFIG, u=Depends(user)):
        with db() as conn:
            s = get_state(conn)
            from . import risk_analytics
            return risk_analytics.inventory(conn, s, allowed_members(s, u), config_id)

    @router.get('/analytics')
    def analytics(config_id: str = inputs.DEFAULT_CONFIG, basis: str = 'captured_baseline', prior_config_id: str | None = None, u=Depends(user)):
        if basis not in inputs.BASES:
            bad('Choose a supported score basis.')
        with db() as conn:
            s = get_state(conn)
            from . import risk_analytics
            try:
                return risk_analytics.dashboard(conn, s, allowed_members(s, u), config_id, basis, prior_config_id)
            except ValueError as exc:
                bad(exc)

    @router.get('/analytics/geography')
    def geography(config_id: str = inputs.DEFAULT_CONFIG, basis: str = 'captured_baseline',
                  county: str = '', provider_id: str = '', dimension: str = 'county',
                  page: int = 1, size: int = 10, u=Depends(user)):
        if basis not in inputs.BASES or dimension not in ('county', 'provider', 'county_provider'):
            bad('Choose a supported score basis and dimension.')
        if page < 1 or size not in (10, 25, 50, 100):
            bad('Choose a positive page and 10, 25, 50 or 100 records per page.')
        with db() as conn:
            s = get_state(conn)
            from . import risk_analytics
            try:
                return risk_analytics.geography(conn, s, allowed_members(s, u), config_id, basis,
                                                county, provider_id, dimension, page, size)
            except ValueError as exc:
                bad(exc)

    @router.post('/opportunities/calculate')
    def opportunity(request: OpportunityCalculation, u=Depends(user)):
        permit(u, 'risk_scenario')
        with db() as conn:
            s = get_state(conn)
            from . import risk_analytics
            try:
                return risk_analytics.opportunity_impact(conn, s, allowed_members(s, u), request.config_id, request.finding_ids, u['id'])
            except ValueError as exc:
                bad(exc)

    @router.get('/opportunities')
    def opportunities(config_id: str = inputs.DEFAULT_CONFIG, mode: str = 'operational_priority', u=Depends(user)):
        if mode not in ('operational_priority', 'recapture_urgency', 'marginal_score_effect', 'accuracy_correction'):
            bad('Choose one of the named ranking modes.')
        with db() as conn:
            s = get_state(conn)
            available = allowed_members(s, u)
            items = [p for m in available for p in inputs.candidate_changes(s, m, config_id)]
            saved = {}
            for result in store.records(conn, 'opportunity_impact', limit=500):
                if result['config_id'] == config_id:
                    saved.setdefault(result['finding_ids'][0], result)
            for item in items:
                result = saved.get(item['finding_id'])
                baseline = store.current(conn, item['member_id'], config_id, 'qa_supported') or store.current(conn, item['member_id'], config_id)
                if result and baseline and result['baseline_run_id'] == baseline['id']:
                    item.update(result)
                else:
                    item.update(delta=None, stale=bool(result), baseline_run_id=baseline['id'] if baseline else None)
                item['ranking_mode'] = mode
                item['ranking_reason'] = {'operational_priority': 'Existing priority, source readiness and stable finding ID.',
                     'recapture_urgency': 'Prior-period assessment need followed by source readiness.',
                     'marginal_score_effect': 'Current full-member marginal effect; uncalculated/stale items follow.',
                     'accuracy_correction': 'Accuracy corrections first; no assumption that increasing score is preferable.'}[mode]
            def rank(item):
                priority = {'High': 0, 'Medium': 1, 'Low': 2}.get(item.get('priority'), 3)
                if mode == 'marginal_score_effect': return (item.get('delta') is None, -(item.get('delta') or 0), item['finding_id'])
                if mode == 'recapture_urgency': return (item['type'] != 'annual_recapture', priority, item['finding_id'])
                if mode == 'accuracy_correction': return (item['operation'] != 'delete', priority, item['finding_id'])
                return (priority, not item['clinical_ready'], item['finding_id'])
            return {'items': sorted(items, key=rank), 'mode': mode, 'config_id': config_id, 'basis': 'Prepared findings with separately calculated hypothetical impacts.'}

    @router.get('/members')
    def directory(config_id: str = inputs.DEFAULT_CONFIG, basis: str = 'captured_baseline', q: str = '',
                  provider: str = '', status: str = '', page: int = 1, page_size: int = 25, u=Depends(user)):
        if page < 1 or not 1 <= page_size <= 100:
            bad('Choose a positive page and a page size between 1 and 100.')
        if status not in ('', 'completed', 'failed', 'unavailable', 'not_calculated', 'unscored', 'stale') or basis not in inputs.BASES:
            bad('Choose a supported calculation status and score basis.')
        with db() as conn:
            s = get_state(conn)
            try:
                cfg = service.configuration(config_id, conn)
            except ValueError as exc:
                bad(exc)
            current = {r['member_id']: r for r in conn.execute('''SELECT r.member_id,r.id,r.status,s.stale,
              r.body->'raw_score' AS raw_score,r.body->'adjusted_score' AS adjusted_score,
              r.body->>'selected_segment' AS selected_segment FROM risk_stages s JOIN risk_runs r ON r.id=s.run_id
              WHERE s.config_id=? AND s.score_basis=?''', (config_id, basis))}
            latest = {r['member_id']: r for r in conn.execute('''SELECT DISTINCT ON(member_id) member_id,status,id
              FROM risk_runs WHERE config_id=? AND score_basis=? ORDER BY member_id,created_at DESC''', (config_id, basis))}
            def calculation_status(mid):
                if mid in current:
                    return current[mid]['status']
                return latest.get(mid, {}).get('status', 'not_calculated')
            selected = [m for m in allowed_members(s, u) if
                        (not provider or m['provider_id'] == provider) and
                        (not q or q.casefold() in (m['id'] + ' ' + m['name'] + ' ' + m['provider']).casefold()) and
                        (not status or (status == 'unscored' and calculation_status(m['id']) != 'completed') or
                         (status == 'stale' and current.get(m['id'], {}).get('stale')) or calculation_status(m['id']) == status)]
            items = []
            for m in selected[(page-1)*page_size:page*page_size]:
                run = current.get(m['id'])
                items.append({'member_id': m['id'], 'name': m['name'], 'provider_id': m['provider_id'], 'provider': m['provider'],
                  'county': m.get('county'), 'city': m.get('city'), 'state': m.get('state'),
                  'raw_score': run.get('raw_score') if run else None, 'adjusted_score': run.get('adjusted_score') if run else None,
                  'selected_segment': run.get('selected_segment') if run else None,
                  'status': calculation_status(m['id']), 'run_id': run['id'] if run else latest.get(m['id'], {}).get('id'),
                  'score_ready': cfg.get('status') in ('validated', 'validated for declared scope', 'active') and not (config_id == 'ma_v28_py2026' and int(m.get('age', 70)) == 65), 'review_ready': bool(m.get('showcase')),
                  'stale': run.get('stale', False) if run else False, 'score_basis': basis})
            return {'items': items, 'total': len(selected), 'page': page, 'page_size': page_size, 'config_id': config_id, 'score_basis': basis, 'status': status}

    @router.get('/mappings')
    def mappings(config_id: str = inputs.DEFAULT_CONFIG, q: str = '', u=Depends(user)):
        try:
            return {'items': service.engine().lookup(config_id, q, limit=30)}
        except ValueError as exc:
            bad(exc)

    @router.get('/batches')
    def batches(u=Depends(user)):
        with db() as conn:
            allowed = {m['id'] for m in allowed_members(get_state(conn), u)}
            items = [store.body(r) for r in conn.execute('SELECT body FROM risk_batches ORDER BY created_at DESC LIMIT 30')]
            return {'items': [public_batch(b) for b in items if set(b['member_ids']) <= allowed]}

    @router.get('/batches/{bid}')
    def batch(bid: str, u=Depends(user)):
        with db() as conn:
            value = batch_access(conn, u, bid)
            if value['status'] == 'running' and bid not in _running:
                # A worker may commit its terminal state between the first read
                # and this membership check. Re-read before declaring a restart.
                value = store.get_batch(conn, bid)
                if value['status'] == 'running':
                    value = {**value, 'status': 'interrupted', 'last_error': 'Worker restarted; resume the remaining work.'}
            return public_batch(value)

    @router.post('/batches')
    def create_batch(request: Batch, u=Depends(user)):
        permit(u, 'risk_calculate')
        with db() as conn:
            s = get_state(conn)
            allowed = {m['id'] for m in allowed_members(s, u)}
            mids = list(dict.fromkeys(request.member_ids or sorted(allowed)))
            if not set(mids) <= allowed:
                bad('One or more members are outside your scope.', 404)
            try:
                cfg = service.configuration(request.config_id, conn)
            except ValueError as exc:
                bad(exc)
            if cfg['id'] == service.EXTERNAL_CONFIG['id']:
                bad('External-score-only configurations require an import, not local recalculation.')
            value = {'id': 'BATCH-' + uuid.uuid4().hex, 'config_id': request.config_id, 'status': 'queued',
                     'total': len(mids), 'succeeded': 0, 'failed': 0, 'processed': 0,
                     'member_ids': mids, 'pending_ids': mids.copy(), 'completed_ids': [], 'errors': [],
                     'created_at': store.timestamp(), 'actor_id': u['id'], 'fixture_version': inputs.FIXTURE_VERSION}
            value.update(configuration_snapshot=cfg, input_adapter_sha256=input_adapter_identity())
            store.save_batch(conn, value)
        dispatch(value['id'])
        return public_batch(value)

    @router.post('/batches/{bid}/resume')
    def resume(bid: str, u=Depends(user)):
        permit(u, 'risk_calculate')
        with db() as conn:
            value = batch_access(conn, u, bid)
            if bid in _running:
                return public_batch(value)
            failed_ids = {e['member_id'] for e in value['errors']}
            value['pending_ids'] = list(dict.fromkeys(value['pending_ids'] + sorted(failed_ids)))
            value['completed_ids'] = [mid for mid in value['completed_ids'] if mid not in failed_ids]
            value.update(failed=0, errors=[], status='queued', processed=len(value['completed_ids']))
            store.save_batch(conn, value)
        dispatch(bid)
        return public_batch(value)

    @router.post('/external-scores')
    def external(request: Feed, u=Depends(user)):
        permit(u, 'risk_import')
        with db() as conn:
            s = get_state(conn)
            # Validate authorization before persisting any input in exception records.
            allowed = {m['id'] for m in allowed_members(s, u)}
            if any(r.get('member_id') not in allowed for r in request.rows):
                bad('An imported record is outside your member scope.', 404)
            try:
                return service.external_import(conn, allowed_members(s, u), request.metadata, request.rows, u['id'])
            except ValueError as exc:
                bad(exc)

    @router.get('/external-scores/example')
    def external_example(u=Depends(user)):
        permit(u, 'risk_import')
        fixture = Path(__file__).resolve().parents[3] / 'seed/risk/medicaid-external-example.json'
        return json.loads(fixture.read_text())

    app.include_router(router)
