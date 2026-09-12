# Demo verification — 12 September 2026

## Result

D01–D06 are complete for the agreed UI-first demo scope. The checklist has **49 checked items and one open environment-deployment item** (the original image/deployment item was split into local container validation and target rollout). Local auth/RBAC, prepared AI and simulated external workflows remain the intended boundaries.

- **Final production UI image:** built successfully, including Next.js optimized compilation, strict TypeScript, route generation and standalone packaging.
- **`make check`:** passed TypeScript and Python compilation.
- **API acceptance:** **17 passed**, using an isolated temporary PostgreSQL schema; running demo records were preserved.
- **Kustomize:** final base renders locally without contacting a cluster.
- **Three-component acceptance:** final standalone UI → separate API → PostgreSQL passes real cookie login/CSRF, protected records, saved analysis and logout. UI health, API liveness and database-backed readiness return 200.
- **Persistence:** API and database restarts preserve account and workflow identity. Updating the API/UI containers preserved the dedicated database container and volume.
- **Runtime permissions:** API UID 10001 can create its private `/app/runtime/state` directory under the root-owned, GID-writable runtime mount used to model Kubernetes `emptyDir`/`fsGroup` behavior.

## Focused behavior checks

The 17 API tests cover valid/invalid login, CSRF/origin, logout/expiry, disabled accounts and revoked role sessions; practice/assigned-case scope and denied direct actions/exports; no self-QA; campaign cohort/allocation deduplication and conflicts; atomic bulk actions and duplicate evidence requests; member/signature/source validation and idempotent publication; local contact history/source rechecks; assistant scope and citation grounding; later-encounter visibility and repeat safety; saved review/QA; retained rejected correction attempts and accepted remediation; scoped CSV/ZIP content; account-preserving reset; and frozen comparison arithmetic/stability.

Python dependencies emit four deprecation warnings in the current test run; no tests fail. This is focused demo validation, not exhaustive security or production-scale proof.

## Browser rehearsal

The real local UI was exercised across analyst, coder, QA, provider2, provider6, retrieval, submission and administrator accounts. The shorter opening route and all six case stories were exercised, with evidence recorded before the presenter reset:

| Case | Verified outcome |
| --- | --- |
| Jordan | Reasoned supported review; paused draft survives refresh; resume/save; independent QA passes |
| Morgan | Neutral clarification task; scoped provider response; separately loaded signed encounter; fresh supported review awaits QA |
| Avery | Support from indirect evidence is blocked; clarification disposition remains awaiting assessment |
| Taylor | Unsupported review and independent QA; new linked correction accepted; original is marked corrected and rejected attempt remains visible |
| Casey | Connected scenario retains the selected member; official numeric score remains explicitly unavailable |
| Riley | Contact history saved; original unsigned sample fails validation; later signed source publishes and chart request becomes usable; fresh supported review awaits QA |

Additional checks included exact campaign cohort/allocation preview and activation, campaign and payload downloads, selected audit ZIP, matching registry filters and detail/back context, provider search beyond showcase practices, directory pagination and Enter-to-open rows, all nine supporting analytics views, source issue recheck, modal Escape/focus return, and guarded administrator reset. Sign-out replaces protected content with the login screen; an analyst opening Administration directly sees the denied-workspace state.

Visual inspection used **1366×768, 1440×900, 1920×1080 and 1024×768**. Source panels, forms, campaign/intake dialogs, charts, tables and compact navigation were inspected. Fixes included bounded provider-list scrolling, member-tab overflow, compact icon labels and dialog focus restoration. Temporary viewport overrides were reset afterwards.

The eighteen-minute presenter **route** was rehearsed as a working QA session with pauses for fixes. It was not a timed eighteen-minute narrated performance. The presenter guide contains explicit pacing and a shorter fallback route. No external AI, email, EHR or payer service is configured or needed at runtime; this was not an OS-wide network-disconnection experiment.

The final production-container browser pass on `localhost:3002` verified sign-in, Overview, the grounded metric assistant and denied administrator navigation. Browser logs on that origin showed only an installed extension's `share-modal.js` error. Development browser sessions also showed extension-injected `bis_skin_checked`/`bis_register` hydration warnings; no blanket application hydration suppression was added.

## Running artifacts

The dedicated project `ct-acceptance-20260912142859` remains available at **http://localhost:3002**. Its passwords are in ignored `.local/acceptance.env` (0600). Development remains available on port 3000 with the separate `.local/demo-accounts.json` account file.

| Image | Running image ID |
| --- | --- |
| `perform-plus-ui:0.1.0` | `sha256:088c689d5c1cdc8875dc2ba25b6a1564a6e38f228625e3493deb4dc605b7a958` |
| `perform-plus-api:0.1.0` | `sha256:595a0dd0cb13a2aff0a34e463012306a71fb83e4fe578ac161e842399995d957` |

Sanitized workstation evidence: `/tmp/ct-compose-final-evidence-20260912.json`, `/tmp/ct-compose-final-acceptance-20260912.txt`, `/tmp/ct-compose-persistence-api-20260912.txt`, `/tmp/ct-compose-persistence-db-20260912.txt`, and `/tmp/ct-browser-rehearsal-evidence-20260912.json`.

The original coding specification is unchanged: SHA-256 `0ae8b0e94ca51048cc3edba2e07af8613e1a6bfeef9f91ef1deae3f5bf676ffb`.

## Remaining environment validation

Registry push and actual Kubernetes rollout, ingress/TLS and PVC behavior remain pending the chosen registry, context/namespace and environment details. Two disposable local k3d attempts failed on exhausted host file watchers and were rolled back; existing clusters, kubeconfig and host sysctls were preserved. Local container checks do not establish target-cluster or production-hardening proof.
