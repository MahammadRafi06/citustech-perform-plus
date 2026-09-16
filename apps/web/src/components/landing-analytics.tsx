"use client";

import { Fragment, useState, type ReactNode } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Crosshair, Layers3 } from 'lucide-react';
import { Bar, CartesianGrid, Cell, ComposedChart, LabelList, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import type { AnalysisReport, LandingAnalytics } from '@/lib/analytics-types';
import s from './landing-analytics.module.css';

const blue='var(--sapphire)', teal='var(--green)', amber='var(--yellow)';
const axis={axisLine:false,tickLine:false,tick:{fontSize:13,fill:'var(--regent)'}};
const tip={border:'1px solid var(--line)',borderRadius:4,fontSize:13,boxShadow:'0 8px 25px #20334c12'};
const count=(value:number)=>value.toLocaleString('en-US');
const percent=(value:number)=>`${Math.round(value*100)}%`;
const money=(value:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:1}).format(value);
const needs:Record<string,string>={none:'No recorded social need',food:'Food insecurity · Z59.41',transport:'Transportation insecurity · Z59.82',housing:'Housing instability · Z59.811'};
const short=(name:string)=>name.replace('Diabetes with complications','Diabetes').replace('Cardiovascular conditions','Cardiovascular').replace('Chronic kidney disease','Kidney disease').replace('Persistent status','Ongoing health status');
type Nav=(target:string,extra?:Record<string,string>)=>void;
function Card({index,title,description,tools,children,wide=false}:{index:string;title:string;description:string;tools?:ReactNode;children:ReactNode;wide?:boolean}) {
 return <section className={`ct-card ${s.card} ${wide?s.wide:''}`}><header className={s.header}><div><span className={s.kicker}>{index}</span><h2>{title}</h2><p>{description}</p></div>{tools}</header>{children}</section>;
}
function Legend({items}:{items:[string,string][]}) {return <div className={s.legend}>{items.map(([name,color])=><span key={name}><i style={{background:color}}/>{name}</span>)}</div>;}
function Chart({label,children,height=290}:{label:string;children:ReactNode;height?:number}) {return <div className={s.chart} role="img" aria-label={label} style={{height}}><ResponsiveContainer width="100%" height="100%" initialDimension={{width:600,height}}>{children as React.ReactElement}</ResponsiveContainer></div>;}
function NoData(){return <div className={s.noData}>No groups to compare with these filters. Broaden the selection to see more results.</div>;}

export function LandingAnalyticsPanels({report,go,update,frozen=false}:{report:AnalysisReport;go:Nav;update:(values:Record<string,string>)=>void;frozen?:boolean}) {
 const data=report.landing;
 if(!data)return <div className={s.notice}>This saved report predates the new dashboard. <button onClick={()=>go('/overview')}>Open current dashboard <ArrowUpRight size={13}/></button></div>;
 return <div className={s.layout}>
  <Opportunity data={data} go={go} scoreName={report.config.program==='MA'?'RAF':'score'}/>
  <Recapture data={data} go={go}/>
  <ModelImpact data={data} program={report.config.program}/>
  <ProviderOutcomes data={data} program={report.config.program}/>
  <SocialNeeds data={data} report={report} update={update} go={go} frozen={frozen}/>
 </div>;
}

function Opportunity({data,go,scoreName}:{data:LandingAnalytics;go:Nav;scoreName:string}) {
 const [domain,setDomain]=useState('');const [selected,setSelected]=useState('');
 const points=data.matrix.filter(p=>!p.suppressed&&(!domain||p.name===domain));
 const picked=points.find(p=>p.id===selected);
 const open=()=>go('/suspects',picked?{condition:picked.name,closure:String(picked.closure),category:'capture',disposition:'open'}:{closure:'priority',category:'capture',condition:'',disposition:'open'});
 return <Card wide index="01 / Find the opportunity" title="Which suspects are worth a closer look?" description={`Chance of closure meets expected ${scoreName} gain. Larger circles represent more members.`} tools={<label className={s.selectLabel}>Condition<select aria-label="Opportunity condition" value={domain} onChange={e=>{setDomain(e.target.value);setSelected('');}}><option value="">All conditions</option>{[...new Set(data.matrix.map(p=>p.name))].map(name=><option key={name}>{name}</option>)}</select></label>}>
  <div className={s.opportunity}>
   <div><div className={s.chartCaption}><span>Expected {scoreName} gain per suspect</span><button onClick={()=>{setSelected('');go('/suspects',{closure:'priority',category:'capture',condition:'',disposition:'open'});}}>Explore high-value, likely-to-close cases <ArrowUpRight size={13}/></button></div>
   {points.length?<Chart height={295} label="Suspect opportunity matrix: chance of closure, expected score gain and member count"><ScatterChart margin={{top:15,right:25,bottom:23,left:2}}>
    <CartesianGrid stroke="var(--line)" strokeDasharray="3 4"/><XAxis {...axis} type="number" dataKey="closure" domain={[0,1]} ticks={[0,.25,.5,.75,1]} tickFormatter={percent} name="Chance of closure" label={{value:'Chance of closure',position:'bottom',fontSize:13,fill:'var(--regent)',offset:4}}/><YAxis {...axis} type="number" dataKey="gain" domain={[0,.30]} tickFormatter={v=>Number(v).toFixed(2)} width={40} name={`Expected ${scoreName} gain`}/><ZAxis dataKey="members" range={[75,620]} name="Members"/>
    <ReferenceArea x1={.65} x2={1} y1={.14} y2={.3} fill={teal} fillOpacity={.06} onClick={()=>go('/suspects',{closure:'priority',category:'capture',condition:'',disposition:'open'})} style={{cursor:'pointer'}}/>
    <ReferenceLine x={.65} stroke="#bac6d7" strokeDasharray="4 5"/><ReferenceLine y={.14} stroke="#bac6d7" strokeDasharray="4 5"/>
    <Tooltip contentStyle={tip} cursor={{strokeDasharray:'3 3'}} labelFormatter={(_,p)=>p?.[0]?.payload?.name||'Condition group'} formatter={(v,n)=>n==='Chance of closure'?percent(Number(v)):n==='Members'?count(Number(v)):Number(v).toFixed(3)}/>
    <Scatter data={points} isAnimationActive={false} onClick={p=>setSelected(p.id)}>{points.map(p=><Cell key={p.id} fill={(p.closure||0)>=.65&&(p.gain||0)>=.14?teal:blue} fillOpacity={selected===p.id?.toString()?1:.64} stroke={selected===p.id?'var(--sapphire)':'white'} strokeWidth={selected===p.id?2.5:1.5} cursor="pointer"/>)}</Scatter>
   </ScatterChart></Chart>:<NoData/>}
   <div className={s.groupPicker}><label>Inspect a group<select aria-label="Inspect opportunity group" value={picked?.id||''} onChange={e=>setSelected(e.target.value)}><option value="">Priority opportunity</option>{points.map(p=><option key={p.id} value={p.id}>{short(p.name)} · {percent(p.closure||0)} chance · {count(p.members||0)} members</option>)}</select></label></div></div>
   <aside className={s.opportunityAside}><span className={s.kicker}><Crosshair size={14}/> {picked?'Selected group':'Priority opportunity'}</span><h3>{picked?short(picked.name):'High value. More likely to close.'}</h3><strong>{count(picked?.members??data.priority_members)}</strong><span>members · {count(picked?.cases??data.priority_cases)} suspected conditions</span><p>{picked?`${percent(picked.closure||0)} chance of closure · ${(picked.gain||0).toFixed(3)} expected ${scoreName} gain per suspect.`:`At least 65% chance of closure and 0.140 expected ${scoreName} gain per suspect.`}</p><button className={s.primary} onClick={open}>View suspected conditions <ArrowUpRight size={14}/></button><small>The list keeps your filters and can be exported.</small></aside>
  </div><footer className={s.footnote}>Closure estimates use assumed access to care. Expected gain = possible score increase × chance of confirmation. These are separate estimates; gains are not added across overlapping diagnoses.</footer>
 </Card>;
}

function Recapture({data,go}:{data:LandingAnalytics;go:Nav}) {
 const [dimension,setDimension]=useState('practice');const [page,setPage]=useState(0);const [cell,setCell]=useState('');
 const r=data.recapture;const cols=dimension==='practice'?r.practices.map(p=>({key:p.id,name:p.name})):r.months.map((name,i)=>({key:String(i+1),name}));
 const pages=Math.max(1,Math.ceil(cols.length/6));const current=Math.min(page,pages-1);const shown=cols.slice(current*6,current*6+6);
 const conditions=[...new Set(r.heat.map(h=>h.condition))];const chosen=r.heat.find(h=>`${h.condition}|${h.dimension}|${h.key}`===cell&&!h.suppressed);
 return <Card wide index="02 / Confirm past conditions" title="What still needs confirming this year?" description="Prior-year member–condition pairs, split into confirmed again and still missing. Each member can have several conditions." tools={<div className={s.segment}>{['practice','month'].map(d=><button key={d} aria-pressed={dimension===d} onClick={()=>{setDimension(d);setPage(0);setCell('');}}>{d==='practice'?'By practice':'By month'}</button>)}</div>}>
  <div className={s.recapture}><div className={s.funnel}>
   <div className={s.funnelTotal}><span>Prior-year conditions</span><strong>{count(r.prior)}</strong></div><div className={s.funnelConnector}/>
   <div className={s.funnelSplit}><div><strong>{count(r.confirmed)}</strong><span>Confirmed again</span></div><div><strong>{count(r.missing)}</strong><span>Still missing</span></div></div>
   <div className={s.completion}><div><i style={{width:`${r.prior?r.confirmed/r.prior*100:0}%`}}/></div><strong>{r.prior?percent(r.confirmed/r.prior):'0%'} confirmed</strong></div>
   <p>{chosen?<><b>{short(chosen.condition)}</b><br/>{chosen.name}<br/>{count(chosen.confirmed||0)} of {count(chosen.members||0)} confirmed.</>:'Select a heatmap cell to compare a condition within a practice or month.'}</p>
   {chosen&&<button className={s.textButton} onClick={()=>go('/analytics',{view:'risk',condition:chosen.condition,practices:dimension==='practice'?JSON.stringify([chosen.key]):'',run_month:dimension==='month'?chosen.key.padStart(2,'0'):''})}>Explore this group <ArrowUpRight size={13}/></button>}
  </div><div className={s.heatSection}>
   <div className={s.heatLegend}><span>Share confirmed again</span><div><span>Lower</span><i/><span>Higher</span></div><div><button aria-label="Previous heatmap columns" disabled={current===0} onClick={()=>setPage(current-1)}><ChevronLeft size={14}/></button><span>{current+1} / {pages}</span><button aria-label="Next heatmap columns" disabled={current===pages-1} onClick={()=>setPage(current+1)}><ChevronRight size={14}/></button></div></div>
   {conditions.length?<div className={s.heat} style={{gridTemplateColumns:`minmax(116px,1.3fr) repeat(${Math.max(1,shown.length)},minmax(62px,1fr))`}}><span/>{shown.map(c=><strong key={c.key} title={c.name}>{c.name}</strong>)}{conditions.map(condition=><Fragment key={condition}><span title={condition}>{short(condition)}</span>{shown.map(c=>{const h=r.heat.find(h=>h.condition===condition&&h.dimension===dimension&&h.key===c.key);const id=`${condition}|${dimension}|${c.key}`;return <button key={c.key} aria-label={`${short(condition)}, ${c.name}: ${!h?'no conditions':h.suppressed?'not shown to protect small groups':`${percent(h.rate||0)} confirmed`}`} title={!h?'No conditions':h.suppressed?'Not shown to protect small groups':undefined} disabled={!h||h.suppressed} aria-pressed={cell===id} style={{background:!h||h.suppressed?'#f4f6f8':`rgba(0,76,141,${.06+(h.rate||0)*.62})`,color:(h?.rate||0)>.66?'#fff':'var(--sapphire)'}} onClick={()=>setCell(id)}>{!h||h.suppressed?'—':percent(h.rate||0)}</button>;})}</Fragment>)}</div>:<NoData/>}
  </div></div><footer className={s.footnote}>Monthly cells show cumulative confirmations; the funnel shows the full selected period. — means no conditions or a value withheld to protect small groups. A missing confirmation does not establish that a condition is still present.</footer>
 </Card>;
}

function ModelImpact({data,program}:{data:LandingAnalytics;program:string}) {
 const [family,setFamily]=useState('');const model=data.model;let end=model.start||0;
 const changes=model.changes.filter(c=>!family||c.name===family);
 const floor=Math.max(0,end-.12);
 const bars=[{name:'V24',range:[floor,end],change:end,total:true}];for(const c of changes){const start=end;end+=c.change;bars.push({name:c.name,range:[start,end],change:c.change,total:false});}bars.push({name:'V28',range:[floor,end],change:end,total:true});
 const delta=end-(model.start||0);const available=program==='MA'&&model.start!==null;
 return <Card index="03 / Compare model impact" title="V24 → V28: where does the score change?" description="How disease families contribute to the projected score change." tools={<label className={s.selectLabel}>Disease family<select aria-label="Model comparison disease family" value={family} onChange={e=>setFamily(e.target.value)}><option value="">All families</option>{model.changes.map(c=><option key={c.name}>{c.name}</option>)}</select></label>}>
  {available?<><div className={s.miniStats}><div><span>Estimated score change</span><strong>{delta>=0?'+':''}{delta.toFixed(3)}</strong></div><div><span>Estimated annual payment difference</span><strong>{delta>=0?'+':''}{money(delta*model.members*model.benchmark*model.months)}</strong></div></div>
   <Chart label="Projected V24 to V28 risk score waterfall" height={250}><ComposedChart data={bars} margin={{left:-10,right:12,top:24,bottom:12}}><CartesianGrid vertical={false} stroke="var(--line)"/><XAxis {...axis} dataKey="name" interval={0} tick={{fontSize:9,fill:'var(--regent)'}}/><YAxis {...axis} tickFormatter={v=>Number(v).toFixed(2)} domain={[floor,(model.start||0)+.1]} allowDataOverflow width={45}/><Tooltip contentStyle={tip} formatter={(_v,_n,p)=>[`${p.payload.total?'':p.payload.change>=0?'+':''}${p.payload.change.toFixed(4)}`,p.payload.total?'Projected RAF':'Change']}/><Bar dataKey="range" maxBarSize={49} isAnimationActive={false} radius={[3,3,0,0]}>{bars.map((b,i)=><Cell key={b.name} fill={b.total?blue:b.change>0?teal:amber}/>)}<LabelList dataKey="change" position="top" formatter={v=>Number(v).toFixed(3)} fontSize={11} fill="var(--comment)"/></Bar></ComposedChart></Chart><Legend items={[["Projected score (zoomed axis)",blue],["Increase",teal],["Decrease",amber]]}/>
  </>:<div className={s.noData}>{program!=='MA'?'Select a Medicare Advantage model above to compare V24 and V28.':'No scored members match these filters.'}</div>}<footer className={s.footnote}>{program!=='MA'?'V24 / V28 applies to Medicare Advantage. Select an MA model above to explore this comparison. ':''}Modeled score changes; separate from a full CMS model calculation. {family?'Only this family changes; all other contributions stay fixed. ':''}Payment estimate assumes $1,000 per RAF point per month over 12 months; it is not the financial forecast. <a href="https://www.cms.gov/medicare/payment/medicare-advantage-rates-statistics/risk-adjustment" target="_blank" rel="noreferrer">CMS model reference ↗</a></footer>
 </Card>;
}

function ProviderOutcomes({data,program}:{data:LandingAnalytics;program:string}) {
 const [specialty,setSpecialty]=useState('');const [provider,setProvider]=useState('');
 const options=data.providers.filter(p=>!p.suppressed&&(!specialty||p.specialty===specialty));
 const selected=options.filter(p=>!provider||p.id===provider);
 const series=data.recapture.months.map(month=>{const rows=selected.flatMap(p=>p.series||[]).filter(r=>r.month===month);const total=rows.reduce((s,r)=>({rules:s.rules+r.rules,closed:s.closed+r.closed,added:s.added+r.added}),{rules:0,closed:0,added:0});return {month,...total,rate:total.rules?total.closed/total.rules:0};});
 const totals=series.reduce((s,r)=>({rules:s.rules+r.rules,closed:s.closed+r.closed,added:s.added+r.added}),{rules:0,closed:0,added:0});
 const hcc=program==='MA'?'HCCs':'conditions';
 return <Card index="04 / Compare provider outcomes" title="Are suspects becoming confirmed conditions?" description="Additional conditions confirmed, suspect rules closed and the share of rules closed.">
  <div className={s.filters}><label>Specialty<select aria-label="Provider specialty" value={specialty} onChange={e=>{setSpecialty(e.target.value);setProvider('');}}><option value="">All specialties</option>{[...new Set(data.providers.map(p=>p.specialty))].map(v=><option key={v}>{v}</option>)}</select></label><label>Provider<select aria-label="Outcome provider" value={options.some(p=>p.id===provider)?provider:''} onChange={e=>setProvider(e.target.value)}><option value="">All providers</option>{options.map(p=><option key={p.id} value={p.id}>{p.name} · {p.practice}</option>)}</select></label></div>
  <div className={s.outcomeStats}><div><strong>{count(totals.added)}</strong><span>Additional {hcc} confirmed</span></div><div><strong>{count(totals.closed)}</strong><span>Suspect rules closed</span></div><div><strong>{percent(totals.rules?totals.closed/totals.rules:0)}</strong><span>Rules closed / identified</span></div></div>
  {selected.length?<Chart height={210} label="Provider outcomes: confirmed conditions and closed rules by month, with closure rate"><ComposedChart data={series} margin={{left:-15,right:-10,top:10,bottom:0}}><CartesianGrid vertical={false} stroke="var(--line)"/><XAxis {...axis} dataKey="month"/><YAxis {...axis} yAxisId="count" width={46}/><YAxis {...axis} yAxisId="rate" orientation="right" domain={[0,1]} tickFormatter={percent} width={43}/><Tooltip contentStyle={tip} formatter={(v,n)=>n==='Closure rate'?percent(Number(v)):count(Number(v))}/><Bar yAxisId="count" dataKey="closed" name="Rules closed" fill="#c3d1e9" radius={[3,3,0,0]} maxBarSize={16} isAnimationActive={false}/><Bar yAxisId="count" dataKey="added" name={`Additional ${hcc}`} fill={blue} radius={[3,3,0,0]} maxBarSize={16} isAnimationActive={false}/><Line yAxisId="rate" dataKey="rate" name="Closure rate" stroke={teal} strokeWidth={2.5} dot={{r:3,fill:teal,stroke:'white'}} isAnimationActive={false}/></ComposedChart></Chart>:<NoData/>}
  <Legend items={[["Rules closed",'#c3d1e9'],[`Additional ${hcc}`,blue],["Closure rate",teal]]}/><footer className={s.footnote}>Historical outcomes, separate from the open suspect list. Closed rules include supported and unsupported findings; additions count distinct member–condition pairs. Rates use rules identified in the same month. No operational activity is measured.</footer>
 </Card>;
}

function SocialNeeds({data,report,update,go,frozen}:{data:LandingAnalytics;report:AnalysisReport;update:(values:Record<string,string>)=>void;go:Nav;frozen:boolean}) {
 const keys=[['age_band','Age','All ages'],['gender','Gender','All genders'],['zip','ZIP code','All ZIP codes'],['race','Race','All races'],['social_need','Social need / Z-code','All social needs']] as const;
 type County=LandingAnalytics['social'][number] & {score:number;share:number;members:number;needs:number};
 const [selected,setSelected]=useState('');
 const [rank,setRank]=useState<'share'|'score'|'members'>('share');
 const points=data.social.filter((p):p is County=>!p.suppressed&&[p.score,p.share,p.members,p.needs].every(v=>typeof v==='number'&&Number.isFinite(v))&&(p.members??0)>0);
 const ranked=[...points].sort((a,b)=>b[rank]-a[rank]||a.name.localeCompare(b.name));
 const picked=points.find(p=>p.id===selected)||[...points].sort((a,b)=>b.share-a.share||b.score-a.score)[0];
 const scoreLabel=report.config.program==='MA'?'Average RAF':'Average risk score';
 const basisLabel={captured_baseline:'Baseline',potential:'Potential',submitted:'Submitted',accepted:'Accepted'}[report.context.basis];
 const activeFilters=keys.filter(([key])=>report.context[key]);
 const reset=()=>{setSelected('');update(Object.fromEntries(keys.map(([key])=>[key,''])));};
 const median=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);const middle=Math.floor(sorted.length/2);return sorted.length?(sorted[middle]+sorted[Math.max(0,Math.ceil(sorted.length/2)-1)])/2:0;};
 const scoreMid=median(points.map(p=>p.score));const shareMid=median(points.map(p=>p.share));
 const canCompare=points.length>1&&new Set(points.map(p=>p.share)).size>1;
 const minScore=points.length?Math.min(...points.map(p=>p.score)):0;
 const maxScore=points.length?Math.max(...points.map(p=>p.score)):1;
 const padding=Math.max(maxScore-minScore,.12)*.22;
 const scoreDomain:[number,number]=[Math.max(0,Math.floor((minScore-padding)*100)/100),Math.ceil((maxScore+padding)*100)/100];
 const withheld=data.social.filter(p=>p.suppressed).length;
 const unavailable=data.social.length-points.length-withheld;
 const needFilter=report.context.social_need;
 return <Card wide index="05 / Understand social needs" title="Where do health risks and social needs overlap?" description="Compare county risk scores and recorded social needs. Select a county to inspect its scores and member counts.">
  <div className={s.socialFilterBar}>
   <div className={s.socialFilters}>{keys.map(([key,label,all])=><label key={key}>{label}<select disabled={frozen} aria-label={`Social needs ${label}`} value={report.context[key]||''} onChange={e=>{setSelected('');update({[key]:e.target.value});}}><option value="">{all}</option>{data.social_options[key]?.map(v=><option key={v} value={v}>{key==='social_need'?(needs[v]||v):v}</option>)}</select></label>)}</div>
   <div className={s.socialFilterNote}><span>{frozen?'Viewing saved report filters.':'These filters apply to the whole dashboard.'}</span>{activeFilters.length>0&&!frozen&&<button className={s.textButton} onClick={reset}>Clear social filters ({activeFilters.length})</button>}</div>
  </div>
  {needFilter&&points.length>0&&<p className={s.socialNotice}>{needFilter==='none'?'Only members with no recorded social need are included. Their recorded social-needs share is 0%.':`Only members with ${(needs[needFilter]||needFilter).split(' · ')[0].toLowerCase()} are included. The social-needs share is therefore 100% in each county shown.`}</p>}
  {points.length?<div className={s.socialBody}>
   <div className={s.socialPlot}>
    <div className={s.socialChartTitle}><h3>County risk & social needs</h3><span>{basisLabel} · {points.length} {points.length===1?'county':'counties'} shown</span></div>
    <div className={s.socialLegend}><span><i className={s.countyDot}/>County · size shows members</span><span><i className={s.selectedDot}/>Selected county</span>{canCompare&&<span><i className={s.overlapSwatch}/>Above both county midpoints</span>}</div>
    <div className={s.socialAxisTitle}>Members with a recorded social need</div>
    <div className={s.socialChart} role="group" aria-label="Florida counties: risk scores and social needs. Select a circle or use the county comparison list.">
     <ResponsiveContainer width="100%" height="100%" initialDimension={{width:850,height:340}}>
      <ScatterChart margin={{left:0,right:32,top:30,bottom:30}}>
       <CartesianGrid stroke="var(--line)" strokeDasharray="3 4"/>
       <XAxis {...axis} tick={{fontSize:13,fill:'var(--comment)'}} type="number" dataKey="score" domain={scoreDomain} tickCount={6} tickFormatter={v=>Number(v).toFixed(2)} name={scoreLabel} label={{value:scoreLabel,position:'bottom',fontSize:13,fill:'var(--comment)',offset:8}}/>
       <YAxis {...axis} tick={{fontSize:13,fill:'var(--comment)'}} type="number" dataKey="share" domain={[0,1]} ticks={[0,.25,.5,.75,1]} tickFormatter={percent} width={50} name="With social needs"/>
       <ZAxis dataKey="members" range={[180,1050]} name="Members"/>
       {canCompare&&<><ReferenceArea x1={scoreMid} x2={scoreDomain[1]} y1={shareMid} y2={1} fill="var(--selected)" fillOpacity={1}/><ReferenceLine x={scoreMid} stroke="var(--regent)" strokeDasharray="5 5"/><ReferenceLine y={shareMid} stroke="var(--regent)" strokeDasharray="5 5"/></>}
       <Tooltip cursor={false} isAnimationActive={false} content={({active,payload})=>{const p=payload?.[0]?.payload as County|undefined;return active&&p?<div className={s.socialTooltip}><strong>{p.name}</strong><dl><div><dt>{scoreLabel}</dt><dd>{p.score.toFixed(3)}</dd></div><div><dt>With social needs</dt><dd>{percent(p.share)}</dd></div><div><dt>Members with needs</dt><dd>{count(p.needs)} / {count(p.members)}</dd></div></dl><small>Select to compare this county</small></div>:null;}}/>
       <Scatter data={[...points.filter(p=>p.id!==picked.id),picked]} isAnimationActive={false} shape={(props:unknown)=>{
        const {cx,cy,size,payload:p}=props as {cx?:number;cy?:number;size?:number;payload?:County};
        if(cx===undefined||cy===undefined||!p)return <g/>;
        const chosen=p.id===picked.id;const radius=Math.sqrt((size||180)/Math.PI);
        return <g role="button" tabIndex={0} aria-label={`Select ${p.name}: ${p.score.toFixed(3)} ${scoreLabel}, ${percent(p.share)} with social needs, ${count(p.members)} members`} aria-pressed={chosen} className={s.countyPoint} onClick={()=>setSelected(p.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(p.id);}}}>
         {chosen&&<circle cx={cx} cy={cy} r={radius+5} fill="white" stroke="var(--yellow)" strokeWidth={3}/>}
         <circle className={s.countyPointFill} cx={cx} cy={cy} r={radius} fill="var(--sapphire)" stroke="white" strokeWidth={2}/>
         {chosen&&<text x={cx} y={p.share>.9?cy+radius+25:cy-radius-13} textAnchor="middle" fill="var(--charcoal)" stroke="white" strokeWidth={4} paintOrder="stroke" fontSize={13} fontWeight={700} pointerEvents="none">{p.name}</text>}
        </g>;
       }}/>
      </ScatterChart>
     </ResponsiveContainer>
    </div>
    <p className={s.socialGuide}>{canCompare?<>Dashed lines mark the middle county on each measure: <strong>{scoreMid.toFixed(3)} {report.config.program==='MA'?'RAF':'risk score'}</strong> and <strong>{percent(shareMid)} with social needs</strong>. The shaded area is above both; these are comparison guides, not clinical thresholds.</>:points.length===1?'One county matches this selection. Broaden the filters to compare counties.':'All counties shown have the same social-needs share. Compare their risk scores and member counts.'}</p>
   </div>
   <aside className={s.countyList} aria-label="County comparison">
    <div className={s.countySelection} aria-live="polite" aria-atomic="true"><span className={s.kicker}>Selected county</span><h3>{picked.name}</h3>
     <div className={s.countyMetrics}><div><strong>{picked.score.toFixed(3)}</strong><span>{scoreLabel}</span></div><div><strong>{percent(picked.share)}</strong><span>With social needs</span></div></div>
     <p><b>{count(picked.needs)}</b> of <b>{count(picked.members)}</b> members have a recorded social need.</p>
     <button className={s.textButton} onClick={()=>go('/analytics',{view:'geography',counties:JSON.stringify([picked.id])})}>Explore {picked.name} <ArrowUpRight size={14}/></button>
    </div>
    <label className={s.countyRank}>Compare counties<select aria-label="Rank counties by" value={rank} onChange={e=>setRank(e.target.value as typeof rank)}><option value="share">Social-needs share</option><option value="score">{scoreLabel}</option><option value="members">Member count</option></select></label>
    <div className={s.countyRows} role="group" aria-label="Select a county">{ranked.map(p=><button key={p.id} aria-pressed={picked.id===p.id} onClick={()=>setSelected(p.id)}><span>{p.name}<small>{rank==='members'?`${percent(p.share)} with social needs`:`${count(p.members)} members`}</small></span><strong>{rank==='score'?p.score.toFixed(3):rank==='members'?count(p.members):percent(p.share)}</strong></button>)}</div>
   </aside>
  </div>:<div className={s.socialEmpty} role="status"><Layers3 size={26}/><h3>{withheld?'County results are too small to display':unavailable?'No scored county results':'No counties match these filters'}</h3><p>{withheld?'County values are withheld to protect small groups. Broaden the filters to compare larger populations.':unavailable?'Risk scores or social-needs measures are unavailable for this selection. Try a broader population.':'Try another age group, ZIP code or social need, or clear the filters below.'}</p>{activeFilters.length>0&&!frozen&&<button className={s.socialReset} onClick={reset}>Clear social filters</button>}</div>}
  <footer className={s.footnote}><Layers3 size={13}/><span>{withheld>0&&`${withheld} ${withheld===1?'county is':'counties are'} withheld to protect small groups. `}{unavailable>0&&`${unavailable} ${unavailable===1?'county has':'counties have'} incomplete measures and cannot be plotted. `}Groups under 20 members and a related group are protected. Social-needs information is separate from medical-record evidence; an unrecorded need does not mean no need exists.</span></footer>
 </Card>;
}
