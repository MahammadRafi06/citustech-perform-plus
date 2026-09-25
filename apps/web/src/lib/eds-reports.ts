import { filterEdsRecords, EDS_MONTHS, EDS_SOURCE_NOTE, localCandidate, memberScores, type EdsFilters, type EdsRecord } from './eds-data';
// Display descriptions for the source codes retained in encounter details.
// References: CMS Encounter Data Submission and Processing Guide v5.2, table 3.3 and chapter 6.
const defaultDataReasons:Record<string,string>={
 '036':'Rejected Service Lines Removed',
 '040':'Medicaid Service Lines Removed',
 '044':'Anesthesia Modifier Updated',
 '048':'Default Provider NPI',
 '052':'Default Provider Tax ID',
 '056':'Default Chart Review Procedure',
 '060':'Default Other-Payer Adjudication Date',
};
export function defaultDataLabel(code:string){return defaultDataReasons[code]||`Default Data Code ${code}`;}
const displayLabels:Record<string,string>={
  '999':'File Validation Issue', '277CA':'Encounter Validation Issue',
  '98325':'Duplicate Service Line', '00265':'Original Encounter Not Found',
  '00760':'Encounter Already Replaced or Voided',
  'Member Identity':'Member Identity Issue', 'Provider NPI':'Provider NPI Issue',
  'RA Eligibility':'Excluded by RA Rules', 'Awaiting MAO-004':'MAO-004 Pending',
  'Reconciled':'MAO-004 Eligible',
  'MBI Mismatch':'Medicare ID Mismatch', 'Enrollment Period':'Enrollment Date Mismatch',
  'Date of Birth':'Date of Birth Mismatch', 'Rendering NPI Missing':'Missing Rendering Provider NPI',
  'Specialty Not Eligible':'Provider Specialty Not Eligible', 'NPI Reference Mismatch':'Provider NPI Mismatch',
  'CN101 Missing':'Missing Capitation Contract Type', 'CAS Incomplete':'Incomplete Payment Adjustment Data',
  'Unexplained Zero Amount':'Unexplained Zero Payment',
  'HIPPS Missing':'Missing Post-Acute Payment Code (HIPPS)', 'Ambulance Location Missing':'Missing Ambulance Service Location',
  'DME Referring NPI Missing':'Missing DME Referring Provider NPI',
  'Required Segment Missing':'Missing Required File Segment', 'Transaction Count Mismatch':'Encounter Count Mismatch',
  'Control Number Mismatch':'File Control Number Mismatch',
  'Parent Disposition Pending':'Original Encounter Pending', 'Parent Already Adjusted':'Original Encounter Already Adjusted',
  'Unlinked Delete':'Diagnosis Deletion Without Encounter Link',
  'Linked Parent':'Linked to Original Encounter', 'Unlinked CRR':'No Original Encounter Link',
  'Valid State':'No Adjustment Issues', 'Original':'Original Record', 'Replace':'Replacement Record',
  'Void':'Voided Record', 'Delete':'Diagnosis Deletion',
  'Allowed':'Eligible for Risk Adjustment', 'Disallowed':'Excluded by RA Rules',
  'Pending':'MAO-004 Pending',
  'Final report not received':'MAO-004 Pending',
  'Eligible after CMS filtering':'Eligible for Risk Adjustment',
  'Service or provider filter':'Service or Provider Eligibility Issue',
  'Diagnosis excluded by final filter':'Excluded by RA Rules',
  'DME':'Durable Medical Equipment', 'Professional':'Professional Services',
  'Institutional':'Institutional Services', 'SNF / Home Health':'Skilled Nursing & Home Health',
  'Ambulance':'Ambulance Services', 'Clinical EHR':'Electronic Health Records',
  'Claims Feed':'Claims Data', 'Chart Review':'Medical Record Review',
};
export function edsDisplayLabel(value:string){return displayLabels[value]||value;}
export function edsProcessingLabel(stage:number){return ['Not Submitted','Submitted to EDS','File Validation Passed','EDFES Accepted','MAO-002 Accepted'][stage]||'Status Unavailable';}
export function edsSupportLabel(r:Pick<EdsRecord,'supported'|'supportReviewed'>){return r.supported?'Documentation Supported':r.supportReviewed?'Insufficient Clinical Evidence':'Documentation Not Reviewed';}
export const EDS_SECTIONS=['Submission Performance','Risk Adjustment','Clinical & Coding Quality','Data Quality'] as const;
export type EdsSection=typeof EDS_SECTIONS[number];
export const EDS_REPORTS = [
 ['acceptance','Encounter Submission Status',0,1],['timeliness','Encounter Submission Timeliness',0,5],['edits','Encounter Submission Issues',0,6],['duplicates','Duplicate & Adjustment Issues',0,7],['completeness','Encounter Submission Completeness',0,10],['acknowledgements','EDS Response Status',0,19],
 ['yield','Diagnosis Eligibility',1,2],['reconciliation','Risk Score Reconciliation',1,3],['unlinked','Unlinked Chart Review Impact',1,4],['filters','Risk Adjustment Service Eligibility',1,16],
 ['audit','Clinical Documentation & Audit Risk',2,8],['recapture','Chronic Condition Recapture',2,9],['lifecycle','Chart Review Record Validation',2,15],['prevalence','HCC Prevalence Trends',2,17],
 ['defaults','Default Data Usage',3,11],['identity','Member Identity Validation',3,12],['providers','Provider Data & Eligibility',3,13],['capitation','Capitated Encounter Data Quality',3,14],['conformance','837 File Validation',3,18],['special','DME, Ambulance & Post-Acute Data',3,20],
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
const completenessInfo='Denominator: all reportable source encounters, including unsubmitted records. Internal completeness target: 99%.';
export const EDS_PROCESSING_NOTE='EDS is the Encounter Data System. EDFES handles file and front-end validation (999, 277CA). EDPS reports encounter acceptance (MAO-002). RA eligibility is reported at diagnosis level in MAO-004.';
const finalInfo='MAO-002 reports EDPS acceptance and preliminary RA eligibility. MAO-004 reports final RA eligibility for diagnosis codes.';
export function buildEdsReport(id:string,rows:EdsRecord[],filters:EdsFilters,providerScope=''):EdsReport {
 const meta=EDS_REPORTS.find(r=>r.id===id)||EDS_REPORTS[0];
 id=meta.id;
 const submitted=rows.filter(r=>r.stage>0),accepted=rows.filter(r=>r.stage===4),rejected=rows.filter(r=>r.stage>0&&r.stage<4),backlog=rows.filter(r=>r.stage<4);
 const mapped=rows.filter(r=>filters.program==='Part C'?!!r.hcc:!!r.rxhcc),candidate=rows.filter(r=>localCandidate(r,filters.program));
 const allowed=candidate.filter(r=>r.final==='Allowed'), members=memberScores(rows,filters.program,Number(filters.paymentYear));
 const meanLocal=average(members.map(m=>m.local)),meanCms=average(members.map(m=>m.cms));
 const hccName=filters.program==='Part C'?'HCC':'RxHCC';
 const modelCode=(r:EdsRecord)=>filters.program==='Part C'?r.hcc?r.hcc==='37'?'HCC 37 · Diabetes':`HCC ${r.hcc} · ${r.condition}`:'Unmapped':r.rxhcc?`RxHCC ${r.rxhcc} · ${r.condition}`:'Unmapped';
 const total=rows.length;
 let result:EdsReport={title:id==='prevalence'?`${hccName} Prevalence Trends`:meta.title,info:EDS_SOURCE_NOTE,metrics:[],charts:[],records:rows,table:'encounter',tableTitle:'Encounter Records'};
 const scopeInfo='Scope: selected contract, years and population filters.';
 if(id==='acceptance') {
  const stages=[point('Source Encounters',rows),point('Submitted to EDS',submitted),point('File Validation Passed',rows.filter(r=>r.stage>=2)),point('EDFES Accepted',rows.filter(r=>r.stage>=3)),point('MAO-002 Accepted',accepted)];
  result.metrics=[metric('Source Encounters',n(total),'Reportable encounters in the selected population'),metric('Submitted to EDS',n(submitted.length),`${p(submitted.length,total)} of source encounters submitted`),metric('MAO-002 Accepted',n(accepted.length),`${p(accepted.length,total)} of source encounters accepted`),metric('Not Yet Accepted',n(rejected.length),'Submitted encounters pending MAO-002 acceptance')];
  result.charts=[chart('Encounter Acceptance Stages','funnel',stages,['Encounters'],completenessInfo+' Stage gaps show encounters that have not progressed to the next stage.'),chart('MAO-002 Acceptance Trend','area',trend(rows,r=>r.stage===4,true),['MAO-002 Acceptance Rate'],completenessInfo,{unit:'percent'})];
 } else if(id==='timeliness') {
  const sorted=accepted.map(r=>r.lag).sort((a,b)=>a-b),p90=sorted[Math.max(0,Math.ceil(sorted.length*.9)-1)];
  const aged=[point('0–7 Days',backlog.filter(r=>r.age<=7)),point('8–30 Days',backlog.filter(r=>r.age>7&&r.age<=30)),point('31–60 Days',backlog.filter(r=>r.age>30&&r.age<=60)),point('61+ Days',backlog.filter(r=>r.age>60))];
  const curve=EDS_MONTHS.map((name,i)=>point(name,submitted.filter(r=>r.month<=i+1)));
  result.metrics=[metric('Encounters Not Yet Accepted',n(backlog.length),'Includes unsubmitted and unaccepted encounters'),metric('Not Submitted',n(total-submitted.length),'Source encounters awaiting submission'),metric('Acceptance Time (90th Percentile)',p90===undefined?'—':`${p90} Days`,'Days from submission readiness to EDPS acceptance'),metric('Unaccepted Over 30 Days',n(count(backlog,r=>r.age>30)),'Measured from submission readiness')];
  result.charts=[chart('Unaccepted Encounter Aging','bar',aged,['Encounters'],'Age is measured from source readiness to the reporting cutoff.'),chart('Cumulative Encounter Submissions','area',curve,['Submitted Encounters'],'Counts accumulate by service month within the selected service year.')];result.records=backlog;result.tableTitle='Encounters Not Yet Accepted';
 } else if(id==='edits'||id==='duplicates') {
  const duplicate=id==='duplicates',focus=duplicate?rows.filter(r=>['98325','00265','00760'].includes(r.edit)):rejected;
  const pareto=groups(focus,r=>edsDisplayLabel(r.edit));let running=0;const sum=pareto.reduce((s,p)=>s+p.value,0);for(const p of pareto)p.secondary=sum?(running+=p.value)/sum*100:0;
  result.metrics=[metric(duplicate?'Duplicate Service-Line Issues':'Unaccepted Submissions',n(duplicate?count(rows,r=>r.edit==='98325'):rejected.length),'Distinct encounter records'),metric('Submission Issue Rate',p(focus.length,submitted.length),'Affected encounters ÷ submitted encounters'),metric('Adjustment Exceptions',n(count(rows,r=>!!r.lifecycleIssue)),'Encounter linkage or adjustment issues'),metric('Affected Members',n(new Set(focus.map(r=>r.memberId)).size),'Members with submission issues')];
  result.charts=[chart(duplicate?'Duplicate & Adjustment Reasons':'Submission Issue Breakdown','pareto',pareto,['Affected Encounters','Cumulative Percentage'],'Encounters grouped by submission issue. The line shows the cumulative percentage.',{secondaryPercent:true}),duplicate?chart('Chart Review Linkage Status','chain',groups(rows.filter(r=>r.recordType==='CRR'),r=>edsDisplayLabel(r.lifecycleIssue||(r.unlinked?'Unlinked CRR':'Linked Parent'))),['Records'],'CRRs grouped by parent linkage and adjustment status.'):chart('Unaccepted Submission Trend','area',trend(submitted,r=>r.stage<4,true),['Not Yet Accepted (%)'],'Submitted encounters without EDPS acceptance, grouped by service month.',{unit:'percent'})];result.records=focus;result.table=duplicate?'lifecycle':'encounter';result.tableTitle=duplicate?'Duplicate & Adjustment Records':'Encounter Submission Issues';
 } else if(id==='completeness') {
  const types=groups(rows,r=>edsDisplayLabel(r.serviceCategory)).map(p=>{const r=rows.filter(r=>p.ids.includes(r.id));return {...p,value:count(r,x=>x.stage>0),secondary:count(r,x=>x.stage===4),tertiary:r.length};});
  const nets=groups(rows,r=>r.network).map(p=>({...p,denominator:p.value,value:count(rows,r=>p.ids.includes(r.id)&&r.stage>0)/p.value*100}));
  result.metrics=[metric('Submission Completeness',p(submitted.length,total),'Submitted ÷ reportable encounters'),metric('MAO-002 Acceptance Rate',p(accepted.length,total),'EDPS-accepted encounters ÷ reportable source encounters'),metric('Missing Encounters',n(total-submitted.length),'Source encounters without a matching submission'),metric('Reportable Encounters',n(total),'Includes unsent source encounters')];
  result.charts=[chart('Encounter Completeness by Service','bar',types,['Submitted Encounters','MAO-002-Accepted Encounters','Source Encounters'],completenessInfo),chart('Network Submission Completeness','heatmap',nets,['Completeness'],completenessInfo,{unit:'percent'})];result.tableTitle='Source Encounter Reconciliation';
 } else if(id==='acknowledgements') {
  const waiting=rows.filter(r=>r.stage>0&&(r.stage<4||r.final==='Pending'));
  result.metrics=[metric('Unresolved Encounters',n(waiting.length),'Awaiting EDPS acceptance or final RA eligibility'),metric('Awaiting EDFES Acceptance',n(count(rows,r=>r.stage>0&&r.stage<3)),'277CA acceptance not yet recorded'),metric('Awaiting MAO-002',n(count(rows,r=>r.stage===3)),'EDFES accepted; MAO-002 acceptance outstanding'),metric('MAO-004 Pending',n(count(accepted,r=>r.final==='Pending')),'Accepted encounters awaiting MAO-004')];
  result.charts=[chart('Unresolved Processing Stages','donut',groups(waiting,r=>r.stage<2?'EDFES File Validation (999)':r.stage<3?'EDFES Acceptance (277CA)':r.stage<4?'EDPS Acceptance (MAO-002)':'RA Eligibility (MAO-004)'),['Encounters'],finalInfo),chart('Unresolved Encounter Aging','bar',groups(waiting,r=>r.age<=7?'0–7 Days':r.age<=30?'8–30 Days':'31+ Days'),['Encounters'],'Pending reports grouped by encounter age at the reporting cutoff.')];result.records=waiting;result.tableTitle='Encounters Awaiting EDS Responses';
 } else if(id==='yield') {
  const acceptedCandidate=candidate.filter(r=>r.stage===4);
  const stages=[point('Source Diagnosis Codes',rows),point(`${hccName}-Mapped Diagnosis Codes`,mapped),point('Supported & Service-Eligible Codes',candidate),point('Codes on MAO-002-Accepted Encounters',acceptedCandidate),point('MAO-004 Eligible Diagnosis Codes',allowed)];
  result.metrics=[metric('Risk Adjustment Candidates',n(candidate.length),'Supported, mapped and service eligible'),metric('MAO-004 Eligible Diagnosis Codes',n(allowed.length),'Qualifying candidates with MAO-004 eligibility'),metric('Diagnosis Eligibility Rate',p(allowed.length,candidate.length),'RA-eligible codes ÷ risk adjustment candidates'),metric('MAO-004 Pending',n(count(acceptedCandidate,r=>r.final==='Pending')),'Accepted candidates awaiting MAO-004')];
  result.charts=[chart('Risk Adjustment Eligibility Stages','funnel',stages,['Diagnosis Codes'],finalInfo+' Eligibility rate: RA-eligible codes divided by local candidate diagnosis codes.'),chart('Diagnosis Eligibility Gaps','donut',groups(rows.filter(r=>r.final!=='Allowed'||!localCandidate(r,filters.program)),r=>!(filters.program==='Part C'?r.hcc:r.rxhcc)?`No Matching ${hccName}`:!r.supported?'Insufficient Clinical Evidence':!r.serviceEligible?'Service Eligibility Issue':r.stage<4?'Encounter Not Yet Accepted':r.final==='Pending'?'MAO-004 Pending':'Excluded by RA Rules'),['Diagnosis Codes'],'Diagnosis codes grouped by the first unmet eligibility criterion.')];result.table='diagnosis';result.tableTitle='Diagnosis Eligibility Records';
 } else if(id==='reconciliation') {
  const paymentFactor=filters.program==='Part C'?12000:1800;
  const exposure=members.reduce((s,m)=>s+m.gap*paymentFactor,0);
  const variance=groups(rows,modelCode,5).map(p=>{const m=memberScores(rows.filter(r=>p.ids.includes(r.id)),filters.program,Number(filters.paymentYear));return {...p,value:average(m.map(x=>x.local)),secondary:average(m.map(x=>x.cms))};});
  result.metrics=[metric('Calculated Risk Score',score(meanLocal),'Average calculated score per member'),metric('Reconciled Risk Score',score(meanCms),'Average reconciled score per member'),metric('Average Risk Score Difference',score(meanLocal-meanCms),'Same members, model and payment year'),metric('Estimated Annual Payment Difference',money(exposure),filters.program==='Part C'?'$1,000 PMPM × 12 covered months':'$150 monthly subsidy basis × 12 months')];
  result.charts=[chart('Risk Score Reconciliation','waterfall',[point('Calculated Score',rows,meanLocal),{...point('Score Difference',rows,meanLocal-meanCms),offset:meanCms},point('Reconciled Score',rows,meanCms)],['Score'],'Average score difference between paired member-level scenarios for the selected cohort.',{unit:'score'}),chart('Risk Scores by Condition','bar',variance,['Calculated Score','Reconciled Score'],'Average member score by condition. A member may appear in multiple groups.',{unit:'score'})];result.records=members.map(m=>m.record);result.table='score';result.tableTitle='Member Risk Score Comparison';
 } else if(id==='unlinked') {
  const crr=rows.filter(r=>r.recordType==='CRR'),unlinked=crr.filter(r=>r.unlinked),nonexempt=unlinked.filter(r=>!r.exception),exposure=members.reduce((s,m)=>s+m.unlinked,0);
  result.metrics=[metric('Unlinked Chart Reviews',n(unlinked.length),'No accepted parent encounter link'),metric('Unlinked Reviews Without Exception',n(nonexempt.length),'Member-switch exceptions excluded'),metric('Member-Switch Exceptions',n(count(unlinked,r=>r.exception)),'Separate from non-exempt exposure'),metric('Average Risk Score Impact',score(members.length?exposure/members.length:0),Number(filters.paymentYear)>=2027?'Average score reduction from unlinked reviews':'Exclusion scenario begins in payment year 2027')];
  result.charts=[chart('Chart Review Linkage','donut',[point('Linked to Encounter',crr.filter(r=>!r.unlinked)),point('Unlinked Without Exception',nonexempt),point('Member-Switch Exception',unlinked.filter(r=>r.exception))],['Chart Review Records'],'For 2027, non-exempt unlinked CRR diagnosis codes are excluded from the scenario. The member-switch exception is tracked separately.'),chart('Unlinked Diagnosis Codes by Condition','heatmap',groups(nonexempt,modelCode),['Diagnosis Codes'],'Diagnosis-code counts by condition. Score exposure uses paired member-level scenarios.')];result.records=unlinked;result.table='lifecycle';result.tableTitle='Unlinked Chart Review Records';
 } else if(id==='filters') {
  const disagreement=accepted.filter(r=>r.final!=='Pending'&&(r.serviceEligible!==(r.final==='Allowed')));
  result.metrics=[metric('Mapped Diagnosis Codes',n(mapped.length),'Selected model family'),metric('Service Eligibility Rate',p(count(mapped,r=>r.serviceEligible),mapped.length),'Local service and provider filter'),metric('MAO-004 Eligibility Differences',n(disagreement.length),'Service eligibility differs from MAO-004'),metric('MAO-004 Pending',n(count(mapped,r=>r.final==='Pending')),'Diagnosis codes awaiting final RA eligibility')];
  const rates=groups(mapped,r=>edsDisplayLabel(r.serviceCategory)).map(p=>({...p,denominator:p.value,value:count(mapped,r=>p.ids.includes(r.id)&&r.serviceEligible)/p.value*100}));
  result.charts=[chart('Risk Adjustment Eligibility by Service','heatmap',rates,['Eligible'],finalInfo,{unit:'percent'}),chart('MAO-004 RA Eligibility','donut',groups(mapped,r=>edsDisplayLabel(r.final)),['Diagnosis Codes'],finalInfo)];result.records=mapped;result.table='diagnosis';result.tableTitle='Service Eligibility Records';
 } else if(id==='audit') {
  const reviewed=rows.filter(r=>r.supportReviewed&&(filters.program==='Part C'?!!r.hcc:!!r.rxhcc)),unsupported=reviewed.filter(r=>!r.supported);
  const paymentFactor=filters.program==='Part C'?12000:1800;
  const auditExposure=memberScores(reviewed,filters.program,Number(filters.paymentYear)).reduce((sum,m)=>sum+m.audit*paymentFactor,0);
  const risks=groups(unsupported,modelCode,5).map(p=>({...p,volume:p.value,value:memberScores(unsupported.filter(r=>p.ids.includes(r.id)),filters.program,Number(filters.paymentYear)).reduce((sum,m)=>sum+m.audit*paymentFactor,0),secondary:p.value?count(unsupported,r=>p.ids.includes(r.id)&&r.final==='Allowed')/p.value*100:0,detail:p.name}));
  result.metrics=[metric('Reviewed Diagnosis Codes',n(reviewed.length),'Documentation validation completed'),metric('Unsupported Diagnosis Codes',n(unsupported.length),'Reviewed codes with insufficient clinical evidence'),metric('Insufficient Documentation Rate',p(unsupported.length,reviewed.length),'Unsupported ÷ reviewed diagnosis codes'),metric('Estimated Audit Payment Risk',money(auditExposure),`${n(count(unsupported,r=>r.final==='Allowed'))} RA-eligible diagnosis codes lack support`)];
  result.charts=[chart('Documentation Risk by Condition','scatter',risks,['Estimated Payment Risk','MAO-004 Eligible Codes (%)'],'Each bubble groups diagnosis codes with insufficient documentation. The vertical axis shows the share that still has MAO-004 eligibility; the horizontal axis shows estimated payment exposure from paired member-level scenarios. Bubble size is the diagnosis count. Annual assumptions are $12,000 per Part C score point or $1,800 per Part D subsidy factor.',{unit:'currency'}),chart('Documentation Support by Source','bar',groups(reviewed,r=>edsDisplayLabel(r.source)).map(p=>({...p,value:count(reviewed,r=>p.ids.includes(r.id)&&r.supported),secondary:count(reviewed,r=>p.ids.includes(r.id)&&!r.supported)})),['Supported','Insufficient Clinical Evidence'],'Reviewed diagnosis codes grouped by source and documentation support.')];result.records=unsupported;result.table='diagnosis';result.tableTitle='Documentation Review Findings';
 } else if(id==='recapture') {
  const prior=rows.filter(r=>r.priorChronic&&r.chronic),unique=new Map<string,EdsRecord[]>();
  for(const r of prior){const k=`${r.memberId}:${r.hcc}`;unique.set(k,[...(unique.get(k)||[]),r]);}
  const closed=[...unique.values()].filter(rs=>rs.some(r=>r.supported&&r.serviceEligible&&r.final==='Allowed'));
  const matrix=groups(prior,modelCode,5).map(p=>{const rs=prior.filter(r=>p.ids.includes(r.id));const memberIds=new Set(rs.map(r=>r.memberId));const supported=new Set(rs.filter(r=>r.supported&&r.serviceEligible&&r.final==='Allowed').map(r=>r.memberId));return {...p,denominator:memberIds.size,value:memberIds.size?supported.size/memberIds.size*100:0};});
  result.metrics=[metric('Prior-Year Chronic Conditions',n(unique.size),'Distinct member-condition pairs'),metric('Confirmed Recaptures',n(closed.length),'Current supported, qualifying diagnosis'),metric('Recapture Rate',p(closed.length,unique.size),'Confirmed pairs ÷ eligible prior pairs'),metric('Open Recapture Gaps',n(unique.size-closed.length),'Awaiting current-year confirmation')];
  result.charts=[chart('Chronic Condition Recapture Rate','heatmap',matrix,['Recapture'], 'Recapture uses distinct member-condition pairs with current-year support and final eligibility.',{unit:'percent'}),chart('Chronic Condition Recapture Status','donut',[{name:'Recaptured',value:closed.length,ids:ids(closed.flat())},{name:'Not Yet Recaptured',value:unique.size-closed.length,ids:ids([...unique.values()].filter(rs=>!closed.includes(rs)).flat())}],['Member–Condition Pairs'],'A pair is counted only once, even when multiple current-year encounters support it.')];result.records=prior;result.table='diagnosis';result.tableTitle='Chronic Condition Evidence';
 } else if(id==='lifecycle') {
  const crr=rows.filter(r=>r.recordType==='CRR'),invalid=crr.filter(r=>!!r.lifecycleIssue);
  result.metrics=[metric('Chart Review Records',n(crr.length),'Selected EDR/CRR reporting cohort'),metric('Linked Chart Reviews',n(count(crr,r=>!!r.parentIcn)),'Accepted parent ICN reference'),metric('Adjustment Validation Issues',n(invalid.length),'Action or sequencing conflicts'),metric('Unlinked Deletes',n(count(crr,r=>r.lifecycleIssue==='Unlinked Delete')),'Delete records without a parent link')];
  result.charts=[chart('Chart Review Record Types','donut',groups(crr,r=>edsDisplayLabel(r.action)),['Chart Review Records'],'CRRs grouped by original, replace, void and delete actions.'),chart('Chart Review Adjustment Status','chain',groups(crr,r=>edsDisplayLabel(r.lifecycleIssue||'Valid State')),['Chart Review Records'],'CRRs grouped by linkage and adjustment validation status.')];result.records=crr;result.table='lifecycle';result.tableTitle='Chart Review Adjustment Records';
 } else if(id==='prevalence') {
  const eligible=rows.filter(r=>r.final==='Allowed'&&(filters.program==='Part C'?!!r.hcc:!!r.rxhcc));const pop=new Set(rows.map(r=>r.memberId)).size;
  const prior=rows.length?filterEdsRecords({...filters,serviceYear:String(Number(filters.serviceYear)-1)},providerScope):[],priorPop=new Set(prior.map(r=>r.memberId)).size;
  const points=groups(eligible,modelCode,5).map(p=>{const memberCount=new Set(eligible.filter(r=>p.ids.includes(r.id)).map(r=>r.memberId)).size;return {...p,value:pop?memberCount/pop*100:0,denominator:pop};});
  const comparison=points.map(p=>({...p,secondary:priorPop?new Set(prior.filter(r=>r.final==='Allowed'&&modelCode(r)===p.name).map(r=>r.memberId)).size/priorPop*100:0}));
  result.metrics=[metric('Members in Selected Population',n(pop),'Distinct members in the selected cohort'),metric(`RA-Eligible ${hccName} Categories`,n(new Set(eligible.map(modelCode)).size),'Versioned diagnosis mappings'),metric('MAO-004 Eligible Diagnosis Codes',n(eligible.length),'Diagnosis codes eligible under MAO-004'),metric('Most Prevalent Condition (%)',points.length?`${Math.max(...points.map(p=>p.value)).toFixed(1)}%`:'—','Members with the condition ÷ selected population')];
  result.charts=[chart(`${hccName} Prevalence`,'bar',points,['Member Prevalence'],'Top five condition groups. Members can have several HCCs; percentages are not mutually exclusive.',{unit:'percent'}),chart(`Year-over-Year ${hccName} Prevalence`,'bar',comparison,[String(filters.serviceYear),String(Number(filters.serviceYear)-1)],'Compares condition prevalence using the eligible member denominator in each service year, under the same payment-year model and filters.',{unit:'percent'})];result.records=eligible;result.table='diagnosis';result.tableTitle=`${hccName} Diagnosis Records`;
 } else {
  const quality:Record<string,{test:(r:EdsRecord)=>boolean;field:(r:EdsRecord)=>string;population:EdsRecord[];issueTitle:string;unit:string}>= {
   defaults:{test:r=>!!r.defaultReason,field:r=>defaultDataLabel(r.defaultReason),population:rows,issueTitle:'Reasons for Default Data',unit:'Encounters With Default Data'},
   identity:{test:r=>!!r.identityIssue,field:r=>edsDisplayLabel(r.identityIssue),population:submitted,issueTitle:'Member Identity Issues',unit:'Member Identity Issues'},
   providers:{test:r=>!!r.providerIssue,field:r=>edsDisplayLabel(r.providerIssue),population:rows,issueTitle:'Provider Data Issues',unit:'Provider Data Issues'},
   capitation:{test:r=>!!r.capitationIssue,field:r=>edsDisplayLabel(r.capitationIssue),population:rows.filter(r=>r.capitated),issueTitle:'Capitation Data Issues',unit:'Capitation Data Issues'},
   conformance:{test:r=>!!r.conformanceIssue,field:r=>edsDisplayLabel(r.conformanceIssue),population:submitted,issueTitle:'837 File Validation Issues',unit:'File Validation Issues'},
   special:{test:r=>!!r.specialIssue,field:r=>edsDisplayLabel(r.specialIssue),population:rows.filter(r=>['DME','SNF / Home Health','Ambulance'].includes(r.serviceCategory)),issueTitle:'Service-Specific Data Issues',unit:'Service Data Issues'},
  };
  const q=quality[id]||quality.defaults,fail=q.population.filter(q.test),ok=q.population.length-fail.length;
  result.metrics=[metric('Encounters Evaluated',n(q.population.length),'Encounters included in this validation'),metric(q.unit,n(fail.length),id==='defaults'?'Encounters reported with default data':'Encounters with the selected data issue'),metric(id==='defaults'?'Encounters Without Default Data (%)':'Validation Pass Rate',p(ok,q.population.length),id==='defaults'?'Share of encounters reported without default data':'Share of evaluated encounters without this issue'),metric(id==='defaults'?'Providers With Default Data':'Affected Providers',n(new Set(fail.map(r=>r.provider)).size),id==='defaults'?'Providers associated with default-data records':'Providers with affected encounters')];
  result.charts=[chart(q.issueTitle,'donut',groups(fail,q.field),['Encounters'],id==='defaults'?'Encounters grouped by reported default-data reason.':'Encounters grouped by field or reference issue.'),chart(id==='defaults'?'Encounters Without Default Data by Network':'Validation Pass Rate by Network','heatmap',groups(q.population,r=>r.network).map(p=>({...p,denominator:p.value,value:count(q.population,r=>p.ids.includes(r.id)&&!q.test(r))/p.value*100})),[id==='defaults'?'Without Default Data (%)':'Validation Pass Rate'],'Percentages use applicable records within each health network. Comparisons below 30 observations are suppressed as an internal analytic convention.',{unit:'percent'})];
  result.records=fail;result.table='quality';result.tableTitle=id==='defaults'?'Encounters With Default Data':q.issueTitle;
  if(id==='conformance') {
   const files=groups(submitted,r=>r.file,submitted.length),failedFiles=new Set(fail.map(r=>r.file));
   const capacity=files.slice(0,5);
   result.metrics=[metric('Submitted 837 Files',n(files.length),'Distinct file / transaction-set controls'),metric('Files With Validation Issues',n(failedFiles.size),'Envelope or structural validation'),metric('Largest Transaction Set',n(Math.max(0,...files.map(p=>p.value))),'Encounter records in a single ST/SE'),metric('Transaction Sets Over Record Limit',n(files.filter(p=>p.value>5000).length),'Compared with the 5,000-record reference limit')];
   result.charts[1]=chart('Encounter Counts by Transaction Set','bar',capacity,['Encounter Records'],'The five largest transaction sets in the selected scope. The guide describes a 5,000-encounter limit per ST/SE.');
  }
 }
 result.info=`${scopeInfo} ${result.info}`;
 return result;
}
export function recordQualityIssue(r:EdsRecord,id:string) {
 return edsDisplayLabel(({defaults:r.defaultReason?`${defaultDataLabel(r.defaultReason)} · ${r.defaultReason}`:'No Default Data',identity:r.identityIssue,providers:r.providerIssue,capitation:r.capitationIssue,conformance:r.conformanceIssue,special:r.specialIssue} as Record<string,string>)[id]||r.issue);
}
