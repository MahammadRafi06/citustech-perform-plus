# Financial tab business review

Reviewed 2026-09-25 against production release `12b13d341d7cbab85c8d9b8fda6244bdf3e6910c`.

**Conclusion: the default arithmetic reconciles, but the page needs business-meaning and scenario-control corrections before it is a dependable executive demonstration.** In particular, it should present estimated incremental risk-adjustment value with explicit eligibility and recognition assumptions, rather than imply an established cash-payment schedule.

This was a review. No application source, clinical records, financial settings persisted in the database, or deployment was changed. Temporary browser forecast inputs were restored to the original 2027 model and defaults.

## Implementation follow-up

The requested corrections are implemented locally; see [Financial corrections](FINANCIAL_CORRECTIONS.md). The values and findings below describe the reviewed pre-correction release and remain historical audit evidence.

## Evidence and scope

- Inspected the production Financial screen, both charts, four headline tiles, three scenario rows, information text and forecast editor.
- In the production browser, tested 25% review coverage, payment-start offset 7, reset defaults and switching from the 2027 model to the 2026 model. Restored the original selection afterward.
- Reconstructed the 110,005-member fixture population independently from repository inputs. Its default financial totals and 28,797 selected candidates match the production screen.
- Ran small, independent calculation examples for payment delay, report-window sensitivity, scenario ordering and correction eligibility. Results are retained in `.local/financial-business-review/` without member-level clinical data.
- Compared the implementation with section 9 of `CitiusTech_Perform_Plus_Analytics_and_Suspecting_Full_Requirements.md` and official CMS guidance. This review is not reconciliation to actual plan payments.

## What is correct in the default calculation

| Stage | Current value | Meaning in the implemented formula |
|---|---:|---|
| Total opportunity | $70,686,240.00 | Selected positive score-equivalent increments × $1,000 × 12 months |
| Likely opportunity | $36,499,990.50 | Positive value weighted by 75% review coverage and each finding's support probability |
| Positive value after payment realization | $32,849,991.45 | Likely opportunity × 90% |
| Coding deductions | −$328,200.00 | Priced correction assumptions over the same 12-month horizon |
| Net revenue | $32,521,791.45 | Positive realization-adjusted value plus signed corrections |

The score-impact-weighted support probability is 68.85%. This explains why applying 75% review coverage alone does not produce the Likely opportunity figure.

The three default scenario endpoints are $14,231,988.30, $32,521,791.45 and $49,833,549.60. The cumulative series reconcile to their own scenario totals. The frozen positive selection is consistent across scenarios, support probability is not multiplied twice, and missing correction values are not silently converted into calculated zero. MA dollars are kept separate from the other programs' score-only views.

## Findings and recommended changes

### 1. High — artificial settlement timing changes the apparent payment history

`analytics_experience.py:331–352` recognizes 80% monthly and releases 20% at quarter-end, or at the final forecast month. This was introduced to create variation. It is explicitly an authored assumption, not an official CMS schedule, but the Financial page still looks like a cash forecast.

It also creates a reproducible inconsistency: a single candidate with 0.20 impact, 80% support, 75% review and 90% realization earns $108/month. Cumulative value through May is $496.80 in a 12-month window, but $540.00 in a five-month window, because simply ending the report releases the deferred balance. The same month should not acquire a different cash amount just because a viewer shortens the reporting window unless a separately declared liquidation/settlement assumption actually changes.

**Recommendation:** remove the arbitrary terminal release. Separate estimated value becoming eligible from cash receipt timing. For the current scope, a cumulative estimated-value chart should vary with explicitly modeled confirmation/eligibility cohorts. If cash timing is retained, anchor it to a fixed, declared schedule independent of the displayed horizon, retaining unpaid balances where necessary. Do not bend a curve solely for appearance.

CMS describes monthly MA payments and distinguishes risk-score updates and reconciliation; this does not establish an 80/20 quarterly rule. [CMS payment overview](https://www.cms.gov/newsroom/fact-sheets/medicare-advantage-risk-adjustment-data-validation-final-rule-cms-4185-f2-fact-sheet), [Medicare Managed Care Manual, Chapter 7](https://www.cms.gov/Regulations-and-Guidance/Guidance/Manuals/Downloads/mc86c07.pdf).

### 2. High — possible overcoding is automatically valued as a deduction

`analytics_experience.py:314–322` includes every visible open OC case with a numeric delta. No confirmed-correction field, correction eligibility check or distinct effective schedule is required. Current metadata assumes these corrections are valid for valuation, but the main screen calls them Coding deductions.

The current population has **151 open correction cases: 145 priced and 6 unpriced**. There are **15 members with both a selected positive addition and a priced correction**. Their impacts are combined independently without a full member-profile calculation of hierarchy and interaction effects. That makes the result an assumption-driven net estimate, not a validated joint model result.

A direct helper-level example also accepts a case marked `qualified=False` and subtracts $600 over a year. None of the current 151 fixture corrections is marked unqualified; this is a confirmed missing guard, not evidence that today's $328,200 includes ineligible members.

**Recommendation:** distinguish potential overcoding exposure from confirmed or explicitly assumed adjustments. Net only a compatible, declared correction set on an eligible exposure schedule. Recalculate combined member impacts when an addition and correction overlap, or keep unresolved mixed scenarios out of the net total. Preserve the six unpriced cases and make their reasons inspectable.

HCC hierarchy and interaction rules mean separate condition values cannot always be treated as independent increments. [CMS risk-adjustment manual](https://www.cms.gov/Regulations-and-Guidance/Guidance/Manuals/Downloads/mc86c07.pdf).

### 3. High — the scenario names stop describing a lower/base/upper range

`analytics_experience.py:325` fixes Conservative at 50% review/70% realization and Optimistic at 90%/100%, while the editor changes only Expected. In production, setting review coverage to **25%** produces:

| Scenario | Net value |
|---|---:|
| Conservative | $14,231,988 |
| Expected | $10,621,797 |
| Optimistic | $49,833,550 |

The calculation is doing what it was coded to do, but Conservative is no longer the lower case relative to the edited Expected scenario.

**Recommendation:** either derive conservative/optimistic assumptions around the user's expected scenario, with bounded probabilities and consistent ordering, or rename these as independent comparison scenarios rather than implying a range. Keep the selected cohort and candidate IDs fixed across comparisons.

### 4. High — payment delay is presented as loss of eligible exposure

`analytics_experience.py:342–345` produces no gross or positive value before the selected offset. In production, changing Payments start in month from 1 to 7 halves gross opportunity from **$70,686,240 to $35,343,120** and reduces net to **$16,096,796**. The coding deduction remains −$328,200.

This can be a valid six-month effective-value scenario. It is not merely delayed payment of a full-year entitlement. The wording fails to distinguish those meanings, and the visible assumptions summary still says 12 months from 2027-01 without showing the July onset or six effective months.

**Recommendation:** name the control First eligible revenue month if the current calculation is intended. Show actual effective month and eligible exposure in the assumptions summary. Model payment lag and retroactive adjustments separately if that is the business intent.

### 5. High — model year, forecast year and coverage are not aligned

`analytics-workspace.tsx:41,157` defaults every Financial view to January 2027. Switching the production model to **2026 CMS-HCC V28 Midyear/Final** leaves the forecast at **January–December 2027**, with unchanged financial totals. The API accepts forecast years 2024–2040 and a 24-month span without linking those dates to the selected configuration, support horizon or member-level forecast coverage.

`finance()` uses one common number of months for every selected finding, based on an authored continuation assumption, rather than retained prospective coverage. The assumption exists in metadata and help text, but the page cannot show which members/months create the value.

**Recommendation:** align default forecast dates with the selected payment year. Require an explicit, clearly named cross-year projection when intended. Use eligible projected member-months or an explicit retention/continuation assumption, and keep evidence validity, support timing and model-year rules consistent. Do not apply normalization/coding adjustments twice to impacts already on an adjusted basis. [CMS 2027 score-file guidance](https://www.cms.gov/files/document/incoming-files-cms-beneficiary-level-file-support-2027-part-c-bids-erd-risk-scores-g-pdf.pdf).

### 6. Medium — waterfall labels describe the wrong side of the calculation

The bridge contains reduction bars, but `analytics-language.ts:11–12` labels them Review & evidence and Payment estimate. The latter bar is **$3,649,999.05 removed**, not the **$32,849,991.45** expected after applying payment realization. A reader can reasonably interpret it as the payment amount.

**Recommendation:** make the reductions explicit and show signed values. Use a business sequence such as Potential RA revenue → Review/confirmation reduction → Payment realization reduction → Confirmed/assumed coding adjustments → Expected incremental RA revenue. Keep potential overcoding exposure separate unless its inclusion in net is justified.

### 7. Medium — Total opportunity conceals the one-candidate approximation

`frozen_selection()` intentionally chooses the highest base-probability-weighted positive candidate per member. That follows the current P0 specification, but it is not all independent HCC opportunity. The report has **28,797 selected candidates and 52 excluded additional/overlapping candidates**. The exclusion count is present in the API but absent from this page.

**Recommendation:** show a concise scope summary: selected members, valued opportunities, effective member-months and excluded/unpriced findings. Keep detail in an information panel; a new member-list table is not necessary. Describe the single-candidate method and avoid implying a complete upper bound or exact joint RAF calculation.

### 8. Medium — probability and payment terminology are ambiguous

Cases reviewed is a future assumed review proportion, not observed completed reviews. Payment rate is a dimensionless realization assumption, not a dollars-per-member rate or observed CMS acceptance percentage. The financial table says Standard chance of confirmation but does not expose the probability aggregation that takes the reader from Total opportunity to Likely opportunity. The $1,000 input is a user-declared sensitivity basis, not a retrieved contract/county payment amount.

**Recommendation:** use Review coverage (%), Payment realization (%), and Assumed dollars per adjusted RAF point per month. Explain the chain once in the info panel: review coverage → support likelihood → payment realization. Label the result Estimated incremental RA revenue; do not imply earned income, profit or reconciled CMS receipts.

### 9. Medium — completeness and attribution need a usable explanation

The fourth tile correctly reports six corrections without a value, but supplies no reason or breakdown. Scenario help says unvalued corrections are listed separately; only their count is visible. A reviewer cannot reconcile the 28,797 opportunities to financial totals by disease family, network or excluded reason from this screen alone.

**Recommendation:** show priced, unpriced and excluded counts with their reasons in an information panel. Add a compact value-contribution breakdown using the same frozen selection if a drill-down is introduced. Do not fill unavailable corrections with zero to make the page look complete.

### 10. Low — precision and table controls distract from the business story

The headline tiles display dollar-level precision for assumption-based multi-million-dollar forecasts; the three-row scenario table includes a 50-row pagination control. The cumulative X axis shows month names without years even when the user selects a cross-year/24-month window.

**Recommendation:** round the headline figures to $70.69M, $36.50M, $0.33M and $32.52M, retain precise values in details, remove pagination from the fixed three-scenario comparison, and show years when the forecast crosses a calendar year.

## Recommended scope for the next implementation

1. Establish one consistent financial definition: estimated incremental RA value, with cash timing separate.
2. Correct the schedule/horizon behavior, year alignment and scenario ordering.
3. Separate potential overcoding exposure from confirmed/declared adjustments; handle overlap and eligibility consistently.
4. Keep a clean executive layout: Potential revenue, Expected positive revenue, Coding adjustment/exposure, Expected net impact; two charts and one three-row scenario table.
5. Make all headline totals, waterfall steps, scenario rows and monthly series reconcile to the same eligible cohort, frozen selection and timing. Explain exclusions and assumptions through concise information panels.

Acceptance examples should include a delayed-recognition scenario, a shortened display horizon that does not rewrite earlier cash amounts, review coverage below the default Conservative template, a member with both an addition and correction, unknown correction impact, a different payment year, and a non-MA program. These are business-meaning checks in addition to arithmetic reconciliation.
