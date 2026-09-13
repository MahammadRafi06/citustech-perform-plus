# Perform+ login carousel

The 70% blue branding section now presents four capability slides. The CitiusTech header, 30% login panel, Entra and Okta logos, and local sign-in remain in place.

1. [AI intelligence](01-ai-intelligence.jpg): next-generation risk adjustment with AI-assisted discovery and clinical oversight.
2. [Clinical clarity](02-clinical-clarity.jpg): evidence-linked findings and traceable decisions.
3. [Everyday ease](03-everyday-ease.jpg): consistent queues, connected teams and clear review workflows.
4. [Risk insights](04-risk-insights.jpg): member profiles, explainable scores and population insight.

[Static page before the change](before.jpg) · [1366px desktop view](desktop-1366.jpg)

Slides advance every nine seconds, with previous/next controls, direct slide selection, pause/play and arrow-key navigation. Manual navigation pauses rotation. Hovering over the carousel, focusing the sign-in panel or hiding the browser page temporarily pauses it. Reduced-motion preferences disable automatic rotation and transitions.

The copy describes existing product workflows without numerical performance claims. AI-assisted suggestions remain distinct from clinical decisions and deterministic model scoring.

## Verification

- Production build and TypeScript validation passed.
- All four slides were visually inspected at 1920 × 993, with matching before/after dimensions and a minimum five-second rendering delay before each capture.
- The 1366 × 900 desktop view has no horizontal or vertical overflow and retains the 70/30 proportions.
- Previous/next wrapping, arrow-key navigation, manual pause and resumed automatic advancement passed in the browser.
- Rotation paused while signing in, and local sign-in opened the populated Risk overview.
- Login values remained visible after a slide change. [The form-state verification image](verification-form-values.jpg) contains only synthetic test input, not account credentials. The browser's read-only DOM representation omits input values, so this check used the rendered controls.
- Reduced-motion behavior was reviewed in the implementation; system motion preferences were not changed during browser verification.

See [checks.json](checks.json) for observations and image hashes.
