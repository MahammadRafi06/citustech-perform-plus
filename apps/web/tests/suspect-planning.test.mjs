import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { suspectPlanning, planningPortfolio, financialProjection } from '../src/lib/suspect-planning.ts';
const finding = { id:'A', member_id:'M', condition:'Heart failure', evidence:'Strong', type:'documented_gap', status:'new' };
test('planning never mutates evidence and unknown evidence remains unknown', () => {
 const source=structuredClone(finding); suspectPlanning(source); assert.deepEqual(source,finding);
 assert.equal(suspectPlanning({...finding,evidence:'Unknown'}).probability,null);
 assert.equal(suspectPlanning({...finding,type:'source_issue'}).exposure,null);
 assert.equal(suspectPlanning({...finding,status:'resolved_supported'}).weighted,null);
 assert.ok(suspectPlanning({...finding,type:'integrity_review'}).weighted<0);
});
test('overlapping hypotheses cannot multiply financial upside per member', () => {
 const one=planningPortfolio([finding]); const two=planningPortfolio([finding,{...finding,id:'B'}]);
 assert.equal(two.positiveExposure,one.positiveExposure);
 assert.equal(two.expectedClosures,2*one.expectedClosures);
 assert.equal(two.activeMembers,1);
});
test('seeded population projections reconcile and exclude closed findings', () => {
 const seed=JSON.parse(readFileSync(new URL('../../../seed/demo.json',import.meta.url)));
 const before=JSON.stringify(seed.opportunities); const report=planningPortfolio(seed.opportunities);
 assert.equal(report.items.length,1500);
 assert.equal(report.bands.reduce((n,b)=>n+b.value,0),report.active.length);
 assert.equal(report.byCondition.reduce((n,b)=>n+b.findings,0),report.active.length);
 assert.ok(report.meanProbability>0 && report.meanProbability<1);
 assert.ok(report.expectedClosures<report.active.length);
 assert.equal(JSON.stringify(seed.opportunities),before);
});
test('financial sensitivity respects zero reach, horizon and realization', () => {
 assert.equal(financialProjection(100,0,.8,1100,12),0);
 assert.equal(financialProjection(100,.75,0,1100,12),0);
 assert.equal(financialProjection(100,.75,.8,1100,24),2*financialProjection(100,.75,.8,1100,12));
 assert.equal(financialProjection(-1,.75,.8,1100,12),0);
});
