"""Validate product inputs before the intentionally narrower official CSV interface."""
from datetime import date
import hashlib
import json
import re

BOOLS = ['medicaid', 'institutional', 'new_enrollee', 'c_snp', 'esrd', 'pace', 'lis']
SOURCE_TYPES = {'professional', 'inpatient', 'outpatient', 'linked_chart_review', 'unlinked_chart_review'}


def stable_hash(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False).encode()).hexdigest()


def age(dob, at):
    return at.year - dob.year - ((at.month, at.day) < (dob.month, dob.day))


def parse_date(value):
    try:
        return date.fromisoformat(value) if isinstance(value, str) else None
    except ValueError:
        return None


def normalize_code(value):
    return str(value or '').upper().replace('.', '').strip()


def prepare(config, snapshot):
    errors, exclusions, warnings = [], [], []
    if not isinstance(snapshot, dict):
        return {'errors': ['Input snapshot must be an object'], 'exclusions': [], 'warnings': []}
    member = snapshot.get('member_id')
    dob = parse_date(snapshot.get('dob'))
    sex = snapshot.get('sex')
    if not isinstance(member, str) or not member.strip():
        errors.append('member_id is required')
    if not dob or dob > date(config['year'], 12, 31):
        errors.append('A valid date of birth is required')
    if type(sex) is not int or sex not in (1, 2):
        errors.append('sex must be 1 or 2 for the selected official model')
    enrollment = snapshot.get('enrollment')
    if not isinstance(enrollment, list) or not enrollment:
        errors.append('Effective-dated enrollment months are required')
        enrollment = []
    seen_months = set()
    for row in enrollment:
        if not isinstance(row, dict):
            errors.append('Enrollment rows must be objects')
            continue
        month = row.get('month', '')
        if not re.fullmatch(str(config['year']) + r'-(0[1-9]|1[0-2])', str(month)) or month in seen_months:
            errors.append('Enrollment months must be unique months in the configured year')
        seen_months.add(month)
        if config['program'] != 'ACA':
            if row.get('dual_status') not in ('none', 'partial', 'full'):
                errors.append(f'{month}: dual_status must be none, partial or full')
            for key in BOOLS:
                if type(row.get(key)) is not bool:
                    errors.append(f'{month}: explicit {key} status is required')
            if row.get('dual_status') in ('partial', 'full') and row.get('medicaid') is False:
                errors.append(f'{month}: dual and Medicaid statuses conflict')
            if row.get('c_snp') and row.get('pace'):
                errors.append(f'{month}: C-SNP and PACE statuses conflict')
    if config['program'] != 'ACA':
        if type(snapshot.get('orec')) is not int or snapshot.get('orec') not in (0, 1, 2, 3):
            errors.append('orec must be the actual original entitlement reason (0–3)')
        if any(isinstance(row, dict) and row.get('pace') for row in enrollment):
            errors.append('PACE requires its separate validated configuration; ordinary MA/Part D routing is unavailable')
        if config['program'] == 'MA' and (snapshot.get('orec') in (2, 3) or any(isinstance(row, dict) and row.get('esrd') for row in enrollment)):
            errors.append('ESRD requires its separate validated configuration; ordinary MA routing is unavailable')
        if dob and age(dob, date(config['year'], 2, 1)) < 0:
            errors.append('Birth date follows the Medicare model age-reference date')
        if config['program'] == 'Part D' and len({row.get('esrd') for row in enrollment if isinstance(row, dict)}) > 1:
            errors.append('Changing ESRD status requires separate member-month input snapshots for Part D')
    aca = snapshot.get('aca') or {}
    if config['program'] == 'ACA':
        if aca.get('metal') not in ('P', 'G', 'S', 'B', 'C'):
            errors.append('ACA metal must be P, G, S, B or C')
        if type(aca.get('csr_indicator')) is not int or not 1 <= aca.get('csr_indicator', 0) <= 11:
            errors.append('ACA person-level CSR indicator must be 1–11')
        if type(aca.get('enrollment_duration')) is not int or not 1 <= aca.get('enrollment_duration', 0) <= 12:
            errors.append('ACA enrollment_duration must be 1–12 from actual enrollment days')
        last = parse_date(aca.get('last_enrollment_date'))
        if not last or last.year != config['year'] or (dob and last < dob):
            errors.append('ACA last_enrollment_date must be a valid date in the benefit year')
        if last and enrollment and last.strftime('%Y-%m') != max(seen_months):
            errors.append('ACA last enrollment date must match the final enrollment month')
        if last and dob:
            aca = dict(aca, age_last=age(dob, last))
    diagnoses = snapshot.get('diagnoses', [])
    if not isinstance(diagnoses, list):
        errors.append('diagnoses must be an array')
        diagnoses = []
    ids = [row.get('id') for row in diagnoses if isinstance(row, dict)]
    if len(ids) != len(set(ids)) or any(not isinstance(id, str) or not id for id in ids):
        errors.append('Diagnosis occurrence IDs must be present and unique')
    superseded = {row.get('supersedes_id') for row in diagnoses if isinstance(row, dict) and row.get('supersedes_id')}
    accepted, seen = [], set()
    for row in diagnoses:
        if not isinstance(row, dict):
            errors.append('Diagnosis occurrences must be objects')
            continue
        row = dict(row, code=normalize_code(row.get('code')))
        reason = None
        service = parse_date(row.get('service_date'))
        if row.get('void'):
            reason = 'Voided occurrence'
        elif row.get('id') in superseded:
            reason = 'Superseded occurrence'
        elif not re.fullmatch(r'[A-Z][0-9][A-Z0-9][A-Z0-9]{0,4}', row['code']):
            reason = 'Invalid ICD-10-CM code format'
        elif not service or not config['service_start'] <= str(service) <= config['service_end']:
            reason = 'Outside the validated service-date window'
        elif dob and service < dob:
            reason = 'Service date precedes birth'
        elif not row.get('source_id') or not row.get('encounter_id'):
            reason = 'Source and encounter provenance are required'
        elif row.get('source_type') not in SOURCE_TYPES:
            reason = 'Unrecognized or missing source type'
        elif row.get('eligible_service') is not True:
            reason = 'No verified risk-adjustment-eligible service'
        elif type(row.get('audio_only')) is not bool:
            reason = 'Encounter modality is unresolved'
        elif row.get('audio_only'):
            reason = 'Audio-only encounter is not an eligible source'
        elif row.get('source_type') == 'unlinked_chart_review' and config['year'] >= 2027:
            before, after = row.get('parent_org_at_service'), row.get('parent_org_at_submission')
            if not before or not after or before == after or row.get('prior_program') != 'MA':
                reason = 'Unlinked chart review lacks the verified MA parent-organization switch exception'
        elif config['program'] == 'ACA' and row.get('source_type') in ('linked_chart_review', 'unlinked_chart_review'):
            reason = 'Supplemental chart-review source is outside the declared HHS DIY input scope'
        identity = (row['code'], row.get('service_date'))
        if not reason and identity in seen:
            reason = 'Duplicate code/date; earlier qualifying occurrence retained'
        if reason:
            exclusions.append({'id': row.get('id'), 'code': row['code'], 'source_id': row.get('source_id'), 'reason': reason})
        else:
            seen.add(identity)
            accepted.append(row)
    medications = {}
    for kind in ('ndc', 'hcpcs'):
        medications[kind] = []
        rows = snapshot.get(kind, [])
        if not isinstance(rows, list):
            errors.append(f'{kind} must be an array')
            continue
        for row in rows:
            service = parse_date(row.get('service_date')) if isinstance(row, dict) else None
            code = normalize_code(row.get('code')) if isinstance(row, dict) else ''
            valid_code = re.fullmatch(r'[0-9]{11}' if kind == 'ndc' else r'[A-Z0-9]{5}', code)
            if not service or not config['service_start'] <= str(service) <= config['service_end'] or not valid_code or not row.get('source_id'):
                exclusions.append({'id': row.get('id') if isinstance(row, dict) else None, 'code': code, 'reason': f'Invalid/out-of-scope {kind.upper()} input or missing source'})
            else:
                medications[kind].append(dict(row, code=code))
    if config.get('forecast_assumptions'):
        warnings.append(config['forecast_assumptions'])
    if config.get('coverage_note'):
        warnings.append(config['coverage_note'])
    return {'errors': list(dict.fromkeys(errors)), 'exclusions': exclusions, 'warnings': warnings,
            'member_id': member, 'dob': str(dob), 'sex': sex, 'orec': snapshot.get('orec'),
            'enrollment': sorted([r for r in enrollment if isinstance(r, dict)], key=lambda r: str(r.get('month'))),
            'diagnoses': sorted(accepted, key=lambda r: (r['code'], r['service_date'], r['id'])),
            'aca': aca, **medications}


def segments(config, prepared):
    at = date(config['year'], 2, 1)
    aged = age(date.fromisoformat(prepared['dob']), at) >= 65
    result = []
    for row in prepared['enrollment']:
        if config['program'] == 'MA':
            if row['new_enrollee']:
                segment = 'SNP_NEW_ENROLLEE' if row['c_snp'] else 'NEW_ENROLLEE'
            elif row['institutional']:
                segment = 'INSTITUTIONAL'
            else:
                dual = {'none': 'N', 'partial': 'PB', 'full': 'FB'}[row['dual_status']]
                segment = f'COMMUNITY_{dual}{"A" if aged else "D"}'
        elif config['program'] == 'Part D':
            if row['new_enrollee']:
                segment = 'NE_LTI' if row['institutional'] else f'NE_{"Low" if row["lis"] else "NonLow"}Community'
            else:
                segment = 'CE_LTI' if row['institutional'] else f'CE_{"Low" if row["lis"] else "NonLow"}{"Aged" if aged else "NonAged"}'
        else:
            age_last = prepared['aca']['age_last']
            group = 'ADULT' if age_last >= 21 else 'CHILD' if age_last >= 2 else 'INFANT'
            metal = {'P': 'PLATINUM', 'G': 'GOLD', 'S': 'SILVER', 'B': 'BRONZE', 'C': 'CATASTROPHIC'}[prepared['aca']['metal']]
            segment = f'{group}_{metal}'
        result.append({'month': row['month'], 'segment': segment})
    return result
