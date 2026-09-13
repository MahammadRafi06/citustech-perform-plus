# BRD v2 model-asset feasibility audit

Historical discovery checked 12 September 2026. Implementation subsequently proceeded after user approval; current results are in [V2 verification](../V2_VERIFICATION.md). At the original planning checkpoint: no calculator was executed, no reference scores were generated, no dependencies were installed, and no application/runtime state was changed. The applicable BRD sections A, B1–B4, C, D, I and J were read. The remaining sections preserve the original asset inspection findings; they are not the current execution-status report.

## Official asset inventory

The following public downloads were retrieved from links on the official [2026 CMS model index](https://www.cms.gov/medicare/payment/medicare-advantage-rates-statistics/risk-adjustment/2026-model-software-icd-10-mappings), [2027 CMS model index](https://www.cms.gov/medicare/payment/medicare-advantage-rates-statistics/risk-adjustment/2027-model-software-icd-10-mappings), [2025 CMS model index](https://www.cms.gov/medicare/payment/medicare-advantage-rates-statistics/risk-adjustment/2025-model-software/icd-10-mappings), and [Marketplace guidance index](https://www.cms.gov/marketplace/resources/regulations-guidance). Originals and extracted research copies are in ignored `.local/research/`; they are not installed product assets.

| Configuration to plan | Verified executable assets | Execution/validation implication |
|---|---|---|
| MA ordinary non-PACE/non-ESRD PY2026 | `CMS_HCC_v28_2026_T_package_v3` in the midyear/final Python archive | Direct official Python wrapper is feasible. Separate annual adjustment profile and source/segment validation are still required. |
| MA ordinary PY2027 | `CMS_HCC_v28_2027_T1_initial_package_v1` | Separate initial-release configuration; do not relabel this software midyear/final. |
| Historical fixed-input V24/V28 comparison | PY2025 SAS `V2425.86.P1` and `V2825.115.T1`; supplied macros, text diagnosis mappings, coefficient CSVs and SAS transport libraries | Public assets exist. An equivalent V24 adapter needs reference validation; a licensed SAS reference runner has not been established. Current Python bundles do not contain ordinary CMS-HCC V24. ESRD V24 is a different model. |
| Part D PY2027 MA-PD | `RxHCC_v8_2027_Y1_package_v1` | Package description identifies MA-PD coefficients; retain a distinct normalization profile. |
| Part D PY2027 PDP | `RxHCC_v8_2027_Y2_package_v1` | Package description identifies PDP coefficients; do not substitute Y1. The T2 combined-population package is a separate vintage/profile. |
| ACA BY2026 V08 | `HHS_HCC_software_package_V0826.141.E1_v2`, July 31 release | Contains adult/child/infant models, all five metals, diagnosis/hierarchy/group/interaction tables, RXC and ACF mappings/factors, CSR table and intermediate outputs. Date coverage limits below must be declared. |

Archive fingerprints:

| Download | SHA-256 |
|---|---|
| [2026 midyear/final Python ZIP](https://www.cms.gov/files/zip/2026-midyear-final-model-software-python.zip) | `b47ed086d8a1cae0bf860526168ecffee07cb8d46766825a72fc21d57dbd47be` |
| [2027 initial Python ZIP](https://www.cms.gov/files/zip/2027-initial-model-software-python.zip) | `1a29ec3495884b706ac7b3324fdbe889dd75f24cee0456ef71bfbdf765029d2e` |
| [2025 midyear/final SAS ZIP](https://www.cms.gov/files/zip/2025-midyear/final-model-software.zip) | `94c369dc8a0cb06bdd9d6363994ab668f9b8821e6e6dedc84d209729b1f64c05` |
| [ACA BY2026 Python ZIP](https://www.cms.gov/media/677081) | `f25356930764c2bac584b4467e69da0f86ac0adbaed92d6bf93f9bc5681d6104` |

## Runtime and package contracts

The inspected runbooks recommend Python 3.12 or newer. The PY2026 V28 package pins `pandas==2.3.3` and `pyyaml==6.0.3`; PY2027 V28/RxHCC and ACA pin `pandas==2.3.3` and `numpy==2.4.2`. Preserve the original package; package each configured runner with an explicit dependency lock and runtime identity. The scripts use shared module names and relative file paths, so isolate package imports and per-run input/output directories. Do not import all vintages into one mutable module namespace or share writable CSV locations across requests.

| Family | Official input contract | Official output and caller responsibility |
|---|---|---|
| MA V28 | `beneficiaries.csv`: ID, DOB, SEX, OREC, LTIMCAID, NEMCAID; `diagnoses.csv`: ID, ICD10. `transform_bene_hcc(run_spec, filepaths)` writes its output CSV. | Nine scores: COMMUNITY_NA/PBA/FBA/ND/PBD/FBD, INSTITUTIONAL, NEW_ENROLLEE and SNP_NEW_ENROLLEE, with `SCORE_` prefix. Demographic, CC, retained HCC, count and interaction flags are retained. Select using actual enrollment/dual/institution/C-SNP status. |
| RxHCC | `beneficiaries.csv`: ID, SEX, OREC, ESRD, DOB; diagnoses: ID, ICD10. Same transform entry-point pattern. | Eight scores: CE_NonLowAged, CE_NonLowNonAged, CE_LowAged, CE_LowNonAged, CE_LTI, NE_NonLowCommunity, NE_LowCommunity, NE_LTI. Caller selects CE/NE, LIS, institutional and plan profile. Drug fills are not an input to this Part D diagnosis-based calculator. |
| HHS | `PERSON.csv`: ID, SEX, DOB, AGE_LAST, METAL, CSR_INDICATOR, ENROLDURATION; diagnoses: ID, ICD10, DIAGNOSIS_SERVICE_DATE; NDC: ID, NDC; HCPCS: ID, HCPCS. `transform_hhs_hcc_scores(run_spec, filepaths)` writes CSV. | Adult, child and infant metal scores, selected-metal score and CSR-adjusted counterparts. Enable intermediate switches for demographic, CC/HCC, RXC, groups/interactions, enrollment duration, infant and ACF factors. Package already computes CSR adjustments: do not apply CSR twice. |

MA/RxHCC use February 1 of payment year for their configured age reference. HHS uses age at last enrollment for model membership and age at diagnosis for applicable code edits. All inspected Python relative-score outputs round to three decimals. Preserve canonical output precision; separately reconcile unrounded ledger contributions with a declared tolerance and explicit rounding residual.

Package diagnosis CSVs are narrower than product eligibility requirements. A Perform+ input snapshot must retain encounter/service dates, source/document identity, diagnosis release, record lineage/replacement/void, monthly eligibility and clinical decision provenance before converting eligible inputs into the official contract. The official MA/RxHCC transforms cannot validate source dates or encounter modality from the two-column diagnosis file.

## Date and source-policy boundaries

CMS's [April 29, 2026 submission memo](https://www.cms.gov/files/document/deadline-submission-risk-adjustment-data-use-risk-score-calculation-runds-payment-years-2026-2027.pdf) establishes these service windows and submission deadlines (8 pm ET):

| Run | Dates of service | Deadline |
|---|---|---|
| 2027 Initial | July 1, 2025–June 30, 2026 | September 4, 2026 |
| 2026 Final | January 1–December 31, 2025 | February 1, 2027 |
| 2027 Mid-Year | January 1–December 31, 2026 | March 5, 2027 |
| 2027 Final | January 1–December 31, 2026 | January 31, 2028 |

Preserve original August/September 2026 showcase sources. They are outside the official 2027 Initial window. An illustration of their effect using available initial-release software must identify itself as a forecast for a later run, retain the software release independently, and disclose assumptions; it is not an official initial or validated midyear/final result.

The [2027 final announcement](https://www.cms.gov/files/document/2027-announcement.pdf) retains the 2024 Part C model and finalizes audio-only/unlinked-chart-review exclusions with an MA-organization-switch exception. A source policy needs eligible procedure/service lines and modifiers, source type, chart-review linkage, submission date, and parent-organization enrollment at service and submission. A signed document alone cannot supply these fields. Pin final rules, code lists and exception tests; do not use the superseded proposed Part C model.

The [BY2026 HHS instructions](https://www.cms.gov/media/677071) describe Python replacing SAS and make the DIY calculation distinct from operational EDGE processing and state transfers. They delegate service/bill-type filtering to the caller. They also defer October–December 2026 ICD validity to a later update. The downloaded crosswalk contains 12,667 rows with `valid_ICD10_2026=TRUE` and every `valid_ICD10_2027` blank. Plan an initially validated January–September 2026 scope and an explicit update gate for later dates; do not treat the blank column as valid or fabricate defaults.

One observed upstream metadata inconsistency needs tracking: HHS `config.py` labels its output `V0825.141.E1`, while its enclosing package, description and `model_version_config.py` identify BY2026. Preserve the original, pin identity from the verified manifest/year, record the filename alias, and verify before activation. This inspection does not establish that calculation results are wrong.

## Proposed shared adapter and validation plan

1. Create immutable `ModelConfiguration`, `InputSnapshot`, `CalculationRun` and `Component` records. Registry identity includes archive/component hashes, release/run scope, program/year, segment policy, input/source validator, adjustment profile, output precision and validation evidence. Available assets start unvalidated; activation requires declared-scope approval.
2. Use one service contract: configuration ID + immutable snapshot ID + score-stage basis + optional scenario changes → completed/failed run, eligible selected segment, canonical raw score, separately identified adjusted score, factor ledger, retained/suppressed categories, exclusions, official output artifact hash and source provenance. Failure never returns an unrelated earlier score.
3. Keep the official Python scorer unchanged behind isolated runners where possible. Derive the explanatory ledger from official output flags and the same pinned coefficient tables; reconcile the sum to the selected output. Historical V24 requires a validated equivalent or entitled SAS execution. Do not reconstruct proprietary model coefficients.
4. Generate reference inputs and outputs in a separate harness using untouched official software, outside the production wrapper. Freeze both with package/runtime hashes. Add independently reviewed cases derived from official algorithm/tables and, where available, cross-check Medicare Python against official SAS. Neither checked Python nor historical SAS archives supplied a populated sample-input/expected-output test suite: empty CSV templates are not reference cases. A reference generated by the wrapper under test is insufficient.
5. Require reference coverage for every declared segment/profile: MA aged/disabled and dual variants, institutional and supported NE; each RxHCC plan profile and declared LIS/NE/institution route; HHS adult/child/infant × supported metal and applicable CSR/RXC/ACF/enrollment/infant interactions. Check mapping edits, hierarchies, duplicate neutrality, suppressed/zero/negative effects, new-enrollee eligibility, dates, source exclusions and rounded totals.
6. Re-run full member inputs for baseline, QA-supported, submitted, accepted, eligible and potential stages. Clinical review/QA changes the appropriate input basis; a model output does not bypass review. Re-run joint candidate sets for combined deltas and campaigns; do not sum overlapping marginal effects. Reuse those same saved results in Member 360, scenarios, campaigns and analytics.
7. Validate fixed-input historical comparisons with a common valid diagnosis/input period. Separate raw comparison from historically applicable normalization/coding/blending. Obtain and independently verify exact annual adjustment factors/order and applicable score-selection policy before exposing payment-adjusted totals. Keep population means family-specific and enrollment-period weighted.

## Dependencies still open after research

- Official software availability is established; Perform+ calculation correctness, wrapper behavior, performance and independent reference matches remain untested.
- Model steward/RA reviewer must approve the segment, annual transformation and final source-policy matrix; data lead must supply complete synthetic scoring inputs/monthly statuses without altering existing clinical evidence.
- Historical V24 reference execution needs an entitled SAS environment or independently established/reviewed expected outputs sufficient for its declared equivalent-adapter scope. No SAS runtime or license was established here.
- ACA later-2026 dates require the applicable updated validity/mapping assets. ACA transfers also need plan/market assumptions beyond an enrollee score. A complete BY2027 DIY package was not located in this bounded index review.
- No standalone license/notice file was found in inspected software archives. Record official origin and review accompanying terms/third-party code-table redistribution obligations, including CPT-related materials; do not invent an SPDX license. This is distinct from the explicit license requirement for proprietary Medicaid/commercial models.
- Medicaid external-score ingestion is a required product workflow; a Florida payment-equivalent calculator remains dependent on its controlling program/rating-period methodology and rights. Official Medicare/HHS assets do not resolve that dependency.

These findings support planning an executable multi-program service. They do not close any implementation or validation TODO.
