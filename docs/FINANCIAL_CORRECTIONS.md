# Financial page corrections

## Definition

The page estimates **incremental risk-adjustment revenue from selected positive opportunities**, before costs. It does not represent total plan revenue, reconciled payments, cash receipts, profit or net revenue after validated coding corrections.

- Potential RA Revenue: sum of selected adjusted-score-equivalent increments × entered dollars per RAF point per month × covered-member share × eligible months.
- Evidence-Adjusted Revenue: applies the explicit phase-in fractions, review coverage and per-finding support probability.
- Expected RA Revenue: Evidence-Adjusted Revenue × payment realization.
- Potential Overcoding Exposure: magnitude of separately valued possible corrections over the same eligible months and covered-member share. It is not subtracted from positive revenue or represented as a confirmed recovery.

The same frozen highest base-probability-weighted positive candidate per eligible member is used in all scenarios. Additional candidates remain excluded to avoid stacking individual score impacts. Full member-level hierarchy/interactions are not modeled by this single-candidate estimate. Details expose excluded counts and expected value by disease family, reconciling to the headline value.

## Forecast controls

Default Expected inputs: 75% review coverage, 90% payment realization, $1,000 per adjusted RAF point per month, 100% projected covered-member share, January–December of the selected payment year, and a three-month equal-cohort value phase-in. These are authored forecast assumptions, not observed plan parameters. Phase-in is a separate assumed effective-value schedule, not a derived probability of clinical confirmation or a CMS payment schedule. Immediate value remains selectable.

The model year controls the calendar. Switching payment year carries the assumptions into that year's calendar, with dates and duration constrained to December. A future cross-year forecast requires a separate model/eligibility design; this UI no longer quietly projects one year's assumptions across another.

Conservative uses Expected review coverage × 2/3 and payment realization × 7/9, with low support probabilities. Optimistic uses Expected review × 1.2 and realization ÷ 0.9, each capped at 100%, with high support probabilities. These sensitivity bounds follow edited Expected inputs. All scenarios have the same selection, coverage, dates and phase-in.

One-third / two-thirds / full value over three months creates an explainable ramp, then constant value once fully phased in. Shortening the forecast retains exactly the same earlier monthly values. There is no quarter-end or terminal balance release. Later first eligibility reduces prospective revenue, not merely delays its receipt.

## Exposure and completeness

Unconfirmed overcoding remains separate. Ineligible members, stale evidence, unresolved HCC mappings, unavailable impacts and mixed or multiple correction cases are omitted from exposure with explicit counts/reasons. A hidden positive addition still marks a member as requiring a joint calculation for their correction, so child filters cannot manufacture a safe standalone correction. No unknown amount is converted into a valued zero.

Original source findings, clinical gates, Member 360 evidence and clinical records are unchanged. MA dollar estimation stays separate from ACA, Part D and Medicaid score-only views. The engine retains provenance metadata for authored score and coverage assumptions.

## Presentation

Four compact monetary tiles, a signed revenue waterfall, cumulative scenario chart and three-row sortable comparison. The scenario table has fixed widths and no unnecessary pagination. Year-aware dates, visible eligibility/coverage assumptions, an eight-field editor, and Calculation Details support reconciliation without a member list. Potential exposure is clearly separate from revenue.

## Verification

- 110 tests passed across the Financial/analytics experience and landing analytics suites, including independent golden arithmetic, low/zero/full rates, later eligibility, shortened horizons, coverage share, child filters, unmapped HCCs, mixed-member corrections, missing impacts, year boundaries and non-MA isolation.
- TypeScript and optimized Next.js production build passed.
- Reconstructed all 110,005 fixture members independently and reconciled the selected opportunity totals, disease contributions, exposure counts and scenario endpoints.
- Local browser checks: 25% review coverage preserves scenario order; July eligibility shows six eligible months; switching to the 2026 model updates the full calendar; ACA remains score-only. Additional browser checks verified Immediate value with 50% covered-member share, network-scoped totals, the eight-field forecast editor, and the detailed exclusion/disease-family panel. Rendered chart/table screenshots were inspected at 1910 × 932. Sorting retained identical column widths and no horizontal page overflow; the three-row comparison has no pagination. The preview is restored to all networks, 2027 and default assumptions. The final waterfall shows signed reductions ($5.89M phase-in, $31.34M review/evidence, $3.35M realization), ending at $30.11M.

Default corrected valuation: 28,796 opportunities, 48 overlapping candidates excluded, 345,552 projected covered member-months. Potential $70,687,440.00 → phased $64,796,820.00 → evidence-adjusted $33,457,252.125 → expected $30,111,526.9125. Potential exposure $300,720 across 129 suspects. Of 151 total open overcoding findings, 16 need joint member calculations and 6 lack a score impact. Five positive findings have unresolved HCC mappings and are not valued; where appropriate, a different eligible candidate for that member is selected. These counts and reasons appear in Calculation Details.

The default Expected total differs from the reviewed release because the former unconfirmed deduction is separated and the prospective phase-in reduces eligible value. No arbitrary cash settlement is used.

## Primary references

- [CMS MA payment and supported-diagnosis overview](https://www.cms.gov/newsroom/fact-sheets/medicare-advantage-risk-adjustment-data-validation-final-rule-cms-4185-f2-fact-sheet)
- [CMS 2027 beneficiary-level risk score guidance](https://www.cms.gov/files/document/incoming-files-cms-beneficiary-level-file-support-2027-part-c-bids-erd-risk-scores-g-pdf.pdf)

These establish the payment/score context; they do not validate the authored dollar basis, support probabilities or prospective phase-in assumptions used by this application.

Local availability note: the first cold full-population report after the final API restart hit the existing 30-second proxy timeout. Retrying completed with HTTP 200 in about 1.6 seconds, and the final page rendered correctly. No performance settings, proxy timeouts or production resources were changed; the separate performance task remains paused.
