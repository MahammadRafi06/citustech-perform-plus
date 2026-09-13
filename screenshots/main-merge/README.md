# Combined main merge: desktop verification

These seven fresh screenshots verify the combined V2 risk workspaces and enterprise styling at merge commit `edb278e1d09adb3158796177494fd693943c6f20`. Its parents are V2 implementation `7c784088b062b6a86d957a114aac6365d9bfb460` and enterprise styling `e819e40978e04e46edf0364107cd32e6a0bed31a`.

| View | Screenshot |
| --- | --- |
| Risk overview, 1440 × 900 | [Open](01-overview-1440x900.png) |
| Casey risk profile, 1440 × 900 | [Open](02-casey-profile-1440x900.png) |
| RAF and model lab, 1440 × 900 | [Open](03-model-lab-1440x900.png) |
| Jordan chart review, 1440 × 900 | [Open](04-jordan-review-1440x900.png) |
| Riley document intake, 1440 × 900 | [Open](05-intake-1440x900.png) |
| Retained financial result, 1440 × 900 | [Open](06-financial-result-1440x900.png) |
| Jordan chart review, 1366 × 768 | [Open](07-jordan-review-1366x768.png) |

All seven images were captured from the authenticated local Next.js development runtime at `http://localhost:3005`, backed by the existing synthetic V2 API at `http://127.0.0.1:8004`. They are viewport captures taken on 2026-09-13 between 03:43:45 and 03:44:10 UTC after waiting for the rendered screen and browser paint. The [manifest](manifest.json) retains source identity, URLs, dimensions, file hashes, times and browser errors.

Each saved image was opened and inspected directly. All showed loaded application content, with no page or console errors and no document-level horizontal overflow. Review and intake primary controls remained visible, including the compact review at 1366 × 768. Lower portions of long pages and internal source/decision panels remain accessible through scrolling. The saved financial result retained its distinct ±10% sensitivity rows.

This pass read existing records and opened a retained financial result; it did not change clinical decisions, QA, source publication, submissions or financial assumptions. No application source edits were needed after visual inspection. Production build evidence is separate from the development-runtime screenshots. These checks do not establish deployment or close the remaining numerical and external acceptance gates.

The earlier [V2 evidence](../v2/README.md), including its five before/after pairs and workflow screenshots, remains unchanged as historical evidence of the V2 implementation before the styling merge. Broader implementation and acceptance details remain in [V2 verification](../../docs/V2_VERIFICATION.md).
