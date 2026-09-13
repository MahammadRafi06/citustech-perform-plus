"""Versioned, source-aware adapters to byte-verified official CMS model software.

No database or clinical mutation occurs here. Callers persist immutable snapshots/runs
and retain the normal coder/independent-QA gates when constructing an input basis.
"""
from copy import deepcopy
from collections import defaultdict
from decimal import Decimal
import time

from .catalog import CONFIGS, catalog, output_segment
from .runner import execute_many
from .validation import prepare, segments, stable_hash
from . import trace

__all__ = ['catalog', 'calculate', 'calculate_many', 'lookup']


def _base(config_id, snapshot):
    config = CONFIGS.get(config_id)
    base = {'status': 'failed', 'config_id': config_id, 'member_id': snapshot.get('member_id') if isinstance(snapshot, dict) else None,
            'input_hash': stable_hash(snapshot), 'raw_score': None, 'adjusted_score': None,
            'monthly_scores': [], 'components': [], 'categories': [], 'exclusions': [], 'warnings': [], 'errors': [],
            'transformations': [], 'reference_output': {}, 'provenance': {}, 'selected_segment': None,
            'score_basis': snapshot.get('score_basis', 'captured') if isinstance(snapshot, dict) else None}
    if config:
        for key in ('program', 'year', 'run_type', 'model_version', 'software_release', 'asset_sha256', 'component_sha256', 'precision', 'service_start', 'service_end'):
            base[key] = deepcopy(config[key])
    return base


def _transformed(config, raw):
    profile = config.get('adjustment_profile')
    if not profile:
        return None
    value = Decimal(str(raw)) / Decimal(str(profile['normalization']))
    if profile.get('coding_pattern_multiplier'):
        value *= Decimal(str(profile['coding_pattern_multiplier']))
    return float(value)


def _result(config, snapshot, prepared, execution, base):
    row = execution['row']
    months = segments(config, prepared)
    profiles = execution.get('month_profiles', {})
    for month in months:
        month_row = profiles.get(month['month'], execution)['row']
        key = 'SCORE_' + output_segment(config, month['segment'])
        value = month_row.get(key)
        if not isinstance(value, (int, float)):
            raise ValueError(f'Official output is missing selected segment {key}')
        month['raw_score'] = value
        if config['program'] == 'ACA':
            month['adjusted_score'] = month_row.get('CSR_ADJUSTED_' + key)
        else:
            month['adjusted_score'] = _transformed(config, value)
    base['monthly_scores'] = months
    selected = sorted({m['segment'] for m in months})
    base['selected_segment'] = selected[0] if len(selected) == 1 else 'MIXED_MONTHLY'
    base['raw_score'] = round(sum(m['raw_score'] for m in months) / len(months), 6)
    adjustments = [m['adjusted_score'] for m in months]
    base['adjusted_score'] = round(sum(adjustments) / len(adjustments), 6) if all(v is not None for v in adjustments) else None
    base['components'] = []
    if profiles:
        groups = defaultdict(list)
        executions = {}
        for month in months:
            profile = profiles[month['month']]
            key = profile['canonical_input_hash']
            groups[key].append(month)
            executions[key] = profile
        for key, group in groups.items():
            weight = len(group) / len(months)
            for component in trace.components(config, prepared, executions[key]['row'], group):
                component['weight'] *= weight
                component['contribution'] = round(component['contribution'] * weight, 9)
                component['input_profile_hash'] = key
                base['components'].append(component)
    else:
        base['components'] = trace.components(config, prepared, row, months)
    base['categories'] = trace.categories(config, prepared, row)
    unrounded = sum(c['contribution'] for c in base['components'])
    base['component_total'] = round(unrounded, 9)
    base['rounding_residual'] = round(base['raw_score'] - unrounded, 9)
    if abs(base['rounding_residual']) > 0.000501:
        raise ValueError('Factor ledger does not reconcile to the selected official output')
    if config['program'] == 'ACA':
        base['transformations'] = [{'operation': 'csr', 'source': 'Official package CSR table',
                                    'already_applied_by_official_runner': True,
                                    'input': base['raw_score'], 'output': base['adjusted_score']}]
    elif config.get('adjustment_profile'):
        profile = config['adjustment_profile']
        base['transformations'] = [dict(profile, input=base['raw_score'], output=base['adjusted_score'], output_decimals=6)]
    base['reference_output'] = {key: value for key, value in row.items() if key.startswith(('SCORE_', 'CSR_ADJUSTED_SCORE'))}
    base['provenance'] = {key: value for key, value in execution.items() if key not in ('row', 'month_profiles')}
    if profiles:
        base['monthly_reference_outputs'] = {month: {key: value for key, value in profile['row'].items() if key.startswith('SCORE_')} for month, profile in profiles.items()}
        base['provenance']['monthly_input_profiles'] = {month: {key: profile[key] for key in ('canonical_input_hash', 'output_sha256')} for month, profile in profiles.items()}
        base['provenance']['reference_output_basis'] = 'First monthly input profile; monthly_reference_outputs retains every effective Medicaid input profile.'
    base['provenance'].update(source_url=config['source_url'], unchanged_official_software=True,
                              source_policy='Explicit verified-service metadata plus engine source/date/routing validation',
                              source_ids=sorted({d['source_id'] for d in prepared['diagnoses']}),
                              source_metadata_requirement='eligible_service must come from a reviewed source-policy classification, not a signature or code mapping')
    if any(c.get('value_origin') for c in base['components']):
        base['provenance']['intermediate_export_note'] = 'The official HHS export retains pre-reassignment male infant age flags. Ledger uses the documented scoring reassignment evidenced by the official AGE1 × severity flag (HHS_HCC/utils.py create_infant_model_vars). Scores remain untouched official outputs.'
    base['status'] = 'completed'
    return base


def calculate_many(config_id, input_snapshots):
    """One isolated official execution per batch of distinct effective inputs.

    Errors are stable result records. Invalid members do not prevent valid batch
    members from scoring; a runner failure marks every affected member failed.
    """
    if not isinstance(input_snapshots, list):
        raise TypeError('input_snapshots must be a list')
    config = CONFIGS.get(config_id)
    results, valid, positions = [], [], []
    started = time.monotonic()
    for snapshot in input_snapshots:
        base = _base(config_id, snapshot)
        results.append(base)
        if not config:
            base['errors'] = ['Unknown model configuration']
            continue
        if not config.get('package'):
            base.update(status='unavailable', errors=['Historical V24 reference validation is pending; no substitute score is returned'])
            continue
        prepared = prepare(config, snapshot)
        base.update(errors=prepared['errors'], exclusions=prepared['exclusions'], warnings=prepared['warnings'])
        if prepared['errors']:
            if any('requires its separate' in error for error in prepared['errors']):
                base['status'] = 'unavailable'
            continue
        valid.append(prepared)
        positions.append(len(results) - 1)
    if valid:
        try:
            # LTIMCAID and NEMCAID are person-level fields in the official CSV.
            # Split effective monthly changes into separately scored profiles,
            # then select and aggregate only each profile's applicable months.
            staged, memberships = [], []
            for prepared in valid:
                groups = defaultdict(list)
                if config['program'] == 'MA':
                    for month in prepared['enrollment']:
                        groups[(month['medicaid'], month['new_enrollee'])].append(month)
                else:
                    groups[None] = prepared['enrollment']
                membership = []
                for months in groups.values():
                    membership.append((len(staged), months))
                    staged.append(dict(prepared, enrollment=months))
                memberships.append(membership)
            staged_executions = execute_many(config, staged)
            executions = []
            for membership in memberships:
                first = dict(staged_executions[membership[0][0]])
                if len(membership) > 1:
                    first['month_profiles'] = {month['month']: staged_executions[index] for index, months in membership for month in months}
                executions.append(first)
        except Exception as error:
            for position in positions:
                results[position]['errors'] = [str(error)]
        else:
            for prepared, execution, position in zip(valid, executions, positions):
                try:
                    results[position] = _result(config, input_snapshots[position], prepared, execution, results[position])
                except Exception as error:
                    base = results[position]
                    base.update(status='failed', raw_score=None, adjusted_score=None, errors=[str(error)])
    elapsed = round((time.monotonic() - started) * 1000, 2)
    for result in results:
        result['batch_duration_ms'] = elapsed
    return results


def calculate(config_id, input_snapshot):
    return calculate_many(config_id, [input_snapshot])[0]


def lookup(config_id, query, limit=30):
    config = CONFIGS.get(config_id)
    if not config or not config.get('package'):
        return []
    return trace.lookup(config, query, limit)
