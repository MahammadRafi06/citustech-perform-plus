"use client";

import type { AnalysisReport } from '@/lib/analytics-types';
import s from './suspect-discovery.module.css';


export function DiscoveryOverview({report,value,onChange}:{report:AnalysisReport;value:string;onChange:(value:string)=>void}) {
 const groups=report.discovery_groups||[];
 const total=groups.reduce((sum,group)=>sum+group.count,0);
 const additions=report.cases.filter(c=>c.discovery&&c.direction==='add').length;
 const corrections=report.cases.filter(c=>c.discovery&&c.direction==='remove').length;
 return <section className={`ct-card ${s.overview}`} aria-label="Clinical context gap categories">
  <div className={s.heading}>
   <div><h2>Suspect Clinical Context</h2></div>
   <div className={s.totals}><div><span>Context Gaps</span><strong>{total}</strong></div><div><span>Possible Additions</span><strong>{additions}</strong></div><div><span>Coding Checks</span><strong>{corrections}</strong></div></div>
  </div>
  <div className={s.categories}>{groups.map(group=><button key={group.id} className="ct-metric" aria-pressed={value===group.id} aria-label={`${group.name}, ${group.count} gaps`} onClick={()=>onChange(value===group.id?'all':group.id)}><div className="ct-metric-label">{group.name.toUpperCase()}</div><div className="ct-metric-value">{group.count}</div><p className="ct-metric-note">{group.description}</p></button>)}</div>
 </section>;
}
