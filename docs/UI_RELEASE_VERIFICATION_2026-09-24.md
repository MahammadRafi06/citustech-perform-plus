# UI release verification — September 24, 2026

## Changes

- Shared application header: blue square grid, PERFORM+ wordmark and Risk Adjustment Module label.
- Superuser display name: Albert Riera. Existing passwords, roles and sessions are preserved.
- EDS: shared heading, table and palette styles; redundant information icons removed; report terminology refined while retaining MAO-002 and MAO-004.
- Suspected Condition Registry: added a right-aligned Priority Score column, with matching typography and adjusted column widths.

## Priority score

The registry displays a stable, read-only index from 0 to 100. Evidence strength contributes up to 60 points (Strong: 60, Moderate: 39, Limited: 18). Absolute RAF impact contributes up to 40 points, reaching 40 at 0.500 RAF. Both additions and coding corrections use the same scale. Unknown evidence or missing impact produces an unavailable value rather than an invented score.

Member 360 rows use their source evidence grade and displayed RAF contribution. Their confidence percentages are not used as closure probabilities. The index does not modify clinical records, source confidence, RAF calculations, financial projections or existing row ordering. The header and cells expose the calculation on hover.

## Verification before release

- TypeScript check passed.
- 19 UI/report tests passed, including priority monotonicity, correction parity, bounds, missing inputs and preservation of Member 360 confidence semantics.
- 4 deployment-boundary tests passed.
- 2 targeted API migration tests passed in an isolated database schema, including display-name migration without password, role or session changes.
- Desktop browser review: Dashboard, all four visible Risk Analytics tabs, all 20 EDS reports, the updated suspect registry and its evidence drawer.
- Registry priority values populated; no horizontal page overflow at the inspected desktop viewport. Table alignment, chart rendering and shared typography inspected visually.

Production image builds and rollout are verified by the release workflow. These application checks do not validate clinical accuracy or live payer processing.
