# Clinical-context discovery in Conditions list

The default Conditions list focuses on 120 authored clinical-context cases in six discovery patterns (20 per pattern, from 24 clinical stories). These show where a code-only or single-record screen can lose information. They are not observations of a measured ML failure or claims of comparative model accuracy.

| Pattern | Populated clinical questions |
| --- | --- |
| Invisible gaps | COPD, depression, stable heart failure and clinician-assessed CKD absent from encounter diagnosis extracts |
| Timeline gaps | Persistent kidney-function decline, repeated high BMI, recurring fluid-retention symptoms and persistent mood symptoms needing clinical assessment |
| Disconnected evidence | Hospital heart failure, specialist diabetic kidney disease, pulmonary COPD and behavioral health depression across care settings |
| Missing specificity | Documented diabetic neuropathy, CKD stage, heart failure type and depression episode detail omitted from codes |
| Recapture gaps | Amputation status, stable COPD, CKD and heart failure assessed this year but absent from current-year codes |
| Conflicting evidence | Depression remission, COPD rule-out, conflicting CKD stage and a carried-forward acute heart failure label |

Each row includes a named synthetic member, discovery pattern, clinical signal, reason it may be overlooked, evidence strength and planning score change. Opening a row compares the coded view with the clinical context, explains what needs confirmation, and links dated source excerpts with page, section and content hash. Pattern tiles, search, existing cohort filters, pagination, selection and export remain available. The All signals option includes the existing registry.

## Data and safety boundaries

`apps/api/app/suspect_discovery.py` contains the fixture definitions. Each clinical story is represented across five distinct synthetic members, with separate source identities and shifted encounter dates. Member assignment is deterministic across the full synthetic population and is independent of the selected cohort. Non-synthetic members never receive these cases. New source identities use the `DISC-` prefix and explicitly retain `authored_synthetic_fixture` origin. They do not overwrite retained notes, source excerpts, diagnoses, native model output or clinical findings. Source origin is available under Rule and source references and in exports with excerpts enabled.

These are confirmation questions. Kidney measurements and BMI do not establish a diagnosis, code, stage or payment eligibility; those cases therefore have no score-change estimate. Coding checks retain negative or unestimated planning impacts and have no positive confirmation probability. Recapture requires current documentation, cross-record findings require reconciliation and duplicate checks, and later changes do not automatically invalidate a supported earlier diagnosis. Existing permissions, clinical gates, source-subject checks and model mapping boundaries remain in force.

Clinical guardrail references: [NIDDK CKD evaluation](https://www.niddk.nih.gov/health-information/professionals/clinical-tools-patient-management/kidney-disease/identify-manage-patients/evaluate-ckd) and [CMS documentation principles](https://www.cms.gov/training-education/medicare-learning-networkr-mln/compliance/medicare-provider-compliance-tips/evaluation-management-services).

## Verification

`apps/api/tests/test_suspect_discovery.py` checks counts, synthetic-only assignment, stable identity under filters, source provenance, export selection, uncertainty, historical-date handling, evidence access and unchanged source state. Existing analytics and landing tests cover shared calculations and cohort behavior.
