# Retained AI classification evidence

`seed/risk/ai-classification-replays-v1.json` retains six member-specific classifications authored by the Codex model during this implementation task. These are model-authored interpretations of the original synthetic source text. They are separate from the existing prepared-rule summaries and from the frozen 200-chart comparison.

The available session context identifies the model family as GPT-6. It does not expose an exact served model build/version, provider request identifier, inference settings or a separate provider response envelope. Those fields remain null. The task identity is `/root/assessment_workspace_ui`; this is an agent task identity, not a provider inference request ID. The recorded UTC time is the clock reading at the beginning of authoring, with that basis retained explicitly.

The artifact preserves the complete supplied member source set, exact source text and metadata, source versions/hashes, the bounded prompt, model-authored classification text, serialized raw classification output, citation offsets and output/artifact hashes. An assembly step mechanically attached citation coordinates and hashes to the model-chosen passages. It did not generate classifications from a deterministic template. The raw output is the serialized authored object before external validation; it is not described as a captured response from a separately invoked API.

## Replay boundary

The API only reads the retained artifact. It makes no inference call and writes no decision, task, clinical event, score, diagnosis or approval. Existing authenticated member/practice scope applies to both replay discovery and retrieval.

Before returning a replay, a separate application validator checks the output schema, member identity, full available source-set hash, source hash/version, unique source identities, page/section and exact zero-based half-open character spans. It refuses changed or newly available source sets, including later contradictory evidence, and retains the earlier artifact unchanged. Explicit model-directed instructions in source text are rejected. The output schema has no action/tool/approval fields and requires `clinical_authority=false`; source text cannot authorize application actions. The instruction checks are bounded defenses, not a claim of general prompt-injection certification.

Exact quotation validation does not validate the clinical meaning of a classification. The retained interpretations still require independent human review, and neither a replay nor a source labeled “current” establishes coding, source eligibility or a supported score.

## Coverage and open acceptance evidence

The real retained examples cover current statements, historical context, explicit negation, uncertainty from indirect signals, conflicting records and abstention. Riley distinguishes a current narrative from an unsigned source. Morgan distinguishes missing current assessment from an affirmative determination that the condition is not current. Jordan's “not family history” wording remains a current assessment; it is not counted as a positive family-history example.

Two acceptance limitations remain open:

- Exact served model-version/build attestation is unavailable in this session.
- The supplied clinical sources contain no positive family-history passage. A clearly labeled test-only family-history source exercises the validator/schema contract; it does not substitute for a retained model-authored positive-family example or alter the original sources.

This evidence implements the bounded replay and external citation-validation portion of V2-24 / RA-08.01–06 / BR-06–07. It does not by itself close the model identity, complete semantic-class coverage or independent reviewer acceptance gates. Exposure/inspection/clinical attribution belongs to the separately controlled workflow and is not inferred from merely storing this artifact.
