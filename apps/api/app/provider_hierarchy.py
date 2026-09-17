"""Stable presentation hierarchy for the authored analytics population.

Practice IDs and clinical/source records remain unchanged. The two group names
and network are shared with the supplied Member 360 directory.
"""
from hashlib import sha256
from .people import ACCOUNT_NAMES

NAMES = ['Elena Rivera','James Bennett','Priya Shah','Michael Chen','Sofia Martinez','Daniel Brooks',
    'Olivia Carter','Rafael Torres','Sarah Mitchell','Anthony Wilson','Isabel Garcia','David Morgan',
    'Aisha Patel','Carlos Hernandez','Emily Nguyen','Matthew Reed','Grace Thompson','Luis Perez',
    'Nina Johnson','Andrew Hall','Rachel Adams','Kevin Lopez','Maria Collins','Robert Kim',
    'Ana Santos','Jason Mitchell','Fatima Hassan','Eric Lewis','Julia Scott','Steven Walker']
NAMES[:6] = [ACCOUNT_NAMES['provider' if i == 1 else f'provider_{i}'].removeprefix('Dr. ') for i in range(1, 7)]


def identity(member):
    pid = member['provider_id']
    suffix = pid.split('-')[-1]
    index = int(suffix)-1 if suffix.isdigit() else int(sha256(pid.encode()).hexdigest()[:8],16)
    return dict(practiceId=pid, network=member.get('health_network') or 'Central MA Network',
        group=member.get('provider_group') or ('Northside Medical' if index % 2 == 0 else 'Harbor Primary Care'),
        provider=member.get('physician') or 'Dr. ' + NAMES[index % len(NAMES)])


def matches(member, context):
    row = identity(member)
    # The Health Network picker includes named entities at each hierarchy level.
    entity = context.get('health_network')
    return (not entity or entity in (row['network'], row['group'], row['provider'])) and all(
        not context.get(key) or context[key] == row[field]
        for key, field in [('provider_group','group'),('provider','provider')])


def directory(members):
    rows = {m['provider_id']: identity(m) for m in members}
    return sorted(rows.values(), key=lambda r: (not r['practiceId'].startswith('M360-'), r['network'], r['group'], r['provider']))
