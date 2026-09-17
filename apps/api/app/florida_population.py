"""Idempotent display-data migration for the fictional Florida population.

Clinical source text, stable IDs, access assignments and scoring inputs are untouched.
County distribution is authored scenario data, not a population estimate.
"""
from hashlib import sha256
from random import Random

VERSION = 'florida-directory-1'
LOCATIONS = [
    ('Miami-Dade', 'Miami'), ('Broward', 'Fort Lauderdale'),
    ('Palm Beach', 'West Palm Beach'), ('Hillsborough', 'Tampa'),
    ('Orange', 'Orlando'), ('Duval', 'Jacksonville'),
    ('Pinellas', 'St. Petersburg'), ('Polk', 'Lakeland'),
    ('Lee', 'Fort Myers'), ('Sarasota', 'Sarasota'),
    ('Seminole', 'Sanford'), ('Osceola', 'Kissimmee'),
]
# Realistic neighboring residence counties for members attending a practice.
NEIGHBORS = {0: [1], 1: [0, 2], 2: [1], 3: [6, 7], 4: [10, 11, 7],
             5: [5], 6: [3], 7: [3, 4, 11], 8: [8], 9: [9], 10: [4], 11: [4, 7]}
FEMALE = 'Maria,Patricia,Linda,Barbara,Elizabeth,Jennifer,Susan,Jessica,Sarah,Karen,Nancy,Lisa,Margaret,Betty,Sandra,Ashley,Dorothy,Kimberly,Emily,Donna,Michelle,Carol,Amanda,Melissa,Deborah,Stephanie,Rebecca,Sharon,Laura,Cynthia,Kathleen,Amy,Angela,Shirley,Brenda,Emma,Anna,Pamela,Nicole,Samantha,Katherine,Christine,Debra,Rachel,Carolyn,Janet,Catherine,Frances,Diane,Joyce,Julie,Olivia,Rosa,Carmen,Isabel,Elena,Lucia,Adriana,Monica,Teresa'.split(',')
MALE = 'James,Robert,John,Michael,David,William,Richard,Joseph,Thomas,Charles,Christopher,Daniel,Matthew,Anthony,Mark,Donald,Steven,Andrew,Paul,Joshua,Kenneth,Kevin,Brian,George,Timothy,Ronald,Jason,Edward,Jeffrey,Ryan,Jacob,Gary,Nicholas,Eric,Jonathan,Stephen,Larry,Justin,Scott,Brandon,Benjamin,Samuel,Gregory,Frank,Alexander,Raymond,Patrick,Jack,Dennis,Jerry,Tyler,Aaron,Jose,Carlos,Luis,Miguel,Jorge,Rafael,Manuel,Pedro'.split(',')
LAST = 'Smith,Johnson,Williams,Brown,Jones,Garcia,Miller,Davis,Rodriguez,Martinez,Hernandez,Lopez,Gonzalez,Wilson,Anderson,Thomas,Taylor,Moore,Jackson,Martin,Lee,Perez,Thompson,White,Harris,Sanchez,Clark,Ramirez,Lewis,Robinson,Walker,Young,Allen,King,Wright,Scott,Torres,Nguyen,Hill,Flores,Green,Adams,Nelson,Baker,Hall,Rivera,Campbell,Mitchell,Carter,Roberts,Gomez,Phillips,Evans,Turner,Diaz,Parker,Cruz,Edwards,Collins,Reyes,Stewart,Morris,Morales,Murphy,Cook,Rogers,Gutierrez,Ortiz,Morgan,Cooper,Peterson,Bailey,Reed,Kelly,Howard,Ramos,Kim,Cox,Ward,Richardson,Watson,Brooks,Chavez,Wood,James,Bennett,Gray,Mendoza,Ruiz,Hughes,Price,Alvarez,Castillo,Sanders,Patel,Myers,Long,Ross,Foster,Jimenez,Chen,Powell,Russell,Sullivan'.split(',')


def migrate(state):
    # Display plan labels only; retained clinical/source snapshots stay intact.
    for member in state.get('members', []):
        if member.get('plan') in ('Northstar Health', 'Meridian Care'):
            member['plan'] = 'Medicare Advantage'
    if state.get('meta', {}).get('directory_version') == VERSION:
        return
    # Keep every source-linked identity, including the deliberately mismatched
    # member in the intake case. Retained actor/source snapshots are not rewritten.
    source_members = {d.get(key) for d in state.get('documents', []) for key in ('member_id', 'source_member_id')}
    source_members.update(f'MB-{n:06}' for n in range(1, 8))
    names = {}
    for sex, first in [('Female', FEMALE), ('Male', MALE)]:
        names[sex] = [f'{given} {family}' for given in first for family in LAST]
        Random('perform-florida-' + sex).shuffle(names[sex])
    counters = {'Female': 0, 'Male': 0}
    practices = {}
    for provider in state.get('providers', []):
        if not provider.get('synthetic') or not provider['id'].startswith('PR-'):
            continue
        index = (int(provider['id'].split('-')[-1]) - 1) % len(LOCATIONS)
        county, city = LOCATIONS[index]
        provider.update(county=county + ' County', city=city, state='FL')
        practices[provider['id']] = index
    for member in sorted(state['members'], key=lambda m: m['id']):
        if not member.get('synthetic'):
            continue
        if member['id'] not in source_members and member.get('sex') in names:
            sex = member['sex']
            member['name'] = names[sex][counters[sex] % len(names[sex])]
            member['initials'] = ''.join(n[0] for n in member['name'].split())
            counters[sex] += 1
        if member['provider_id'] in practices:
            index = practices[member['provider_id']]
            bucket = int(sha256(member['id'].encode()).hexdigest()[:8], 16)
            if bucket % 10 < 2:
                nearby = NEIGHBORS[index]
                index = nearby[(bucket // 10) % len(nearby)]
            county, city = LOCATIONS[index]
            member.update(county=county + ' County', city=city, state='FL')
    state.setdefault('meta', {})['directory_version'] = VERSION
