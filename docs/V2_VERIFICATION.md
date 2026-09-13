# V2 implementation and verification

This is the retained pre-merge checkpoint. See [main integration verification](MAIN_MERGE_VERIFICATION.md) for the subsequent combination with enterprise styling, fresh build and browser evidence. Source fingerprints and image identities below retain their original scope.

Implementation is active on `codex/business-requirements-v2`, based on `origin/main` at `9b77300232c1834eb0816069dd18c40a7e37d628`. The user approved development with “create new branch if not already done, and get started.” This is an isolated worktree; the original checkout, concurrent styles, local accounts and other previews remain preserved.

The V2 preview is [localhost:3005](http://localhost:3005), with its own API at port 8004 and a separate `perform_plus_v2` PostgreSQL database. Credentials remain in ignored local runtime files. Nothing has been published or deployed to a Kubernetes cluster in this increment.

## Delivered behavior

- A shared, persisted calculator serves member profiles, the model lab, finding hypotheses, clinical score stages and weighted analytics. Inputs, calculation runs, configurations, source occurrences and earlier results remain inspectable.
- Eight current configurations execute unchanged, checksum-verified official software: MA V28 PY2026; MA V28 PY2027 Initial and an explicitly named later-run forecast; RxHCC PY2027 MA-PD/PDP Initial and forecasts; HHS-HCC V08 BY2026.
- Monthly eligibility chooses the applicable segment. Unknown/conflicting status, exceptional model scope, invalid codes and out-of-window encounters do not receive an ordinary fallback. Raw output and annual/CSR transformations are separate.
- Finding and evidence-episode identities replace member-first assumptions. Independent QA needs a reason and the current decision/source. A revised terminal decision replaces its finding's supported contribution while retaining unrelated baseline diagnoses, other findings and immutable older runs.
- Submitted, accepted and eligible calculations retain complete input sets and explicit receiver fixtures. Diagnosis/report comparison is distinct from payment reconciliation. Morgan/Riley source remediation now supports current signed-source coding/QA; their additional receiver submission examples remain outside the currently prepared Jordan/Taylor path.
- The desktop UI adds shared model/run/basis context, a category ledger, scoring inputs, full-member hypotheses, model data, batch progress, imported Medicaid scores, actual monthly/stage/category analytics and program-specific financial assumptions.
- Six retained model-authored source classifications can be replayed only when member identity, complete source set, hashes, versions and exact passage spans still match. Replay cannot write a diagnosis, approve a review, transmit a record or change a score. Exact served model build information is unavailable and explicitly recorded as such.

## Numerical and population evidence

The frozen engine receipt records **98 passing tests**, with **79 independent reference cases** generated separately using unchanged official software. It binds adapter bytes, package trees, reference inputs/outputs and declared scope. See [validation receipt](../apps/api/app/risk_models/validation-receipt.json) and [reference harness](../apps/api/tests/model_reference/generate.py).

| Evidence | Result | Boundary |
|---|---|---|
| Full main-cohort engine run | 10,000 completed members; 120,000 member-months; zero failures; 293.009 seconds | MA PY2027 later-run forecast, read-only model probe |
| Persisted population batch | 10,000/10,000 completed; zero failures; 376.64 seconds observed | Batch `BATCH-e2d2840395e649b8ae065cbdde50705a`, local API/PostgreSQL |
| Current fixture identity | All 10,000 forecast input hashes match retained population inputs | Later changes affect prior-period eligibility/supplements and candidate identity only |
| Casey full-member hypothesis | Raw 0.758 → 1.145; change +0.387 | Combined diabetes/CKD hypothesis, no clinical approval implied |
| Medicaid prepared import | Seven rows: three valid, four exceptions | Duplicate, period and missing-score exceptions retained; no invented component detail |

Current Medicare date of birth remains stable across payment years. The synthetic members who first reach 65 in 2027 have no invented 2026 aged/disability entitlement; they are excluded explicitly from prior-period expected scoreability. Morgan's prior COPD coded supplement is separate from current-year inputs and does not automatically become a supported current diagnosis.

Only the default current MA cohort has a complete persisted 10,000-member execution receipt. Other program configurations have independent reference/profile coverage and interactive calculations; this report does not claim a persisted 10,000-member batch for every configuration. The latest multi-program fixture and container receipts are linked from [container verification](references/v2-container-model-verification.md).

## Checks and performance

The final integrated API/workflow suite passed **86 tests in 308.17 seconds, with four warnings**. It covers clinical/finding/episode gates, independent QA and score-stage updates, scenarios, external scope, recapture freshness, AI replay, selected-case exports and financial sensitivities. The public [verification checkpoint](references/v2-verification-checkpoint.json) records the command and hash of the final local receipt, `.local/v2-integrated-tests-final.txt`; the earlier failed run remains retained separately. These are application checks; the unchanged **98 engine checks / 79 independent reference cases** above remain separate evidence, not part of the 86-test total.

Focused receipts also passed; these overlap the final integrated suite and must not be added together as disjoint totals:

- 42 clinical/finding/episode/reconciliation regressions.
- 11 scoped risk API, scenario, aggregate, external-group, recapture and reset checks.
- Seven targeted supported-version/reconciliation/source-remediation checks, including two new supported-version tests; these overlap the clinical checks above and are not an additional disjoint total.
- 13 AI replay identity, citation, abstention, stale-source, authority and scope checks.
- 12 financial formula, missing-assumption, scope, persistence and unchanged-score checks.
- Three selected-case export checks: the two new risk ZIP regressions plus the existing clinical audit-manifest check, including reopening after recalculation, exact retained inputs and external-cohort redaction.
- Six reconciliation/scope/freshness checks after the final fixes: individual receiver exclusions preserve valid baseline scoring, narrowing an external cohort excludes older out-of-cohort scores from aggregates without deleting history, and stale eligibility does not count toward current receiver recapture.
- Frontend type checking and production build.

[Measured local API performance](references/v2-api-performance.json), with 20 measured requests after two warmups per operation:

| Operation | p95 |
|---|---:|
| Cached member open | 1.0946s |
| Repeated identical hypothetical recalculation | 0.7448s |
| 10,000-member overview | 2.4433s |

These latest samples were measured during concurrent local verification and include HTTP response parsing against the local API and real PostgreSQL. **Cached member open missed the <1-second p95 target**; repeated warm recalculation met the <2-second p95 target in this measured scope. Recalculation uses a warm official-output cache. They are not browser render timings, cold-start guarantees or production load measurements. The overview query loads aggregate fields without every member's full configuration/reference evidence. Full multi-program population and worker-restart/changed-adapter acceptance remain open.

The final separate API image, `sha256:49638ad02e6eb0546a6493e3dc10b27b2e901f05b4613e80ecea53bd80815bf1`, includes the five verified official package trees and passed the isolated eight-configuration check in **35.015 seconds**: **279 valid numeric results plus one expected prior-entitlement exclusion**, with zero input/output differences. Adapter, independent-reference receipt and input-helper identities remain unchanged. This image check used no network or database; it proves model execution and generated-input parity, while the integrated suite verifies application orchestration. The earlier rejected fixture-source attempt remains retained. See [container verification](references/v2-container-model-verification.md).

The separate production UI image, `sha256:215d8c5e1ca6f4d376e95ec4ae62f9f8428dbe38177c81c9d70d8a346f952796`, passed a temporary port-3006 smoke through the isolated API at port 8004 and PostgreSQL: actual cookie sign-in, bootstrap, Casey's completed run and overview each returned HTTP 200. The temporary container is disposable; port 3005 remains the V2 preview. See the [UI container receipt](references/v2-ui-container-result.json). The final [source manifest](references/v2-source-manifest.json) binds 105 application/seed/script files to fingerprint `c91d011299faccd6c851e728d5f96c251c186ab1be30f0f9bfd5a7bf0b9cf930`. This is separate-component local verification, not a Kubernetes deployment.

## Financial and export acceptance

**V2-29 is complete for the declared financial-sensitivity scope.** The 12 passing checks verify distinct MA, ACA BY2026 and external Medicaid methods, actual covered-month weights, missing-assumption refusal, signed corrections, uncertainty alternatives, authorized saved-run access, retained assumptions and unchanged scoring records. [Financial methods](references/v2-financial-methods.md) records the formulas and their limits. Actual payment remains unreconciled; these are conditional sensitivities, not payment reproduction.

Browser acceptance covers the MA path: Casey's retained 0.758 → 1.145 hypothesis produced a saved $7,932.66 baseline / $11,982.71 scenario / $4,050.05 difference under explicit synthetic assumptions, with separate ±10% payment-basis alternatives. Its retained financial JSON was downloaded through the UI and parsed. ACA and Medicaid financial calculation acceptance is from formula/API tests; their financial UI calculations were not rehearsed. The capture receipts retain the actual browser scope.

**V2-30 remains partial, with the selected-case ZIP implementation verified.** Three export checks preserve original clinical files and add immutable risk runs, exact inputs/configuration, ledgers, exclusions/precision, stages, scenario references and scoped AI replay metadata. Recalculation does not rewrite earlier runs or archives; external shared-cohort metadata is redacted with explicit original hashes, and unrelated members are absent. Browser downloads verified the overview/analytics JSONs and an Audit ZIP for Jordan and Taylor: 266 entries, 613,895 bytes, passing ZIP integrity, with original source documents and risk inputs/runs/configuration evidence. Private downloaded files remain ignored; public receipts record scope and file metadata. Complete proposed-run references on every clinical decision and broader cross-surface provenance/report acceptance remain open, so successful exports alone do not close the ticket.

## Desktop evidence

Fresh before screenshots come from the unchanged container preview on port 3002, while after screenshots use the isolated V2 preview on port 3005. The [screenshot index](../screenshots/v2/README.md) and authoritative [capture manifest](../screenshots/v2/manifest.json) retain 68 images: five matching baseline views, all 16 current route families at 1440×900, 32 additional feature views, six Jordan workflow views and nine key desktop views at 1366×768 or 1920×1080. Matching viewports do not imply identical workflow/data state. Full all-route before coverage and complete keyboard/focus acceptance remain open.

The final capture pass recorded no page/console errors. Saved views were visually inspected, and clipped filters, member IDs, intake/review controls and duplicate financial sensitivity labels were corrected and recaptured. Current screenshots show actual loaded program calculations, the separate synthetic ACA input-profile disclosure and the exact retained source/input links. The original checkout's separate enterprise styling commit, `e819e40` on `ui/enterprise-v3`, is preserved and has not been merged into this V2 worktree.

The baseline UI image is `sha256:26a7441a890aa0a5430c6fb849c0db80b9419bacd76f4857051c0073536bf44b`; its source-tree label is `3f0b436f76c34c4d6d4b3dd7768acc81f1efa8d6b4ca60f74d02fea0d12d1c25`. The baseline API image is `sha256:b14e621a5677af9b166d289d9cbb222a04e6a0c637ede6c76399cb35cfdb23b9`, source-tree label `ff59ca6032b45bf769ace2d87bc89ee0aebe9b089cfb6126448848d0784ef8a9`. No Git commit label was available for those images.

## Remaining V2 acceptance

The expanded V2 release is **not complete**. Open tickets remain unchecked in [TODO.md](../TODO.md).

- Historical V24 execution and fixed-input V24/V28 comparison still need independent reference execution/results and a reviewed common period/basis. The unavailable configuration does not satisfy this mandatory path.
- Full prior/current recapture policy, reviewed cross-model comparability, explicit not-current versus insufficient-evidence disposition and complete provider/campaign drilldown acceptance remain open. Current analytics use actual mapped runs and show unsupported comparisons honestly.
- Period movement currently retains one reconciled shared/unattributed residual. It does not claim complete demographic, population-mix, code, model and eligibility decomposition.
- Saved scenarios and member unions work; the complete historical comparison modes, proposed-run linkage in every clinical decision and scenario-to-review-task handoff need further acceptance.
- Actual AI-origin discovery/exposure/QA contribution attribution is not implemented. Existing prepared findings cannot be credited to the newly added read-only replay. Exact model-build attestation and a genuinely model-authored positive family-history example are also open.
- The external Medicaid path retains producer, model, rating, coverage and normalization groups. Full newborn/history/dual policies, group/rate-cell product coverage and broader report-score fixtures need acceptance. Exact Florida payment reproduction remains inactive without its controlling methodology.
- Complete all-route before/after verification and the full D1/D2 tour remain subject to the screenshot manifest and unmet mandatory features above. Optional ESRD/PACE execution, licensed grouping and further releases remain separately scoped.

General concurrent workflow conflict protection, real transmissions, actual payment reconciliation, production SSO and externally measured clinical/financial outcomes remain later scope. Local green checks and a successful image build do not establish cluster deployment or production readiness.
