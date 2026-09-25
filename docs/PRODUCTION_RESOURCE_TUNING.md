# Production resource tuning — 2026-09-25

## Final applied change

The user authorized Kubernetes resource tuning and temporary workstation access to the EKS API. The Perform+ UI CPU limit was increased from **1 to 2 CPUs** on the existing worker. Its CPU request remains **100m**. The EKS overlay in `deploy/eks/kustomization.yaml` now records that change.

| Component | CPU request | CPU limit | Memory request | Memory limit |
|---|---|---|---|---|
| UI | 100m, unchanged | **2, previously 1** | 128Mi, unchanged | 512Mi, unchanged |
| API | 250m, unchanged | 2, unchanged | 512Mi, unchanged | 2Gi, unchanged |

A trial also increased the UI CPU request to 250m. That reservation increase was reverted after the measurements showed no loading-time improvement. The final retained change only raises the UI burst ceiling; it does not increase its scheduling reservation or relative CPU share during contention.

No node was added or resized. The worker remains a `t3.large` with 2 vCPUs and 8 GiB RAM, with 1,930m CPU and about 6.9 GiB memory allocatable to pods. This is not a claim of reduced cloud charges; the existing infrastructure still incurs its normal charges.

## Live findings before adjustment

The metrics API was unavailable, so container resource counters and Kubernetes node/pod specifications were read directly.

- API CPU limit: 2 CPUs. Lifetime CPU throttling: **zero**. Memory peak: **754,991,104 bytes, about 720 MiB**, below its 2 GiB limit. No memory-limit events or out-of-memory kills.
- UI CPU limit: 1 CPU. At the first inspection, **112 throttled periods totaling about 2.97 seconds** over nearly seven hours of pod lifetime. This is cumulative, not a per-request delay. After three additional Dashboard reloads, throttled time increased by only about 0.8 milliseconds.
- UI memory peak before the change: about 141 MiB, below the 512 MiB limit. No out-of-memory kills.
- Node reported no memory, disk or PID pressure. API, UI and database had zero restarts before the trial.

The API was not being constrained by its CPU quota or memory limit. Raising its limits was therefore not supported as a fix for the observed delays. UI throttling was small; the CPU ceiling change supplies burst headroom, not evidence of a resolved application bottleneck.

## Browser comparison

Same production browser/session, default Dashboard selection, full reload until the report sections appeared. Each sample includes browser automation overhead. The first request after UI replacement can include startup work. These are small samples, not p95 benchmarks or an isolated causal experiment.

| Configuration | Dashboard reload observations |
|---|---|
| Original UI allocation | 6.951s, 4.782s, 4.692s |
| UI limit 2 CPU / request 250m, initial checks | 8.177s, 5.869s, 5.225s |
| Same trial, follow-up checks | 6.024s, 4.697s, 5.507s |
| Final UI limit 2 CPU / original request 100m | 7.700s after replacement; 5.407s on repeat |

Final EDS navigation displayed its report and 50 rows in **1.510s**. Dashboard and EDS rendered successfully. The allocation trial did **not demonstrate a report-loading improvement**. The report reuse, smaller responses and calculation optimizations in `PRODUCTION_PERFORMANCE_PLAN.md` remain necessary and unimplemented.

## Deployment verification

- The server accepted the resource patch in a dry run before application.
- Both UI rolling updates completed. Final UI and API deployments each had one ready replica.
- Final live UI resources match the production overlay; the API deployment specification is unchanged.
- API and database pod UIDs are unchanged. Neither was restarted for this work.
- Both Kubernetes node UIDs are unchanged. No extra workers were created.
- UI and API use the same immutable image digests as before the change, from source `6f0baf665eecb6409c5ba4f4a5dbb94bfc6c6a8b`.
- Both public domains returned HTTP 200 for `/health` and `/api/v1/ready` during post-change checks.
- Exact pre-change deployment/pod snapshots, resource patches, rollback patch and timing samples are retained in `.local/prod-performance/k8-resources/` (ignored local evidence).

Temporary API access was removed. AWS reports the restoration update successful, and the public API allowlist is exactly the original `142.112.212.125/32`. No temporary workstation access remains.

## Rollback

If the UI ceiling needs reverting, restore only its CPU limit to `1`, leaving the existing image, CPU request and memory settings intact. A conditional JSON patch is saved as `.local/prod-performance/k8-resources/ui-resource-rollback-final.json`. Revert the corresponding UI CPU-limit override in the EKS overlay at the same time. No database or application data rollback is required.
