# Member risk results pagination

Local browser verification at a 1920 × 839 desktop viewport.

- Fixed page size: 10 members.
- Verified pages 1, 2, 999 and 1,000 against 10,000 scored members.
- First and last pages disable the appropriate navigation controls.
- Changing score basis resets to page 1; the QA-supported result contains one member.
- Member links retain the selected model and score basis and open the risk profile.
- Screenshot captured after results finished rendering, with the table footer visible.

Validation: Next.js Webpack production build and TypeScript passed. Two isolated-schema API tests passed, including 105 results beyond the former cap, stable ordering, retained run IDs, unchanged denominator, reader scope and external cohort reconciliation.
