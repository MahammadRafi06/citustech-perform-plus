# Perform+ Demo Capability Assessment

**Review date:** 12 September 2026  
**Scope:** Demo functionality and common user journeys. Production work and uncommon exceptions are deferred.  
**Application:** [Local demo](http://localhost:3002/)

- [Executive assessment](#executive-assessment)
- [Scope and evidence](#scope-and-evidence)
- [Program correctness without overbuilding](#program-correctness-without-overbuilding)
- [Workflow and persona assessment](#workflow-and-persona-assessment)
- [Representative journeys](#representative-journeys)
- [Competitive comparison](#competitive-comparison)
- [AI assessment and practical improvements](#ai-assessment-and-practical-improvements)
- [Credibility of AI impact metrics](#credibility-of-ai-impact-metrics)
- [Prioritized demo backlog](#prioritized-demo-backlog)
- [Sequenced roadmap and validation](#sequenced-roadmap-and-validation)
- [Open decisions](#open-decisions)
- [Evidence and source register](#evidence-and-source-register)

## Executive assessment

**Perform Plus already supports a credible guided demonstration of risk-adjustment work. The next investment should connect and strengthen the everyday demo stories, rather than build production infrastructure or cover every uncommon exception.**

The strongest experience is evidence-oriented review: a user can inspect a synthetic member, distinguish a documented gap from a historical assessment need or indirect signal, record a decision, involve a provider, and perform independent QA. The application has a real local backend and saved state. Its analysis, source records and external responses are deliberately prepared or simulated. Those are appropriate demo choices when the boundary is clear.

The main functional weakness is the end of the story. A supported review does not create a connected simulated submission, QA completion is not consistently reflected in campaign progress, and the score scenario mostly explains why numbers are unavailable. Improving these ordinary journeys will add more demonstration value than adding real CMS connectivity, enterprise authentication, complex agents or exhaustive failure handling.

This report follows the user's clarification: **demo functionality first; production requirements and less likely cases can wait.** It retains program-correctness, competitor and AI analysis as design guidance. Missing production capabilities are not treated as demo defects. No application changes were made.

### Overall judgment

| Review question | Demo focused answer |
|---|---|
| Can a plan manage the full lifecycle in this build? | It can explore a connected illustration of much of the lifecycle. It cannot operate real risk adjustment end to end, and that is not the current acceptance goal. |
| What works best? | Source review, distinct case types, neutral queries, provider response versus documentation separation, independent QA, usable-record checks and clear synthetic AI metrics. |
| What should improve next? | One continuous review-to-QA-to-simulated-submission story; meaningful prepared score comparisons; reachable work assignments; correct progress; current summaries and decision history. |
| Are all business lines demonstrated? | No. The working story is non-PACE MA Part C, service 2026/payment 2027. Part D, ACA and Florida Medicaid should be explicit future or unconfigured scope unless separate prepared stories are added. |
| Is current AI useful? | Yes as an explanation of the intended experience. It uses fixtures, templates and rules, not live inference. Its value is demonstrability, not measured clinical accuracy or savings. |
| Can it be shown to executives? | Yes as a guided synthetic demonstration, with honest scope. Strengthen the common connected journey before describing it as a comprehensive risk-adjustment product demo. |
| What can wait? | Real data/receiver integrations, enterprise hardening, concurrency, large-scale recovery, rare correction combinations and comprehensive regulatory execution. |

### Strongest capabilities to preserve

The source viewer retains member context and distinguishes current, historical and synthetic evidence. The six cases cover documented gaps, historical conditions, indirect signals, unsupported existing coding, combined-condition scenarios and unsuitable sources. Provider responses do not automatically approve coding. A different reviewer must perform QA. Chart receipt is distinct from document usability. Rejected receiver attempts are retained. Scores are withheld instead of invented. AI Impact explicitly describes an authored synthetic comparison and its arithmetic is correct. The frontend is backed by local API/database behavior rather than solely browser state. [L01-L08]

### Ten most valuable demo improvements

| Order | Improvement | Why it improves the normal demonstration |
|---|---|---|
| 1 | D01 Connect approved review to simulated submission | The audience can follow one member all the way through the story. |
| 2 | D02 Add a meaningful prepared scoring comparison | Shows the purpose of risk adjustment, with clearly sourced synthetic outputs. |
| 3 | D03 Separate fully reviewable cases from browsing records | Prevents empty charts and unsupported actions during ordinary exploration. |
| 4 | D04 Keep assignments within reachable demo work | A selected owner can actually open the assigned member. |
| 5 | D05 Make campaign completion agree with QA | Dashboard progress matches what the presenter just did. |
| 6 | D06 Show a real before and after recommendation story | New evidence has a visible consequence, without requiring live AI. |
| 7 | D07 Keep the prepared assistant current and precisely sourced | Summaries and cited evidence agree after the scenario changes. |
| 8 | D08 Make response to usable documentation a guided handoff | Preserves the clinically important distinction while reducing presenter navigation. |
| 9 | D09 Package one complete synthetic audit trail | Demonstrates traceability using the same reviewed/submitted member. |
| 10 | D10 Make program, simulation and scenario date obvious | Avoids accidentally implying live AI, a real visit or production receiver acceptance. |

D11 is a small provider-scope fix if account administration is included in the demo. D12 is optional usability polish. Detailed tickets and acceptance criteria appear later. The priorities are based on demo value; they are not a production-readiness score.

## Scope and evidence

### Reviewed build

The application was reviewed at **http://localhost:3002**, with source at **/home/mahammad/Desktop/ct**, on **12 September 2026**. Source revision: **fe99150e8a66c849bdfb877f2f90d0b8c06eb7c5**. The working tree was clean at inspection and recheck.

Inspected materials include the original specification, README, implementation and verification notes, API, frontend workspaces, data types, document viewer, synthetic records and test suite. Fresh browser inspection covered sign-in, Overview, Member 360 and its source viewer, Risk Scenarios, AI Impact and the prepared assistant. Other workflows were evaluated through source and isolated API tests. Earlier multi-role browser, viewport, container and restart checks in repository notes were not all repeated. [L01-L10]

The local repository spells its name CitusTech. The official public vendor spells its name CitiusTech and markets a broader Perform+ suite. The relationship of this local build to that commercial suite is unverified. This assessment evaluates the supplied local application; vendor marketing does not establish its implementation. [V01 V02]

### What is real and what is prepared

| Area | Evidence and classification |
|---|---|
| Selected program | Fixed synthetic non-PACE MA Part C; service year 2026/payment year 2027; historical 2025 context. Other programs are not configured. |
| Dataset | 10,000 synthetic members, 1,500 opportunities, 30 providers, four campaigns, 30 chart requests, 12 submission records and 11 initial documents. Six showcase cases have detailed context. [L04] |
| Local backend | Working and verified within demo scope: Next.js, FastAPI and PostgreSQL; accounts, sessions, events and workflow state persist. Operational data uses one locked state row. |
| Roles | Executive, analyst, coder, QA, retrieval, provider, submission, administrator and superuser. Provider scope is practice-based; coder/QA/retrieval scope is the first 30 members. |
| Analysis and assistant | Prototype or simulation: authored findings; keyword/template responses and deterministic cohort filters. No live predictive model, NLP, LLM, RAG or agent. |
| Retrieval and provider activity | Partially implemented local workflows with simulated external delivery and prepared encounter return. Local contact notes do not send messages. |
| Intake | Partially implemented: prepared sample checks and publication work; arbitrary TXT/PDF selection is local preview, not general server ingestion or OCR. |
| Scoring | Missing numeric demonstration and missing official engine. The unavailable state is working and verified; it is honest but offers limited demonstration value. |
| Submission and reconciliation | Prototype or simulation: local records and manually selected outcomes; no real receiver or downstream report reconciliation. Appropriate for this phase if the story is connected. |
| Audit | Partially implemented: selected-member ZIP with sources/current decisions/events. No managed audit lifecycle. |
| Production services | Not applicable to current demo acceptance. Their implementation and live behavior are unverified. |

**Status meanings:** Working and verified applies only to the observed/tested behavior. Partially implemented means the demo has an incomplete handoff or state. Prototype or simulation is an intentional prepared experience. Missing describes an absent capability, not automatically a release blocker. Not applicable means outside the selected demo. Unable to verify means required evidence was unavailable.

### Test evidence and its relevance

The existing **21 API acceptance tests passed**, with four deprecation warnings. Eight additional checks reproduced the behavior below using a disposable database schema. These were tests of the current source checkout, not proof of the source revision embedded in the running container. No running-demo business records or application source were changed. [L10]

| Reproduction | Result | Demo implication |
|---|---|---|
| R01 Supported review with no documents on member 14 | Accepted; evidence guard only special-cases members 2, 3 and 6. | Bound review actions to fully prepared cases. A general clinical eligibility engine can wait. D03. |
| R02 Save provider2 with unchanged role | Scope changes from PR-002 to PR-001. | Small fix if administration is shown; otherwise omit account editing from the presenter route. D11. |
| R03 Review saved while QA awaits | Campaign task becomes completed. | Common visible inconsistency; fix for the main story. D05. |
| R04 Retry rejected original addition | New attempt becomes a deletion; no coding/QA dependency. | Connect the intended standard correction story now; complex retry types can wait. D01. |
| R05 Change sample source date to 2030 | Current-period validation still passes. | Arbitrary bad-date handling can wait; make prepared future scenarios explicit. D10. |
| R06 Assign member 31 to coder | Assignment succeeds but coder gets 404. | Restrict selectable assignments to reachable demo cases. D04. |
| R07 Refresh analysis | Version increases without new recommendation history. | Relabel replay or append a prepared result version for the story. D06. |
| R08 Submit two reviews with stale expected version | Both accepted; later review overwrites current state. | Concurrent editing is a later concern for a single-presenter demo. |

These findings do not mean the demo needs production controls now. The immediate objective is to keep normal navigation and the promised presenter journey internally consistent.

## Program correctness without overbuilding

The demo should demonstrate **one program accurately** before offering several superficial program selectors. Keep MA 2026/2027 as the primary story. If executives need breadth, add a brief program-capability view and separately labeled prepared examples. Changing a label must never imply that the underlying model or submission workflow changes.

### Minimum program story for the demo

| Program and period | Correct concept to demonstrate | Current build and recommendation |
|---|---|---|
| Non-PACE MA Part C, PY2027 | 2024 CMS-HCC retained; distinguish service period, payment run, eligible diagnosis and full-member score. [M02 M05] | Existing labels are appropriate. Add a prepared full-member example and keep missing real-model integration explicit. |
| Part D, if shown | RxHCC is distinct from Part C; pharmacy clues do not establish a diagnosis, and PDE cost reconciliation is a separate workflow. [M08 M09] | No Part D implementation. Describe as future scope or add a separate prepared explainer, not a renamed MA screen. |
| ACA individual/small group, BY2026 | Concurrent HHS V08; enrollment/claims matter beyond HCC-positive records; member score is not the market transfer. [A01 A04] | No ACA implementation. A correct prepared example is optional, not necessary for the first MA demo. |
| Florida Medicaid, rating period/contract dependent | State contract, population, certified methodology and rating period determine the calculation. [FLa FLd] | Exact contract/method is unknown. Show unconfigured until a scenario is defined; do not invent a universal Florida RAF. |

### Authoritative baseline for future configuration

This matrix is reference guidance for product design, **not a list of integrations required before the demo**. Dates distinguish final/current rules from future effective periods. All sources were checked as of 12 September 2026.

| Applicability and period | Material requirement | Evidence in build and later validation |
|---|---|---|
| Non-PACE MA non-ESRD, PY2026, effective 1 January 2026 | 100% 2024 CMS-HCC V28; applicable mappings, normalization and adjustment. [M01] | No official engine. Later compare exact pack outputs; not a demo blocker. |
| Non-PACE MA, PY2027, effective 1 January 2027, final | Retains the 2024 CMS-HCC model; proposed replacement was not finalized. ESRD routes separately. [M02] | Fixed MA story; no calculation. Prepared values must identify their basis. |
| MA segments, PY2026/2027 | Community aged/disabled/dual, institutional, new enrollee and ESRD handling differ; full-set hierarchies/interactions apply. [M03] | No segment engine. One representative segment is enough for the first demonstration. |
| Medicare sources, including PY2027 filters | Qualifying interactive audio/video differs from audio-only; PY2027 processing excludes diagnoses from audio-only encounters identified by modifiers 93/FQ when no other line qualifies. [M04 M02] | Generic source metadata only. Use accurately described fixtures; exhaustive service-code tests later. |
| Non-PACE Parts C/D unlinked chart reviews, PY2027 | Exclusion with specified different-prior-MA-parent exception; prior FFS alone does not qualify. PACE exempt for 2027. [M02] | No rule engine. Explain source eligibility without claiming it is fully implemented. |
| Medicare collection/payment runs | PY2027 initial cutoff was 4 September 2026 for July 2025-June 2026 service dates. Midyear/final use CY2026, due 5 March 2027/31 January 2028, 8 p.m. ET. [M05] | Fixed labels; no calendar. Do not imply the current demo date represents initial-run submission readiness. |
| Medicare correction/reconciliation, continuing | MAO-002 acceptance/edits, MAO-004 diagnosis eligibility and downstream score/payment/recovery are distinct. [M06] | Simulated states only. Show accepted versus eligible versus reconciled conceptually. |
| MA RADV PY2024, current 2026 audit | CMS's August 2026 methods acknowledge vacatur/appeal and undecided extrapolated versus sampled collection; instructions include a scoped sampling-frame correction hold. [M07] | Generic audit ZIP. No need to implement litigation-dependent audit mechanics for the demo. |
| Part D PY2026, effective 1 January 2026 | Separate RxHCC model and MA-PD/PDP normalization; calibration 2022 diagnoses/2023 costs. [M01] | Not configured; optional future story. |
| Part D PY2027, final effective 1 January 2027 | Updated RxHCC, calibration 2023 diagnoses/2024 costs and separate MA-PD/PDP continuing-enrollee segments. [M08] | Not configured; avoid using MA Part C values. |
| Part D PDE and payment integrity | Prescription transaction/cost reconciliation and Part D IPM are distinct from diagnosis-derived RxHCC and Part C RADV. [M09] | No PDE workflows; not applicable unless explicitly included. |
| Non-grandfathered ACA individual/small group on/off Exchange, BY2026 | HHS V08 is concurrent, age/metal dependent; July 2026 DIY implementation uses Python. [A01] | Missing ACA pack; future scope. |
| ACA BY2026 model/input treatment | Applicable enrollment, prescription/PrEP factors and interactions; DIY is supplemental and must not prefilter EDGE claims. [A01 A02] | No ACA ingestion/transfer computation. A sample score must not be labeled a transfer payment. |
| ACA sources, March 2026 guidance | Some audio-only services are eligible; asynchronous services are not. HHS filtering differs from Medicare. [A03] | No ACA source rules; separate explanation if showcased. |
| ACA EDGE BY2026 | Required enrollment/claims/encounters; baseline deadline 30 April 2027. Final-report discrepancy response has a 15-calendar-day requirement. [A04 A05] | No EDGE integration; simulated file/report concept is sufficient if needed. |
| ACA BY2027, final published 20 May 2026/effective 20 July 2026 | Uses 2021-2023 EDGE calibration; July correction clarifies effectiveness. [A06] | Future benefit year, not a proposal; preserve distinct labels. |
| HHS-RADV, BY2024/2025 changes | IVA/SVA changes and later error-estimation changes apply to specific audit benefit years. [A02 A06 A07] | No HHS-RADV lifecycle. Do not call a generic ZIP an HHS-RADV solution. |
| Florida SMMC RY2025-26, 1 October 2025-30 September 2026 | Separate MMA/LTC/dental rate artifacts and population/rate groups. Base rates do not establish the member risk model. [FLa FLb] | No Florida configuration. Exact model applicability remains Unable to verify. |
| Florida current contract and method | July 2026 model-contract index identified, but full current/signed contract and certification not obtained. Prior October 2025 provisions cannot be assumed current. [FLc FLf] | Contract, population, rating period and method must be supplied before a Florida scenario is designed. |
| Florida methodology/reference evidence | CMS guide follows rating-period start; historical 2023 CDPS+Rx reference does not guarantee current use. [FLd FLe FLg] | Do not apply Medicare HCC or a universal CDPS model by assumption. |

**Documentation principle:** the demo should distinguish current documented diagnosis, historical condition and indirect assessment signal. FY2026 ICD-10-CM guidelines apply through 30 September 2026; FY2027 begins 1 October 2026. Outpatient uncertain diagnoses are not coded as established, while inpatient discharge rules differ. A single documentation mnemonic is not a universal source-eligibility checklist. [C01 C02]

## Workflow and persona assessment

“Partial” below means Partially implemented for a coherent demonstration. “Simulation” means Prototype or simulation. Native production implementation is not required to make a workflow demonstrable.

| Lifecycle area | Current demo support | Smallest useful next step or later boundary |
|---|---|---|
| 1 Ingestion, identity and reprocessing | Simulation: seed load and sample intake. | Show a prepared import summary with received/matched/quarantined counts; real feeds and replay later. |
| 2 Member history and program context | Partial: Member 360, documents, tasks, events; fixed MA period. | Keep the six cases richly documented and their periods consistent. |
| 3 Gaps, suspecting and suppression | Partial: useful taxonomy and registry actions; authored findings. | Make changes in evidence visibly change one prepared recommendation. General deduplication later. |
| 4 Campaigns and allocation | Partial: cohort preview, overlap and task creation. | Restrict assignments to reachable cases and align completion with intervention. |
| 5 Chart retrieval | Partial: grouped chase/contact/status, receipt separate from usable. | One clear partial/unsigned-to-usable story; real vendor integration later. |
| 6 Prospective/concurrent/retrospective | Partial: previsit/workbench/campaign labels. | Show a previsit and a retrospective path; a separate concurrent variant only if central to the audience. |
| 7 Coding, queries and corrections | Partial: source review and reasoned decision; no code abstraction. | Add prepared code/decision outputs linked to the same evidence and simulated submission. |
| 8 QA and rework | Partial: independent reviewer, pass/rework. | QA result drives progress and the next step; complex adjudication later. |
| 9 Provider portfolio and documentation | Partial: practice views, responses and prepared later encounter. | Guided response-to-source-to-new-review handoff; no real outreach needed. |
| 10 Scoring and explanations | Numeric example Missing; honest unavailable placeholder. | Add a properly sourced prepared full-member comparison; no invented coefficients. |
| 11 Submission and resubmission | Simulation: response selection and retained attempts. | Link the normal approved addition and standard correction; rare mixed outcomes later. |
| 12 Reconciliation | Missing calculation; separate labels/seeded fields. | Show one prepared record-level source-to-reported reconciliation, with synthetic basis. |
| 13 Audit | Partial: selected-member ZIP. | Include the same decision and simulated attempt chain; full audit administration later. |
| 14 Analytics | Partial: drillable displays, valid frozen comparison. | Align completion counts and show definitions; real impact measurement later. |
| 15 Administration/recovery | Partial: local auth and persistent state. | Preserve stable demo state; fix provider-save scope if admin is shown. Enterprise identity/scale/recovery later. |

### Persona usability

| Persona | Demonstrable value | Demo priority |
|---|---|---|
| Program leader/executive | Overview, attention list, cohort and synthetic comparison. | Progress must agree with QA and the story's outcome. |
| Analyst | Search, filters, cohort preview, reasons and bulk actions. | Reachable assignments and a clearly bounded reviewable cohort. |
| Actuary/model steward | Correct combined-member explanation. | Prepared factor-level score comparison rather than an empty scenario. |
| Retrieval coordinator | Chase history and sample intake feedback. | Guided transition to usable evidence. |
| Coder/clinical reviewer | Source beside case context, neutral query and reasoned disposition. | Prepared code/source binding and obvious next step. |
| QA staff | Different reviewer and pass/rework. | Visible reason, rework and completion behavior; full sampling/adjudication later. |
| Provider engagement/provider | Practice view and distinct response/documentation. | Clear response, encounter fixture and return-to-review sequence. |
| Submission specialist | Original/rejected-attempt history. | Connect records to the reviewed member; keep simulator visible. |
| Auditor | Downloadable selected-member evidence. | Complete trace for one showcased case. |
| Administrator | Local accounts and session revocation. | Show only stable administration functions; production controls are outside this demo. |

Freshly inspected screens are visually coherent: grouped navigation, readable hierarchy, clear source viewer and understandable score/AI disclosures. URL filters and return links preserve context. Campaign drafts use sessionStorage; general drafts use authenticated page-session memory, and paused review notes persist on the server. Avoid implying every unsaved draft survives refresh. [L05-L08]

Earlier notes report multi-resolution and keyboard/modal checks. This review did not repeat a complete accessibility, mobile or screen-reader audit. Those remain Unable to verify. For the demo, check the presenter's actual viewport, keyboard focus in key dialogs and that the source panel and next-action controls are readable; comprehensive accessibility testing belongs to a later adoption phase.

## Representative journeys

These cover all requested scenarios, while distinguishing common demo stories from less likely paths to defer. Completion below means a convincing, internally consistent **synthetic demonstration**, not a real payment or clinical outcome.

### J01 Historical condition without current assessment

**Trigger/inputs:** Morgan's historical COPD, current note and dates. **Owner/decision:** analyst/coder requests neutral assessment rather than automatic carry-forward. **Handoff/output:** provider response, separately loaded signed encounter, fresh review and QA. **Exception:** absent/non-support response remains a reasoned follow-up state. **Done:** new source is reviewed or justified non-support is recorded. **Current:** the distinction works for the prepared case. Strengthen the guided return to review and current summary; general source eligibility can wait. D07 D08. Evidence L02:377-431.

### J02 Current documented diagnosis missing from coded data

**Trigger/inputs:** Jordan's signed assessment and a prepared coded-data comparison. **Owner/decision:** coder confirms support and code; QA independently approves. **Handoff/output:** a linked simulated submission. **Exception:** rework returns to the coder. **Done:** the same member/decision reaches simulated acceptance and a traceable package. **Current:** review and QA exist, but the dataset difference is authored, code fields are null and the submission is disconnected. This is the highest-value story to finish. D01. Evidence L02:377-401,448-475; L04.

### J03 Laboratory or medication signal without diagnosis

**Trigger/inputs:** Avery's kidney-related indirect signals. **Owner/decision:** clinician assesses; coder does not establish a diagnosis from those signals. **Handoff/output:** neutral query and separately supplied documentation. **Exception:** no support can legitimately end without a positive code. **Done:** assessment need is dispositioned. **Current:** explanatory text and the sample support block work. Keep the distinction clear; no real predictive model is required. D03 D08. Evidence L02:382,403-431; L04.

### J04 New evidence contradicts a recommendation

**Trigger/inputs:** a prepared new conflicting source and the earlier recommendation. **Owner/decision:** reviewer compares both and chooses retain, withdraw or clarify. **Handoff/output:** revised result and QA where appropriate. **Exception:** ambiguous conflict can remain unresolved. **Done:** before/after evidence and reason are visible. **Current:** contradiction is authored, while refresh only increments a version. Implement one deterministic state change and brief history; broad dependency handling can wait. D06 D07. Evidence L02:368-401.

### J05 Existing code lacks support

**Trigger/inputs:** Taylor's existing accepted record and contradictory source. **Owner/decision:** coder/QA approves an explicit deletion correction. **Handoff/output:** linked simulated attempt retaining original/rejected records. **Exception:** one standard rejection and retry is sufficient. **Done:** simulated correction acceptance is shown while payment remains unreconciled. **Current:** retained history is useful; generic correction always means delete and is not connected to approval. Constrain the showcased operation and link it. D01. Evidence L02:448-475.

### J06 Provider response without qualifying documentation

**Trigger/inputs:** query answered, no encounter source yet. **Owner/decision:** engagement/coder retains follow-up; provider supplies documentation separately. **Handoff/output:** responded, source received, usable and reviewed remain distinct. **Exception:** deferred/non-support response has an explicit next action. **Done:** source is reviewed or case closes with reason. **Current:** response does not approve coding, correctly. Add navigation to the prepared encounter and fresh review; no external messaging required. D08. Evidence L02:403-431.

### J07 QA identifies an error using existing evidence

**Trigger/inputs:** QA disagrees with the first decision. **Owner/decision:** independent QA returns with reason; coder revises. **Handoff/output:** rework and repeat QA. **Exception:** complex adjudication may wait. **Done:** final approved decision and campaign progress agree. **Current:** self-QA is blocked, but campaign closure precedes QA and rationale may be empty. A simple visible pass/rework round is enough now. D05 D12. Evidence L02:384-401.

### J08 Mismatched or unsuitable document

**Trigger/inputs:** Riley's unsigned note or prepared wrong-member sample. **Owner/decision:** retrieval rejects/quarantines, then publishes an eligible prepared replacement. **Handoff/output:** usable evidence returns to review. **Exception:** show one clear rejection reason and remediation. **Done:** matched signed source is usable and the case reflects it. **Current:** matching/signature and receipt/usability controls work. Unreadable PDFs, missing-page detection and arbitrary date exceptions can wait. D08 D10. Evidence L02:558-595.

### J09 Rejected record or partial correction

**Trigger/inputs:** prepared receiver rejection and original reference. **Owner/decision:** submission specialist retries the intended operation. **Handoff/output:** attempt history and separate acknowledgement/acceptance. **Done:** the normal synthetic retry finishes without deleting prior attempts. **Current:** the standard simulator supports this, but generic retries always become deletions. Restrict the demo to the explicit Taylor correction or add the simple resend type. Partly accepted multi-component corrections are a later scenario. D01. Evidence L02:448-475.

### J10 Prepared score comparison with model and year context

**Trigger/inputs:** a prepared baseline and combined-condition/reference scenario. **Owner/decision:** analyst/actuary inspects assumptions and factors. **Handoff/output:** clearly labeled before/after full-member totals. **Exception:** an unconfigured pack remains unavailable. **Done:** the audience understands hierarchy/interaction effects and model/period context. **Current:** numeric output is absent. Add one verified precomputed example or a nonnumeric hierarchy illustration; the requested actual model/year-change journey remains unimplemented and can wait. D02. Evidence L05:2164-2277.

### J11 Audit traces a result to source

**Trigger/inputs:** request for the showcased decision's evidence. **Owner/decision:** auditor selects that member/case. **Handoff/output:** package with source, decision, QA and simulated receiver history. **Done:** the audience can trace the same record without manual joins. **Current:** ZIP includes current documents/decisions/events, but not a complete connected submission story. Add a compact manifest. Formal samples, deadlines, appeals and historic retention can wait. D09. Evidence L02:494-501.

## Competitive comparison

Public vendor descriptions are used to identify useful functionality, not to claim tested performance or recommend copying entire platforms. Software, vendor coding/retrieval labor and audit services are different offerings. No competitor deployment was accessed. Exact contracted modules, receiver versions and AI effectiveness remain unknown.

| Capability and public approach | Local demo evidence | Recommended response |
|---|---|---|
| Innovaccer payer risk adjustment describes common data, master records, prioritized opportunities and prospective/retrospective work. Software/service responsibility is not fully specified. [V03] | Seeded member context, cohort and review flow. | High demo value: show one source-to-action story. Real data integration can wait. |
| Cotiviti combines technology/services for retrospective/second-level review, unsupported-code correction, post-visit reconciliation and encounter management. [V04 V05] | Review and correction exist but evolve independently. | High value: connect supported addition and integrity correction to simulated downstream records. D01. |
| Reveleer describes matching, chase prioritization/suppression, source-linked review and self-service/collaborative/full-service delivery. [V06 V07 V08] | Chase and usable-record controls are demonstrated locally. | High value: show a clean retrieval-to-review handoff, without building a retrieval network. D08. |
| Datavant describes retrieval/coding with layered QA and targeted/random sampling, supported by NLP; standalone software licensing is not established by the inspected page. [V09] | Independent QA, no broad sampling or adjudication. | Keep simple pass/rework in the demo. Sampling and service management later. |
| Inovalon's vendor-issued Converged Submissions announcement describes MA/ACA SaaS prevalidation, eligibility, corrections and reporting. [V10] | CSV and manual response simulation only. | Show distinct accepted, eligible and reported stages with prepared records. Real integration later. |
| RAAPID describes source-linked review, unsupported-code identification and platform/service options; neural/LLM plus knowledge-graph architecture is a vendor claim. [V11 V12] | Authored evidence and recommendations; no live model. | Demonstrate precise citations and changing recommendations. No knowledge graph or autonomous agent is needed. |

CitiusTech's public product suite and 2024 GenAI HEDIS announcement describe broader product-family functions. They do not prove the local risk-adjustment build has those capabilities. [V01 V02]

**Demo table stakes:** inspectable evidence, clear case types, a human decision, independent QA, a connected simulated outcome and consistent progress. **Useful differentiation:** a single clear member story and transparent AI evidence. **Low-value complexity now:** separate copilots for every persona, broad program engines, real transmission, optimization before assignment works, and elaborate financial narratives without a validated basis.

## AI assessment and practical improvements

### What the existing features actually use

| Feature | Technology and output | Demo judgment |
|---|---|---|
| Run/refresh analysis | Deterministic branch increments version and records a fixture run; no extraction/inference. L02:368-376. | Simulation is appropriate; unchanged output should be labeled replay/no change. D06. |
| Hypotheses, gaps, evidence bands | Seeded conditions, types, priorities, summaries and Strong/Moderate/Limited labels. L04. | Useful taxonomy; bands are not calibrated probabilities of diagnosis or payment. |
| Source highlights | Authored JSON sections and highlight flags, rendered in a source viewer. L07. | Valuable explanation; not evidence of working NLP. |
| Priority assistant | Keyword branch, filters and first 20 matching rows; links to six. L02:603-610. | Useful proposal; replace arbitrary order with a transparent simple ranking if needed. |
| Member summary | Stored summary plus available document links. L02:615-617. | Can become stale; sources are document references, not verified claim-level citations. D07. |
| Query drafting | Neutral template/condition substitution. L06:26-28. | Appropriate; live generative drafting adds little to the current demo. |
| Contradiction/QA assistance | Prepared contradiction and human QA actions. | Show one changed-evidence result; do not imply live detection. D06. |
| Retrieval/audit assistance | Local state and deterministic packaging. | Ordinary workflow logic is sufficient; no agent needed. |
| AI metrics/narratives | Frozen authored comparison and template explanation. L08. | Correct illustration; not observed AI effectiveness. |
| Score calculation | Not installed. | Use a verified prepared reference example, separate from AI. D02. |

No live-model versioning, monitoring or evaluation was found because no live model is connected. The assistant visibly discloses that fact and declines unsupported prompts. Preserve those useful boundaries.

### Small AI improvements with an operational case

#### AI01 Refresh findings from prepared evidence

**Problem:** analysis appears new without changing the result. **User:** reviewer. **Trigger:** refresh or prepared new source. **Inputs:** member, document IDs and scenario state. **Method:** deterministic scenario rules. **Output:** changed/no-change finding, evidence band and next action. **Permitted actions:** update a prepared recommendation snapshot. **Human approval:** coder still decides. **Failure:** unavailable source produces an explicit no-result state. **Measurement:** all showcased states match expected outputs. **Dependencies:** D06 and stable fixtures. This provides meaningful AI-style behavior without a live model.

#### AI02 Current source linked explanations

**Problem:** summary and evidence can disagree. **User:** coder/provider. **Trigger:** open case or change source. **Inputs:** selected member's current prepared passages and support/history/contradiction labels. **Method:** extractive templates. **Output:** short explanation with one or two precise passages and missing-evidence wording. **Permitted actions:** display only. **Human approval:** reviewer verifies before coding. **Failure:** abstain when the fixture does not support a statement. **Measurement:** every claim/citation and scenario transition is checked. **Dependencies:** D07; no vector database required.

#### AI03 Explain priority and intervention

**Problem:** the assistant takes the first matching rows. **User:** analyst. **Trigger:** request a cohort. **Inputs:** existing priority, evidence, due date, disposition and campaign coverage. **Method:** visible deterministic ranking. **Output:** top candidates with reasons and separate integrity work. **Permitted actions:** propose a cohort. **Human approval:** analyst reviews exact members before activation. **Failure:** no candidates returns an empty explanation, not invented work. **Measurement:** stable ranking and correct overlap/counts. **Dependencies:** D04; capacity optimization later.

#### AI04 Neutral query with evidence context

**Problem:** a generic template can omit the reason for clarification. **User:** coder/engagement. **Trigger:** historical/ambiguous/indirect finding. **Inputs:** prepared source passage and unanswered question. **Method:** neutral template with approved slots. **Output:** concise draft including non-support and uncertainty options. **Permitted actions:** draft/local task. **Human approval:** user approves the query; clinician assesses. **Failure:** missing context uses the generic neutral template. **Measurement:** reviewer can explain the query and response does not complete coding. **Dependencies:** D08. Live LLM drafting is optional later.

#### AI05 Audit and metric explanation

**Problem:** the presenter manually explains how records or numbers connect. **User:** auditor/executive. **Trigger:** open package/metric. **Inputs:** prepared manifest or single metric definition. **Method:** deterministic assembly and templates. **Output:** source-to-decision trace or formula/denominator explanation. **Permitted actions:** local preview/export. **Human approval:** user chooses package. **Failure:** missing links are explicitly listed. **Measurement:** every statement matches the underlying synthetic records. **Dependencies:** D09 and metric definitions. No autonomous audit agent is justified.

If live AI is added later, start with one bounded read-only extraction or explanation feature. Documents must be treated as untrusted content; their text cannot grant tools or override member scope. Validate member/source IDs outside the model, require exact citations, show contradictions and abstention, and retain manual fallback. Model behavior changes need a fixed regression set. AI must never manufacture clinician documentation, choose authoritative coefficients, approve diagnoses or bypass QA/submission controls.

An executing agent is unnecessary for this demo. Later, a retrieval coordinator could be bounded to read_request, read_vendor_status and create_internal_followup, with request/member scope, state revision, idempotency keys, retry limits and escalation. External contact or clinical/submission decisions would require explicit authorized human control. Build it only if it removes a demonstrated handoff burden.

## Credibility of AI impact metrics

The authored comparison is internally consistent: 200 charts, 100 per arm, ten condition slots per chart; each arm has 120 positive and 880 negative reference slots. The full records were recalculated. [L04 L08 L10]

| Measure | Correct synthetic value | Interpretation |
|---|---|---|
| AI precision | 108/135 = 80% | Reference-positive AI flags/all AI flags. |
| AI recall | 108/120 = 90% | Includes 12 missed positive slots, not flags alone. |
| AI specificity | 853/880 = 96.93% | Correctly unflagged reference negatives. |
| Final assisted precision/recall | 102/105 = 97.14%; 102/120 = 85% | Human final decisions, separate from AI-stage performance. |
| Final manual precision/recall | 84/90 = 93.33%; 84/120 = 70% | Authored comparison arm. |
| Confirmation yield | 105/135 = 77.78% | Includes three incorrect final positives; not accuracy. |
| Active time | 22 versus 36 minutes; 38.89% reduction | Synthetic illustration, not measured productivity or causal lift. |

The existing synthetic disclosure is good and sufficient for the demo. Operational counters use at most the latest 100 events. A generated recommendation is not exposure; a saved review is not a unique completed chart; evidence inspection is not AI adoption. Pause/resume does not accumulate active intervals. Do not claim measured savings or live accuracy from those counters.

**Later evaluation design:** define review episodes, program/period, condition universe and case mix; log actual exposure and active-time intervals; independently label both flagged and unflagged cases with adjudication; retain exclusions and incomplete cases; use randomized/matched comparison where incremental benefit is claimed. Report precision, recall, specificity, final review error and timer coverage separately. Synthetic scores, receiver acceptance and realized payment must remain distinct. This study is not a prerequisite for an honestly labeled demo.

## Prioritized demo backlog

P0 means a critical demo workflow/correctness/access issue that must be fixed if the affected action is shown. P1 means needed for a coherent expanded demonstration. P2 means useful polish. P3 means optional later differentiation. A missing production integration receives no demo-blocker priority merely because it would matter in production.

### D01 Complete the reviewed case through simulated outcome

**Priority P1. Program:** MA demo. **Personas/workflow:** coder, QA, submission specialist; supported addition and Taylor correction. **Evidence:** L02:377-401,448-475; R04; no decision-to-submission creation. **Consequence:** core story stops or switches to unrelated seeded records. **Recommendation:** bind prepared code/source and approved decision to a simulated record; constrain correction to explicit supported operations. **Dependencies:** prepared code fixtures, D05. **Acceptance:** Jordan passes QA and produces a linked simulated addition; Taylor produces an explicit deletion after QA; acknowledgement/acceptance remain separate; rejected attempt is retained; payment remains labeled unreconciled. **Type:** demo functionality gap.

### D02 Add one prepared reference scoring example

**Priority P1. Program:** non-PACE MA Part C PY2027. **Personas/workflow:** analyst/actuary/executive; scenario comparison. **Evidence:** L05:2164-2277 has no numeric result. **Consequence:** limited demonstration of the business purpose. **Recommendation:** precompute and independently verify one full-member baseline/combined-condition case; display model, segment, inputs and factor/hierarchy explanation. No live engine is required. **Dependencies:** official reference output and reviewed assumptions. **Acceptance:** values match retained reference evidence; combined result is recomputed, not summed marginal estimates; UI says precomputed reference; no unsupported revenue claim. If unavailable, show a nonnumeric hierarchy illustration. **Type:** design recommendation.

### D03 Bound review actions to prepared evidence

**Priority P1. Program:** MA demo. **Personas/workflow:** coder/analyst; member exploration. **Evidence:** R01; L02:382 and L06:80 use sample IDs while roster members remain actionable. **Consequence:** ordinary browsing can lead to empty charts or supported decisions without evidence. **Recommendation:** retain 10,000 members for browsing and use an explicit fully reviewable demo set; require simple matched/usable source prerequisites for support. **Dependencies:** fixture catalog. **Acceptance:** unsupported browsing-only members show a clear state/link to a complete example; the six cases behave correctly; no general clinical eligibility engine is required. **Type:** reproduced behavior with a bounded demo remedy.

### D04 Make demo assignments reachable

**Priority P1. Program:** MA demo. **Personas/workflow:** analyst/coder/retrieval; campaign allocation. **Evidence:** R06; L02:176-180 restricts staff to first 30 IDs. **Consequence:** assigned work cannot be opened. **Recommendation:** restrict actionable campaign members and owners to a verified accessible set, or make the small demo assignment relation authoritative. **Dependencies:** fixed demo accounts and D03. **Acceptance:** every selectable assignee can open each assigned case and necessary evidence; no assignment advertises inaccessible work; broader capacity/authorization design waits. **Type:** reproduced common handoff defect.

### D05 Align QA campaign and dashboard completion

**Priority P1. Program:** MA demo. **Personas/workflow:** coder/QA/program leader; completion/rework. **Evidence:** R03; L02:399-400. **Consequence:** campaign appears finished before QA. **Recommendation:** define completion for each demonstrated intervention; coding work finishes after QA, retrieval after usability. **Dependencies:** existing QA states and task types; this can precede D01. **Acceptance:** awaiting-QA stays open, pass advances progress, rework reopens, and dashboard/campaign/member agree. Add a visible QA reason for the demonstrated return. **Type:** reproduced visible inconsistency.

### D06 Make analysis and history reflect scenario changes

**Priority P1. Program:** MA demo. **Personas/workflow:** analyst/reviewer; refresh and changed evidence. **Evidence:** R07; L02:368-376,398. **Consequence:** a new version implies new analysis without a changed result. **Recommendation:** scenario rules return changed/no-change outcomes and save a compact before/after recommendation; separate workflow revision from recommendation version. **Dependencies:** fixture transitions. **Acceptance:** same input shows no change; newly loaded evidence changes finding/explanation and records the prior version; assignment does not pretend to create a new AI recommendation. **Type:** reproduced provenance inconsistency.

### D07 Keep assistant explanations current and source specific

**Priority P1. Program:** MA demo. **Personas/workflow:** coder/provider/executive; summaries. **Evidence:** L02:615-617 returns stored summary plus all available documents. **Consequence:** new evidence can sit beside a stale conclusion. **Recommendation:** prepared explanations keyed to scenario state, with exact relevant passage links and history/conflict/context labels. **Dependencies:** D06. **Acceptance:** Morgan's summary updates after the later encounter; Avery stays an assessment signal; Taylor shows contradiction; no-source case abstains; every cited passage supports the associated statement. **Type:** source-verified limitation/design improvement.

### D08 Guide provider response through usable source and review

**Priority P1. Program:** MA demo. **Personas/workflow:** provider/retrieval/coder; follow-up. **Evidence:** L02:403-446,558-595 already separates response and documentation. **Consequence:** a sound concept needs a smoother presenter handoff. **Recommendation:** explicit next-action links and prepared scenario progression from response to encounter, intake and fresh review. **Dependencies:** existing samples/accounts. **Acceptance:** response alone never approves coding; unsigned/mismatched sample is rejected; suitable replacement publishes once; source and review update together; no external outreach is implied. **Type:** demo flow improvement.

### D09 Export a complete synthetic case trace

**Priority P2. Program:** MA demo. **Personas/workflow:** auditor/executive; package export. **Evidence:** L02:494-501 includes current source/decision/events, not the complete connected attempt chain. **Consequence:** traceability needs manual explanation. **Recommendation:** add final review, QA, simulated submission/correction history and a readable manifest for the selected case. **Dependencies:** D01 D06. **Acceptance:** package traces Jordan/Taylor to the exact prepared document and decision; source IDs and synthetic labels match UI; unrelated members are absent. Full audit case management waits. **Type:** demo functionality enhancement.

### D10 Keep scope and scenario state explicit

**Priority P1. Program:** fixed MA demo; other programs future scope. **Personas/workflow:** presenter/executive; entire tour. **Evidence:** L01, L02:424, L11; visible fixture/synthetic notices already exist. **Consequence:** future prepared encounter or polished acceptance copy may imply real execution. **Recommendation:** consistent synthetic, precomputed and receiver-simulation labels; show scenario clock progression and program scope without repetitive warnings. **Dependencies:** presenter guide/fixture catalog. **Acceptance:** all viewed/exported outputs retain basis; future encounter is a staged scenario; no live AI, payment or unimplemented program claim; production environment is not required. **Type:** disclosure design improvement.

### D11 Preserve provider scope when saving accounts

**Priority P0 for the affected administration action; otherwise defer outside the tour. Program:** MA demo. **Personas/workflow:** administrator/provider; account save. **Evidence:** R02; L02:531 forces PR-001. **Consequence:** saving provider2 changes which practice's records it sees. **Recommendation:** preserve existing provider_id unless explicitly changed. **Dependencies:** none beyond existing account model. **Acceptance:** no-op save and enable/disable preserve PR-002; new login still sees member 2 and not member 1. Do not turn this small fix into an enterprise identity project. **Type:** reproduced access defect.

### D12 Polish the actual presenter route

**Priority P2. Program:** MA demo. **Personas/workflow:** all demonstrated roles. **Evidence:** L05-L08; mixed draft persistence and several disconnected next actions. **Consequence:** avoidable clicks or state confusion during a tour. **Recommendation:** test the chosen viewport, role switch, source navigation, saved-state labels, QA rationale and return links. **Dependencies:** D01-D10. **Acceptance:** presenter completes the five stories without dead ends/lost context; screens and source panels fit; reset returns the known starting state in the test environment. Broad accessibility/device coverage and concurrency wait. **Type:** usability recommendation.

## Sequenced roadmap and validation

### Next demo increment

Finish D01, D03-D08 and D10 around the existing six cases. Add D02 as the principal business-value demonstration. Include D11 only if account editing is part of the tour; otherwise leave that action out until corrected. D09 and D12 improve the finish and pacing. Preserve the existing UI and local backend; no rewrite, new agent platform or real payer integration is justified by this scope.

**Demo exit gate:** the presenter can complete the five connected stories below using synthetic data, with consistent records and labels. Existing acceptance tests remain green and focused checks cover the new connections. A correct prepared demonstration is sufficient; it does not need to establish real clinical outcomes.

| Story | Concrete acceptance check |
|---|---|
| Jordan supported coding | Cohort/assignment opens the correct case; exact source supports prepared code; different QA reviewer passes; same decision yields simulated submission; receipt/acceptance separate; existing source/decision export is usable. Full submission-chain packaging is the optional D09 enhancement. |
| Morgan and Avery assessment | History or indirect signal cannot directly close as supported; query response alone is incomplete; separately prepared qualifying source enables fresh review; non-support remains valid. |
| Riley intake | Unsigned/wrong-member sample is rejected with clear reason; suitable replacement becomes usable once and appears in review. |
| Taylor integrity correction | Reviewed unsupported code and QA lead to explicit simulated delete; rejection retained; retry does not silently change operation; acceptance does not claim payment reconciliation. |
| Casey scoring | If a numeric example is used, it matches retained reference and identifies model/year/segment. A clearly labeled nonnumeric hierarchy illustration is an acceptable fallback. Neither version invents revenue. |
| Cross-screen consistency | Assignment is reachable; QA/rework changes progress correctly; summary and recommendation history follow scenario changes; export matches displayed case. |

### Controlled user feedback pilot after the demo

If “pilot” means users trying synthetic workflows, keep the same bounded environment and ask representative coder, QA, retrieval and analyst users to complete the stories without presenter guidance. Record task completion, confusing labels, clicks, draft loss and unsupported claims. Do not call their acceptance a clinical accuracy study. Address common usability failures before adding breadth.

If a later pilot uses real records or external processing, define that separately. At that point add appropriate privacy/security approvals, source/receiver contracts, general evidence/coding rules, validated model packs and operational measurement. Those are not requirements for the present demo.

### Later production and uncommon case backlog

| Later area | Examples that can wait |
|---|---|
| Real data and services | General ingestion/OCR, identity resolution, EHR/vendor connectors, real AI and CMS/EDGE/Florida transmission. |
| Broad program correctness | Complete segment/model packs, all annual code/service rules, PACE/ESRD/Part D/ACA/Florida execution and contract-specific logic. |
| Less likely workflow exceptions | Partly accepted multi-operation corrections, broad concurrency/stale-write handling, conflicting multi-provider records, reassignments across organizations and complex adjudication. |
| Operational administration | Capacity planning, full audit sampling/deadlines/appeals, enterprise SSO/tenant policy, immutable long-term storage, high availability and recovery. |
| Outcome proof | Independently measured clinical accuracy, causal productivity gains, calibrated prediction and actual payment/transfer reconciliation. |

## Open decisions

1. Is the executive audience evaluating MA workflow depth or expecting credible examples across four programs? Default recommendation: one complete MA story plus an honest future-program view.
2. Which role changes are actually in the presenter route? Keep account administration out until D11 is fixed.
3. Can the team supply or generate one verified official reference scoring example? If not, use a nonnumeric hierarchy illustration; do not invent an official RAF.
4. Should “supported coding” demonstrate an actual prepared ICD code? Recommended for D01, with the source and code release explicitly reviewed.
5. Is the next pilot synthetic usability feedback or real-record operation? These have different acceptance gates.
6. Who owns the application name, commercial positioning and relationship to CitiusTech's public Perform+ suite?

## Evidence and source register

Local paths below refer to the inspected source revision. Reproduction tests were created outside the application repository and executed only in a temporary synthetic schema. Public sources establish requirements or vendor claims, not product conformance. Sources accessed 12 September 2026; undated product pages have no verified publication date.

### Local evidence

- L01: README and specification, [README](/home/mahammad/Desktop/ct/README.md), [scope and program defaults](/home/mahammad/Desktop/ct/CitusTech_Perform_Plus_Coding_Spec.md:51).
- L02: [API and workflow implementation](/home/mahammad/Desktop/ct/apps/api/app/main.py). Key lines: roles 34-46; scope 176-180; campaign 319-367; analysis 368-376; review/QA 377-401; query/source 403-431; receiver 448-475; audit 494-501; provider update 525-533; intake 558-595; assistant 603-618.
- L03: [Existing acceptance tests](/home/mahammad/Desktop/ct/apps/api/tests/test_demo.py); current execution 21 passed, four deprecation warnings.
- L04: [Synthetic dataset](/home/mahammad/Desktop/ct/seed/demo.json), including meta, members, opportunities, documents, submissions and comparison.evaluation_records. Full comparison arithmetic independently recomputed.
- L05: [Workspaces](/home/mahammad/Desktop/ct/apps/web/src/components/workspaces.tsx): Member 360, providers, submissions, audit and scenarios.
- L06: [Review workbench](/home/mahammad/Desktop/ct/apps/web/src/components/review-workbench.tsx), including support guard and query template.
- L07: [Source document viewer](/home/mahammad/Desktop/ct/apps/web/src/components/source-document.tsx), [intake](/home/mahammad/Desktop/ct/apps/web/src/components/intake-workspace.tsx), [campaigns](/home/mahammad/Desktop/ct/apps/web/src/components/campaign-planner.tsx).
- L08: [Dashboard/AI Impact](/home/mahammad/Desktop/ct/apps/web/src/components/dashboard.tsx), [fixture assistant](/home/mahammad/Desktop/ct/apps/web/src/components/fixture-assistant.tsx), [navigation/drafts](/home/mahammad/Desktop/ct/apps/web/src/hooks/workspace-state.ts).
- L09: [Earlier verification](/home/mahammad/Desktop/ct/docs/VERIFICATION.md), [UI QA](/home/mahammad/Desktop/ct/docs/UI_QA.md). Historical local verification, not a fresh production assessment.
- L10: Current review results: 21 existing tests passed; R01-R08 all reproduced in eight checks, 16.34 seconds. The eight successful assertions confirm the described behavior, not its desirability. Test evidence is included in the [companion validation notes](/home/mahammad/Documents/Codex/2026-09-12/files-pasted-by-the-user-you/outputs/Perform_Plus_Validation_Notes.md).
- L11: [Display copy](/home/mahammad/Desktop/ct/apps/api/app/display.py). Some receiver display copy is simplified; document() deep-copies original source content, so current clinical quotations were not found to be rewritten.

### Medicare and coding authorities

- M01: [CMS 2026 Rate Announcement](https://www.cms.gov/files/document/2026-announcement.pdf), 7 April 2025; model and Part D rules for PY2026.
- M02: [CMS 2027 Rate Announcement](https://www.cms.gov/files/document/2027-announcement.pdf), 6 April 2026; final future-year model and source rules.
- M03: [CMS 2024 model factors](https://www.cms.gov/files/document/2024-announcement-pdf.pdf), 31 March 2023, Attachment VII; [Medicare Managed Care Manual Chapter 7](https://www.cms.gov/regulations-and-guidance/guidance/manuals/downloads/mc86c07.pdf), revision 19 September 2014. Current annual instructions supersede historical model/process details.
- M04: [CMS telehealth risk-adjustment update](https://www.cms.gov/files/document/applicability-diagnoses-telehealth-services-risk-adjustment-update-1152021.pdf), 15 January 2021; apply with M02.
- M05: [CMS PY2026 and PY2027 submission deadlines](https://www.cms.gov/files/document/deadline-submission-risk-adjustment-data-use-risk-score-calculation-runds-payment-years-2026-2027.pdf), 29 April 2026.
- M06: [CMS encounter data in overpayment reruns](https://www.cms.gov/files/document/supportforuseofencounterdatainoverpaymentreruns03152024hpmsmemo508g.pdf), 15 March 2024.
- M07: [CMS PY2024 RADV methods](https://www.cms.gov/files/document/radv-py2024-audit-methods-guidance.pdf), 28 August 2026; [current audit schedule](https://www.cms.gov/files/document/radv-audit-schedule.pdf). Current CMS instruction, not an independently reviewed appellate docket.
- M08: [CMS 2027 final announcement fact sheet](https://www.cms.gov/newsroom/fact-sheets/2027-medicare-advantage-part-d-rate-announcement), 6 April 2026.
- M09: [CMS Part D IPM background](https://www.cms.gov/data-research/monitoring-programs/improper-payment-measurement-programs/medicare-part-d-ipm/program-background), updated 15 January 2026; [Part D reconciliation explanation](https://www.cms.gov/newsroom/fact-sheets/medicare-part-d-direct-indirect-remuneration-dir), 19 January 2017, foundational context only.
- C01: [FY2026 ICD-10-CM official guidelines](https://www.cms.gov/files/document/fy-2026-icd-10-cm-coding-guidelines.pdf), effective 1 October 2025-30 September 2026, including setting-specific uncertain-diagnosis rules.
- C02: [FY2027 ICD-10-CM official guidelines](https://www.cms.gov/files/document/fy-2027-icd-10-cm-coding-guidelines.pdf), effective 1 October 2026 onward.

### ACA authorities

- A01: [CMS BY2026 DIY instructions](https://www.cms.gov/media/677071), 31 July 2026; model, input and EDGE-simulation distinctions.
- A02: [2026 Payment Notice final rule](https://www.federalregister.gov/documents/2025/01/15/2025-00640/patient-protection-and-affordable-care-act-hhs-notice-of-benefit-and-payment-parameters-for-2026-and), published/effective 15 January 2025; [final BY2026 coefficients](https://www.cms.gov/files/document/2026-benefit-year-final-hhs-risk-adjustment-model-coefficients2025-01-13.pdf), 13 January 2025.
- A03: [CMS HHS telehealth/code-filter FAQ](https://www.cms.gov/files/document/hhs-ra-telehealth-faq20260311.pdf), 11 March 2026.
- A04: [45 CFR 153.710](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-B/part-153/subpart-H/section-153.710), current text; enrollment/claims and discrepancy response.
- A05: [45 CFR 153.730](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-B/part-153/subpart-H/section-153.730), current text; submission deadlines.
- A06: [2027 Payment Notice final rule](https://www.cms.gov/files/document/cms-9883-f-patient-protection.pdf), published 20 May 2026, effective 20 July 2026; [official correction](https://public-inspection.federalregister.gov/2026-14709.pdf), 21 July 2026.
- A07: [45 CFR 153.630 HHS-RADV](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-B/part-153/subpart-G/section-153.630), current text.

### Florida and Medicaid authorities

- FLa: [AHCA actuarial services](https://ahca.myflorida.com/medicaid/medicaid-finance-and-analytics/medicaid-data-analytics/medicaid-actuarial-services.html), publication date unavailable.
- FLb: [AHCA RY2025-26 MMA base rates](https://ahca.myflorida.com/content/download/27605/file/RY%2025-26%20MMA%20Final%20Base%20Rates.pdf), rating-period dates stated; issue date unavailable.
- FLc: [Current AHCA model-contract index](https://ahca.myflorida.com/medicaid/statewide-medicaid-managed-care/2025-2030-smmc-plans/model-health-plan-contract.html), [prior contract index](https://ahca.myflorida.com/medicaid/statewide-medicaid-managed-care/2025-2030-smmc-plans/model-health-plan-contract/prior-model-health-contracts.html). Index search evidence identified July 2026/current and October 2025/prior; full current page access was blocked. No signed contract obtained.
- FLd: [CMS 2025-26 Medicaid rate guide](https://www.medicaid.gov/medicaid/managed-care/downloads/2025-2026-medicaid-rate-guide-082025.pdf), August 2025, pp48-49.
- FLe: [CMS 2026-27 Medicaid rate guide](https://www.medicaid.gov/medicaid/managed-care/downloads/2026-2027-medicaid-rate-guide-022026.pdf), February 2026, pp54-56; [guide applicability](https://www.medicaid.gov/medicaid/managed-care/guidance/rate-review-and-rate-guides).
- FLf: [AHCA October 2025 core provisions](https://ahca.myflorida.com/content/download/27248/file/Attachment%20II-%20-%20Core%20Contract%20Provisions%20Oct%202025.pdf), historical version; current applicability unverified.
- FLg: [AHCA data-book public meeting](https://ahca.myflorida.com/content/download/20819/file/Presentation.pdf), 5 January 2023, historical methodology caution.

### Public vendor sources

- V01: [CitiusTech Products](https://www.citiustech.com/products), undated; product-family identity only.
- V02: [CitiusTech PERFORM+ GenAI HEDIS announcement](https://www.citiustech.com/news-events/press-releases/citiustechs-perform-clinical-convergence-platform), 21 August 2024.
- V03: [Innovaccer Risk Adjustment for Payers](https://innovaccer.com/products/risk-adjustment-for-payers), undated.
- V04: [Cotiviti risk adjustment](https://www.cotiviti.com/solutions/risk-adjustment), undated.
- V05: [Cotiviti Suspect Analytics](https://www.cotiviti.com/solutions/risk-adjustment/suspect-analytics), undated; rules/statistical model description.
- V06: [Reveleer risk adjustment](https://www.reveleer.com/solutions/risk-adjustment), undated.
- V07: [Reveleer EVE technology](https://www.reveleer.com/technology/ai), undated; vendor describes prospective logic/GenAI and retrospective supervised scoring separately.
- V08: [Reveleer services](https://www.reveleer.com/services), undated; service-delivery distinctions.
- V09: [Datavant risk adjustment/HCC coding](https://www.datavant.com/solutions/risk-adjustment-hcc-coding), undated.
- V10: [Inovalon-issued Converged Submissions announcement](https://www.globenewswire.com/news-release/2024/03/18/2847720/0/en/Inovalon-Announces-Converged-Submissions-To-Support-Health-Plan-Risk-Adjustment-Programs.html), 18 March 2024; vendor announcement distributed by GlobeNewswire, not independent evidence. Current product-page retrieval was unavailable.
- V11: [RAAPID retrospective risk adjustment](https://www.raapidinc.com/retrospective-risk-adjustment/), undated.
- V12: [RAAPID neural and symbolic AI explanation](https://www.raapidinc.com/blogs/neuro-symbolic-ai-in-risk-adjustment/), 18 May 2026; architecture claims not independently verified.
