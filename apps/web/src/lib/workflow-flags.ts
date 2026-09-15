// Product scope switch: this deployment of Perform+ is a risk analytics and
// suspecting workspace only. Workflow surfaces (chart chase, chart review,
// Coding QA, campaigns, intake, providers, pre-visit, submissions, audit) are
// hidden from the interface while their backend APIs, roles, retained history
// and clinical gates remain fully intact and reversible by flipping these
// constants. Do not remove the underlying data or endpoints.
export const WORKFLOW_ENABLED = false;

export const HIDDEN_ROUTES: ReadonlySet<string> = new Set([
  "reviews",
  "qa",
  "campaigns",
  "chase",
  "intake",
  "providers",
  "previsit",
  "submissions",
  "audit",
  "agents",
]);

// Member profile tabs that expose workflow execution rather than risk context.
export const HIDDEN_MEMBER_TABS: ReadonlySet<string> = new Set([
  "Tasks",
  "Submissions",
]);

export const hiddenByScope = (id: string) => !WORKFLOW_ENABLED && HIDDEN_ROUTES.has(id);
