# Risk analytics pagination

The final report tables default to 10 rows, with 25, 50 and 100 available in the rows-per-page dropdown. Each table has independent navigation, record ranges and first/previous/next/last controls. Charts and metric denominators use the full result set.

Browser verification covered all ten report tabs, the AI evaluation dialog, condition cohorts, annual recapture, period comparisons and retained financial detail tables. Checks included every page-size option, independent table state, partial final pages, empty records and the final page of 9,600 matched members. `verification.json` contains the recorded browser observations.

Screenshots show the final dropdown styling after results fully rendered. The earlier `risk-pagination` and `sidebar-spacing` folders retain the preceding iterations; `sidebar-spacing/after-refined.jpg` is the accepted tighter sidebar spacing.

Validation: production UI build and TypeScript passed; 14 analytics/financial API checks and four deployment-boundary checks passed. The financial-history test also passed after its fixture timestamps were normalized. Existing reader scope and retained run references remain covered by the API regression checks.
