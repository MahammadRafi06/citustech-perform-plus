"""Clinical transitions reference immutable calculations without changing other score stages."""
from __future__ import annotations

from copy import deepcopy
from . import risk_inputs as inputs, risk_store as store, risk_service as service


def _member(state, mid):
    return next(m for m in state['members'] if m['id'] == mid)


def decision_context(conn, state, user, finding):
    mid = finding['member_id']
    config_id = inputs.DEFAULT_CONFIG
    baseline = store.current(conn, mid, config_id)
    proposal = next((p for p in inputs.candidate_changes(state, _member(state, mid), config_id) if p['finding_id'] == finding['id']), {})
    prepared = finding.get('prepared_code') or {}
    if isinstance(prepared, str):
        prepared = {'code': prepared}
    baseline_input = store.get_input(conn, baseline['snapshot_id']) if baseline else inputs.member_input(_member(state, mid), config_id)
    originals = [d for d in baseline_input['diagnoses'] if d.get('original_record_id') == finding.get('original_record_id', 'SUB-0001')]
    return {'config_id': config_id, 'baseline_run_id': baseline['id'] if baseline else None,
            'snapshot_id': baseline['snapshot_id'] if baseline else None,
            'score_status': 'referenced' if baseline else 'awaiting_calculation',
            'finding_id': finding['id'], 'code': prepared.get('code'), 'operation': prepared.get('operation'),
            'diagnosis_id': originals[0]['id'] if prepared.get('operation') == 'delete' and len(originals) == 1 else None,
            'source_id': proposal.get('source_id'), 'service_date': proposal.get('service_date'),
            'basis': 'Saved decision reference; independent QA controls supported inputs.'}


def _latest_approved(finding, config_id):
    """Pending drafts/rework keep the last independently approved terminal version."""
    for decision in reversed(finding.get('decision_history', [])):
        if decision.get('decision') not in ('resolved_supported', 'resolved_unsupported'):
            continue
        if decision.get('risk_context', {}).get('config_id') != config_id:
            continue
        qa = next((row for row in reversed(finding.get('qa_history', []))
                   if row.get('decision_id') == decision['id']), decision.get('qa_snapshot', {}))
        if (qa.get('status') == 'passed' and qa.get('decision_id') == decision['id']
                and qa.get('actor_id') and decision.get('actor_id')
                and qa['actor_id'] != decision['actor_id']):
            return decision, qa
    return None, None


def supported_inputs(conn, state, member, config_id, baseline):
    """Rebuild one complete supported basis, replacing contributions by finding."""
    value = deepcopy(store.get_input(conn, baseline['snapshot_id']) if baseline else inputs.member_input(member, config_id))
    references, issues = [], []
    additions, removals = [], set()
    for finding in sorted((f for f in state['opportunities'] if f['member_id'] == member['id']), key=lambda f: f['id']):
        decision, qa = _latest_approved(finding, config_id)
        if not decision:
            continue
        context = decision.get('risk_context', {})
        prepared = decision.get('code') or {}
        code = str((prepared.get('code') if isinstance(prepared, dict) else prepared) or context.get('code') or '').replace('.', '')
        operation = (prepared.get('operation') if isinstance(prepared, dict) else None) or context.get('operation')
        reference = {'finding_id': finding['id'], 'decision_id': decision['id'], 'qa_id': qa['id'],
                     'decision': decision['decision'], 'operation': operation, 'contribution': 'none'}
        if operation == 'delete' and decision['decision'] == 'resolved_unsupported':
            target = context.get('diagnosis_id')
            if not target or not any(d['id'] == target for d in value['diagnoses']):
                issues.append({'finding_id': finding['id'], 'decision_id': decision['id'],
                               'reason': 'An approved deletion requires its exact original baseline diagnosis occurrence.'})
            else:
                removals.add(target)
                reference.update(contribution='delete', diagnosis_id=target)
        elif decision['decision'] == 'resolved_supported':
            if operation != 'add' or not code or not context.get('source_id') or not context.get('service_date'):
                issues.append({'finding_id': finding['id'], 'decision_id': decision['id'],
                               'reason': 'The approved finding has no complete source-bound scoring code and encounter reference.'})
            else:
                dxid = 'APPROVED-' + decision['id']
                dx = inputs.diagnosis(member['id'], code, context['service_date'], dxid, context['source_id'])
                dx.update(id=dxid, finding_id=finding['id'], decision_id=decision['id'], qa_id=qa['id'],
                          evidence_episode_id=decision.get('evidence_episode_id'),
                          source_policy_basis='Prepared eligible encounter metadata linked to the independently approved source decision.')
                for key in ('source_refs', 'source_version', 'source_content_hash', 'source_eligibility', 'code_reference', 'mapping_reference'):
                    if key in context:
                        dx[key] = deepcopy(context[key])
                additions.append(dx)
                reference.update(contribution='add', diagnosis_id=dxid)
        references.append(reference)
    value['diagnoses'] = [d for d in value['diagnoses'] if d['id'] not in removals] + additions
    value['workflow_basis'] = {'basis': 'qa_supported', 'baseline_run_id': baseline['id'] if baseline else None,
                               'decisions': references,
                               'method': 'Complete captured baseline plus the latest independent terminal QA-approved version of each finding.'}
    return value, references, issues


def transition(conn, state, user, event, record):
    mid = record.get('member_id')
    if not mid and record.get('finding_id'):
        finding = next((f for f in state['opportunities'] if f['id'] == record['finding_id']), None)
        mid = finding['member_id'] if finding else None
    if not mid:
        return {'status': 'not_applicable', 'reason': 'No member-linked score transition.'}
    if event == 'source_published':
        # Published evidence changes possible inputs, never the confirmed stage by itself.
        conn.execute('UPDATE risk_stages SET stale=TRUE,reason=? WHERE member_id=? AND config_id=?',
                     ('Source data changed; awaiting external refresh.', mid, service.EXTERNAL_CONFIG['id']))
        return {'status': 'source_available', 'member_id': mid,
                'reason': 'Fresh review/QA is required; existing calculated and reported snapshots remain unchanged.'}
    config_id = record.get('risk_context', {}).get('config_id') or inputs.DEFAULT_CONFIG
    member = _member(state, mid)
    basis = 'qa_supported' if event == 'qa_pass' else 'submitted' if event == 'submitted' else 'accepted'
    if event == 'receiver' and record.get('status') != 'accepted':
        return {'status': 'unchanged', 'reason': 'Acknowledgement or rejection does not change accepted/eligible/report input sets.'}
    if event == 'qa_pass' and record.get('decision') not in ('resolved_supported', 'resolved_unsupported'):
        return {'status': 'unchanged', 'reason': 'Nonterminal disposition does not change supported score inputs.'}
    previous = store.current(conn, mid, config_id, basis)
    baseline = store.current(conn, mid, config_id)
    context = record.get('risk_context', {})
    if event == 'qa_pass':
        value, references, issues = supported_inputs(conn, state, member, config_id, baseline)
        context = {**context, 'active_decision_refs': references}
        if issues:
            if previous:
                conn.execute('UPDATE risk_stages SET stale=TRUE,reason=? WHERE member_id=? AND config_id=? AND score_basis=?',
                             ('The latest approved finding set needs a complete scoring input link.', mid, config_id, basis))
            return {**context, 'status': 'awaiting_input_link', 'score_basis': basis, 'input_issues': issues,
                    'reason': 'The complete approved input set is unresolved; an earlier calculated result is retained separately.'}
        if not previous and not any(r['contribution'] != 'none' for r in references):
            return {**context, 'status': 'unchanged', 'reason': 'Approved no-addition disposition; no scoring input changed.'}
    else:
        value = deepcopy(store.get_input(conn, (previous or baseline)['snapshot_id']) if previous or baseline else inputs.member_input(member, config_id))
        decision = next((d for f in state['opportunities'] for d in f.get('decision_history', []) if d['id'] == record.get('decision_id')), {})
        context = decision.get('risk_context', context)
    record_code = record.get('code')
    if isinstance(record_code, dict):
        record_code = record_code.get('code')
    code = str(record_code or context.get('code') or '').replace('.', '')
    operation = record.get('operation') or context.get('operation')
    supported = event != 'qa_pass' or record.get('decision') == 'resolved_supported'
    approved_removal = operation == 'delete' and (event != 'qa_pass' or record.get('decision') == 'resolved_unsupported')
    if event == 'qa_pass':
        pass  # Complete inputs were reconstructed above; never append a prior finding version.
    elif approved_removal:
        # Target one occurrence from the approved baseline, not every matching code/category.
        original = context.get('diagnosis_id')
        if not original:
            return {**context, 'status': 'awaiting_input_link', 'reason': 'An approved deletion requires the exact original diagnosis occurrence.'}
        context['diagnosis_id'] = original
        if original:
            value['diagnoses'] = [d for d in value['diagnoses'] if d['id'] != original]
    elif supported and operation == 'add' and code:
        dxid = 'APPROVED-' + (record.get('decision_id') or record['id'])
        if not any(d['id'] == dxid for d in value['diagnoses']):
            dx = inputs.diagnosis(mid, code, context.get('service_date') or record.get('service_date') or '2026-08-28',
                                  dxid, context.get('source_id'))
            dx.update(id=dxid, decision_id=record.get('decision_id') or record['id'], qa_id=record.get('qa_id'),
                      source_policy_basis='Prepared eligible encounter metadata linked to the independently approved source decision.')
            value['diagnoses'].append(dx)
    else:
        return {**context, 'status': 'unchanged', 'reason': 'Approved no-addition disposition; no scoring input changed.'}
    value.pop('id', None)
    value.pop('input_hash', None)
    # Save input change separately even if a required model pack has not been installed yet.
    frozen = store.snapshot(conn, config_id, value)
    store.record(conn, 'workflow_input', {'event': event, 'record_id': record['id'], 'snapshot_id': frozen['id'],
                 'config_id': config_id, 'score_basis': basis, 'actor_id': user['id']}, mid)
    try:
        run = service.calculate(conn, member, config_id, value, basis, user['id'])
        if run['status'] != 'completed' and previous:
            conn.execute('UPDATE risk_stages SET stale=TRUE,reason=? WHERE member_id=? AND config_id=? AND score_basis=?',
                         ('Approved inputs changed; calculation needs attention.', mid, config_id, basis))
        return {**context, 'status': run['status'], 'config_id': config_id, 'score_basis': basis,
                'run_id': run['id'], 'snapshot_id': run['snapshot_id'], 'previous_run_id': (previous or baseline or {}).get('id')}
    except (ValueError, RuntimeError, FileNotFoundError) as exc:
        if previous:
            conn.execute('UPDATE risk_stages SET stale=TRUE,reason=? WHERE member_id=? AND config_id=? AND score_basis=?',
                         ('Approved inputs changed; calculation pending.', mid, config_id, basis))
        return {**context, 'status': 'awaiting_calculation', 'snapshot_id': frozen['id'], 'score_basis': basis, 'reason': str(exc)}
