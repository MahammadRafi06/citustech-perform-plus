# Approved login layout with restored carousel

Captured from the running production UI build on port 3000 on 2026-09-13, with at least 5.5 seconds for rendering before capture.

- `before.jpg`: the photographic carousel immediately before the requested reversion, at 1920 × 993.
- `01-ai-intelligence.jpg` through `04-risk-insights.jpg`: restored original blue carousel, feature panels, panel footers and page footer, at 1920 × 993.
- `desktop-1366.jpg`: final layout at 1366 × 900.
- `checks.json`: viewport, restoration and login evidence, plus a pixel comparison confirming the approved right-side layout was preserved.

The carousel component and CSS exactly match their original SHA-256 values. The right side retains its plain white background, simplified form and Entra/Okta marks. The blue left branding header remains. Photography is no longer included in the application.

The production UI build and whitespace checks passed. The rendered layouts have no overflow at either captured desktop viewport. Local authentication was successfully verified after simplifying the form, opening Risk overview with 100 member rows; the form was not changed during the carousel reversion. API and database containers were not recreated.
