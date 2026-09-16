"""Deterministic sample dashboard dimensions; never alter clinical or workflow state."""
from collections import defaultdict
from hashlib import sha256
from .people import ACCOUNT_NAMES


def seed(value):
    return int(sha256(str(value).encode()).hexdigest()[:10], 16)


NEEDS = [('none', 'No recorded social need'), ('food', 'Food insecurity · Z59.41'),
         ('transport', 'Transportation insecurity · Z59.82'), ('housing', 'Housing instability · Z59.811')]
ZIPS = dict(zip(['Miami-Dade', 'Broward', 'Palm Beach', 'Hillsborough', 'Orange', 'Duval',
                'Pinellas', 'Polk', 'Lee', 'Sarasota', 'Seminole', 'Osceola'],
               ['33130', '33301', '33401', '33602', '32801', '32202', '33701', '33801', '33901', '34236', '32771', '34741']))
SOCIAL_KEYS = ('age_band', 'gender', 'race', 'zip', 'social_need')


def demographics(member):
    # Never infer race or social needs from names, clinical text or geographic statistics.
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


def opportunity(case):
    # Authored access assumptions, separate from evidence-based support probability.
    chance = [.30, .55, .80, .90][seed(case['member_id'] + ':closure') % 4]
    impact = (case.get('delta') or 0) * (case['probability'].get('base') or 0)
    return chance, impact


def opportunity_matches(case, context):
    selected = context.get('closure')
    if not selected:
        return True
    if not case['qualified'] or case['category'] in ('OC', 'DR') or (case.get('delta') or 0) <= 0:
        return False
    chance, impact = opportunity(case)
    return chance >= .65 and impact >= .14 if selected == 'priority' else abs(chance - float(selected)) < .001


def protect(groups, count='members'):
    """Suppress small and one complementary group, including its derived metrics."""
    small = [g for g in groups if 0 < g[count] < 20]
    if small:
        candidates = [g for g in groups if g[count] >= 20]
        if candidates:
            small.append(min(candidates, key=lambda g: g[count]))
    hidden = {id(g) for g in small}
    return [{**g, 'suppressed': id(g) in hidden} if id(g) not in hidden else
            {k: v if k in ('id', 'name', 'condition', 'dimension', 'key', 'month', 'specialty', 'practice') else None for k, v in g.items()} | {'suppressed': True}
            for g in groups]


def build(rows, cases, members, context, catalog, baseline, *, score_factor=1):
    mmap = {m['id']: m for m in members}
    eligible = [r for r in rows if r['eligible']]
    groups = defaultdict(list)
    positive = [c for c in cases if c['qualified'] and c['category'] not in ('OC', 'DR') and (c['delta'] or 0) > 0 and c['probability']['base'] is not None]
    for c in positive:
        chance, impact = opportunity(c)
        groups[(c['domain'], chance)].append((c, impact))
    matrix = []
    for (domain, chance), group in sorted(groups.items()):
        matrix.append(dict(id=f'{domain}|{chance}', name=domain, closure=chance,
                           gain=sum(v for _, v in group)/len(group), members=len({c['member_id'] for c, _ in group}), cases=len(group)))
    priority = [c for c in positive if opportunity_matches(c, {'closure': 'priority'})]
    # Shared member-condition records: totals match the existing prevalence report.
    practices = sorted({(r['provider_id'], r['provider']) for r in eligible})
    snapshot_month = int(context.get('snapshot', '2026-09-15')[5:7])
    last = min(int(context.get('run_month', 'all')), snapshot_month) if context.get('run_month', 'all') != 'all' else snapshot_month
    months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][:last]
    heat = []
    for index, (condition, _, _) in enumerate(catalog):
        cohort = [r for r in eligible if index in r['conditions']]
        for pid, name in practices:
            group = [r for r in cohort if r['provider_id'] == pid]
            if not group: continue
            confirmed = sum(r['recaptured'] for r in group)
            heat.append(dict(condition=condition, dimension='practice', key=pid, name=name, members=len(group), confirmed=confirmed, rate=confirmed/len(group)))
        for month, name in enumerate(months, 1):
            confirmed = sum(r['recaptured'] and 1+seed(r['id']+':confirmed-month') % 9 <= month for r in cohort)
            if cohort: heat.append(dict(condition=condition, dimension='month', key=str(month), name=name, members=len(cohort), confirmed=confirmed, rate=confirmed/len(cohort)))
    protected_heat = []
    for condition, _, _ in catalog:
        for dimension in ['practice', 'month']:
            protected_heat.extend(protect([r for r in heat if r['condition'] == condition and r['dimension'] == dimension]))
    # Distinct sample outcomes per member-condition-rule pair; no events are written.
    names = ['Elena Rivera','James Bennett','Priya Shah','Michael Chen','Sofia Martinez','Daniel Brooks', 'Olivia Carter','Rafael Torres','Sarah Mitchell','Anthony Wilson','Isabel Garcia','David Morgan','Aisha Patel','Carlos Hernandez','Emily Nguyen','Matthew Reed','Grace Thompson','Luis Perez','Nina Johnson','Andrew Hall','Rachel Adams','Kevin Lopez','Maria Collins','Robert Kim','Ana Santos','Jason Mitchell','Fatima Hassan','Eric Lewis','Julia Scott','Steven Walker']
    names[:6] = [ACCOUNT_NAMES['provider' if i == 1 else f'provider_{i}'].removeprefix('Dr. ') for i in range(1, 7)]
    providers = []
    for i, (pid, name) in enumerate(practices):
        pindex = seed(pid + ':physician')
        specialty = ['Family medicine','Internal medicine','Geriatrics'][pindex % 3]
        group = [r for r in eligible if r['provider_id'] == pid]
        outcomes = [dict(member=r['id'], hcc=c, month=1+seed(f"{r['id']}:{c}:outcome-month") % 9,
                         closed=seed(f"{r['id']}:{c}:closed") % 100 < 58+pindex%25,
                         confirmed=seed(f"{r['id']}:{c}:confirmation") % 100 < 76)
                    for r in group for c in r['conditions']]
        series = []
        for month, label in enumerate(months, 1):
            subset = [o for o in outcomes if o['month'] == month]
            closed = sum(o['closed'] for o in subset)
            series.append(dict(month=label, rules=len(subset), closed=closed, added=sum(o['closed'] and o['confirmed'] for o in subset), rate=closed/len(subset) if subset else 0))
        scored = [r for r in group if r['score'] is not None]
        member_months = sum(r['weight'] for r in scored)
        identified = sum(month['rules'] for month in series)
        captured = sum(month['added'] for month in series)
        prior_conditions = sum(len(r['conditions']) for r in group)
        recaptured_conditions = sum(len(r['conditions']) for r in group if r['recaptured'])
        providers.append(dict(id=pid, name='Dr. '+(names[(int(pid.split('-')[-1])-1) % len(names)] if pid.split('-')[-1].isdigit() else names[pindex % len(names)]),
            practice=name, specialty=specialty, members=len(group), series=series,
            score=sum(r['score']*r['weight'] for r in scored)*score_factor/member_months if member_months else None,
            member_months=member_months, captured_suspects=captured, identified_suspects=identified,
            capture_rate=captured/identified if identified else None,
            prior_conditions=prior_conditions, recaptured_conditions=recaptured_conditions,
            recapture_rate=recaptured_conditions/prior_conditions if prior_conditions else None,
            open_suspects=sum(c['provider_id']==pid and c['status']=='open' for c in cases)))
    # Broad county clusters, with all demographic filtering applied before aggregation.
    social = []
    for county in sorted({r['county'] for r in eligible}):
        cohort = [r for r in eligible if r['county'] == county]
        need = sum(demographics(mmap[r['id']])['social_need'] != 'none' for r in cohort)
        scored = [r for r in cohort if r['score'] is not None]
        social.append(dict(id=county, name=county.replace(' County',''), members=len(cohort), needs=need,
                           share=need/len(cohort), score=sum(r['score']*r['weight'] for r in scored)/sum(r['weight'] for r in scored) if scored else None))
    options = dict(age_band=['Under 65','65–74','75–84','85+'], gender=['Female','Male','Not recorded'], race=['White','Black','Asian','Other / multiple','Not recorded'], zip=sorted(set(ZIPS.values())), social_need=[k for k,_ in NEEDS])
    prior = sum(len(r['conditions']) for r in eligible)
    confirmed = sum(len(r['conditions']) for r in eligible if r['recaptured'])
    # Counterfactual illustration only. These increments are NOT CMS coefficients.
    changes = [('Metabolic', -.037, [0,5]), ('Cardiovascular', .046, [1,6]), ('Kidney', -.018, [2]),
               ('Respiratory', .023, [3]), ('Other conditions', .014, [4,7,8,9])]
    bridge = [dict(name=name, change=round(delta*(.8+sum(any(i in r['conditions'] for i in indices) for r in eligible)/max(1,len(eligible))),4)) for name,delta,indices in changes]
    return dict(origin='authored_sample_analytics', matrix=protect(matrix), priority_members=len({c['member_id'] for c in priority}), priority_cases=len(priority),
                recapture=dict(prior=prior, confirmed=confirmed, missing=prior-confirmed, heat=protected_heat, practices=[dict(id=p,name=n) for p,n in practices], months=months),
                providers=protect(providers), social=protect(social), social_options=options,
                model=dict(start=round(baseline,4) if baseline is not None else None, changes=bridge, benchmark=1000, months=12, members=len(eligible)))
