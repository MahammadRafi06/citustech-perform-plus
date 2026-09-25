# Population and RAF trend update

The local roster grows from 10,000 to 110,000 unique members. The five linked
Member 360 reference profiles remain separate, unscored references: the MA
analytics enrollment total is consequently 110,005, while the native roster is
110,000. Eligibility, available scores, distinct suspect members and condition
counts remain separate denominators.

## Population consistency

- Existing member identities, clinical evidence, decisions and saved reports are retained.
- `population_expansion.py` generates 100,000 stable Florida identities. Unchanged
  generated rows stay in memory; edited rows are persisted and survive reloads.
- County, provider and network totals, distribution bins, prevalence, recapture,
  cumulative suspect outcomes and financial assumptions are recalculated from the
  filtered member and condition records. No display-only count multiplier is used.
- Metadata-only suspect coverage scales with the roster. These additional rows do
  not acquire fabricated clinical source documents or official calculated scores.
- The EDS encounter subset grows from 240 to 2,640 roster members (the same 2.4%
  sampling fraction), with six encounters per service year. Its IDs, names,
  contracts, networks and providers come from the same roster. The five linked
  reference cases retain their source fields. EDS is an encounter reporting cohort,
  not a claim that every enrolled member has submitted encounters.
- Regenerate that checked-in subset with `.venv/bin/python scripts/generate_eds_population.py`.
- The separate frozen AI evaluation benchmark is not enlarged; it is not the
  enrolled population and increasing its counts would imply nonexistent evaluations.

## Published references and limits

1. [CMS CY2026 Rate Announcement](https://www.cms.gov/newsroom/fact-sheets/2026-medicare-advantage-part-d-rate-announcement),
   April 7, 2025: CMS expects an average underlying annual coding trend of 2.10%.
   This is distinct from normalization and the model transition. It is not an
   observed monthly plan series, a prescribed median, or a payment forecast.
2. [CMS CY2026 Risk Adjustment Implementation Information](https://www.cms.gov/files/document/cy-2026-risk-adjustment-implementation-memo-g.pdf),
   September 29, 2025, addendum: initial scores in January, midyear scores around
   July, final reconciliation in the following year. Population status and
   retroactive changes can also affect risk scores.
3. [CMS CY2026 Advance Notice Fact Sheet](https://www.cms.gov/newsroom/fact-sheets/2026-medicare-advantage-part-d-advance-notice-fact-sheet)
   explains that the national annual average varies between plans and is derived
   from historical annual risk scores.

These references inform the chart's timing and restrained magnitude. They do not
supply this fictional population's monthly RAF observations. No public plan-level
monthly series for the four local score sets was established. The in-app information
control and report provenance identify the monthly figures as modeled estimates.

## Chart behavior

`raf_trend.py` defines a stable January-to-December profile with modest changes in
population mix, a midyear update, submission timing and narrowing open opportunity.
There is no repeated six-point wave and no wrapping into an unlabeled previous year.
Selecting February shows January and February only. Later selection retains earlier
values when the same cohort and weighting are used. The final point always equals
the selected score tile. Baseline < Accepted <= Submitted < Potential is preserved.

The higher-acuity member-score distribution is calibrated at the member level;
the median is never hardcoded in the UI. On the default 2027 forecast baseline,
the browser displays median **1.100**, 90th percentile **1.589**, baseline **1.143**,
accepted **1.172**, submitted **1.176**, and potential **1.197**.

Native model calculations, clinical evidence gates, official coefficients and
receiver events are unchanged. Current financial forecasts continue to use their
existing suspect-impact and probability definitions rather than population RAF
medians or national payment growth rates.

## Verification

- Reconcile county/provider totals to enrollment; histogram to scored population;
  network totals to eligibility; prevalence denominators; recaptured plus missing;
  cumulative identified equals closed plus open; financial monthly totals.
- Check unique IDs, idempotent expansion, compact persistence, edited-row roundtrip,
  provider isolation, reporting-month score ordering and latest tile alignment.
- EDS tests cover all 20 reports, stage subsets, member-level financial arithmetic,
  filtering, final eligibility and shared-roster identity consistency.
- Aggregate pages omit the unused registry payload. Report cache entries are
  compressed and bounded; population traits and cohort scans are reused.
- Validation: 84 analytics tests, 10 isolated API checks, 12 EDS/report tests
  covering all 20 reports, TypeScript validation and four deployment checks passed.
- Browser inspection: populated Dashboard, Risk Analytics financial forecast and
  EDS acceptance reports. The default distribution shows median 1.100.

## Continuing-member model transition correction

The 2025-to-2026 waterfall now separates model impact from newly captured conditions.
For each paired MA member, the same prior-year clinical profile has authored V24
and V28 scores. The 2025 endpoint is 33% V24 / 67% V28; Model Impact replaces the
remaining V24 share with V28. Captured Conditions and the loss of unrecaptured
prior-year conditions then reconcile exactly to the member's 2026 baseline.

- The prior V24 score is 8%–14% higher than V28 in this authored cohort. This is a
  cohort assumption, not an official coefficient or a rule for every member.
- Newly captured conditions contribute 1.2%–3.6% of the current score when present;
  unrecaptured prior conditions remove 1.8%–4.2% when applicable. Source member
  diagnoses, evidence, score tiles and clinical calculations are not changed.
- The information control exposes the like-for-like V24 and V28 averages. The
  endpoints identify the 2025 blend and 2026 V28 so a payment year is not mistaken
  for a pure model version. Part D and ACA retain their separate annual comparison.
- [CMS CY2025 Rate Announcement](https://www.cms.gov/newsroom/fact-sheets/2025-medicare-advantage-part-d-rate-announcement)
  confirms the 33% / 67% blend; the CY2026 announcement above confirms 100% V28.
  Its -3.01% combines model revision and FFS normalization and is not used as an
  isolated model coefficient here.
- Tests verify paired clinical profiles, blend arithmetic, negative model impact,
  exact waterfall reconciliation, scoped cohorts and non-MA separation.
