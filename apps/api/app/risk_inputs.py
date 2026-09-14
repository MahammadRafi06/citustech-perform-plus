"""Declared synthetic scoring inventory; original authored clinical sources stay intact."""
from __future__ import annotations

from copy import deepcopy
from . import risk_store

DEFAULT_CONFIG = 'ma_v28_py2027_forecast'
BASES = ('captured_baseline', 'qa_supported', 'submitted', 'accepted', 'eligible', 'reported', 'potential')
FIXTURE_VERSION = 'scoring-inputs-2026.1'
ACA_IDENTITY_VERSION = 'scoring-inputs-2026.2-identity'


def fixture_version(config_id):
    return ACA_IDENTITY_VERSION if config_id.startswith('hhs_') else FIXTURE_VERSION


def member_identity(member):
    """One identity across programs; the retained profile age is a 2027 reference."""
    age = max(1, min(int(member.get('age', 70)), 98))
    return {'dob': member.get('dob') or f'{2027-age}-01-15',
            'sex': 1 if member.get('sex') == 'Male' else 2,
            'profile_age': age, 'profile_age_reference_date': '2027-02-01'}


def mark_legacy_aca_stale(conn, members):
    """Invalidate current pointers only; original inputs and runs remain immutable."""
    identities = {m['id']: member_identity(m) for m in members}
    rows = conn.execute('''SELECT s.member_id, s.config_id, s.score_basis, s.run_id, i.body
        FROM risk_stages s JOIN risk_runs r ON r.id=s.run_id
        JOIN risk_inputs i ON i.id=r.snapshot_id
        WHERE s.config_id LIKE ?
          AND i.body->>'fixture_version'=?''', ('hhs_%', FIXTURE_VERSION))
    for row in rows:
        value = risk_store.body(row)
        identity = identities.get(row['member_id'])
        if identity and any(value.get(key) != identity[key] for key in ('dob', 'sex')):
            conn.execute('''UPDATE risk_stages SET stale=TRUE, reason=?
                WHERE member_id=? AND config_id=? AND score_basis=? AND run_id=?''',
                ('Member demographics corrected in the scoring inventory. Recalculate with the current identity; this earlier input and result remain retained.',
                 row['member_id'], row['config_id'], row['score_basis'], row['run_id']))


def diagnosis(mid, code, service_date, index=1, source_id=None):
    return {'id': f'DX-{mid}-{index}', 'code': code, 'service_date': service_date,
            'source_id': source_id or f'CLAIM-{mid}-{index}', 'encounter_id': f'ENC-{mid}-{index}',
            'source_type': 'professional', 'eligible_service': True, 'audio_only': False,
            'modifiers': [], 'procedure_code': '99213', 'submission_date': '2026-09-12',
            'parent_org_at_service': 'SYNTHETIC-PLAN-01', 'parent_org_at_submission': 'SYNTHETIC-PLAN-01',
            'source_policy_basis': 'Authored synthetic eligible professional encounter; not extracted from a chart.',
            'synthetic': True}


def member_input(member, config_id=DEFAULT_CONFIG):
    """Generate complete input records, never a precomputed model score."""
    n = int(member['id'].split('-')[-1])
    hhs = config_id.startswith('hhs_')
    payment_year = 2025 if '2025' in config_id else 2026 if '2026' in config_id and not hhs else 2027
    initial = config_id.endswith('_initial')
    # Separate scoring populations for each software/run; clinical DOC dates are never changed.
    service_date = '2026-05-20' if initial else '2026-08-20' if payment_year == 2027 or hhs else f'{payment_year-1}-08-20'
    identity = member_identity(member)
    age = identity['profile_age']
    age_year = 2026 if hhs else payment_year
    age = max(1, min(age, 98)) if not hhs else age
    # Software-specific age reference dates never change the person's identity.
    values = {'member_id': member['id'], 'dob': identity['dob'],
              'sex': identity['sex'], 'orec': 1 if age < 65 and not hhs else 0,
              'enrollment': [], 'diagnoses': [], 'ndc': [], 'hcpcs': [], 'synthetic': True,
              'fixture_version': fixture_version(config_id), 'program': 'ACA' if hhs else 'Part D' if config_id.startswith('rxhcc') else 'MA',
              'source_coverage': 'Complete authored synthetic scoring inventory; clinical review preparation is separate.',
              'coverage_complete': True, 'contract_id': 'SYNTHETIC-PLAN-01', 'provider_id': member['provider_id']}
    dual = ('none', 'partial', 'full')[n % 3] if n > 6 else 'none'
    for month in range(1, 13):
        values['enrollment'].append({'month': f'{age_year}-{month:02}', 'dual_status': dual,
              'medicaid': dual != 'none', 'institutional': n % 29 == 0, 'new_enrollee': n % 31 == 0,
              'c_snp': False, 'esrd': False, 'pace': False, 'lis': dual != 'none'})
    if payment_year == 2026 and not hhs and age == 65:
        values['enrollment'] = []
        values['eligibility_exclusions'] = [{'reason': 'The authored aged-only member reaches 65 in 2027; no prior 2026 Medicare entitlement or eligible months are established.',
                                           'code': 'BEFORE_AGED_ENTITLEMENT'}]
    codes = [[], ['I10'], ['E119'], ['J449'], ['I5022'], ['N1832'], ['E1165', 'N1832'], ['J449', 'I5022']][n % 8]
    if n == 1: codes = ['I10']  # Jordan's heart-failure addition remains hypothetical until QA.
    if n in (2, 3, 6): codes = ['I10']  # Historical/signal/unsigned findings are not confirmed inputs.
    if n == 2 and payment_year == 2026 and not hhs:
        codes = ['I10', 'J449']  # Explicit prior-period coded supplement; never carried into current inputs.
    if n == 4: codes = ['I509']  # Authored prior coded record, pending accuracy correction.
    if n == 5: codes = ['E119', 'N1832']  # Explicit separate synthetic scoring supplement, not chart inference.
    values['diagnoses'] = [diagnosis(member['id'], code, service_date, i+1) for i, code in enumerate(codes)]
    if n == 4:
        values['diagnoses'][0]['original_record_id'] = 'SUB-0001'
    if hhs:
        values['aca'] = {'metal': ('P', 'G', 'S', 'B', 'C')[n % 5], 'csr_indicator': 1,
                         'enrollment_duration': 9, 'last_enrollment_date': '2026-09-30'}
        values['enrollment'] = values['enrollment'][:9]
        if age <= 1:
            values['diagnoses'] = [diagnosis(member['id'], 'Z3800', '2026-01-15', 1)]
        if n == 1:
            values['aca'].update(metal='S', csr_indicator=2)
    return values


def candidate_changes(state, member, config_id):
    """Prepared finding proposals, with truthful source and confirmation gates."""
    findings = []
    proposals = {1: ('I5022', 'DOC-0001', 'documented_gap'), 2: ('J449', 'DOC-0005', 'annual_recapture'),
                 3: ('E119', 'DOC-0006', 'clinical_suspect'), 4: ('I509', 'DOC-0007', 'accuracy_correction'),
                 5: ('E1165', None, 'documented_gap'), 6: ('J449', 'DOC-RILEY-SIGNED', 'submission_eligibility_gap')}
    n = int(member['id'].split('-')[-1])
    if n not in proposals:
        return findings
    code, did, kind = proposals[n]
    for finding in [o for o in state['opportunities'] if o['member_id'] == member['id']]:
        # A member may have several findings. The authored case proposal belongs
        # only to its original finding; later findings need their own code/source.
        if finding['id'] != f'OP-{n:04}':
            continue
        doc = next((d for d in state['documents'] if d['id'] == did), {})
        findings.append({'finding_id': finding['id'], 'member_id': member['id'], 'type': kind,
             'condition': finding['condition'], 'code': code, 'operation': 'delete' if n == 4 else 'add',
             'source_id': did, 'service_date': doc.get('date'), 'origin': 'prepared_rule',
             'score_label': 'If supported', 'evidence_strength': finding.get('evidence'),
             'confidence': None, 'priority': finding.get('priority'), 'status': finding.get('status'),
             'next_action': finding.get('eligibility', {}).get('reason'), 'owner': finding.get('owner'),
             'clinical_ready': finding.get('eligibility', {}).get('support_allowed', False),
             'baseline_config_id': config_id, 'delta': None,
             'missing_confirmation': 'Review the exact source and obtain independent QA.' if n != 5 else 'Scoring supplement only; clinical code selection requires review.'})
    return findings


def manifest(members, config_id=DEFAULT_CONFIG):
    prior_excluded = sum(int(m.get('age', 70)) == 65 for m in members) if config_id == 'ma_v28_py2026' else 0
    return {'version': fixture_version(config_id), 'synthetic': True, 'expected_members': len(members),
            'expected_scoreable_members': len(members) - prior_excluded,
            'expected_member_months': (len(members) - prior_excluded) * 12,
            'eligibility_excluded_members': prior_excluded,
            'eligibility_exclusion_policy': 'Prior 2026 aged-only members who first reach 65 in 2027 have no invented earlier disability entitlement.' if prior_excluded else None,
            'aca_expected_member_months': len(members) * 9,
            'review_ready_members': 6, 'negative_fixture_count': 6,
            'negative_fixtures': ['missing_dual_status', 'outside_run', 'invalid_code', 'duplicate_occurrence', 'known_esrd', 'unknown_pace'],
            'population_hash': risk_store.digest([m['id'] for m in members]),
            'basis': 'Expected normal population declared before execution; named validation examples are separate.'}


def apply_changes(snapshot, additions=(), removals=()):
    result = deepcopy(snapshot)
    remove = set(removals)
    valid_ids = {d['id'] for d in result['diagnoses']}
    if remove - valid_ids:
        raise ValueError('A removed diagnosis occurrence is not in the selected baseline.')
    result['diagnoses'] = [d for d in result['diagnoses'] if d['id'] not in remove]
    for i, candidate in enumerate(additions):
        code = str(candidate['code']).upper().replace('.', '')
        date = candidate.get('service_date') or (result['diagnoses'][0]['service_date'] if result['diagnoses'] else '2026-08-20')
        dx = diagnosis(result['member_id'], code, date, 'SCENARIO-' + str(i+1), candidate.get('source_id'))
        dx['id'] = 'HYP-' + risk_store.digest({'input': risk_store.digest(snapshot), 'candidate': candidate, 'index': i})[:24]
        dx['hypothetical'] = True
        dx['source_policy_basis'] = 'Hypothetical qualifying encounter assumption; no clinical diagnosis established.'
        result['diagnoses'].append(dx)
    result.pop('id', None)
    result.pop('input_hash', None)
    return result
