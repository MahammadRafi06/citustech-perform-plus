# Analytics and suspecting refresh

- [x] Replace member lists across analytics, overview, recapture, geography and AI impact with aggregate visuals.
- [x] Populate synthetic suspect planning estimates from explicit shared assumptions; preserve actual scores and source evidence.
- [x] Add closure probability, evidence, condition and financial scenario reports with reproducible exports.
- [x] Show the population suspect cohort by default; retain suspect-level context and inline evidence in the registry.
- [ ] Verify calculations, build, browser interactions and fully rendered desktop screens.

Planning estimates must be labeled as authored assumptions, not calibrated probabilities, official coefficients, approved diagnoses or payment. No missing official model score is replaced. No clinical state, history, account or infrastructure is reset.

Member analysis was explicitly deferred during implementation. Member profile navigation and direct routes are hidden; analytics contain aggregate results and the suspect registry retains inline evidence. The RAF/model lab remains available as a calculation tool.

## Verification — September 15, 2026

- TypeScript checks, the Next.js production build and local UI/API image builds passed.
- Four suspect-planning tests passed, covering missing inputs, preserved source data, overlap handling and financial assumptions.
- Two score-distribution tests passed; the four existing Florida analytics tests passed in the focused run.
- The local UI was refreshed on port 3000 without resetting the database. UI health and API readiness returned successfully. No AWS resources were provisioned.
- Browser inspection confirmed aggregate overview, geography, suspecting, financial, trend and condition-prevalence screens. Financial controls changed the displayed projections.
- Final visual checks of distribution, recapture, period comparison and registry interactions remain incomplete: the browser connection detached. The final removal of advanced member financial controls and the latest registry export/search changes passed the build but still need browser confirmation. This is not a complete end-to-end audit.

The requirements handoff is in `docs/LATEST_SCOPE_REQUIREMENTS_PROMPT.md`. It separates the current implementation, illustrative planning assumptions, deferred member analysis and proposed requirements.
