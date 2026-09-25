import type { SuspectCase } from './analytics-types';

export const SUSPECT_PRIORITY_DESCRIPTION = 'Review priority from 0 to 100: evidence strength contributes 60 points and absolute RAF impact contributes up to 40 points, reaching the maximum at 0.500 RAF. Additions and potential coding corrections use the same scale.';

// A display-only prioritization index, not a probability or a calculated RAF.
// Keep source confidence, closure estimates and Member 360 contributions intact.
const evidenceWeight: Record<string, number> = { Strong: 1, Moderate: .65, Limited: .3 };

export function suspectPriorityScore(finding: Pick<SuspectCase, 'evidence' | 'delta' | 'profile_reference'>): number | null {
  const evidence = finding.profile_reference?.evidence_strength ?? finding.evidence;
  const strength = evidenceWeight[evidence];
  const impact = finding.profile_reference ? finding.profile_reference.delta : finding.delta;
  if (strength == null || impact == null || !Number.isFinite(impact)) return null;
  return Math.round(60 * strength + 40 * Math.min(Math.abs(impact) / .5, 1));
}
