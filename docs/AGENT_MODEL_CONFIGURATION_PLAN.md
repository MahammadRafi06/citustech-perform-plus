# Agent and model configuration — UI implementation plan

Source: [complete requirements](../CitusTech_Perform_Plus_Agent_Model_Configuration_Requirements.md), v1.0 (922 lines read). Branch: `feat/agent-model-configuration`.

## Current scope — user correction

The user clarified: “we dont need entire flow, just UI should be good for this demo.” The first delivery is a polished, interactive configuration UI. The backend integration specification is a future reference, not the acceptance bar for this UI task. Initial uncommitted backend scaffolding and dependency changes were removed before continuing.

The main interaction is familiar: choose an agent, select its provider/model, adjust common settings, save. Advanced controls are secondary. Reuse the existing desktop application, white navigation, cobalt/teal palette, authentication and Administration access. Keep RAF model configuration separate.

## TODOs

- [x] **UI-AI-01 — NEW:** Read requirements, inspect existing administration/assistant UI, create branch and revise plan for the user's UI-only scope.
- [x] **UI-AI-02 — NEW:** Build Agents configuration overview with five configurable agent roles and four visibly planned roles. Search/filter, model/provider summary, individual configure action.
- [x] **UI-AI-03 — NEW:** Create a clean agent editor with model selection, output/temperature/context controls, optional fallback and collapsed advanced settings. Show readable defaults, inline validation, unsaved changes and save/reset behavior.
- [x] **UI-AI-04 — NEW:** Add concise provider and deployment views, including a Private provider option for organization-hosted endpoints, with working add/edit flows and honest untested connection states. Store nonsecret preview metadata only; no credential collection or simulated live connection tests.
- [x] **UI-AI-05 — ENHANCEMENT:** Add a separate **Agents** sidebar item, with Administration access permissions and shortcuts from its AI settings tab. Retain role-gated navigation and existing business screens.
- [x] **UI-AI-06 — NEW:** Persist nonsecret settings per signed-in user in this browser; retain local change history and allow restore/export. Clearly state these settings do not yet change live inference.
- [x] **UI-AI-07 — NEW:** Run TypeScript/production build, open the UI, exercise primary interactions and capture fully rendered desktop screenshots. Fix visual defects before handover.

## Deferred by the user

Provider authentication, encrypted secrets, real model invocation, streaming dispatcher, live activation/test gates, shared retries/budgets and deployment changes are outside this UI delivery. Do not show a mock test as successful live inference. Existing assistant and clinical workflows retain their current behavior.

## Verification — 2026-09-13

Implemented on `feat/agent-model-configuration`; local preview: `http://localhost:3000/admin/ai/agents`. The existing API and database are reused without code, schema or deployment changes. Nothing from this task has been released to the public application.

- TypeScript check passed. Next.js production build passed using `next build --webpack`, including type checking and static generation. Turbopack hit an environment-level worker socket permission error on this machine; the application build configuration was not changed.
- Signed-in browser walkthrough verified the new configuration route, five configurable agents, four planned roles, agent search and filtering.
- Changed Clinical Evidence to the Azure example deployment, set temperature to zero, saved two versions, restored the first as a draft and saved version 3. Values and history persisted across a UI server restart and page reload.
- Invalid context allocation displayed an inline error and disabled Save. Advanced settings expanded correctly; locked instructions and role-specific tool selections rendered. Leaving an edited instruction prompted for discard and retained the last saved version.
- Added Bedrock provider metadata with a region and a reusable model entry, then reopened provider/model details. Azure uses a distinct deployment-name field. No credentials were collected and no provider requests were made.
- Export downloaded valid JSON containing four provider entries, five model entries and three saved revisions, explicitly marked `configuration_preview` and `live_inference_configured: false`.
- Inspected actual desktop renders at a 1920 × 993 viewport. Reduced oversized form/table spacing and placed primary/fallback model selection side by side. No horizontal document overflow.
- Follow-up: added a separate Agents sidebar entry with its own selected state, retaining Administration permissions. Private provider is offered in provider setup and as a default connection for model selection; its endpoint and connectivity remain unconfigured. Browser-verified selection in both dropdowns and the separate Agents active navigation state.
- Captures: [desktop screenshot folder](../screenshots/ai-configuration/). These are new configuration screens, not screenshots of live model execution.

The source requirements remain intact as future integration guidance. Their live backend acceptance criteria are deferred rather than represented as completed.

## Visual refinement and private model selection — 2026-09-13

- [x] Rename the page, topbar and Administration shortcuts to **Agents configuration**; retain the separate **Agents** sidebar entry.
- [x] Replace letter placeholders with locally bundled OpenAI, Anthropic, Azure and Amazon Bedrock marks. Include sources and the asset collection license under `apps/web/public/brand/providers/`.
- [x] Replace the plain agent list with role cards and a distinct private deployment panel; refine provider cards, model catalog, history and editor views.
- [x] Offer **Private model** directly in both primary and fallback dropdowns. Group private deployments before public providers; keep No fallback at the top so opening that menu does not hide private models. Disable choosing the primary model again as fallback.
- [x] Add a private deployment to older browser configurations without replacing saved agent settings, revisions or custom private deployments. Keep provider endpoint/inference setup explicitly separate from this UI selection.
- [x] Remove the Agents-only centered width limit and extra outer padding. Reuse the shared `PageHeader`, 28px page canvas and standard 18px/20px panel-header spacing.
- [x] Build and inspect the rendered pages; capture before/after screenshots at a matching 1920 × 839 CSS viewport.

Verification: the final Webpack production build and TypeScript checks passed. A focused data smoke check verified non-mutating/idempotent migration, preservation of custom private deployments, valid private primary/fallback selections and rejection of duplicate primary/fallback models. Browser review verified authentic logos load, private selection in both controls, successful form/budget validation, private endpoint fields, provider/model pickers, search, saved history and instructions/tools. Agent settings were restored after draft checks; this pass did not add saved revisions or change live inference.

Measured Agents and Suspect registry: 28px canvas padding, heading x=268px with the expanded 240px sidebar, heading offset 28px from the canvas top, 24px page title, no horizontal overflow. Final local server is available at `http://localhost:3000/admin/ai/agents`; no public deployment was performed in this pass. Screenshots and comparison notes: [agents-polish](../screenshots/agents-polish/README.md).

## Desktop navigation follow-up

The sidebar now reuses the Northstar & Meridian logo from sign-in, with a compact organization identity, clearer active navigation and balanced group spacing on a white background. Expanded width remains 240px; the collapsed 72px rail includes accessible link names, keyboard tooltips and the workspace guide. Collapse preference is stored in this browser. Clinical context URLs and permission filtering remain intact. Local screenshots: [sidebar-polish](../screenshots/sidebar-polish/README.md).
