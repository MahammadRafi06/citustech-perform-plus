"""One orchestration path for persisted member, scenario and portfolio calculations."""
from __future__ import annotations

from copy import deepcopy
from collections import Counter, defaultdict
from decimal import Decimal
import math
import uuid

from . import risk_inputs as inputs, risk_store as store


EXTERNAL_CONFIG = {'id': 'medicaid_fl_external', 'name': 'Florida Medicaid · external scores',
    'program': 'Medicaid', 'year': 2026, 'run_type': 'external_score', 'model_version': 'Declared external producer',
    'software_release': 'External feed v1', 'status': 'external-score only', 'supported_segments': ['MMA', 'LTC', 'dental'],
    'service_start': '2026-01-01', 'service_end': '2026-12-31', 'precision': 6,
    'capabilities': ['external_import', 'member_detail', 'rate_cell_aggregate', 'export'],
    'warnings': ['Exact Florida payment reproduction is inactive; controlling methodology is not supplied.'],
    'errors': [], 'asset_sha256': None}


def engine():
    from . import risk_models
    return risk_models


def configurations(conn=None):
    items = deepcopy(engine().catalog()) + [deepcopy(EXTERNAL_CONFIG)]
    if conn:
        active = {}
        for record in store.records(conn, 'activation', limit=100):
            active.setdefault(record['config_id'], record)
        for item in items:
            record = active.get(item['id'])
            if (record and item.get('status') in ('validated', 'validated for declared scope')
                    and all(record.get(key) == item.get(key) and item.get(key) for key in
                            ('asset_sha256', 'component_sha256', 'adapter_sha256'))):
                item['activation'] = record
                item['status'] = 'active'
    return items


def configuration(config_id, conn=None):
    cfg = next((c for c in configurations(conn) if c['id'] == config_id), None)
    if not cfg:
        raise ValueError('Unknown risk model configuration.')
    return cfg


def eligibility_exclusion(cfg, value):
    return {'config_id': cfg['id'], 'member_id': value['member_id'], 'status': 'unavailable',
      'raw_score': None, 'adjusted_score': None, 'selected_segment': None, 'monthly_scores': [],
      'categories': [], 'components': [], 'transformations': [], 'errors': [], 'warnings': [],
      'exclusions': value['eligibility_exclusions'], 'input_hash': store.digest(value),
      'provenance': {'basis': 'Declared synthetic enrollment exclusion before model execution'},
      **{k: cfg.get(k) for k in ('program', 'year', 'run_type', 'model_version', 'software_release', 'precision')}}


def member_eligibility_excluded(value):
    # Receiver filtering may exclude individual diagnoses while leaving a fully
    # eligible baseline. Only the declared no-entitlement member scope stops scoring.
    return not value.get('enrollment') and any(row.get('code') == 'BEFORE_AGED_ENTITLEMENT' for row in value.get('eligibility_exclusions', []))


def calculate(conn, member, config_id, value=None, basis='captured_baseline', actor='', publish=True):
    cfg = configuration(config_id, conn)
    if config_id == EXTERNAL_CONFIG['id']:
        raise ValueError('This configuration accepts external scores; changed inputs await external refresh.')
    value = value or inputs.member_input(member, config_id)
    if value.get('member_id') != member['id']:
        raise ValueError('Input snapshot does not belong to the selected member.')
    if basis not in inputs.BASES or basis == 'reported':
        raise ValueError('Choose a locally calculated score basis. Reported scores require their own import.')
    frozen = store.snapshot(conn, config_id, value)
    result = eligibility_exclusion(cfg, value) if member_eligibility_excluded(value) else engine().calculate(config_id, value)
    if not member_eligibility_excluded(value) and value.get('eligibility_exclusions'):
        result['exclusions'] = result.get('exclusions', []) + deepcopy(value['eligibility_exclusions'])
    result['configuration_snapshot'] = cfg
    result['adapter_sha256'] = cfg.get('adapter_sha256')
    return store.save_run(conn, frozen, result, basis, actor=actor, publish=publish)


def stages(conn, mid, config_id):
    return [{'basis': b, 'run': store.current(conn, mid, config_id, b)} for b in inputs.BASES if b != 'potential']


def member_profile(conn, state, member, config_id, basis='captured_baseline'):
    cfg = configuration(config_id, conn)
    run = store.current(conn, member['id'], config_id, basis)
    value = store.get_input(conn, run['snapshot_id']) if run else inputs.member_input(member, config_id)
    review_ready = bool(member.get('showcase'))
    reasons = []
    if not run:
        reasons.append('No result has been calculated for this input and score basis.')
    if not review_ready:
        reasons.append('Scoring inputs are prepared; this member has no interactive clinical-review story.')
    score_ready = cfg.get('status') in ('validated', 'validated for declared scope', 'active') and not member_eligibility_excluded(value)
    reasons.extend(row['reason'] for row in value.get('eligibility_exclusions', []))
    if not score_ready:
        reasons.append('The selected configuration is not available for local calculation.')
    from . import risk_analytics
    return {'member_id': member['id'], 'configuration': cfg,
            'readiness': {'score_ready': score_ready, 'review_ready': review_ready, 'reasons': reasons},
            'input_snapshot': value, 'run': run, 'history': store.history(conn, member['id'], config_id),
            'stages': stages(conn, member['id'], config_id),
            'recapture': risk_analytics.inventory(conn, state, [member], config_id)['items'],
            'opportunities': inputs.candidate_changes(state, member, config_id)}


def scenario(conn, member, config_id, *, baseline_run_id=None, additions=(), removals=(), compare_config_id=None, name='', save=False, actor=''):
    if config_id == EXTERNAL_CONFIG['id'] or compare_config_id == EXTERNAL_CONFIG['id']:
        raise ValueError('External-score-only configurations cannot calculate hypothetical diagnosis deltas.')
    baseline = store.get_run(conn, baseline_run_id) if baseline_run_id else store.current(conn, member['id'], config_id)
    if baseline and (baseline['member_id'] != member['id'] or baseline['config_id'] != config_id):
        raise ValueError('The baseline run does not match this member and configuration.')
    if not baseline:
        baseline = calculate(conn, member, config_id, actor=actor)
    value = store.get_input(conn, baseline['snapshot_id'])
    if baseline['status'] != 'completed':
        raise ValueError('A completed baseline run is required before comparing scenarios.')
    if compare_config_id and (additions or removals):
        raise ValueError('Fixed-input model comparison cannot also change coding inputs.')
    target = compare_config_id or config_id
    cfg = configuration(target, conn)
    additions = [dict(a) for a in additions]
    for a in additions:
        if not a.get('service_date'):
            a['service_date'] = value['diagnoses'][0]['service_date'] if value['diagnoses'] else cfg.get('service_end', '2026-06-30')
    modified = inputs.apply_changes(value, additions, removals)
    comparison = calculate(conn, member, target, modified, 'potential', actor, publish=False)
    differences = []
    base_factors = defaultdict(float)
    comparable = comparison.get('status') == 'completed' and comparison.get('raw_score') is not None and baseline.get('raw_score') is not None
    if comparable:
        for c in baseline.get('components', []):
            base_factors[c.get('factor', c.get('description', ''))] += c.get('contribution') or 0
        for c in comparison.get('components', []):
            factor = c.get('factor', c.get('description', ''))
            delta = (c.get('contribution') or 0) - base_factors.pop(factor, 0)
            if delta:
                differences.append({'factor': factor, 'description': c.get('description', factor), 'delta': delta})
        differences.extend({'factor': f, 'description': f, 'delta': -v} for f, v in base_factors.items() if v)
    delta = comparison['raw_score'] - baseline['raw_score'] if comparable else None
    result = {'id': 'SCENARIO-' + uuid.uuid4().hex, 'member_id': member['id'], 'name': name or 'Input comparison',
              'mode': 'fixed_inputs_different_model' if compare_config_id else 'same_model_different_inputs',
              'baseline': baseline, 'scenario': comparison, 'delta': round(delta, 9) if delta is not None else None,
              'differences': differences, 'saved': save, 'basis': 'Hypothetical full-member scenario; no clinical record changed.',
              'comparison_basis': 'Raw model output; no common payment normalization inferred.',
              'additions': additions, 'removed_diagnosis_ids': list(removals), 'actor_id': actor}
    if save:
        result = store.record(conn, 'scenario', result, member['id'], result['id'])
    return result


def overview(conn, state, members, config_id, basis='captured_baseline'):
    cfg = configuration(config_id, conn)
    allowed = {m['id']: m for m in members}
    result_rows = conn.execute('''SELECT jsonb_build_object('id',r.id,'member_id',r.member_id,'status',r.status,
        'raw_score',r.body->'raw_score','adjusted_score',r.body->'adjusted_score','monthly_scores',r.body->'monthly_scores',
        'coverage_months',r.body->'coverage_months','rate_cell',r.body->'rate_cell',
        'provenance',CASE WHEN r.body->>'origin'='external_import' THEN r.body->'provenance' ELSE '{}'::jsonb END) AS body,
        s.stale FROM risk_stages s JOIN risk_runs r ON r.id=s.run_id
        WHERE s.config_id=? AND s.score_basis=?''', (config_id, basis))
    runs = [{**store.body(r), 'stale': r['stale']} for r in result_rows if store.body(r)['member_id'] in allowed]
    scored = [r for r in runs if r['status'] == 'completed' and r.get('raw_score') is not None]
    fixture_manifest = inputs.manifest(members, config_id)
    expected_months = fixture_manifest['aca_expected_member_months'] if config_id.startswith('hhs_') else fixture_manifest['expected_member_months']
    cohort_size = len(members)
    if config_id == EXTERNAL_CONFIG['id']:
        imports = store.records(conn, 'external_import', limit=100)
        declared = set()
        for imported in imports:
            scope = set(imported['metadata'].get('expected_member_ids') or allowed) & set(allowed)
            if scope:
                declared = scope
                break
        cohort_size = len(declared)
        runs = [r for r in runs if r['member_id'] in declared]
        scored = [r for r in scored if r['member_id'] in declared]
        fixture_manifest = {**fixture_manifest, 'expected_members': cohort_size, 'expected_scoreable_members': cohort_size,
                            'eligibility_excluded_members': 0, 'basis': 'Latest declared external feed cohort within the reader scope; covered months are supplied per valid imported row.'}
        expected_months = None  # The feed does not establish complete enrollment for its unresolved rows.
    denominator = sum(len(r.get('monthly_scores') or []) for r in scored)
    weighted_raw = sum((Decimal(str(m['raw_score'])) for r in scored for m in r.get('monthly_scores', []) if m.get('raw_score') is not None), Decimal(0))
    weighted_adjusted = sum((Decimal(str(m['adjusted_score'])) for r in scored for m in r.get('monthly_scores', []) if m.get('adjusted_score') is not None), Decimal(0))
    adjusted_complete = all(all(m.get('adjusted_score') is not None for m in r.get('monthly_scores', [])) for r in scored)
    # External feeds carry their declared coverage months rather than a fabricated local monthly score.
    external_groups = []
    mixed_external = False
    if config_id == EXTERNAL_CONFIG['id']:
        grouped = defaultdict(list)
        for r in scored:
            metadata = r.get('provenance', {})
            key = tuple(str(metadata.get(k, '')) for k in ('producer', 'model_version', 'program', 'rating_period', 'normalization_basis', 'coverage_basis'))
            grouped[key].append(r)
        for key, values in grouped.items():
            months = sum(r['coverage_months'] for r in values)
            raw_total = sum((Decimal(str(r['raw_score'])) * r['coverage_months'] for r in values), Decimal(0))
            complete = all(r.get('adjusted_score') is not None for r in values)
            normalized_total = sum((Decimal(str(r.get('adjusted_score') or 0)) * r['coverage_months'] for r in values), Decimal(0))
            external_groups.append({**dict(zip(('producer', 'model_version', 'program', 'rating_period', 'normalization_basis', 'coverage_basis'), key)),
              'members': len(values), 'member_months': months, 'raw_score': float(raw_total / months) if months else None,
              'adjusted_score': float(normalized_total / months) if months and complete else None,
              'rate_cells': sorted({r['rate_cell'] for r in values}), 'run_ids': [r['id'] for r in values]})
        mixed_external = len(external_groups) > 1
        denominator = sum(r.get('coverage_months', 0) for r in scored)
        weighted_raw = sum((Decimal(str(r['raw_score'])) * r.get('coverage_months', 0) for r in scored), Decimal(0))
        adjusted_complete = all(r.get('adjusted_score') is not None for r in scored)
        weighted_adjusted = sum((Decimal(str(r.get('adjusted_score') or 0)) * r.get('coverage_months', 0) for r in scored), Decimal(0))
    dist = Counter('0–0.5' if r['raw_score'] < .5 else '0.5–1' if r['raw_score'] < 1 else '1–2' if r['raw_score'] < 2 else '2–3' if r['raw_score'] < 3 else '3+' for r in scored)
    failures = conn.execute('SELECT member_id FROM risk_runs WHERE config_id=? AND score_basis=? AND status=?', (config_id, basis, 'failed'))
    failed = {r['member_id'] for r in failures if r['member_id'] in allowed} - {r['member_id'] for r in scored}
    batches = [store.body(r) for r in conn.execute('SELECT body FROM risk_batches WHERE config_id=? ORDER BY created_at DESC LIMIT 20', (config_id,))]
    visible_batches = [b for b in batches if set(b.get('member_ids', [])) <= set(allowed)]
    weighted_score = float(weighted_raw / denominator) if denominator and not mixed_external else None
    stale = any(r.get('stale') for r in runs)
    coverage = {'enrolled_members': cohort_size, 'roster_scope_members': len(members), 'expected_scoreable': fixture_manifest['expected_scoreable_members'], 'scored_members': len(scored),
                'failed_members': len(failed), 'excluded_members': fixture_manifest['eligibility_excluded_members'], 'enrolled_member_months': expected_months,
                'scored_member_months': denominator, 'unscored_members': max(0, cohort_size-len(scored)), 'stale_members': sum(bool(r.get('stale')) for r in runs)}
    return {'configuration': cfg, 'score_basis': basis, 'coverage': coverage,
            'portfolio': {'raw_score': weighted_score, 'adjusted_score': float(weighted_adjusted / denominator) if denominator and adjusted_complete and not mixed_external else None,
                          'weighting': 'Eligible member-month weighted internal portfolio measure', 'denominator': denominator,
                          'numerator': float(weighted_raw) if not mixed_external else None, 'unit': 'score points', 'run_ids': [r['id'] for r in scored],
                          'incomplete_reason': 'External results have different model, program, period or normalization bases; inspect each matched group.' if mixed_external else None},
            'external_groups': external_groups,
            'metrics': [{'id': 'portfolio', 'label': 'Calculated portfolio score', 'value': weighted_score, 'unit': 'score points',
                         'definition': 'Sum of monthly model scores divided by successfully scored eligible member-months.',
                         'numerator': float(weighted_raw) if not mixed_external else None, 'denominator': denominator, 'basis': basis},
                        {'id': 'coverage', 'label': 'Scored members', 'value': len(scored), 'denominator': len(members), 'unit': 'members'}],
            'distribution': [{'label': key, 'count': dist[key]} for key in ['0–0.5', '0.5–1', '1–2', '2–3', '3+']],
            'members': [{'member_id': r['member_id'], 'name': allowed[r['member_id']]['name'], 'run_id': r['id'],
                         'raw_score': r['raw_score'], 'adjusted_score': r.get('adjusted_score'), 'stale': r.get('stale', False)} for r in sorted(scored, key=lambda r: r['member_id'])],
            'stale': stale, 'incomplete': len(scored) != fixture_manifest['expected_scoreable_members'] or mixed_external, 'batch': visible_batches[0] if visible_batches else None,
            'fixture_manifest': fixture_manifest}


def recapture(conn, state, members, config_id):
    from . import risk_analytics
    return risk_analytics.inventory(conn, state, members, config_id)


def external_import(conn, members, metadata, rows, actor):
    required = ['producer', 'model_version', 'program', 'rating_period', 'normalization_basis', 'calculated_at', 'coverage_basis']
    missing = [k for k in required if not metadata.get(k)]
    if missing:
        raise ValueError('External-score metadata required: ' + ', '.join(missing))
    if metadata['program'] not in ('MMA', 'LTC', 'dental'):
        raise ValueError('Select the explicit Florida MMA, LTC or dental program.')
    valid_members = {m['id']: m for m in members}
    declared_members = set(metadata.get('expected_member_ids') or valid_members)
    if not declared_members <= set(valid_members):
        raise ValueError('The declared external-feed cohort contains an unauthorized member.')
    counts = Counter(r.get('member_id') for r in rows)
    imported, exceptions = [], []
    for r in rows:
        mid = r.get('member_id')
        reasons = []
        if mid not in valid_members: reasons.append('Member is outside the authorized population.')
        if mid not in declared_members: reasons.append('Member is outside the declared feed cohort.')
        if counts[mid] > 1: reasons.append('Duplicate member in the supplied score set.')
        if r.get('rating_period') != metadata['rating_period']: reasons.append('Rating period mismatch.')
        if not r.get('rate_cell'): reasons.append('Rate cell is required.')
        if not isinstance(r.get('coverage_months'), int) or not 1 <= r['coverage_months'] <= 12: reasons.append('Valid covered months are required.')
        score = r.get('raw_score')
        if score is None or isinstance(score, bool) or not isinstance(score, (int, float)) or not math.isfinite(score) or score < 0:
            reasons.append(r.get('unscored_reason') or 'A finite nonnegative external score is required; no zero/one default is applied.')
        normalized = r.get('normalized_score')
        if normalized is not None and (isinstance(normalized, bool) or not isinstance(normalized, (int, float)) or not math.isfinite(normalized) or normalized < 0):
            reasons.append('Normalized score must be a finite nonnegative externally supplied value.')
        if reasons:
            exceptions.append({'member_id': mid, 'reasons': reasons, 'input': r})
            continue
        snap = store.snapshot(conn, EXTERNAL_CONFIG['id'], {'member_id': mid, 'external_input': r, 'metadata': metadata, 'synthetic': bool(metadata.get('synthetic', True))})
        result = {'config_id': EXTERNAL_CONFIG['id'], 'status': 'completed', 'raw_score': score, 'adjusted_score': normalized,
            'program': 'Medicaid · ' + metadata['program'], 'year': 2026, 'run_type': 'external_score',
            'model_version': metadata['model_version'], 'software_release': metadata['producer'],
            'selected_segment': r['rate_cell'], 'rate_cell': r['rate_cell'], 'rating_period': metadata['rating_period'],
            'coverage_months': r['coverage_months'], 'components': r.get('components', []), 'monthly_scores': [],
            'categories': r.get('categories', []), 'exclusions': [], 'errors': [],
            'warnings': [] if r.get('components') else ['Component detail unavailable in the supplied external feed.'],
            'precision': 'As supplied', 'transformations': [], 'provenance': {**metadata, 'import_actor': actor},
            'state_factor': r.get('state_factor'), 'input_hash': snap['input_hash']}
        imported.append(store.save_run(conn, snap, result, 'reported', actor=actor, origin='external_import'))
    report = {'metadata': metadata, 'received': len(rows), 'imported': len(imported), 'excluded': len(exceptions),
              'exceptions': exceptions, 'run_ids': [r['id'] for r in imported], 'member_ids': [r['member_id'] for r in imported],
              'missing_member_ids': sorted(declared_members - set(counts)),
              'expected_member_count': len(declared_members),
              'denominator_policy': 'Only valid matched scored members and their supplied coverage months enter score aggregates.',
              'basis': 'External-score import; no local diagnosis recalculation or Florida payment reproduction.'}
    return store.record(conn, 'external_import', report)
