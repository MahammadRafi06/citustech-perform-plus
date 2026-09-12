# Perform+ demo walkthrough

Use synthetic data only. The opening account is `analyst@perform.test`; passwords are in `.local/demo-accounts.json`. All state is shared through the local API/PostgreSQL database.

## Five-minute opening

1. Sign in as the analyst. Show **Overview**: 10,000 members, linked worklist and six detailed showcase cases.
2. Open **Analytics & AI Impact**. Explain the frozen, synthetic 200-chart comparison: 18 more supported findings and 22 versus 36 mean active review minutes. Open **How measured** and the underlying record export. These are authored demonstration results, not claims from a live model or customer deployment.
3. Open **Suspect registry**, search Jordan, select the record and run analysis (selection is required). It loads a prepared finding, updates the recommendation version and records an actual demo action.
4. Open Jordan's member record. Inspect the highlighted current assessment and the source's identity/date. Show the linked evidence, timeline and tasks.
5. Return to the registry, select one or more members and create a named campaign, choose an allocation owner and due date, inspect the exact preview, then activate. Open the new campaign to show its frozen membership and local tasks.

## Source review and independent QA

Sign out, then sign in as `coder@perform.test`. Open `/reviews/MB-000001`, inspect the signed source, choose a disposition, enter a reason, and **Save review & send to QA**. Refresh: the saved decision remains. Pause saves a draft; resume restores it. Completing without a supported finding also requires a reason.

Sign out and sign in as `qa@perform.test`. Open Coding QA, open Jordan and choose **Pass QA** or return for rework. The original coder and decision remain recorded. These are reviewed demo dispositions; no official HCC scoring engine or external submission has run.

## Six case stories

| Case | Demonstrate | Expected distinction |
| --- | --- | --- |
| Jordan Ellis, MB-000001 | Current signed assessment → coder decision → independent QA | Evidence-supported review |
| Morgan Reed, MB-000002 | Historical COPD → clarification task → `provider2.demo` response → later encounter → fresh coder review | A historical mention or provider response alone cannot establish current support |
| Avery Brooks, MB-000003 | Indirect kidney signal → assessment question → `provider3.demo` later encounter if needed | A predictive signal is not a diagnosis |
| Taylor Quinn, MB-000004 | Contradictory source → unsupported review → `submission.demo` original/rejected correction → linked remediation → acknowledgement → terminal response | Original and rejected attempts remain; transport receipt differs from acceptance |
| Casey Morgan, MB-000005 | Risk scenario explanation and member context | Full-member hierarchies matter; numbers remain unavailable without a validated model pack |
| Riley Parker, MB-000006 | Ineligible source → retrieval/intake issue → `provider6.demo` later completed encounter → fresh review | Source eligibility must be resolved before support |

Provider accounts are limited to their own practice. `provider.demo` is PR-001; numbered accounts correspond to PR-002 through PR-006. Responses are local task updates and do not send messages.

For Taylor's correction story, open the original or rejected attempt in Submission Operations and choose **Prepare remediation**. Open the new pending attempt, apply acknowledgement, reopen it and apply accepted/rejected. A rejected terminal attempt remains in history; prepare another linked attempt to retry. An accepted correction marks the original as corrected while preserving its original status/history. No payment outcome is implied.

## Supporting screens

- **Provider portfolio:** open a practice and follow its filtered member link.
- **Chart chase / Document intake:** use the retrieval account; record partial/received state and a local contact note. In Intake, DOC-0009 fails its signature check; DOC-0011 shows a member mismatch; DOC-0010 is a valid sample. After Riley’s provider loads the later encounter, select DOC-LATER-MB-000006, validate it and publish it to make the request usable. Local file selection previews metadata only.
- **Audit:** QA/submission accounts can select cases and download a ZIP with source documents, decisions and event history.
- **Ask Perform+:** use a priority-cohort, selected-member or AI-metrics prompt. Citations open exact sources. Review a proposed campaign before activation; unsupported questions explain the fixture limit.
- **Data operations:** review actual fixture-run history and recheck the sample import.
- **Administration:** local users/roles, account enable/disable and presenter reset. The administrator cannot approve clinical reviews.

## Reset and rehearsal

Sign in as `admin@perform.test`, open Administration → Workspace settings → Reset workspace, then type `RESET WORKSPACE`. This restores business fixtures and clears session actions while preserving users/passwords/roles and the frozen comparison. Switch back to the analyst before presenting.

The full six-case route and the shorter opening route were exercised in the browser. QA included pauses for source/link fixes, so it is not a measured eighteen-minute presenter performance. Use the pacing guide below for narration. No external AI, email, EHR or payer service is configured or needed at runtime; fonts are bundled locally.

| Time | Story beat |
| --- | --- |
| 0–3 min | Analyst: Overview → AI Impact → How measured; explain the frozen comparison |
| 3–5 min | Select Jordan, run analysis, inspect evidence; create a previewed campaign or use the assistant proposal |
| 5–8 min | Coder: Jordan’s reasoned review → QA: independent pass |
| 8–11 min | Morgan: clarification → provider2 response and later encounter → fresh coder review |
| 11–12 min | Avery: indirect signal → clarification/assessment, with supported coding blocked |
| 12–15 min | Taylor: unsupported review/QA → submission correction, transport receipt and terminal response; retain earlier attempts |
| 15–16 min | Casey: connected full-member scenario; explain why official scores are unavailable |
| 16–18 min | Riley: signature failure → later signed encounter → retrieval validation/publication; finish with audit evidence |

For the short route, end after the campaign’s frozen membership and allocated tasks. For a slow audience, show one complete review/QA handoff and use the linked case tabs as the fallback walkthrough for the other stories. Each account uses the same local state.

Filters/sort/page and selected member context are encoded in the URL. Unsaved review/query/campaign/contact drafts remain in memory while navigating within the signed-in session; sign-out/reset clears them. **Pause & save draft** is the refresh-safe review checkpoint. Refresh discards other unsaved in-memory input.
