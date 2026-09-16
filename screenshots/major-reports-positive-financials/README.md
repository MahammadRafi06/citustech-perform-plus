# Major report screenshots — positive financial outlook

Captured and visually inspected from **http://localhost:3000** on September 15, 2026 (America/Toronto), after data, charts and fonts rendered. Desktop viewport: **1440 × 900**; full-page images preserve the complete report at the same width.

Open [the visual gallery](index.html), or select a full-page report below.

| Report | Screenshot |
|---|---|
| Financial scenarios | [Open](after/financial-full.png) |
| Executive risk overview | [Open](after/overview-full.png) |
| Risk distribution, HCC burden & recapture | [Open](after/risk-conditions-full.png) |
| Florida geography | [Open](after/geography-full.png) |
| Assigned practices & provider opportunity | [Open](after/practices-full.png) |
| Suspect analytics & support likelihood | [Open](after/suspecting-full.png) |
| RAF Intelligence & model scenarios | [Open](after/raf-intelligence-full.png) |
| Accuracy & overcapture | [Open](after/integrity-full.png) |
| AI Impact | [Open](after/ai-impact-full.png) |
| Report library | [Open](after/reports-full.png) |
| Suspect registry | [Open](after/registry-full.png) |

## Financial outcome

Illustrative MA, payment year 2027, Later-run forecast, Latest reporting period, all contracts/counties/practices, adjusted score, September snapshot. Default assumptions remain 75% reach, 90% realization, $1,000 monthly sensitivity basis, 12 months starting January 2027, recognition beginning month 1.

| Scenario | Before net | Updated net |
|---|---:|---:|
| Conservative | -$6,867 | **$623,066** |
| Base | $407,676 | **$1,826,837** |
| Optimistic | $824,532 | **$2,989,133** |

Gross positive opportunity is **$4,990,560**, support-weighted opportunity **$2,377,152**, and signed corrections remain **-$312,600**. All figures are rounded for display; full precision is used for calculations.

The shared version `analytics-population-2026.4` adds 1,200 deterministic, metadata-only capture questions to synthetic members without retained questions. The current eligible frozen positive candidate set is 1,952. No probabilities were increased, corrections removed, negative results clamped, or chart quotations invented. Native scores and clinical findings remain unchanged. Correction-only filters or adverse custom assumptions can still produce negative results. Older saved reports retain their original values. A new saved report, **Florida financial outlook · Expanded capture opportunities**, was created and reopened in the browser with all three positive totals intact.

Overview RAF ordering is preserved: **Baseline 1.014 < Accepted 1.036 ≤ Submitted 1.040 < Potential 1.056**.

- [Before financial report](before/financial-full.png)
- [Updated financial viewport](after/financial-1440.png)
- [Verification receipt](verification.json)

## Verification

- 63 API/analytics tests passed, including financial arithmetic, default positive scenarios across all three snapshots, individual counties/practices/contracts, deterministic scope, saved reports and exports.
- Web TypeScript check and API/UI production image builds passed.
- Browser checked all screenshots after rendering and inspected each full-page image. The authored/retained data label was corrected during inspection.
- Only the local `perform-local` API/UI were refreshed. The existing database/accounts and unrelated services were preserved. Nothing was pushed or deployed to AWS.
