# Northstar & Meridian login branding

Before/after screenshots use a matching 1920 × 839 desktop viewport and the first carousel slide. Captures were taken after the page and logo rendered fully.

- `before-1920.jpg`: previous hospital icon and 14 px organization name.
- `after-1920.jpg`: generated north-star/meridian logo and 24 px blue-and-teal wordmark.
- `render-checks.json`: loaded logo and layout measurements at 1366 × 839 and 1920 × 839; no wordmark clipping or document overflow at either size.

Validation: production Next.js build and TypeScript passed; optimized 64 px logo response returned HTTP 200 and 2,806 bytes in WebP format. The login form, carousel, and authentication code are unchanged. Browser screenshot scaling did not produce a reliable 1366 px capture, so only the matching full-width captures are included.

Logo source and generation prompt: `apps/web/public/branding/northstar-meridian-mark.md`.
