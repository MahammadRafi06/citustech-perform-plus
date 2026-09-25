/** Display copy only. API identifiers, formulas and saved report values stay unchanged. */
export const plainLabels: Record<string, string> = {
  'Coding gap': 'Missing diagnosis code', 'Recapture': 'Confirm past conditions',
  'New condition': 'Possible new condition', 'Specificity': 'Missing Specificity',
  'Persistent status': 'Ongoing health status', 'Potential overcapture': 'Possible overcoding',
  'Data representation': 'Data issues', 'Unmapped': 'Not yet classified',
  'Documentation match': 'Diagnosis found in a document', 'Historical gap': 'Previous condition missing this year',
  'Signal combination': 'Clues from several sources', 'Specificity check': 'Check diagnosis detail',
  'Status persistence': 'Check ongoing health status', 'Representation integrity': 'Check for overcoding',
  'Source validation': 'Check source data', 'Mapping unresolved': 'HCC not yet matched',
  'Base': 'Expected', 'Gross potential': 'Total opportunity', 'Reach & support': 'Review & evidence',
  'Recognition': 'Payment estimate', 'Corrections': 'Coding deductions', 'Modeled net': 'Net revenue',
  'validated for declared scope': 'Checked for supported members', 'validated': 'Checked',
  'awaiting reference': 'Waiting for reference data', 'not calculated': 'Not calculated yet',
  'authored scenario metadata': 'case details', 'Authored scenario': 'Scenario details',
};
export const plainLabel = (value: string) => plainLabels[value] || value;

/** Presentation copy for analytic notes only; never apply to source quotations or stored records. */
export const analysisText = (value: string) => value
  .replace('Authored assumption:', 'Planning assumption:')
  .replace('Authored analytic grouping;', 'Analysis grouping;')
  .replace('Prepared prior-period analytic question from the synthetic population.', 'Prior-period finding from the reporting population.')
  .replace('This is separately authored snapshot metadata.', 'These are reporting snapshot details.')
  .replace('authored scenario assumptions', 'planning assumptions')
  .replace('illustrative question', 'finding')
  .replace(/\bindependently authored\b/gi, 'independently specified')
  .replace(/\bauthored /gi, '');

/** Internal method descriptions only; clinical narratives retain their original wording. */
export const calculationText = (value: string) => analysisText(value)
  .replace(/\bsynthetic /gi, '')
  .replace(/\bsample /gi, '')
  .replace(/\billustrative /gi, 'estimated ');

export const reportCopy: Record<string, {title: string; question: string}> = {
  R01: {title: 'Dashboard', question: 'How is population risk changing?'},
  R02: {title: 'Population Risk & Condition Prevalence', question: 'Which conditions affect the population most?'},
  R03: {title: 'Chronic Condition Recapture', question: 'Which past conditions are still missing this year?'},
  R04: {title: 'Risk Score Trends & Scenarios', question: 'How do scores change over time or with new findings?'},
  R05: {title: 'Geographic Risk Analysis', question: 'Where are risk and opportunities highest?'},
  R06: {title: 'Suspect Analytics', question: 'Which potential diagnoses need attention?'},
  R07: {title: 'Suspect Confirmation Analysis', question: 'How many suspects might be supported by evidence?'},
  R08: {title: 'Risk-Adjusted Revenue Forecast', question: 'What incremental RA revenue could these opportunities support?'},
  R09: {title: 'Coding Integrity & Data Quality', question: 'Where could coding overstate a member’s risk?'},
  R10: {title: 'AI Performance Evaluation', question: 'How did AI perform in the reference comparison?'},
  R12: {title: 'Provider Risk & Capture Performance', question: 'How do provider risk, capture and recapture compare?'},
  R11: {title: 'Analytics Methodology & Data Quality', question: 'Which records and assumptions support these results?'},
};

export const metricNames: Record<string, string> = {
  M01: 'Total members', M02: 'Members included', M05: 'Share of members with scores',
  M07: 'Average risk score', M21: 'Suspected conditions', M22: 'Members with possible additions',
  M27: 'Expected confirmations if all reviewed',
};

export const calculationNotes = [
  ['Risk score (RAF)', 'RAF means Risk Adjustment Factor. It summarizes expected health needs. Report scores and model calculations are shown separately.'],
  ['Condition groups (HCCs)', 'HCC means Hierarchical Condition Category: a group of related diagnoses used in risk scoring. A suspected condition still needs supporting evidence.'],
  ['Four score views', 'Baseline is the starting score. Potential shows what it could reach if suspected conditions are confirmed. Submitted and Accepted show score scenarios for the respective diagnosis sets.'],
  ['Average scores', 'Members with more covered months carry more weight. Missing or outdated scores are excluded unless you choose to include older results.'],
  ['Chance of confirmation', 'The estimate assumes a case is reviewed within 30 days and supporting evidence is found within 90 days. It is a planning assumption, not a measured prediction.'],
  ['Revenue estimates', 'Each eligible member contributes at most one selected score increase. Revenue uses eligible months, projected coverage, value phase-in, review coverage, confirmation likelihood and payment realization. Potential overcoding exposure is shown separately. These are forecast assumptions; costs and cash receipt timing are excluded.'],
  ['Documents and case details', 'Original document quotes stay linked to their sources. Cases without documents are marked as case details. Repeated signals for the same question are counted together.'],
  ['County and practice comparisons', 'Members are grouped by their recorded county and assigned practice. Differences can reflect population mix, not quality of care.'],
  ['Small groups', 'Values for groups with fewer than 20 members are hidden. Some additional values are hidden so the small groups cannot be worked out by subtraction.'],
  ['Closure and provider outcomes', 'Closure means a suspect has an outcome, supported or unsupported. The opportunity chart uses assumed closure chances; provider charts show separate outcome history, counting additional conditions and closed rules. They do not measure chart sending or task activity.'],
  ['Model comparison', 'The V24 to V28 waterfall estimates score changes by disease family. It is separate from a full CMS model calculation and from the revenue forecast.'],
  ['Social needs', 'County clusters use race, ZIP and social-needs attributes. They are not taken from medical documents or inferred from names. Demographic filters apply to all dashboard results.'],
  ['Saved reports', 'Saving keeps the values, filters and assumptions at that time. New data does not change an older saved report.'],
];
