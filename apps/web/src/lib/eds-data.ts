import { EDS_POPULATION } from './eds-population';
/** Authored local reporting fixtures. No CMS connection or official model execution.
 * Model outputs are paired member-level scenario results, not sums of HCC coefficients.
 * Keep encounter acceptance, final diagnosis eligibility and clinical support separate.
 */
export const EDS_NETWORKS = ['Central MA Network', 'Northside Medical', 'Harbor Primary Care', 'Dr. A. Carter'];
export const EDS_CONTRACTS = [
  ['H1234', 'H1234 · Central MA Network'], ['H1032', 'H1032 · Medicare Advantage'],
  ['H5594', 'H5594 · Medicare Advantage'], ['H7618', 'H7618 · Gulf Coast Partners'],
];
export const EDS_GROUPS = ['Northside Medical', 'Harbor Primary Care', 'Gulf Coast Physicians', 'Suncoast Medical Group'];
export const EDS_PROVIDERS = ['Dr. A. Carter', 'Dr. J. Lee', 'Dr. M. Owusu', 'Dr. S. Rivera', 'Dr. P. Nguyen', 'Dr. L. Bennett', 'Dr. R. Shah', 'Dr. E. Morgan'];
export const EDS_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep'];
export const EDS_SOURCE_NOTE = 'This local reporting dataset contains authored encounter and CMS-response records. It is not connected to CMS. Scores are stored scenario outputs, not results from the official CMS model. Financial amounts are estimates, not payments or receivables.';
export type EdsProgram = 'Part C' | 'Part D';
export type EdsFilters = { contract:string; paymentYear:string; serviceYear:string; program:EdsProgram; network:string; group:string; provider:string; pbp:string; type:string; source:string; recordType:string; month:string; submitter:string; environment:string };
export const DEFAULT_EDS_FILTERS:EdsFilters = {contract:'', paymentYear:'2027', serviceYear:'2026', program:'Part C', network:'',group:'',provider:'',pbp:'',type:'',source:'',recordType:'',month:'',submitter:'',environment:'Production'};
export type EdsRecord = {
 id:string; memberId:string; memberName:string; profile:boolean; contract:string; pbp:string; network:string; group:string; provider:string; providerId:string;
 year:number; month:number; serviceDate:string; sourceReady:string; submittedAt:string|null; acceptedAt:string|null; ackAt:string|null; finalAt:string|null;
 type:string; source:string; recordType:'EDR'|'CRR'; submitter:string; environment:string; stage:number; edit:string; issue:string;
 file:string; icn:string|null; parentIcn:string|null; action:string; unlinked:boolean; exception:boolean; lifecycleIssue:string;
 condition:string; icd:string; hcc:string; rxhcc:string; mapped:boolean; serviceEligible:boolean; supported:boolean; supportReviewed:boolean;
 preliminary:'Allowed'|'Disallowed'|'Pending'; final:'Allowed'|'Disallowed'|'Pending'; finalReason:string; chronic:boolean; priorChronic:boolean;
 age:number; lag:number; defaultReason:string; identityIssue:string; providerIssue:string; capitated:boolean; capitationIssue:string; conformanceIssue:string; specialIssue:string; serviceCategory:string;
 localScore:number; cmsScore:number; withoutUnlinkedScore:number; withoutUnsupportedScore:number; rxLocalScore:number; rxCmsScore:number; rxWithoutUnlinked:number; rxWithoutUnsupported:number;
};
const conditions = [
 ['Diabetes With Complications','E11.22','37','30'],['Chronic Kidney Disease','N18.4','328','261'],
 ['Heart Failure','I50.32','226','130'],['COPD','J44.9','280','160'],['Morbid Obesity','E66.01','48',''],
 ['Major Depressive Disorder','F33.2','155','133'],['HIV','B20','1','1'],['Vascular Disease','I73.9','108',''],
];
const canonical = [
 ['M-104829','Maria Santos','Dr. A. Carter','Northside Medical','PR-001','Diabetes With Complications','E11.22','37',1.38,1.14],
 ['M-318820','Ellen Brooks','Dr. M. Owusu','Northside Medical','PR-003','Diabetes Without Complication','E11.9','18',.98,.92],
 ['M-204175','Robert Klein','Dr. J. Lee','Harbor Primary Care','PR-002','COPD With Respiratory Failure','J44.9','85',1.4,1.22],
 ['M-441098','James Patel','Dr. A. Carter','Northside Medical','PR-001','CKD Stage 3a','N18.31','329',1.125,1.05],
 ['M-559214','Anne Foster','Dr. P. Nguyen','Harbor Primary Care','PR-005','Depression Screening','Z13.31','',.78,.78],
] as const;
const day = (year:number,month:number,date:number) => `${year}-${String(month).padStart(2,'0')}-${String(date).padStart(2,'0')}`;
const addDays = (date:string,days:number) => new Date(Date.parse(date+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);
const round = (n:number) => Math.round(n*1000)/1000;
function makeRecords():EdsRecord[] {
 const records:EdsRecord[]=[];
 for (const year of [2024,2025,2026]) for(let i=0;i<EDS_POPULATION.length*6;i++) {
  const member=i%EDS_POPULATION.length, visit=Math.floor(i/EDS_POPULATION.length), n=(i*37+year*11)%997;
  const roster=EDS_POPULATION[member];
  const bucket=(member*17)%100;
  const conditionIndex=[26,46,64,78,86,92,94,100].findIndex(limit=>bucket<limit);
  const c=conditions[conditionIndex], profile=member<5&&visit===0&&year===2026;
  const p=profile?canonical[member]:null;
  const stage=profile?0:n%100<2?0:n%100<3?1:n%100<5?2:n%100<9?3:4;
  const month=(visit+member%4)%9+1, date=day(year,month,3+member%18), lag=2+n%13;
  const source=['Claims Feed','Clinical EHR','Chart Review'][n%3];
  const recordType: 'EDR'|'CRR'=source==='Chart Review'?'CRR':'EDR';
  const unlinked=recordType==='CRR'&&n%5<2, exception=unlinked&&n%7===0;
  const mapped=profile?!!p![7]:n%31!==0, serviceEligible=mapped&&n%19!==0;
  const supported=profile?member!==4:n%23!==0, supportReviewed=profile?member!==4:n%9!==0;
  const preliminary=stage<4?'Pending':n%17===0?'Disallowed':'Allowed';
  // Final eligibility is independent of preliminary eligibility; unsupported may still be allowed.
  const final=stage<4||n%13===0?'Pending':!serviceEligible||n%29===0?'Disallowed':'Allowed';
  const local=round(.76+(member%19)*.046), gap=round(.008+(member%7)*.009);
  const rxLocal=round(.72+(member%13)*.028), rxGap=round(.006+(member%5)*.004);
  const edit=stage===0?'Not Submitted':stage===1?'999':stage===2?'277CA':stage===3?['98325','00265','00760','Member Identity','Provider NPI'][n%5]:'';
  const identityIssue=edit==='Member Identity'||n%79===0?['MBI Mismatch','Date of Birth','Enrollment Period'][n%3]:'';
  const providerIssue=edit==='Provider NPI'||n%67===0?['NPI Reference Mismatch','Specialty Not Eligible','Rendering NPI Missing'][n%3]:'';
  const defaultReason=n%61===0?['036','040','044','048','052','056','060'][n%7]:'';
  const capitated=n%4===0, capitationIssue=capitated&&n%11===0?['CN101 Missing','CAS Incomplete','Unexplained Zero Amount'][n%3]:'';
  const type=['837-P','837-I','837-P · DME'][member%3];
  const specialIssue=n%47===0?['HIPPS Missing','Ambulance Location Missing','DME Referring NPI Missing'][n%3]:'';
  const conformanceIssue=stage===1?['Control Number Mismatch','Transaction Count Mismatch','Required Segment Missing'][n%3]:'';
  const lifecycleIssue=recordType==='CRR'&&unlinked&&n%41===0?'Unlinked Delete':edit==='00760'?'Parent Already Adjusted':edit==='00265'?'Parent Disposition Pending':'';
  const id=`ENC-${year}-${String(i+1).padStart(6,'0')}`;
  records.push({id,memberId:p?p[0]:roster.id,memberName:p?p[1]:roster.name,profile,
   contract:p?'H1234':roster.contract,pbp:['001','002','003'][member%3],network:p?'Central MA Network':roster.network,group:p?p[3]:roster.group,provider:p?p[2]:roster.provider,providerId:p?p[4]:roster.providerId,
   year,month,serviceDate:date,sourceReady:addDays(date,2),submittedAt:stage>0?addDays(date,4):null,acceptedAt:stage===4?addDays(date,lag+2):null,ackAt:stage>=2?addDays(date,5):null,finalAt:final!=='Pending'?addDays(date,lag+11):null,
   type,source,recordType,submitter:n%2?'Perform+ EDI':'Network Exchange',environment:n%17===0?'Test':'Production',stage,edit,issue:edit|| (final==='Disallowed'?'RA Eligibility':final==='Pending'?'Awaiting MAO-004':'Reconciled'),
   file:stage>0?`837-${year}-${month}-${stage}-${member%3}-${n%2}-${n%17===0?'T':'P'}`:'Not Submitted',icn:stage>=3?`${year}10${String(i+1).padStart(7,'0')}`:null,
   parentIcn:recordType==='CRR'&&!unlinked?`${year}09${String(member+1).padStart(7,'0')}`:null,action:lifecycleIssue==='Unlinked Delete'?'Delete':unlinked?'Original':n%8===0?'Replace':n%17===0?'Void':'Original',unlinked,exception,lifecycleIssue,
   condition:p?p[5]:c[0],icd:p?p[6]:c[1],hcc:p?p[7]:mapped?c[2]:'',rxhcc:profile?(member===4?'':member===0||member===1?'30':member===2?'160':'261'):mapped?c[3]:'',mapped,serviceEligible,supported,supportReviewed,preliminary,final,finalReason:final==='Pending'?'Final report not received':final==='Allowed'?'Eligible after CMS filtering':!serviceEligible?'Service or provider filter':'Diagnosis excluded by final filter',
   chronic:profile?member!==4:true,priorChronic:profile?member!==4:member%5!==0,age:stage===4?0:4+n%76,lag,defaultReason,identityIssue,providerIssue,capitated,capitationIssue,conformanceIssue,specialIssue,serviceCategory:specialIssue.startsWith('HIPPS')?'SNF / Home Health':specialIssue.startsWith('Ambulance')?'Ambulance':type==='837-P · DME'?'DME':type==='837-I'?'Institutional':'Professional',
   localScore:p?p[8]:local,cmsScore:p?p[9]:round(local-gap),withoutUnlinkedScore:p?p[8]:round(local-(member%3===0?.027:0)),withoutUnsupportedScore:p?p[8]:round(local-(.018+(member%4)*.007)),rxLocalScore:rxLocal,rxCmsScore:round(rxLocal-rxGap),rxWithoutUnlinked:round(rxLocal-(member%3===0?.014:0)),rxWithoutUnsupported:round(rxLocal-(.009+(member%4)*.003)),
  });
 }
 return records.sort((a,b)=>Number(b.profile)-Number(a.profile)||a.id.localeCompare(b.id));
}
export const EDS_RECORDS=makeRecords();
export function filterEdsRecords(filters:EdsFilters, providerScope=''):EdsRecord[] {
 return EDS_RECORDS.filter(r=>(!providerScope||r.providerId===providerScope)&&r.year===Number(filters.serviceYear)
  && (!filters.contract||r.contract===filters.contract)&&(!filters.network||r.network===filters.network||r.group===filters.network||r.provider===filters.network)
  &&(!filters.group||r.group===filters.group)&&(!filters.provider||r.provider===filters.provider)&&(!filters.pbp||r.pbp===filters.pbp)
  &&(!filters.type||r.type===filters.type)&&(!filters.source||r.source===filters.source)&&(!filters.recordType||r.recordType===filters.recordType)
  &&(!filters.month||r.month===Number(filters.month))&&(!filters.submitter||r.submitter===filters.submitter)&&(!filters.environment||r.environment===filters.environment));
}
export function finalEligibility(r:Pick<EdsRecord,'final'|'preliminary'>) {return r.final==='Pending'?'Pending':r.final;}
export const localCandidate=(r:EdsRecord,program:EdsProgram='Part C')=>r.supported&&r.mapped&&r.serviceEligible&&(program==='Part C'?!!r.hcc:!!r.rxhcc);
export function modelVersions(filters:EdsFilters) {
 return {serviceYear:filters.serviceYear,paymentYear:filters.paymentYear,model:filters.program==='Part C'?'CMS-HCC V28':'RxHCC',mapping:`ICD-10 ${filters.paymentYear}`,filter:`EDS ${filters.paymentYear}`,coefficient:`${filters.program==='Part C'?'CMS-HCC':'RxHCC'} ${filters.paymentYear}`,origin:'Authored local model-output scenarios'};
}
export function memberScores(rows:EdsRecord[], program:EdsProgram, year:number) {
 const members=new Map<string,EdsRecord[]>(); for(const r of rows){const records=members.get(r.memberId);if(records)records.push(r);else members.set(r.memberId,[r]);}
 return [...members.values()].map(records=>{
  const r=records[0], eligible=records.some(x=>x.unlinked&&!x.exception&&x.final==='Allowed'&&(program==='Part C'?!!x.hcc:!!x.rxhcc));
  const local=program==='Part C'?r.localScore:r.rxLocalScore, cms=program==='Part C'?r.cmsScore:r.rxCmsScore;
  const scenario=program==='Part C'?r.withoutUnlinkedScore:r.rxWithoutUnlinked;
  const withoutUnsupported=program==='Part C'?r.withoutUnsupportedScore:r.rxWithoutUnsupported;
  return {memberId:r.memberId,memberName:r.memberName,local,cms,gap:round(local-cms),unlinked:eligible&&year>=2027?round(local-scenario):0,audit:records.some(x=>!x.supported&&x.final==='Allowed')?round(local-withoutUnsupported):0,record:r};
 });
}
