# UI polish — September 12, 2026

The workspace now uses a navy navigation rail, a restrained blue/teal palette, readable table typography, continuous KPI groups, consistent controls, and shared spacing across the application. Promotional banners and repeated presenter wording have been removed. Login uses a normal email/password form, analytics records use a table, and campaign allocation has a grouped form and a visible primary action.

Account aliases such as `analyst@perform.test` use the existing local passwords. Legacy addresses remain valid. Roles and record scopes remain enforced by the API.

System-authored display copy is formatted at read-response boundaries, so existing databases receive the updated wording without reseeding. Stored source documents, policy identifiers, provenance, and exports remain intact. Reference results and external-action limitations are explained in the workspace guide, measurement methodology, and relevant workflows.

## Local validation

- TypeScript and Python compilation passed.
- Existing API acceptance suite: 17 passed, including sign-in through the new account aliases and role/scope restrictions.
- Focused intake regression: passed; publication persists once while the original source title remains stored and the display title is readable.
- Separate API/UI container builds and local container acceptance passed. The existing database container and volume were preserved.
- Browser checks covered registry filtering and selection, campaign planning, member evidence, coder review controls, intake validation, analytics, and account switching.
- Responsive checks at 1100 px and 390 px found no document-wide horizontal overflow; collapsed desktop navigation measured 72 px. Temporary viewport overrides were reset.

The running local production preview is http://localhost:3002. These are local build and browser checks, not a Kubernetes production deployment.

## Screenshots

- [Dashboard before](ui-polish/before-overview.png) / [after](ui-polish/after-overview.png)
- [Login before](ui-polish/before-login.png) / [after](ui-polish/after-login.png)
- [Registry](ui-polish/after-registry.png)
- [Analytics](ui-polish/after-analytics.png)
- [Member review](ui-polish/after-review.png) / [source and decision controls](ui-polish/after-review-detail.png)
- [Campaign planner](ui-polish/after-campaign.png)
- [Document intake](ui-polish/after-intake.png)
- [Phone layout](ui-polish/after-mobile.png)
