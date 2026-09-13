# Official risk-model adapters

This package provides `catalog()`, `calculate(config_id, input_snapshot)`,
`calculate_many(config_id, input_snapshots)`, and `lookup(config_id, query, limit=30)`.
It has no database connection and changes no clinical or business record. Callers
retain immutable inputs, results and clinical-review provenance.

## Install and reproduce

The official archives are intentionally not committed. `assets.json` retains
their public CMS origins, archive fingerprints and the complete original file
inventory of each selected component. No standalone license was found in the
inspected downloads; this manifest does not invent redistribution rights or an
SPDX identifier. The installer fetches originals, checks hashes, extracts safely,
and verifies exact component contents before installing them.

```sh
python scripts/model_assets.py install --dest .local/model-assets
python scripts/model_assets.py verify --dest .local/model-assets
```

For an existing verified download cache, add `--cache .local/research --offline`
to installation. Set `CT_MODEL_ASSETS` to the installation directory, and
`CT_MODEL_PYTHON` to the isolated scoring interpreter. The default asset path is
the checkout's `.local/model-assets`; the default interpreter is the API's Python.

The tested numerical dependency versions are `numpy==2.4.2`, `pandas==2.3.3`, and
`PyYAML==6.0.3`. The independent harness and adapter acceptance used Python 3.14.6;
the repository API dependency lock is the deployment authority. Dependencies
must be available in the scoring interpreter. Original packages are copied to
private temporary directories and invoked through their own unchanged CLI.
Different versions never share an import namespace or writable input CSVs.

```sh
.local/model-venv/bin/python apps/api/tests/model_reference/generate.py
.local/model-venv/bin/python apps/api/tests/model_reference/validate.py
```

`generate.py` never imports the application adapter. It stages synthetic raw
official-format input files, executes each untouched stock package separately,
and freezes all numeric score columns and intermediate flags. `validate.py`
runs the acceptance suite and writes `validation-receipt.json` only after every
test passes without skips and the tested files remain unchanged. The receipt
binds exact adapter bytes, archive/component hashes, all declared segments,
reference files, test harness, test execution and dependency identities.

`catalog()` rechecks installed official assets and the receipt. A stale or
missing receipt cannot produce `validated for declared scope`. This means numeric
parity for the stated cases and profiles, not exhaustive clinical, payment or
regulatory validation. Application activation must also bind the adapter hash.

## Input and output

Every snapshot requires a stable `member_id`, ISO `dob`, official numeric `sex`
(1 or 2), and unique effective `enrollment` months in the configuration's year.
Medicare snapshots require actual `orec` (0–3), explicit `dual_status`
(`none`, `partial`, `full`) and explicit Boolean `medicaid`, `institutional`,
`new_enrollee`, `c_snp`, `esrd`, `pace`, and `lis` for every month. New-enrollee
eligibility selects the corresponding profile before the continuing-enrollee
institution/community selection; a flag is an eligibility input, not inferred
from the number of submitted diagnoses.

Diagnosis occurrences require `id`, `code`, `service_date`, `source_id`,
`encounter_id`, `source_type`, `eligible_service: true`, and explicit
`audio_only`. Code mapping or a signed chart does not establish eligible service.
The caller must retain and review the source-policy classification and actual
encounter metadata. Voids, replacements, duplicates, dates, modality, source type
and the declared unlinked-chart-review exception are evaluated before generating
the narrower official diagnosis CSV. Exclusions retain occurrence/source IDs.

ACA adds `aca.metal` (P/G/S/B/C), `csr_indicator` (1–11),
`enrollment_duration` (1–12 from actual enrollment), and `last_enrollment_date`.
Age at last enrollment is derived. `ndc` and `hcpcs` records retain IDs, codes,
service dates and source IDs. Their official RXC/ACF effects are calculated by
the untouched HHS package; Part D does not use drug fills as diagnoses.

Batch results have exactly the input order and cardinality and include
`member_id`. Each has `status`, `errors`, `exclusions`, hashes, selected segment,
monthly outputs, raw/adjusted scores, factor contributions, retained/suppressed
categories and provenance. Invalid members do not block valid siblings. A
runner failure returns failed results without substituting an earlier score.

The runner executes distinct effective vectors together and reuses previously
computed vectors only after current source eligibility has been validated.
Identity and provenance remain per input. Chunks of 100–250 are suitable for
persisted jobs. Monthly changes to LTIMCAID/NEMCAID use separately executed
official input profiles; `monthly_reference_outputs` and provenance identify
their exact outputs. Factor ledgers weight only the applicable months.

Canonical stock scores retain three decimals. Monthly aggregation and annual
adjustments retain six decimals; ledger terms retain nine with an explicit
rounding residual. The ledger reconciles to the selected official output within
the declared three-decimal rounding tolerance. MA normalization and coding
adjustment and Part D normalization are separately cited application transforms;
HHS CSR comes directly from the official output and is never applied twice.

## Explicit limitations

- PY2027 Initial uses service dates July 2025–June 2026. The separately named
  later-run forecast uses Initial software on January–September 2026 inputs.
  Original clinical source dates are never rewritten to fit Initial.
- The current HHS release's verified ICD validity covers January–September 2026.
  Later dates need an updated verified asset. DIY enrollee scores do not reproduce
  EDGE processing or actual transfers.
- Historical ordinary V24 is registered but unavailable. Its official PY2025
  SAS package exists, but an entitled SAS oracle or independently established
  equivalent reference has not been supplied. No invented coefficients or score
  fallback is used. PACE and MA ESRD require separate configurations.
- The HHS output filename contains V0825 despite the verified BY2026 package.
  Catalog provenance preserves this upstream alias. The stock infant export
  also retains pre-reassignment male age flags; the explanation uses the actual
  documented scoring reassignment when evidenced by the official age/severity
  output. Raw stock scores remain unchanged, and reference cases cover it.
