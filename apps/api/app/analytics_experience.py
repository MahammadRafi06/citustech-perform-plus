"""Versioned, deterministic analytics projections for the local presentation.

This module never publishes risk_stages or changes clinical findings. Population
scores and additional stories are authored fixtures, not native model output.
Original findings and retained source excerpts keep their identities/provenance.
"""
from __future__ import annotations

from . import analytics_landing, suspect_discovery
from collections import Counter, defaultdict
from copy import deepcopy
from datetime import date, timedelta
import csv
import hashlib
import io
import json
import math
import zipfile

VERSION = 'analytics-population-2026.7'
METHOD = 'SYN_SUPPORT90_V1'
AS_OF = '2026-09-15'
SNAPSHOTS = ['2026-07-15', '2026-08-15', AS_OF]
CATEGORIES = {'CG': 'Coding gap', 'RC': 'Recapture', 'NC': 'New condition', 'SP': 'Specificity',
              'ST': 'Persistent status', 'OC': 'Potential overcapture', 'DR': 'Data representation'}
LEGACY = {'documented_gap': 'CG', 'historical_condition': 'RC', 'predictive_signal': 'NC',
          'integrity_review': 'OC', 'source_issue': 'DR', 'scenario_comparison': 'SP'}
OPEN = {'new', 'awaiting_assessment', 'in_review', 'request_evidence', 'needs_clarification', 'pending'}
CLOSED = {'resolved_supported', 'resolved_unsupported', 'suppressed', 'deferred', 'completed', 'accepted'}
CATALOG = [
    ('Diabetes with complications', '37', .22), ('Heart failure', '226', .31),
    ('Chronic kidney disease', '328', .19), ('COPD', '280', .24),
    ('Depression', '155', .14), ('Obesity', '48', .11),
    ('Cardiovascular conditions', '238', .20), ('HIV', '1', .28),
    ('Persistent status', '409', .16), ('Cancer status', '23', .26),
]
CONTRACTS = [('H1032', 'H1032 · Northstar Health'), ('H5594', 'H5594 · Meridian Advantage'),
             ('H7618', 'H7618 · Gulf Coast Partners'), ('unknown', 'Unassigned contract')]
REPORTS = [
    ('R01', 'Executive risk summary', 'How is population risk changing?', 'overview'),
    ('R02', 'Risk distribution & condition burden', 'What drives the risk mix?', 'risk'),
    ('R03', 'Recapture completeness', 'Which persistent conditions need attention?', 'risk'),
    ('R04', 'Period & model comparison', 'How do comparable score snapshots differ?', 'raf'),
    ('R05', 'Geography comparison', 'Where are opportunities concentrated?', 'geography'),
    ('R06', 'Suspect opportunity concentration', 'Which clinical questions dominate?', 'suspecting'),
    ('R07', 'Support-likelihood planning', 'What outcomes are assumed after review?', 'suspecting'),
    ('R08', 'Financial scenarios', 'How do assumptions change potential value?', 'financial'),
    ('R09', 'Accuracy & representation integrity', 'Where might risk be overstated?', 'suspecting'),
    ('R10', 'AI evaluation', 'What does the frozen evaluation establish?', 'ai'),
    ('R11', 'Coverage & data reliability', 'What supports these results?', 'coverage'),
    ('R12', 'Provider performance', 'How do provider risk, capture and recapture compare?', 'provider'),
]


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':'), default=str).encode()).hexdigest()


def number(key):
    return int(hashlib.sha256(str(key).encode()).hexdigest()[:10], 16)


def concept(text):
    text = text.lower()
    for words, index in [('diabet', 0), ('heart failure', 1), ('kidney', 2), ('ckd', 2), ('copd', 3),
                         ('pulmonary', 3), ('depress', 4), ('obes', 5), ('vascular', 6), ('fibrillation', 6),
                         ('hiv', 7), ('amput', 8), ('status', 8), ('cancer', 9)]:
        if words in text:
            return index
    return None


def disposition(status):
    return 'open' if status in OPEN else 'resolved' if status in CLOSED else 'superseded' if status == 'superseded' else 'unknown'


def probability(category, evidence, status='open', *, stale=False, excluded=False):
    reason = None
    if status != 'open': reason = 'Case is not an open future-support opportunity'
    elif category not in {'CG', 'RC', 'NC', 'SP', 'ST'}: reason = 'Integrity/data issue; positive-support target does not apply'
    if reason:
        return {'base': None, 'low': None, 'high': None, 'band': 'Not applicable', 'reason': reason, 'method': METHOD}
    anchor = {'Strong': .80, 'Moderate': .50, 'Limited': .20}.get(evidence)
    if anchor is None or stale or excluded:
        return {'base': None, 'low': None, 'high': None, 'band': 'Unknown', 'reason': 'Stale analysis' if stale else 'Source/identity exclusion' if excluded else 'Evidence grade not supplied', 'method': METHOD}
    p = round(max(.05, min(.90, anchor + {'RC': -.10, 'NC': -.15}.get(category, 0))), 4)
    return {'base': p, 'low': max(0, round(p-.10, 4)), 'high': min(1, round(p+.10, 4)),
            'band': 'High' if p >= .70 else 'Medium' if p >= .40 else 'Low',
            'reason': 'Authored assumption: support by day 90 conditional on review reached by day 30', 'method': METHOD}


def canonicalize(findings, members, config, as_of=AS_OF):
    """Source aliases never count as additional cases or clinical corroboration."""
    member_map = {m['id']: m for m in members}
    groups = {}
    for original in findings:
        if original['member_id'] not in member_map:
            continue
        row = deepcopy(original)
        category = row.get('business_category') or LEGACY.get(row.get('type'), 'Unknown')
        condition = row.get('condition', 'Representation question')
        domain_index = concept(condition)
        domain, hcc, exposure = CATALOG[domain_index] if domain_index is not None else ('Unmapped clinical concept', None, None)
        primary = row.get('clinical_concept') or condition.lower().strip()
        period = row.get('service_period') or str(config['year'])
        direction = row.get('direction') or ('remove' if category == 'OC' else 'data' if category == 'DR' else 'add')
        identity = (row['member_id'], primary, period, row.get('episode', 'persistent'), direction)
        key = 'CASE-' + digest(identity)[:14]
        updated = (row.get('analysis_date') or (row.get('recommendation_history') or [{}])[-1].get('created_at') or '2026-09-01')[:10]
        if updated > as_of:
            continue
        if key in groups:
            groups[key]['aliases'].append(row['id'])
            groups[key]['document_ids'] = sorted(set(groups[key]['document_ids'] + row.get('document_ids', [])))
            groups[key]['rule_ids'] = sorted(set(groups[key]['rule_ids'] + [row.get('rule_id', 'RULE-' + row.get('type', category).upper())]))
            continue
        status = disposition(row.get('status', 'unknown'))
        evidence = row.get('evidence', 'Unknown')
        stale = (date.fromisoformat(as_of) - date.fromisoformat(updated)).days > 30
        p = probability(category, evidence, status, stale=stale, excluded=row.get('identity_excluded', False))
        exposure = row.get('illustrative_exposure', exposure)
        if category == 'OC': exposure = -abs(exposure) if exposure is not None else None
        if category == 'DR': exposure = None
        member = member_map[row['member_id']]
        family = 'HCC' if config['program'] == 'MA' else 'RxHCC' if config['program'] == 'Part D' else 'HHS-HCC' if config['program'] == 'ACA' else 'Risk group'
        groups[key] = dict(id=key, aliases=[row['id']], member_id=row['member_id'], member_name=member.get('name', row['member_id']), discovery=deepcopy(row.get('discovery')), condition=condition,
            domain=domain, category=category, category_label=CATEGORIES.get(category, 'Unmapped'), direction=direction,
            legacy_type=row.get('type', 'authored_question'), rule_ids=[row.get('rule_id', 'RULE-' + row.get('type', category).upper())],
            rule_type=row.get('rule_type') or {'CG': 'Documentation match', 'RC': 'Historical gap', 'NC': 'Signal combination', 'SP': 'Specificity check', 'ST': 'Status persistence', 'OC': 'Representation integrity', 'DR': 'Source validation'}.get(category, 'Unmapped'),
            hcc='Mapping unresolved' if domain_index is None else f'HCC {hcc}' if config['program'] == 'MA' else f'Risk group {domain_index+1:02}',
            mapping_origin='Authored analytic grouping; confirm native mapping before calculation',
            evidence=evidence, status=status, raw_status=row.get('status', 'unknown'), probability=p,
            delta=exposure, impact_basis='Illustrative adjusted-score equivalent', analysis_date=updated,
            probability_t0=updated, stale=stale, document_ids=row.get('document_ids', []),
            source_available=False, provider_id=member['provider_id'], provider=member.get('provider', 'Assigned practice'),
            county=member.get('county') or 'Unknown', contract=contract_for(member),
            qualified=status == 'open' and category != 'Unknown',
            summary=row.get('summary') or row.get('clinical_context', {}).get('summary') or f'Assess whether the {condition.lower()} representation is supported for the selected period.',
            countercheck=row.get('countercheck') or 'Confirm subject, timing, negation, source eligibility and clinical specificity before interpreting this hypothesis.',
            recommendation_history=row.get('recommendation_history', []),
            authored_extension=bool(row.get('authored_extension')))
    return list(groups.values())


def contract_for(member):
    return member.get('analytics_contract') or CONTRACTS[number(member['id'] + ':contract') % 3][0]


def extensions(members):
    """Read-only authored stories supplement gaps; never alter retained evidence."""
    if not members: return []
    all_members = sorted(members, key=lambda m: m['id'])
    examples = [
        ('HIV representation question', 'OC', 'A copied historical label conflicts with the authored current problem-status metadata; confirm the source and period.'),
        ('Diabetes with complications relationship', 'OC', 'A complication relationship is not explicit in the authored assessment; medication use alone is insufficient.'),
        ('CKD stage specificity', 'OC', 'The represented stage differs from the authored assessment; an isolated laboratory value is not a diagnosis.'),
        ('Depression episode specificity', 'OC', 'The authored episode/remission context needs to agree with the represented severity and period.'),
        ('Obesity representation eligibility', 'OC', 'Confirm a documented diagnosis, applicable eligibility and the selected model; a measurement alone is not confirmation.'),
        ('Cardiovascular conditions status', 'OC', 'Distinguish active disease from history in the eligible encounter; later resolution does not negate earlier valid evidence.'),
        ('Amputation persistent status', 'ST', 'The status may be relevant independently of diabetes; do not infer its etiology.'),
        ('Diabetes with complications specificity', 'SP', 'The relationship and complication require independent supporting evidence.'),
    ]
    return [dict(id=f'AUTH-{i+1:03}', member_id=all_members[min(i, len(all_members)-1)]['id'], condition=name,
                 type='integrity_review' if cat == 'OC' else 'documented_gap', business_category=cat,
                 evidence='Strong', status='new', document_ids=[], analysis_date='2026-09-04',
                 authored_extension=True, countercheck=note, summary=note)
            for i, (name, cat, note) in enumerate(examples)]


def snapshot_questions(members, as_of):
    """Standalone authored prior-period questions; never backdate retained findings."""
    if as_of == AS_OF: return []
    count = 600 if as_of == SNAPSHOTS[0] else 800
    categories = list(CATEGORIES)
    output = []
    for i, member in enumerate(sorted(members, key=lambda m:m['id'])[:count]):
        category = categories[i % len(categories)]
        output.append(dict(id=f'PRESENTATION-{as_of}-{member["id"]}', member_id=member['id'],
            condition=member.get('condition') or 'Clinical representation question',
            type='authored_snapshot', business_category=category, evidence=['Strong','Moderate','Limited'][i%3],
            status='new', document_ids=[], analysis_date=as_of[:8]+'10',
            summary='Prepared prior-period analytic question from the synthetic population. No source quotation or native score assertion is implied.',
            countercheck='This is separately authored snapshot metadata. Inspect original retained evidence before making a clinical or coding interpretation.'))
    return output


def capture_questions(members, findings, as_of):
    """Stable, metadata-only planning cohort; never manufacture source evidence.

    Select globally before authorization/filtering so narrowing a report cannot
    create new opportunities. Existing findings and their probabilities stay intact.
    """
    represented = {f['member_id'] for f in findings}
    candidates = sorted((m for m in members if m['id'] not in represented
                         and concept(m.get('condition', '')) is not None),
                        key=lambda m: (number(m['id'] + ':capture-cohort'), m['id']))[:1200]
    output = []
    for member in candidates:
        n = number(member['id'] + ':capture-question')
        category = ['CG', 'RC', 'SP'][n % 3]
        output.append(dict(id=f'CAPTURE-{as_of}-{member["id"]}', member_id=member['id'],
            condition=member['condition'], type='authored_capture', business_category=category,
            evidence='Strong' if n % 4 else 'Moderate', status='new', document_ids=[],
            analysis_date=as_of, rule_id=f'ILLUSTRATIVE-{category}-SUPPORT',
            summary=f'Prepared {CATEGORIES[category].lower()} planning question for {member["condition"].lower()}. '
                    'The evidence grade and score-equivalent opportunity are authored scenario assumptions, not chart findings.',
            countercheck='No source document is attached to this illustrative question. Confirm diagnosis, period, specificity and eligible evidence before any clinical or coding decision.'))
    return output


def quantile(values, q):
    if not values: return None
    a = sorted(values); pos = (len(a)-1)*q; lo = math.floor(pos); hi = math.ceil(pos)
    return a[lo] + (a[hi]-a[lo])*(pos-lo)


def weighted(rows, key='score'):
    valid = [r for r in rows if r.get(key) is not None and r.get('weight', 0) > 0]
    denominator = sum(r['weight'] for r in valid)
    return sum(r[key]*r['weight'] for r in valid)/denominator if denominator else None


def population(members, config, context):
    result = []
    snap = context.get('snapshot', AS_OF)
    stage = context.get('stage', 'adjusted')
    # These are declared presentation assumptions, never native normalization.
    multiplier = {'MA': 1, 'Part D': .72, 'ACA': 1.35, 'Medicaid': .88}.get(config['program'], 1)
    multiplier *= {2024:.975, 2025:.988, 2026:1, 2027:1.015}.get(config['year'], 1)
    multiplier *= 1.008 if config.get('run_type') == 'forecast' else .993 if config.get('run_type') == 'initial' else 1
    for m in members:
        n = number(m['id'] + ':population')
        # Intentionally varied authored condition mix, not an estimate of Florida prevalence.
        thresholds = [1300, 850, 1100, 900, 750, 1300, 650, 65, 180, 420]
        condition_ids = {i for i,threshold in enumerate(thresholds) if number(m['id']+':condition:'+str(i)) % 10000 < threshold}
        primary_concept = concept(m.get('condition', ''))
        if primary_concept is not None: condition_ids.add(primary_concept)
        raw = .22 + (n % 800)/1000 + len(condition_ids)*.19 + (1.1 if n % 19 == 0 else 0)
        raw *= multiplier * (.91 + (number(m.get('county','Unknown')) % 24)/100)
        month = int(context.get('run_month', 'all')) if context.get('run_month', 'all') != 'all' else 9
        score = raw * (1 if stage == 'raw' else .965) * (1 + (month-9)*.004)
        score *= {'2026-07-15': .963, '2026-08-15': .981, AS_OF: 1}.get(snap, 1)
        eligible = n % 149 != 0
        stale = n % 151 == 0
        missing = n % 157 == 0
        weight = 12 - n % 4 if context.get('run_month', 'all') == 'all' else 1
        result.append(dict(id=m['id'], provider_id=m['provider_id'], provider=m.get('provider', 'Assigned practice'),
            county=m.get('county') or 'Unknown', contract=contract_for(m), eligible=eligible,
            stale=stale, score=score if eligible and not missing and (not stale or context.get('freshness') == 'last_available') else None,
            raw=raw, weight=weight, conditions=sorted(condition_ids), recaptured=n % 5 != 0 and 1+analytics_landing.seed(m['id']+':confirmed-month') % 9 <= min(month, int(snap[5:7]))))
    return result


def score_bases(baseline, positive_uplift):
    """Presentation stages: baseline < accepted <= submitted < potential.

    The user requested populated illustrative stages even when the retained data
    has no receiver stages. A disclosed six-thousandths minimum opportunity
    keeps the ordering visible at three decimals. Never used by the native engine.
    """
    if baseline is None:
        return dict(captured_baseline=None, potential=None, submitted=None, accepted=None)
    uplift = max(float(positive_uplift), .006)
    return dict(captured_baseline=baseline, potential=baseline+uplift,
                submitted=baseline+uplift*.62, accepted=baseline+uplift*.54)


def frozen_selection(cases):
    winners = {}; excluded = []
    for c in cases:
        p = c['probability']['base']
        if c['status'] != 'open' or p is None or c['delta'] is None or c['delta'] <= 0: continue
        key = c['member_id']
        rank = (p*c['delta'], {'Strong':3, 'Moderate':2, 'Limited':1}.get(c['evidence'], 0))
        old = winners.get(key)
        if old is None or rank > old[0] or (rank == old[0] and c['id'] < old[1]['id']):
            if old: excluded.append(old[1]['id'])
            winners[key] = (rank, c)
        else: excluded.append(c['id'])
    return [v[1] for v in winners.values()], sorted(excluded)


def finance(cases, settings=None, visible_ids=None):
    settings = settings or {}
    reach = float(settings.get('reach', .75)); realization = float(settings.get('realization', .90))
    benchmark = float(settings.get('benchmark', 1000)); months = int(settings.get('months', 12))
    recognition = int(settings.get('recognition', 1)); start = settings.get('start', '2027-01')
    if not (0 <= reach <= 1 and 0 <= realization <= 1 and math.isfinite(benchmark) and 0 < benchmark <= 100000 and 1 <= months <= 24 and 1 <= recognition <= months):
        raise ValueError('Choose valid reach/realization, a positive sensitivity basis, and a 1–24 month payment window.')
    year, month = map(int, start.split('-'))
    if not (2024 <= year <= 2040 and 1 <= month <= 12): raise ValueError('Choose a valid payment start month.')
    winners, excluded = frozen_selection(cases)
    corrections = [c for c in cases if c['category'] == 'OC' and c['status'] == 'open']
    if visible_ids is not None:
        winners = [c for c in winners if c['id'] in visible_ids]
        corrections = [c for c in corrections if c['id'] in visible_ids]
    # Authored corrections in this presentation are assumed validated for valuation,
    # not clinically approved. Native execution remains a different calculation mode.
    correction_by_member = defaultdict(float)
    for c in corrections:
        if c['delta'] is not None: correction_by_member[c['member_id']] += c['delta']
    scenarios = []
    curve = []
    for name, r, z, pkey in [('Conservative', .50, .70, 'low'), ('Base', reach, realization, 'base'), ('Optimistic', .90, 1., 'high')]:
        terms = []
        for c in winners:
            p = c['probability'][pkey]
            terms.append((c['delta'], p))
        monthly = []
        for offset in range(months):
            label = f'{year+(month-1+offset)//12}-{(month-1+offset)%12+1:02}'
            active = offset+1 >= recognition
            gross = sum(e*benchmark for e, p in terms) if active else 0
            support = sum(r*p*e*benchmark for e, p in terms) if active else 0
            realized = support*z
            correction = sum(correction_by_member.values())*benchmark
            monthly.append(dict(month=label, gross=gross, support=support, realized=realized,
                                corrections=correction, net=realized+correction))
        totals = {key: sum(row[key] for row in monthly) for key in ['gross','support','realized','corrections','net']}
        scenarios.append(dict(name=name, reach=r, realization=z, probability=pkey, **totals, monthly=monthly))
    for index in range(months):
        curve.append({'month': scenarios[1]['monthly'][index]['month'], **{s['name']: sum(m['net'] for m in s['monthly'][:index+1]) for s in scenarios}})
    missing = sum(c['delta'] is None for c in corrections)
    base = scenarios[1]
    waterfall = [dict(name='Gross potential', start=0, end=base['gross']),
        dict(name='Reach & support', start=base['support'], end=base['gross']),
        dict(name='Recognition', start=base['realized'], end=base['support']),
        dict(name='Corrections', start=base['net'], end=base['realized']),
        dict(name='Modeled net', start=0, end=base['net'])]
    return dict(**{k: base[k] for k in ['gross','support','realized','corrections','net']}, scenarios=scenarios, curve=curve,
        waterfall=waterfall, selected_ids=[c['id'] for c in winners], excluded_ids=excluded,
        selection_hash=digest([c['id'] for c in winners]), selected_count=len(winners), excluded_count=len(excluded),
        unvalued_corrections=missing, partial=missing > 0, method='ILLUSTRATIVE_MA_SUPPORT90_V1',
        assumptions=dict(reach=reach, realization=realization, benchmark=benchmark, months=months, recognition=recognition,
                         start=start, eligibility='Authored continuation of coverage for the chosen future window',
                         corrections='Authored validated-correction scenario; independent immediate effective schedule',
                         impact='Authored adjusted-score-equivalent increments after the assumed correction',
                         origin='authored_synthetic_assumption', probability_method=METHOD))


def case_matches(c, context):
    return suspect_discovery.matches(c, context.get('discovery')) and (not context.get('band') or c['probability']['band'] == context['band']) and (not context.get('category') or c['category'] == context['category'] or context['category']=='capture' and c['category'] in {'CG','RC','NC','SP','ST'}) and (not context.get('condition') or c['domain'] == context['condition'] or c['hcc'] == context['condition']) and (not context.get('evidence') or c['evidence'] == context['evidence']) and (not context.get('rule') or c['rule_type'] == context['rule']) and (context.get('source') != 'retained' or c['source_available']) and (context.get('disposition', 'open') == 'all' or c['status'] == context.get('disposition', 'open')) and (not context.get('q') or context['q'].lower() in ' '.join([c['id'],*c['aliases'],c['member_id'],c['condition'],c['hcc'],c.get('member_name',''),(c.get('discovery') or {}).get('signal',''),(c.get('discovery') or {}).get('label','')]).lower())


def safe_ratio(n, d): return n/d if d else None


def metric(value, numerator, denominator, unit, context, **extra):
    return dict(value=value, numerator=numerator, denominator=denominator, unit=unit, definition_version=VERSION,
        filter_hash=digest(context), period=context.get('run_month', 'all'), score_basis=context.get('basis', 'captured_baseline'),
        score_stage=context.get('stage', 'adjusted'), origin='authored_synthetic_fixture', **extra)


def build(state, members, config, context, *, include_evidence=True):
    ctx = dict(context)
    ctx.setdefault('snapshot', AS_OF); ctx.setdefault('stage', 'adjusted'); ctx.setdefault('basis', 'captured_baseline')
    if ctx['snapshot'] not in SNAPSHOTS: raise ValueError('Unknown retained presentation snapshot.')
    if ctx['stage'] not in ('raw', 'adjusted'): raise ValueError('Unknown score stage.')
    if ctx['basis'] not in ('captured_baseline', 'potential', 'submitted', 'accepted'): raise ValueError('Unknown presentation score basis.')
    if ctx.get('run_month', 'all') not in ['all'] + [f'{i:02}' for i in range(1,13)]: raise ValueError('Unknown reporting month.')
    options = dict(counties=sorted({m.get('county') or 'Unknown' for m in members}),
        practices=[dict(id=k, name=v) for k,v in sorted({m['provider_id']:m.get('provider','Assigned practice') for m in members}.items())],
        contracts=[dict(id=k, name=v) for k,v in CONTRACTS if any(contract_for(m)==k for m in members)])
    root = [m for m in members if (not ctx.get('counties') or (m.get('county') or 'Unknown') in ctx['counties'])
        and analytics_landing.member_matches(m, ctx)
        and (not ctx.get('practices') or m['provider_id'] in ctx['practices']) and (not ctx.get('contract') or contract_for(m)==ctx['contract'])]
    rows = population(root, config, ctx)
    eligible_ids = {r['id'] for r in rows if r['eligible']}
    # Only globally stable extensions are used: filtering never invents new stories.
    discovery_findings, discovery_documents = suspect_discovery.fixtures(state['members'])
    retained = state['opportunities'] + extensions(state['members']) + discovery_findings
    questions = snapshot_questions(state['members'], ctx['snapshot'])
    questions += capture_questions(state['members'], retained, ctx['snapshot'])
    cases = canonicalize(retained + questions, root, config, ctx['snapshot'])
    documents = {d['id']: d for d in discovery_documents + state.get('documents', [])}
    for c in cases:
        retained = [documents[k] for k in c['document_ids'] if k in documents and documents[k].get('member_id') == c['member_id']
                    and documents[k].get('source_member_id', c['member_id']) == c['member_id']
                    and documents[k].get('available', True) and documents[k].get('source_status') != 'not_loaded'
                    and documents[k].get('date', '1900-01-01') <= ctx['snapshot']
                    and (not documents[k].get('requires_publication') or documents[k].get('published_at'))]
        c['source_available'] = bool(retained)
        c['sources'] = [dict(id=d['id'], title=d.get('title'), date=d.get('date'), status=d.get('source_status'), origin=d.get('origin', 'retained_record'),
            content_hash=digest(d), excerpts=[dict(page=p['number'], section=sec['heading'], text=sec['text'])
            for p in d.get('pages',[]) for sec in p.get('sections',[]) if sec.get('highlight')]) for d in retained] if include_evidence else []
        c['qualified'] = c['qualified'] and c['member_id'] in eligible_ids
        if c['member_id'] not in eligible_ids:
            c['probability'] = probability(c['category'], c['evidence'], 'not_eligible')
    root_cases = cases
    if ctx.get('condition'):
        matching_indices = {i for i,(name,hcc,_) in enumerate(CATALOG) if ctx['condition'] in (name, f'HCC {hcc}', f'Risk group {i+1:02}')}
        matching_members = {c['member_id'] for c in cases if ctx['condition'] in (c['domain'],c['hcc'])}
        rows = [r for r in rows if matching_indices.intersection(r['conditions']) or r['id'] in matching_members]
    current_ids = {r['id'] for r in rows}
    discovery_groups = suspect_discovery.groups([c for c in cases if c['member_id'] in current_ids and case_matches(c, {**ctx, 'discovery':'any'}) and analytics_landing.opportunity_matches(c, ctx)])
    cases = [c for c in cases if c['member_id'] in current_ids and case_matches(c, ctx) and analytics_landing.opportunity_matches(c, ctx)]
    cases.sort(key=lambda c: ((c.get('discovery') or {}).get('rank', 999) if ctx.get('discovery') else 0, -{'High':3,'Medium':2,'Low':1}.get(c['probability']['band'],0),
        -(c['probability']['base'] or 0)*(c['delta'] or 0), c['analysis_date'], c['id']))
    scores = [r for r in rows if r['score'] is not None]
    eligible = sum(r['eligible'] for r in rows); mean = weighted(scores)
    winners, _ = frozen_selection(root_cases)
    weight = sum(r['weight'] for r in scores)
    row_map = {r['id']:r for r in scores}
    delta_sum = sum(c['delta']*row_map[c['member_id']]['weight'] for c in winners if c['member_id'] in row_map)
    opportunity_delta = delta_sum/weight if weight else 0
    bases = score_bases(mean, opportunity_delta)
    presentation_delta = (bases['potential']-mean) if mean is not None else 0
    factor = (bases[ctx['basis']]/mean) if mean else 1
    values = [r['score']*factor for r in scores]
    bounds = [(0,.5),(.5,1),(1,1.5),(1.5,2),(2,3),(3,math.inf)]
    histogram = [dict(name=f'{lo:g}–{hi:g}' if math.isfinite(hi) else '3+', count=sum(lo<=v<hi for v in values)) for lo,hi in bounds]
    def grouped(key):
        groups = defaultdict(list)
        for row in rows: groups[row[key]].append(row)
        result = []
        for group, population_rows in groups.items():
            mids = {r['id'] for r in population_rows}; e = sum(r['eligible'] for r in population_rows)
            s = sum(r['score'] is not None for r in population_rows)
            subset = [c for c in cases if c['member_id'] in mids and c['qualified']]
            captures = {c['member_id'] for c in subset if c['category'] not in ('OC','DR')}
            result.append(dict(id=group, name=population_rows[0]['provider'] if key=='provider_id' else group,
                members=len(mids), eligible=e, scored=s, score=(weighted(population_rows)*factor if weighted(population_rows) is not None else None), cases=len(subset),
                capture_members=len(captures), rate=safe_ratio(len(captures)*1000,e), coverage=safe_ratio(s,e),
                suppressed=0<len(mids)<20))
        small = [g for g in result if g['suppressed']]
        if small and len(result)>1:
            extra = min((g for g in result if not g['suppressed']), key=lambda g:g['members'], default=None)
            if extra: extra['suppressed']=True
        for g in result:
            if g['suppressed']:
                for field in ['members','eligible','scored','score','cases','capture_members','rate','coverage']: g[field]=None
        return sorted(result, key=lambda g:(g['suppressed'], -(g['score'] or 0), g['name']))
    counties = grouped('county'); practices = grouped('provider_id')
    prevalence = []
    for i,(name,hcc,exp) in enumerate(CATALOG):
        mids = [r for r in rows if r['eligible'] and i in r['conditions']]
        prior = len(mids); recaptured=sum(r['recaptured'] for r in mids)
        prevalence.append(dict(name=name, hcc=f'HCC {hcc}' if config['program']=='MA' else f'Risk group {i+1:02}',
            members=len(mids), denominator=eligible, prevalence=safe_ratio(len(mids)*100,eligible),
            prior=prior, recaptured=recaptured, gap=prior-recaptured, recapture=safe_ratio(recaptured*100,prior)))
    prevalence.sort(key=lambda p:-p['members'])
    group_counts = lambda key: [dict(name=name, count=len(group), members=len({c['member_id'] for c in group if c['qualified']}))
        for name,group in sorted(((name,[c for c in cases if c[key]==name]) for name in {c[key] for c in cases}), key=lambda p:-len(p[1]))]
    bands = [dict(name=b, count=sum(c['probability']['band']==b for c in cases)) for b in ['High','Medium','Low','Unknown','Not applicable']]
    matrix = [dict(evidence=e, **{b:sum(c['evidence']==e and c['probability']['band']==b for c in cases) for b in ['High','Medium','Low','Unknown','Not applicable']}) for e in ['Strong','Moderate','Limited','Unknown']]
    cond_expected = sum(c['probability']['base'] or 0 for c in cases)
    financial = finance(root_cases, ctx.get('financial'), {c['id'] for c in cases})
    financial['dollars_available'] = config['program']=='MA'
    financial['program_note'] = 'Illustrative MA payment sensitivity; not actual reimbursement' if config['program']=='MA' else f'{config["program"]} score opportunities are available; dollar estimation requires its separately approved program method.'
    trend = []
    last_month = int(ctx['run_month']) if ctx.get('run_month', 'all') != 'all' else date.fromisoformat(ctx['snapshot']).month
    month_names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    for i in range(6):
        name = month_names[(last_month-6+i)%12]
        base = (mean or 0)*(.925+i*.015)
        trend.append(dict(month=name, baseline=base, potential=base+presentation_delta, submitted=base+presentation_delta*.62, accepted=base+presentation_delta*.54))
    snapshot_rows = []
    for snapshot_date in SNAPSHOTS:
        retained = [r for r in population(root, config, {**ctx, 'snapshot': snapshot_date}) if r['id'] in current_ids]
        value = weighted(retained)
        snapshot_rows.append(dict(id=snapshot_date, name=date.fromisoformat(snapshot_date).strftime('%B %Y'),
            origin='Authored presentation snapshot', baseline=value, scored=sum(r['score'] is not None for r in retained)))
    capture = {c['member_id'] for c in cases if c['qualified'] and c['category'] not in ('OC','DR')}
    result = dict(version=VERSION, context=ctx, config=dict(id=config['id'], name=config['name'], program=config['program'], year=config['year'], run_type=config.get('run_type'), model_version=config.get('model_version')),
        origin='authored_synthetic_fixture', origin_label='Illustrative analysis', as_of=ctx['snapshot'],
        filter_hash=digest(ctx), input_hash=digest([(c['id'],c['raw_status'],c['analysis_date']) for c in root_cases]),
        scope_hash=digest(sorted(m['id'] for m in root)), options=options,
        snapshots=snapshot_rows,
        summary=dict(enrolled=len(rows), eligible=eligible, scored=len(scores), stale=sum(r['stale'] for r in rows),
            missing=sum(r['eligible'] and r['score'] is None and not r['stale'] for r in rows), coverage=safe_ratio(len(scores),eligible),
            member_months=weight, cases=len(cases), aliases=sum(len(c['aliases']) for c in cases), qualified_members=len({c['member_id'] for c in cases if c['qualified']}),
            capture_members=len(capture), corrections=sum(c['category']=='OC' for c in cases), sources=sum(c['source_available'] for c in cases),
            conditional_support=cond_expected, reached_support=cond_expected*financial['assumptions']['reach'],
            applicable=sum(c['probability']['base'] is not None for c in cases)),
        bases=bases, trend=trend, histogram=histogram, percentiles={name:quantile(values,q) for name,q in [('p25',.25),('median',.5),('p75',.75),('p90',.9)]},
        prevalence=prevalence, counties=counties, practices=practices,
        categories=group_counts('category_label'), rules=group_counts('rule_type'), hccs=group_counts('hcc'), conditions=group_counts('domain'),
        bands=bands, evidence_matrix=matrix, cases=cases, financial=financial, discovery_groups=discovery_groups,
        ai=deepcopy(state['comparison']), reports=[dict(id=i,title=t,question=q,view=v) for i,t,q,v in REPORTS],
        method=dict(id=VERSION, probability=METHOD, landing='Authored sample closure chances, provider coding outcomes, demographic attributes and counterfactual model bridge. Provider closures count supported and unsupported rule outcomes; added conditions are distinct member-condition pairs. No workflow or clinical events are created. V24/V28 bridge increments are not model coefficients. Social-needs and race attributes are independently authored, never inferred from identity or geography.', source_count='Retained source documents and authored metadata are counted separately; source copies are aliases, not independent corroboration.', score='Authored synthetic population; program, payment-year and initial/forecast presentation multipliers produce distinct views. Raw/adjusted values and snapshot progression are presentation assumptions, not CMS model calculations.',
            headline_order='Baseline < accepted <= submitted < potential, including at three displayed decimals. Populated presentation cohorts use at least 0.006 authored opportunity to keep all score stages visible; this floor is never a native model result or a financial input.',
            submitted='Authored scenario assumes 62% of positive score-equivalent opportunity is represented in the submitted set and 54% in the accepted set; no receiver event is asserted.',
            weighting='Eligible member-months; missing and stale results excluded unless Last available is explicitly selected.',
            qualification='Distinct eligible members with an open, mapped rule candidate; not clinically confirmed diagnoses.',
            capture_cohort='Up to 1,200 globally selected synthetic members without retained questions receive a metadata-only capture planning question. Stable selection, evidence grades and score-equivalent impacts are authored assumptions; no chart evidence or CMS acceptance is created.',
            attribution='Authored fixed residence and assigned practice at the snapshot date; contract membership is deterministic synthetic data.',
            probability_target='Support by day 90, conditional on review reached by day 30; not calibrated.',
            suppression='Cells with fewer than 20 distinct members and complementary cells are suppressed; not a de-identification certification.',
            time_series='Retained deterministic authored population snapshots and authored intra-period trend; not native execution history.'))
    result['metrics'] = {'M01':metric(len(rows),len(rows),None,'members',ctx), 'M02':metric(eligible,eligible,len(rows),'members',ctx),
        'M05':metric(safe_ratio(len(scores),eligible),len(scores),eligible,'ratio',ctx),
        'M07':metric(bases[ctx['basis']],sum(r['score']*r['weight'] for r in scores)*factor,weight,'score',ctx),
        'M21':metric(len(cases),len(cases),None,'canonical_cases',ctx), 'M22':metric(len(capture),len(capture),eligible,'members',ctx),
        'M27':metric(cond_expected,cond_expected,result['summary']['applicable'],'expected_cases',ctx)}
    result['landing'] = analytics_landing.build(rows, cases, root, ctx, CATALOG, mean, score_factor=factor)
    result['providers'] = [{k:v for k,v in provider.items() if k!='series'} for provider in result['landing']['providers']]
    result['method']['provider_capture'] = 'Confirmed member-condition-rule outcomes divided by identified member-condition-rule outcomes through the reporting month. Reuses the provider outcome series; not chart transmission or operational activity. Open suspects include all current open flags in the conditions list, including data issues, separate from the historical outcome cohort.'
    result['method']['provider_recapture'] = 'Prior-year member-condition pairs confirmed again divided by all prior-year pairs in the eligible provider panel. Reconciles to condition prevalence and recapture totals.'
    result['method']['discovery'] = 'Authored clinical-context cases for synthetic members only. Invisible, timeline, disconnected, specificity, recapture and conflicting-evidence patterns are descriptive categories, not measured failures of an ML model. Source records are separately authored fixtures with their own identities and provenance; retained records are never changed.'
    result['snapshot_hash'] = digest(result)
    return result


def csv_bytes(rows):
    if not rows: return b'reason\r\nNo records in the selected scope\r\n'
    fields = list(dict.fromkeys(k for r in rows for k in r))
    output=io.StringIO(); writer=csv.DictWriter(output, fieldnames=fields); writer.writeheader()
    for row in rows:
        safe={}
        for key,value in row.items():
            if isinstance(value,(dict,list)): value=json.dumps(value,sort_keys=True)
            if isinstance(value,str) and value.lstrip().startswith(('=','+','-','@','\t','\r')): value="'"+value
            safe[key]=value
        writer.writerow(safe)
    return output.getvalue().encode('utf-8')


def export_bundle(report, report_id, fmt, ids=None, excerpts=False):
    value=deepcopy(report)
    cases=value.pop('cases',[])
    if report_id == 'registry':
        if ids is not None: cases=[c for c in cases if c['id'] in ids]
        if not excerpts:
            for c in cases: c.pop('sources',None)
        value['suspects']=cases
    # Analytics downloads never implicitly include a member-level population or case file.
    value.pop('ai', None) if report_id!='R10' else None
    if report_id=='R10':
        value['ai']={k:v for k,v in value['ai'].items() if k in ('id','version','metrics','denominators','methodology')}
    value['manifest']={k:report[k] for k in ['version','context','config','origin','as_of','filter_hash','input_hash','scope_hash','snapshot_hash']}
    value['manifest'].update(report_id=report_id, export_kind=fmt)
    tables={'R01':'trend','R02':'histogram','R03':'prevalence','R04':'trend','R05':'counties','R06':'categories',
            'R07':'bands','R08':'financial','R09':'categories','R10':'ai','R11':'metrics','R12':'providers'}
    selected=value.get('suspects') if report_id=='registry' else value.get(tables.get(report_id,'trend'),[])
    if isinstance(selected,dict):
        selected=selected['scenarios'] if report_id=='R08' else [dict(metric=k,value=v) for k,v in selected.items()]
    if fmt=='json': return json.dumps(value,indent=2,allow_nan=False).encode(), 'application/json'
    if fmt=='csv': return csv_bytes(selected), 'text/csv; charset=utf-8'
    output=io.BytesIO()
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('manifest.json',json.dumps(value['manifest'],indent=2))
        archive.writestr('summary.csv',csv_bytes([value['summary']|value['bases']]))
        archive.writestr('aggregates.csv',csv_bytes(selected if report_id!='registry' else value['categories']))
        archive.writestr('metric_definitions.json',json.dumps({'metrics':value['metrics'],'method':value['method']},indent=2))
        archive.writestr('assumptions.json',json.dumps(value['financial']['assumptions'],indent=2))
        archive.writestr('exclusions.csv',csv_bytes([dict(canonical_id=i,reason='Overlapping positive candidate; frozen base selection') for i in value['financial']['excluded_ids']]))
        archive.writestr('report.json',json.dumps(value,indent=2,allow_nan=False))
        if report_id=='registry': archive.writestr('suspects.csv',csv_bytes(cases))
        archive.writestr('README.md','# Perform+ report\n\nIllustrative synthetic analysis. No actual diagnosis, native model execution or payment is implied.\n\n'+json.dumps(value['method'],indent=2))
    return output.getvalue(), 'application/zip'
