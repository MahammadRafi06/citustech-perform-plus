# Identity provider marks

Original SVG assets are served locally so the login page does not depend on third-party image requests.

- `entra.svg`: Microsoft Entra ID color icon from the [official Microsoft Entra icon collection](https://learn.microsoft.com/en-us/entra/architecture/architecture-icons), October 2023 archive.
- `okta-symbol.svg`: black symbol from the [official Okta Developer favicon](https://developer.okta.com/favicon/favicon.svg). The SVG viewBox removes surrounding transparent padding so the mark aligns with Entra; the original path geometry and black fill are preserved.

Retrieved September 13, 2026. Provider names and marks belong to their respective owners. Original artwork and colors are preserved.

These are static provider marks, not authentication controls. Sign-in continues to use the existing local authentication endpoint; no external identity provider is configured by this UI change.
