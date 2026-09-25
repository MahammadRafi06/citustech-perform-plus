# Cumulative analytics timing

## Suspect outcomes

The Dashboard and Risk Analytics Provider tab use the same member/condition event history. Each suspect has one identification month and, only if its retained disposition is closed, a separate closure month. Confirmed HCCs remain a subset of closed suspects.

The authored January–September calendar assigns identification weights of 20%, 9%, 7%, 14%, 8%, 6%, 16%, 11%, and 9%. This represents larger initial and quarterly detection runs followed by smaller refreshes. Individual event dates use a stable identifier-based allocation. This is a presentation assumption, not a claim about actual clinical activity or a measured seasonal effect.

Closure delays are drawn from the same month through three months later, weighted 12:42:30:16. For terminal cases already known to be closed by September, only delays within that retained period are eligible. Unresolved suspects do not receive a closure date. Existing final identification, closure and confirmation counts remain unchanged.

At each month:

- Total identified is cumulative new suspects, counted once.
- Total closed is cumulative dated closures, including supported and unsupported outcomes.
- Closed — HCC Confirmed is a subset of Total Closed.
- Still Open = Total Identified − Total Closed.
- Monthly closures may exceed newly identified suspects when older backlog is resolved. The monthly closure rate therefore uses opening backlog plus new suspects as its denominator.

Changing a reporting month truncates the fixed history; changing a network/provider filter selects the same dated events. Neither operation redistributes dates. Monthly new/closed counts feed both cumulative charts. No clinical finding status or evidence is changed.

## Financial value forecast

The Financial tab estimates prospective incremental RA revenue, not cash receipts. The earlier 80% monthly / 20% quarter-end settlement assumption has been removed. Changing the report horizon no longer releases a balance or changes earlier months.

The forecast stays within the selected model's payment year. Its first eligible month controls when prospective value starts; moving it later reduces eligible exposure and does not represent delayed or retroactive payment. The covered-member share is an explicit constant continuation assumption applied to eligible member-months.

Value phase-in is separately editable: Immediate, or equal thirds becoming effective over the first three eligible months. The latter is an authored sensitivity assumption, not observed confirmation timing or a CMS payment rule. In a three-month phase-in, the monthly value fractions are 1/3, 2/3, then 1. A forecast that ends before phase-in completes does not accelerate the remaining value. Constant later monthly value is deliberately retained rather than adding artificial fluctuation.

All scenarios keep the same eligible positive selection (one candidate per member), dates, coverage share, phase-in and dollar basis. Conservative/Optimistic review and realization rates are derived around the edited Expected case, and use the lower/upper support estimates. Thus Conservative ≤ Expected ≤ Optimistic holds for every cumulative month, including zero-input cases.

Possible overcoding is an independent exposure, never an automatically confirmed deduction. Noneligible, stale and unpriced findings are excluded from valuation with reasons. Members with both an addition and correction, or multiple corrections, require joint member-level recalculation before their correction exposure is priced. Positive revenue remains a single-addition estimate; it is not labeled net revenue. The separate potential exposure uses the same eligible months and covered-member share.

See `FINANCIAL_BUSINESS_REVIEW.md` for the historical issues and `FINANCIAL_CORRECTIONS.md` for the implemented definitions and verification.
