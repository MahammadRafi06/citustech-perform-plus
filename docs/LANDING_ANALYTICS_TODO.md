# Risk overview: interactive analytics

Build on the current analytics-only experience and finish the plain-language pass.

- [x] Opportunity matrix: cohort-size bubbles, chance of closure and expected score gain; inspect a group and open an exportable suspect list.
- [x] Yearly condition confirmation: prior-year → confirmed / still missing funnel and condition-by-practice or month heatmap.
- [x] V24 / V28 comparison: disease-family waterfall with a reconciled score bridge and clearly stated sample assumptions.
- [x] Provider outcomes: additional HCCs confirmed, suspect rules closed and closure rates over time; provider and specialty filters. No chart-sending, alerts or operational metrics.
- [x] Social needs: Florida county clusters and age, gender, ZIP, race and social-needs filters. Sample attributes stay separate from clinical source records.
- [x] Preserve permission scope, small-group protection, scoring, financial definitions, original evidence and immutable saved reports.
- [x] Test filter/export agreement, chart arithmetic and scope; build and run locally; inspect fully rendered desktop screens and save screenshots.
- [x] Complete plain-language review of the visible screens.

All new authored attributes and model comparisons are sample analytics, not native CMS calculations, observed provider performance or documented member social needs. No workflow records or clinical decisions are created by chart interactions.

## Verification

- 63 projection and dashboard tests passed; 6 API tests passed (69 total). New tests cover matrix drill-through/export agreement, recapture reconciliation, provider outcome counts, demographic authorization, small groups, and existing score/financial ordering.
- TypeScript check and production UI/API builds passed. Local API and database healthy; UI running at http://localhost:3000.
- Browser: priority chart opened 501 suspect records; Heart failure / 80% closure opened 71. August diabetes heatmap and report both showed 1,720 of 2,350 confirmed. Provider and specialty filters changed closed-rule and confirmed-HCC totals. Social-needs and ZIP filters changed the population; county drill-through preserved selection.
- Fixed a no-op URL-state history write that could cancel chart navigation. Inspected and corrected overlapping county labels and waterfall scaling.
- Financial report remains positive: total opportunity $4,990,560; likely opportunity $2,377,152; coding deductions -$312,600; net $1,826,837. No corrections were clamped or removed.
- Plain-language review covered the six analytics tabs, report library, suspect list, model/data tabs, administration sections and all four login carousel slides. Technical model/source identifiers remain accessible.
- Desktop screenshots in `screenshots/landing-analytics/` and `screenshots/plain-language/`. No cloud deployment or remote push in this task.

## Data boundaries

Closure probabilities, provider historical outcomes, race/social-needs/ZIP attributes and the V24/V28 bridge are deterministic sample analytics, explicitly labelled in the UI. Provider charts count coding outcomes, not sent charts, alerts, assignments or operational throughput. Original clinical findings and source evidence are never changed by these charts.

Provider/specialty, disease-family and heatmap controls explore the loaded report; report exports contain their full comparison data. Population filters and opportunity drill-through criteria are carried in the report context. Saved reports remain immutable; older reports without the new panels offer a link to the current dashboard.

References for terminology only (not sources of sample scores): [CMS risk-adjustment model files](https://www.cms.gov/medicare/payment/medicare-advantage-rates-statistics/risk-adjustment), [CMS social-needs webinar](https://mmshub.cms.gov/sites/default/files/Public-Webinar-CMS-Health-Equity.pdf).
