# Production performance plan

Status: application performance changes are planned; implementation has not started. A separate approved Kubernetes resource trial is recorded in [Production resource tuning](PRODUCTION_RESOURCE_TUNING.md).
Requested: 2026-09-25. Baseline source: `6f0baf665eecb6409c5ba4f4a5dbb94bfc6c6a8b`.

## Objective

Make Dashboard, Risk Analytics and Suspected Conditions respond quickly in production at the current 110,005-member population. Keep the current design, clinical meaning, calculation rules, authorized scope and evidence links. Preserve the EDS performance improvements already deployed.

This is an application performance increment. Start with the existing UI, API and PostgreSQL deployment; do not add Redis, new nodes or other paid services as a prerequisite.

## Measured baseline

These observations came from the signed-in production application at `https://performplus.idaibhealth.com`, not the development server.

| Check | Observed result |
|---|---|
| Suspected Conditions: click until 50 registry rows appeared | 20.7 seconds |
| Dashboard: full browser reload until report sections appeared | 4.8 seconds |
| Dashboard: navigation with previously loaded data | 1.6 seconds |
| EDS: navigation until report and 50 rows appeared | 1.4 seconds |
| Public login and health endpoints | About 0.3 seconds |
| Load balancer maximum application response time, preceding six hours | 30.0 seconds; several requests above 20 seconds |
| Application server errors in that interval | One 5xx response |

Browser observations are individual samples including automation overhead, not percentile measurements or a load test. Load balancer metrics combine routes and do not identify the slow endpoint. CPU throttling and memory pressure have not been verified: direct cluster access was unavailable and Container Insights metrics were absent.

Evidence retained locally: `.local/prod-performance/diagnosis.json` and `.local/prod-performance/alb-six-hours.json`. Copy aggregate measurements into the verification receipt so the final record does not depend on ignored local files.

## Source findings

- `apps/api/app/analytics_api.py`: `make()` reconstructs and scopes the population before checking the cache. A hit still decompresses and parses the complete report, including cases, even when the page requests aggregates only. The cache holds four entries; concurrent misses can calculate the same report more than once.
- `apps/api/app/main.py`: `get_state()` expands the population and enriches members on each call. Owner names also depend on current user records.
- `apps/api/app/analytics_experience.py` and `analytics_landing.py`: report preparation repeats cohort scans and deterministic per-member calculations across charts. Local profiling supports optimizing this work; local timings are not production timings.
- `apps/web/src/components/demo-app.tsx`: analytics, EDS and Member 360 rendering waits for the workflow `/bootstrap` request even though these workspaces load their own data.
- `apps/web/src/components/analytics-workspace.tsx`: the generic table constructs every React row before pagination; report requests and rendering should be separated from table navigation and evidence inspection.

## Capacity decision: would better instances help?

Possibly, if the production application is constrained by CPU, memory or competition with other workloads. That has not yet been established. Repeated report calculations and oversized response preparation remain work the application can avoid regardless of instance size.

Check actual node capacity, container requests/limits, CPU throttling, memory use and restarts during a slow request as part of PERF-01. Kubernetes enforces container resource limits even on a larger node ([resource management reference](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)).

- If container limits are the bottleneck and the existing node has spare capacity, evaluate a small resource-allocation adjustment first.
- If the node itself is saturated, evaluate a larger/faster instance and its incremental cost.
- If a calculation is mostly sequential, extra cores alone may not accelerate that individual request; measure the calculation and candidate hardware rather than assuming a larger instance will help.
- Compare identical cold and warm requests before/after any capacity trial. Retain the change only if the improvement justifies its cost.

The initial diagnostic should identify whether a capacity adjustment can provide immediate relief. The application improvements remain in the plan. The user subsequently authorized changing Kubernetes resource limits; no live limits have changed yet.

Capacity follow-up, 2026-09-25: AWS confirms the dedicated Perform+ worker is a `t3.large` with 2 vCPUs and 8 GiB memory. Over the inspected three-hour window, five-minute CPU averages peaked at 18.8%, the maximum reported CPU sample was 44.6%, CPU credit balance stayed near 864, and surplus credits charged were zero. These node-level samples do not rule out short bursts, a single busy execution thread, container throttling or memory pressure. The EKS overlay already specifies a 2 GiB API memory limit; base-manifest values alone do not describe production. Inspect effective live limits and container metrics before choosing an adjustment.

The user subsequently approved temporary access from the workstation IP. Live resource inspection and the UI CPU-limit adjustment are documented in [Production resource tuning](PRODUCTION_RESOURCE_TUNING.md). The application optimization TODOs below remain open.

## Performance targets

Targets are acceptance goals, not achieved results. Record actual results and any misses explicitly.

| User action / request | Target |
|---|---|
| Report API, already calculated for the same authorized selection | p95 <= 1 second |
| First report for an uncached selection, including computation | <= 5 seconds in each measured cold trial |
| Dashboard or Risk Analytics full reload, report cache available | p95 <= 3 seconds to usable content |
| Suspected Conditions entry, report cache available | p95 <= 3 seconds to first 50 rows |
| Navigation back to an already loaded page | p95 <= 1.5 seconds |
| Registry sort/page/evidence request, report cache available | p95 <= 1 second; controls acknowledge input immediately |
| Local table sorting or chart selection without an API request | <= 300 ms |
| EDS entry | p95 <= 2 seconds with no regression in its report results |
| Five simultaneous users, cached report requests in an isolated production build | p95 <= 2 seconds; no failed requests |

Collect at least 20 warm API samples per main endpoint and 20 warm browser samples per main route for final percentile reporting. Use three independent cold trials in an isolated production build. Verify default and narrower contract/network/provider selections. Run the five-user concurrency check outside production first; production verification remains a bounded interactive smoke test. Record build, population, filters, browser, cache state, response bytes and sample count with each result.

## TODOs and delivery order

### P0 — establish request-level evidence

- [ ] **PERF-01: Add request timing and a reproducible benchmark.**
  - Record request ID, route, total time, cache hit/miss, wait time for an existing calculation, population preparation, report calculation, serialization time and response bytes.
  - Use safe timing headers and structured logs; exclude credentials, member identifiers, raw filters, source text and report contents.
  - Cover Dashboard aggregates, Risk Analytics, the registry and evidence detail. Time the browser until actual charts/rows appear, not just until the URL changes.
  - Retain a correctness baseline for scores, counts, chart values, report hashes, case order and evidence references using representative selections.
  - **Done when:** a slow request can be attributed to a stage, and repeatable cold/warm measurements have a saved receipt.
  - **Files:** API timing/cache path, web API proxy where needed, `scripts/`, performance verification document.

### P0 — remove unnecessary work from the page-loading path

- [ ] **PERF-02: Decouple analytics pages from workflow bootstrap.**
  - Render authorized analytics, EDS and Member 360 routes without waiting for `/bootstrap`.
  - Load workflow data only for routes or controls that consume it; the notification drawer must still load and display activity when opened.
  - Keep authentication and route access checks ahead of protected content. Do not expose hidden workflow or Member 360 navigation.
  - Cache model configuration appropriately without changing session expiry or permission behavior. Avoid serial requests where there is no real dependency.
  - **Done when:** direct entry and refresh on all four main routes work if workflow bootstrap is slow or unavailable, while notifications and permitted legacy routes still work.
  - **Files:** `demo-app.tsx`, `risk-ui.tsx`.

- [ ] **PERF-03: Check report freshness before reconstructing the population.**
  - Introduce a cheap input fingerprint using compact persisted inputs before population expansion. Cover full model configuration, report/calculation/fixture versions, relevant directory changes and current access scope.
  - Normalize equivalent filter contexts so defaults and reordered multi-select values do not create needless cache entries. Preserve every filter that changes calculations or case membership.
  - Partition cached responses by authenticated user and current authorization fingerprint initially. Check current authorization on every request; a role/provider/scope change must not expose an old report.
  - Audit all relevant input writes, imports, resets, configuration updates and directory changes for invalidation. Prefer deriving the fingerprint from authoritative compact data; introduce a revision counter only if every write path can reliably update it.
  - Retain separate prepared summary responses, avoiding full case-report decompression and JSON parsing on summary cache hits.
  - Bound the cache by memory as well as entries. Measure process memory before choosing limits; expanding the four-entry cache alone is insufficient and could exhaust the current API container.
  - Let simultaneous requests for the same report share one calculation. Different report keys should not be blocked by a single global calculation lock. Clear failed work so retries can succeed.
  - **Done when:** a warm summary request does not expand members or unpack the full case report; matching concurrent requests build once; permission and input changes invalidate correctly; memory stays within measured capacity.
  - **Files:** `analytics_api.py`, compact state/configuration fingerprint helpers and focused API tests.
  - **Depends on:** PERF-01.

### P0 — make first-time calculations and responses smaller

- [ ] **PERF-04: Optimize uncached report computation.**
  - Build reusable member, provider, network, county and condition indexes once per report calculation.
  - Reuse deterministic per-member demographics, opportunity classifications and outcome values within that calculation.
  - Replace repeated whole-population scans with grouped accumulations; reuse score ordering for distribution statistics where equivalent.
  - Reuse prepared population inputs across report variants only when their complete input and authorization fingerprints match. Keep shared prepared inputs immutable.
  - Preserve rounding, stable ordering and numeric semantics. Do not reduce the population, remove report rows or substitute different values to meet timing targets.
  - **Done when:** baseline comparisons match for RAF tiles/trends, financial values, recapture, cumulative outcomes, geography/provider charts, member references and clinical provenance; cold calculation approaches the five-second target.
  - **Files:** `analytics_experience.py`, `analytics_landing.py`, population preparation helpers only where profiling justifies it.
  - **Depends on:** PERF-01 and PERF-03 design.

- [ ] **PERF-05: Separate summary, registry-page and evidence responses.**
  - Serve aggregates without registry cases, evidence bodies or large internal ID arrays that the visible page does not need.
  - Add a registry query that returns the requested 50/25/100 rows, total matching count and stable report reference. Filter and sort the complete authorized set before paging; use a stable ID tie-breaker.
  - Fetch full clinical evidence only when its panel opens, using the same authorized report/snapshot. Reject or explicitly refresh an expired/stale report reference rather than silently combining versions.
  - Keep linked Member 360 records first under the default ordering and preserve their source data. User-selected sorting must still apply across all matching rows.
  - Keep legacy full-report saves/exports/scenarios compatible. Presentation-only omission must not change clinical report hashes, export contents, source references or aggregate denominators.
  - **Done when:** changing page/sort or opening evidence reuses the report instead of recalculating population analytics; first-page responses contain only requested rows; all matching counts and cross-page selection behavior remain correct.
  - **Files:** `analytics_api.py`, analytics client/types, `analytics-workspace.tsx`, evidence panel data loading.
  - **Depends on:** PERF-03; integrate after PERF-04 output equivalence checks.

### P1 — keep navigation and controls responsive

- [ ] **PERF-06: Reuse frontend data and render only visible content.**
  - Share query data between Dashboard and Risk Analytics for equivalent selections; distinguish aggregate, registry-page and evidence query keys.
  - Adjust report freshness deliberately and invalidate it after relevant mutations. Do not extend authentication freshness or reuse data across sign-out/account changes.
  - Debounce text search and cancel superseded reads. Switching filters quickly must never let an older response overwrite the current selection.
  - For server-paged registry rows, disable a second client paging/sorting pass. For other large local tables, sort data first and construct only visible rows using the existing EDS pattern.
  - Retain fixed column widths, sort arrows, 50-row default and existing desktop design.
  - Keep the navigation usable during requests. Use the existing loading treatment; do not present old-scope totals under newly selected filter labels without an explicit updating state.
  - **Done when:** page, tab, filter, sorting and evidence interactions meet targets without stale-scope flashes, layout shifts or loss of selection.
  - **Files:** `analytics-workspace.tsx`, analytics client, shared pagination/sorting components, route/query setup.
  - **Depends on:** PERF-02, PERF-03 and PERF-05.

### P1 — verify correctness, deployment behavior and production improvement

- [ ] **PERF-07: Complete focused regression and performance checks.**
  - Extend existing analytics API tests for cache freshness, permission/provider changes, evidence access, simultaneous misses, failed builds, filter normalization and eviction.
  - Compare paginated results against the complete authorized result for sorting, no duplicates/omissions, total counts, stable IDs and the five Member 360 references.
  - Run existing analytics, landing, population, financial and member-profile checks, plus the EDS/pagination suite and TypeScript/build validation.
  - Verify saved reports, full exports and clinical stage gates remain intact despite being outside the primary visible navigation.
  - Use the full population in a production-mode build, then test restart/cache-empty behavior and five concurrent users. Recheck memory retention after repeated filter changes.
  - Do not add Redis or background workers by default. If optimized cold reports still miss the target, evaluate precomputing common reports with the existing database and record the tradeoff before expanding the architecture.
  - **Done when:** correctness comparisons pass and the timing receipt states each target met or missed; release-blocking correctness or timeout regressions remain open.
  - **Depends on:** PERF-02 through PERF-06.

- [ ] **PERF-08: Deploy and verify against the production baseline.**
  - Check current remote main, preserve concurrent changes and record exact prior UI/API image digests and release-control settings before deployment.
  - Use the existing immutable-image GitHub Actions/EKS release path. Keep UI and API endpoint contracts backward compatible during the mixed-version interval and for rollback.
  - Recheck the live deployment strategy: the repository currently specifies API `Recreate`; plan for its brief interruption instead of promising a zero-downtime rollout. Do not change strategy blindly.
  - Warm only a small set of common, authorized selections if needed, after readiness and with bounded work. Measure both warmed and genuinely cold requests; warming is not a substitute for fixing cold latency.
  - Verify both public domains, login, route navigation, fresh reload, contract/network/provider changes, registry sorting/paging and evidence panels on the exact deployed build.
  - Compare the same production interactions and AWS response/error metrics with the baseline. Confirm actual CPU/memory/throttling through authorized cluster access if available; do not infer resource pressure from repository limits.
  - If application changes still miss targets and measured resource pressure supports scaling, document the precise resource change and cost separately before applying it.
  - Restore prior release-control settings. Roll back exact UI/API image digests on wrong totals, authorization regressions, repeated timeouts, memory exhaustion or materially slower comparable requests. Keep database compatibility with the previous images; do not delete report/input data for rollback.
  - **Done when:** production results, exact source/image identities and before/after timings are recorded in `docs/PRODUCTION_PERFORMANCE_VERIFICATION.md`. Health endpoints alone do not close this ticket.
  - **Depends on:** PERF-07.

## Implementation sequence

1. PERF-01 baseline instrumentation and reproducible checks.
2. PERF-02 independent page loading, then PERF-03 safe cache lookup and shared calculation.
3. PERF-04 cold computation, followed by PERF-05 summary/registry/evidence delivery.
4. PERF-06 frontend request and table integration.
5. PERF-07 production-build regression and performance verification.
6. PERF-08 production rollout and measured acceptance.

This document plans the application optimization increment. Those code changes have not started. The separately authorized resource trial changes only the production UI CPU ceiling; see its verification receipt above.
