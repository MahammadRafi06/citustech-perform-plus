# Florida directory and geographic risk analytics

Captured from the running local production UI after data finished loading, at a 1920 × 937 desktop browser viewport. Screenshots use the browser's native JPEG encoding. The owner before/after pair and the analytics before/after pair have matching encoded dimensions.

- `before-owner.jpg` / `after-owner.jpg`: the same suspect registry, replacing Coder and Practice N provider labels with person names.
- `after-assigned-owner.jpg`: Morgan Reed's source-linked case retains its original identity and now displays Dr. Daniel Reyes as assigned owner.
- `before-risk-analytics.jpg`: the previous risk/stage report before geographic analytics existed.
- `after-geography-overview.jpg`: Florida filters, dimensional controls and reconciled portfolio totals.
- `after-county-charts.jpg`: county RAF comparison and county-by-practice heatmap.
- `after-provider-charts.jpg`: provider RAF comparison and practice heatmap.
- `after-combined-members.jpg`: second page of the Broward County / Northbrook Family Care intersection, with 25 records per page.
- `after-florida-members.jpg`: patient directory with varied fictional names and Florida county/city fields.

## Browser checks

- Owner cells display Alex Chen, Dr. Daniel Reyes and Dr. Maya Thompson; the case detail's assigned owner matches the registry.
- County, provider and combined breakdowns show 12, 30 and 71 groups respectively; pagination defaults to 10.
- Selecting the Broward / Northbrook heatmap cell applies both filters and yields 70 members with raw RAF 0.788 (rounded).
- Member pagination changes to 25 and advances from 1–25 to 26–50 with a different first member. Every displayed record retains both selected dimensions.
- The Duval / Northbrook combination displays an empty state and zero members; no score is fabricated. Reset restores the full cohort.
- The new report has no horizontal document overflow at the captured desktop viewport. Matrix labels wrap and section spacing was corrected after rendered inspection.

`verification.json` records the local API reconciliation. Clinical source identities, original evidence, review history, retained risk results and account access/passwords were preserved. Location distributions and replacement names are authored fictional data, not real Florida patient records or population estimates.

The changes have been verified locally, not deployed to the public environment.
