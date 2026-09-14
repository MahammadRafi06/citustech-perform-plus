"""Independent prepared receiver/report evidence and qualifying input-set reconstruction."""
from __future__ import annotations

from copy import deepcopy

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from . import risk_inputs as inputs, risk_service as service, risk_store as store


class FixtureSelection(BaseModel):
    model_config = ConfigDict(extra='forbid')
    fixture_id: str = Field(max_length=100)


def fixtures():
    """Authored observations are independent of the submitted outcome being compared."""
    common = {'config_id': inputs.DEFAULT_CONFIG, 'service_year': 2026, 'payment_year': 2027,
              'synthetic': True, 'simulation': True, 'fixture_version': 'receiver-report-2026.1'}
    rows = [
        {'id': 'ELIG-JORDAN-QUALIFIED', 'kind': 'eligibility', 'member_id': 'MB-000001', 'code': 'I5022', 'operation': 'add',
         'name': 'Jordan · qualifying encounter', 'result': 'eligible',
         'reason': 'The prepared receiver eligibility result identifies this diagnosis occurrence as qualifying for the declared forecast period.'},
        {'id': 'ELIG-JORDAN-NOT-ELIGIBLE', 'kind': 'eligibility', 'member_id': 'MB-000001', 'code': 'I5022', 'operation': 'add',
         'name': 'Jordan · accepted, eligibility exception', 'result': 'ineligible',
         'reason': 'The prepared receiver result flags unresolved encounter linkage. Transport and record acceptance do not resolve this eligibility exception.'},
        {'id': 'ELIG-TAYLOR-DELETION', 'kind': 'eligibility', 'member_id': 'MB-000004', 'code': 'I509', 'operation': 'delete',
         'name': 'Taylor · qualifying deletion', 'result': 'eligible',
         'reason': 'The prepared receiver eligibility result applies the deletion to the exact original diagnosis occurrence.'},
        {'id': 'REPORT-JORDAN-PRESENT', 'kind': 'report', 'member_id': 'MB-000001', 'name': 'Jordan · diagnosis present',
         'rows': [{'member_id': 'MB-000001', 'code': 'I5022', 'record_version': 'CURRENT', 'service_date': '2026-08-28'}]},
        {'id': 'REPORT-JORDAN-MISSING', 'kind': 'report', 'member_id': 'MB-000001', 'name': 'Jordan · diagnosis missing', 'rows': []},
        {'id': 'REPORT-JORDAN-PRIOR-PERIOD', 'kind': 'report', 'member_id': 'MB-000001', 'name': 'Jordan · prior-period report',
         'service_year': 2025, 'payment_year': 2026, 'rows': [{'member_id': 'MB-000001', 'code': 'I5022', 'record_version': 'CURRENT', 'service_date': '2025-08-28'}]},
        {'id': 'REPORT-JORDAN-OTHER-MODEL', 'kind': 'report', 'member_id': 'MB-000001', 'name': 'Jordan · historical model basis',
         'config_id': 'authored_historical_v24_report', 'rows': [{'member_id': 'MB-000001', 'code': 'I5022', 'record_version': 'CURRENT', 'service_date': '2026-08-28'}]},
        {'id': 'REPORT-JORDAN-SUPERSEDED', 'kind': 'report', 'member_id': 'MB-000001', 'name': 'Jordan · superseded record version',
         'rows': [{'member_id': 'MB-000001', 'code': 'I5022', 'record_version': 'SUPERSEDED', 'service_date': '2026-08-28'}]},
        {'id': 'REPORT-TAYLOR-REMOVED', 'kind': 'report', 'member_id': 'MB-000004', 'name': 'Taylor · deleted occurrence absent', 'rows': []},
        {'id': 'REPORT-TAYLOR-STILL-PRESENT', 'kind': 'report', 'member_id': 'MB-000004', 'name': 'Taylor · original occurrence still present',
         'rows': [{'member_id': 'MB-000004', 'code': 'I509', 'record_version': 'CURRENT', 'service_date': '2026-08-20'}]},
    ]
    result = []
    for item in rows:
        item = {**common, **item}
        item['basis'] = 'Authored synthetic receiver result; no external receiver or payment report was contacted.'
        if item['kind'] == 'report':
            item.update(coverage='Selected diagnosis occurrence only; no comparable member score is supplied.', reported_score=None)
            item['record_scope'] = {'operation': 'add', 'source_id': 'DOC-0001', 'source_version': 1} if item['member_id']=='MB-000001' else {'operation':'delete','original_record_id':'SUB-0001'}
            for reported_row in item['rows']:
                reported_row.update({k:v for k,v in item['record_scope'].items() if k!='operation'})
        item['content_hash'] = store.digest(item)
        result.append(item)
    return result


def invalid(message, code='RECONCILIATION_INVALID', status=400):
    raise HTTPException(status, detail={'code': code, 'message': message})


def _stored(conn, rid):
    return store.body(conn.execute('SELECT body FROM risk_records WHERE id=?', (rid,)).fetchone())


def _context(row):
    return {**row.get('review_snapshot', {}).get('risk_context', {}), **row.get('risk_context', {})}


def _linked(row):
    review = row.get('review_snapshot', {})
    qa = row.get('qa_snapshot', {})
    code = review.get('code') or {}
    if isinstance(code, str):
        code = {'code': code}
    if (row.get('status') != 'accepted' or not row.get('decision_id') or review.get('id') != row['decision_id']
            or qa.get('id') != row.get('qa_id') or qa.get('decision_id') != review['id']
            or qa.get('status') != 'passed' or qa.get('actor_id') == review.get('actor_id')
            or row.get('operation') != code.get('operation')
            or str(row.get('code', '')).replace('.', '') != str(code.get('code', '')).replace('.', '')):
        invalid('An accepted attempt linked to its exact independent QA-approved operation is required.', 'APPROVAL_REQUIRED')


def _selected(row, fixture_id, kind):
    fixture = next((f for f in fixtures() if f['id'] == fixture_id and f['kind'] == kind), None)
    if not fixture or fixture['member_id'] != row['member_id']:
        invalid('Choose a prepared result for this exact member.', 'FIXTURE_MISMATCH')
    if kind == 'eligibility' and (fixture['operation'] != row['operation'] or fixture['code'] != str(row['code']).replace('.', '')):
        invalid('The prepared eligibility result does not match this approved operation and code.', 'FIXTURE_MISMATCH')
    return fixture


def qualifying_inputs(conn, state, member, config_id, observations):
    """Rebuild from complete baseline occurrences, applying each decision once."""
    baseline = store.current(conn, member['id'], config_id)
    value = deepcopy(store.get_input(conn, baseline['snapshot_id']) if baseline else inputs.member_input(member, config_id))
    for key in ('id', 'input_hash'):
        value.pop(key, None)
    latest = {}
    active_submissions = {row['id'] for row in state['submissions'] if row['member_id'] == member['id']}
    for observation in sorted(observations, key=lambda r: r['created_at']):
        if observation['config_id'] == config_id and observation['submission_id'] in active_submissions:
            latest[observation['decision_id']] = observation
    applied, excluded = [], []
    for observation in latest.values():
        if observation['eligibility_status'] != 'eligible':
            excluded.append({'decision_id': observation['decision_id'], 'reason': observation['reason'], 'observation_id': observation['id']})
            continue
        row = next((r for r in state['submissions'] if r['id'] == observation['submission_id']), None)
        if not row:
            invalid('A retained eligibility result refers to an unavailable submission.', 'INPUT_LINK_REQUIRED')
        context = _context(row)
        if row['operation'] == 'delete':
            target = context.get('diagnosis_id')
            if not target:
                invalid('The approved deletion has no exact original diagnosis occurrence.', 'INPUT_LINK_REQUIRED')
            value['diagnoses'] = [d for d in value['diagnoses'] if d['id'] != target]
        else:
            target = 'APPROVED-' + row['decision_id']
            if not any(d['id'] == target for d in value['diagnoses']):
                dx = inputs.diagnosis(member['id'], str(row['code']).replace('.', ''), context['service_date'], target, context.get('source_id'))
                dx.update(id=target, decision_id=row['decision_id'], qa_id=row['qa_id'],
                          eligibility_result_id=observation['id'], source_policy_basis=observation['basis'])
                value['diagnoses'].append(dx)
        applied.append(observation['id'])
    value.update(stage_baseline_run_id=baseline['id'] if baseline else None,
                 eligibility_result_ids=applied, eligibility_exclusions=excluded,
                 source_coverage='Complete known authored baseline inventory plus eligible approved changes; individual receiver results are prepared simulations.')
    return value


def eligibility_result(conn, state, member, row, fixture_id, actor):
    _linked(row)
    fixture = _selected(row, fixture_id, 'eligibility')
    config_id = _context(row).get('config_id', inputs.DEFAULT_CONFIG)
    if fixture['config_id'] != config_id:
        invalid('The eligibility result uses a different model configuration.', 'MODEL_MISMATCH')
    rid = 'ELIG-' + store.digest({'submission': row['id'], 'fixture': fixture['content_hash'], 'decision': row['decision_id']})[:32]
    existing = _stored(conn, rid)
    if existing:
        return {**existing, 'replayed': True}
    observed = {'id': rid, 'member_id': member['id'], 'submission_id': row['id'], 'decision_id': row['decision_id'],
                'qa_id': row['qa_id'], 'finding_id': row['finding_id'], 'config_id': config_id,
                'eligibility_status': fixture['result'], 'reason': fixture['reason'], 'fixture_id': fixture['id'],
                'fixture': fixture, 'basis': fixture['basis'], 'created_at': store.timestamp(), 'actor_id': actor['id'],
                'operation': row['operation'], 'source_refs': deepcopy(row.get('source_refs', [])),
                'owner': row.get('owner'), 'next_action': 'Inspect or remediate receiver eligibility evidence.' if fixture['result'] == 'ineligible' else 'Compare the independent reported record.',
                'payment_reconciliation': 'unreconciled'}
    previous = store.current(conn, member['id'], config_id, 'eligible')
    value = qualifying_inputs(conn, state, member, config_id, store.records(conn, 'receiver_eligibility', member['id'], limit=10000) + [observed])
    frozen = store.snapshot(conn, config_id, value)
    try:
        run = service.calculate(conn, member, config_id, value, 'eligible', actor['id'])
        observed.update(run_id=run['id'], snapshot_id=run['snapshot_id'], score_status=run['status'])
    except (ValueError, RuntimeError, FileNotFoundError) as exc:
        observed.update(run_id=None, snapshot_id=frozen['id'], score_status='awaiting_calculation', calculation_reason=str(exc))
    if observed['score_status'] != 'completed' and previous:
        conn.execute('UPDATE risk_stages SET stale=TRUE,reason=? WHERE member_id=? AND config_id=? AND score_basis=?',
                     ('Eligibility inputs changed; calculation is pending.', member['id'], config_id, 'eligible'))
    result = store.record(conn, 'receiver_eligibility', observed, member['id'], rid)
    row.setdefault('eligibility_history', []).append(deepcopy(result))
    row.update(eligibility_status=fixture['result'], eligibility_result_id=rid)
    return result


def report_result(conn, member, row, fixture_id, actor):
    _linked(row)
    fixture = _selected(row, fixture_id, 'report')
    context = _context(row)
    config_id = context.get('config_id', inputs.DEFAULT_CONFIG)
    configuration = service.configuration(config_id, conn)
    rid = 'REPORT-' + store.digest({'submission': row['id'], 'fixture': fixture['content_hash'], 'decision': row['decision_id']})[:32]
    existing = _stored(conn, rid)
    if existing:
        return {**existing, 'replayed': True}
    code = str(row['code']).replace('.', '')
    expected_presence = 'present' if row['operation'] == 'add' else 'absent'
    observed = [d for d in fixture['rows'] if d['member_id'] == member['id'] and d['code'].replace('.', '') == code]
    discrepancies = []
    record_scope = fixture['record_scope']
    if record_scope['operation'] != row['operation']:
        discrepancies.append({'kind': 'operation_mismatch', 'reason': 'The report concerns a different operation.'})
    if row['operation']=='add' and (record_scope['source_id']!=context.get('source_id') or record_scope['source_version']!=context.get('source_version')):
        discrepancies.append({'kind': 'source_version_mismatch', 'reason': 'The report concerns a different source record/version from this approved addition.'})
    if row['operation']=='delete' and record_scope['original_record_id']!=row.get('original_id'):
        discrepancies.append({'kind': 'original_record_mismatch', 'reason': 'The report concerns a different original diagnosis occurrence.'})
    if fixture['config_id'] != config_id:
        discrepancies.append({'kind': 'model_mismatch', 'reason': 'The report model differs from the approved operation’s calculation basis.'})
    service_year = int(context['service_date'][:4]) if context.get('service_date') else None
    if fixture['service_year'] != service_year or fixture['payment_year'] != configuration.get('year'):
        discrepancies.append({'kind': 'period_mismatch', 'reason': 'The report service/payment period differs from the reviewed source and calculation configuration.'})
    if observed and any(d['record_version'] != 'CURRENT' for d in observed):
        discrepancies.append({'kind': 'superseded_record', 'reason': 'The report contains an earlier record version, not the approved current occurrence.'})
    reported_presence = 'present' if observed else 'absent'
    comparable = not discrepancies
    if comparable and expected_presence != reported_presence:
        discrepancies.append({'kind': 'missing_diagnosis' if expected_presence == 'present' else 'deletion_not_reflected',
                              'reason': 'The added diagnosis is absent from this prepared report.' if expected_presence == 'present' else 'The deleted occurrence remains present in this prepared report.'})
    status = 'matched' if not discrepancies else 'discrepancy'
    explanation = 'The independent prepared report agrees with the approved record operation.' if status == 'matched' else ' '.join(d['reason'] for d in discrepancies)
    result = {'id': rid, 'report_fixture_id': fixture['id'], 'name': fixture['name'], 'basis': fixture['basis'], 'at': store.timestamp(),
              'member_id': member['id'], 'submission_id': row['id'], 'decision_id': row['decision_id'], 'qa_id': row['qa_id'],
              'config_id': config_id, 'fixture': fixture, 'source_refs': deepcopy(row.get('source_refs', [])),
              'expected': {'code': row['code'], 'operation': row['operation'], 'record_presence': expected_presence,
                           'member_id': member['id'], 'decision_id': row['decision_id']},
              'reported': {'code': row['code'] if observed else '', 'record_presence': reported_presence, 'rows': deepcopy(fixture['rows'])},
              'status': status, 'explanation': explanation, 'discrepancies': discrepancies, 'comparable': comparable,
              'diagnosis_eligibility': row.get('eligibility_status', 'not_evaluated'), 'payment_reconciliation': 'unreconciled',
              'reported_score': None, 'score_reason': fixture['coverage'], 'actor_id': actor['id'], 'owner': row.get('owner'),
              'next_action': 'Inspect the mismatched report basis or prepare the appropriate remediation.' if discrepancies else 'Retain this diagnosis-level report comparison.'}
    result = store.record(conn, 'reported_reconciliation', result, member['id'], rid)
    previous = row.get('report_comparison')
    if previous and not any(r['id'] == previous['id'] for r in row.get('report_history', [])):
        row.setdefault('report_history', []).append(deepcopy(previous))
    row.setdefault('report_history', []).append(deepcopy(result))
    row.update(report_comparison=deepcopy(result), reported_status='report_discrepancy' if discrepancies else 'matched_prepared_report')
    return result


def register(app, *, db, user, get_state, save_state, member, permit, event):
    router = APIRouter(prefix='/api/v1/risk')

    @router.get('/members/{mid}/reconciliation')
    def view(mid: str, config_id: str = inputs.DEFAULT_CONFIG, u=Depends(user)):
        with db() as conn:
            state = get_state(conn)
            member(state, u, mid)
            try:
                service.configuration(config_id, conn)
            except ValueError as exc:
                invalid(str(exc))
            records = [r for r in state['submissions'] if r['member_id'] == mid]
            active_ids = {record['id'] for record in records}
            def active_observations(kind):
                return [item for item in store.records(conn, kind, mid, limit=1000)
                        if item.get('submission_id') in active_ids and item.get('config_id') == config_id]
            return {'member_id': mid, 'config_id': config_id, 'stages': service.stages(conn, mid, config_id),
                    'submissions': records, 'fixtures': [f for f in fixtures() if f['member_id'] == mid],
                    'eligibility_results': active_observations('receiver_eligibility'),
                    'report_results': active_observations('reported_reconciliation'),
                    'basis': 'Local stage calculations and independent prepared receiver/report evidence.', 'payment_reconciliation': 'unreconciled'}

    def apply(sid, body, u, kind):
        permit(u, 'receiver')
        with db() as conn:
            state = get_state(conn, lock=True)
            row = next((r for r in state['submissions'] if r['id'] == sid), None)
            if not row:
                invalid('The submission is unavailable.', 'RESOURCE_NOT_FOUND', 404)
            selected_member = member(state, u, row['member_id'])
            result = eligibility_result(conn, state, selected_member, row, body.fixture_id, u) if kind == 'eligibility' else report_result(conn, selected_member, row, body.fixture_id, u)
            if not result.get('replayed'):
                save_state(conn, state)
                event(conn, u, 'receiver_' + kind, row['member_id'], result['id'] + ' · ' + result.get('reason', result.get('explanation', 'Prepared result retained.')))
            return result

    @router.post('/submissions/{sid}/eligibility')
    def eligibility(sid: str, body: FixtureSelection, u=Depends(user)):
        return apply(sid, body, u, 'eligibility')

    @router.post('/submissions/{sid}/report')
    def report(sid: str, body: FixtureSelection, u=Depends(user)):
        return apply(sid, body, u, 'report')

    app.include_router(router)
