# Desktop sidebar refinement

Local browser review at 1920 × 961 CSS pixels, captured after the app content and images rendered.

- [Before sidebar](before-sidebar.jpg)
- [After — expanded](after-sidebar-expanded.jpg)
- [After — collapsed](after-sidebar-collapsed.jpg)
- [Collapsed keyboard tooltip](collapsed-tooltip.jpg)
- [Risk overview](after-risk-overview.jpg)
- [Public application before this release](before-public-overview.jpg)

The sidebar remains white with the existing 240px expanded width, a refined active state and consistent icon/label spacing. It uses the existing Northstar & Meridian logo and the CitiusTech brand mark. The 72px collapsed rail retains accessible link names, keyboard tooltips, organization identity and the workspace guide. Risk-context links and permission filtering are preserved.

The production build, TypeScript checks and four release-boundary tests passed before publishing. Both sidebar states were visually inspected; all 17 administrator links are labeled and no horizontal overflow was observed. The expanded page canvas retains 28px padding.
