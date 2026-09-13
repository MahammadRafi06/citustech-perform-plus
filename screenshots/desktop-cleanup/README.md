# Desktop visual cleanup

Open [the comparison gallery](index.html), or browse [before](before/) and [after](after/).

19 screen pairs cover sign-in, all 16 navigation destinations, the clinical review workbench and a member risk profile. The images were captured from the running application after a minimum five-second delay and a check that loading placeholders had disappeared. Table screens include actual records. Coding QA contains a genuine empty queue.

The browser viewport was 1920 × 937 for both sets. Files retain the browser's original JPEG bytes; captures of scrolling pages exclude the scrollbar area. `capture-manifest.json` records each route, viewport, row count, image dimensions and SHA-256 digest. Earlier incomplete captures were replaced.

## Visual issues fixed

| Issue | Change |
| --- | --- |
| Navy sidebar, dim section labels, pale workspace label and gradient selection glow | Plain white sidebar, readable neutral navigation, restrained flat active state |
| Centered sign-in card with little branding | Full-height split screen with branding on the left and sign-in on the right |
| Appended theme layers and global imports in several client components | One root stylesheet entry, a dedicated token file and one owner per shared selector |
| Different table, label, metric and heading scales | Consistent IBM Plex Sans hierarchy, flat controls, neutral surfaces and predictable spacing |
| Filter controls placed by six-column overrides in two feature stylesheets | Explicit DataGrid action and filter regions; visible labels in the registry |
| Mobile navigation and several hundred lines of mobile layout rules | Desktop-only shell and desktop width adjustments |
| Analytics canvas shrinking to its content width | Explicit full available width within the report's desktop maximum |
| Vertical scrollbar in shared tabs | Horizontal scrolling belongs to the outer tab container |
| Repeated clinical workspace height overrides | Shared dimension rules with scrollable source and decision content |

## Verification

- Production Next.js build and its TypeScript check passed.
- All 19 after screens visually inspected; before/after pairs checked for matching viewports and loaded content. All 16 destinations loaded at the comparison viewport.
- Registry, model lab, intake and models/data also checked at 1366 × 900 without page-level horizontal overflow. The clinical review retained all three panes at that size.
- Sign-in and password visibility controls worked with the existing local account.
- Registry search, priority filtering, row density, row selection and sidebar collapse checked. Selecting a row enabled its action; no calculation or clinical transition was submitted.
- Clinical review save and independent QA remained gated. Source ID, original wording and provenance remained visible.
- Status text has a transparent background and no decorative dot.
- The recent browser error log contained an injected Chrome-extension error; no application error appeared in that inspected log.
- Only the UI container was replaced. The existing API, database and account data were retained.

## Loading observations

One local response-time sample measured the overview API at 1,639 ms, member directory at 707 ms and workspace bootstrap at 346 ms. The bootstrap payload was approximately 1.7 MB. These are local observations, not a performance benchmark or a claim that the backend latency was fixed. The capture workflow waits for this data.

## CSS ownership

`apps/web/src/app/globals.css` is the only global entry, imported by the root layout. `tokens.css` defines the palette, typography and shell dimensions; `workspace-design.css` owns shared layout and controls; workflow, assessment and risk styles own their feature structures. `sign-in.module.css` isolates the sign-in composition. There are no duplicate exact root selectors across the shared and feature stylesheets and no appended theme layer.
