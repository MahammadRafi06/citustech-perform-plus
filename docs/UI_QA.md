# UI redesign verification

Verified locally on September 12, 2026 against the separate UI, API and PostgreSQL containers at `http://localhost:3002`. The development workspace remains available independently. No Kubernetes cluster rollout was performed.

## Delivered scope

The supplied redesign brief was read in full and all nine original reference screenshots were inspected. The shared shell now uses a white task-grouped navigation rail, compact header, IBM Plex Sans, consistent spacing and controls, and plain text statuses without colored backgrounds or dots. Desktop use is the accepted scope; mobile design was excluded by the user's later instruction.

The registry has compact category views, persistent filters and selection, 25/50/100 pagination, density controls, and source-linked details. Chart review has its own source-led workbench, independent source/decision scrolling, document controls, an initially unselected decision and explicit clinical gate reasons. Campaign creation uses four routed stages with device-local drafts, a frozen allocation preview and transaction-level version/coverage validation. Intake centers the source alongside matching and eligibility checks and previews local TXT/PDF files. Overview, all ten analytics views, member directory and detail, providers, chart chase, coding QA, pre-visit, submissions, audit, data operations and administration use the shared design system.

Clinical source wording, source IDs, signature/date metadata and synthetic provenance remain intact. Known fixture-authored review context is separated from the displayed clinical passages, with complete-source access retained. Clinical and independent QA gates remain enforced. The frozen AI comparison and its denominators are unchanged; current operational activity is identified separately.

## Automated checks

| Check | Result |
| --- | --- |
| `make check` | Passed: strict TypeScript and Python compilation |
| `.venv/bin/python -m pytest apps/api/tests -q --tb=short` | 18 passed, using an isolated temporary PostgreSQL schema |
| `docker build -f apps/web/Dockerfile -t perform-plus-ui:0.1.0 .` | Passed: production compile, TypeScript and route generation |
| `docker build -f apps/api/Dockerfile -t perform-plus-api:0.1.0 .` | Passed |

The added API regression checks reject stale campaign recommendation versions and changed coverage without creating the campaign; a fresh retry succeeds. Existing role restrictions, clinical gates, source eligibility, correction/history behavior and comparison definitions remain covered. Source-document tests now assert exact original pages rather than altered display copy.

The host production build encountered a Turbopack process/port permission restriction. The completed production build was verified inside the existing Docker build environment instead.

## Rendered checks

All main screens and analytics views were opened with authorized local roles and captured after their content loaded. The rendered font is IBM Plex Sans. Computed status backgrounds are transparent and status pseudo-elements contain no dots. No page-wide horizontal overflow was observed in the recorded checks.

At a 1440 × 900 CSS viewport, the header is 56 px high, the registry table starts at 279.5 px and ten complete rows fit above the fold. Chart review's source begins at 175 px and the fixed decision footer remains inside the viewport. Review was also inspected at 1280 × 800 and 1920 × 1080; the compact desktop layout removes the finding rail while preserving source and decision panes.

Browser interactions verified:

- Local sign-in/sign-out and role-specific navigation.
- Registry selection surviving a filter that hides the selected member, and returning when the filter is cleared.
- A new review has no selected disposition; source search highlights the matching passage, and zoom/fit controls operate.
- Selecting supported and entering rationale cannot bypass the missing-current-assessment gate for the historical COPD case.
- Intake matching validation passes for the correct requested member; changing the requested member produces a failed match and disables publishing. This check did not publish a new source.
- All four campaign stages, draft restoration after refresh, and a frozen preview showing the exact member, recommendation version, owner and existing coverage. Activation transaction behavior was verified by the isolated API tests; this browser pass stopped at the reviewable preview.

Visual inspection led to fixes for a wrapped overview link, excess registry header spacing, oversized single-category charts, a stray vertical scrollbar beside member tabs and wrapped submission identifiers. Loading, wrong-route and incorrectly scaled screenshots were replaced after inspection.

## Screenshot evidence

See [the screenshot folder](../screenshots/redesign/README.md), [PNG dimensions](../screenshots/redesign/manifest.json) and [recorded desktop measurements](../screenshots/redesign/desktop-checks.json). Original screenshots and the previous polish pass remain available as historical artifacts.

Before/after core screens were requested at matching 1440 × 900 CSS viewports. The browser capture tool exports scrollable pages at 1425 × 891 in some cases, while non-scrolling pages export at exactly 1440 × 900. File suffixes describe the requested CSS viewport; the manifest records actual PNG dimensions. Images were not rescaled or fabricated. The three review desktop captures are exact 1280 × 800, 1440 × 900 and 1920 × 1080 exports.

This is focused local application and visual verification, not exhaustive accessibility, arbitrary file-ingestion, production security or live external integration certification. The existing synthetic-data and unavailable-scoring boundaries remain explicit.
