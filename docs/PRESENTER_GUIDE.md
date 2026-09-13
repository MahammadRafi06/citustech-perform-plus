# Perform+ presenter guide

This guide describes the five connected stories rehearsed across six prepared cases with actual local role handoffs. [Assessment verification](ASSESSMENT_VERIFICATION.md) records the observed outcomes and limits; current captures are in [screenshots/assessment](../screenshots/assessment/). Earlier rehearsal evidence remains in [VERIFICATION.md](VERIFICATION.md).

## Choose one environment

Development runs at `http://localhost:3000` (or `http://127.0.0.1:3000`) and uses the host API on port 8000. The separate container preview is `http://localhost:3002`; its proxy uses the API and database containers. Those databases have separate accounts and passwords even when the email addresses match.

For development, read the local `.local/demo-accounts.json` or `.local/superuser-account.json`. For the preview, use the protected preview configuration and, when present, the `preview` entry in `.local/superuser-logins.json`. See the [README account instructions](../README.md#run-locally). Do not place passwords, session cookies or credential files in the walkthrough, exports or Git. Recreating a container and changing initial-password settings do not reset existing database accounts.

Use `127.0.0.1:3000` for development if the preview is open on `localhost:3002`. Cookies are shared across ports on the same hostname, so signing into another `localhost` instance can replace the first session. Use the browser login at the chosen UI URL; a direct API login at host port 8000 does not prove preview sign-in.

Use actual local accounts for role handoffs:

| Account | Continue with |
| --- | --- |
| `analyst@perform.test` | Overview, analytics, registry analysis, campaign allocation and Casey scenarios |
| `coder@perform.test` | Source inspection, reasoned decisions and rework |
| `qa@perform.test` | Independent pass or return for rework |
| `retrieval@perform.test` | Chart chase, source validation and publication |
| `provider2@perform.test` | Morgan's practice and authored follow-up encounter |
| `provider3@perform.test` | Avery's practice and assessment response |
| `provider6@perform.test` | Riley's practice and replacement examples |
| `provider@perform.test` | Jordan's practice and optional later clarification |
| `submission@perform.test` | Explicit preparation, simulated receiver outcomes, retries and report comparison |
| `admin@perform.test` | Local users, operations and isolated rehearsal reset |
| `superuser@perform.test` | All pages/actions for setup and inspection; independent QA still requires another person/account |

Sign out and sign back in when changing accounts. Providers only see their practice. Coder, QA and retrieval accounts retain their existing first-30-member scope; the six complete cases are within that scope. The administrator cannot approve clinical reviews. The superuser cannot approve its own review either.

## Five-minute opening

1. Sign in as the analyst. Open **Overview** and distinguish the 10,000-member population from the six complete actionable cases. Recorded dispositions and QA-approved completion have separate meanings.
2. Open **Analytics → AI Impact**. The frozen synthetic comparison contains 200 charts: 18 additional supported findings and mean active review time of 22 versus 36 minutes. Inspect the metric definitions and underlying export. These reference results do not change when today's workflow actions change.
3. Open **Suspect registry**, select Jordan and run analysis. With unchanged evidence the result is **No change** and the recommendation version stays the same; the analysis action is still recorded. Open Jordan's current source and its exact assessment passage.
4. Create a campaign from selected complete cases. Choose the intervention, then an offered account that can access the entire cohort. A provider allocation must fit one practice unless another explicitly eligible account covers it. Review the exact member list, owner, due date and existing coverage before activation.
5. Open the campaign. Show the frozen cohort and tasks. Larger retained campaigns identify their actionable subset separately from the population illustration. Coding/integrity completion requires a terminal decision approved independently; source remediation requires usability, and a pre-visit response is its own milestone.

A cohort proposed by **Ask Perform+** follows the same explicit preview. Ranking reasons include priority, evidence, due date, disposition and existing coverage; integrity work is proposed separately. Empty proposals do not invent work.

## Story 1 — Jordan: source to approved addition

**Case:** Jordan Ellis, `MB-000001`. **Route:** analyst → coder → QA → submission.

1. Open `/reviews/MB-000001` as the coder. Inspect `DOC-0001`, page 1, **Assessment and plan**, and mark the source inspected. The prepared `I50.22` output retains its code release and reference. Prior historical material remains available separately.
2. Choose **Supported by evidence**, enter a rationale tied to the passage, and save the review to QA. The recorded disposition remains open work until independent QA passes.
3. Sign in as QA and open `/qa?member=MB-000001`. For the rework branch, enter a concrete rework reason and return the case. Sign back in as the coder, read that reason, correct the review and save a new decision. Sign back in as QA and pass the new decision. Previous decisions and QA reasons remain in history.
4. Sign in as submission and open `/submissions?member=MB-000001`. Inspect the current review basis, then explicitly **Prepare addition**. QA alone does not create a receiver attempt.
5. Open the prepared record. Record **Acknowledged**, then **Accepted**. Transport receipt and record acceptance are separate states. Inspect the retained review, QA, recommendation and exact source references.
6. Use **Compare prepared report**. The named synthetic comparison shows the added record present. Diagnosis eligibility remains unevaluated and payment remains unreconciled. Download a selected-case evidence package from Audit if needed.

Optional evidence-change branch, after demonstrating the addition: use Jordan's provider account to **Receive later clarification** (`jordan-clarification`, `DOC-JORDAN-CLARIFICATION`, September 20). Retrieval validates and publishes it. Publication withdraws the earlier support, preserves the existing record/history and requires fresh review/QA. Receipt alone does not change the support decision. This branch illustrates clarification; it does not introduce a second configured Jordan receiver operation.

## Story 2 — Morgan and Avery: assessment is not documentation

**Cases:** Morgan Reed, `MB-000002`, and Avery Brooks, `MB-000003`. **Route:** analyst/coder → the matching provider → retrieval where an authored source exists → fresh review/QA.

For Morgan:

1. Inspect `DOC-0003` and `DOC-0004`. The historical COPD mention is separate from the current signed note, which does not assess COPD. Supported coding is blocked.
2. Create a neutral clarification task. Keep the evidence context and allow support, no support, uncertainty or a request for more information.
3. Sign in as `provider2@perform.test` and open `/previsit?member=MB-000002`. Save a response. Point out that it does not enable supported coding.
4. Select **Receive September 18 encounter** (`morgan-assessment`, `DOC-0005`). The encounter date is authored and staged after the initial September 12 scenario; the receipt action has its actual timestamp.
5. Sign in as retrieval and open `/intake?member=MB-000002&document=DOC-0005`. Validate identity, signature and current-period eligibility, then publish once.
6. Return as the coder to `/reviews/MB-000002`. The current finding and source links now use the signed September 18 assessment. Record a fresh decision, then have QA approve it independently. Review the before/after recommendation history. Re-running analysis on the same published source returns **No change**.

For Avery, create a neutral assessment request and use `provider3@perform.test` at `/previsit?member=MB-000003` to record the response. The indirect laboratory/pharmacy context in `DOC-0006` is not a diagnosis. No qualifying authored later encounter is configured for Avery; no generic source-generation path exists. A response therefore leaves supported coding blocked. End this branch at assessment/follow-up rather than asserting a supported result.

## Story 3 — Riley: resolve the source failure

**Case:** Riley Parker, `MB-000006`. **Route:** retrieval → provider6 → retrieval → coder → QA.

1. As retrieval, open `/intake?member=MB-000006&document=DOC-0009` and validate the original source. The missing clinician signature blocks publication/support. Use Chart chase for receipt state and local contact notes; a received chart is not automatically usable evidence.
2. As `provider6@perform.test`, open `/previsit?member=MB-000006`. Choose **Inspect mismatched replacement** (`riley-mismatch`, `DOC-RILEY-MISMATCH`) to make that prepared sample available.
3. As retrieval, validate the mismatch. Its source passage identifies `MB-000007`, while the requested member is Riley, `MB-000006`. Keep it quarantined; changing the requested chart must not turn it into Riley's supporting evidence.
4. As provider6, choose **Receive signed replacement** (`riley-replacement`, `DOC-RILEY-SIGNED`). Its authored encounter remains August 30.
5. As retrieval, open `/intake?member=MB-000006&document=DOC-RILEY-SIGNED`, validate the matching signed replacement and publish it. The original unsigned source remains retained and marked as superseded. Repeated publication does not duplicate the transition.
6. As the coder, open `/reviews/MB-000006`, inspect the newly published source, save a fresh supported decision and hand it to independent QA. Source remediation can be complete before coding/QA is complete; show those milestones separately.

The older `DOC-0010` and `DOC-0011` samples belong to members 7 and 8. They remain useful intake examples but do not complete Riley's story. Local TXT/PDF selection provides a browser preview only; it does not upload, extract or publish arbitrary files.

## Story 4 — Taylor: approved deletion and retained retries

**Case:** Taylor Quinn, `MB-000004`. **Route:** coder → QA → submission.

1. Open `/reviews/MB-000004` as the coder. Inspect `DOC-0007`, page 1, **Current clinician assessment**. It contradicts the existing heart-failure record. The displayed `I50.9` is a prepared prior-record reference to remove, not a newly supported diagnosis.
2. Save **Not supported** with a source-based rationale. Have QA approve that exact decision independently.
3. As submission, open `/submissions?member=MB-000004` and **Prepare deletion** from the approved-review handoff. Start with this fresh review; do not treat the original seeded or historical rejected records as current approvals.
4. Record **Acknowledged**, then **Rejected**. Use **Prepare retry** on that linked rejected attempt. The retry keeps the deletion operation and approved source basis; the rejected attempt and original `SUB-0001` remain unchanged.
5. Open the retry, record acknowledgement and acceptance. The original record gains its correction marker while retaining its original status/history. Repeated preparation for the same approval does not create a duplicate initial attempt.
6. Compare the prepared report: the deleted record is absent in the authored synthetic report. Acceptance, diagnosis eligibility, reported-record comparison and payment reconciliation remain distinct. Inspect Audit and export only Taylor, or Jordan and Taylor together, to see the complete retained chain and any unavailable stages.

A new review or relevant published evidence invalidates the previous approval for further preparation/receiver actions. Existing terminal attempts remain historical evidence. Follow the current approved-review handoff to prepare the new result.

## Story 5 — Casey: the nonnumeric comparison

**Case:** Casey Morgan, `MB-000005`. **Account:** analyst.

Open `/scenarios?member=MB-000005`. Compare the retained demographic context (77, female) and documented diabetes baseline with the combined documented diabetes/CKD input set. Follow `DOC-0008` to the original source.

The delivered option is the assessment's **nonnumeric fallback**. The source does not provide diabetes type, complication detail or kidney stage. No specific hierarchy or interaction is asserted for these unspecified conditions. Explain that a configured full-member model would need complete coding inputs and retained, independently checked outputs; standalone candidate effects cannot simply be added.

Baseline score, combined score and payment remain blank. Official numeric scoring, model/year switching and financial estimates are deferred. Other member/program selections retain an explicit unconfigured state. This is a successful explanation of the available basis, not a completed official scoring engine.

## Supporting screens and evidence

- **Ask Perform+:** select the member or use the current page context. Claims link to exact protected document/page/section passages. After evidence or work changes, ask again; a stale answer is not kept as current. Unsupported clinical questions remain outside the prepared prompt set.
- **Data operations:** inspect the named prepared source batch. Counts use documents as the unit and separate received, matched, quarantined and published states. Rechecks update the same records and link to intake; population counts and the frozen AI comparison are separate.
- **Provider portfolio:** open a practice and continue to its member list. Follow-up tasks are assigned to an actual eligible account; no provider message is sent externally.
- **Audit:** choose cases deliberately. The ZIP includes a readable manifest, original source documents, recommendation/review/QA snapshots and submission attempts. Missing stages are stated rather than implied complete; export is not formal audit certification.
- **Administration:** no-op edits and enable/disable actions preserve the provider's practice scope. Role changes revoke sessions. User management does not grant administrators clinical review permissions.

## Rehearsal and reset

Use a dedicated isolated rehearsal database or Compose project before resetting. Preserve the shared preview's current work and account state. A reset is not needed merely to view the new screens, and deleting a database volume is not a password-recovery method.

In the isolated environment, sign in as admin and open **Administration → Workspace settings → Reset workspace**, then type `RESET WORKSPACE`. The reset restores the prepared business dataset and clears operational actions while preserving users, passwords, roles and the frozen comparison. Confirm the target browser URL/environment first, then sign back in as the analyst.

The approved acceptance rehearsal at `http://localhost:3003` has completed two reset cycles and is currently at this starting baseline. Its environment-specific credentials remain in protected `.local/assessment.env`. Earlier completed walkthrough records are retained in a protected local backup and the screenshot/export evidence; their old submission links are historical. The working preview at `http://localhost:3002` was not reset.

| Suggested pacing | Story beat |
| --- | --- |
| Opening | Overview → AI Impact definitions → actionable registry and exact campaign preview |
| Primary path | Jordan source → reasoned review → independent QA → explicitly prepared addition |
| Evidence handoff | Morgan response → staged receipt → validated publication → fresh review; contrast Avery's unsupported signal |
| Remediation | Riley unsigned/mismatch examples → matched signed replacement → publication and review |
| Correction | Taylor contradiction → approved deletion → rejected attempt → preserved retry → prepared report |
| Explanation | Casey's documented input sets and explicit nonnumeric boundary; finish with a selected-case audit package |

Use the primary path for a short presentation and the remaining stories as separate routes. Timing above is an ordering guide, not a measured presentation duration. Current observed browser and container results must be taken from [ASSESSMENT_VERIFICATION.md](ASSESSMENT_VERIFICATION.md).

Filters, sorting, pagination and member/source context use URL state. Campaign stages and their exact preview are saved on the local device for the signed-in session. Unsaved review/query/contact text remains session-local; **Pause and save draft** is the persisted review checkpoint. Sign-out clears session drafts; do not use draft storage for credentials. Use a 1440×900 desktop viewport for the main captures and inspect dense review/source layouts at 1366×768 and 1920×1080. No mobile route is required.
