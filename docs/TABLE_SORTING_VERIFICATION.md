# Table sorting and fixed-width columns

## Behavior

- Every data column has paired arrows beside its name. Click to switch between ascending and descending order; the active arrow is highlighted and the header exposes its direction through aria-sort.
- Header controls are native keyboard-accessible buttons. Selection and action columns keep their original controls.
- Text uses natural ordering; formatted numbers, percentages, currency, signed RAF values and dates use their underlying ordering. Missing values remain at the bottom in either direction and ties preserve source order.
- Client reports sort the entire filtered result set before pagination and return to the first page when sorting changes. Member-directory endpoints sort the caller's scoped records before paging.
- Fixed table layout and explicit EDS/registry column proportions prevent row content from resizing columns during sorting. Text wraps inside those widths.
- Default source order, member links, evidence actions, record identifiers and clinical data are unchanged until the user selects a sort.

## Integration

Shared sorting covers Analytics, the Suspected Condition Registry, EDS, Member 360 source tables, existing data grids, calculation tables and retained workflow/administration tables. Existing computed data-grid columns have explicit sort accessors. Member directories accept only supported sort fields and directions.

## Verification

- TypeScript check passed.
- 23 UI/report tests passed, including numerical/date ordering, missing values, stable ties, unchanged source records and full-result pagination.
- 4 isolated API tests passed, including both member directories, provider scope and unscored records remaining unavailable.
- 4 deployment-boundary checks passed.
- Browser: all 20 EDS reports and all four Risk Analytics tabs expose working sorting controls, retain identical column widths before and after sorting and have no horizontal page overflow at the inspected desktop viewport.
- Browser: registry Priority Score sorts in both directions across all 113 records. Page two continues the sorted order; selecting Member sort resets to page one. Registry widths remained identical through these interactions.
- Browser: Member 360 RAF Delta sorts numerically while retaining its source confidence and contribution values. No clipped cells or horizontal page overflow observed.

Verification uses the application's existing local records; no clinical evidence or risk calculation inputs were modified.
