# Agents configuration — visual verification

Captured from the authenticated local application on 2026-09-13. The before/after pairs use the same 1920 × 839 CSS viewport; the browser tool produced matching 1910 × 835 JPEGs for both before/after pairs. Screens were captured after the page content and provider logos rendered, then visually inspected.

| View | Before | After |
| --- | --- | --- |
| Agents overview | [Before](before-agents.jpg) | [After](after-agents.jpg) · [Lower cards](after-agents-lower.jpg) |
| Agent editor | [Before](before-editor.jpg) | [After](after-editor.jpg) |
| Providers | — | [Provider cards](after-providers.jpg) |
| Models | — | [Model catalog](after-models.jpg) |
| Change history | — | [Workspace history](after-history.jpg) · [Agent history](after-agent-history.jpg) |
| Instructions and tools | — | [Instructions](after-instructions.jpg) |

## Model and provider controls

- [Primary model dropdown](primary-model-dropdown.jpg)
- [Fallback dropdown: private option immediately visible](fallback-model-dropdown.jpg)
- [Private primary selected](private-primary-selected.jpg)
- [Private fallback selected](private-fallback-selected.jpg)
- [Provider logos in provider setup](provider-dropdown.jpg)
- [Private connection and logos in model setup](model-provider-dropdown.jpg)

Private selection screenshots show temporary drafts. The existing saved agent models and revisions were preserved after verification. Provider connectivity and live inference are not enabled by these UI settings.

## Container comparison

[Suspect registry reference](reference-suspect-registry.jpg). Both pages use 28px canvas padding, heading x=268px with the expanded sidebar and a 28px top offset inside the canvas. Agents now uses the same shared page header and 24px title. No horizontal overflow was observed.
