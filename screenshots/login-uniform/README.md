# Login palette and provider logos

- [Before](before.jpg): split login with independent teal colors and organization access message.
- [After](after.jpg): shared application blue and white palette with Microsoft Entra, Okta and Keycloak logos only beneath the form.

Both screenshots were captured at 1920 × 993 after waiting at least five seconds and checking that the page had rendered. The provider SVGs loaded successfully with no horizontal overflow. The branding panel and sign-in button both resolve to the application's primary blue, `#3659ad`.

Production UI build and TypeScript validation passed. Local sign-in was verified through the UI and opened the populated Risk overview. The workspace sidebar remains white. Provider logos are static; this change does not configure SSO. See [checks.json](checks.json) for the rendered checks and image hashes.
