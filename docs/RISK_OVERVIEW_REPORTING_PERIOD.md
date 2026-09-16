# Risk overview reporting period

Implemented locally on September 15, 2026.

- Risk overview now places **Run month** and **Year** beside **Program & model**. The user confirmed these represent the reporting period, not calculation execution time.
- Latest shows the latest retained results for the selected configuration year, preserving the existing full-period aggregation. A named month projects the retained monthly score outputs; tiles, distribution and exported JSON share that period.
- Year selects a configuration in that year, preferring the current program and run type. Model changes update the year automatically. The selected month remains in the URL across refresh and model/year changes.
- Model labels use year, model and run type, for example `2027 CMS-HCC V28 Initial` and `2026 CMS-HCC V28 Midyear/Final`. Forecast runs remain labeled as forecasts.
- Current 2026/2027 MA configurations display `100% V28 (0% V24)`. The 2024 and 2025 payment-year blends are ordinary selectable catalog options, as requested for the presentation. Their composition is visible without a Historical group or reference-only wording. The separate legacy V24 component stays out of this dropdown. Blend entries have no calculated scores; the validated adapters and their acceptance receipts are unchanged.
- Score basis selection moved from the overview header into four clickable score tiles: Baseline, Potential scenarios, Submitted set and Accepted set. Each tile reads its own retained score, and selecting it updates the distribution and export. Uncalculated stages display a dash rather than a fabricated zero.
- Calculation coverage and Metric definitions and denominators are removed from the overview. Their underlying data and export provenance are retained.
- Imported Medicaid results lack monthly detail, so month selection is disabled and the declared aggregate remains available. Missing monthly results remain unavailable, without falling back to an annual score or replacing missing scores with zero.
- No stored model outputs, source evidence, clinical decisions or database contents are rewritten by period selection.

## Verification

- TypeScript check and UI/API Docker builds passed.
- Five focused API tests passed (reporting-month behavior plus existing distribution checks), including zero/missing scores, scoped access, source-run preservation, invalid/mismatched periods and ACA enrollment coverage.
- Two UI helper tests passed for model labels and year selection.
- Local app refreshed at `http://localhost:3000`; UI health and API readiness passed.
- Browser inspection: all-month 2027 overview had a 120,000 member-month denominator; September 2027 had 10,000. Changing year selected the 2026 Midyear/Final configuration and rendered September 2026 results with 9,600 scored member-months and 400 excluded members. The fully rendered desktop header and monthly overview were visually inspected.
- This is focused verification of the period controls, not a new full-application audit.

The subsequent simplified-overview update passed the type check, both image builds, five reporting/basis API tests and two model-label tests. The API checks cover independent score bases, normal selectable blend entries with empty results, and preservation of existing model validation status.

Browser verification confirmed the Latest label, all four selectable score tiles, matching distribution/empty states, and the absence of the overview Score basis dropdown, Calculation coverage and Metric definitions sections. Both 2024 and 2025 blend selections updated the year and composition without a Historical grouping. The populated Baseline overview was visually inspected after rendering.

## Payment-year reference sources

These composition references apply to the non-PACE MA model context used here. Model names and calculation assets remain versioned separately from UI labels; no assumption is made about unconfigured future model years.

- [CMS 2024 rate announcement](https://www.cms.gov/newsroom/fact-sheets/fact-sheet-2024-medicare-advantage-part-d-rate-announcement)
- [CMS 2025 rate announcement](https://www.cms.gov/newsroom/fact-sheets/2025-medicare-advantage-part-d-rate-announcement)
- [CMS 2026 rate announcement](https://www.cms.gov/files/document/2026-announcement.pdf)
