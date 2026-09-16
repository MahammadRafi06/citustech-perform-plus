# Shared Perform+ design

`PERFORMplus_MemberListApp_Member360_v14.html` is the source of truth for the existing application's visual style. The uploaded file is unchanged. We apply its CSS to the app, rather than restyling the uploaded design to match the previous app.

Run `node scripts/import_perform_design.mjs` from the repository root after intentionally updating the reference. The importer copies its complete stylesheet into `apps/web/src/app/perform-design.css`, records the source hash and extracts the typography, spacing and control tokens directly from source declarations. No uploaded JavaScript is executed.

The generated stylesheet is imported globally. Existing application components use aliases for source cards (`ct-card`), metric tiles (`ct-metric`), tabs (`ct-tabs`), button variants and shared table rules. `tokens.css` maps existing semantic color names to the source palette. Analytics modules retain grid/chart layout and interactions, but use the shared visual primitives instead of competing control, table and card definitions. The login form and application shell consume the same tokens.

Prototype-only selectors, such as the member profile layouts and history expansion, remain scoped to Member 360 so they cannot hide or reposition unrelated application content. The application now uses the reference two-row header: a 60px branding/account row and a 50px horizontal navigation row with a 4px sapphire active underline. Navigation uses the existing permissions, scope flags and risk-context links. The sidebar and collapse controls are removed. App-specific adapters account for the 111px sticky header (including the navigation border) and preserve desktop report layouts. The login carousel structure remains intact.

## Reference values

| Primitive | Supplied HTML |
| --- | --- |
| Font | Segoe UI, Arial, sans-serif |
| Body | 15px; line-height 1.65 |
| Page / section heading | 26px / 20px; weight 700 |
| Primary / accent | #004C8D / #3788E5 |
| Canvas / border | #EFF2F5 / #DDE3EA |
| Cards | 18px padding; 4px radius |
| Controls | 42px height; 14px text |
| Metric value | 31px; weight 700 |
| Tables | 14px cells; 13px headers; 12px × 11px cell padding |
| Table header / alternating row | #E3EAF0 / #F7F9FB |
| Focus | 3px #FFBF47 outline |

Clinical values, analytics definitions, evidence provenance, authentication and review gates are unaffected by this styling migration. Source-derived Member 360 profiles retain their separate data boundary.

Validation artifacts are kept in `.local/shared-html-style/`: before/after desktop screenshots, computed-style comparisons and the browser verification record. Actual screenshot dimensions are recorded in `verification.json`. These are local checks, not a public deployment.
