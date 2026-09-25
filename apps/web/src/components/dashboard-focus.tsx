import { ArrowUpRight } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { CountRow } from '@/lib/analytics-types';
import { num } from '@/lib/api';
import styles from './dashboard-focus.module.css';

const ADDITIONS = [
  { id:'CG', source:'Coding gap', label:'Missing diagnosis code' },
  { id:'RC', source:'Recapture', label:'Confirm past conditions' },
  { id:'SP', source:'Specificity', label:'Missing Specificity' },
  { id:'NC', source:'New condition', label:'Possible new condition' },
  { id:'ST', source:'Persistent status', label:'Ongoing health status' },
];
const COLORS = ['var(--sapphire)', 'var(--royal)', 'var(--green)', 'var(--regent)', 'var(--chart-6)'];

export function DashboardFocus({categories,onSelect}:{categories:CountRow[];onSelect:(category:string)=>void}) {
  const count = (name:string) => categories.find(row=>row.name===name)?.count || 0;
  const additions = ADDITIONS.map(row=>({...row,count:count(row.source)})).sort((a,b)=>b.count-a.count);
  const visibleAdditions = additions.filter(row=>row.id !== 'ST');
  const total = categories.reduce((sum,row)=>sum+row.count,0);
  const additionCount = additions.reduce((sum,row)=>sum+row.count,0);
  const codingCount = count('Potential overcapture');
  const dataCount = count('Data representation');
  const otherCount = total-additionCount-codingCount-dataCount;
  const largest = Math.max(...visibleAdditions.map(row=>row.count), 1);
  const share = (value:number) => total ? `${(value/total*100).toFixed(1)}%` : '0%';

  return <div className={styles.focus}>
    <div className={styles.summary}>
      <button onClick={()=>onSelect('capture')} disabled={!additionCount} aria-label={`Explore ${num(additionCount)} possible additions`}>
        <strong>{num(additionCount)}</strong><span>suspects</span><ArrowUpRight size={16} aria-hidden="true"/>
      </button>
    </div>
    <div className={styles.layout}>
      <div className={styles.opportunities}>
        {additionCount ? <div className={styles.chart} role="group" aria-label="Suspect opportunities by category">
          {visibleAdditions.map((row,index)=><button key={row.id} className={styles.category} disabled={!row.count}
            style={{'--series-color':COLORS[index], '--bar-size':`${row.count/largest*100}%`} as CSSProperties}
            aria-label={`${row.label}: ${num(row.count)} suspects, ${share(row.count)} of all findings`} onClick={()=>onSelect(row.id)}>
            <span className={styles.categoryLabel}>{row.label}</span>
            <span className={styles.track} aria-hidden="true"><span className={styles.stem}>{row.count>0&&<i/>}</span></span>
            <span className={styles.value}><strong>{num(row.count)}</strong><small>{share(row.count)}</small></span>
            <ArrowUpRight className={styles.open} size={15} aria-hidden="true"/>
          </button>)}
        </div> : <div className={styles.empty}>No possible additions in this selection.</div>}
      </div>
      <aside className={styles.checks} aria-label="Coding risk">
        <button className={styles.check} onClick={()=>onSelect('OC')} disabled={!codingCount} aria-label={`Possible overcoding: ${num(codingCount)} suspects`}>
          <span className={styles.checkLabel}>Possible overcoding<ArrowUpRight size={16} aria-hidden="true"/></span>
          <span className={styles.checkValue}><strong>{num(codingCount)}</strong><small>{share(codingCount)} of all findings</small></span>
        </button>
        <div className={styles.secondary}>
          <button onClick={()=>onSelect('DR')} disabled={!dataCount}><span>Source data checks</span><strong>{num(dataCount)}</strong><ArrowUpRight size={14} aria-hidden="true"/></button>
          {otherCount>0&&<button onClick={()=>onSelect('Unknown')}><span>Not yet classified</span><strong>{num(otherCount)}</strong><ArrowUpRight size={14} aria-hidden="true"/></button>}
        </div>
      </aside>
    </div>
  </div>;
}
