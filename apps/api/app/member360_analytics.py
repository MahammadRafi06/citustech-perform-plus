"""Link the supplied profiles to read-only suspect analytics, without native scores.

Identity, condition text, evidence summaries and reference deltas come from the
same inert Member 360 fixture. No existing patient or clinical document is renamed.
"""
import re
from .member360 import _DATA
from .suspect_discovery import GROUPS
from .member360_evidence import EVIDENCE


def text(node):
    return node if isinstance(node, str) else ' '.join(text(c) for c in node.get('children', []))


def nodes(value):
    if isinstance(value, dict):
        yield value
        for child in value.get('children', []):
            yield from nodes(child)
    elif isinstance(value, list):
        for child in value:
            yield from nodes(child)


def tables(member, pane):
    return [n for p in member['panes'] if p['id'] == pane for n in nodes(p['content']) if n['tag'] == 'table']


def visible_profiles(user, roles):
    if 'members' not in roles.get(user['role'], {}).get('screens', []):
        return []
    return [m for m in _DATA['members'] if user['role'] != 'provider' or m['provider_scope'] == user.get('provider_id')]


def members_for(user, roles):
    output = []
    for m in visible_profiles(user, roles):
        address = [text(c) for c in tables(m, 'summary')[1]['children'][1]['children'][0]['children']]
        race = text(tables(m, 'summary')[2]['children'][1]['children'][0]['children'][0])
        output.append(dict(id=m['id'], name=m['name'], age=m['age'], sex=m['sex'],
            county=address[2], zip=address[4], condition=m['conditions'],
            provider_id='M360-' + m['provider_scope'], provider=f"{m['group']} · {m['provider']}", physician=m['provider'],
            analytics_contract=m['contract'], health_network=m['network'], provider_group=m['group'], profile_reference=True, profile_rank=_DATA['members'].index(m),
            # Preserve supplied race; profile screening flags do not establish a Z-code.
            social_need='unknown', race='Black' if race == 'Black or African American' else race))
    return output


def fixtures(members):
    ids = {m['id'] for m in members if m.get('profile_reference')}
    findings = []
    labels = {key: label for key, label, _ in GROUPS}
    for m in _DATA['members']:
        if m['id'] not in ids:
            continue
        rows = tables(m, 'risk')[0]['children'][1]['children']
        for i, row in enumerate(rows):
            condition, category, delta, confidence, inclusion, evidence, check = [text(c).strip() for c in row['children']]
            # Already validated contributions are profile context, not new gaps.
            # In particular, James's currently coded CKD must not become a
            # fabricated missing-code suspect alongside his specificity review.
            if category == 'Validated':
                continue
            condition = condition.replace(' High-Risk HCC', '')
            source_hcc = re.match(r'HCC (\d+) ', condition)
            name = re.sub(r'^HCC \d+ ', '', condition)
            cat = 'OC' if 'Unsupported' in category else 'RC' if 'Recapture' in category else 'SP' if 'Specificity' in category else 'NC'
            kind = {'OC': 'conflicting', 'RC': 'recapture', 'SP': 'specificity', 'NC': 'disconnected'}[cat]
            key = f'M360-{m["id"]}-{i+1}'
            detail = EVIDENCE.get(key)
            document_ids = [f'{key}-DOC-{n+1}' for n in range(len(detail['records']))] if detail else []
            findings.append(dict(id=key, member_id=m['id'], condition=name, business_category=cat,
                clinical_concept=f'member360:{i+1}', service_period='2026', type='member360_reference',
                # Source confidence is not an evidence grade or closure estimate.
                evidence='Unknown',
                status='new', analysis_date='2026-09-15', document_ids=document_ids,
                # The supplied coefficient is unvalidated, so do not feed it into a
                # selected-model score or financial scenario as an established impact.
                illustrative_exposure=None, authored_extension=True,
                summary=evidence, countercheck=check,
                profile_reference=dict(member_id=m['id'], year=2026, model_version='V28', condition=condition,
                    category=category, confidence=confidence, evidence=evidence, compliance_note=check,
                    evidence_strength=detail['strength'] if detail else 'Unknown',
                    hcc=source_hcc.group(1) if source_hcc else None, delta=float(delta), inclusion=inclusion,
                    source_sha256=_DATA['source']['sha256']),
                discovery=dict(kind=kind, label=labels[kind], signal=evidence,
                    coded_view=detail['coded_view'] if detail else inclusion, why_missed='The condition detail is in the member profile and may be absent or incomplete in the coded record.',
                    confirm=check, record_count=len(document_ids), rank=i, origin='authored_reference_profiles',
                    comparison_basis='Member 360 Risk Adjustment tab with authored evidence expansions; not recovered original clinical documents.', version='member360-linked-v3')))
    return findings


def prioritize(cases):
    """Round-robin the matching featured members, then retain other case ordering."""
    ranks = {m['id']: i for i, m in enumerate(_DATA['members'])}
    occurrence = {}
    def key(case):
        mid = case['member_id']
        if mid not in ranks:
            return (1, 0, 0)
        position = occurrence.get(mid, 0)
        occurrence[mid] = position + 1
        return (0, position, ranks[mid])
    return sorted(cases, key=key)
