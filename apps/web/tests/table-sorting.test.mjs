import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSortValue, sortTableRows } from '../src/lib/table-sorting.ts';

test('numbers, percentages, currency and signed RAF values sort numerically', () => {
  for (const rows of [['100','2','11'],['100%','2%','11%'],['$1,000','$20','$110'],['+0.100','−0.020','+0.011']]) {
    const sorted = sortTableRows(rows, x=>x, 'asc').map(normalizeSortValue);
    assert.deepEqual(sorted, [...sorted].sort((a,b)=>a-b));
  }
  assert.equal(normalizeSortValue('($1,200.50)'), -1200.5);
  assert.deepEqual(sortTableRows(['HCC-108','HCC-2','HCC-40'],x=>x,'asc'),['HCC-2','HCC-40','HCC-108']);
});

test('dates are chronological, while identifiers remain identifiers', () => {
  const dates=['Jan 2, 2026','Dec 31, 2025','2026-02-01'];
  assert.deepEqual(sortTableRows(dates,x=>x,'asc'),[dates[1],dates[0],dates[2]]);
  assert.equal(normalizeSortValue('HCC-108'), 'HCC-108');
  assert.deepEqual(sortTableRows(['12/31/2025','1/2/2026'],x=>x,'desc'),['1/2/2026','12/31/2025']);
});

test('missing values stay last both ways; sorting does not alter source records or tied ordering', () => {
  const rows=[{id:'a',score:10},{id:'b',score:null},{id:'c',score:10},{id:'d',score:2},{id:'e',score:'—'}];
  const before=structuredClone(rows);
  assert.deepEqual(sortTableRows(rows,x=>x.score,'asc').map(x=>x.id),['d','a','c','b','e']);
  assert.deepEqual(sortTableRows(rows,x=>x.score,'desc').map(x=>x.id),['a','c','d','b','e']);
  assert.deepEqual(rows,before);
});

test('sorting the full result set produces ordered, nonoverlapping pages', () => {
  const rows=Array.from({length:113},(_,i)=>({id:i,score:112-i}));
  const sorted=sortTableRows(rows,x=>x.score,'asc');
  assert.equal(sorted[0].id,112);
  assert.equal(sorted.slice(0,50).at(-1).score,49);
  assert.equal(sorted.slice(50,100)[0].score,50);
  assert.equal(new Set(sorted.map(x=>x.id)).size,113);
});
