import test from 'node:test';
import assert from 'node:assert/strict';
import { suspectPriorityScore } from '../src/lib/suspect-priority.ts';

test('priority increases with evidence and impact, with equal treatment of corrections', () => {
  const finding = { evidence: 'Strong', delta: .25 };
  const original = structuredClone(finding);
  assert.equal(suspectPriorityScore(finding), 80);
  assert.equal(suspectPriorityScore({ ...finding, delta: -.25 }), 80);
  assert.ok(suspectPriorityScore({ ...finding, evidence: 'Moderate' }) < 80);
  assert.ok(suspectPriorityScore({ ...finding, delta: .1 }) < 80);
  assert.equal(suspectPriorityScore({ ...finding, delta: 1.2 }), 100);
  assert.deepEqual(finding, original);
});

test('Member 360 uses its evidence grade and source impact, never its confidence percentage', () => {
  const finding = { evidence: 'Unknown', delta: null, profile_reference: { evidence_strength: 'Strong', delta: .25, confidence: '15%' } };
  assert.equal(suspectPriorityScore(finding), 80);
  assert.equal(suspectPriorityScore({ ...finding, profile_reference: { ...finding.profile_reference, confidence: '95%' } }), 80);
  assert.equal(suspectPriorityScore({ evidence: 'Unknown', delta: .25 }), null);
  assert.equal(suspectPriorityScore({ evidence: 'Strong', delta: null }), null);
  assert.equal(suspectPriorityScore({ evidence: 'Strong', delta: NaN }), null);
});
