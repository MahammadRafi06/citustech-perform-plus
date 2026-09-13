# Financial sensitivity methods

Verified 12 September 2026. These are conditional financial scenarios, separate
from saved model outputs, clinical decisions and imported actual payments.

**MA.** The bounded method sums saved, matched monthly raw or adjusted scores,
multiplies by a declared PMPM payment basis and an explicitly documented further
payment multiplier, then compares scenarios. Saved adjusted scores already retain
their applicable normalization/coding transformation. No transformation is applied
again. This is a sensitivity formula, not reproduction of CMS capitation.

**ACA BY2026.** CMS's [2021 technical paper](https://www.cms.gov/files/document/2021-ra-technical-paper.pdf),
pages 8–10 and 12, describes enrollment-weighted PLRS, the risk/rating transfer
terms and the 14% statewide-premium adjustment. The implemented state transfer is:

`[(PLRS_i × IDF_i × GCF_i) / Σ(s_j × PLRS_j × IDF_j × GCF_j) −
(AV_i × ARF_i × IDF_i × GCF_i) / Σ(s_j × AV_j × ARF_j × IDF_j × GCF_j)]
× adjusted market premium × target billable member-months`.

Target PLRS uses saved CSR-adjusted enrollee outputs, without another CSR
adjustment. Both scenario denominators are recomputed using declared market
shares and peer-plan inputs; target PLRS cannot be supplied manually. All market
and premium estimates remain explicit assumptions.

The [2026 final rule](https://www.govinfo.gov/content/pkg/FR-2025-01-15/pdf/2025-00640.pdf),
pages 24–25 (Federal Register 4447–4448), retains the transfer formula and the
high-cost pool's $1 million threshold/60% coinsurance, and sets the $0.20 PMPM
user fee. This tool accepts separately declared high-cost payment/charge and
validation amounts; it does not derive them from claims, perform RADV, or
reproduce EDGE. Additional year adjustments must be explicitly declared. The
named example's 0.86 premium factor and 0.20 fee are reviewable inputs; monetary
bases, peer scores, pool shares and zero ancillary amounts are synthetic.

**Florida Medicaid.** Imported score / declared rate-cell normalization divisor
(or directly supplied normalized score) × declared state factor × capitation
basis × retained covered months. Program, rating period and rate cell must match
the retained external runs. This is a declared relative-score sensitivity; no
unverified state grouper or AHCA payment formula is inferred.

Missing required assumptions produce an incomplete result without money. Signed
score corrections retain negative effects. User-declared uncertainty varies the
payment/premium basis and, for ACA, peer PLRS; these are sensitivity alternatives,
not statistical confidence intervals. Only a new financial record and audit event
are written. Actual payment remains unreconciled.
