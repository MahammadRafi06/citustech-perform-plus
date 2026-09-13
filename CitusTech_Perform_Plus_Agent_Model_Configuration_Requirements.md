# CitusTech Perform+ — Agent and AI Model Configuration Requirements

**Version:** 1.0  
**Date:** September 13, 2026  
**Deliverable:** Business, user experience, functional and implementation requirements  
**Status:** Proposed implementation specification; not a statement of delivered capability  
**Companion:** `CitusTech_Perform_Plus_Business_Requirements_v2.md`

## 1. Purpose and implementation decision

Build **Settings → AI configuration** so an authorized administrator can connect model providers, register available model deployments, choose the model behind each Perform+ agent, tune supported settings, test the complete configuration and activate it without changing application code.

The experience should answer six practical questions:

1. Which provider and model does each agent use?
2. Which endpoint, identity or API credential makes that connection work?
3. What context, output, reasoning, tool and execution settings apply?
4. Has this exact configuration been tested successfully?
5. What happens when a request fails, exceeds its budget or needs a fallback?
6. Who changed the configuration, and which version produced a particular result?

**A backend is required.** Use the existing Next.js, FastAPI and PostgreSQL application described in the supplied assessment. The browser must call the Perform+ backend; the backend resolves credentials, validates settings and calls the provider. Extend the existing architecture before introducing another agent framework or service.

An agent is a business role with instructions, tools and execution rules. A model is a resource the agent calls. Several agents may share one provider connection and model deployment while using different settings. Adding a new supported model identifier should normally require configuration, not a code deployment; adding a genuinely new API protocol requires a tested adapter.

### 1.1 Preserve the distinction between AI models and risk adjustment models

| Item | Managed here? | Meaning |
|---|---|---|
| Generative language or multimodal model | Yes | Produces explanations, extracts evidence, proposes next actions or calls approved tools. |
| Embedding or reranking model | Optional extension | Supports evidence retrieval; configured separately from generation models. |
| Predictive suspecting model | Reference only in the initial release | May produce statistical suspect scores through an existing model service; is not automatically replaced by an LLM. |
| CMS-HCC, RxHCC, HHS-HCC or configured Medicaid risk model | No | Remains in the separate risk-model registry and deterministic scoring engine. |
| RAF calculation or financial scenario | Tool access only | An agent can request a calculation and explain its returned result; it cannot choose coefficients or invent an authoritative score. |

The existing v2 requirement **RA-01** concerns payment risk-model configuration. Do not reuse that registry, its navigation label or its version identifiers for LLM settings.

### 1.2 Baseline and change classification

The assessment describes authored findings and template/keyword assistant responses, with no verified live LLM, RAG or agent runtime at that assessment point. Inspect the current branch before implementation; later code may have added these capabilities.

| Area | Classification | Required treatment |
|---|---|---|
| Provider connection administration | **NEW** | Build reusable connections and secure credential references. |
| AI model deployment catalog | **NEW** | Build model identity, capabilities, limits and discovery/manual registration. |
| Agent configuration and activation | **NEW** | Build draft settings, tests, immutable versions and runtime resolution. |
| Ask Perform+ interface | **ENHANCEMENT** | Preserve the chat UI; replace or supplement its existing response path with the configured live runtime. |
| Suspect registry and evidence review | **ENHANCEMENT** | Connect supported workflow actions to the configured agent/service; preserve source evidence and reviewer decisions. |
| Coding, analytics and later agent roles | **ENHANCEMENT / NEW runtime** | Reuse existing screens; add configuration-backed execution only where the workflow is implemented. |
| Data operations and audit views | **ENHANCEMENT** | Add configuration, connection and execution events to existing operations screens where possible. |
| Authentication and application roles | **ENHANCEMENT** | Extend existing permissions; do not build a second account system. |

“Configured” must never imply that a planned business agent has been implemented. Its runtime availability and its model configuration are separate states.

## 2. Scope, priorities and permissions

### 2.1 Delivery scope

| Release | Required scope |
|---|---|
| **P0 — first working release** | OpenAI direct, Azure OpenAI v1, Amazon Bedrock Converse, Anthropic direct and an explicitly tested OpenAI-compatible endpoint adapter; all five administration pages; server-side secrets; model-aware settings; real synthetic tests; agent binding; streaming chat; context controls; bounded retries; one optional approved fallback; versioning; usage and redacted diagnostics. |
| **P1 — follow-on improvements** | Google Gemini API and Google Vertex AI adapters; Azure dated API compatibility if required; additional Bedrock API modes; expanded identity federation; embedding/reranking configuration; saved evaluation suites; comparison of two configuration versions; richer budget reports. |
| **Outside this change** | Training or hosting foundation models; purchasing provider capacity; obtaining model entitlements; a general cloud console; a generic autonomous-agent builder; CMS connectivity; changing risk adjustment methodology; automatic external communications. |

P0 support means the adapter, configuration form, validation and test path work. A provider may remain **Not connected** until credentials and access exist. Never show an unimplemented provider as selectable for an active agent. P1 entries may appear under a clearly labeled roadmap, outside the usable provider picker.

### 2.2 Permission model

Map these capabilities to existing roles; separate named roles are not mandatory if the current administration role already covers them.

| Capability | AI administrator | Operations reader | Ordinary workflow user |
|---|---|---|---|
| View masked connection and deployment metadata | Yes | Yes, within scope | No |
| Create/edit connections and replace credentials | Yes | No | No |
| Configure agents, run synthetic tests, activate/rollback | Yes | No | No |
| Read redacted execution diagnostics | Yes | Yes | Own task status only |
| View clinical prompt/output content | Only with separate record permission | Only with separate record permission | Existing record permissions apply |
| Use an enabled agent | Existing business permissions apply | Existing business permissions apply | Existing business permissions apply |
| Export configuration without secrets | Yes | Optional existing export permission | No |

**ACM-01.01 — NEW:** Enforce tenant/workspace and environment scope on every configuration object and API, not just through the page navigation. A connection in one scope must not be referenced by an agent in another without an explicitly supported shared-connection policy.

**ACM-01.02 — ENHANCEMENT:** Permission to configure a model must not grant permission to see additional member records, change clinical decisions or perform additional business actions.

**ACM-01.03 — NEW:** Use the existing administrative role for activation in P0. Do not introduce a mandatory two-person approval workflow. A future organization policy may require a separate publisher without changing the underlying version model.

## 3. Configuration objects and inheritance

### 3.1 Separate the three principal objects

| Object | Owns | Example |
|---|---|---|
| **Provider connection** | Provider/API mode, endpoint, authentication, credential reference, region/network and data-use restrictions. | “Azure — development workspace” |
| **Model deployment** | Connection reference, exact inference identifier, underlying model metadata, capabilities, limits and optional generation defaults. | “Evidence extraction — deployment A” |
| **Agent configuration** | Agent identity, primary/fallback deployments, generation overrides, context allocation, tool/output contract, execution limits and prompt version. | “Clinical Evidence Agent — active version 4” |

Credentials belong to connections, not individual agents. Editing the Clinical Evidence Agent must not require re-entering a shared Azure key.

**ACM-02.01 — NEW:** Resolve ordinary tunable values in this order: explicit agent override → deployment default → adapter/provider default. Distinguish **Inherit**, **Explicit value** and **Provider default**. `0`, `false` and an empty list must not accidentally be treated as missing values.

**ACM-02.02 — NEW:** Apply organization policy and deployment capability limits as constraints after resolving values. They cannot be overridden by an agent setting, user message or task payload. Reject incompatible settings with an actionable error; do not silently clamp an administrator’s saved value.

**ACM-02.03 — NEW:** Show each resolved setting with its source, such as “4,096 tokens · Agent override” or “Sampling · Provider default.” If the provider default is not known, say so. A submitted parameter is not proof that a custom server honored it.

**ACM-02.04 — NEW:** Permit runtime task overrides only through a typed, server-owned allowlist. They may narrow the permitted scope or budget. User requests cannot override endpoints, secret references, authorization, data-routing restrictions or the agent’s tool permissions.

**ACM-02.05 — NEW:** Keep one active agent configuration per agent, workspace and environment. An agent may have multiple drafts/history versions. A model deployment may serve several agents.

## 4. Pages and navigation

Place **AI configuration** under the existing Settings/Administration area. Use five pages, with agent-specific editing reached from the Agents page:

| Page | Suggested route | Primary purpose |
|---|---|---|
| Agents | `/settings/ai/agents` | See which model powers each agent and whether it is ready. |
| Provider connections | `/settings/ai/connections` | Add, test and maintain endpoints and credentials. |
| Model deployments | `/settings/ai/models` | Register/discover model targets and inspect capabilities. |
| Agent configuration | `/settings/ai/agents/{agentId}` | Tune, test and activate a specific agent configuration. |
| Tests & activity | `/settings/ai/activity` | Inspect tests, usage, errors and configuration history. |

These are suggested routes, not a requirement to break existing routing conventions.

### 4.1 Shared visual and interaction requirements

**ACM-03.01 — NEW:** Use the application’s professional enterprise design system: a compact page header, readable tables, consistent labels, restrained status color and clear primary actions. Avoid a separate visual theme, oversized provider cards and decorative AI animation.

**ACM-03.02 — NEW:** Display workspace/environment at the top of the area. Production, test and development must be clearly distinguishable. A model name or provider logo alone does not identify the environment.

**ACM-03.03 — NEW:** Keep common fields visible and provider-specific advanced fields in named sections. Every numeric field shows its unit, allowed range when known, inherited value and validation message. Use numeric inputs alongside any sliders.

**ACM-03.04 — NEW:** Support keyboard operation, associated form labels, visible focus, accessible validation and status text that does not depend on color. On small screens use a single-column form and a navigation drawer; do not compress the desktop tables into unreadable text.

**ACM-03.05 — NEW:** Display loading, empty, permission-denied, service-error, disabled, draft and unsaved-change states. Save failures preserve unsaved nonsecret values. A failed secret submission may require re-entry; explain this clearly without retaining secrets in browser storage.

### 4.2 Page 1 — Agents

Default to a table with these columns:

| Column | Content |
|---|---|
| Agent | Name and one-line business responsibility. |
| Runtime | Implemented / Planned / Disabled. |
| Primary model | Deployment display name; provider underneath. |
| Fallback | Deployment name or “None.” |
| Configuration | Active version and separate draft indicator. |
| Readiness | Not configured / Requires test / Ready / Needs attention. |
| Last test | Result, timestamp and tested version. |
| Recent use | Request count and error rate over the selected period, or “No activity.” |
| Actions | Configure; Test; View activity; Enable/Disable where permitted. |

Filters: agent status, provider, environment and search. Provide **Configure an agent** as the initial empty-state action; it opens the known role list, not a free-text autonomous-agent builder.

**ACM-04.01 — NEW:** Include the five initial roles and four planned roles in Section 9. Planned roles remain disabled until a business runtime is registered. Do not manufacture execution metrics for them.

**ACM-04.02 — NEW:** Compute readiness from the active version’s dependencies, required capabilities, credential availability and test evidence. Show transient runtime degradation separately from configuration validity. “Last tested successfully” does not promise the provider is currently reachable.

**ACM-04.03 — ENHANCEMENT:** Existing workflow screens must receive a clear availability state. An unavailable live agent returns an actionable message and preserves the user’s work. Do not silently substitute authored demo text and present it as live model output.

### 4.3 Page 2 — Provider connections

Table columns: connection name, provider/API mode, environment, endpoint/region, authentication method, credential state, model/agent dependency counts, last check and enabled state.

Actions: **Add connection**, **Edit**, **Test connection**, **Rotate credential**, **View dependent agents**, **Disable** and **Archive**. Archive is unavailable while an active configuration depends on the connection.

Add/edit flow:

1. Choose a supported provider and API mode.
2. Enter endpoint and authentication details using the appropriate form.
3. Set environment and allowed data/network scope.
4. Save a draft and run connection checks.
5. Register/discover a model deployment and run a model invocation test.
6. Enable the tested connection/deployment and continue to agent assignment.

Connection tests and model invocation tests are distinct. Some providers have no standalone credential-validation endpoint; report “Authentication not verified until model test” when appropriate.

### 4.4 Page 3 — Model deployments

Table columns: display name, model type, provider connection, exact target identifier, underlying model/version, context/input/output limits, capability summary, metadata provenance, last model test and dependent agents.

Actions: **Discover models**, **Register manually**, **Refresh metadata**, **Test model**, **View agents**, **Edit draft** and **Retire**.

The detail view has four sections: Identity; Capabilities & limits; Defaults; Tests & dependencies. Model discovery may require permissions that inference does not require; failed discovery must not prevent manual registration.

### 4.5 Page 4 — Agent configuration

Header: agent name and purpose, runtime availability, active version, draft status, last successful test. Primary actions: **Save draft**, **Test configuration**, **Activate**. Show **Compare versions** and **Restore as draft** in a secondary menu.

Use these tabs or clear form sections:

| Section | Fields and behavior |
|---|---|
| Model & routing | Primary deployment; fallback; execution mode; provider/region/data-scope summary. |
| Generation | Output allowance; supported sampling, reasoning and format controls. |
| Context & evidence | Context allocation; history/retrieval limits; token accounting; overflow policy. |
| Tools & instructions | Registered prompt version; allowed tools; output contract; action policy. |
| Reliability & limits | Deadlines, retries, concurrency, step/tool budgets and application cost controls. |
| Test | Synthetic scenarios, streaming preview, validation and actual usage. |
| History | Changes, active version, test evidence and previous versions. |

A side summary or bottom panel shows resolved settings and configuration errors. Avoid a persistent side panel that makes the main form too narrow at typical laptop width.

**ACM-05.01 — NEW:** Selecting a different deployment immediately recalculates supported settings. Present incompatible overrides as a migration checklist. The administrator must remove or replace them before activation; do not silently drop them.

**ACM-05.02 — NEW:** Keep **Save draft** available for an incomplete configuration. **Activate** is disabled until required fields, secret references, capabilities, policies and required tests pass. Explain each blocker next to the relevant field and in the summary.

**ACM-05.03 — NEW:** Show a redacted request preview containing adapter/API mode, target identifier and translated parameters. Exclude credential values and clinical prompt content. Label it “Request configuration,” not a promise of hidden provider internals.

### 4.6 Page 5 — Tests & activity

Provide tabs for **Tests**, **Executions**, **Usage** and **Changes**. Reuse existing operations components where appropriate.

Filters: date range, agent, provider connection, deployment, configuration version, environment, outcome and test/live mode. Row details show a redacted execution timeline, attempts, tool status, token usage, errors and linked configuration version.

Export only fields the viewer may access. Exported configuration and diagnostics never contain keys, tokens, raw authentication headers or unrestricted member data.

## 5. Provider connection field requirements

### 5.1 Common connection fields

| Field | Required/default | Validation and behavior |
|---|---|---|
| Connection name | Required | Human-readable; unique within workspace/environment; 2–100 characters as a product limit. |
| Provider | Required | OpenAI, Azure OpenAI, Amazon Bedrock, Anthropic or OpenAI-compatible for P0. |
| API mode | Required | Adapter-specific enum; never inferred only from a model name. |
| Environment | Required | Development, Test or Production; use existing environment definitions. |
| Description | Optional | Plain text; no credentials or patient details. |
| Endpoint/base URL | Conditional | Preset or provider-specific field; backend validates and shows the normalized effective URL. |
| Authentication method | Required | Only methods implemented by that adapter. |
| Credential source | Conditional | Enter a new secret, select an authorized secret reference, or use configured server identity. |
| Region/location | Conditional | Required for providers/modes that need it; not guessed from the browser’s location. |
| Allowed data scope | Required | Synthetic only by default in the demo; other scopes require existing organizational authorization. |
| Approved processing locations | Conditional | Required when workspace policy imposes location restrictions; “Unknown” is not a compliant location. |
| Network policy | Required | Approved public endpoints or specifically approved private endpoints. |
| Request storage preference | Where supported | Adapter maps the setting; unsupported or account-controlled behavior is clearly identified. |
| Connection state | Draft initially | Draft permits explicit authorized synthetic configuration tests only. Enabled permits normal scoped inference. Disabled blocks both tests and normal inference until explicitly reopened as a draft or re-enabled through validation. Archived is retained for history. |
| Owner | Required | Existing user/team identifier for operational responsibility. |

These are Perform+ product requirements. Provider-specific API behavior below is grounded in the linked official documentation; it must be rechecked when implementing or upgrading an adapter.

### 5.2 OpenAI direct — P0

| Field | Requirement |
|---|---|
| API mode | Responses as the preferred new integration; Chat Completions only through an explicitly implemented compatibility mode. |
| Base URL | Preset `https://api.openai.com/v1`; route arbitrary gateways through the compatible-endpoint adapter. |
| Authentication | API key entered once or referenced from server-side secret storage. Federated short-lived identity can be added in P1. |
| Project ID / organization ID | Optional scoped settings when needed by the account/credential arrangement. |
| Model ID | Stored on the deployment; select from discovery or enter an exact supported identifier. |
| API version | No Azure-style dated version field on this form. |

Use the selected SDK/API’s authentication conventions. OpenAI documents bearer credentials and server-side secret handling; its Responses and Chat Completions surfaces are distinct. [OpenAI API overview](https://developers.openai.com/api/reference/overview)

For reasoning models, output accounting can include reasoning and non-visible tokens. The adapter must translate the application’s output allowance accordingly and recognize an incomplete response even if little visible text was produced. [OpenAI reasoning guide](https://developers.openai.com/api/docs/guides/reasoning)

### 5.3 Azure OpenAI — P0 v1; P1 legacy compatibility

| Field | Requirement |
|---|---|
| API mode | Azure OpenAI v1; dated API only if its separate adapter is implemented. |
| Resource endpoint | Resource origin, such as `https://{resource}.openai.azure.com`; show the derived v1 base ending `/openai/v1/`. Support documented Foundry resource hosts through the adapter. |
| Authentication | API key or configured Microsoft Entra identity with server-side token refresh. |
| Identity choice | Managed identity/workload identity when available; show only applicable identity selectors. |
| User-assigned identity client ID | Conditional for the selected identity mode. Do not require it for system-assigned identity. |
| Deployment name | Required on the deployment object; this is the inference target. |
| Underlying model/version | Separate metadata; do not substitute it for the deployment name. |
| Dated API version | Required only for legacy mode. |
| Discovery scope | Optional subscription, resource group and account details for management-plane discovery. |

Azure’s v1 API does not require a dated `api-version` parameter. The request’s model identifier is the deployment name. Keep legacy URL construction separate. [Azure API lifecycle](https://learn.microsoft.com/en-us/azure/foundry/openai/api-version-lifecycle?view=foundry-classic), [Azure endpoint switching](https://learn.microsoft.com/en-us/azure/foundry-classic/openai/how-to/switching-endpoints?view=foundry-classic)

Managed identity/token acquisition must use a server-side credential provider, with the appropriate cloud audience owned by the adapter. The UI must not ask an administrator to paste a permanent bearer token. [Microsoft managed identity guidance](https://learn.microsoft.com/en-us/azure/developer/python/sdk/authentication/system-assigned-managed-identity)

Deployment discovery is a management operation with its own permissions. Manual deployment entry must work when inference is permitted but discovery is not. [Azure deployments list](https://learn.microsoft.com/en-us/rest/api/microsoftfoundry/accountmanagement/deployments/list?view=rest-microsoftfoundry-accountmanagement-2025-06-01)

### 5.4 Amazon Bedrock — P0 Converse

| Field | Requirement |
|---|---|
| API mode | Bedrock Converse for P0. Other Bedrock API surfaces require separate implemented modes. |
| AWS region | Required; use SDK region/partition endpoint resolution. |
| Runtime endpoint | Derived by default; an approved private override is an advanced setting. |
| Authentication | Server runtime identity; configured assumed role; explicit AWS credentials where permitted; or supported Bedrock bearer API key. |
| Role configuration | Conditional role ARN, credential-source reference and external ID when required. Obtain/refresh temporary credentials on the server. |
| Explicit credentials | Access key ID and secret access key; session token additionally required for temporary credentials. |
| Bedrock API key | Secret reference, key type, known expiry and refresh strategy. Keep it distinct from an OpenAI key. |
| Inference target type | Foundation model or supported system/application inference profile. Other resource types appear only if implemented. |
| Target ID / ARN | Exact target identifier on the deployment, separate from underlying model metadata. |
| Profile destinations | Resolved processing destinations and policy status for cross-region profiles. |

Converse uses Bedrock Runtime, supports common and model-specific inference settings, and has different invocation permissions for streaming. [Bedrock Converse](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html)

Use the SDK’s server credential mechanisms and refresh behavior. Manually supplied temporary AWS credentials include a session token. [AWS credential providers](https://docs.aws.amazon.com/sdkref/latest/guide/standardized-credentials.html), [AWS static credentials](https://docs.aws.amazon.com/sdkref/latest/guide/feature-static-credentials.html)

Bedrock supports its own bearer API keys. Short-term keys expire and need refresh; AWS positions long-term keys for exploration. The UI must expose expiry and refresh status rather than assume keys never expire. [Bedrock API keys](https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys.html)

Inference profiles may route outside the source region. Resolve and check the profile’s destination set, including changes to that set; a US source region alone does not establish US-only processing. [Using inference profiles](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-use.html), [Supported inference profiles](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html)

**P1 constraint:** Bedrock’s OpenAI-compatible modes have their own endpoints, identifiers and feature differences. Do not implement them by switching the Converse connection’s base URL. Register a separate adapter and verify storage, tools, streaming and target support. [Bedrock Responses API](https://docs.aws.amazon.com/bedrock/latest/userguide/bedrock-mantle.html)

### 5.5 Anthropic direct — P0

| Field | Requirement |
|---|---|
| API mode | Anthropic Messages. |
| Endpoint | Preset service origin `https://api.anthropic.com`; the adapter constructs `/v1/messages`. |
| Authentication | API key/secret reference using the supported SDK authentication mechanism. |
| Workspace ID | Conditional when required by the selected credential type. |
| API version | Adapter-supported `anthropic-version`, with a tested default; advanced changes require compatibility validation. |
| Model ID | Exact inference model identifier on the deployment. |
| Feature headers | Only an allowlisted set for features the adapter actually implements. |

Anthropic documents native Messages authentication/version headers, including bearer authentication and continued `x-api-key` support. Claude hosted on another cloud uses that host’s integration; do not reuse the direct Anthropic key automatically. [Anthropic API overview](https://platform.claude.com/docs/en/api/overview)

Output limits, thinking controls and sampling support depend on the model/API combination. Some documented models reject formerly common sampling overrides. Build capability-driven controls rather than assume temperature, top-p and top-k are universally tunable. [Anthropic Messages reference](https://platform.claude.com/docs/en/api/messages/create)

### 5.6 OpenAI-compatible / private endpoint — P0

This is a protocol integration, not a guarantee of OpenAI feature parity. It can support a tested private deployment, gateway or vendor endpoint using the implemented protocol. An NVIDIA-hosted or self-hosted model can use this route after its actual endpoint, authentication and capabilities are verified; do not infer them from a model’s marketing page.

| Field | Requirement |
|---|---|
| Connection name/vendor label | Required human-readable label; independent of model manufacturer. |
| Protocol mode | Chat Completions compatible or Responses compatible, only where implemented. |
| Base URL | Required API root, including any documented path prefix; preview the complete derived route. |
| Authentication | Bearer key by default; configured header-based secret if supported; no-auth only for explicitly approved private/development endpoints. |
| Model ID | Manual entry always available; discovery optional. |
| Custom headers | Allowlisted nonsecret values or secret references; reserved routing/authentication headers cannot be overwritten arbitrarily. |
| Capability profile | Verified adapter profile or explicitly declared metadata with provenance. |
| Server context cap | Optional lower deployment cap, supplied by its operator; separate from the base model’s advertised limit. |
| TLS trust | System trust or an administrator-managed server trust reference. Never a normal “ignore certificate errors” checkbox. |

**ACM-06.01 — NEW:** Normalize endpoints once. Reject embedded credentials, fragments, unapproved query parameters and malformed URLs. Avoid duplicated `/v1`, deployment paths or operation suffixes; show the exact redacted request route before testing.

**ACM-06.02 — NEW:** Implement provider-owned authentication and serialization. The UI may share components, but a generic `base_url + api_key + model` request builder does not satisfy Azure, Bedrock and Anthropic support.

**ACM-06.03 — NEW:** Host provider and model manufacturer are separate metadata. For example, a Claude model selected through Bedrock uses the Bedrock connection, target identifier and authentication.

### 5.7 Additional providers — P1

| Provider | Configuration requirements |
|---|---|
| Google Gemini API | Native adapter, provider-supported API-key authentication, model identifier and API version; discover available generation methods and model-specific limits. |
| Google Vertex AI | Separate adapter and server identity strategy, project/location and inference target; do not treat a Gemini API key as a universal Vertex credential. Verify the selected endpoint family’s official authentication contract during implementation. |
| Additional commercial/private providers | Use a proven compatible adapter when its protocol matches; otherwise implement a native adapter. “Custom” must not mean forwarding arbitrary unvalidated JSON to arbitrary URLs. |

Gemini’s model metadata can expose separate input/output token limits and supported generation settings. This illustrates why the catalog needs capability metadata rather than one universal settings form. [Gemini model API](https://ai.google.dev/api/models)

## 6. Model deployment catalog and capability metadata

### 6.1 Deployment fields

| Field | Requirement |
|---|---|
| Deployment ID | Stable internal identifier generated by Perform+. |
| Display name | Required; unique within its workspace/environment. |
| Connection/version | Required compatible connection reference; a draft may reference a draft connection for explicit tests. Active runtime bindings require an enabled connection. |
| Model type | Generation, embedding or reranker; P0 requires generation only. |
| Inference target | Exact provider model ID, Azure deployment name, Bedrock target ID/ARN or compatible-server identifier. |
| Underlying model/version | Optional when unavailable; show “Not reported” instead of guessing. |
| Version policy | Fixed identifier where available; identify aliases or provider-managed upgrades explicitly. |
| Context limit | Combined context ceiling when the model/provider defines one. |
| Input limit | Separate maximum input tokens when defined. |
| Output limit | Separate maximum output/generation tokens when defined. |
| Server limit | Optional lower deployment-specific limit. |
| Capabilities | Text generation, streaming, tools, structured output, vision/document input, reasoning and token counting, each independently described. |
| Supported parameters | Names, types, legal ranges/enums, defaults if known, dependencies and exclusions. |
| Metadata provenance | Provider response, versioned adapter catalog, operator declaration or probe; include timestamp/source. |
| Capability evidence | Declared, advertised, tested, unsupported or unknown; preserve what each test actually verified. |
| Lifecycle | Draft, Available, Deprecated, Disabled or Retired. |
| Pricing reference | Optional dated rates/currency/source; unknown cost remains unknown. |
| Agent defaults | Optional generation/context defaults that agents may inherit within policy. |

**ACM-07.01 — NEW:** Support discovery and manual entry. Discovery must not require broad cloud account permissions merely to use a known deployment.

**ACM-07.02 — NEW:** Treat a discovered catalog entry as a candidate, not proof of invocation access. Keep discovery, connectivity, generation and agent capability test results separate. Bedrock catalog listing and model access are distinct concerns. [Bedrock model catalog](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_ListFoundationModels.html), [Bedrock model access](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html)

**ACM-07.03 — NEW:** A successful short request must not be labeled as proof of the advertised maximum context or every feature. Record the tested payload size, protocol and capabilities. For manually declared limits, show the declaration source and require a bounded agent budget and successful representative test.

**ACM-07.04 — NEW:** Refreshing metadata creates a candidate revision. If an active agent becomes incompatible, flag the dependency and block new activation; do not silently rewrite its settings. Provider changes that make the active route unusable must produce a clear operational error.

**ACM-07.05 — NEW:** Retain immutable configuration snapshots, while acknowledging that a provider-controlled alias may resolve to a changed model. Record the requested identifier and returned model/version when available. Do not promise bit-for-bit reproduction from a configuration version alone.

**ACM-07.06 — NEW:** Reject an embedding/reranking deployment as an agent’s generation model. Later embedding changes must consider index version and vector dimension compatibility; an index migration is not an ordinary chat-model switch.

## 7. Agent settings: detailed field dictionary

### 7.1 Model routing

| Setting | Requirement/default |
|---|---|
| Agent enabled | Off until its runtime and active configuration are ready. |
| Execution mode | Live or Simulation; mode displayed in tests and operator diagnostics. |
| Primary deployment | Required for Live; only compatible deployments in the current scope. |
| Fallback deployment | Optional; one in P0; off by default. Must independently satisfy capability/data/region requirements. |
| Fallback conditions | Selected transient infrastructure failures before user-visible output; detailed behavior in Section 11. |
| Model selection policy | Fixed primary/fallback in P0. No hidden LLM-selected “best model” routing. |
| Version selection | Explicit active deployment/configuration revision; no arbitrary latest-version substitution. |

### 7.2 Generation and output

| Setting | UI and validation |
|---|---|
| Maximum generated tokens | Positive integer within the selected model’s limit; adapter translates to the correct provider field and semantics. |
| Temperature | Show only when supported; allow Provider default; use the model’s permitted range. Zero does not guarantee deterministic output. |
| Top-p | Advanced, capability-dependent; normally leave inherited/default. Warn against redundant simultaneous tuning where applicable. |
| Top-k | Advanced, only for models/API modes that accept it. |
| Stop sequences | Optional list with adapter-specific count/length limits; incompatible structured-output/tool modes are blocked. |
| Presence/frequency penalties | Optional only if explicitly supported; absent otherwise. |
| Seed | Optional where supported; label reproducibility as best effort. |
| Reasoning mode/effort | Dynamic supported options; no hardcoded universal low/medium/high list. |
| Reasoning token budget | Only where that API exposes it; enforce coupling with total output and thinking mode. |
| Answer verbosity | Optional if the model exposes a real parameter; otherwise part of the versioned prompt, clearly labeled. |
| Streaming | On for compatible Ask Perform+ text responses; optional for background tasks. |
| Output format | Agent-defined text or structured schema; cannot weaken a required business output contract. |
| Structured-output mechanism | Native constrained output where supported, or explicit parse-and-validate path when the agent permits it. |
| Tool choice | Auto, required or a specific registered tool only if supported and permitted by the agent contract. |
| Parallel tool calls | Capability- and tool-policy-dependent; writes remain governed by business action controls. |
| Provider-specific options | Typed allowlisted fields from the adapter; no unrestricted raw JSON escape hatch in P0. |

**ACM-08.01 — NEW:** Unsupported settings are never sent. When changing models makes a previously saved override unsupported, require an explicit configuration correction before activation.

**ACM-08.02 — NEW:** “Provider default” means omit the optional parameter unless the API requires an explicit field. It must not mean sending `null`, zero or a guessed value. Required output limits must resolve to a valid explicit value.

**ACM-08.03 — NEW:** Validate structured results on the server before applying them to a workflow. A JSON response alone is not proof that IDs, citations, diagnoses or actions are valid. An optional bounded repair attempt must be separately logged and included in the execution budget.

**ACM-08.04 — NEW:** Do not request or expose hidden chain-of-thought as an administration feature. Show evidence-based explanations, provider-supported summaries where appropriate and reasoning-token usage when available.

### 7.3 Context and evidence settings

| Setting | Requirement |
|---|---|
| Model context/input/output limits | Read-only capability metadata with source. Editing a user budget cannot enlarge these limits. |
| Agent context budget | Adjustable application ceiling, no larger than the applicable effective model/server/policy limit. |
| Reserved output | Derived from the generation allowance and provider-specific reasoning semantics. |
| Safety margin | Application reserve for tokenizer estimation/serialization overhead; configurable within policy. |
| Conversation history budget | Maximum token allocation for prior turns; use tokens rather than only turn count. |
| Retrieved evidence budget | Maximum tokens and documents/chunks; must fit after required instructions and output reservation. |
| Tool result budget | Bound large results and reserve capacity for required tool responses. |
| Evidence sources | Registered, authorized retrieval collections/tools; no arbitrary database or URL entry in the agent form. |
| Retrieval top-k | Maximum candidate passages; separate from sampling top-k and labeled “Retrieved passages.” |
| Evidence age/date scope | Agent/business-policy setting where applicable; retain encounter/service dates in returned evidence. |
| Overflow handling | Controlled retrieval reduction, history summary or explicit rejection; rules below. |
| Citation requirements | Enabled for evidence-grounded agents; not removable by a generation override. |
| Cross-session memory | Off by default; any later memory must be scoped to user/workspace/member authorization. |

**ACM-09.01 — NEW:** Display a token budget breakdown for instructions, tool definitions, conversation, evidence, tool results, reserved generation and safety margin. Identify estimated versus provider-counted values.

For an API with a combined context ceiling, validate:

```text
effective_context = minimum of applicable known model, server,
                    organization and agent context ceilings

serialized_input_tokens + reserved_generation_tokens + safety_margin
    <= effective_context
```

Also enforce any independent input and output limits. Serialized input includes system/developer instructions, user messages, tool schemas, history, evidence and prior tool outputs. Multimodal payloads require model-specific accounting and request-size limits, not character-count approximations alone.

**ACM-09.02 — NEW:** Do not subtract reasoning tokens twice when a provider already includes them in its output allowance. Keep visible answer length, reasoning usage and total billed/generated tokens distinguishable when the provider reports them. The adapter owns these semantics.

**ACM-09.03 — NEW:** Unknown model limits require a declared conservative deployment limit with provenance and a successful representative test before Live activation. A test does not convert that declaration into an independently proven maximum.

**ACM-09.04 — NEW:** Recalculate the complete serialized budget before every model call, including tool-response rounds and fallback attempts. Retokenize using the destination model’s tokenizer/counting method or a documented conservative estimate.

**ACM-09.05 — NEW:** On overflow, remove redundant retrieved content first, then summarize permitted older conversation while retaining references. Preserve required instructions, selected-member identity, dates, clinical negation and evidence needed for the requested decision. If required content still cannot fit, stop with a clear message or ask the user to narrow the request. Never silently discard decisive evidence and present a complete conclusion.

Illustrative calculation, not a recommended model setting:

```text
Declared effective combined context: 32,768 tokens
Reserved generated tokens:            4,096 tokens
Safety margin:                       1,024 tokens
Maximum serialized input:           27,648 tokens
```

The chosen model must actually support those limits. Larger reasoning requirements may require a larger output reservation or a different model.

### 7.4 Instructions, tools and business controls

| Setting | Requirement |
|---|---|
| Instruction template | Select a registered, versioned template; display its purpose and required variables. |
| Instruction overrides | Optional administrator-authored supplement within policy. Locked application authorization and clinical decision rules are not editable here. |
| Allowed tools | Select from tools registered for this agent role; show read-only, internal-write or external-action classification. |
| Tool permissions | Enforced by the backend using the current user/task scope, not inferred from the prompt. |
| Maximum model rounds | Positive bounded integer; prevents recursive or unending tool loops. |
| Maximum tool executions | Separate per-run allowance, including retries as defined by the tool contract. |
| Output contract | Versioned schema/citation requirements owned by the agent’s business implementation. |
| Business action approval | Existing workflow rules; this page cannot remove required human review or authorize new external actions. |

**ACM-10.01 — ENHANCEMENT:** Model configuration must preserve the distinction between a proposed finding, a human-supported decision, independent QA and an accepted submission. A model response does not advance those states by itself.

**ACM-10.02 — NEW:** Treat retrieved documents and tool results as untrusted content. Instructions embedded in them cannot change agent tools, configuration, credentials or authorization.

**ACM-10.03 — NEW:** Template variables use an explicit schema. Reject unknown or missing required variables and prevent substitution from accessing arbitrary environment variables, secret stores or server files.

### 7.5 Reliability and application limits

The following numbers are **initial Perform+ defaults for tuning**, not provider guarantees. Validation must consider the selected model and representative tests.

| Setting | Initial default | Requirement |
|---|---|---|
| Connection timeout | 10 seconds | Positive bounded duration; includes network connection establishment. |
| First-token deadline | 30 seconds | For streaming requests; independently adjustable for slower reasoning models. |
| Stream idle timeout | 30 seconds | Time without a provider event; distinguish from total task duration. |
| Overall interactive deadline | 120 seconds | Includes application retries, model rounds and tools. |
| Overall background deadline | 300 seconds | Applies to registered background workflows; use existing job cancellation. |
| Total provider calls | Maximum 8 per run initially | Counts every actual provider request, including ordinary model rounds, retries and fallback; no multiplicative retry layers. |
| Additional retry/fallback calls | Maximum 2 per run initially | Shared across all logical model rounds and routes, within the total provider-call ceiling. |
| Maximum model rounds | 6 | Counts inference rounds in a tool loop; agent may require a lower or higher tested value. |
| Maximum tool executions | 8 | Bound the actual business-tool operations, not just tool definitions. |
| Agent concurrency | 2 per backend deployment initially | Shared limiter across application replicas; avoid per-browser counters. |
| Shared connection concurrency | 4 initially | Aggregate agents sharing that credential/deployment capacity. |
| Queue limit | 20 waiting requests initially | Show queued state; cancel or reject when the bounded queue is full. |
| Application token/cost budget | Optional | Separate warning and enforcement settings; these do not change provider account limits. |

A **model round** is one logical inference step; a **provider call/attempt** is an actual request for that step. A normal six-round workflow uses six calls and can use up to two additional retry/fallback calls with these defaults. Model-based JSON repair and history summarization also consume model rounds, provider calls, tokens and the same overall deadline. They are not hidden unbounded side requests.

**ACM-11.01 — NEW:** Show whether limits apply per request, agent, deployment, connection, workspace or time period. Aggregate shared usage so assigning the same connection to more agents does not bypass the limit.

**ACM-11.02 — NEW:** Configure or disable SDK retries so total retries obey the application’s attempt and deadline budgets. Respect provider retry guidance, including `Retry-After`, with bounded backoff and jitter.

**ACM-11.03 — NEW:** Enforce cost controls using a preflight reservation and reconciliation when rates/usage permit. Label estimates and potential billing lag. If a configured hard cost ceiling cannot be evaluated because pricing is unknown, block that cost-controlled route or require an explicit token/request cap policy; never treat unknown cost as zero.

## 8. Secrets, endpoint access and data handling

These requirements protect the requested credential configuration feature. They are implementation controls, not new claims of regulatory certification or provider contractual coverage.

### 8.1 Credential lifecycle

**ACM-12.01 — NEW:** Persist API keys, secret access keys, session tokens and sensitive custom headers only in a server-side secret mechanism. Prefer existing managed secret storage. If the application stores encrypted secret values, keep encryption keys outside the application database and support key rotation. A development environment may use authorized server environment references.

**ACM-12.02 — NEW:** After submission, return only a secret reference and status such as “Configured.” Never return the stored secret to the browser. Newly entered secret values may exist transiently in the input form; clear them after successful submission and do not persist them in local storage, session storage, URLs or client logs.

**ACM-12.03 — NEW:** Editing a connection without supplying a replacement secret preserves the existing secret. Use a separate **Replace credential** action; a masked placeholder must never be submitted as the actual credential. Removing a credential is an explicit operation with a dependency warning.

**ACM-12.04 — NEW:** Credential rotation creates a candidate secret version behind a stable credential-binding ID. Before shared cutover, verify invocation access and required API permissions for every distinct active dependent target/API mode; one successful model probe is insufficient when keys can have different scopes. Show the dependency checklist. Atomically update the binding's active secret version only after required access checks pass. Failed rotation leaves the previous active reference unchanged unless an administrator explicitly disables it. Do not restore a revoked secret during configuration rollback.

**ACM-12.05 — NEW:** Keep secrets out of model prompts, tool arguments, analytics, exception payloads, screenshots, exported files and audit diffs. Redact provider errors and HTTP traces before storing or returning them. Record secret-reference changes, not secret values.

**ACM-12.06 — NEW:** Refresh short-lived credentials on the server. Record expiry/refresh status and a sanitized failure reason. Do not require an administrator to repeatedly paste expiring tokens for a configured managed identity.

Routine token refresh for the same configured identity does not invalidate configuration tests. Replacement-key access checks supersede the previous credential-access results; unchanged prompt, schema and capability tests can retain their normal validity period. Changes to authentication mode, tenant/principal, endpoint or approved data/region scope require an ordinary connection revision and affected-agent validation, rather than being treated as simple secret rotation.

### 8.2 Custom endpoints and network behavior

**ACM-13.01 — NEW:** All provider traffic originates from the backend. Apply an outbound policy to normalized hostnames and resolved destinations. Block cloud metadata endpoints and unapproved loopback/link-local destinations. Explicitly approved private inference networks remain supported.

**ACM-13.02 — NEW:** Validate destinations at connection creation and request time, including DNS resolution. Disable cross-host redirects by default; never forward credentials to a redirected host. Reject endpoint paths or headers that attempt to override authentication or routing outside the selected adapter contract.

**ACM-13.03 — NEW:** Require HTTPS for ordinary external connections. Permit HTTP only for explicitly configured local/private development deployments under server policy. Explain that `localhost` refers to the backend’s network namespace, not the administrator’s laptop browser.

**ACM-13.04 — NEW:** Private networking, proxies and custom certificate authorities use references to server-managed configurations. Do not place unrestricted proxy URLs or certificate-verification bypasses in each agent form.

### 8.3 Data scope and provider behavior

**ACM-14.01 — NEW:** Filter available routes by the task’s data classification and the connection’s approved data scope. Apply the same rules to testing, fallback, evidence retrieval and diagnostic capture.

**ACM-14.02 — NEW:** Keep application authorization, provider request-storage controls and provider account/contract settings distinct. A local checkbox must not claim to activate a BAA, disable all provider retention or establish compliance. Show account-controlled or unknown behavior explicitly.

**ACM-14.03 — NEW:** Default test scenarios to synthetic data. Persist metadata and validation results; raw clinical prompts/responses are excluded from diagnostic storage by default. Where content retention is separately authorized, reuse existing access, retention and deletion controls.

**ACM-14.04 — NEW:** Provider-side files, sessions, caches and hosted tools are disabled unless the implemented feature explicitly handles their authorization, retention and cleanup. A compatible API must not silently activate provider storage because of an unexamined default.

## 9. Agent-by-agent configuration requirements

Use existing stable runtime IDs if present. The identifiers below are proposed canonical IDs for mapping, not an instruction to rename working code unnecessarily.

| Agent / proposed ID | Model requirements | Configuration emphasis | Business boundary |
|---|---|---|---|
| **Ask Perform+** / `ask_perform` | Streaming text, approved tool calling; sufficient context for scoped conversation and evidence. | Response latency, conversation allocation, allowed analytical/navigation tools and citation requirements. | Reads only authorized data; drafts or proposes actions through established workflows. |
| **Clinical Evidence** / `clinical_evidence` | Structured extraction and source references; vision/document input only if this workflow actually sends those formats. | Evidence budget, document limits, extraction schema, dates/negation and missing-evidence handling. | Does not convert extracted text into an approved coded diagnosis. |
| **Suspecting & Recapture** / `suspecting_recapture` | Structured outputs and evidence/tool access; may orchestrate a separate predictive service. | Candidate evidence, current versus historical findings, source coverage, ranking explanation and output schema. | LLM confidence is not calibrated diagnostic probability; predictive model version/score stays separate. |
| **Coding & Integrity** / `coding_integrity` | Structured proposals, cited evidence and approved coding/rules tools. | Versioned coding references, unsupported-code review and contradiction handling. | Human review/QA remain authoritative; no automatic code acceptance. |
| **Risk Analytics** / `risk_analytics` | Structured query/tool calls and explanation of returned results. | Metric definitions, scope filters, scoring-run IDs, query timeout and numeric consistency. | Computes authoritative RAF/financial results through deterministic services, not generated arithmetic. |
| **Chart Retrieval Coordinator** / `chart_retrieval` | Optional later model-assisted routing and status summarization. | Read status, identify missing material and draft internal follow-up. | Routine retrieval state transitions remain ordinary application logic; external contact requires authorization. |
| **Campaign & Provider Engagement** / `campaign_engagement` | Optional later drafting/planning with structured cohort tools. | Member selection, capacity constraints and draft communication templates. | Does not send messages or activate external outreach simply because a model suggested it. |
| **Submission & Reconciliation** / `submission_reconciliation` | Optional later exception explanation and approved reconciliation tools. | Exact submission IDs, response codes and supported corrective actions. | File formatting, validation and transmission remain deterministic/controlled. |
| **Audit Preparation** / `audit_preparation` | Optional later source-grounded narrative and manifest tools. | Trace completeness, references, decision history and missing links. | Does not fabricate audit evidence or assert unsupported certification. |

**ACM-15.01 — NEW:** Register per-agent minimum capabilities, output schema, allowed tools and default limits in backend metadata. Use those requirements to filter deployment selection and determine tests.

**ACM-15.02 — ENHANCEMENT:** An agent configuration change must affect subsequent executions of the corresponding existing workflow, including background jobs. Saving a model name only in the settings UI is not an integration.

**ACM-15.03 — NEW:** Support a shared primary deployment as the initial setup. Permit per-agent overrides based on measured requirements. Do not require a separate credential, paid provider account or running model server for each role.

**ACM-15.04 — NEW:** Keep predictive suspecting thresholds, RAF model selection and coding rules in their appropriate business/model settings. Link to them from the agent form when useful; do not mix them with temperature or context-window settings.

## 10. Testing, activation and version lifecycle

### 10.1 Staged test sequence

| Stage | What it verifies | What it does not establish |
|---|---|---|
| Form validation | Required fields, endpoint syntax, policy and parameter compatibility. | Network reachability or model access. |
| Connection check | Backend network/TLS and supported authentication checks. | Model invocation rights unless a model request was actually made. |
| Discovery | Ability to list catalog/deployments. | Ability to invoke every listed model. |
| Model probe | Selected target returns a valid minimal synthetic response. | Full context capacity or business accuracy. |
| Agent capability test | Required streaming/tools/schema/input modality using safe fixtures. | General clinical or financial validity. |
| Representative task test | Actual agent execution path with a synthetic business scenario and assertions. | Production performance across all data and loads. |

Each result records **Passed**, **Failed**, **Not tested** or **Not applicable**, with scope and timestamp. Do not combine untested checks into a single green “Everything connected” badge.

### 10.2 Test panel behavior

Provide a built-in synthetic sample picker, optional authorized synthetic input, **Run test**, **Cancel**, response preview and assertion results. Show the selected draft hash/version, model target, execution mode, latency, first-token timing where applicable, provider-reported tokens and estimated cost when available.

Show a brief notice beside Run test: “Uses the selected provider and may incur usage charges.” The explicit test action authorizes that test; do not add repetitive confirmation dialogs for every request.

**ACM-16.01 — NEW:** Use the same backend dispatcher, adapter, serialization, policy and tool validation path as real agent execution. A frontend-only mock response cannot pass a Live test.

**ACM-16.02 — NEW:** A connection test uses a deliberately selected target when inference is needed. Do not automatically enable paid subscriptions, request access to every model or run a paid probe against an entire provider catalog.

**ACM-16.03 — NEW:** Tests for tool calling use inert fixtures or safe read-only tools. They must not create actual campaigns, send communications, change member codes or transmit submissions.

**ACM-16.04 — NEW:** Test the capabilities required by the selected agent. For example: Ask Perform+ streams and performs a harmless tool round-trip; Clinical Evidence returns the required schema and valid source references; Risk Analytics returns the exact numeric values from a stubbed scoring tool.

**ACM-16.05 — NEW:** Test failures show actionable sanitized categories: endpoint/network; invalid/expired credential; permission denied; unknown model/deployment; unsupported parameter; rate/quota limit; context overflow; schema failure; tool failure; provider refusal; timeout/interruption. Retain a correlation ID for investigation.

**ACM-16.06 — NEW:** Test each enabled fallback independently for invocation access and every capability required by the agent, using its own translated settings and context policy. Primary test results cannot qualify the fallback. An administrator may remove an unverified fallback and activate a verified primary without it.

### 10.3 Draft → tested → active

1. Save draft with validation results and an optimistic-concurrency revision.
2. Resolve its exact connection/deployment/prompt/tool dependencies.
3. Run required tests against that snapshot.
4. Attach results to the snapshot hash and credential reference/version tested.
5. Activate atomically if the draft and dependencies still match and all gates pass.
6. Retain the prior active version and record actor, time and change reason.

**ACM-17.01 — NEW:** Any material change to endpoint, credential, target, parameters, prompt, tools, data route or capability contract invalidates relevant previous tests. An unchanged display name/description does not require new inference tests. Default test freshness for activation is 24 hours, configurable by organization policy.

**ACM-17.02 — NEW:** A simulation test can activate a Simulation configuration only. Activating Live requires a real provider response and the required agent tests. Clearly distinguish locally authored scenario output from live inference in the demo/operator view.

**ACM-17.03 — NEW:** Activation creates an immutable version. New runs resolve and pin that version at start, including the endpoint, target, parameters, prompt, tool contract, authentication identity/configuration and stable credential-binding ID. Secret values are not pinned in the snapshot: the binding's active secret version may rotate under Section 8.1. Record the actual secret/token version or nonsecret refresh identifier used by each attempt. Existing runs retain their other configuration settings.

**ACM-17.04 — NEW:** Shared connection/deployment edits show the affected agent list. Keep changes as draft revisions until validated. Do not silently switch every dependent agent to an untested endpoint or model.

**ACM-17.05 — NEW:** Restore a previous version as a new draft, revalidate current dependencies and activate a new version. Do not erase history or reactivate a revoked credential automatically. Concurrent edits must receive a conflict response instead of overwriting one another.

**ACM-17.06 — NEW:** Disable blocks new calls and cancels queued work referencing the disabled route. In-flight provider calls may finish under the recorded snapshot unless the administrator selects an emergency stop; further model/tool rounds stop. An emergency stop requests cancellation and prevents downstream actions, while acknowledging the provider may already have processed a request.

## 11. Runtime routing and failure behavior

### 11.1 Required execution sequence

1. Authenticate the request and resolve workspace, user and business record scope.
2. Resolve the agent’s active version and confirm its runtime is implemented/enabled.
3. Validate input and allowed tools against the agent contract.
4. Check route data/region/network policies and connection/deployment state.
5. Acquire the concurrency slot and reserve execution/token/cost budgets.
6. Assemble the prompt and evidence; validate serialized token/request-size limits.
7. Resolve the credential server-side and call the provider through its adapter.
8. Handle streaming, tool requests or structured output using the registered contracts.
9. Validate evidence references, record IDs and business output before returning/applying it.
10. Record outcome, attempts, configuration version and usage; release resources.

**ACM-18.01 — NEW:** Retry only appropriate transient failures, such as selected rate limits, temporary service errors or connection failures before usable output, within the shared attempt/deadline budget. Credential, permission, invalid-input and unsupported-parameter errors return actionable failures rather than blind retries.

**ACM-18.02 — NEW:** Fallback is explicit, ordered and limited to a configured compatible deployment. Recheck destination policy and context accounting. Log why it happened and which route responded. Do not use fallback to evade a safety refusal, data restriction or missing business permission.

**ACM-18.03 — NEW:** If streaming has already delivered text, do not silently splice a second model’s continuation into the same answer. Mark the response interrupted, preserve its partial status and offer an explicit retry/restart. Never present an incomplete structured result as a completed task.

**ACM-18.04 — NEW:** Preserve tool invocation IDs and completed tool results across safe retries. Side-effecting operations require backend idempotency and existing business authorization. A model retry or fallback cannot replay a completed outreach, coding update or submission action.

**ACM-18.05 — NEW:** A fallback with an unknown or unapproved destination, insufficient context or missing required tool/schema support is ineligible. Return the primary error with an explanation of fallback unavailability; do not silently use a public endpoint.

**ACM-18.06 — NEW:** A global model/provider outage must not disable ordinary member browsing, manual review or deterministic RAF calculations. Limit the failure to the dependent AI features and preserve existing business state.

### 11.2 User-facing outcomes

| Situation | Required behavior |
|---|---|
| Agent unconfigured | “This assistant has not been configured. Contact your workspace administrator.” |
| Live call in progress | Show normal task/stream status; allow cancellation. |
| Temporary provider failure | Preserve input/work; explain retry availability. |
| Context too large | Explain the needed reduction without exposing internal prompts; offer a narrower scope. |
| Partial stream | Mark incomplete; provide retry, without claiming the previous answer was complete. |
| Successful approved fallback | Normal result; operator details identify the fallback. Show a user-facing note if the change affects a meaningful user choice. |
| Invalid structured output | Do not apply partial findings; report that the task could not be completed reliably. |

## 12. Usage, diagnostics and audit history

### 12.1 Required execution fields

| Category | Fields |
|---|---|
| Identity | Run ID, workspace/environment, agent ID, active configuration version, prompt/schema versions. |
| Routing | Connection/deployment revision, requested target, returned model/version where available, region/profile and attempt number. |
| Timing | Queued/start/end timestamps, first-token latency if applicable, total duration and cancellation time. |
| Outcome | Success, failed, refused, incomplete or cancelled; sanitized error category and provider request ID. |
| Usage | Provider-reported input/output tokens; cached/reasoning breakdown where available; estimated values explicitly marked. |
| Cost | Rate-source version, currency, estimated cost or “Unavailable”; later reconciliation if supported. |
| Tools | Registered tool IDs, execution IDs and outcome; sensitive arguments/results excluded by default. |
| Controls | Test/Live/Simulation mode, retry/fallback reason, policy blocks and context truncation/summary events. |

**ACM-19.01 — ENHANCEMENT:** Add model operational measures to Data & AI Operations: request count, success/error rate, latency, token/cost usage, fallback frequency and interruption rate by agent/provider/version.

**ACM-19.02 — ENHANCEMENT:** Keep model operations separate from business AI impact. Faster model responses do not establish better coding accuracy, more valid findings or higher appropriate RAF. Business comparisons must retain their existing reference cohorts, metric definitions and reviewed outcome logic.

**ACM-19.03 — NEW:** Record configuration create/edit/test/activate/disable/rotate/restore events with actor and time. Exported diffs show secret-reference changes only. Use existing retention/access controls, with raw diagnostic content off by default.

**ACM-19.04 — NEW:** Do not show missing provider usage as zero. Interrupted requests may have unknown final usage; record the limitation and reconcile later where possible. Avoid double-counting cached or reasoning tokens already included in provider totals.

## 13. Backend implementation contract

This section defines required behavior and suggested interfaces. Follow existing repository conventions for names, migrations and service structure.

### 13.1 Required backend components

| Component | Responsibility |
|---|---|
| Configuration service | Scoped objects, drafts, validation, dependencies, activation and history. |
| Secret resolver | Authorized write/replace and server-side lookup/refresh; never exposes stored values. |
| Provider adapters | Authentication, endpoint construction, discovery where supported, serialization, streaming, usage and error normalization. |
| Capability registry | Versioned model/API constraints, supported parameters and metadata provenance. |
| Agent dispatcher | Resolve/pin active config; invoke existing agent workflows through adapters. |
| Context manager | Count/estimate serialized input, enforce budgets and controlled overflow handling. |
| Execution controls | Shared concurrency/queue, deadlines, attempt budgets, policy checks and cancellation. |
| Test runner | Same execution path with safe synthetic fixtures and assertion results. |

A shared library/module inside the current backend can implement these responsibilities. They do not require separate microservices in the demo.

### 13.2 Suggested persisted entities

| Entity | Minimum relationships/fields |
|---|---|
| `ai_provider_connections` | Stable ID, scope, name, provider, lifecycle, active revision pointer. |
| `ai_connection_versions` | Immutable endpoint/API/auth identity metadata, policy references, stable credential-binding ID, actor/time. |
| `ai_credential_bindings` | Scoped stable ID pointing to the active server-secret version or identity resolver; rotation history without secret values. |
| `ai_model_deployments` | Stable ID, connection relationship, scope and lifecycle. |
| `ai_model_versions` | Target/model metadata, connection revision, capabilities/limits/defaults and provenance. |
| `ai_agent_definitions` | Stable runtime ID, implementation availability, capability/tool/schema requirements. |
| `ai_agent_configurations` | Scoped agent identity, mutable draft with revision, active version pointer. |
| `ai_agent_config_versions` | Immutable resolved snapshot, dependency references, hash, actor/time. |
| `ai_configuration_tests` | Snapshot hash, stages/results, actual tested credential reference/version, usage and timestamp. |
| `ai_execution_runs` / attempts | Configuration snapshot, provider requests, outcomes and redacted usage metadata. |
| Existing audit events | Configuration lifecycle events linked to object/version IDs. |

Secret bytes must not appear in these configuration tables unless stored by a separately designed encrypted secret subsystem. Foreign-key/scope checks must prevent orphaned active bindings.

### 13.3 Suggested application APIs

All routes require existing session authentication and scoped backend authorization.

| Method / resource | Required behavior |
|---|---|
| `GET /api/admin/ai/providers` | Implemented adapters, form schema, supported authentication modes and versions. |
| `GET/POST /api/admin/ai/connections` | List masked metadata; create draft connection. |
| `GET/PATCH /api/admin/ai/connections/{id}` | Read/edit metadata with optimistic concurrency. |
| `POST /api/admin/ai/connections/{id}/credential` | Write or rotate a secret/reference; never a read-back endpoint. |
| `POST /api/admin/ai/connections/{id}/test` | Start supported connection checks and return test ID. |
| `POST /api/admin/ai/connections/{id}/activate` | Validate and enable a tested connection revision; material dependency changes require corresponding agent validation. |
| `POST /api/admin/ai/connections/{id}/discover` | Discover permitted model candidates without activating them. |
| `GET/POST /api/admin/ai/deployments` | List or register model deployments. |
| `GET/PATCH /api/admin/ai/deployments/{id}` | Inspect/edit candidate deployment revision. |
| `POST /api/admin/ai/deployments/{id}/test` | Run selected model/capability probe. |
| `GET /api/admin/ai/agents` | Agent definitions, active bindings and readiness. |
| `GET/PUT /api/admin/ai/agents/{id}/draft` | Fetch/save draft with expected revision. |
| `POST /api/admin/ai/agents/{id}/validate` | Return resolved settings and field-level errors. |
| `POST /api/admin/ai/agents/{id}/test` | Run representative tests against the exact draft snapshot. |
| `POST /api/admin/ai/agents/{id}/activate` | Atomically publish the tested hash and expected revision. |
| `POST /api/admin/ai/agents/{id}/restore` | Create a draft from an earlier version. |
| `POST /api/admin/ai/{resource}/{id}/disable` | Supported resource enum; apply dependency/cancellation policy. |
| `GET /api/admin/ai/tests/{id}` | Redacted test status/results. |
| `GET /api/admin/ai/activity` | Filtered permitted diagnostics and history. |
| Existing business agent routes | Resolve server-side active configuration; do not accept arbitrary endpoints or keys from ordinary users. |

Use background jobs or streaming events for long tests; do not hold the entire admin UI in a blocking submit. Test cancellation and normal task cancellation must release the same application resources.

### 13.4 Example normalized draft payload

The following is an **illustrative internal Perform+ configuration**, not a provider API request. All IDs refer to synthetic configuration objects. The example assumes a registered deployment that supports its declared budget and capabilities; adapters still validate it.

```json
{
  "schema_version": 1,
  "agent_id": "ask_perform",
  "workspace_id": "workspace_demo",
  "environment": "development",
  "expected_revision": 3,
  "execution_mode": "live",
  "primary_deployment_version_id": "deployment_text_v2",
  "fallback_deployment_version_id": null,
  "generation": {
    "max_generated_tokens": 4096,
    "sampling": { "mode": "provider_default" },
    "reasoning": { "mode": "provider_default" },
    "stream": true
  },
  "context": {
    "combined_budget_tokens": 32768,
    "safety_margin_tokens": 1024,
    "history_budget_tokens": 8000,
    "retrieval_budget_tokens": 12000,
    "tool_results_budget_tokens": 4000,
    "overflow_policy": "reduce_retrieval_then_summarize_history"
  },
  "instructions": { "template_version_id": "ask_perform_prompt_v3" },
  "tools": {
    "allowed_ids": ["read_authorized_member", "read_risk_score_run"],
    "max_model_rounds": 6,
    "max_executions": 8
  },
  "output_contract_version_id": "cited_answer_v1",
  "reliability": {
    "connect_timeout_seconds": 10,
    "first_token_timeout_seconds": 30,
    "stream_idle_timeout_seconds": 30,
    "overall_deadline_seconds": 120,
    "max_provider_calls": 8,
    "max_additional_retry_fallback_calls": 2
  },
  "policy_reference_id": "synthetic_data_policy_v1"
}
```

The history/retrieval/tool values are allocation ceilings, not guaranteed filled slots. The runtime must still reserve required instructions and tool definitions within the remaining input budget. A configuration export contains references, never a credential value. When imported into another environment, references must be mapped and retested before activation.

## 14. End-to-end user journeys

### Journey A — Connect a provider and activate Ask Perform+

1. Administrator opens AI configuration → Provider connections → Add connection.
2. Chooses a provider; the form changes to that provider’s endpoint/authentication fields.
3. Enters or references the credential, selects the environment and saves the draft.
4. Runs connection checks; sees exactly which stages passed.
5. Selects a discovered model or registers an exact deployment identifier manually.
6. Runs a synthetic model probe and registers its capabilities/limits.
7. Opens Ask Perform+, selects the deployment and reviews inherited settings.
8. Configures a valid context/output budget and approved read-only tools.
9. Runs streaming, harmless tool and cited-answer tests.
10. Activates the tested configuration.
11. Opens the existing Ask Perform+ chat and receives a live response through that route; the execution log identifies its configuration version.

### Journey B — Give suspecting a different model

1. Administrator opens Suspecting & Recapture configuration.
2. Chooses a second deployment on an existing connection; no duplicate credential is needed.
3. Reviews evidence limits, structured-output requirements and predictive-service tools.
4. Resolves any incompatible generation overrides.
5. Runs a synthetic suspecting task with expected source references and output fields.
6. Activates; subsequent suspecting executions use the new configuration while Ask Perform+ remains on its own binding.

### Journey C — Rotate a shared credential

1. Open the connection and inspect dependent deployments/agents.
2. Choose Rotate credential and supply the new secret/reference.
3. Test invocation access and required API permissions for every distinct active dependent target/API mode.
4. Activate the replacement; existing agent bindings remain intact.
5. Record the rotation event and observe subsequent successful calls.
6. If the test fails, retain the previous active reference and show the failure; never disclose either key.

### Journey D — Diagnose an agent that stopped working

1. Operations reader filters activity to the failing agent and recent runs.
2. Opens the failure and sees the specific configuration, route, sanitized error and provider request ID.
3. Distinguishes expired credentials from unavailable model, unsupported parameter, quota or excessive context.
4. Administrator creates a corrected draft or restores an earlier compatible configuration.
5. Tests and activates the correction; prior runs and configuration history remain intact.

## 15. Acceptance criteria and release gates

Acceptance tests must verify behavior, not merely the presence of fields. Use synthetic fixtures and controlled provider stubs in automated tests. Real credentialed integration checks are required before claiming an adapter works with that provider; lack of credentials must be reported as unverified integration, not a passed Live test.

| ID | Scenario | Pass condition |
|---|---|---|
| AC-AI-01 | Add each P0 provider | Provider-specific form, validation and adapter are implemented; no generic key-only substitute for cloud identity. |
| AC-AI-02 | Shared connection | Two agents use different deployments/settings on one credential reference; each routes correctly. |
| AC-AI-03 | Azure deployment identity | Deployment name differs from model family; inference uses the deployment name and correct API mode. |
| AC-AI-04 | Discovery permission absent | Manual registration and inference work when listing is denied; UI preserves the distinction. |
| AC-AI-05 | Bedrock identity modes | Supported role/key modes invoke correctly; temporary credentials refresh or fail with a specific redacted expiry error. |
| AC-AI-06 | Anthropic/native protocol | Requests use native adapter conventions and only model-supported parameters. |
| AC-AI-07 | Compatible server | Configured API root produces the correct route; unsupported optional features cannot pass required capability tests. |
| AC-AI-08 | Secret preservation | Editing unrelated fields retains the secret; masked placeholders are not sent as replacements. |
| AC-AI-09 | Secret exposure | API reads, frontend bundles/storage, logs, exports and failure messages contain no stored secret values. |
| AC-AI-10 | Context constraint | Oversized draft cannot activate; runtime catches overflow after tool results and before fallback calls. |
| AC-AI-11 | Reasoning/output accounting | Adapter-specific counting avoids double reservation and identifies incomplete generation. |
| AC-AI-12 | Unsupported controls | Model switch surfaces incompatible overrides and blocks activation until corrected. |
| AC-AI-13 | Inheritance | Explicit zero/false, inherited value and provider default resolve differently and correctly. |
| AC-AI-14 | Real test evidence | Only actual configured model responses pass Live tests; simulated responses are labeled and cannot satisfy Live activation. |
| AC-AI-15 | Test freshness | Material changes or expired test validity prevent activation; nonmaterial labels do not trigger needless inference. |
| AC-AI-16 | Version pinning | A running task retains its starting settings; later tasks use the newly active version. |
| AC-AI-17 | Rotation/restore | Rotation preserves bindings; failed replacement keeps the old reference; restore never revives a revoked secret. |
| AC-AI-18 | Scoped authorization | Unauthorized users and cross-workspace IDs cannot read/change configuration or broaden record access. |
| AC-AI-19 | Network controls | Unapproved metadata/redirect destinations are blocked; an explicitly approved private deployment works. |
| AC-AI-20 | Retry budget | A multi-round tool workflow plus a transient retry stays within model-round, total-call, additional-retry and deadline limits; SDK retries and model-based repair/summary calls are included. |
| AC-AI-21 | Fallback restrictions | Inaccessible or capability-incompatible fallback blocks its activation; removing it permits a verified primary. Tested fallback runs only under allowed conditions and approved data/region policies. |
| AC-AI-22 | Interrupted stream | Partial output is marked incomplete; no silent second-model splice occurs. |
| AC-AI-23 | Tool idempotency | A retry does not repeat an already completed side-effecting operation. |
| AC-AI-24 | Structured output | Invalid schema, unauthorized IDs or unsupported citations are rejected before workflow changes. |
| AC-AI-25 | Disable/dependency handling | Disabling blocks new/queued dependent calls; referenced resources cannot be silently deleted. |
| AC-AI-26 | Usage accuracy | Known usage is recorded; unknown usage/cost is labeled; cache/reasoning totals are not counted twice. |
| AC-AI-27 | Existing workflow integration | Changing the active configuration changes subsequent real execution in the intended workflow, not just displayed settings. |
| AC-AI-28 | Risk adjustment boundaries | RAF tools remain deterministic; model output does not bypass reviewer decisions, QA or submission control. |
| AC-AI-29 | Operational resilience | Provider outage leaves manual workflows and independent scoring available. |
| AC-AI-30 | Usability | Administrator completes Journeys A–D with readable validation, keyboard navigation and no secret re-entry except actual replacement. |

### 15.1 Delivery order

| Step | Work | Completion evidence |
|---|---|---|
| 1 | Inspect current runtime/settings; register existing agent IDs and reusable auth/audit components. | Short implementation map identifying reuse and new work. |
| 2 | Add scoped configuration entities, secret references and one complete provider adapter. | Backend connection → deployment → tested agent execution works. |
| 3 | Build five admin pages and connect Ask Perform+ to the dispatcher. | Journey A completes with a real synthetic response and traceable version. |
| 4 | Add remaining P0 provider adapters and provider-specific forms. | Adapter contract tests and available credentialed integration checks pass. |
| 5 | Integrate evidence, suspecting, coding and analytics runtimes that exist. | Per-agent representative tests and visible routing changes pass. |
| 6 | Finish rotation, fallback, context limits, activity and failure states. | Applicable acceptance criteria pass; unresolved integrations are explicit. |
| 7 | Add P1 providers/features based on actual usage needs. | Separate tested release; no placeholder capability claims. |

### 15.2 Definition of done

The feature is complete when an authorized administrator can configure a supported provider without editing source code, register its exact model/deployment, assign different models and valid settings to agents, test and activate those settings, and observe actual execution through the chosen routes. Credentials stay protected, configuration versions remain traceable, and existing risk adjustment decisions and scoring rules retain their established authority.

## 16. Documentation and handover requirements

Deliver an administrator guide covering each provider’s prerequisites, authentication options, endpoint examples, deployment/model distinction, test stages, context budgeting, rotation and common errors. Provide a developer adapter guide covering the capability schema, request translation, secret resolution, cancellation, streaming and test fixtures.

Record the official documentation URLs and adapter/SDK versions used during implementation. This specification deliberately does not freeze a list of “latest” model names, universal context windows, parameter ranges or prices. Those belong in versioned capability/pricing metadata and must reflect the selected provider, deployment and API mode.

Reference this companion specification from the main business requirements and implementation backlog. Preserve the explicit **NEW** versus **ENHANCEMENT** classifications when creating work items; do not report a configuration screen or a displayed model name as proof of a working AI integration.
