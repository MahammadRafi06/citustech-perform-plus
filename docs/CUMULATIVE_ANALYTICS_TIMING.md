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

## Revenue forecast

The full-period value, selected findings, scenario probabilities, review/payment rates, per-RAF benchmark, and signed coding deductions are preserved. The change is an explicit cash-timing assumption: 80% of each active month’s earned value is recognized that month; 20% is held for calendar quarter-end reconciliation. Any remaining balance settles at the final forecast month. This is not an official CMS payment schedule.

Positive earned value starts at the selected payment-start offset. Coding deductions remain effective from the first forecast month. A zero-review scenario may correctly be negative; the chart never forces it positive. Gross and likely opportunity remain accrued monthly values. Realized value includes releases of earlier deferred payments, so a reconciliation month can exceed that month’s earned value.

At each month, cumulative realized value + deferred balance = cumulative earned value. Final deferred balance is zero. Net = realized value + signed coding deductions. Every cumulative curve ends at its scenario-table total, including partial-year, delayed-start and 24-month forecasts.

Timing details are available through the chart information icons. Source metadata retains the authored origin and timing version. This does not establish actual CMS receipts or a clinical outcome history.
