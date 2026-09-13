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
- [ ] Publish and verify the automatic EKS release.

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
