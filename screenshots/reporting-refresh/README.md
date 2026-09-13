# Reporting refresh

The before capture shows the previously deployed AI Impact report. After captures show the redesigned reporting interface with the same frozen AI evaluation values. Operational data in the local preview is a separate preserved snapshot, so those screenshots are visual verification rather than a before/after outcome comparison.

Implementation: [palette and reporting rules](../../docs/REPORTING_DESIGN.md).

- [x] Centralize signed-in colors and remove legacy chart-specific hard-coded colors.
- [x] Replace the report dropdown with side-by-side, keyboard-accessible tabs.
- [x] Add comparison plots, an outcome matrix, composition rings, heatmaps, prevalence tiles, monthly trends and coverage gauges.
- [x] Preserve report definitions, calculation context, review gates and evidence links.
- [x] Correct operational exports to include the selected report's records and respect export permissions.
- [x] Pass TypeScript and the production Next.js build.
- [x] Finish desktop browser checks and final screenshots.
- [x] Publish and verify the automatic EKS release.

## Browser verification

All ten report tabs were opened after the production UI rendered. Checks covered keyboard tab navigation, category-to-member drill-down, grouped provider points, the operational empty state, and saved financial results without creating new clinical or financial records. Desktop layouts were inspected at 1200 and 1440 CSS pixels; the final matching before/after captures are 1910 × 932 pixels.

The financial comparison uses an existing complete result with baseline $7,932.66 and scenario $11,982.71. The ±10% assumption labels remain distinct, and the assumption and payment-reconciliation gates remain visible. The provider view accounts for all 30 practices in the local snapshot, including coincident plot points.

| Capture | View |
| --- | --- |
| [Before](before/ai-impact.jpg) / [After](after/ai-impact.jpg) | AI Impact, same frozen evaluation values |
| [Executive](after/executive.jpg) | Risk distribution and calculation coverage |
| [Providers](after/providers.jpg) | Response/workload scatter and response profile |
| [Suspecting](after/suspecting.jpg) | Workflow composition and record-count heatmap |
| [Monthly risk](after/monthly-risk.jpg) | Retained monthly area/line series |
| [Condition prevalence](after/condition-prevalence.jpg) | Distinct-member tiles with cohort links |
| [Financial sensitivity](after/financial-sensitivity.jpg) | Retained baseline/scenario and assumption comparison |

TypeScript, the production Next.js build and four existing release-boundary tests passed. No API code or clinical calculation rules changed.

## Public release

Published source: `8f40dbb187ff333ba2d78b9ee1db30a71e752bf4`.
[GitHub Actions run 34768643755](https://github.com/MahammadRafi06/citustech-perform-plus/actions/runs/34768643755) completed successfully, including both image builds, digest-pinned deployment and public HTTPS checks.

Both `ui` and `api` deployments in `meshalloc-control-plane` / `perform-plus` reported one updated, ready replica and the expected source annotation. Their digests match the corresponding immutable source tags in ECR:

- UI: `sha256:b71a3b4c828d6f95d11439088c215ac085e5ec7f6ad607a2642bcb8752888411`
- API: `sha256:ffa8767394ece18f153e4f92d4d713f48f78992da95564844b54e17879d88f0b`

An authenticated browser on [the public app](https://performplus.idaibhealth.com) showed the new ten-tab report navigation, comparison plot, outcome matrix and unchanged frozen evaluation totals. Public registry and chart review were also visually inspected; the decision controls stayed disabled until their existing gates were satisfied. No review was submitted during this check.

- [Live AI Impact](after/public-ai-impact.jpg)
- [Live Suspect registry](after/public-registry.jpg)
- [Live Chart review](after/public-chart-review.jpg)

The local preview remains available at `http://localhost:3000`; runtime details and credentials remain in ignored `.local` files.
