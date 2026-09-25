import test from 'node:test';
import assert from 'node:assert/strict';
import { edsRecordSubset, edsStageGaps } from '../src/lib/eds-selection.ts';

test('stage gaps retain prior order and exact encounter identities',()=>{
 assert.deepEqual(edsStageGaps(['ENC-1','ENC-11','ENC-2','ENC-3'],['ENC-11','ENC-3']),['ENC-1','ENC-2']);
 assert.deepEqual(edsStageGaps([],['ENC-1']),[]);
 assert.deepEqual(edsStageGaps(['ENC-1'],[]),['ENC-1']);
});

test('full-population drilldowns use indexed membership and preserve source records',()=>{
 const rows=Array.from({length:15000},(_,i)=>({id:`ENC-${i}`,value:i}));
 const selected=rows.filter((_,i)=>i%3===0).map(r=>r.id);
 selected.includes=()=>{throw new Error('Repeated linear membership scan');};
 const subset=edsRecordSubset(rows,selected);
 assert.equal(subset.length,5000);assert.equal(subset[0],rows[0]);assert.equal(subset.at(-1),rows[14997]);
 assert.equal(edsStageGaps(rows.map(r=>r.id),selected).length,10000);
 assert.equal(rows.length,15000);
});
