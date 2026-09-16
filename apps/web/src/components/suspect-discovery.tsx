"use client";

import { Eye, History, Network, ScanText, RotateCcw, FileWarning, ArrowRight } from 'lucide-react';
import type { AnalysisReport, SuspectCase } from '@/lib/analytics-types';
import s from './suspect-discovery.module.css';

const icons = [Eye, History, Network, ScanText, RotateCcw, FileWarning];

export function DiscoveryOverview({report,value,onChange}:{report:AnalysisReport;value:string;onChange:(value:string)=>void}) {
 const groups=report.discovery_groups||[];
 const total=groups.reduce((sum,group)=>sum+group.count,0);
 const additions=report.cases.filter(c=>c.discovery&&c.direction==='add').length;
 const corrections=report.cases.filter(c=>c.discovery&&c.direction==='remove').length;
 return <section className={s.overview} aria-label="Clinical context gap categories">
  <div className={s.heading}>
   <div><span className={s.eyebrow}>Beyond diagnosis codes</span><h2>Find the gaps hidden in the clinical story</h2><p>Connect narrative, timing and related records to surface suspects a code-only screen can overlook.</p></div>
   <div className={s.totals}><div><strong>{total}</strong><span>context gaps</span></div><div><strong>{additions}</strong><span>possible additions shown</span></div><div><strong>{corrections}</strong><span>coding checks shown</span></div></div>
  </div>
  <div className={s.categories}>{groups.map((group,index)=>{const Icon=icons[index]||Eye;return <button key={group.id} aria-pressed={value===group.id} aria-label={`${group.name}, ${group.count} gaps`} onClick={()=>onChange(value===group.id?'all':group.id)}><div><Icon size={17}/><strong>{group.count}</strong></div><h3>{group.name}</h3><p>{group.description}</p></button>;})}</div>
  <div className={s.caption}><span>Discovery patterns · every gap still needs confirmation</span><button onClick={()=>onChange('all')} disabled={value==='all'}>Show all context gaps <ArrowRight size={13}/></button></div>
 </section>;
}

export function DiscoveryExplanation({finding}:{finding:SuspectCase}) {
 const gap=finding.discovery;
 if(!gap)return null;
 return <section className={s.explanation}>
  <div className={s.detailHeading}><span className={s.eyebrow}>{gap.label}</span><h3>The missing piece of the clinical story</h3><p>{gap.signal}</p></div>
  <div className={s.comparison}><div><span>Coded view</span><p>{gap.coded_view}</p></div><div><span>What clinical context adds</span><p>{gap.why_missed}</p></div></div>
  <div className={s.confirm}><h3>What needs confirming</h3><p>{gap.confirm}</p></div>
 </section>;
}
