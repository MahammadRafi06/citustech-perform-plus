"""Compact, deterministic roster extension for population analytics.

Existing members and source documents are never cloned. The additional members
are fictional roster records, not evidence or calculated native model results.
Unchanged generated rows are reconstructed in memory; edits persist normally.
"""
from functools import lru_cache
from hashlib import sha256
from .florida_population import FEMALE, MALE, LAST, LOCATIONS, NEIGHBORS

BASE_POPULATION = 10_000
ADDITIONAL_MEMBERS = 100_000
TARGET_POPULATION = BASE_POPULATION + ADDITIONAL_MEMBERS
VERSION = 'florida-population-110k-v1'
CONDITIONS = ('Diabetes with chronic complications', 'Chronic systolic heart failure',
              'Chronic obstructive pulmonary disease', 'Chronic kidney disease',
              'Morbid obesity', 'Major depressive disorder', 'Vascular disease',
              'Rheumatoid arthritis', 'Diabetes without complication', 'Hypertension')


@lru_cache(maxsize=2)
def _roster(providers):
    rows = {}
    if not providers:
        return rows
    for index in range(BASE_POPULATION + 1, TARGET_POPULATION + 1):
        mid = f'MB-{index:06}'
        n = int(sha256((mid + ':' + VERSION).encode()).hexdigest()[:16], 16)
        pid, practice = providers[n % len(providers)]
        county_index = (int(pid.split('-')[-1]) - 1) % len(LOCATIONS)
        if n % 10 < 2:
            nearby = NEIGHBORS[county_index]
            county_index = nearby[(n // 10) % len(nearby)]
        county, city = LOCATIONS[county_index]
        sex = 'Female' if (n // 100) % 100 < 55 else 'Male'
        first = FEMALE if sex == 'Female' else MALE
        name = f'{first[(n // 1000) % len(first)]} {LAST[(n // 100000) % len(LAST)]}'
        rows[mid] = dict(id=mid, name=name, initials=''.join(p[0] for p in name.split()),
            age=65+(n // 10000000) % 31, sex=sex, provider_id=pid, provider=practice,
            plan='Medicare Advantage', county=county+' County', city=city, state='FL',
            condition=CONDITIONS[(n // 1000000000) % len(CONDITIONS)],
            status='new', priority='Medium', evidence='Unknown', synthetic=True,
            population_version=VERSION, opportunity_type='population_context',
            summary='Population record. Clinical source evidence is not attached.')
    return rows


def templates(state):
    return _roster(tuple(sorted((p['id'], p['name']) for p in state.get('providers', [])
                               if p['id'].startswith('PR-') and p['id'][3:].isdigit())))


def expand(state):
    """Append missing identities once; preserve all retained identities and edits."""
    current = {m['id'] for m in state['members']}
    state['members'].extend(dict(row) for mid, row in templates(state).items() if mid not in current)
    state.setdefault('meta', {}).update(population_version=VERSION, population_count=len(state['members']))
    state['meta'].setdefault('counts', {})['members'] = len(state['members'])


def compact(state):
    """Persist changed generated rows, keeping the seed-sized state inexpensive."""
    generated = templates(state)
    return {**state, 'members': [m for m in state['members'] if m != generated.get(m['id'])]}
