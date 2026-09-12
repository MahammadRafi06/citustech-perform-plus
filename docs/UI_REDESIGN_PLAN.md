# CitusTech Perform+ UI redesign

The complete supplied redesign brief and all nine images in `screenshots/` were reviewed. This work retains Next.js, Tailwind, shadcn, the local authentication/RBAC model and separately deployable UI/API/PostgreSQL components.

## Ten observed defects

1. Dark, oversized sidebar competes with work; task groups fragment navigation.
2. Repeated workspace breadcrumbs, decorative headers and run banners push registry rows below the first viewport.
3. Low-contrast metadata and tiny labels obscure dates, owners and source context.
4. Registry avatars and multiple colored badges overwhelm scanning.
5. Chart review inherits Member 360 summary/tabs; source and decision start too far down the page.
6. New reviews preselect supported coding; scroll ownership and disabled reasons are unclear.
7. Comparison cards separate related values, hide synthetic identity and overstate operational event coverage.
8. Campaign creation puts a five-row cohort inside a two-stage modal; drafts disappear on refresh.
9. Intake offers a small paragraph preview with validation distant from the source; local file control exposes no actual content preview.
10. Tables, dialogs and detail workspaces lack consistent desktop sizing and scroll ownership.

## Implementation order

1. Shared light design tokens, IBM Plex Sans typography, plain text statuses, controls, role-driven navigation and focused sign-in.
2. Compact registry with truthful taxonomy, stable selection and integrated table controls.
3. Dedicated source-led chart-review workbench preserving clinical and QA gates and original quotations.
4. Action-first overview; aligned synthetic comparison and all supporting report routes.
5. Routed four-stage campaign workflow with device-local drafts and transaction-level stale preview checks.
6. Source-centered intake, provider table and consistent remaining operational/governance screens.
7. Matching before/after captures, visual inspection, desktop layout checks, application checks and production build. Mobile design is out of scope per the user's later instruction.

## Evidence boundaries

Clinical source wording is returned unchanged. Known fixture-authored interpretation is separated from clinical source, with complete-source access retained. Operational totals include integrity/source/scenario work only when labeled work items. Synthetic comparison values and exports are unchanged. Campaign version checks are additive to the existing locked transaction. No external deployment or live model/receiver capability is implied.
