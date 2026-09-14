# Florida population and dimensional risk analytics

- [x] Replace built-in owner/account role labels with individual names, preserving account IDs, passwords, sessions and access.
- [x] Migrate synthetic population display data to varied person names and Florida member residence / practice locations; retain source-linked identities and original clinical evidence.
- [x] Add county, provider and combined county/provider analytics from retained model runs, with intersection filters, weighted denominators, missing/stale counts and scoped member/run drilldowns.
- [x] Build a desktop analytics view with county/provider comparisons, a county-by-provider heatmap, exports and 10/25/50/100 pagination.
- [x] Verify migration preservation, aggregation reconciliation, access scope, UI build and rendered interactions; save screenshots.

## Definitions and boundaries

Geography means current member county of residence. Provider means the member's assigned practice (not the treating clinician on each claim). Practice location is separate from member residence. Historical run inputs and source documents remain unchanged; analytics labels use current directory attribution. Existing source-linked patient identities remain intact. Other seeded patient names are fictional and are not drawn from real patient records.

Florida county reference: [Florida Legislature county profiles](https://www.edr.state.fl.us/content/area-profiles/county/). Distribution is authored scenario data, not Florida population statistics.

RAF uses the existing raw model-score basis and eligible member-month weighting within one selected configuration and stage. It is not normalized/payment RAF. Missing scores remain unavailable; no score is fabricated from location or provider. External-feed scores retain their existing normalization-group restriction. Every dimensional total and member drilldown uses the reader's authorized scope before county/provider filtering. This increment does not change model inputs, clinical gates, provider assignment IDs or deployment infrastructure.

## Verification

- Seven focused API checks passed on an isolated PostgreSQL schema. The four new tests passed again after removing duplicate provenance from chart projections. Coverage includes zero versus missing scores, unequal monthly weights, stale results, county/provider intersections, 10/25/50/100 paging, provider scope, external normalization restrictions, idempotence, custom account names and unchanged credentials/sessions.
- Every one of the 10,000 generated scoring inputs is equal before and after the directory migration. The live local database's original documents, clinical histories, account credential/access fields and retained risk runs also matched their pre-migration hashes.
- The production Next.js build and TypeScript check pass. Local UI/API run on ports 3000/8000.
- Live geography, practice and combined totals each reconcile to 10,000 members, 120,000 scored member-months and raw RAF 0.8406506 under the existing default configuration. The portfolio has 12 counties, 30 practices and 71 county/practice intersections.
- The initial full-scope response was reduced from 1,992,136 bytes to 821,488 bytes by retaining run IDs in the summary and exact matrix cells, without repeating them in every chart projection. One local proxy request took 1.176 seconds; this is a spot check, not a load test.

See [screenshots and browser checks](../screenshots/florida-analytics/README.md) and [live reconciliation receipt](../screenshots/florida-analytics/verification.json). This increment is verified locally; it has not been pushed or deployed.
