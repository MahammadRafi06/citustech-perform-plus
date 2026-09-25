# EDS terminology review

Reviewed report names, tiles, chart titles, categories, legends, filter options, table columns and encounter details across all 20 EDS reports.

## Report names

| Previous | Updated |
| --- | --- |
| Submission Acceptance | Encounter Submission Status |
| Submission Timeliness | Encounter Submission Timeliness |
| CMS Rejection Analysis | Encounter Submission Issues |
| Duplicate & Adjustment Integrity | Duplicate & Adjustment Issues |
| Source Completeness | Encounter Submission Completeness |
| CMS Report Aging | EDS Response Status |
| Diagnosis Eligibility | Diagnosis Eligibility |
| Risk Score Reconciliation | Risk Score Reconciliation |
| Unlinked CRR Exposure | Unlinked Chart Review Impact |
| Service & Filter Eligibility | Risk Adjustment Service Eligibility |
| Documentation & Audit Exposure | Clinical Documentation & Audit Risk |
| Chronic Condition Recapture | Chronic Condition Recapture |
| CRR Lifecycle Integrity | Chart Review Record Validation |
| HCC Prevalence & Coding Drift | HCC Prevalence Trends |
| Default Provider Data | Default Data Usage |
| Beneficiary Identity | Member Identity Validation |
| Provider Eligibility | Provider Data & Eligibility |
| Capitated Encounter Completeness | Capitated Encounter Data Quality |
| X12 File Conformance | 837 File Validation |
| Special-Service Compliance | DME, Ambulance & Post-Acute Data |

## Diagnosis Eligibility Gaps

The chart uses: Encounter Not Yet Accepted; MAO-004 Pending; Service Eligibility Issue; Insufficient Clinical Evidence; No Matching HCC; Excluded by RA Rules. Part D uses No Matching RxHCC.

## Consistency corrections

- RA Yield is now Diagnosis Eligibility Rate. EDPS acceptance and RA diagnosis eligibility have separate labels.
- Default Data Usage covers all default-data reasons; its counts are no longer labeled as NPI-only issues.
- Encounter edits and default-data codes have readable descriptions in charts. Original codes remain in encounter details.
- Member identity, provider eligibility, capitation, clinical documentation and file validation use the same descriptions in charts and tables.
- HCC/RxHCC titles follow the selected model. Risk-score and financial labels identify what each value measures.
- Removed opaque terms such as leakage, conformance, invalid states and lineage from report labels.

## Processing-stage terminology pass

- **EDS (Encounter Data System):** submissions, responses and end-to-end processing history.
- **EDFES (Encounter Data Front End System):** front-end validation, including the 999 and 277CA acknowledgements. The acronym is EDFES, not EDFS.
- **EDPS (Encounter Data Processing System):** encounter acceptance and the MAO-002 processing result.
- **RA (Risk Adjustment):** diagnosis eligibility and the final MAO-004 result.
- MAO-002 and MAO-004 remain explicit in acceptance and diagnosis eligibility tiles, charts, table columns and encounter details. EDS, EDFES, EDPS and RA identify the corresponding system or eligibility stage.
- Official CMS-HCC model names, CMS policy attribution, original response codes and the dataset provenance are retained.
- These are presentation changes only. The stored response values and report calculations are unchanged.

## Verification

- All 20 report views rendered with populated charts and records; no clipped headings or horizontal page overflow observed.
- Category drilldown verified: No Matching HCC selects 45 unmapped diagnosis records.
- Part D eligibility gaps and RxHCC prevalence titles verified in the browser.
- Encounter detail panel retains source codes, processing history and clinical documentation status.
- Values, denominators, source records and chart memberships matched before/after across all 20 reports in both Part C and Part D.
- All 11 existing EDS tests and TypeScript checks passed.

## Terminology references

- [Encounter and Risk Adjustment program job aids](https://csscoperations.com/cssc/did/xmro2osprc): EDFES, EDPS, acknowledgement reports and MAO-004 terminology.

- [CMS Encounter Data Submission and Processing Guide v5.2](https://www.csscoperations.com/internet/csscw3_files.nsf/F2/ED_Submission_Processing_Guide_20221130_v5.2.0.pdf/%24FILE/ED_Submission_Processing_Guide_20221130_v5.2.0.pdf): default-data reasons and encounter edit descriptions.
- [MAO-004 job aid](https://www.csscoperations.com/internet/csscw3.nsf/DIDC/HY25KJ8AX9~Job%20Aids~Encounter%20and%20Risk%20Adjustment%20Program): diagnosis eligibility terminology.

The reporting dataset, calculations, source provenance and clinical review gates are unchanged. These checks verify the application presentation and existing fixtures, not live CMS processing.
