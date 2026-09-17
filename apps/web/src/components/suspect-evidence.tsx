"use client";

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { SuspectCase } from '@/lib/analytics-types';
import { analysisText, plainLabel } from '@/lib/analytics-language';
import { ChartInfo } from './analytics-controls';
import { Drawer } from './shared';
import s from './suspect-evidence.module.css';

const percent=(value:number)=>`${Math.round(value*100)}%`;
function displayDate(value:string) {
 const date=new Date(`${value.slice(0,10)}T00:00:00Z`);
 return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(date);
}
function confidenceDescription(c:SuspectCase) {
 if(c.profile_reference)return c.category==='OC'
  ? 'Confidence that the existing diagnosis code is supported by the record. A low value indicates a need to review the documentation. This value comes from the member’s Risk Adjustment tab.'
  : 'Clinical support confidence from the member’s Risk Adjustment tab. This is not a closure probability. Clinician documentation and coding validation are still required.';
 if(c.probability.base===null)return c.stale?'The analysis is too old to estimate confirmation likelihood.':c.category==='OC'?'A confirmation estimate does not apply to this coding-risk finding.':'There is not enough information to estimate confirmation likelihood.';
 const range=c.probability.low!==null&&c.probability.high!==null?` Expected range: ${percent(c.probability.low)}–${percent(c.probability.high)}.`:'';
 return `Estimated chance of obtaining supporting evidence within 90 days, assuming review within 30 days.${range} This probability has not been validated against actual outcomes and does not confirm a diagnosis.`;
}

export function SuspectEvidenceDrawer({finding,onOpenChange}:{finding:SuspectCase|null;onOpenChange:(open:boolean)=>void}) {
 return <Drawer open={!!finding} onOpenChange={onOpenChange} className={s.drawer}
  title={finding?.condition||'Suspect Evidence'}
  description={finding?`${finding.member_name||finding.member_id}${finding.member_name?` · ${finding.member_id}`:''}`:'Clinical evidence and coding context'}>
  {finding&&<SuspectEvidence key={finding.id} finding={finding}/>}
 </Drawer>;
}

function SuspectEvidence({finding:c}:{finding:SuspectCase}) {
 const reference=c.profile_reference;
 const gap=c.discovery;
 const pulmonaryHandoff=c.aliases.some(id=>id==='DISC-COPD-SPECIALIST'||id.startsWith('DISC-COPD-SPECIALIST-'));
 const category=reference?.category||plainLabel(c.category_label);
 const hcc=reference?(reference.hcc?`HCC-${reference.hcc}`:null):c.hcc.replace(/^HCC /,'HCC-');
 const confidence=reference?.confidence||(c.probability.base===null?c.probability.band:percent(c.probability.base));
 const impact=reference?reference.delta.toFixed(3):c.delta===null?'Not Estimated':`${c.delta>0?'+':''}${c.delta.toFixed(3)}`;
 const impactLabel=reference?`${c.category==='OC'?'RAF at Risk':'RAF Contribution'} · ${reference.year}`:c.category==='OC'?'Estimated Correction':'Estimated Score Gain';
 const summary=pulmonaryHandoff?'Pulmonology documents established COPD and reviews maintenance treatment.':reference?.evidence||gap?.signal||analysisText(c.summary);
 const recorded=pulmonaryHandoff?'Primary care lists cough; COPD is not recorded.':gap?.coded_view||reference?.inclusion||'The available coded record requires reconciliation with the clinical evidence.';
 const validation=pulmonaryHandoff?'Confirm the specialist note is current and eligible for coding, and check whether COPD was captured elsewhere. Cough or inhaler use alone does not confirm COPD.':reference?.compliance_note||gap?.confirm||analysisText(c.countercheck);
 const sources=[...c.sources].sort((a,b)=>a.date.localeCompare(b.date));
 const metrics=[
  {label:'Evidence Strength',value:reference?.evidence_strength||c.evidence},
  {label:reference?'Source Confidence':'Confirmation Likelihood',value:confidence,info:confidenceDescription(c)},
  {label:impactLabel,value:impact,info:reference?'RAF contribution from the member’s Risk Adjustment tab. It is not included in forecasts for the selected program and model.':'Estimated score change if the finding is clinically validated and eligible for the selected model. It is not a submitted or accepted score.'},
 ];
 return <div className={s.content}>
  <div className={s.context}>
   <div>{hcc&&<span>{hcc}</span>}<span>{category}</span>{gap&&gap.label.toLowerCase()!==category.toLowerCase()&&<span>{gap.label}</span>}</div>
   {reference&&<Link href={`/member360?member=${encodeURIComponent(c.member_id)}&tab=risk`} aria-label={`Open member profile for ${c.member_name||c.member_id}`} title="Open member profile"><ArrowUpRight size={17}/></Link>}
  </div>

  <div className={s.metrics} style={{gridTemplateColumns:`repeat(${metrics.length},minmax(0,1fr))`}}>
   {metrics.map(metric=><div key={metric.label}><div className={s.metricLabel}>{metric.label}{metric.info&&<ChartInfo title={metric.label} description={metric.info}/>}</div><strong>{metric.value}</strong></div>)}
  </div>

  <section aria-label="Clinical finding">
   <h3>Record Discrepancy</h3>
   <div className={s.comparison}>
    <div><h4>Recorded Diagnosis</h4><p>{recorded}</p></div>
    <div><h4>Clinical Evidence</h4><p>{summary}</p></div>
   </div>
  </section>

  {sources.length>0&&<section aria-label="Supporting records">
   <div className={s.sectionHeading}><h3>Source Records</h3><span>{sources.length} {sources.length===1?'record':'records'}</span></div>
   <div className={s.records}>
    {sources.map(source=><article className={s.record} key={source.id}>
     <time dateTime={source.date}>{displayDate(source.date)}</time>
     <h4>{source.title}</h4>
     {source.excerpts.length?source.excerpts.map((excerpt,index)=><figure key={index}>
      <blockquote>{excerpt.text}</blockquote>
      <figcaption>Page {excerpt.page} · {excerpt.section}</figcaption>
     </figure>):<p className={s.sourceNote}>No excerpt is available for this record.</p>}
    </article>)}
   </div>
  </section>}

  <section className={s.validation}>
   <h3>Validation Required</h3>
   <p>{validation}</p>
   {!sources.length&&<span className={s.sourceNote}>{reference?'Based on the Member 360 summary; original documents are not attached.':'Based on case information; original documents are not attached.'}</span>}
  </section>

  {c.recommendation_history.length>0&&<div className={s.details}>
   <details><summary>Analysis History <span>{c.recommendation_history.length}</span></summary><ol className={s.history}>{c.recommendation_history.map(row=><li key={row.version}><strong>Version {row.version}</strong>{row.created_at&&<time>{displayDate(row.created_at)}</time>}<p>{analysisText(row.summary)}</p></li>)}</ol></details>
  </div>}
 </div>;
}
