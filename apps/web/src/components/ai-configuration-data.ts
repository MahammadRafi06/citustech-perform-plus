export type ProviderId = "openai" | "azure" | "anthropic" | "bedrock" | "private" | "compatible";
export const providers: { id: ProviderId; name: string; logo?: string; endpoint: string; protocol: string }[] = [
  { id: "private", name: "Private provider", endpoint: "", protocol: "OpenAI-compatible" },
  { id: "openai", name: "OpenAI", logo: "openai.svg", endpoint: "https://api.openai.com/v1", protocol: "Responses" },
  { id: "azure", name: "Azure OpenAI", logo: "azure.svg", endpoint: "", protocol: "OpenAI v1" },
  { id: "anthropic", name: "Anthropic", logo: "anthropic.svg", endpoint: "https://api.anthropic.com", protocol: "Messages" },
  { id: "bedrock", name: "Amazon Bedrock", logo: "bedrock.svg", endpoint: "", protocol: "Converse" },
  { id: "compatible", name: "OpenAI-compatible", endpoint: "", protocol: "Chat Completions" },
];
export type Connection = { id: string; name: string; provider: ProviderId; endpoint: string; region: string; environment: string };
export type Deployment = { id: string; name: string; connection: string; target: string; description: string };
export type AgentSettings = {
  model: string; fallback: string; temperature: number | null; output: number; context: number;
  history: number; evidence: number; timeout: number; retries: number; tools: string[];
  supplement: string; paused: boolean;
};
export type AgentDefinition = { id: string; name: string; description: string; detail: string; category: string; planned?: boolean; tools: string[]; output: string };
export const agents: AgentDefinition[] = [
  { id: "ask_perform", name: "Ask Perform+", description: "Answers, explanations and next steps.", detail: "Help your team find answers in their workspace, with clear explanations and references to the underlying records.", category: "Workspace assistant", tools: ["Member context", "Source evidence", "Risk results", "Worklist search"], output: "Conversational answer" },
  { id: "clinical_evidence", name: "Clinical Evidence", description: "Source-grounded clinical context.", detail: "Surface relevant passages, dates and contradictions so reviewers can assess the complete clinical picture.", category: "Clinical review", tools: ["Member context", "Source evidence"], output: "Cited evidence summary" },
  { id: "suspecting_recapture", name: "Suspecting & Recapture", description: "Findings worth a closer look.", detail: "Help reviewers understand potential gaps and recapture opportunities while keeping current and historical evidence distinct.", category: "Clinical review", tools: ["Member context", "Source evidence", "Worklist search"], output: "Structured recommendation" },
  { id: "coding_integrity", name: "Coding & Integrity", description: "Clearer coding review and rationale.", detail: "Support coding review with source references and explanations. Human decisions and independent QA remain authoritative.", category: "Clinical review", tools: ["Member context", "Source evidence", "Coding references"], output: "Coding review proposal" },
  { id: "risk_analytics", name: "Risk Analytics", description: "Make sense of the numbers.", detail: "Explain recorded risk results, calculation context and metric definitions. Risk scores remain owned by the deterministic scoring engine.", category: "Analytics", tools: ["Member context", "Risk results", "Metric definitions"], output: "Analysis with referenced results" },
  { id: "chart_retrieval", name: "Chart Retrieval", description: "Coordinate missing documentation.", detail: "", category: "Operations", planned: true, tools: [], output: "" },
  { id: "campaign_engagement", name: "Campaign & Engagement", description: "Plan outreach and provider engagement.", detail: "", category: "Operations", planned: true, tools: [], output: "" },
  { id: "submission_reconciliation", name: "Submission & Reconciliation", description: "Understand submission exceptions.", detail: "", category: "Operations", planned: true, tools: [], output: "" },
  { id: "audit_preparation", name: "Audit Preparation", description: "Bring review evidence together.", detail: "", category: "Governance", planned: true, tools: [], output: "" },
];
export type Revision = { id: string; agentId: string; version: number; at: string; settings: AgentSettings; changes: string[]; action: "Saved" | "Restored" };
export type ConfigState = { schema: 1; connections: Connection[]; models: Deployment[]; settings: Record<string, AgentSettings>; revisions: Revision[] };
export const privateConnection: Connection = { id: "private-workspace", name: "Private provider", provider: "private", endpoint: "", region: "", environment: "Development" };
export const privateModel: Deployment = { id: "private-model", name: "Private model", connection: privateConnection.id, target: "", description: "An organization-hosted model on your own infrastructure" };
export const initialConnections: Connection[] = [
  { id: "openai-workspace", name: "OpenAI workspace", provider: "openai", endpoint: "https://api.openai.com/v1", region: "", environment: "Development" },
  { id: "azure-workspace", name: "Azure workspace", provider: "azure", endpoint: "", region: "", environment: "Development" },
  { id: "anthropic-workspace", name: "Anthropic workspace", provider: "anthropic", endpoint: "https://api.anthropic.com", region: "", environment: "Development" },
  privateConnection,
];
export const initialModels: Deployment[] = [
  privateModel,
  { id: "gpt-4.1", name: "GPT-4.1", connection: "openai-workspace", target: "gpt-4.1", description: "General-purpose reasoning and analysis" },
  { id: "gpt-4.1-mini", name: "GPT-4.1 mini", connection: "openai-workspace", target: "gpt-4.1-mini", description: "Everyday questions and quick summaries" },
  { id: "azure-review", name: "Clinical review deployment", connection: "azure-workspace", target: "clinical-review", description: "Your Azure deployment name" },
  { id: "claude-sonnet", name: "Claude Sonnet", connection: "anthropic-workspace", target: "", description: "Add your exact model identifier" },
];
export const defaults = (agentId: string): AgentSettings => ({ model: agentId === "ask_perform" ? "gpt-4.1-mini" : "gpt-4.1", fallback: "", temperature: null, output: 2048, context: 32768, history: 4000, evidence: 12000, timeout: 120, retries: 2, tools: agents.find(a => a.id === agentId)?.tools || [], supplement: "", paused: false });
export const initialState = (): ConfigState => ({ schema: 1, connections: structuredClone(initialConnections), models: structuredClone(initialModels), settings: {}, revisions: [] });
// Enrich older browser configurations without replacing agent settings or custom deployments.
export function withPrivateModel(saved: ConfigState): ConfigState {
  const next = structuredClone(saved);
  let connection = next.connections.find(c => c.provider === "private");
  if (!connection) {
    connection = { ...privateConnection, id: next.connections.some(c => c.id === privateConnection.id) ? `${privateConnection.id}-${next.connections.length}` : privateConnection.id };
    next.connections.push(connection);
  }
  if (!next.models.some(m => next.connections.find(c => c.id === m.connection)?.provider === "private")) {
    next.models.unshift({ ...privateModel, connection: connection.id, id: next.models.some(m => m.id === privateModel.id) ? `${privateModel.id}-${next.models.length}` : privateModel.id });
  }
  return next;
}
export const settingNames: Record<keyof AgentSettings, string> = { model: "Primary model", fallback: "Fallback model", temperature: "Temperature", output: "Output allowance", context: "Context budget", history: "Conversation history", evidence: "Evidence budget", timeout: "Response timeout", retries: "Retry allowance", tools: "Allowed tools", supplement: "Additional instructions", paused: "Configuration state" };
export const changesBetween = (a: AgentSettings, b: AgentSettings) => (Object.keys(settingNames) as (keyof AgentSettings)[]).filter(key => JSON.stringify(a[key]) !== JSON.stringify(b[key])).map(key => settingNames[key]);
export function validateSettings(value: AgentSettings, state: ConfigState, agent: AgentDefinition) {
  const errors: Record<string, string> = {};
  if (!state.models.some(m => m.id === value.model)) errors.model = "Choose an available model.";
  if (value.fallback && (!state.models.some(m => m.id === value.fallback) || value.fallback === value.model)) errors.fallback = "Choose a different model, or leave fallback off.";
  if (value.temperature !== null && (!Number.isFinite(value.temperature) || value.temperature < 0 || value.temperature > 2)) errors.temperature = "Enter a value from 0 to 2, or use the provider default.";
  for (const [key, min, max] of [["output", 128, 32768], ["context", 4096, 262144], ["history", 0, 64000], ["evidence", 0, 128000], ["timeout", 10, 300], ["retries", 0, 3]] as const) {
    if (!Number.isInteger(value[key]) || value[key] < min || value[key] > max) errors[key] = `Enter a whole number from ${min.toLocaleString()} to ${max.toLocaleString()}.`;
  }
  if (value.output + value.history + value.evidence + 2048 > value.context) errors.context = "Increase the context budget or reduce its allocations. Instructions and safety reserve need 2,048 tokens.";
  if (value.tools.some(t => !agent.tools.includes(t))) errors.tools = "Only tools listed for this agent can be selected.";
  return errors;
}
