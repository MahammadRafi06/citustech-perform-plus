"""Deterministic sample dashboard dimensions; never alter clinical or workflow state."""
from collections import defaultdict
from hashlib import sha256
from functools import lru_cache
from .provider_hierarchy import identity


def seed(value):
    return int(sha256(str(value).encode()).hexdigest()[:10], 16)


NEEDS = [('none', 'No recorded social need'), ('food', 'Food insecurity · Z59.41'),
         ('transport', 'Transportation insecurity · Z59.82'), ('housing', 'Housing instability · Z59.811')]
ZIPS = dict(zip(['Miami-Dade', 'Broward', 'Palm Beach', 'Hillsborough', 'Orange', 'Duval',
                'Pinellas', 'Polk', 'Lee', 'Sarasota', 'Seminole', 'Osceola'],
               ['33130', '33301', '33401', '33602', '32801', '32202', '33701', '33801', '33901', '34236', '32771', '34741']))
SOCIAL_KEYS = ('age_band', 'gender', 'race', 'zip', 'social_need')
OPPORTUNITY_QUADRANTS = ('priority', 'high_value', 'likely_to_close', 'lower_priority')
OPPORTUNITY_BANDS = ('low', 'medium', 'high')


def demographics(member):
    # Never infer race or social needs from names, clinical text or geographic statistics.
    if member.get('profile_reference'):
        age = member['age']
        return dict(age_band='Under 65' if age < 65 else '65–74' if age < 75 else '75–84' if age < 85 else '85+',
                    gender=member['sex'], race=member['race'], zip=member['zip'], social_need=member['social_need'])
    n = seed(member['id'] + ':sample-social')
    age = member.get('age', 65)
    # Authored county mix creates contrasting example clusters, not estimates of local need.
    need_rate = 25 + seed(member.get('county', '') + ':sample-need-rate') % 50
    has_need = seed(member['id'] + ':sample-need') % 100 < need_rate
    return dict(age_band='Under 65' if age < 65 else '65–74' if age < 75 else '75–84' if age < 85 else '85+',
                gender=member.get('sex') or 'Not recorded',
                race=['White', 'Black', 'Asian', 'Other / multiple', 'Not recorded'][n % 5],
                zip=ZIPS.get(member.get('county', '').replace(' County', ''), 'Not recorded'),
                social_need='none' if not has_need else NEEDS[1 + (n // 10) % 3][0])


def member_matches(member, context):
    if not any(context.get(key) for key in SOCIAL_KEYS):
        return True
    values = demographics(member)
    return all(not context.get(key) or context[key] == values[key] for key in SOCIAL_KEYS)


@lru_cache(maxsize=65536)
def opportunity_values(member_id, domain, delta, probability):
    # Stable values can be reused by chart bubbles, bands and quadrant totals.
    impact = delta * probability
    cohort = seed(member_id + ':closure') % 4
    low, high = [(.09, .32), (.37, .62), (.67, .80), (.84, .96)][cohort]
    position = seed(f"{domain}:{impact >= .14}:{cohort}:closure-position") % 1000 / 999
    return round(low + (high-low)*position, 3), impact


def opportunity(case):
    return opportunity_values(case['member_id'], case.get('domain', ''),
                              case.get('delta') or 0, case['probability'].get('base') or 0)


def opportunity_quadrant(case):
    chance, impact = opportunity(case)
    if impact >= .14:
        return 'priority' if chance >= .65 else 'high_value'
    return 'likely_to_close' if chance >= .65 else 'lower_priority'


def opportunity_band(chance):
    return 'low' if chance < .35 else 'medium' if chance < .65 else 'high'


def opportunity_matches(case, context):
    selected = context.get('closure')
    quadrant = context.get('quadrant') or ('priority' if selected == 'priority' else '')
    if not selected and not quadrant:
        return True
    if quadrant and quadrant not in OPPORTUNITY_QUADRANTS:
        raise ValueError('Unknown opportunity quadrant.')
    if not case['qualified'] or case['category'] in ('OC', 'DR') or (case.get('delta') or 0) <= 0 or case['probability'].get('base') is None:
        return False
    if quadrant and opportunity_quadrant(case) != quadrant:
        return False
    if selected in OPPORTUNITY_BANDS:
        return opportunity_band(opportunity(case)[0]) == selected
    return not selected or selected == 'priority' or abs(opportunity(case)[0] - float(selected)) < .001


def protect(groups, count='members'):
    """Suppress small and one complementary group, including its derived metrics."""
    small = [g for g in groups if 0 < g[count] < 20]
    if small:
        candidates = [g for g in groups if g[count] >= 20]
        if candidates:
            small.append(min(candidates, key=lambda g: g[count]))
    hidden = {id(g) for g in small}
    return [{**g, 'suppressed': id(g) in hidden} if id(g) not in hidden else
            {k: v if k in ('id', 'name', 'condition', 'dimension', 'key', 'month', 'specialty', 'practice', 'quadrant', 'band') else None for k, v in g.items()} | {'suppressed': True}
            for g in groups]


def continuing_member_records(rows, context, *, program='MA'):
    """Paired annual fixtures, never inferred enrollment or clinical events."""
    month = int(context.get('snapshot', '2026-09-15')[5:7]) if context.get('run_month', 'all') == 'all' else int(context['run_month'])
    records = []
    for row in rows:
        # The same cohort and clinical inputs underpin both model scores.
        enrolled_2025 = seed(row['id'] + ':enrolled-2025') % 10 != 0
        if not enrolled_2025 or not row['eligible'] or row['score'] is None:
            continue
        n = seed(row['id'] + ':annual-risk-change')
        if program == 'MA':
            # Authored cohort assumptions, not official CMS coefficients or a
            # universal assertion that every member scores higher under V24.
            added = row['score'] * (.012 + n % 25 / 1000) if row['conditions'] else 0
            unconfirmed = -row['score'] * (.018 + n % 25 / 1000) if row['conditions'] and not row['recaptured'] else 0
            prior_v28 = row['score'] - added - unconfirmed
            prior_v24 = prior_v28 * (1.08 + (n // 100) % 61 / 1000)
            prior_blend = .33 * prior_v24 + .67 * prior_v28
            model = prior_v28 - prior_blend
            changes = dict(model=model, added=added, unconfirmed=unconfirmed)
            model_scores = dict(prior_v24=prior_v24, prior_v28=prior_v28)
        else:
            # Do not apply the Part C V24/V28 transition to Part D or ACA.
            added = (.035 + n % 65 / 1000) if row['conditions'] else .012
            unconfirmed = -(.025 + n % 55 / 1000) if row['conditions'] and not row['recaptured'] else 0
            coding = ((n // 100) % 31 - 12) / 1000
            changes = dict(coding=coding, added=added, unconfirmed=unconfirmed)
            model_scores = {}
        records.append(dict(id=row['id'], weight=month, score_2025=row['score']-sum(changes.values()), score_2026=row['score'], **changes, **model_scores))
    return records


def continuing_member_comparison(rows, context, *, program='MA'):
    records = continuing_member_records(rows, context, program=program)
    denominator = sum(row['weight'] for row in records)
    average = lambda key: sum(row[key]*row['weight'] for row in records)/denominator if denominator else None
    start, end = average('score_2025'), average('score_2026')
    delta = end-start if start is not None else None
    components = [('model','Model Impact')] if program == 'MA' else [('coding','Coding Changes')]
    components += [('added','Captured Conditions'),('unconfirmed','Open Opportunities')]
    model_comparison = dict(v24=average('prior_v24'), v28=average('prior_v28'),
                            start_weights=dict(v24=.33, v28=.67), end_weights=dict(v24=0, v28=1)) if program == 'MA' else None
    return dict(start_year=2025, end_year=2026, members=len(records), member_months=denominator,
                start=start, end=end, delta=delta, percent_change=delta/start if start else None,
                start_label='2025 Blend' if program == 'MA' else '2025', end_label='2026 V28' if program == 'MA' else '2026',
                changes=[dict(name=name, change=average(key)) for key,name in components], model_comparison=model_comparison,
                cohort_hash=sha256('|'.join(sorted(r['id'] for r in records)).encode()).hexdigest(),
                score_basis='captured_baseline', origin='authored_paired_annual_risk_v2',
                method='Same member IDs, enrolled in both years, with the same reporting-month weights. 2026 baseline scores use the selected program with a fixed 2026 final-year configuration. Prior-year enrollment, model scores and capture changes are authored fixtures, not official CMS model calculations. For MA, the same prior-year clinical profile is scored under V24 and V28: 2025 is 33% V24 plus 67% V28, and the model impact moves that blend to 100% V28 before capture changes. Open opportunities are prior-year conditions not recaptured; no unconfirmed score gain is added. Missing scores and reference-only member profiles are excluded from both years.')


# A retained Jan-Sep history: larger identification batches at the start of
# each quarter, with smaller intervening runs. Dates are stable per member/HCC
# and never reallocated when a reporting month or provider filter changes.
IDENTIFICATION_WEIGHTS = (20, 9, 7, 14, 8, 6, 16, 11, 9)
CLOSURE_LAG_WEIGHTS = (12, 42, 30, 16)  # Same month, then 1-3 months later.
OUTCOME_TIMING_VERSION = 'authored_suspect_event_calendar_v1'


def weighted_period(key, weights):
    position = seed(key) % sum(weights)
    for index, weight in enumerate(weights):
        if position < weight:
            return index
        position -= weight
    raise ValueError('A timing profile must have positive weights.')


def suspect_outcome(member, condition, provider_seed):
    key = f'{member}:{condition}'
    identified = 1 + weighted_period(key + ':outcome-month', IDENTIFICATION_WEIGHTS)
    closed = seed(key + ':closed') % 100 < 58 + provider_seed % 25
    # The retained terminal disposition stays unchanged. For cases known to be
    # closed by September, sample only valid delays within that observed window;
    # do not clamp future closures into the final month or close unresolved cases.
    delays = CLOSURE_LAG_WEIGHTS[:len(IDENTIFICATION_WEIGHTS) - identified + 1]
    closed_month = identified + weighted_period(key + ':closure-lag', delays) if closed else None
    return dict(member=member, hcc=condition, month=identified, closed_month=closed_month,
                closed=closed, confirmed=seed(key + ':confirmation') % 100 < 76)


def outcome_series(outcomes, months):
    series = []
    identified_to_date = closed_to_date = confirmed_to_date = 0
    for month, label in enumerate(months, 1):
        identified = sum(o['month'] == month for o in outcomes)
        resolved = [o for o in outcomes if o['closed_month'] == month]
        closed = len(resolved)
        added = sum(o['confirmed'] for o in resolved)
        opening_open = identified_to_date - closed_to_date
        available = opening_open + identified
        identified_to_date += identified
        closed_to_date += closed
        confirmed_to_date += added
        series.append(dict(month=label, rules=identified, closed=closed, added=added,
            opening_open=opening_open, available=available,
            # Monthly closure rate includes the carried-forward open backlog.
            rate=closed/available if available else 0, identified_to_date=identified_to_date,
            closed_to_date=closed_to_date, open_to_date=identified_to_date-closed_to_date,
            confirmed_to_date=confirmed_to_date))
    return series


def build(rows, cases, members, context, catalog, baseline, *, score_factor=1):
    mmap = {m['id']: m for m in members}
    eligible = [r for r in rows if r['eligible']]
    member_network = {r['id']: identity(mmap[r['id']])['network'] for r in eligible}
    networks = sorted(set(member_network.values()))
    groups = defaultdict(list)
    positive = [c for c in cases if c['qualified'] and c['category'] not in ('OC', 'DR') and (c['delta'] or 0) > 0 and c['probability']['base'] is not None]
    for c in positive:
        chance, impact = opportunity(c)
        groups[(c['domain'], chance, opportunity_quadrant(c))].append((c, impact))
    matrix = []
    for (domain, chance, quadrant), group in sorted(groups.items()):
        matrix.append(dict(id=f'{domain}|{chance}|{quadrant}', name=domain, closure=chance, quadrant=quadrant,
                           gain=sum(v for _, v in group)/len(group), members=len({c['member_id'] for c, _ in group}), cases=len(group)))
    priority = [c for c in positive if opportunity_matches(c, {'closure': 'priority'})]
    # Count distinct members within each quadrant, including when a condition is selected.
    # Splitting bubbles at the same boundaries keeps the chart and drill-through aligned.
    quadrants, quadrant_conditions, closure_bands = [], [], []
    for domain in ['', *sorted({c['domain'] for c in positive})]:
        summaries = []
        for quadrant in OPPORTUNITY_QUADRANTS:
            cohort = [c for c in positive if (not domain or c['domain'] == domain) and opportunity_quadrant(c) == quadrant]
            summaries.append(dict(id=f'{quadrant}|{domain}', name=domain, quadrant=quadrant,
                                  members=len({c['member_id'] for c in cohort}), cases=len(cohort)))
            bands = []
            for band in OPPORTUNITY_BANDS:
                matched = [c for c in cohort if opportunity_band(opportunity(c)[0]) == band]
                bands.append(dict(id=f'{quadrant}|{domain}|{band}', name=domain, quadrant=quadrant, band=band,
                                  members=len({c['member_id'] for c in matched}), cases=len(matched)))
            closure_bands.extend(protect(bands))
        (quadrant_conditions if domain else quadrants).extend(protect(summaries))
    # Shared member-condition records: totals match the existing prevalence report.
    practices = sorted({(r['provider_id'], r['provider']) for r in eligible})
    snapshot_month = int(context.get('snapshot', '2026-09-15')[5:7])
    last = min(int(context.get('run_month', 'all')), snapshot_month) if context.get('run_month', 'all') != 'all' else snapshot_month
    months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][:last]
    by_provider = defaultdict(list)
    by_condition = defaultdict(list)
    by_county = defaultdict(list)
    confirmed_month = {}
    for row in eligible:
        by_provider[row['provider_id']].append(row)
        by_county[row['county']].append(row)
        confirmed_month[row['id']] = 1+seed(row['id']+':confirmed-month') % 9
        for condition in row['conditions']:
            by_condition[condition].append(row)
    heat = []
    for index, (condition, _, _) in enumerate(catalog):
        cohort = by_condition[index]
        for pid, name in practices:
            group = [r for r in cohort if r['provider_id'] == pid]
            if not group: continue
            confirmed = sum(r['recaptured'] for r in group)
            heat.append(dict(condition=condition, dimension='practice', key=pid, name=name, members=len(group), confirmed=confirmed, rate=confirmed/len(group)))
        for network in networks:
            group = [r for r in cohort if member_network[r['id']] == network]
            if not group: continue
            confirmed = sum(r['recaptured'] for r in group)
            heat.append(dict(condition=condition, dimension='network', key=network, name=network, members=len(group), confirmed=confirmed, rate=confirmed/len(group)))
        for month, name in enumerate(months, 1):
            confirmed = sum(r['recaptured'] and confirmed_month[r['id']] <= month for r in cohort)
            if cohort: heat.append(dict(condition=condition, dimension='month', key=str(month), name=name, members=len(cohort), confirmed=confirmed, rate=confirmed/len(cohort)))
    protected_heat = []
    for condition, _, _ in catalog:
        for dimension in ['practice', 'network', 'month']:
            protected_heat.extend(protect([r for r in heat if r['condition'] == condition and r['dimension'] == dimension]))
    # Distinct sample outcomes per member-condition-rule pair; no events are written.
    providers = []
    network_outcomes = defaultdict(list)
    for i, (pid, name) in enumerate(practices):
        pindex = seed(pid + ':physician')
        specialty = ['Family medicine','Internal medicine','Geriatrics'][pindex % 3]
        group = by_provider[pid]
        outcomes = [suspect_outcome(r['id'], c, pindex) for r in group for c in r['conditions']]
        series = outcome_series(outcomes, months)
        for outcome in outcomes:
            network_outcomes[member_network[outcome['member']]].append(outcome)
        scored = [r for r in group if r['score'] is not None]
        member_months = sum(r['weight'] for r in scored)
        identified = sum(month['rules'] for month in series)
        captured = sum(month['added'] for month in series)
        prior_conditions = sum(len(r['conditions']) for r in group)
        recaptured_conditions = sum(len(r['conditions']) for r in group if r['recaptured'])
        providers.append(dict(id=pid, name=identity(mmap[group[0]['id']])['provider'],
            practice=name, specialty=specialty, members=len(group), series=series,
            score=sum(r['score']*r['weight'] for r in scored)*score_factor/member_months if member_months else None,
            member_months=member_months, captured_suspects=captured, identified_suspects=identified,
            capture_rate=captured/identified if identified else None,
            prior_conditions=prior_conditions, recaptured_conditions=recaptured_conditions,
            recapture_rate=recaptured_conditions/prior_conditions if prior_conditions else None,
            open_suspects=sum(c['provider_id']==pid and c['status']=='open' for c in cases)))
    network_totals = [dict(id=name, name=name,
        members=sum(member_network[r['id']] == name for r in eligible),
        series=outcome_series(network_outcomes[name], months)) for name in networks]
    # Broad county clusters, with all demographic filtering applied before aggregation.
    social = []
    for county in sorted({r['county'] for r in eligible}):
        cohort = by_county[county]
        need = sum(demographics(mmap[r['id']])['social_need'] in {'food', 'transport', 'housing'} for r in cohort)
        scored = [r for r in cohort if r['score'] is not None]
        social.append(dict(id=county, name=county.replace(' County',''), members=len(cohort), needs=need,
                           share=need/len(cohort), score=sum(r['score']*r['weight'] for r in scored)/sum(r['weight'] for r in scored) if scored else None))
    options = dict(age_band=['Under 65','65–74','75–84','85+'], gender=['Female','Male','Not recorded'], race=['White','Black','Asian','Other / multiple','Not recorded'], zip=sorted(set(ZIPS.values()) | {m['zip'] for m in members if m.get('profile_reference')}), social_need=[k for k,_ in NEEDS])
    prior = sum(len(r['conditions']) for r in eligible)
    confirmed = sum(len(r['conditions']) for r in eligible if r['recaptured'])
    # Counterfactual illustration only. These increments are NOT CMS coefficients.
    changes = [('Metabolic', -.037, [0,5]), ('Cardiovascular', .046, [1,6]), ('Kidney', -.018, [2]),
               ('Respiratory', .023, [3]), ('Other conditions', .014, [4,7,8,9])]
    bridge = [dict(name=name, change=round(delta*(.8+sum(any(i in r['conditions'] for i in indices) for r in eligible)/max(1,len(eligible))),4)) for name,delta,indices in changes]
    return dict(origin='authored_sample_analytics', outcome_timing=OUTCOME_TIMING_VERSION, matrix=protect(matrix), quadrants=quadrants, quadrant_conditions=quadrant_conditions, closure_bands=closure_bands,
                priority_members=len({c['member_id'] for c in priority}), priority_cases=len(priority),
                recapture=dict(prior=prior, confirmed=confirmed, missing=prior-confirmed, heat=protected_heat,
                    networks=[dict(id=n,name=n) for n in networks if any(member_network[r['id']]==n and r['conditions'] for r in eligible)],
                    practices=[dict(id=p,name=n) for p,n in practices if any(r['provider_id']==p and r['conditions'] for r in eligible)], months=months),
                providers=protect(providers), networks=protect(network_totals), social=protect(social), social_options=options,
                model=dict(start=round(baseline,4) if baseline is not None else None, changes=bridge, benchmark=1000, months=12, members=len(eligible)))
