import { ArrowUpRight, Database, ShieldCheck, Sparkles } from 'lucide-react';
import type { CountRow } from '@/lib/analytics-types';
import { num } from '@/lib/api';
import styles from './dashboard-focus.module.css';

const ADDITIONS = [
  { id:'CG', source:'Coding gap', label:'Missing diagnosis code' },
  { id:'RC', source:'Recapture', label:'Confirm past conditions' },
  { id:'SP', source:'Specificity', label:'More diagnosis detail' },
  { id:'NC', source:'New condition', label:'Possible new condition' },
  { id:'ST', source:'Persistent status', label:'Ongoing health status' },
];

export function DashboardFocus({categories,onSelect}:{categories:CountRow[];onSelect:(category:string)=>void}) {
  const count = (name:string) => categories.find(row=>row.name===name)?.count || 0;
  const additions = ADDITIONS.map(row=>({...row,count:count(row.source)})).sort((a,b)=>b.count-a.count);
  const total = categories.reduce((sum,row)=>sum+row.count,0);
  const additionCount = additions.reduce((sum,row)=>sum+row.count,0);
  const codingCount = count('Potential overcapture');
  const dataCount = count('Data representation');
  const otherCount = total-additionCount-codingCount-dataCount;
  // A very small third block stays in the labeled list, never in an unreadable sliver.
  const populated = additions.filter(row=>row.count>0);
  const top = populated.slice(0,3);
  if(top.length===3 && top[2].count/(top[1].count+top[2].count)<.36)top.pop();
  if(top.length===2 && top[1].count/(top[0].count+top[1].count)<.22)top.pop();
  const remaining = additions.filter(row=>!top.some(item=>item.id===row.id));
  const mappedCount = top.reduce((sum,row)=>sum+row.count,0);
  const share = (value:number) => total ? `${(value/total*100).toFixed(1)}%` : '0%';

  return <div className={styles.focus}>
    <div className={styles.layout}>
      <div className={styles.opportunities}>
        <div className={styles.groupHeading}>
          <div><span className={styles.eyebrow}>Possible additions</span><h3>Find the missing clinical picture</h3></div>
          <button onClick={()=>onSelect('capture')} disabled={!additionCount} aria-label={`Explore ${num(additionCount)} possible additions`}>
            <strong>{num(additionCount)}</strong><span>suspected conditions <ArrowUpRight size={14}/></span>
          </button>
        </div>
        {top.length ? <div className={styles.map} role="group" aria-label="Largest groups of possible additions"
          style={{gridTemplateColumns:top.length>1?`${top[0].count}fr ${mappedCount-top[0].count}fr`:'1fr',gridTemplateRows:top.length===3?`${top[1].count}fr ${top[2].count}fr`:'1fr'}}>
          {top.map((row,index)=><button key={row.id} className={styles.block} data-tone={index} style={index===0&&top.length===3?{gridRow:'1 / 3'}:undefined}
            aria-label={`${row.label}: ${num(row.count)} suspected conditions`} onClick={()=>onSelect(row.id)}>
            <ArrowUpRight className={styles.open} size={18}/>
            {index===0&&<span className={styles.blockOverline}>Largest group</span>}
            <strong>{num(row.count)}</strong><span className={styles.blockLabel}>{row.label}</span>
            <small>{share(row.count)} of all findings</small>
          </button>)}
        </div> : <div className={styles.empty}>No possible additions in this selection.</div>}
        {!!remaining.length&&<div className={styles.more} aria-label="Other possible additions">
          {remaining.map(row=><button key={row.id} onClick={()=>onSelect(row.id)} disabled={!row.count}>
            <span>{row.label}</span><strong>{num(row.count)}</strong><ArrowUpRight size={14}/>
          </button>)}
        </div>}
      </div>
      <aside className={styles.checks} aria-label="Coding and data checks">
        <span className={styles.eyebrow}>Coding & data checks</span>
        <button className={styles.check} onClick={()=>onSelect('OC')} disabled={!codingCount} aria-label={`Possible overcoding: ${num(codingCount)} suspected conditions`}>
          <span className={styles.checkLabel}><ShieldCheck size={18}/>Possible overcoding<ArrowUpRight size={15}/></span>
          <span className={styles.checkValue}><strong>{num(codingCount)}</strong><small>{share(codingCount)} of all findings</small></span>
          <span className={styles.checkDescription}>Check whether recorded diagnoses are supported by the evidence.</span>
        </button>
        <button className={styles.check} onClick={()=>onSelect('DR')} disabled={!dataCount} aria-label={`Data issues: ${num(dataCount)} findings`}>
          <span className={styles.checkLabel}><Database size={18}/>Data issues<ArrowUpRight size={15}/></span>
          <span className={styles.checkValue}><strong>{num(dataCount)}</strong><small>{share(dataCount)} of all findings</small></span>
          <span className={styles.checkDescription}>Resolve missing or inconsistent source information.</span>
        </button>
        {otherCount>0&&<button className={styles.unclassified} onClick={()=>onSelect('Unknown')}><span>Not yet classified</span><strong>{num(otherCount)}</strong><ArrowUpRight size={13}/></button>}
      </aside>
    </div>
    <div className={styles.footer}>
      <p>{num(total)} findings in this selection. Counts represent conditions, not unique members.</p>
      <span><Sparkles size={14}/>Rules find gaps. AI adds context.</span>
    </div>
  </div>;
}
