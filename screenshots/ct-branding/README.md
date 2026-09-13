# CitiusTech branding and login spacing

- [Login before](login-before.jpg)
- [Login after](login-after.jpg)
- [Application sidebar](app-after.jpg)
- [Collapsed sidebar](app-collapsed-after.jpg)

The login retains its 70/30 split. A shared white masthead displays the supplied full CitiusTech logo. The branding headline and vertical workflow occupy the left panel together, replacing the large empty area beside the previous narrow text block. Entra and the black Okta symbol remain the only provider marks.

The supplied CT mark replaces the placeholder symbol in the application navigation, loading state and browser icon. It remains visible in the collapsed sidebar. Source images are preserved byte for byte; CSS frames exclude surrounding white margins without changing their proportions or colors.

Login screenshots were captured at matching 1920 × 993 viewports after at least five seconds of rendering time. All logo assets loaded, the panels measured 1344px and 576px, and no horizontal overflow was present. Local sign-in opened the populated Risk overview, and collapsing the sidebar retained the 32px CT mark inside a 64px sidebar. Production build and TypeScript validation passed. See [checks.json](checks.json).
