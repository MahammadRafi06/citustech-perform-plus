"""Persist assumption-driven sensitivities without changing scores or payments."""
from __future__ import annotations

from copy import deepcopy
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import re
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from . import risk_store as store

VERSION = 'financial-sensitivity-2026.1'
CMS_TRANSFER = 'https://www.cms.gov/files/document/2021-ra-technical-paper.pdf'
CMS_2026 = 'https://www.govinfo.gov/content/pkg/FR-2025-01-15/pdf/2025-00640.pdf'
REFERENCES = {
    'MA': [{'title': 'CMS 2027 annual factors; saved adjusted scores retain their own applicable year', 'url': 'https://www.cms.gov/files/document/2027-announcement.pdf', 'pages': '3, 5'}],
    'ACA': [{'title': 'CMS transfer equation, enrollment-weighted PLRS and premium adjustment', 'url': CMS_TRANSFER, 'pages': '8–10, 12'},
            {'title': '2026 final rule: retained formula, high-cost pool and user fee', 'url': CMS_2026, 'pages': '24–25'}],
    'Medicaid': [],
}
METHODS = {
    'MA': 'Sum the selected saved monthly score differences × declared monthly payment basis × declared additional payment multiplier. Saved adjusted scores are not normalized or coding-adjusted again. Simplified sensitivity, not CMS payment reproduction.',
    'ACA': 'For each scenario, transfer PMPM = (target PLRS × IDF × GCF / market weighted risk term − target AV × ARF × IDF × GCF / market weighted rating term) × state-market premium × declared premium and year adjustments. Multiply by target billable member-months; itemize high-cost pool, fees and validation adjustments separately.',
    'Medicaid': 'Use the retained external score divided by a declared rate-cell normalization divisor, or the supplied normalized score directly; multiply by declared state factor, capitation basis and covered months. No local grouper or state payment reproduction.',
}


def field(key, label, type='number', required=True, **extra):
    return dict(key=key, label=label, type=type, required=required, **extra)


COMMON = [field('assumption_basis', 'Assumption source and limitations', 'text'),
          field('uncertainty_percent', 'Sensitivity range (%)', required=False, min=0, max=50,
                help='A user-declared range for payment or market assumptions; not a statistical confidence interval.')]
FIELDS = {
    'MA': [field('period_start', 'First payment month', 'text', help='YYYY-MM; only matching months in the saved runs are used.'),
           field('period_end', 'Last payment month', 'text'),
           field('score_basis', 'Saved score basis', 'select', options=['raw', 'adjusted']),
           field('payment_basis_pmpm', 'Payment basis per member-month ($)', min=0),
           field('payment_multiplier', 'Additional payment multiplier', min=0),
           field('payment_adjustment_basis', 'Additional adjustment basis', 'text')],
    'ACA': [field('state', 'State', 'text'), field('market', 'State-market pool', 'select', options=['individual', 'small_group', 'merged']),
            field('benefit_year', 'Benefit year', min=2026, max=2026),
            field('period_start', 'First covered month', 'text'), field('period_end', 'Last covered month', 'text'),
            field('target_plan_id', 'Target plan / rating area', 'text'),
            field('target_plan_member_months', 'Expected target billable member-months', min=1,
                  help='Must equal the actual matching covered months across the supplied saved runs. No population extrapolation.'),
            field('population_basis', 'Target population definition', 'text'),
            field('market_plans', 'State-market plan assumptions', 'json', help='Array of plan_id, enrollment_share, idf, av, arf, gcf; other plans also need plrs. The target PLRS comes only from saved CSR-adjusted scores.'),
            field('state_market_premium_pmpm', 'Unadjusted state-market premium PMPM ($)', min=0),
            field('premium_adjustment_factor', 'Premium adjustment factor', min=0, help='Explicitly declare the premium adjustment; the BY2026 example uses 0.86.'),
            field('year_adjustment_factor', 'Additional benefit-year adjustment', min=0, help='1 means no additional adjustment; retain its basis in the assumption source.'),
            field('high_cost_pool_payment', 'Assumed high-cost pool payment ($)', min=0),
            field('high_cost_pool_charge', 'Assumed high-cost pool charge ($)', min=0),
            field('user_fee_pmpm', 'User fee per member-month ($)', min=0),
            field('validation_adjustment', 'Assumed validation adjustment ($)', help='Signed amount, held constant between the two scoring scenarios.')],
    'Medicaid': [field('state', 'State', 'text'), field('medicaid_program', 'Medicaid program', 'select', options=['MMA', 'LTC', 'dental']),
                 field('rating_period', 'Rating period', 'text'), field('rate_cell', 'Rate cell', 'text'),
                 field('population_basis', 'Population definition', 'text'),
                 field('normalization_method', 'Relative-score method', 'select', options=['raw_divisor', 'provided_normalized']),
                 field('normalization_divisor', 'Normalization divisor', required=False, min=0, help='Required for raw_divisor; never applied again to a supplied normalized score.'),
                 field('state_factor', 'Declared state factor', min=0), field('state_factor_basis', 'State-factor method and source', 'text'),
                 field('base_capitation_pmpm', 'Base capitation per member-month ($)', min=0),
                 field('eligible_months', 'Covered months per selected member', min=1, max=12,
                       help='Cannot exceed the retained external coverage for either run.')],
}
EXAMPLES = {
    'MA': {'assumption_basis': 'Authored sensitivity assumptions; no actual contract payment or settlement supplied.', 'period_start': '2027-01', 'period_end': '2027-12', 'score_basis': 'adjusted', 'payment_basis_pmpm': 1000, 'payment_multiplier': 1, 'payment_adjustment_basis': 'No additional payment adjustments assumed; CMS score transformations are already in the saved adjusted score.', 'uncertainty_percent': 10},
    'ACA': {'assumption_basis': 'Authored two-plan FL individual-market example. Premium, peer PLRS and market shares are synthetic estimates; target PLRS is calculated from selected runs.', 'state': 'FL', 'market': 'individual', 'benefit_year': 2026, 'period_start': '2026-01', 'period_end': '2026-09', 'target_plan_id': 'TARGET', 'target_plan_member_months': 9, 'population_basis': 'One selected member is the entire hypothetical target plan / rating area for nine months.', 'market_plans': [{'plan_id': 'TARGET', 'enrollment_share': 0.25, 'idf': 1.03, 'av': 0.7, 'arf': 1.2, 'gcf': 1}, {'plan_id': 'OTHER', 'enrollment_share': 0.75, 'plrs': 1.2, 'idf': 1, 'av': 0.6, 'arf': 1.1, 'gcf': 1}], 'state_market_premium_pmpm': 600, 'premium_adjustment_factor': 0.86, 'year_adjustment_factor': 1, 'high_cost_pool_payment': 0, 'high_cost_pool_charge': 0, 'user_fee_pmpm': 0.2, 'validation_adjustment': 0, 'uncertainty_percent': 10},
    'Medicaid': {'assumption_basis': 'Authored Florida MMA sensitivity using retained external scores; no AHCA payment reconciliation.', 'state': 'FL', 'medicaid_program': 'MMA', 'rating_period': '2026', 'rate_cell': 'Adults', 'population_basis': 'Selected imported members in the same declared rating period and rate cell.', 'normalization_method': 'raw_divisor', 'normalization_divisor': 1.1, 'state_factor': 1, 'state_factor_basis': 'Synthetic factor of 1; exact state payment methodology is inactive.', 'base_capitation_pmpm': 800, 'eligible_months': 12, 'uncertainty_percent': 10},
}


def schema():
    return {'version': VERSION, 'programs': [{'id': p, 'name': p, 'method': METHODS[p], 'fields': deepcopy(COMMON + FIELDS[p]),
             'example_assumptions': deepcopy(EXAMPLES[p]), 'example_label': 'Named synthetic assumptions — review before calculating', 'references': REFERENCES[p]} for p in METHODS],
            'actual_payment_status': 'unreconciled'}


def number(value, label, errors, *, minimum=None, positive=False):
    try:
        if isinstance(value, bool) or not isinstance(value, (str, int, float, Decimal)):
            raise InvalidOperation
        result = Decimal(str(value))
        if not result.is_finite() or (minimum is not None and result < minimum) or (positive and result <= 0):
            raise InvalidOperation
        return result
    except (InvalidOperation, ValueError):
        errors.append(label + ' must be a finite ' + ('positive' if positive else 'valid') + ' number.')
        return Decimal(0)


def money(value):
    return float(value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))


def component(key, label, baseline, scenario, unit='USD'):
    return {'key': key, 'label': label, 'baseline': money(baseline), 'scenario': money(scenario), 'difference': money(scenario-baseline), 'unit': unit}


def _pairs(program, baseline, scenario, errors):
    if any(not isinstance(r, dict) for r in baseline + scenario):
        errors.append('Saved calculation runs are required.')
        return []
    left, right = {r['member_id']: r for r in baseline}, {r['member_id']: r for r in scenario}
    if len(left) != len(baseline) or len(right) != len(scenario) or set(left) != set(right):
        errors.append('Supply exactly one baseline and scenario run for each member in the same cohort.')
        return []
    configs = {r.get('config_id') for r in baseline + scenario}
    if len(configs) != 1:
        errors.append('Financial scenarios require the same model configuration and payment basis.')
    for run in baseline + scenario:
        actual = str(run.get('program', ''))
        if run.get('status') != 'completed' or run.get('raw_score') is None:
            errors.append('Every selected scoring run must be completed with a valid score.')
        if actual != program and not (program == 'Medicaid' and actual.startswith('Medicaid')):
            errors.append('The selected program does not match the retained scoring runs.')
        if run.get('stale'):
            errors.append('A stale result cannot supply this financial sensitivity.')
    return [(left[mid], right[mid]) for mid in sorted(left)]


def _monthly(pairs, assumptions, score_basis, errors):
    start, end = assumptions['period_start'], assumptions['period_end']
    if not all(isinstance(v, str) and re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', v) for v in (start, end)) or start > end:
        errors.append('Choose a valid inclusive YYYY-MM period.')
        return [], []
    before, after = [], []
    for left, right in pairs:
        if left.get('year') != right.get('year') or str(left.get('year')) != start[:4] or start[:4] != end[:4]:
            errors.append('Financial period must match both retained scoring years.')
            continue
        rows = []
        for run in (left, right):
            raw = run.get('monthly_scores', [])
            selected = {r['month']: r for r in raw if start <= r.get('month', '') <= end}
            if len(selected) != sum(start <= r.get('month', '') <= end for r in raw):
                errors.append('Duplicate retained member-months are not a financial basis.')
            rows.append(selected)
        if not rows[0] or set(rows[0]) != set(rows[1]):
            errors.append('Both runs must have the same actual covered months in the selected period.')
            continue
        for month in sorted(rows[0]):
            for target, values in ((before, rows[0]), (after, rows[1])):
                target.append(number(values[month].get(score_basis + '_score'), 'Saved monthly ' + score_basis + ' score', errors, minimum=0))
    return before, after


def _estimate(program, pairs, a, errors):
    components, details = [], {}
    if program in ('MA', 'ACA'):
        score_basis = a['score_basis'] if program == 'MA' else 'adjusted'
        before, after = _monthly(pairs, a, score_basis, errors)
        if not before or errors:
            return None
        count = Decimal(len(before)); bscore, sscore = sum(before)/count, sum(after)/count
        details = {'score_basis': score_basis, 'baseline': float(bscore), 'scenario': float(sscore), 'difference': float(sscore-bscore),
                   'eligible_member_months': int(count), 'weighting': 'Matched saved member-months; no annualization or extrapolation.'}
    if program == 'MA':
        rate = number(a['payment_basis_pmpm'], 'Payment basis', errors, minimum=0)
        factor = number(a['payment_multiplier'], 'Additional payment multiplier', errors, minimum=0)
        b, s = sum(before)*rate*factor, sum(after)*rate*factor
        components.append(component('payment_sensitivity', 'Assumed payment basis × saved monthly scores', b, s))
        label = 'Simplified MA payment sensitivity'
    elif program == 'ACA':
        if a['benefit_year'] != 2026 or any(run.get('year') != 2026 for pair in pairs for run in pair):
            errors.append('This verified transfer-method profile covers benefit year 2026 only.')
        if number(a['target_plan_member_months'], 'Expected target billable member-months', errors, positive=True) != count:
            errors.append('Expected target plan member-months must equal the matched saved cohort coverage.')
        plans = a['market_plans']
        if not isinstance(plans, list) or not plans or any(not isinstance(p, dict) for p in plans):
            errors.append('Supply the complete declared state-market plan array.')
            return None
        if len({p.get('plan_id') for p in plans}) != len(plans) or any(not p.get('plan_id') for p in plans):
            errors.append('State-market plan IDs must be present and unique.')
        targets = [p for p in plans if p.get('plan_id') == a['target_plan_id']]
        if len(targets) != 1:
            errors.append('The target plan must appear exactly once in the state-market assumptions.')
            return None
        prepared = []
        for p in plans:
            row = {'plan_id': p['plan_id']}
            for key in ('enrollment_share', 'idf', 'av', 'arf', 'gcf'):
                row[key] = number(p.get(key), f'{p["plan_id"]}.{key}', errors, positive=True)
            if row['av'] > 1 or row['enrollment_share'] > 1:
                errors.append('Actuarial value and enrollment share cannot exceed 1.')
            if p['plan_id'] != a['target_plan_id']:
                row['plrs'] = number(p.get('plrs'), p['plan_id'] + '.plrs', errors, minimum=0)
            elif p.get('plrs') is not None:
                errors.append('Target plan PLRS must come from the saved scoring runs; remove its manual plrs assumption.')
            prepared.append(row)
        if abs(sum(p['enrollment_share'] for p in prepared)-1) > Decimal('0.000000001'):
            errors.append('Declared market enrollment shares must sum to 1.')
        premium = number(a['state_market_premium_pmpm'], 'State-market premium', errors, minimum=0)
        adjusted_premium = premium * number(a['premium_adjustment_factor'], 'Premium adjustment', errors, minimum=0)
        year_factor = number(a['year_adjustment_factor'], 'Benefit-year adjustment', errors, minimum=0)
        hcp = number(a['high_cost_pool_payment'], 'High-cost pool payment', errors, minimum=0)
        hcc = number(a['high_cost_pool_charge'], 'High-cost pool charge', errors, minimum=0)
        fee = number(a['user_fee_pmpm'], 'User fee', errors, minimum=0)*count
        validation = number(a['validation_adjustment'], 'Validation adjustment', errors)
        if errors:
            return None
        target = next(p for p in prepared if p['plan_id'] == a['target_plan_id'])
        rating_den = sum(p['enrollment_share']*p['av']*p['arf']*p['idf']*p['gcf'] for p in prepared)
        rating_num = target['av']*target['arf']*target['idf']*target['gcf']
        transfer, denominator = [], []
        for score in (bscore, sscore):
            risk_den = sum(p['enrollment_share']*(score if p['plan_id'] == a['target_plan_id'] else p['plrs'])*p['idf']*p['gcf'] for p in prepared)
            if risk_den <= 0 or rating_den <= 0:
                errors.append('Market risk and rating denominators must be positive.')
                return None
            transfer.append((score*target['idf']*target['gcf']/risk_den-rating_num/rating_den)*adjusted_premium*year_factor*count)
            denominator.append(float(risk_den))
        components = [component('state_transfer', 'State-market transfer sensitivity', *transfer), component('high_cost_payment', 'Assumed high-cost pool payment', hcp, hcp),
                      component('high_cost_charge', 'Assumed high-cost pool charge', -hcc, -hcc), component('user_fee', 'Assumed user fee', -fee, -fee),
                      component('validation_adjustment', 'Assumed validation adjustment', validation, validation)]
        b, s = [v+hcp-hcc-fee+validation for v in transfer]
        details.update(target_plan_plrs={'baseline': float(bscore), 'scenario': float(sscore)}, risk_denominators=denominator,
                       rating_denominator=float(rating_den), target_enrollment_share=float(target['enrollment_share']),
                       implied_market_member_months=float(count/target['enrollment_share']), adjusted_premium_pmpm=float(adjusted_premium),
                       csr_basis='Saved CSR-adjusted enrollee scores; no second CSR adjustment.', method_year=2026)
        label = 'ACA state-market transfer sensitivity including declared separate adjustments'
    else:
        count = number(a['eligible_months'], 'Covered months', errors, positive=True)
        if count != count.to_integral_value() or count > 12:
            errors.append('Covered months must be a whole number from 1 to 12.')
        normalized = a['normalization_method'] == 'provided_normalized'
        divisor = Decimal(1) if normalized else number(a.get('normalization_divisor'), 'Rate-cell normalization divisor', errors, positive=True)
        factor = number(a['state_factor'], 'Declared state factor', errors, minimum=0)
        rate = number(a['base_capitation_pmpm'], 'Base capitation', errors, minimum=0)
        weighted = [Decimal(0), Decimal(0)]
        for pair in pairs:
            for index, run in enumerate(pair):
                if run.get('origin') != 'external_import' or run.get('run_type') != 'external_score':
                    errors.append('Medicaid sensitivity requires retained external imported scores, not a local grouper result.')
                if run.get('rating_period') != a['rating_period'] or run.get('rate_cell') != a['rate_cell'] or run.get('program') != 'Medicaid · ' + a['medicaid_program']:
                    errors.append('External period, program and rate cell must match the declared assumptions.')
                if a['state'] != 'FL':
                    errors.append('The retained Medicaid configuration is Florida; another state needs its own configuration.')
                if count > number(run.get('coverage_months'), 'Retained covered months', errors, positive=True):
                    errors.append('Assumed months exceed retained external coverage.')
                score = number(run.get('adjusted_score' if normalized else 'raw_score'), 'Retained external score', errors, minimum=0)
                if divisor:
                    weighted[index] += score/divisor*count
        if errors:
            return None
        b, s = [score*factor*rate for score in weighted]
        mm = count*len(pairs)
        details = {'score_basis': a['normalization_method'], 'baseline': float(weighted[0]/mm), 'scenario': float(weighted[1]/mm), 'difference': float((weighted[1]-weighted[0])/mm),
                   'eligible_member_months': int(mm), 'normalization_divisor': float(divisor), 'state_factor': float(factor),
                   'weighting': 'Retained external coverage limited to the explicitly selected months.'}
        components = [component('external_sensitivity', 'External relative score × declared state factor × capitation', b, s)]
        label = 'Declared Medicaid rate-cell capitation sensitivity'
    if errors:
        return None
    return {'estimate': {'baseline': money(b), 'scenario': money(s), 'difference': money(s-b), 'currency': 'USD', 'label': label},
            'score_comparison': details, 'components': components}


def evaluate(program, baseline_runs, scenario_runs, assumptions):
    """Pure financial evaluation; values must be server-loaded retained runs."""
    result = {'version': VERSION, 'program': program, 'status': 'incomplete', 'missing': [], 'errors': [],
              'assumptions': deepcopy(assumptions), 'estimate': None, 'components': [], 'sensitivities': [],
              'actual_payment_status': 'unreconciled', 'method': METHODS.get(program), 'references': REFERENCES.get(program, []),
              'baseline_run_ids': [r['id'] for r in baseline_runs], 'scenario_run_ids': [r['id'] for r in scenario_runs],
              'member_ids': sorted({r['member_id'] for r in baseline_runs + scenario_runs}),
              'score_provenance': [{'run_id': r['id'], 'input_hash': r.get('input_hash'), 'snapshot_id': r.get('snapshot_id'), 'config_id': r.get('config_id'), 'score_basis': r.get('score_basis')} for r in baseline_runs + scenario_runs],
              'scope': 'Assumption-driven sensitivity. Stored scoring results, approved diagnoses and imported payment records remain unchanged.'}
    if program not in METHODS:
        result['errors'] = ['No financial sensitivity is configured for this program. Part D does not inherit an MA payment formula.']
        return result
    missing = result['missing']
    if not baseline_runs: missing.append('baseline_run_id')
    if not scenario_runs: missing.append('scenario_run_id')
    for spec in COMMON + FIELDS[program]:
        value = assumptions.get(spec['key'])
        if spec['required'] and (value is None or value == ''):
            missing.append(spec['key'])
        elif value is not None and spec.get('options') and value not in spec['options']:
            result['errors'].append(spec['label'] + ' is not a supported selection.')
        elif value is not None and spec['type'] == 'text' and (not isinstance(value, str) or not value.strip()):
            result['errors'].append(spec['label'] + ' is required as text.')
    if program == 'Medicaid' and assumptions.get('normalization_method') == 'raw_divisor' and assumptions.get('normalization_divisor') is None:
        missing.append('normalization_divisor')
    if missing or result['errors']:
        return result
    pairs = _pairs(program, baseline_runs, scenario_runs, result['errors'])
    if result['errors']:
        return result
    calculated = _estimate(program, pairs, assumptions, result['errors'])
    if not calculated or result['errors']:
        return result
    result.update(calculated, status='complete')
    if assumptions.get('uncertainty_percent') is not None:
        percent = number(assumptions['uncertainty_percent'], 'Sensitivity range', result['errors'], minimum=0)
        if percent > 50:
            result['errors'].append('Sensitivity range must be between 0 and 50 percent.')
        if result['errors']:
            result.update(status='incomplete', estimate=None, components=[])
            return result
        key = {'MA': 'payment_basis_pmpm', 'ACA': 'state_market_premium_pmpm', 'Medicaid': 'base_capitation_pmpm'}[program]
        label = {'MA': 'Monthly payment basis', 'ACA': 'State-market premium', 'Medicaid': 'Base capitation'}[program]
        for direction in (-1, 1):
            varied = deepcopy(assumptions)
            varied[key] = str(Decimal(str(assumptions[key]))*(1+direction*percent/100))
            alternate = _estimate(program, pairs, varied, [])
            result['sensitivities'].append({**alternate['estimate'], 'label': f'{label}: {"−" if direction < 0 else "+"}{percent}%', 'assumption_overrides': {key: float(varied[key])}})
            if program == 'ACA' and len(assumptions['market_plans']) > 1:
                varied = deepcopy(assumptions)
                for plan in varied['market_plans']:
                    if plan['plan_id'] != assumptions['target_plan_id']:
                        plan['plrs'] = str(Decimal(str(plan['plrs']))*(1+direction*percent/100))
                alternate = _estimate(program, pairs, varied, [])
                result['sensitivities'].append({**alternate['estimate'], 'label': f'Other-plan PLRS: {"−" if direction < 0 else "+"}{percent}%', 'assumption_overrides': {'market_plans': varied['market_plans']}})
    return result


class FinancialRequest(BaseModel):
    program: Literal['MA', 'ACA', 'Medicaid']
    name: str = Field(default='Financial sensitivity', max_length=160)
    baseline_run_id: str | None = None
    scenario_run_id: str | None = None
    baseline_run_ids: list[str] = Field(default_factory=list, max_length=10000)
    scenario_run_ids: list[str] = Field(default_factory=list, max_length=10000)
    assumptions: dict[str, Any] = Field(default_factory=dict)


def register(app, *, db, user, get_state, allowed_members, member, permit, event):
    router = APIRouter(prefix='/api/v1/risk/financial', tags=['Financial sensitivity'])

    def visible(value, state, u):
        mids = set(value.get('member_ids', []))
        return mids <= {m['id'] for m in allowed_members(state, u)} if mids else value.get('actor_id') == u['id']

    @router.get('/schema')
    def get_schema(u=Depends(user)):
        return schema()

    @router.get('')
    def history(u=Depends(user)):
        with db() as conn:
            state = get_state(conn)
            return {'items': [row for row in store.records(conn, 'financial', limit=None) if visible(row, state, u)]}

    @router.get('/{record_id}')
    def saved(record_id: str, u=Depends(user)):
        with db() as conn:
            value = store.body(conn.execute('SELECT body FROM risk_records WHERE id=? AND kind=?', (record_id, 'financial')).fetchone())
            if not value or not visible(value, get_state(conn), u):
                raise HTTPException(404, 'Financial sensitivity is unavailable.')
            return value

    @router.post('')
    def calculate(request: FinancialRequest, u=Depends(user)):
        permit(u, 'risk_scenario')
        with db() as conn:
            state = get_state(conn)
            def load(single, many):
                ids = [single] if single and not many else many
                if single and many:
                    raise HTTPException(400, 'Choose a single run ID or an array, not both.')
                result = []
                for rid in ids:
                    run = store.get_run(conn, rid)
                    if not run:
                        raise HTTPException(404, 'Scoring run is unavailable.')
                    member(state, u, run['member_id'])
                    result.append(run)
                return result
            before, after = load(request.baseline_run_id, request.baseline_run_ids), load(request.scenario_run_id, request.scenario_run_ids)
            result = evaluate(request.program, before, after, request.assumptions)
            result.update(name=request.name, actor_id=u['id'], assumptions_hash=store.digest(request.assumptions))
            saved = store.record(conn, 'financial', result, result['member_ids'][0] if len(result['member_ids']) == 1 else None)
            event(conn, u, 'financial_sensitivity', saved['id'], request.program + ': ' + saved['status'])
            return saved

    app.include_router(router)
