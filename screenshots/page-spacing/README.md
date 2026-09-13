# Risk page container alignment

Verified September 13, 2026 in the local production UI at `http://localhost:3000`. Browser viewport: 1920 × 895; before/after images for both risk pages are 1910 × 890.

The removed desktop-only rule capped Risk overview and Risk analytics at 1488px above a 1700px viewport, adding 91px side margins in this check. Both now inherit the shared `.page-canvas` with 28px padding and zero extra margin. Their headings, report tabs and cards start at x=268, matching Suspect registry and the risk context bar contents. Shared panel headers retain 18px vertical / 20px horizontal padding and 1px panel borders.

- `before-risk-overview.jpg` / `after-risk-overview.jpg`
- `before-risk-analytics.jpg` / `after-risk-analytics.jpg`
- `reference-suspect-registry.jpg`

Fully rendered charts and metrics were visually inspected. No horizontal document overflow on analytics. Production build (`next build --webpack`, including TypeScript checks) and `git diff --check` passed. No metric or behavior changes.
