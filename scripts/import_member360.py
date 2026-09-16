"""Import the supplied, immutable Member 360 design into inert presentation data.

Run with system Python (lxml) from the repository root. No source JavaScript is
copied or executed. The shared app CSS is regenerated from the same source using PostCSS.
"""
from pathlib import Path
import hashlib
import json
import re
import subprocess
from lxml import html

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'PERFORMplus_MemberListApp_Member360_v14.html'
document = html.fromstring(SOURCE.read_bytes())
TAGS = {'div', 'span', 'p', 'b', 'strong', 'i', 'small', 'br', 'h2', 'h3', 'ul', 'li',
        'table', 'tr', 'th', 'td', 'details', 'summary', 'button'}
REPLACEMENTS = {
    'Care Coordinator Narrative': 'Member summary',
    'Suggested Next Actions': 'Areas to explore',
    'Lab-Supported Downcoding': 'Specificity Review',
    'Downcoding Opportunity': 'Specificity Review',
    'Downcoding': 'Specificity Review',
    'downcoding': 'specificity review',
    'accepted and reflected in Projected RAF.': 'clinically confirmed, pending submission or acceptance; reflected in Projected RAF.',
    'Current RAF = accepted/submitted contributions only.': 'Current RAF = accepted contributions only.',
    'Current-year, illustrative sample': 'Current-year claims shown',
    'Illustrative allowed ~15% higher': 'Paid amounts from claims below',
    'Illustrative, ': '', 'illustrative, ': '',
    'Illustrative value uses a demonstration rate of': 'Planning value uses an assumed rate of',
    'illustrative': 'estimated',
    'eGFR 22 confirms Stage 4 trend': 'Repeated low eGFR requires clinician reconciliation of CKD stage',
    'Active - pending re-certification to Stage 4': 'Active - CKD stage requires clinician reconciliation',
    'Recommend nephrology re-certification and resubmission at correct specificity': 'Request clinician reconciliation of CKD stage before any coding or submission change',
    'All values are synthetic demonstration data. ': '',
    'HCC categories/coefficients are estimated for demonstration and require certified-coder validation before use.': 'HCC mappings and coefficients require validation against the selected CMS model before use.',
    'items below 85% confidence are excluded from the validated RAF projection until clinician review.': 'confidence alone never confirms a diagnosis; clinician documentation and coding validation are required before inclusion in a submitted or accepted score.',
    'Baltimore County': 'Hillsborough County', 'Baltimore': 'Tampa',
    'Anne Arundel County': 'Pinellas County', 'Howard County': 'Orange County',
    'Glen Burnie': 'Clearwater', 'Columbia': 'Orlando', 'Ellicott City': 'Orlando',
    '(410)': '(813)', ' MD ': ' FL ',
}


def clean(text):
    for old, new in REPLACEMENTS.items():
        text = text.replace(old, new)
    if text.strip() == 'MD': text = text.replace('MD', 'FL')
    for old, new in {'21076': '33602', '21201': '33603', '21212': '33604', '21044': '32801', '21061': '33755', '21043': '32803', '21209': '33606', '21215': '33607', '21229': '33609', '21214': '33610'}.items():
        if text.strip() == old: text = text.replace(old, new)
    return text


def node(element):
    assert element.tag in TAGS, element.tag
    attrs = {}
    for k, value in element.attrib.items():
        if k in {'class', 'id', 'colspan'}:
            attrs[{'class': 'className', 'colspan': 'colSpan'}.get(k, k)] = int(value) if k == 'colspan' else value
        elif k == 'style':
            attrs['style'] = {re.sub(r'-([a-z])', lambda m: m[1].upper(), a.strip()): b.strip()
                              for a, b in (v.split(':', 1) for v in value.split(';') if ':' in v)}
    if element.tag == 'th': attrs['scope'] = 'col'
    onclick = element.get('onclick', '')
    match = re.fullmatch(r"load(MoreTier|AllPrior)\(this,'([\w-]+)'\)", onclick)
    if match:
        attrs['historyTable'] = match[2]
        attrs['historyMax'] = int(element.get('data-maxtier', '1'))
        attrs['historyAll'] = match[1] == 'AllPrior'
    elif onclick:
        raise ValueError(f'Unexpected source action: {onclick}')
    children = [clean(element.text)] if element.text else []
    for child in element:
        if isinstance(child.tag, str): children.append(node(child))
        if child.tail: children.append(clean(child.tail))
    if element.tag == 'table':
        rows = [c for c in children if isinstance(c, dict)]
        head = [r for r in rows if any(isinstance(c, dict) and c['tag'] == 'th' for c in r['children'])]
        body = [r for r in rows if r not in head]
        children = [{'tag': 'thead', 'attrs': {}, 'children': head}, {'tag': 'tbody', 'attrs': {}, 'children': body}]
    return {'tag': element.tag, 'attrs': attrs, 'children': children}


profiles = []
ATTRIBUTION = {
    'm1': ('Dr. A. Carter', 'Northside Medical', 'PR-001', 'Gold PPO'),
    'm2': ('Dr. J. Lee', 'Harbor Primary Care', 'PR-002', 'Complete HMO'),
    'm3': ('Dr. M. Owusu', 'Northside Medical', 'PR-003', 'Gold PPO'),
    'm4': ('Dr. A. Carter', 'Northside Medical', 'PR-001', 'Advantage Select PPO'),
    'm5': ('Dr. P. Nguyen', 'Harbor Primary Care', 'PR-005', 'Gold PPO'),
}
for row in document.xpath('//*[@id="p2"]//table/tr[td]'):
    cells = row.findall('td')
    member_key = cells[0].get('data-m')
    name, member_id = ''.join(cells[0].itertext()).split(' | ')
    section = document.get_element_by_id('p3-' + member_key)
    provider, group, scope, plan = ATTRIBUTION[member_key]
    header = section.find('div')
    identity = ''.join(header.xpath('.//div[@class="avatar"]//small')[0].itertext()).split(' | ')
    panes = []
    for pane in section.xpath('.//div[contains(@class,"mtabpane") and @id]'):
        pane_id = pane.get('id').split('-pane-')[1]
        # Keep numeric results and evidence intact, with explicit review gates.
        if pane_id == 'risk':
            intro = pane[0]
            intro.clear()
            intro.set('class', 'call')
            intro.text = ('CMS-HCC V28 · Payment year 2026. Current RAF reflects accepted contributions. '
                          'Projected RAF adds clinically confirmed opportunities pending acceptance. Potential RAF adds '
                          'unconfirmed opportunities. Suspects require clinician documentation and coding validation; '
                          'confidence scores do not establish a diagnosis. See source and scoring notes below.')
        panes.append({'id': pane_id, 'content': [node(c) for c in pane if isinstance(c.tag, str)]})
    flags = [clean(''.join(f.itertext())) for f in header.xpath('.//div[@class="flags"]/span')]
    if member_key == 'm5': flags = ['SDOH screening needed' if f == 'Transportation Flag' else f for f in flags]
    profiles.append({
        'id': member_id, 'sourceKey': member_key, 'name': name, 'age': int(cells[1].text),
        'sex': identity[-1], 'product': identity[1], 'conditions': clean(''.join(cells[2].itertext())),
        **{key: int(''.join(cells[index].itertext()).rstrip('%')) for index, key in enumerate(['composite', 'quality', 'risk', 'stars', 'closure'], 3)},
        'provider': provider, 'group': group, 'provider_scope': scope, 'plan': plan,
        'contract': 'H1234', 'network': 'Central MA Network', 'line': 'Medicare Advantage',
        'newMember': member_key == 'm5', 'flags': flags, 'panes': panes,
    })

payload = {
    'source': {'file': SOURCE.name, 'sha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
               'origin': 'authored_reference_profiles', 'measurementYear': 2026,
               'notes': 'Prepared reference profiles supplied in the Member 360 design. Geographic labels are adapted to Florida. '
                        'These profiles are separate from the scored analytics population and do not update clinical records. '
                        'HCC mappings and coefficients have not been validated against CMS model files. '
                        'Financial estimates assume $12,000 per RAF point; they are not plan payments or revenue forecasts. '
                        'Submitted and accepted scores in Risk analytics retain their existing definitions.'},
    'members': profiles,
}
(ROOT / 'apps/api/app/fixtures/member360.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n')
subprocess.run(['node', 'scripts/import_perform_design.mjs'], cwd=ROOT, check=True)
print(f'Imported {len(profiles)} members and {sum(len(p["panes"]) for p in profiles)} panes.')
