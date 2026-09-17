"""Authored evidence expansions for the supplied Member 360 presentation profiles.

These are synthetic supporting records, not recovered clinical documents. The
source profile remains authoritative for confidence, coding status and RAF. A
September 15 date denotes a record-review summary unless an encounter or lab date
is explicitly supplied by that profile. No new clinical confirmation is created.
"""


def record(title, text, *, date='2026-09-15', section='Documentation Review', date_kind='review_date'):
    return dict(title=title, text=text, date=date, section=section, date_kind=date_kind)


EVIDENCE = {
    'M360-M-104829-2': dict(
        strength='Moderate',
        coded_view='Vascular disease was recorded in 2025. It has not been re-documented in the current reporting period.',
        records=[
            record('Prior-Year Diagnosis History', 'The 2025 diagnosis history includes vascular disease. This historical entry does not establish a current-year assessment.'),
            record('Current-Year Clinical Review', 'Vascular disease has not been re-documented this year. CKD and hypertension remain relevant comorbidities; the recapture encounter has not been completed.'),
        ]),
    'M360-M-104829-3': dict(
        strength='Moderate',
        coded_view='A cardiology claim and ECG are present. A current clinician assessment of heart arrhythmia is not documented.',
        records=[
            record('Cardiology Claims Summary', 'A cardiology claim is present in the member record. The available summary does not include a clinician assessment confirming the arrhythmia.'),
            record('ECG Documentation Review', 'An ECG is referenced in the clinical record. The available entry does not establish the arrhythmia subtype or a signed diagnostic assessment.'),
        ]),
    'M360-M-318820-2': dict(
        strength='Limited',
        coded_view='Rheumatoid arthritis remains on the prior-year problem list. No corroborating encounter appears in current-year claims.',
        records=[
            record('Historical Problem List', 'Rheumatoid arthritis is listed in the prior-year record. The entry is historical and does not document a current-year assessment.'),
            record('Current-Year Encounter Review', 'Current claims contain no corroborating encounter for rheumatoid arthritis. A current clinical assessment is needed before coding the condition.'),
        ]),
    'M360-M-204175-2': dict(
        strength='Moderate',
        coded_view='COPD complication was recorded in 2025 but has not been re-documented in the current reporting period.',
        records=[
            record('Prior-Year Pulmonary Diagnosis History', 'The 2025 record contains COPD complication. The historical condition remains a recapture opportunity, not a confirmed current-year diagnosis.'),
            record('Current-Year Pulmonary Review', 'No current-period re-documentation of the COPD complication is present in the available summary. The recapture encounter has not been completed.'),
        ]),
    'M360-M-204175-3': dict(
        strength='Limited',
        coded_view='Vascular disease appears in claims, with no recent clinical assessment available to support current-year capture.',
        records=[
            record('Vascular Diagnosis Claims Summary', 'A vascular disease diagnosis appears in claims. The claim alone does not establish the current clinical assessment or management of the condition.'),
            record('Clinical Documentation Review', 'No recent note supporting the vascular disease diagnosis is present in the available clinical history. A current assessment is required.'),
        ]),
    'M360-M-204175-4': dict(
        strength='Limited',
        coded_view='Morbid obesity is included in the current RAF from a single telehealth encounter on March 14, 2026.',
        records=[
            record('Telehealth Encounter Claim', 'Morbid obesity is recorded on a single telehealth encounter, place of service 02. The diagnosis is included in the current RAF.',
                   date='2026-03-14', section='Recorded Diagnosis', date_kind='encounter_date'),
            record('Obesity Documentation Review', 'No BMI, weight, nutrition counseling or follow-up is documented. No corroborating vitals, laboratory results or specialist encounter is present in the available history.'),
        ]),
    'M360-M-441098-2': dict(
        strength='Strong',
        coded_view='The professional claim records N18.31, CKD stage 3a. Laboratory and pharmacy diagnosis fields record N18.4, CKD stage 4.',
        records=[
            record('Kidney Function Results', 'eGFR was 24 mL/min/1.73m² on April 14, 2026 and 22 mL/min/1.73m² on August 2, 2026. Both results are below 30. Clinician reconciliation of CKD stage remains required.',
                   date='2026-08-02', section='Laboratory Findings', date_kind='result_date'),
            record('Diagnosis Code Reconciliation', 'The current professional claim carries N18.31, while laboratory and pharmacy diagnosis fields carry N18.4. Reconcile the conflicting stage information before any coding or submission change.'),
        ]),
    'M360-M-441098-3': dict(
        strength='Limited',
        coded_view='A single ECG entry mentions an arrhythmia. No current assessment confirming a specified arrhythmia is available.',
        records=[
            record('ECG Record Summary', 'A single ECG mention raises a possible arrhythmia. The available summary does not establish a confirmed diagnosis or a specific arrhythmia subtype.'),
            record('Cardiac Assessment Review', 'A clinician assessment of the suspected arrhythmia is absent. Confirm the clinical diagnosis and specificity before capture.'),
        ]),
    'M360-M-559214-1': dict(
        strength='Limited',
        coded_view='Depression screening is recorded at the new-member wellness visit. No diagnosis of major depressive disorder is documented.',
        records=[
            record('Wellness Screening Summary', 'The new-member wellness visit includes a positive PHQ-2 depression screen and screening service G0444. A positive screen does not establish major depressive disorder.'),
            record('Behavioral Health Follow-Up Review', 'No follow-up assessment, diagnosis or treatment is on file. A diagnostic encounter is needed before assigning a depression diagnosis code.'),
        ]),
}


def documents(findings):
    output = []
    for finding in findings:
        detail = EVIDENCE.get(finding['id'])
        if not detail:
            continue
        for index, source in enumerate(detail['records'], 1):
            output.append(dict(
                id=f"{finding['id']}-DOC-{index}", member_id=finding['member_id'],
                source_member_id=finding['member_id'], title=source['title'], date=source['date'],
                available=True, source_status='authored_clinical_fixture', origin='authored_member360_evidence',
                date_kind=source['date_kind'], source_finding_id=finding['id'],
                source_profile_sha256=finding['profile_reference']['source_sha256'],
                pages=[dict(number=1, sections=[dict(heading=source['section'], text=source['text'], highlight=True)])]))
    return output
