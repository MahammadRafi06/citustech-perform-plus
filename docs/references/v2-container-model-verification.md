# API image model verification

Verification work performed 12 September 2026 (local time). No live database,
running container or workflow was changed by the container checks.

## Independent engine acceptance

The frozen adapter `426e247b4e9210629b2046982511895bae8bf36a810dc0ac23b711887318c630`
passed 98 acceptance tests, including 79 synthetic cases compared with separately
executed unchanged official packages. The receipt is
`2eb69895685f6649d3242c84b260181e0595715dbf46e3fb6f30e78d75f5e980`.
This covers the declared current model scopes and source/date limitations, not
the unavailable historical V24/V28 comparison.

The read-only 10,000-member MA forecast probe completed all 120,000 member-months
in 293.009 seconds. All results retained official-software provenance; no member
failed. Its detailed source/output fingerprints and chunk times are retained in
ignored `.local/model-population-verification.json`.

## Refreshed fixture and persisted-input checks

After the explicit prior-period Morgan supplement and stable-DOB/entitlement
correction, 35 members across eight configurations were checked: 279 successful
scores and one intentional prior-period exclusion, with no unexpected failures. Morgan's
PY2026 prepared inputs contain I10 and J449, producing raw 0.649; PY2027 Initial
and forecast retain I10, producing raw 0.330. These are prepared scoring inputs,
not an edit to clinical source documents or an automatic carry-forward rule.
The excluded sample, MB-000025, has no established prior aged entitlement and no
eligible prior months. The direct engine correctly returns no score; application
orchestration labels the prepared reason `BEFORE_AGED_ENTITLEMENT` as unavailable.
Across the full prior inventory, 9,600 members are expected scoreable and 400 are
explicitly excluded, reconciling to 115,200 eligible prior member-months. This is
an input-inventory check, not a new full-population prior-year scoring run.

The current input helper hash is
`d25d8a13ef0df84e1c33a1c670b19406f5d71422a106b882194534e011f2015f`.
A read-only transaction compared every saved current forecast snapshot against
that helper: **10,000 checked, 10,000 exact input-hash matches**. Proof files are
`.local/model-fixture-profiles.json` and
`.local/model-persisted-forecast-inputs.json`. The earlier fixture report is retained
as `.local/model-fixture-profiles-pre-prior-supplement.json` and
`.local/model-fixture-profiles-before-entitlement-correction.json`.

## First image attempt — superseded source, numeric parity passed

Image `sha256:8435a96d5345d21b0ba1fa841621f69d323fbda3283c462c0d862d0b02047975`
ran with Python 3.13.15, NumPy 2.4.2, pandas 2.3.3 and PyYAML 6.0.3. It executed
in a disposable container with networking disabled, a read-only filesystem, two
read-only synthetic test mounts and a private temporary output filesystem.

All **280 supplied-input numeric comparisons matched exactly**: raw and adjusted
scores, selected segments, monthly scores, every official score column, component
totals/rounding residuals and asset hashes. The adapter and validation receipt
matched the frozen local engine.

The complete image check correctly failed because its earlier input helper
(`3cfb197ad1112995d3c558623e4b82d5c78b4d3e6523bf19d775d8440beb1dd2`)
predated the PY2026 Morgan supplement. Seven configuration fixture inputs matched;
PY2026 did not. This was a fixture-source mismatch, not a numeric scoring mismatch.
The full first result is retained separately in
`.local/model-container-verification-before-fixture-refresh.json`.

## Previous rebuilt image — passed

Image `sha256:8daaff30bbf229aec278dc3ae6709bc4564c3a6cc29e9c40500126603887363c`
passed the refreshed isolated check in **33.034 seconds**. All eight current
configurations matched the local established outputs and generated input
snapshots exactly: **279 valid numeric results and one expected prior-entitlement
exclusion, 280 checked paths in total**, with zero unexpected differences.

The container used Python 3.13.15 and the same locked numerical dependencies
listed above. Its adapter, validation receipt and final input-helper fingerprints
match those recorded in this note. Every available configuration retained its
declared-scope validation status. The test used no network or database and did
not replace any running application container.

Full result retained as
`.local/model-container-verification-before-orchestration-refresh.json`, SHA-256
`c3a2905235139c777b696042754d4d5c40f117ae21f40df50bdd3a4465757eba`.
Its synthetic input/comparison artifact has SHA-256
`841653fd6e7c9c36adb65c1c3f3f1db2d1993a23d2aa00dce2e45fd36c5e8602`.
This proves the exact image's model execution and fixture parity; broader API,
UI, database and release verification are separate evidence.

## Final orchestration image — passed

Image `sha256:49638ad02e6eb0546a6493e3dc10b27b2e901f05b4613e80ecea53bd80815bf1`
passed the same isolated eight-configuration check in **35.015 seconds**:
**279 valid numeric results plus one expected prior-entitlement exclusion**, with
zero input or output differences. Every per-configuration result inventory hash
also matches the previous successful image. The adapter, independent-reference
receipt, input helper, synthetic comparison inputs, Python and locked numerical
dependencies are unchanged. Current configurations retain their declared-scope
validation status; historical V24 remains unavailable pending reference evidence.

The image was tested by its immutable ID with no network, no database, a read-only
filesystem and read-only synthetic fixtures. No running application container was
replaced. This verifies model execution and generated-input parity for the final
image; the API orchestration changes receive separate API/workflow verification.

Final result: `.local/model-container-verification.json`, SHA-256
`1592bee32dd23f5e35057e3885e66c186630ebb0eac5c08530ee1cbfb0c569e0`. The previous successful image receipt remains
preserved separately as listed above.

## Financial sensitivity verification

`apps/api/tests/test_risk_financial.py`: **12 passed**, using hand-calculated
financial examples and an isolated in-memory SQL store. Checks include missing
assumptions, actual monthly weights, no repeated score normalization, nonlinear
ACA market denominators, signed corrections, external Medicaid rate-cell rules,
scoped access, persistence, distinct low/high sensitivity labels and unchanged scoring records. The financial formulas
and their exact boundaries are documented in
[`v2-financial-methods.md`](v2-financial-methods.md). Actual payment remains
unreconciled. Source/test fingerprints are retained in
`.local/financial-verification.json`. No scoring-engine source or validation
receipt changed.
