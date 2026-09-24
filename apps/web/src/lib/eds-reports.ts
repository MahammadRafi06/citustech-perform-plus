import { filterEdsRecords, EDS_MONTHS, EDS_SOURCE_NOTE, localCandidate, memberScores, type EdsFilters, type EdsRecord } from './eds-data';
export const EDS_SECTIONS=['Submission Performance','Risk Reconciliation','Diagnosis Integrity','Data Quality'] as const;
export type EdsSection=typeof EDS_SECTIONS[number];
export const EDS_REPORTS = [
 ['acceptance','Submission Acceptance',0,1],['timeliness','Submission Timeliness',0,5],['edits','CMS Rejection Analysis',0,6],['duplicates','Duplicate & Adjustment Integrity',0,7],['completeness','Source Completeness',0,10],['acknowledgements','CMS Report Aging',0,19],
 ['yield','Diagnosis Eligibility',1,2],['reconciliation','Risk Score Reconciliation',1,3],['unlinked','Unlinked CRR Exposure',1,4],['filters','Service & Filter Eligibility',1,16],
 ['audit','Documentation & Audit Exposure',2,8],['recapture','Chronic Condition Recapture',2,9],['lifecycle','CRR Lifecycle Integrity',2,15],['prevalence','HCC Prevalence & Coding Drift',2,17],
 ['defaults','Default Provider Data',3,11],['identity','Beneficiary Identity',3,12],['providers','Provider Eligibility',3,13],['capitation','Capitated Encounter Completeness',3,14],['conformance','X12 File Conformance',3,18],['special','Special-Service Compliance',3,20],
].map(([id,title,section,priority])=>({id:String(id),title:String(title),section:EDS_SECTIONS[Number(section)],priority:Number(priority)}));
export type EdsPoint={name:string;value:number;secondary?:number;tertiary?:number;ids:string[];detail?:string;denominator?:number;offset?:number;volume?:number};
export type EdsChart={title:string;kind:'funnel'|'area'|'bar'|'donut'|'pareto'|'heatmap'|'scatter'|'waterfall'|'chain';points:EdsPoint[];series:string[];info:string;unit?:'percent'|'score'|'currency';secondaryPercent?:boolean};
export type EdsReport={title:string;info:string;metrics:{label:string;value:string;note:string}[];charts:EdsChart[];records:EdsRecord[];table:'encounter'|'diagnosis'|'score'|'quality'|'lifecycle';tableTitle:string};
const n=(v:number)=>v.toLocaleString('en-US'), p=(a:number,b:number)=>b?`${(a/b*100).toFixed(1)}%`:'—';
const average=(v:number[])=>v.length?v.reduce((a,b)=>a+b,0)/v.length:0;
const score=(v:number)=>v.toFixed(3);
const money=(v:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v);
const ids=(r:EdsRecord[])=>r.map(x=>x.id);
const count=(r:EdsRecord[],f:(r:EdsRecord)=>boolean)=>r.filter(f).length;
const point=(name:string,r:EdsRecord[],value=r.length):EdsPoint=>({name,value,ids:ids(r)});
function groups(rows:EdsRecord[],key:(r:EdsRecord)=>string,limit=10):EdsPoint[] {
 const groups=new Map<string,EdsRecord[]>(); for(const r of rows){const k=key(r);if(k)groups.set(k,[...(groups.get(k)||[]),r]);}
 return [...groups].map(([name,r])=>point(name,r)).sort((a,b)=>b.value-a.value).slice(0,limit);
}
function trend(rows:EdsRecord[],test:(r:EdsRecord)=>boolean,percent=false):EdsPoint[] {
 return EDS_MONTHS.map((name,i)=>{const r=rows.filter(r=>r.month===i+1),matching=r.filter(test);return {...point(name,matching,percent?(r.length?matching.length/r.length*100:0):matching.length),denominator:r.length};});
}
const metric=(label:string,value:string,note:string)=>({label,value,note});
const chart=(title:string,kind:EdsChart['kind'],points:EdsPoint[],series:string[],info:string,extra:Partial<EdsChart>={}):EdsChart=>({title,kind,points,series,info,...extra});
const completenessInfo='The denominator includes every reportable source encounter in the selected cohort, including records not yet submitted. The 99% goal is an internal target, not a CMS acceptance rule.';
const finalInfo='MAO-002 describes encounter processing and a preliminary diagnosis status. MAO-004 supplies the final diagnosis eligibility. A pending final report stays pending, even when the preliminary status is Allowed.';
export function buildEdsReport(id:string,rows:EdsRecord[],filters:EdsFilters,providerScope=''):EdsReport {
 const meta=EDS_REPORTS.find(r=>r.id===id)||EDS_REPORTS[0];
 id=meta.id;
 const submitted=rows.filter(r=>r.stage>0),accepted=rows.filter(r=>r.stage===4),rejected=rows.filter(r=>r.stage>0&&r.stage<4),backlog=rows.filter(r=>r.stage<4);
 const mapped=rows.filter(r=>filters.program==='Part C'?!!r.hcc:!!r.rxhcc),candidate=rows.filter(r=>localCandidate(r,filters.program));
 const allowed=candidate.filter(r=>r.final==='Allowed'), members=memberScores(rows,filters.program,Number(filters.paymentYear));
 const meanLocal=average(members.map(m=>m.local)),meanCms=average(members.map(m=>m.cms));
 const modelCode=(r:EdsRecord)=>filters.program==='Part C'?r.hcc?r.hcc==='37'?'HCC 37 · Diabetes':`HCC ${r.hcc} · ${r.condition}`:'Unmapped':r.rxhcc?`RxHCC ${r.rxhcc} · ${r.condition}`:'Unmapped';
 const total=rows.length;
 let result:EdsReport={title:meta.title,info:EDS_SOURCE_NOTE,metrics:[],charts:[],records:rows,table:'encounter',tableTitle:'Encounter Records'};
 const scopeInfo='Every chart and table uses the selected contract, years and population filters. Select a chart item to inspect its underlying records.';
 if(id==='acceptance') {
  const stages=[point('Reportable Source',rows),point('837 Submitted',submitted),point('999 Passed',rows.filter(r=>r.stage>=2)),point('277CA Accepted',rows.filter(r=>r.stage>=3)),point('MAO-002 Accepted',accepted)];
  result.metrics=[metric('Source Encounters',n(total),'Reportable source population'),metric('Submitted',n(submitted.length),`${p(submitted.length,total)} source completeness`),metric('EDPS Accepted',n(accepted.length),`${p(accepted.length,total)} final acceptance`),metric('Open Rejections',n(rejected.length),'Submitted, awaiting accepted disposition')];
  result.charts=[chart('Encounter Processing Funnel','funnel',stages,['Encounters'],completenessInfo+' Select a stage to see the records that reached it; gap buttons show records lost at that stage.'),chart('Acceptance Trend','area',trend(rows,r=>r.stage===4,true),['Final Acceptance'],completenessInfo,{unit:'percent'})];
 } else if(id==='timeliness') {
  const sorted=accepted.map(r=>r.lag).sort((a,b)=>a-b),p90=sorted[Math.max(0,Math.ceil(sorted.length*.9)-1)];
  const aged=[point('0–7 Days',backlog.filter(r=>r.age<=7)),point('8–30 Days',backlog.filter(r=>r.age>7&&r.age<=30)),point('31–60 Days',backlog.filter(r=>r.age>30&&r.age<=60)),point('61+ Days',backlog.filter(r=>r.age>60))];
  const curve=EDS_MONTHS.map((name,i)=>point(name,submitted.filter(r=>r.month<=i+1)));
  result.metrics=[metric('Open Backlog',n(backlog.length),'Source encounters not EDPS accepted'),metric('Not Submitted',n(total-submitted.length),'Still in the source population'),metric('P90 Acceptance Lag',p90===undefined?'—':`${p90} Days`,'Source-ready to MAO-002 acceptance'),metric('Over 30 Days',n(count(backlog,r=>r.age>30)),'Unresolved encounter aging')];
  result.charts=[chart('Backlog Aging','bar',aged,['Encounters'],'Age is measured from source readiness to the reporting cutoff. No contractual freshness SLA is assumed.'),chart('Cumulative Submissions','area',curve,['Submitted'],'Counts accumulate by service month within the selected service year. A regulatory deadline is not assumed or invented.')];result.records=backlog;result.tableTitle='Backlog Records';
 } else if(id==='edits'||id==='duplicates') {
  const duplicate=id==='duplicates',focus=duplicate?rows.filter(r=>['98325','00265','00760'].includes(r.edit)):rejected;
  const pareto=groups(focus,r=>r.edit);let running=0;const sum=pareto.reduce((s,p)=>s+p.value,0);for(const p of pareto)p.secondary=sum?(running+=p.value)/sum*100:0;
  result.metrics=[metric(duplicate?'Duplicate Rejections':'Rejected Records',n(duplicate?count(rows,r=>r.edit==='98325'):rejected.length),'Distinct encounter records'),metric('Rejection Rate',p(focus.length,submitted.length),'Rejected ÷ submitted encounters'),metric('Adjustment Exceptions',n(count(rows,r=>!!r.lifecycleIssue)),'Unresolved parent or action state'),metric('Affected Members',n(new Set(focus.map(r=>r.memberId)).size),'Distinct members in the exception set')];
  result.charts=[chart(duplicate?'Duplicate & Sequencing Edits':'CMS Edit Pareto','pareto',pareto,['Rejected Records','Cumulative Share'],'Edits are grouped at encounter level; cumulative share uses these rejected records. An edit description is not evidence of a clinical error.',{secondaryPercent:true}),duplicate?chart('Adjustment Chain Status','chain',groups(rows.filter(r=>r.recordType==='CRR'),r=>r.lifecycleIssue||(r.unlinked?'Unlinked CRR':'Linked Parent')),['Records'],'A linked accepted parent, pending disposition and subsequent replacement are separate states. This report does not resubmit or change an encounter.'):chart('Rejection Trend','area',trend(submitted,r=>r.stage<4,true),['Rejection Rate'],'First-pass processing state of the selected local reporting population.',{unit:'percent'})];result.records=focus;result.table=duplicate?'lifecycle':'encounter';result.tableTitle='Rejected Encounter Records';
 } else if(id==='completeness') {
  const types=groups(rows,r=>r.serviceCategory).map(p=>{const r=rows.filter(r=>p.ids.includes(r.id));return {...p,value:count(r,x=>x.stage>0),secondary:count(r,x=>x.stage===4),tertiary:r.length};});
  const nets=groups(rows,r=>r.network).map(p=>({...p,denominator:p.value,value:count(rows,r=>p.ids.includes(r.id)&&r.stage>0)/p.value*100}));
  result.metrics=[metric('Submission Completeness',p(submitted.length,total),'Submitted ÷ reportable encounters'),metric('Accepted Completeness',p(accepted.length,total),'EDPS accepted ÷ reportable encounters'),metric('Missing Encounters',n(total-submitted.length),'No matching production submission'),metric('Encounter Population',n(total),'Includes unsent source encounters')];
  result.charts=[chart('Source-to-EDS Reconciliation','bar',types,['Submitted','Accepted','Source'],completenessInfo),chart('Network Submission Completeness','heatmap',nets,['Completeness'],completenessInfo,{unit:'percent'})];result.tableTitle='Source Reconciliation';
 } else if(id==='acknowledgements') {
  const waiting=rows.filter(r=>r.stage>0&&(r.stage<4||r.final==='Pending'));
  result.metrics=[metric('Pending Reports',n(waiting.length),'Distinct encounters awaiting progression'),metric('Awaiting 277CA',n(count(rows,r=>r.stage>0&&r.stage<3)),'No accepted ICN yet'),metric('Awaiting MAO-002',n(count(rows,r=>r.stage===3)),'Front-end accepted only'),metric('Awaiting MAO-004',n(count(accepted,r=>r.final==='Pending')),'Final diagnosis eligibility pending')];
  result.charts=[chart('Missing Report Distribution','donut',groups(waiting,r=>r.stage<2?'999':r.stage<3?'277CA':r.stage<4?'MAO-002':'MAO-004'),['Encounters'],finalInfo),chart('Report Aging','bar',groups(waiting,r=>r.age<=7?'0–7 Days':r.age<=30?'8–30 Days':'31+ Days'),['Encounters'],'Report age is an investigation signal. A missing report is not proof of rejection and does not authorize resubmission.')];result.records=waiting;result.tableTitle='Pending CMS Reports';
 } else if(id==='yield') {
  const acceptedCandidate=candidate.filter(r=>r.stage===4);
  const stages=[point('Source Diagnosis Codes',rows),point('Model Mapped',mapped),point('Supported & Service Eligible',candidate),point('EDPS Accepted',acceptedCandidate),point('MAO-004 Allowed',allowed)];
  result.metrics=[metric('RA Candidates',n(candidate.length),'Supported, mapped and service eligible'),metric('MAO-004 Allowed',n(allowed.length),'Final eligible candidate diagnosis codes'),metric('RA Yield',p(allowed.length,candidate.length),'Final allowed ÷ local candidates'),metric('Eligibility Pending',n(count(acceptedCandidate,r=>r.final==='Pending')),'Accepted candidates without a final result')];
  result.charts=[chart('Diagnosis Eligibility Funnel','funnel',stages,['Diagnosis Codes'],finalInfo+' The yield denominator is locally eligible candidates, not all source diagnosis codes.'),chart('Eligibility Leakage','donut',groups(rows.filter(r=>r.final!=='Allowed'||!localCandidate(r,filters.program)),r=>!(filters.program==='Part C'?r.hcc:r.rxhcc)?'Unmapped Diagnosis':!r.supported?'Support Not Established':!r.serviceEligible?'Service Filter':r.stage<4?'Encounter Not Accepted':r.final==='Pending'?'Final Report Pending':'Final Filter Exclusion'),['Diagnosis Codes'],'Each diagnosis appears once, at its first unmet gate. Mapping and medical-record support are separate requirements.')];result.table='diagnosis';result.tableTitle='Diagnosis Eligibility Records';
 } else if(id==='reconciliation') {
  const paymentFactor=filters.program==='Part C'?12000:1800;
  const exposure=members.reduce((s,m)=>s+m.gap*paymentFactor,0);
  const variance=groups(rows,modelCode,5).map(p=>{const m=memberScores(rows.filter(r=>p.ids.includes(r.id)),filters.program,Number(filters.paymentYear));return {...p,value:average(m.map(x=>x.local)),secondary:average(m.map(x=>x.cms))};});
  result.metrics=[metric('Local Expected Score',score(meanLocal),'Distinct-member mean scenario score'),metric('CMS-Reconciled Score',score(meanCms),'Stored reconciliation scenario output'),metric('Average Score Gap',score(meanLocal-meanCms),'Same members, model and payment year'),metric('Estimated Payment Exposure',money(exposure),filters.program==='Part C'?'$1,000 PMPM × 12 covered months':'$150 monthly subsidy basis × 12 months')];
  result.charts=[chart('Risk Score Reconciliation','waterfall',[point('Local Expected',rows,meanLocal),{...point('Unresolved Difference',rows,meanLocal-meanCms),offset:meanCms},point('Reconciled',rows,meanCms)],['Score'],'Paired member-level model-output scenarios. The difference is not a sum of HCC coefficients. It reflects the selected member cohort.',{unit:'score'}),chart('Condition Score Comparison','bar',variance,['Local Expected','Reconciled'],'Member scores are averaged within each condition group. Members can appear in more than one group; these averages are not additive.',{unit:'score'})];result.records=members.map(m=>m.record);result.table='score';result.tableTitle='Member Score Reconciliation';
 } else if(id==='unlinked') {
  const crr=rows.filter(r=>r.recordType==='CRR'),unlinked=crr.filter(r=>r.unlinked),nonexempt=unlinked.filter(r=>!r.exception),exposure=members.reduce((s,m)=>s+m.unlinked,0);
  result.metrics=[metric('Unlinked CRRs',n(unlinked.length),'No accepted parent encounter link'),metric('Non-Exempt Records',n(nonexempt.length),'Member-switch exceptions excluded'),metric('Member-Switch Exceptions',n(count(unlinked,r=>r.exception)),'Separate from non-exempt exposure'),metric('Average Score Exposure',score(members.length?exposure/members.length:0),Number(filters.paymentYear)>=2027?'Paired member-level exclusion scenario':'Exclusion scenario begins in payment year 2027')];
  result.charts=[chart('CRR Linkage Profile','donut',[point('Linked',crr.filter(r=>!r.unlinked)),point('Unlinked · Non-Exempt',nonexempt),point('Member-Switch Exception',unlinked.filter(r=>r.exception))],['CRRs'],'For 2027, non-exempt unlinked CRR diagnosis codes are excluded from the scenario. The member-switch exception is tracked separately. No linkage is fabricated.'),chart('Unlinked Condition Concentration','heatmap',groups(nonexempt,modelCode),['Diagnosis Codes'],'Shows diagnosis-code records, not additive RAF coefficients. Score exposure comes from paired member-level scenario outputs.')];result.records=unlinked;result.table='lifecycle';result.tableTitle='Unlinked Chart Review Records';
 } else if(id==='filters') {
  const disagreement=accepted.filter(r=>r.final!=='Pending'&&(r.serviceEligible!==(r.final==='Allowed')));
  result.metrics=[metric('Mapped Diagnosis Codes',n(mapped.length),'Selected model family'),metric('Service Eligible',p(count(mapped,r=>r.serviceEligible),mapped.length),'Local service and provider filter'),metric('Final Filter Differences',n(disagreement.length),'Local status differs from MAO-004'),metric('Pending Final Eligibility',n(count(mapped,r=>r.final==='Pending')),'Not classified as a disagreement')];
  const rates=groups(mapped,r=>r.serviceCategory).map(p=>({...p,denominator:p.value,value:count(mapped,r=>p.ids.includes(r.id)&&r.serviceEligible)/p.value*100}));
  result.charts=[chart('Service Eligibility Mix','heatmap',rates,['Eligible'],finalInfo,{unit:'percent'}),chart('Final Eligibility Outcomes','donut',groups(mapped,r=>r.final),['Diagnosis Codes'],finalInfo)];result.records=mapped;result.table='diagnosis';result.tableTitle='Service Eligibility Records';
 } else if(id==='audit') {
  const reviewed=rows.filter(r=>r.supportReviewed&&(filters.program==='Part C'?!!r.hcc:!!r.rxhcc)),unsupported=reviewed.filter(r=>!r.supported);
  const paymentFactor=filters.program==='Part C'?12000:1800;
  const auditExposure=memberScores(reviewed,filters.program,Number(filters.paymentYear)).reduce((sum,m)=>sum+m.audit*paymentFactor,0);
  const risks=groups(unsupported,modelCode,5).map(p=>({...p,volume:p.value,value:memberScores(unsupported.filter(r=>p.ids.includes(r.id)),filters.program,Number(filters.paymentYear)).reduce((sum,m)=>sum+m.audit*paymentFactor,0),secondary:p.value?count(unsupported,r=>p.ids.includes(r.id)&&r.final==='Allowed')/p.value*100:0,detail:p.name}));
  result.metrics=[metric('Reviewed Diagnosis Codes',n(reviewed.length),'Documentation validation completed'),metric('Unsupported Diagnosis Codes',n(unsupported.length),'Failed support validation'),metric('Unsupported Rate',p(unsupported.length,reviewed.length),'Unsupported ÷ reviewed diagnosis codes'),metric('Estimated Audit Exposure',money(auditExposure),`${n(count(unsupported,r=>r.final==='Allowed'))} allowed diagnosis codes lack support`)];
  result.charts=[chart('Documentation Exposure Matrix','scatter',risks,['Estimated Exposure','MAO-004 Allowed Share'],'Each bubble groups diagnosis codes with insufficient documentation. The vertical axis shows the share that still has MAO-004 eligibility; the horizontal axis shows estimated payment exposure from paired member-level scenarios. Bubble size is the diagnosis count. Annual assumptions are $12,000 per Part C score point or $1,800 per Part D subsidy factor. CMS eligibility does not establish clinical support.',{unit:'currency'}),chart('Support by Source','bar',groups(reviewed,r=>r.source).map(p=>({...p,value:count(reviewed,r=>p.ids.includes(r.id)&&r.supported),secondary:count(reviewed,r=>p.ids.includes(r.id)&&!r.supported)})),['Supported','Unsupported'],'Documentation support is evaluated independently from model mapping and CMS acceptance.')];result.records=unsupported;result.table='diagnosis';result.tableTitle='Documentation Review Findings';
 } else if(id==='recapture') {
  const prior=rows.filter(r=>r.priorChronic&&r.chronic),unique=new Map<string,EdsRecord[]>();
  for(const r of prior){const k=`${r.memberId}:${r.hcc}`;unique.set(k,[...(unique.get(k)||[]),r]);}
  const closed=[...unique.values()].filter(rs=>rs.some(r=>r.supported&&r.serviceEligible&&r.final==='Allowed'));
  const matrix=groups(prior,modelCode,5).map(p=>{const rs=prior.filter(r=>p.ids.includes(r.id));const memberIds=new Set(rs.map(r=>r.memberId));const supported=new Set(rs.filter(r=>r.supported&&r.serviceEligible&&r.final==='Allowed').map(r=>r.memberId));return {...p,denominator:memberIds.size,value:memberIds.size?supported.size/memberIds.size*100:0};});
  result.metrics=[metric('Prior Chronic HCCs',n(unique.size),'Distinct member-condition pairs'),metric('Supported Recapture',n(closed.length),'Current supported, qualifying diagnosis'),metric('Recapture Rate',p(closed.length,unique.size),'Confirmed pairs ÷ eligible prior pairs'),metric('Open Recapture Gaps',n(unique.size-closed.length),'Prior history alone is not current support')];
  result.charts=[chart('Supported Recapture by Condition','heatmap',matrix,['Recapture'], 'Recapture uses distinct member-condition pairs with current-year support and final eligibility. Prior-year diagnosis codes are never submitted automatically.',{unit:'percent'}),chart('Chronic Condition Status','donut',[{name:'Recaptured',value:closed.length,ids:ids(closed.flat())},{name:'Open Gap',value:unique.size-closed.length,ids:ids([...unique.values()].filter(rs=>!closed.includes(rs)).flat())}],['Member–HCC Pairs'],'A pair is counted only once, even when multiple current-year encounters support it.')];result.records=prior;result.table='diagnosis';result.tableTitle='Chronic Condition Evidence';
 } else if(id==='lifecycle') {
  const crr=rows.filter(r=>r.recordType==='CRR'),invalid=crr.filter(r=>!!r.lifecycleIssue);
  result.metrics=[metric('Chart Review Records',n(crr.length),'Selected EDR/CRR reporting cohort'),metric('Linked CRRs',n(count(crr,r=>!!r.parentIcn)),'Accepted parent ICN reference'),metric('Invalid States',n(invalid.length),'Action or sequencing conflicts'),metric('Unlinked Deletes',n(count(crr,r=>r.lifecycleIssue==='Unlinked Delete')),'Delete requires a valid link')];
  result.charts=[chart('CRR Action Distribution','donut',groups(crr,r=>r.action),['CRRs'],'Original, replace, void and delete are reported as independent source actions; no action can be executed here.'),chart('Lifecycle Validation','chain',groups(crr,r=>r.lifecycleIssue||'Valid State'),['CRRs'],'Shows linkage and adjustment-state validation. Invalid lifecycle states are distinct from documentation holds and analytic warnings.')];result.records=crr;result.table='lifecycle';result.tableTitle='Chart Review Lifecycle';
 } else if(id==='prevalence') {
  const eligible=rows.filter(r=>r.final==='Allowed'&&(filters.program==='Part C'?!!r.hcc:!!r.rxhcc));const pop=new Set(rows.map(r=>r.memberId)).size;
  const prior=rows.length?filterEdsRecords({...filters,serviceYear:String(Number(filters.serviceYear)-1)},providerScope):[],priorPop=new Set(prior.map(r=>r.memberId)).size;
  const points=groups(eligible,modelCode,5).map(p=>{const memberCount=new Set(eligible.filter(r=>p.ids.includes(r.id)).map(r=>r.memberId)).size;return {...p,value:pop?memberCount/pop*100:0,denominator:pop};});
  const comparison=points.map(p=>({...p,secondary:priorPop?new Set(prior.filter(r=>r.final==='Allowed'&&modelCode(r)===p.name).map(r=>r.memberId)).size/priorPop*100:0}));
  result.metrics=[metric('Eligible Members',n(pop),'Distinct members in the selected cohort'),metric('Allowed HCC Groups',n(new Set(eligible.map(modelCode)).size),'Versioned diagnosis mappings'),metric('RA-Allowed Diagnosis Codes',n(eligible.length),'Final MAO-004 allowed'),metric('Leading HCC Prevalence',points.length?`${Math.max(...points.map(p=>p.value)).toFixed(1)}%`:'—','Distinct condition members ÷ eligible members')];
  result.charts=[chart('HCC Prevalence','bar',points,['Member Prevalence'],'Top five condition groups. Members can have several HCCs; percentages are not mutually exclusive.',{unit:'percent'}),chart('Year-over-Year HCC Prevalence','bar',comparison,[String(filters.serviceYear),String(Number(filters.serviceYear)-1)],'Compares condition prevalence using the eligible member denominator in each service year, under the same payment-year model and filters. A change may reflect population, documentation or filtering; it is not automatically favorable.',{unit:'percent'})];result.records=eligible;result.table='diagnosis';result.tableTitle='HCC Source Records';
 } else {
  const quality:Record<string,{test:(r:EdsRecord)=>boolean;field:(r:EdsRecord)=>string;population:EdsRecord[];issueTitle:string;unit:string}>= {
   defaults:{test:r=>!!r.defaultReason,field:r=>`DDRC ${r.defaultReason}`,population:rows,issueTitle:'Default Data Reasons',unit:'Default NPI Records'},
   identity:{test:r=>!!r.identityIssue,field:r=>r.identityIssue,population:submitted,issueTitle:'Identity Mismatch Categories',unit:'Identity Exceptions'},
   providers:{test:r=>!!r.providerIssue,field:r=>r.providerIssue,population:rows,issueTitle:'Provider Eligibility Findings',unit:'Provider Exceptions'},
   capitation:{test:r=>!!r.capitationIssue,field:r=>r.capitationIssue,population:rows.filter(r=>r.capitated),issueTitle:'Capitation Validation Findings',unit:'Capitation Exceptions'},
   conformance:{test:r=>!!r.conformanceIssue,field:r=>r.conformanceIssue,population:submitted,issueTitle:'X12 Conformance Findings',unit:'Conformance Exceptions'},
   special:{test:r=>!!r.specialIssue,field:r=>r.specialIssue,population:rows.filter(r=>['DME','SNF / Home Health','Ambulance'].includes(r.serviceCategory)),issueTitle:'Special-Service Findings',unit:'Service Exceptions'},
  };
  const q=quality[id]||quality.defaults,fail=q.population.filter(q.test),ok=q.population.length-fail.length;
  result.metrics=[metric('Records Evaluated',n(q.population.length),'Applicable encounter population'),metric(q.unit,n(fail.length),'Distinct records with a finding'),metric('Completeness Rate',p(ok,q.population.length),'Records without these findings'),metric('Affected Providers',n(new Set(fail.map(r=>r.provider)).size),'Providers represented in findings')];
  result.charts=[chart(q.issueTitle,'donut',groups(fail,q.field),['Findings'],'A finding identifies a field or reference issue. A valid model mapping does not waive source, provider or medical-record requirements.'),chart('Network Data Quality','heatmap',groups(q.population,r=>r.network).map(p=>({...p,denominator:p.value,value:count(q.population,r=>p.ids.includes(r.id)&&!q.test(r))/p.value*100})),['Completeness'],'Percentages use applicable records within each health network. Comparisons below 30 observations are suppressed as an internal analytic convention.',{unit:'percent'})];
  result.records=fail;result.table='quality';result.tableTitle=q.issueTitle;
  if(id==='conformance') {
   const files=groups(submitted,r=>r.file,submitted.length),failedFiles=new Set(fail.map(r=>r.file));
   const capacity=files.slice(0,5);
   result.metrics=[metric('Transmitted Files',n(files.length),'Distinct file / transaction-set controls'),metric('Files With Findings',n(failedFiles.size),'Envelope or structural validation'),metric('Largest Transaction Set',n(Math.max(0,...files.map(p=>p.value))),'Encounter records in a single ST/SE'),metric('Files Over Capacity',n(files.filter(p=>p.value>5000).length),'Compared with the 5,000-record reference limit')];
   result.charts[1]=chart('Transaction-Set Capacity','bar',capacity,['Encounter Records'],'The five largest transaction sets in the selected scope. The guide describes a 5,000-encounter limit per ST/SE. Counts here are local file fixtures, not a live CMS transmission.');
  }
 }
 result.info=`${scopeInfo} ${result.info}`;
 return result;
}
export function recordQualityIssue(r:EdsRecord,id:string) {
 return ({defaults:r.defaultReason?`Default NPI · DDRC ${r.defaultReason}`:'Actual NPI',identity:r.identityIssue,providers:r.providerIssue,capitation:r.capitationIssue,conformance:r.conformanceIssue,special:r.specialIssue} as Record<string,string>)[id]||r.issue;
}
