# Perform+ visual and data audit — September 16, 2026

Open [the screenshot gallery](index.html) for every captured page, its DOM text, and available before/after comparisons. Images are full-page desktop captures, taken after populated content appeared. The manifest records URL, filters, viewport and table content. The supplied member data is synthetic reference content.

## Scope

- Four login carousel slides; Dashboard; all six Risk analytics tabs; all five Suspected conditions tabs; Member 360 list; all seven sections for each of its five members: **52 baseline views**.
- Baseline authenticated views came from `https://performplus.idaibhealth.com`, release `7fd5850799f3ded73b21fba63fd4184fdbf39f51`. Login uses the equivalent local UI. Login screenshots were recaptured after carousel transitions settled.
- After images show the updated local production build at `http://localhost:3000`. This audit does not assert that these changes have been deployed publicly.
- Viewport width is 1920 CSS pixels. Most captures use 937px height; the first baseline Dashboard and Risk captures used 993px. Full-page image heights vary with content. Manifest dimensions make these differences explicit.
- Hidden workflow/admin routes are outside the visible product scope. This is a visual/data audit, not a claim of exhaustive action testing for every role and filter combination.

## Fixed in this change

| Finding | Change | Evidence |
| --- | --- | --- |
| Member 360 used a separate population; none of its five IDs appeared at the top of suspect tables. | Nine existing unconfirmed/audit findings now join by the original profile ID. Default order rotates through Maria, Ellen, Robert, James and Anne, then their remaining findings, then other members. Filters and permissions apply first. | Conditions list before/after; API ordering/export tests. |
| Score-scenario rows showed an ID without a member name or useful profile link. | Both member-based case tables show name and ID; the five featured names open the corresponding Member 360 Risk Adjustment section. | Score scenarios and linked-evidence captures. |
| A naive join would assign invented model scores, HCC mappings and social demographics to the imported profiles. | Original condition/evidence summaries, county, ZIP, provider and contract are reused. Source-year deltas are labeled; unvalidated inputs are excluded from calculated RAF/financial totals. Invalid scenario requests return a clear explanation. | Reference evidence panel; source and scenario tests. |
| Validated/coded profile contributions could be misrepresented as new missing-diagnosis gaps. | Four validated contributions remain solely in the profile. Only the nine remaining gaps/audit concerns enter suspect analytics. James is featured through his CKD specificity review. | Conditions list after image and regression test. |
| Member 360's pagination label broke across three lines. | Keep the label on one line with an 88px select and consistent spacing. | Member list before/after; computed `white-space: nowrap`. |
| Overcoding repeated identical topic cards for different cases. | Show each topic once while retaining all cases and totals. | Possible overcoding before/after. |
| Profile tab scrolling assumed a 60px header although the current two-row header is 111px. | Read the actual header height when positioning the selected pane. | Member profile after capture; measured header height. |
| Linked profiles introduced providers without recapture history into the recapture heatmap. | Only practices with prior condition records receive heatmap columns. | Regression assertion; Dashboard verification. |
| The new profile-source note inherited a horizontal banner layout inside a narrow drawer. | Stack the title and explanation so the text remains readable; distinguish the source RAF contribution from a possible correction. | Linked-evidence viewport capture. |

## Data discrepancies requiring follow-up

These remain visible in the supplied profiles; this change does not silently rewrite clinical evidence or pretend source mappings have been validated.

| Priority | Discrepancy | Example / evidence | Follow-up |
| --- | --- | --- | --- |
| High | HCC labels are not consistently mapped to the selected model. | Maria's profile labels arrhythmia HCC 226 while the analytic catalog uses that label for heart failure. Ellen/Robert also contain different code families. See member Risk Adjustment captures. | Validate each source diagnosis against its payment year/model; retain the original source value separately. |
| High | Current condition status conflicts across profile sections. | Robert's risk section has a validated COPD-with-respiratory-failure contribution; Clinical Data lists acute respiratory failure as resolved in 2024. | Reconcile encounter dates and source documents before treating this as a current condition. Resolution later does not itself invalidate an earlier diagnosis. |
| High | Year and score definitions differ across product areas. | Profile RAFs use payment year 2026 and Current/Projected/Potential; analytics defaults to 2027 and Baseline/Potential/Submitted/Accepted. | Define a shared model/year contract before making those numbers comparable. Linked rows explicitly retain their 2026 reference basis meanwhile. |
| Medium | Different health-plan names refer to the same profile. | List filters use Gold PPO / Complete HMO / Advantage Select PPO; Enrollment uses Advantage Gold PPO / Advantage Complete HMO / Advantage Select. | Introduce one canonical plan ID and display name, with source aliases. |
| Medium | Chronic-condition counts and lists use unclear inclusion rules. | Maria's Claims summary counts three, while Clinical Data also lists hyperlipidemia. Robert's list foregrounds CHF/COPD while other active diagnoses also appear. | State whether the count means all active chronic diagnoses or only priority conditions, then calculate it consistently. |
| Medium | Quality measure terminology conflicts. | Maria shows “GSD Eye Exam”; Ellen shows “GSD: Glycemic Status Assessment.” | Reconcile measure IDs and labels against the intended quality-measure definition. |
| Medium | Rounded composite score lacks an explicit rounding rule. | James's displayed component weights yield 70.5; the visible composite is 70. | Document and apply one rounding rule in list, detail and exports. |
| Medium | Encounter/claim chronology is inconsistent. | James's procedures and claims are not consistently newest first; Anne's claims run oldest first while procedures run newest first. | Use a shared date sort and explicit history grouping. |
| Medium | Communication preference and recommendation can disagree. | Robert/James show limited digital access / phone-oriented actions but the shared footer states preferred channel SMS. | Separate member preference from recommended outreach channel. |
| Medium | Data-issues analytics has narrow source diversity. | All 130 baseline data issues are grouped under Cardiovascular conditions, with no supporting documents. | Add independently traceable identity/date/source-quality cases across conditions, with correct evidence availability. |
| Low | Some supplied prose is awkward or overly technical. | Anne's summary repeats “documented”; other panes expose MEAT/TAMPER, SSUI and raw opportunity wording. | Edit display copy while retaining clinical/source meaning in supporting notes. |

## Remaining visual inconsistencies

| Page group | Observation | Suggested next change |
| --- | --- | --- |
| Member 360 profiles | The member name is much smaller than the 26px page titles elsewhere; long risk explanations dominate the pane. | Increase name hierarchy modestly and keep detailed interpretation in disclosures. |
| Member 360 profiles | Filled colored chips differ from neutral statuses in the analytics screens. | Agree one shared status treatment while preserving the uploaded HTML's intended style. |
| Overcoding / Data issues | A single-category bar occupies a large chart panel; much of it is empty. | Use a compact total or evidence summary when only one category exists. |
| Long report pages | Dashboard and evidence-rich tables require substantial scrolling. | Keep the current desktop width; provide report-section anchors or compact optional summaries. |
| Filters across pages | A category filter persists when moving from suspects to Financial/Score scenarios. This can produce a deductions-only negative total. | Make the active population/filter summary more prominent; retain the valid filtered calculation. |

## Checks and interpretation

- Default full-population RAF order remains **Baseline 1.014 < Accepted 1.037 ≤ Submitted 1.040 < Potential 1.056**.
- Negative coding deductions represent revenue at risk and are expected. The default full-population net forecast remains positive; an overcoding-only filter legitimately produces a negative net value.
- Nine linked findings are evidence summaries from the supplied profiles. They are not falsely presented as original clinical documents, calculated current-model RAFs or CMS acceptance events.
- Provider access is limited to explicitly assigned profile IDs. Filters still exclude nonmatching featured members; exports use the same default ordering. ACA and Part D do not inherit the MA-only reference profiles.
- A 70-test analytics/landing run passed during implementation. The focused API/integration rerun passed 11 tests; the final county/recapture integration checks passed 4 tests. Existing Member 360 tests passed during the combined run. Web typecheck and the production image build passed.
- No source HTML numeric clinical values, clinical review states or native risk records were rewritten.
- Browser checks opened all five matching profile links, verified the nine-record contract filter and the transition to other members on the next table page. Member ordering appears in both the Conditions list and Score scenarios. See `verification.json`.
- One screenshot is a table-detail crop and one is an evidence-drawer viewport, marked in the manifest. Remaining images are full-page captures. Full-page capture can preserve a sticky header or a keyboard focus indicator at the captured scroll position; these are not missing application content.
