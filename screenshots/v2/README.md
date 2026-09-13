# V2 screenshots and browser evidence

This folder contains 68 real browser captures: five fresh before views, 16 primary routes after implementation, 32 detailed risk views, six Jordan workflow steps, and nine desktop size checks. [manifest.json](manifest.json) is the authoritative file inventory, with dimensions, timestamps, SHA-256 hashes, runtime identities and verification scope. The other manifests are chronological capture logs; later captures may replace files named in earlier logs.

## Start here

- [Risk overview · 1440 × 900](after/01-risk-overview-1440x900.png), [1920 × 1080](desktop/overview-1920x1080.png)
- [Casey risk profile](after/02-casey-risk-1440x900.png), [factor ledger](after/27-casey-factor-ledger-1440x900.png), [combined scenario](after/07-casey-combined-scenario-1440x900.png)
- [Jordan chart review · 1440 × 900](after/06-review-1440x900.png), [1366 × 768](desktop/review-jordan-1366x768.png), [1920 × 1080](desktop/jordan-review-1920x1080.png)
- [Models and readiness](after/04-models-1440x900.png), [external import reconciliation](after/09-medicaid-import-result-1440x900.png)
- [Stage reconciliation](after/10-stage-reconciliation-1440x900.png), [independent observations](after/26-independent-observations-1440x900.png)
- [Risk analytics](routes/analytics-1440x900.png), [actual period comparison](after/25-actual-period-comparison-1440x900.png)
- [Financial result · 1440 × 900](after/12-financial-result-1440x900.png), [1920 × 1080](desktop/financial-result-1920x1080.png)
- [RxHCC ledger](after/20-rxhcc-mapd-ledger-1440x900.png), [ACA adult](after/21-aca-adult-ledger-1440x900.png), [child](after/22-aca-child-ledger-1440x900.png), [infant](after/23-aca-infant-ledger-1440x900.png)
- [Document intake · 1366 × 768](desktop/intake-riley-1366x768.png), [registry · 1366 × 768](desktop/registry-1366x768.png)

The [routes folder](routes) covers Overview, Analytics, Model lab, Suspects, Reviews, QA, Campaigns, Chase, Intake, Members, Providers, Pre-visit, Submissions, Audit, Data and Administration at 1440 × 900. The QA queue is empty after Jordan's independent approval; it is not a loading frame. Long tables and ledgers use normal page or internal scrolling. Images with a scrolled ledger or observation show that intentional position.

## Matching before and after

These five comparisons use the same 1440 × 900 viewport. The workflow and calculation state can change between captures.

| Screen | Before | After |
| --- | --- | --- |
| Overview | [Before](before/01-overview-1440x900.png) | [After](after/01-risk-overview-1440x900.png) |
| Casey member | [Before](before/02-casey-member-1440x900.png) | [After](after/02-casey-risk-1440x900.png) |
| Model lab | [Before](before/03-model-lab-1440x900.png) | [After](after/03-model-lab-1440x900.png) |
| Data | [Before](before/04-data-1440x900.png) | [After](after/04-models-1440x900.png) |
| Jordan review | [Before](before/06-review-1440x900.png) | [After](after/06-review-1440x900.png) |

Only these five have fresh matching baseline captures. The remaining routes have after screenshots only. Each baseline was authenticated and independently inspected as a fully painted screen.

## Runtime identity

Before images were freshly captured from the existing Docker runtime at `http://localhost:3002` without changing it. Its UI image is `sha256:26a7441a890aa0a5430c6fb849c0db80b9419bacd76f4857051c0073536bf44b`; its source-tree label and API image identity are retained in the manifest. That runtime has no Git commit label, so its image is not attributed to current main.

After images were captured from the local Next.js development runtime at `http://localhost:3005`, using the separate V2 API at `http://127.0.0.1:8004` and persisted synthetic database. The source is the isolated `codex/business-requirements-v2` worktree based on `9b77300232c1834eb0816069dd18c40a7e37d628`. Separate enterprise CSS work on `ui/enterprise-v3` at `e819e40` was not merged into this worktree. Capture times span implementation and final polish; the UI source was frozen at **2026-09-13 03:23:53 UTC**, followed by a passing local production build. The screenshots are development-runtime evidence; a successful container build is recorded separately in the verification document.

The capture process used Chromium, page-specific loaded-content checks and a paint delay. Images were inspected directly. Final passes recorded no page or console errors. Filter clipping, member ID wrapping, compact intake footer visibility, source panel padding, misleading completed-review instructions, and duplicate financial sensitivity labels were corrected. The current financial and compact desktop images show the corrected renders. No screenshot was assembled from a mockup or substituted for a failed screen.

## Browser workflows verified

Jordan's source passage was inspected in the coder account and supported review `DEC-e28039ee47` saved. A separate local QA account passed it with a rationale (`QA-aeea6cc03f`). A submission analyst prepared and accepted the linked record `SUB-d90bec6a15`, applied the authored eligibility exception, and compared an independent missing-diagnosis report. The raw stage scores are 0.396 captured, 0.756 QA-supported/submitted/accepted, 0.396 eligible, and no numeric reported score. The [journeys folder](journeys) preserves six actual step captures; it is historical workflow evidence rather than a promise that each step still appears in the final queue.

Other browser checks covered Casey's complete-member scenario (0.758 to 1.145), retained input/source occurrence links, exact source-analysis citations, an RxHCC MAPD calculation, ACA adult/child/infant calculations, the seven-row external Medicaid example with three imported records and four exceptions, declared-feed coverage, and a six-member matched period comparison. ACA scoring views explicitly disclose their separate synthetic scoring profile instead of borrowing the clinical chart's age.

The MA financial walkthrough explicitly loaded and reviewed synthetic assumptions, calculated and retained an estimate from $7,932.66 to $11,982.71 (difference $4,050.05), and displayed distinct low/high sensitivity results. ACA and Medicaid financial calculations were not verified through the browser in this pass. Actual payment reconciliation remains unreconciled.

The UI downloaded and parsed retained financial, risk analytics and overview JSON outputs. The selected-case audit ZIP for Jordan and Taylor downloaded successfully, passed archive integrity checks, and contained 266 entries including source documents, retained inputs, risk runs and configuration evidence. File sizes and hashes are in the manifest. Downloads remain in ignored local verification storage; no credentials or session cookies are included in this screenshot folder.

## Acceptance boundaries

These are local synthetic workflow and rendered-interface checks. They do not establish production deployment, live payer acceptance, real payment reconciliation, live model inference, or closure of every business requirement. See [V2 verification](../../docs/V2_VERIFICATION.md), the [requirements plan](../../docs/BUSINESS_REQUIREMENTS_V2_PLAN.md), and [TODOs](../../TODO.md) for test results, measured performance and the remaining D1/D2 acceptance gates.
