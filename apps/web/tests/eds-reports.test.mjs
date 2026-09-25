import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
const temp=mkdtempSync(join(tmpdir(),'perform-eds-'));
for(const name of ['eds-population','eds-data','eds-reports']) {
 const source=readFileSync(new URL(`../src/lib/${name}.ts`,import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replace("'./eds-data'","'./eds-data.mjs'").replace("'./eds-population'","'./eds-population.mjs'");
 writeFileSync(join(temp,`${name}.mjs`),js);
}
const {EDS_RECORDS,DEFAULT_EDS_FILTERS,filterEdsRecords,finalEligibility,localCandidate,memberScores}=await import(pathToFileURL(join(temp,'eds-data.mjs')));
const {EDS_REPORTS,buildEdsReport}=await import(pathToFileURL(join(temp,'eds-reports.mjs')));
process.on('exit',()=>rmSync(temp,{recursive:true,force:true}));
const f=DEFAULT_EDS_FILTERS,rows=filterEdsRecords(f);
test('all 20 requirements have populated, distinct reports with traceable chart records',()=>{
 assert.equal(EDS_REPORTS.length,20);
 assert.equal(new Set(EDS_REPORTS.map(r=>r.priority)).size,20);
 for(const def of EDS_REPORTS){
  const r=buildEdsReport(def.id,rows,f);
  assert.equal(r.metrics.length,4,def.id);assert.equal(r.charts.length,2,def.id);assert.ok(r.records.length,def.id);
  const allowedIds=new Set(rows.map(r=>r.id));
  for(const c of r.charts)for(const p of c.points){assert.ok(Number.isFinite(p.value),`${def.id}: ${p.name}`);assert.ok(p.value>=0);for(const id of p.ids)assert.ok(allowedIds.has(id));}
 }
});
test('source funnel uses unsent records and each stage is a subset of its predecessor',()=>{
 const report=buildEdsReport('acceptance',rows,f),p=report.charts[0].points;
 assert.equal(p[0].value,rows.length);assert.ok(p[0].value>p[1].value);
 p.forEach((stage,i)=>{assert.equal(stage.value,stage.ids.length);if(i){assert.ok(stage.value<=p[i-1].value);assert.ok(stage.ids.every(id=>p[i-1].ids.includes(id)));}});
 assert.equal(rows.length,rows.filter(r=>r.stage===4).length+rows.filter(r=>r.stage<4).length);
});
test('final MAO-004 is authoritative; pending does not inherit preliminary allowed',()=>{
 assert.equal(finalEligibility({preliminary:'Allowed',final:'Disallowed'}),'Disallowed');
 assert.equal(finalEligibility({preliminary:'Allowed',final:'Pending'}),'Pending');
 assert.equal(finalEligibility({preliminary:'Disallowed',final:'Allowed'}),'Allowed');
 assert.ok(rows.some(r=>r.preliminary!==r.final&&r.final!=='Pending'));
});
test('diagnosis yield respects independent medical support, mapping and service gates',()=>{
 const report=buildEdsReport('yield',rows,f),stages=report.charts[0].points;
 assert.ok(rows.some(r=>r.final==='Allowed'&&!r.supported));
 for(const id of stages.at(-1).ids){const r=rows.find(r=>r.id===id);assert.equal(r.final,'Allowed');assert.ok(localCandidate(r));}
 stages.forEach((p,i)=>{if(i)assert.ok(p.ids.every(id=>stages[i-1].ids.includes(id)));});
});
test('filters preserve contract hierarchy, production scope, and provider restrictions',()=>{
 const filtered=filterEdsRecords({...f,contract:'H1234',network:'Central MA Network'},'PR-001');
 assert.ok(filtered.length);assert.ok(filtered.every(r=>r.contract==='H1234'&&r.providerId==='PR-001'&&r.environment==='Production'));
 const a=new Set(filterEdsRecords({...f,environment:'Production'}).map(r=>r.id));
 assert.ok(filterEdsRecords({...f,environment:'Test'}).every(r=>!a.has(r.id)));
});
test('financial and exclusion scenarios use distinct members, not diagnosis sums',()=>{
 const scores=memberScores(rows,'Part C',2027),duplicates=memberScores([...rows,...rows],'Part C',2027);
 assert.deepEqual(scores,duplicates);assert.equal(scores.length,new Set(rows.map(r=>r.memberId)).size);
 assert.ok(scores.some(m=>m.unlinked>0));assert.ok(memberScores(rows,'Part C',2026).every(m=>m.unlinked===0));
 assert.notDeepEqual(memberScores(rows,'Part C',2027).map(m=>m.local),memberScores(rows,'Part D',2027).map(m=>m.local));
});
test('cumulative submissions carry the full cumulative drilldown',()=>{
 const chart=buildEdsReport('timeliness',rows,f).charts[1];
 chart.points.forEach((p,i)=>{assert.equal(p.value,p.ids.length);if(i)assert.ok(chart.points[i-1].ids.every(id=>p.ids.includes(id)));});
 assert.equal(chart.points.at(-1).value,rows.filter(r=>r.stage>0).length);
});
test('encounter timestamps and final eligibility agree with processing stage',()=>{
 assert.equal(new Set(EDS_RECORDS.map(r=>r.id)).size,EDS_RECORDS.length);
 for(const r of EDS_RECORDS){if(r.final!=='Pending')assert.equal(r.stage,4);if(r.icn)assert.ok(r.stage>=3);if(r.acceptedAt)assert.equal((Date.parse(r.acceptedAt)-Date.parse(r.sourceReady))/86400000,r.lag);if(r.stage===0)assert.equal(r.submittedAt,null);}
});
test('all reports handle an empty filtered cohort without fabricated data or invalid numbers',()=>{
 for(const r of EDS_REPORTS){const report=buildEdsReport(r.id,[],f);assert.equal(report.records.length,0);assert.ok(!JSON.stringify(report).includes('NaN'));for(const c of report.charts)assert.ok(c.points.every(p=>p.value===0));}
});

test('Part D eligibility gaps identify diagnosis codes without an RxHCC mapping',()=>{
 const report=buildEdsReport('yield',rows,{...f,program:'Part D'});
 const unmapped=report.charts[1].points.find(p=>p.name==='No Matching RxHCC');
 assert.equal(unmapped.value,rows.filter(r=>!r.rxhcc).length);
 for(const id of report.charts[0].points.at(-1).ids)assert.ok(rows.find(r=>r.id===id).rxhcc);
});
test('audit exposure is based only on reviewed diagnoses in the reporting population',()=>{
 const reviewed=rows.filter(r=>r.supportReviewed&&r.hcc);
 const exposure=memberScores(reviewed,'Part C',2027).reduce((sum,m)=>sum+m.audit*12000,0);
 const formatted=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(exposure);
 assert.equal(buildEdsReport('audit',rows,f).metrics[3].value,formatted);
});

test('EDS encounter counts come from the expanded roster cohort', async()=>{
 const {EDS_POPULATION,EDS_POPULATION_SIZE}=await import(pathToFileURL(join(temp,'eds-population.mjs')));
 assert.equal(EDS_POPULATION_SIZE,110000);
 assert.equal(EDS_POPULATION.length,2640);
 const identities=new Map(EDS_POPULATION.map(m=>[m.id,m]));
 assert.equal(identities.size,EDS_POPULATION.length);
 assert.equal(EDS_RECORDS.length,2640*6*3);
 for(const row of EDS_RECORDS){
  if(row.profile)continue;
  const member=identities.get(row.memberId);assert.ok(member);
  assert.equal(row.memberName,member.name);
  assert.equal(row.contract,member.contract);
  assert.equal(row.providerId,member.providerId);
  assert.equal(row.network,member.network);
 }
});
