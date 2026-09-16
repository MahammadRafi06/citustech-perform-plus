"""Authored clinical-context fixtures for synthetic members only.

These read-only records demonstrate discovery patterns, not measured ML misses.
They never overwrite retained notes, diagnoses, findings, or model results.
Clinical guardrails: CMS medical-record documentation principles; NIDDK CKD
identification guidance (persistent findings over >3 months, not one lab result).
"""

from datetime import date, timedelta

VERSION = 'clinical-context-v2'
MEMBERS_PER_STORY = 5
GROUPS = [
    ('invisible', 'Invisible gaps', 'A diagnosis is buried in narrative, not the coded record.'),
    ('timeline', 'Timeline gaps', 'The signal emerges across several visits.'),
    ('disconnected', 'Disconnected evidence', 'Relevant details sit in different records.'),
    ('specificity', 'Missing specificity', 'The record contains detail that the code leaves out.'),
    ('recapture', 'Recapture gaps', 'A persistent condition needs current-year confirmation.'),
    ('conflicting', 'Conflicting evidence', 'Later context challenges an existing label.'),
]


def story(key, gap, condition, match, category, signal, coded, why, check, records, *, strength='Moderate', delta=None):
    return dict(key=key, gap=gap, condition=condition, match=match, category=category,
                signal=signal, coded=coded, why=why, check=check, records=records,
                strength=strength, delta=delta)


STORIES = [
    story('copd-note', 'invisible', 'COPD documented outside the coded record', 'copd', 'CG',
        'Pulmonology assessment names COPD; the encounter extract contains only shortness of breath.',
        'Shortness of breath; no COPD diagnosis in the encounter extract.',
        'A code-only screen sees a symptom. The diagnosis appears in the specialist assessment text.',
        'Check that the signed encounter is eligible, the diagnosis is current and COPD has not already been captured elsewhere.',
        [('2026-08-20', 'Pulmonology consultation', 'Assessment', 'COPD, stable. Continue the current maintenance plan and reassess symptoms at follow-up.'),
         ('2026-08-20', 'Encounter diagnosis extract', 'Recorded diagnoses', 'Shortness of breath is recorded. COPD is absent from this encounter diagnosis extract.')], strength='Strong', delta=.18),
    story('depression-note', 'invisible', 'Depression detail buried in the assessment', 'depress', 'CG',
        'Behavioral health documents recurrent major depression; the coded record lists insomnia only.',
        'Insomnia in the encounter extract; no depression diagnosis.',
        'A diagnosis mentioned in the assessment may be absent from structured diagnosis features.',
        'Confirm the current episode, severity, remission status and applicable model mapping. Antidepressant use alone is not confirmation.',
        [('2026-08-12', 'Behavioral health follow-up', 'Assessment', 'Recurrent major depressive disorder, current episode moderate. Symptoms and the treatment plan were reviewed today.'),
         ('2026-08-12', 'Encounter diagnosis extract', 'Recorded diagnoses', 'Insomnia is recorded. The depression assessment is not represented in the diagnosis extract.')], strength='Strong', delta=.10),
    story('kidney-timeline', 'timeline', 'Persistent kidney-function decline', 'kidney', 'NC',
        'eGFR values of 48, 46 and 43 span five months; no CKD diagnosis appears in the coded record.',
        'Three laboratory results, each stored as a separate event; no CKD diagnosis.',
        'A single-visit screen can miss persistence when the measurements are not connected over time.',
        'Ask the clinician to assess chronicity, acute causes and kidney disease. Do not assign CKD or its stage from laboratory values alone.',
        [('2026-03-05', 'Metabolic panel', 'Kidney function', 'eGFR 48 mL/min/1.73 m².'),
         ('2026-05-14', 'Metabolic panel', 'Kidney function', 'eGFR 46 mL/min/1.73 m².'),
         ('2026-08-19', 'Primary care follow-up', 'Results review', 'eGFR 43 mL/min/1.73 m². Persistent reduction noted; cause and chronicity require clinical assessment.')]),
    story('obesity-timeline', 'timeline', 'Repeated severe-obesity signals without a diagnosis', 'obes', 'NC',
        'BMI remains above 40 across three visits, but there is no corresponding clinical diagnosis.',
        'BMI measurements of 41.2, 42.0 and 41.7; no obesity diagnosis.',
        'Repeated measurements may be separated from the assessment, and a measurement is not itself a diagnosis.',
        'Obtain a clinician assessment, confirm measurement accuracy and check model eligibility. Do not code a diagnosis from BMI alone.',
        [('2026-02-18', 'Primary care vital signs', 'Measurements', 'BMI 41.2 kg/m².'),
         ('2026-05-21', 'Primary care vital signs', 'Measurements', 'BMI 42.0 kg/m².'),
         ('2026-08-27', 'Primary care follow-up', 'Measurements and assessment', 'BMI 41.7 kg/m². Weight-management discussion recorded; a specific obesity diagnosis is not documented.')]),
    story('heart-handoff', 'disconnected', 'Heart failure lost between care settings', 'heart failure', 'CG',
        'A discharge assessment documents chronic heart failure; the primary care problem list omits it.',
        'Hospital and primary care records remain separate; outpatient diagnosis extract has edema only.',
        'A model limited to the primary care extract may never receive the hospital assessment.',
        'Reconcile the signed discharge assessment with current clinical status and check whether the condition is already captured by the hospital encounter.',
        [('2026-07-09', 'Hospital discharge summary', 'Discharge diagnoses', 'Chronic heart failure with preserved ejection fraction. Volume status improved; outpatient follow-up arranged.'),
         ('2026-08-06', 'Primary care follow-up', 'Assessment and problem list', 'Recent admission reviewed. Edema is listed; heart failure is absent from the active problem-list extract.')], strength='Strong', delta=.20),
    story('diabetes-specialist', 'disconnected', 'Diabetic kidney disease split across records', 'diabet', 'SP',
        'Nephrology documents diabetic kidney disease while primary care still lists uncomplicated diabetes.',
        'Uncomplicated type 2 diabetes in primary care; kidney assessment held in the specialist record.',
        'Separate diagnosis features do not preserve the clinician-documented relationship between conditions.',
        'Reconcile the specialist assessment, stage and current encounter. Coexisting diabetes and kidney findings alone are not proof of a causal relationship.',
        [('2026-08-04', 'Nephrology consultation', 'Assessment', 'Type 2 diabetes with diabetic chronic kidney disease, stage 3b. Diabetes-related renal disease discussed in the assessment.'),
         ('2026-08-26', 'Primary care diagnosis extract', 'Recorded diagnoses', 'Type 2 diabetes without complications is recorded; the nephrology assessment has not been reconciled.')], strength='Strong', delta=.06),
    story('diabetes-specificity', 'specificity', 'Diabetic neuropathy detail not carried into the code', 'diabet', 'SP',
        'The clinician explicitly links neuropathy to diabetes; the encounter code remains uncomplicated diabetes.',
        'Type 2 diabetes without complications.',
        'The model may detect diabetes but lose the complication relationship contained in free text.',
        'Confirm the clinician attribution and eligible encounter. Symptoms or neuropathy medication alone must not establish diabetic neuropathy.',
        [('2026-08-14', 'Primary care assessment', 'Assessment and plan', 'Type 2 diabetes with diabetic polyneuropathy. Bilateral sensory symptoms reviewed; continue the existing management plan.'),
         ('2026-08-14', 'Encounter diagnosis extract', 'Recorded diagnoses', 'Type 2 diabetes without complications remains the recorded diagnosis.')], strength='Strong', delta=.05),
    story('kidney-specificity', 'specificity', 'Documented CKD stage missing from the code', 'kidney', 'SP',
        'Nephrology specifies CKD stage 3b; the structured diagnosis remains unspecified CKD.',
        'Chronic kidney disease, unspecified stage.',
        'Recognizing the disease is not enough when stage detail is only present in the assessment.',
        'Confirm the clinician-documented current stage and reconcile conflicting assessments before choosing a code or model grouping.',
        [('2026-08-11', 'Nephrology follow-up', 'Assessment', 'Chronic kidney disease stage 3b, stable. Current stage reviewed with the patient.'),
         ('2026-08-11', 'Encounter diagnosis extract', 'Recorded diagnoses', 'Chronic kidney disease, unspecified stage.')], strength='Strong', delta=.03),
    story('amputation-recapture', 'recapture', 'Amputation status absent from current-year codes', 'amput', 'ST',
        'A prosthetic follow-up confirms persistent left below-knee amputation status; current-year codes omit the status.',
        'Prior-year amputation status; current-year encounter extract lists prosthetic adjustment only.',
        'A current-year-only screen can drop a persistent status when the related encounter uses a different code.',
        'Confirm anatomy, laterality, current documentation and eligible source. Do not infer diabetes, vascular disease or an active wound from the amputation status.',
        [('2025-11-17', 'Prior-year clinical summary', 'Health status', 'Acquired absence of the left leg below the knee.'),
         ('2026-08-18', 'Rehabilitation physician follow-up', 'Current assessment', 'Left below-knee amputation status is unchanged. Residual limb intact; prosthesis fit reviewed.'),
         ('2026-08-18', 'Current-year diagnosis extract', 'Recorded diagnoses', 'Prosthetic adjustment recorded; amputation status is absent from the current-year extract.')], strength='Strong', delta=.12),
    story('copd-recapture', 'recapture', 'Stable COPD missing from the current year', 'copd', 'RC',
        'COPD was captured last year and is assessed as stable this year, but only the preventive-visit code appears.',
        'COPD in prior-year diagnoses; preventive visit only in the current encounter extract.',
        'A quiet year with stable symptoms may offer few new coded events despite current clinical assessment.',
        'Verify current-year evaluation and source eligibility. Prior-year codes and inhaler fills alone do not confirm the diagnosis this year.',
        [('2025-10-22', 'Prior-year pulmonary assessment', 'Assessment', 'COPD, stable on maintenance therapy.'),
         ('2026-08-21', 'Primary care annual visit', 'Chronic-condition assessment', 'COPD reviewed and remains stable. No exacerbation reported; continue the established care plan.'),
         ('2026-08-21', 'Encounter diagnosis extract', 'Recorded diagnoses', 'Preventive visit recorded. No COPD diagnosis is included in this encounter extract.')], strength='Strong', delta=.16),
    story('depression-context', 'conflicting', 'Active depression label conflicts with remission', 'depress', 'OC',
        'The current note documents full remission, while the problem list retains an active severe episode.',
        'Recurrent major depression, severe episode, carried forward in the problem list.',
        'A label-based screen can retain the diagnosis while missing a change in episode or remission context.',
        'Reconcile the current episode, remission status and service date. A later remission note does not invalidate a properly supported earlier episode.',
        [('2026-08-05', 'Behavioral health follow-up', 'Current assessment', 'Recurrent major depressive disorder, in full remission. No current depressive episode identified at this visit.'),
         ('2026-08-05', 'Problem-list extract', 'Carried-forward label', 'Recurrent major depressive disorder, current episode severe; unchanged from the prior encounter.')], strength='Strong', delta=-.08),
    story('copd-negation', 'conflicting', 'COPD label survives an explicit rule-out', 'copd', 'OC',
        'The specialist states COPD is not established, but the old COPD problem-list entry remains.',
        'COPD in the problem list; pulmonary testing and the later assessment are separate.',
        'Keyword or code presence can miss negation and the timing of a revised clinical assessment.',
        'Reconcile the conflicting records and whether the earlier diagnosis was valid. Do not remove a diagnosis automatically or infer an alternative from medication use.',
        [('2026-07-16', 'Problem-list extract', 'Active labels', 'COPD remains listed from an earlier encounter.'),
         ('2026-08-28', 'Pulmonology reassessment', 'Assessment', 'Current testing does not establish persistent airflow obstruction. COPD is not confirmed; the prior label requires reconciliation.')], strength='Strong', delta=-.12),
]


STORIES += [
    story('heart-note', 'invisible', 'Stable heart failure omitted from encounter codes', 'heart failure', 'CG',
        'The primary care assessment addresses chronic systolic heart failure; the coded extract lists fatigue only.',
        'Fatigue is coded; the chronic-condition assessment is not represented.',
        'Stable disease may appear only in the assessment and plan, with no new acute event to trigger a code-based screen.',
        'Confirm the signed current assessment, type of heart failure and source eligibility. Check for existing capture before adding anything.',
        [('2026-08-13', 'Primary care follow-up', 'Chronic-condition assessment', 'Chronic systolic heart failure, stable. Symptoms, weight and the ongoing management plan reviewed.'),
         ('2026-08-13', 'Encounter diagnosis extract', 'Recorded diagnoses', 'Fatigue is recorded. Heart failure is not included in this encounter extract.')], strength='Strong', delta=.17),
    story('kidney-note', 'invisible', 'CKD assessment absent from structured diagnoses', 'kidney', 'CG',
        'Nephrology assesses CKD stage 3b, while the encounter extract contains hypertension only.',
        'Hypertension is coded; no CKD diagnosis in the specialist encounter extract.',
        'The clinical assessment contains the diagnosis, but structured-only features retain the reason for the visit.',
        'Verify the clinician-documented stage, service date and eligible source. Do not derive the stage solely from an isolated result.',
        [('2026-08-15', 'Nephrology follow-up', 'Assessment', 'Chronic kidney disease stage 3b. Kidney status and the management plan reviewed at this encounter.'),
         ('2026-08-15', 'Encounter diagnosis extract', 'Recorded diagnoses', 'Hypertension recorded. CKD is absent from the encounter extract.')], strength='Strong', delta=.09),
    story('heart-timeline', 'timeline', 'Recurring fluid-retention signals across visits', 'heart failure', 'NC',
        'Edema, increasing weight and breathlessness recur across three visits without a documented underlying diagnosis.',
        'Separate symptom entries for edema, weight change and breathlessness.',
        'Each visit looks like an isolated symptom; the recurrent pattern becomes apparent only across the timeline.',
        'A clinician must assess the cause and consider alternatives. Symptoms alone do not establish heart failure or a risk-adjusting diagnosis.',
        [('2026-04-09', 'Primary care visit', 'Symptoms', 'Bilateral ankle edema reported. Underlying cause is not documented.'),
         ('2026-06-18', 'Primary care visit', 'Symptoms', 'Increasing weight and recurrent ankle swelling reported; assessment pending.'),
         ('2026-08-22', 'Primary care follow-up', 'Symptoms and assessment', 'Breathlessness and edema recur. Further clinical assessment is needed; heart failure is not established in this note.')]),
    story('depression-timeline', 'timeline', 'Persistent mood symptoms without diagnostic assessment', 'depress', 'NC',
        'Low mood, poor sleep and reduced interest persist across visits, but no clinician diagnosis is recorded.',
        'Separate symptom and screening entries, without a diagnostic assessment.',
        'A single-visit feature set can miss persistence, while a screening result by itself cannot establish a diagnosis.',
        'Arrange clinical assessment of symptoms, duration and other causes. Do not infer depression, recurrence or severity from screening or medication alone.',
        [('2026-03-19', 'Primary care screening', 'Patient-reported symptoms', 'Low mood and reduced interest reported; no diagnostic assessment recorded.'),
         ('2026-05-28', 'Primary care follow-up', 'Patient-reported symptoms', 'Poor sleep and low mood continue. Screening findings reviewed.'),
         ('2026-08-07', 'Primary care follow-up', 'Assessment', 'Persistent mood symptoms need diagnostic assessment. A depressive disorder is not confirmed in this note.')]),
    story('copd-specialist', 'disconnected', 'Pulmonary diagnosis missing from primary care records', 'copd', 'CG',
        'The specialist documents established COPD, but the primary care extract retains a nonspecific cough label.',
        'Cough in primary care; the pulmonary assessment remains in a separate record.',
        'A primary-care-only dataset can miss the signed specialist diagnosis and its clinical context.',
        'Reconcile the current specialist assessment, encounter eligibility and capture status. A cough or inhaler prescription alone does not confirm COPD.',
        [('2026-07-23', 'Pulmonology follow-up', 'Assessment', 'Established COPD reviewed. Current symptoms and maintenance treatment assessed.'),
         ('2026-08-20', 'Primary care extract', 'Recorded diagnoses', 'Cough recorded; the pulmonary diagnosis is not present in this extract.')], strength='Strong', delta=.15),
    story('depression-handoff', 'disconnected', 'Behavioral health diagnosis missing after care handoff', 'depress', 'CG',
        'Behavioral health documents recurrent moderate depression; the receiving primary care record contains sleep disturbance only.',
        'Sleep disturbance in primary care; behavioral health assessment stored separately.',
        'A care-setting boundary can hide the diagnosis, current episode and severity from the receiving dataset.',
        'Confirm the current episode and remission status, then reconcile the signed assessment and source eligibility. Check whether another encounter already captured the condition.',
        [('2026-07-30', 'Behavioral health assessment', 'Diagnosis and plan', 'Recurrent major depressive disorder, current episode moderate. Ongoing management discussed.'),
         ('2026-08-25', 'Primary care handoff', 'Recorded diagnoses', 'Sleep disturbance recorded. Behavioral health diagnosis has not been reconciled in this extract.')], strength='Strong', delta=.08),
    story('heart-specificity', 'specificity', 'Heart failure type omitted from the coded record', 'heart failure', 'SP',
        'Cardiology documents chronic systolic heart failure; the extract retains unspecified heart failure.',
        'Heart failure, unspecified.',
        'Disease detection alone does not preserve the clinician-documented type and chronicity needed for an accurate code.',
        'Confirm the current signed assessment and reconcile conflicting records. Greater code detail does not necessarily create an additional HCC or RAF increase.',
        [('2026-08-10', 'Cardiology follow-up', 'Assessment', 'Chronic systolic heart failure, clinically stable. Current type and chronicity reviewed.'),
         ('2026-08-10', 'Encounter diagnosis extract', 'Recorded diagnoses', 'Heart failure, unspecified.')], strength='Strong'),
    story('depression-specificity', 'specificity', 'Depression episode detail missing from the code', 'depress', 'SP',
        'Behavioral health specifies a recurrent moderate episode, but the code does not carry episode or severity detail.',
        'Depression, unspecified.',
        'A generic depression feature can hide episode, severity and remission details documented by the clinician.',
        'Confirm current episode, severity and remission status in the signed assessment. Verify model mapping before estimating any score change.',
        [('2026-08-17', 'Behavioral health follow-up', 'Assessment', 'Recurrent major depressive disorder, current episode moderate, without psychotic features.'),
         ('2026-08-17', 'Encounter diagnosis extract', 'Recorded diagnoses', 'Depression, unspecified; episode detail is not represented.')], strength='Strong', delta=.04),
    story('kidney-recapture', 'recapture', 'Stable kidney disease omitted from current-year capture', 'kidney', 'RC',
        'Prior-year CKD is reassessed as stage 3b this year, but the current encounter extract omits it.',
        'CKD in the prior year; medication follow-up only in the current encounter.',
        'Stable chronic disease may not generate a new diagnosis code even when a clinician reassesses it.',
        'Verify the current-year assessment, current stage, eligible source and existing capture. A prior-year code alone is insufficient.',
        [('2025-11-20', 'Prior-year nephrology assessment', 'Assessment', 'Chronic kidney disease stage 3b, stable.'),
         ('2026-08-24', 'Nephrology follow-up', 'Current assessment', 'CKD stage 3b reassessed and remains stable; management reviewed.'),
         ('2026-08-24', 'Current-year diagnosis extract', 'Recorded diagnoses', 'Medication follow-up recorded; CKD is absent from this extract.')], strength='Strong', delta=.11),
    story('heart-recapture', 'recapture', 'Chronic heart failure missing after a stable year', 'heart failure', 'RC',
        'Heart failure was captured last year and assessed this year, but the current code extract includes hypertension only.',
        'Prior-year heart failure; hypertension only in this year’s encounter extract.',
        'The absence of an acute episode can hide ongoing disease from a screen driven by new coded events.',
        'Verify current-year evaluation and source eligibility, then check for capture in other encounters. Do not recapture from last year’s label alone.',
        [('2025-10-16', 'Prior-year cardiology assessment', 'Assessment', 'Chronic heart failure with preserved ejection fraction.'),
         ('2026-08-12', 'Cardiology follow-up', 'Current assessment', 'Chronic heart failure with preserved ejection fraction reviewed; symptoms and management remain stable.'),
         ('2026-08-12', 'Current-year diagnosis extract', 'Recorded diagnoses', 'Hypertension recorded; heart failure is not included in this extract.')], strength='Strong', delta=.14),
    story('kidney-conflict', 'conflicting', 'Advanced CKD label conflicts with the current assessment', 'kidney', 'OC',
        'A stage 4 label remains in the problem list, while the current nephrology assessment documents stage 3b.',
        'CKD stage 4 carried forward from an earlier record.',
        'A code-presence screen may miss a later signed assessment that challenges the carried-forward stage.',
        'Reconcile the service dates, clinician assessments and any acute changes. Do not downgrade a supported prior diagnosis based solely on later laboratory values.',
        [('2026-07-08', 'Problem-list extract', 'Carried-forward diagnosis', 'CKD stage 4 remains on the active problem list.'),
         ('2026-08-19', 'Nephrology reassessment', 'Current assessment', 'Current assessment is CKD stage 3b. Prior stage 4 label requires reconciliation against the earlier clinical record.')], strength='Strong', delta=-.06),
    story('heart-conflict', 'conflicting', 'Acute heart failure label carried into a stable visit', 'heart failure', 'OC',
        'The extract retains acute-on-chronic heart failure from a prior admission; the current clinician describes stable chronic disease.',
        'Acute-on-chronic heart failure remains coded at the follow-up visit.',
        'A historical acute label can persist after the clinical context has changed, without a new acute episode.',
        'Check acuity for the specific service date and the original admission documentation. A stable follow-up does not invalidate a supported earlier acute episode.',
        [('2026-07-28', 'Follow-up diagnosis extract', 'Recorded diagnoses', 'Acute-on-chronic systolic heart failure carried forward from the prior hospital encounter.'),
         ('2026-08-14', 'Cardiology follow-up', 'Current assessment', 'Chronic systolic heart failure is stable today. No current acute decompensation is documented.')], strength='Strong'),
]


def fixtures(members):
    """Choose once across the full synthetic population, never per filtered view."""
    available = sorted((m for m in members if m.get('synthetic') is True), key=lambda m: m['id'])
    used = set(); findings = []; documents = []
    for rank, (variant, item) in enumerate((variant, item) for variant in range(MEMBERS_PER_STORY) for item in STORIES):
        candidates = [m for m in available if m['id'] not in used and item['match'] in m.get('condition', '').lower()]
        # Amputation belongs to the persistent-status family in some seed versions.
        if not candidates and item['match'] == 'amput':
            candidates = [m for m in available if m['id'] not in used and 'status' in m.get('condition', '').lower()]
        if not candidates:
            candidates = [m for m in available if m['id'] not in used]
        if not candidates:
            continue
        member = candidates[0]; used.add(member['id'])
        key = 'DISC-' + item['key'].upper() + (f'-{variant+1:02}' if variant else ''); ids = []
        for index, (record_date, title, section, text) in enumerate(item['records']):
            doc_id = f'{key}-DOC-{index+1}'; ids.append(doc_id)
            documents.append(dict(id=doc_id, member_id=member['id'], source_member_id=member['id'],
                title=title, date=(date.fromisoformat(record_date)-timedelta(days=variant*2)).isoformat(), available=True, source_status='authored_clinical_fixture',
                origin='authored_synthetic_fixture', pages=[dict(number=1, sections=[dict(heading=section, text=text, highlight=True)])]))
        metadata = dict(kind=item['gap'], label=next(label for kind,label,_ in GROUPS if kind == item['gap']),
            signal=item['signal'], coded_view=item['coded'], why_missed=item['why'], confirm=item['check'],
            record_count=len(ids), rank=rank, origin='authored_synthetic_fixture',
            comparison_basis='Evidence-access pattern; no benchmarked ML miss or accuracy claim', version=VERSION)
        findings.append(dict(id=key, member_id=member['id'], condition=item['condition'], clinical_concept='discovery:'+item['key'],
            business_category=item['category'], type='clinical_context_discovery', evidence=item['strength'], status='new',
            document_ids=ids, analysis_date='2026-09-15', rule_id='CONTEXT-'+item['gap'].upper(),
            rule_type='Clinical context comparison', summary=item['signal'], countercheck=item['check'],
            illustrative_exposure=item['delta'], authored_extension=True, discovery=metadata))
    return findings, documents


def matches(case, value):
    if not value or value == 'any': return True
    return bool(case.get('discovery')) and (value == 'all' or case['discovery']['kind'] == value)


def groups(cases):
    return [dict(id=kind, name=name, description=description,
                 count=sum(bool(c.get('discovery')) and c['discovery']['kind']==kind for c in cases))
            for kind,name,description in GROUPS]
