"use client";

import { Fragment, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Layers3 } from 'lucide-react';
import { Bar, CartesianGrid, Cell, ComposedChart, LabelList, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import type { AnalysisReport, LandingAnalytics } from '@/lib/analytics-types';
import { OPPORTUNITY_LEVELS, OPPORTUNITY_QUADRANTS, opportunityLevel, opportunityLevelLabel, type OpportunityLevel, type OpportunityQuadrant } from '@/lib/opportunity-matrix';
import s from './landing-analytics.module.css';
import { ArrowAction, ChartInfo, ConditionSelect } from './analytics-controls';
import { cumulativeOutcomes } from '@/lib/suspect-outcomes';
import { scoreBasisLabel } from '@/lib/analytics-labels';
import { CHART_LIMITS } from '@/lib/chart-limits';

const blue='var(--sapphire)', teal='var(--green)', amber='var(--yellow)';
const opportunityColors:Record<OpportunityQuadrant,string>={
 high_value:blue,
 priority:'color-mix(in srgb, var(--green) 78%, var(--charcoal))',
 lower_priority:'color-mix(in srgb, var(--yellow) 65%, var(--charcoal))',
 likely_to_close:'var(--royal)',
};
const axis={axisLine:false,tickLine:false,tick:{fontSize:13,fill:'var(--regent)'}};
const tip={border:'1px solid var(--line)',borderRadius:4,fontSize:13,boxShadow:'0 8px 25px #20334c12'};
const count=(value:number)=>value.toLocaleString('en-US');
const percent=(value:number)=>`${Math.round(value*100)}%`;
const needs:Record<string,string>={none:'No recorded social need',food:'Food insecurity · Z59.41',transport:'Transportation insecurity · Z59.82',housing:'Housing instability · Z59.811'};
const short=(name:string)=>name.replace('Diabetes with complications','Diabetes').replace('Cardiovascular conditions','Cardiovascular').replace('Chronic kidney disease','Kidney disease').replace('Persistent status','Ongoing health status');
type Nav=(target:string,extra?:Record<string,string>)=>void;
function Card({title,tools,children,wide=false,infoContext}:{title:string;tools?:ReactNode;children:ReactNode;wide?:boolean;infoContext?:string}) {
 return <section className={`ct-card ${s.card} ${wide?s.wide:''}`}><header className={s.header}><h2>{title}</h2><div className={s.tools}>{tools}<ChartInfo title={title} context={infoContext}/></div></header>{children}</section>;
}
function Legend({items}:{items:[string,string][]}) {return <div className={s.legend}>{items.map(([name,color])=><span key={name}><i style={{background:color}}/>{name}</span>)}</div>;}
function Chart({label,children,height=290,interactive=false}:{label:string;children:ReactNode;height?:number;interactive?:boolean}) {return <div className={s.chart} role={interactive?"group":"img"} aria-label={label} style={{height}}><ResponsiveContainer width="100%" height="100%" initialDimension={{width:600,height}}>{children as React.ReactElement}</ResponsiveContainer></div>;}
function NoData(){return <div className={s.noData}>No groups to compare with these filters. Broaden the selection to see more results.</div>;}

export function LandingAnalyticsPanels({report,go,update,frozen=false}:{report:AnalysisReport;go:Nav;update:(values:Record<string,string>)=>void;frozen?:boolean}) {
 const data=report.landing;
 if(!data)return <div className={s.notice}>This saved report predates the new dashboard. <ArrowAction label="Open current dashboard" onClick={()=>go('/overview')}/></div>;
 return <div className={s.layout}>
  <Opportunity key={report.filter_hash} data={data} go={go} scoreName={report.config.program==='MA'?'RAF':'score'} initialQuadrant={report.context.quadrant} initialDomains={report.context.conditions?.length?report.context.conditions:report.context.condition?[report.context.condition]:[]} initialClosure={report.context.closure}/>
  <Recapture data={data} go={go}/>
  <ContinuingMembers data={data} program={report.config.program}/>
  <ProviderOutcomes data={data} program={report.config.program}/>
  <SocialNeeds data={data} report={report} update={update} go={go} frozen={frozen}/>
 </div>;
}

function Opportunity({data,go,scoreName,initialQuadrant,initialDomains,initialClosure}:{data:LandingAnalytics;go:Nav;scoreName:string;initialQuadrant?:string;initialDomains?:string[];initialClosure?:string}) {
 const [domains,setDomains]=useState<string[]>(initialDomains||[]);
 const [selected,setSelected]=useState('');
 const [quadrant,setQuadrant]=useState<OpportunityQuadrant>(OPPORTUNITY_QUADRANTS.find(q=>q.id===initialQuadrant)?.id||'priority');
 const [level,setLevel]=useState<OpportunityLevel|''>(OPPORTUNITY_LEVELS.find(l=>l===initialClosure)||(initialClosure&&Number.isFinite(Number(initialClosure))?opportunityLevel(Number(initialClosure)):''));
 const points=data.matrix.filter(p=>!p.suppressed&&(!domains.length||domains.includes(p.name))&&(!level||opportunityLevel(p.closure||0)===level));
 const current=OPPORTUNITY_QUADRANTS.find(q=>q.id===quadrant)!;
 const groups=points.filter(p=>p.quadrant===quadrant);
 const picked=groups.find(p=>p.id===selected);
 const summaries=level?data.closure_bands?.filter(q=>q.quadrant===quadrant&&q.band===level&&(domains.length?domains.includes(q.name):q.name==='')):(domains.length?data.quadrant_conditions:data.quadrants)?.filter(q=>q.quadrant===quadrant&&(!domains.length||domains.includes(q.name)));
 // Each case has one condition domain, so condition counts sum without duplication.
 // If any contributing aggregate is protected, do not expose a partial total.
 const suppressed=!picked&&summaries?.some(q=>q.suppressed);
 const cases=picked?picked.cases:summaries?.reduce((total,q)=>total+(q.cases||0),0)??null;
 const chooseQuadrant=(id:OpportunityQuadrant)=>{setQuadrant(id);setSelected('');setLevel('');};
 const chooseLevel=(value:OpportunityLevel|'')=>{
  setLevel(value);setSelected('');
  if(value)setQuadrant(current.y1>=.14?(value==='high'?'priority':'high_value'):(value==='high'?'likely_to_close':'lower_priority'));
 };
 const open=()=>go('/suspects',{quadrant,closure:picked?String(picked.closure):level,conditions:JSON.stringify(picked?[picked.name]:domains),category:'capture',disposition:'open'});
 return <Card wide title="Suspect Prioritization Matrix" tools={<ConditionSelect options={[...new Set(data.matrix.map(p=>p.name))]} value={domains} onChange={values=>{setDomains(values);setSelected('');}}/>}>
  <div className={s.opportunity}>
   <div>
    <Chart interactive height={330} label="Suspect opportunity matrix: select one of four value and closure quadrants">
     <ScatterChart margin={{top:8,right:25,bottom:28,left:2}}>
      <CartesianGrid stroke="var(--line)" strokeDasharray="3 4"/>
      <XAxis {...axis} type="number" dataKey="closure" domain={[0,1]} ticks={[.15,.475,.825]} tickFormatter={v=>opportunityLevelLabel(opportunityLevel(Number(v)))} name="Chance of closure" label={{value:'Chance of closure',position:'bottom',fontSize:13,fill:'var(--regent)',offset:8}}/>
      <YAxis {...axis} type="number" dataKey="gain" domain={[0,.30]} ticks={[0,.07,.14,.22,.3]} tickFormatter={v=>Number(v).toFixed(2)} width={40} name={`Expected ${scoreName} gain`}/>
      <ZAxis dataKey="members" range={[75,620]} name="Members"/>
      {OPPORTUNITY_QUADRANTS.map(q=><ReferenceArea key={q.id} x1={q.x1} x2={q.x2} y1={q.y1} y2={q.y2} shape={({x=0,y=0,width=0,height=0}:{x?:number;y?:number;width?:number;height?:number})=><g role="button" tabIndex={0} aria-label={`Select quadrant: ${q.label}`} aria-pressed={quadrant===q.id} className={s.quadrant} onClick={()=>chooseQuadrant(q.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();chooseQuadrant(q.id);}}}>
       <rect className={s.quadrantFill} x={x+1} y={y+1} width={Math.max(0,width-2)} height={Math.max(0,height-2)} fill={quadrant===q.id?'var(--selected)':'var(--rowalt)'} fillOpacity={quadrant===q.id?1:.4} stroke="none" strokeWidth={0}/>
      </g>}/>)}
      <ReferenceLine x={.65} stroke="#bac6d7" strokeDasharray="4 5" pointerEvents="none"/>
      <ReferenceLine y={.14} stroke="#bac6d7" strokeDasharray="4 5" pointerEvents="none"/>
      <Tooltip contentStyle={tip} cursor={false} labelFormatter={(_,p)=>p?.[0]?.payload?.name||'Condition group'} formatter={(v,n)=>n==='Chance of closure'?opportunityLevelLabel(opportunityLevel(Number(v))):n==='Members'?count(Number(v)):Number(v).toFixed(3)}/>
      <Scatter data={points} isAnimationActive={false} onClick={p=>{setQuadrant(p.quadrant);setSelected(p.id);}}>{points.map(p=><Cell key={p.id} fill={opportunityColors[p.quadrant]} fillOpacity={selected===p.id ? 1 : p.quadrant===quadrant ? .95 : .9} stroke={selected===p.id?'var(--charcoal)':'white'} strokeWidth={selected===p.id?2.5:1.5} cursor="pointer"/>)}</Scatter>
     </ScatterChart>
    </Chart>
    <div className={s.groupPicker}><label>Inspect a group<select aria-label="Inspect opportunity group" value={level} onChange={e=>chooseLevel(e.target.value as OpportunityLevel|'')}><option value="">All levels</option>{OPPORTUNITY_LEVELS.map(value=><option key={value} value={value}>{opportunityLevelLabel(value)}</option>)}</select></label>{(quadrant!=='priority'||domains.length>0||selected||level)&&<button className={s.textButton} onClick={()=>{setDomains([]);chooseQuadrant('priority');}}>Reset selection</button>}</div>
   </div>
   <aside className={s.opportunityAside} aria-label="Selected suspects" aria-live="polite" aria-atomic="true">
    <h3>{current.title}</h3>
    {(picked||domains.length>0)&&<div className={s.opportunitySelection}>{picked?short(picked.name):domains.map(short).join(' · ')}</div>}
    <div className={s.suspectCount}><strong>{suppressed||cases==null?'—':count(cases)}</strong><span>Suspects</span></div>
    {picked&&<p>{opportunityLevelLabel(opportunityLevel(picked.closure||0))} chance of closure · {(picked.gain||0).toFixed(3)} expected {scoreName} gain per suspect.</p>}
    {suppressed&&<p>Counts are hidden to protect small groups.</p>}
    <ArrowAction className={s.opportunityAction} primary label="View suspects" onClick={open} disabled={suppressed||!cases}/>
   </aside>
  </div>
 </Card>;
}

function Recapture({data,go}:{data:LandingAnalytics;go:Nav}) {
 const [dimension,setDimension]=useState('month');const [page,setPage]=useState(0);const [cell,setCell]=useState('');
 const r=data.recapture;const cols=dimension==='practice'?r.practices.map(p=>({key:p.id,name:p.name})):r.months.map((name,i)=>({key:String(i+1),name})).reverse();
 const pages=Math.max(1,Math.ceil(cols.length/CHART_LIMITS.compact));const current=Math.min(page,pages-1);const shown=cols.slice(current*CHART_LIMITS.compact,(current+1)*CHART_LIMITS.compact);
 const conditions=[...new Set(r.heat.map(h=>h.condition))];const chosen=r.heat.find(h=>`${h.condition}|${h.dimension}|${h.key}`===cell&&!h.suppressed);
 return <Card wide title="HCC Recapture Status" tools={<div className={s.segment}>{['practice','month'].map(d=><button key={d} aria-pressed={dimension===d} onClick={()=>{setDimension(d);setPage(0);setCell('');}}>{d==='practice'?'By practice':'By month'}</button>)}</div>}>
  <div className={s.recapture}><div className={s.funnel}>
   <div className={s.funnelTotal}><span>Prior-year conditions</span><strong>{count(r.prior)}</strong></div><div className={s.funnelConnector}/>
   <div className={s.funnelSplit}><div><strong>{count(r.confirmed)}</strong><span>Confirmed again</span></div><div><strong>{count(r.missing)}</strong><span>Still missing</span></div></div>
   <div className={s.completion}><div><i style={{width:`${r.prior?r.confirmed/r.prior*100:0}%`}}/></div><strong>{r.prior?percent(r.confirmed/r.prior):'0%'} confirmed</strong></div>
   {chosen&&<p><b>{short(chosen.condition)}</b><br/>{chosen.name}<br/>{count(chosen.confirmed||0)} of {count(chosen.members||0)} confirmed.</p>}
   {chosen&&<ArrowAction label={`Explore ${chosen.condition} in ${chosen.name}`} onClick={()=>go('/analytics',{view:'risk',condition:chosen.condition,practices:dimension==='practice'?JSON.stringify([chosen.key]):'',run_month:dimension==='month'?chosen.key.padStart(2,'0'):''})}/>}
  </div><div className={s.heatSection}>
   <div className={s.heatLegend}><span>Share confirmed again</span><div><span>Lower</span><i/><span>Higher</span></div><div><button aria-label="Previous heatmap columns" disabled={current===0} onClick={()=>setPage(current-1)}><ChevronLeft size={14}/></button><span>{current+1} / {pages}</span><button aria-label="Next heatmap columns" disabled={current===pages-1} onClick={()=>setPage(current+1)}><ChevronRight size={14}/></button></div></div>
   {conditions.length?<div className={s.heat} style={{gridTemplateColumns:`minmax(116px,1.3fr) repeat(${Math.max(1,shown.length)},minmax(62px,1fr))`}}><span/>{shown.map(c=><strong key={c.key} className={dimension==='month'&&c.key===String(r.months.length)?s.latestMonth:undefined} title={c.name}>{c.name}</strong>)}{conditions.map(condition=><Fragment key={condition}><span title={condition}>{short(condition)}</span>{shown.map(c=>{const h=r.heat.find(h=>h.condition===condition&&h.dimension===dimension&&h.key===c.key);const id=`${condition}|${dimension}|${c.key}`;return <button key={c.key} className={dimension==='month'&&c.key===String(r.months.length)?s.latestCell:undefined} aria-label={`${short(condition)}, ${c.name}: ${!h?'no conditions':h.suppressed?'not shown to protect small groups':`${percent(h.rate||0)} confirmed`}`} title={!h?'No conditions':h.suppressed?'Not shown to protect small groups':undefined} disabled={!h||h.suppressed} aria-pressed={cell===id} style={{background:!h||h.suppressed?'#f4f6f8':`rgba(0,76,141,${.06+(h.rate||0)*.62})`,color:(h?.rate||0)>.66?'#fff':'var(--sapphire)'}} onClick={()=>setCell(id)}>{!h||h.suppressed?'—':percent(h.rate||0)}</button>;})}</Fragment>)}</div>:<NoData/>}
  </div></div>
 </Card>;
}

function ContinuingMembers({data,program}:{data:LandingAnalytics;program:string}) {
 const comparison=data.continuing_members;
 const scoreName=program==='MA'?'RAF':'risk score';
 if(!comparison||comparison.start===null||comparison.end===null||comparison.delta===null)return <Card title="Continuing Member Risk Score Change"><div className={s.noData}>No continuing members with scores in both years match these filters.</div></Card>;
 const changes=comparison.changes.filter((c):c is {name:string;change:number}=>c.change!==null);
 let running=comparison.start;
 const steps=changes.map(c=>{const from=running;running+=c.change;return {...c,from,to:running};});
 const levels=[comparison.start,comparison.end,...steps.flatMap(c=>[c.from,c.to])];
 const floor=Math.max(0,Math.floor((Math.min(...levels)-.04)*20)/20);
 const ceiling=Math.ceil((Math.max(...levels)+.04)*20)/20;
 const signed=(value:number)=>`${value>=0?'+':''}${value.toFixed(3)}`;
 const bars=[
  {name:String(comparison.start_year),range:[floor,comparison.start],value:comparison.start,label:comparison.start.toFixed(3),total:true},
  ...steps.map(c=>({name:c.name,range:[Math.min(c.from,c.to),Math.max(c.from,c.to)],value:c.change,label:signed(c.change),total:false})),
  {name:String(comparison.end_year),range:[floor,comparison.end],value:comparison.end,label:comparison.end.toFixed(3),total:true},
 ];
 return <Card title="Continuing Member Risk Score Change">
  <div className={s.miniStats}>
   <div><span>Continuing members</span><strong>{count(comparison.members)}</strong></div>
   <div><span>{program==='MA'?'RAF':'Score'} change</span><strong>{signed(comparison.delta)}</strong></div>
   <div><span>Change (%)</span><strong>{comparison.percent_change!=null?`${comparison.percent_change>=0?'+':''}${(comparison.percent_change*100).toFixed(1)}%`:'—'}</strong></div>
  </div>
  <Chart label={`2025 to 2026 ${scoreName} change for ${count(comparison.members)} continuing members`} height={280}>
   <ComposedChart data={bars} margin={{left:-10,right:12,top:24,bottom:12}}>
    <CartesianGrid vertical={false} stroke="var(--line)"/>
    <XAxis {...axis} dataKey="name" interval={0} height={46} tick={({x=0,y=0,payload})=>{const label=String(payload?.value||'');const lines=label==='Added conditions'?['Added','conditions']:label==='Not yet confirmed'?['Not yet','confirmed']:label==='Coding updates'?['Coding','updates']:[label];return <text x={x} y={Number(y)+14} textAnchor="middle" fill="var(--comment)" fontSize={12}>{lines.map((line,i)=><tspan key={i} x={x} dy={i?15:0}>{line}</tspan>)}</text>;}}/>
    <YAxis {...axis} tickFormatter={v=>Number(v).toFixed(2)} domain={[floor,ceiling]} allowDataOverflow width={45}/>
    <Tooltip contentStyle={tip} formatter={(_v,_n,p)=>[p.payload.total?Number(p.payload.value).toFixed(3):signed(Number(p.payload.value)),p.payload.total?`Average ${scoreName}`:`${scoreName} change`]}/>
    <Bar dataKey="range" maxBarSize={56} isAnimationActive={false} radius={[3,3,0,0]}>
     {bars.map(b=><Cell key={b.name} fill={b.total?blue:b.value>=0?teal:amber}/>)}
     <LabelList dataKey="label" position="top" fontSize={12} fill="var(--comment)"/>
    </Bar>
   </ComposedChart>
  </Chart>
  <Legend items={[[`Baseline ${scoreName}`,blue],["Increase",teal],["Decrease",amber]]}/>
 </Card>;
}

function ProviderOutcomes({data,program}:{data:LandingAnalytics;program:string}) {
 const [specialty,setSpecialty]=useState('');const [provider,setProvider]=useState('');
 const options=data.providers.filter(p=>!p.suppressed&&(!specialty||p.specialty===specialty));
 const selected=options.filter(p=>!provider||p.id===provider);
 const series=cumulativeOutcomes(selected,data.recapture.months);
 const totals=series.at(-1)||{identified:0,closed:0,open:0,added:0};
 const hcc=program==='MA'?'HCC':'Condition';
 return <Card title="Cumulative Suspect Outcomes">
  <div className={s.filters}><label>Specialty<select aria-label="Provider specialty" value={specialty} onChange={e=>{setSpecialty(e.target.value);setProvider('');}}><option value="">All specialties</option>{[...new Set(data.providers.map(p=>p.specialty))].map(v=><option key={v}>{v}</option>)}</select></label><label>Provider<select aria-label="Outcome provider" value={options.some(p=>p.id===provider)?provider:''} onChange={e=>setProvider(e.target.value)}><option value="">All providers</option>{options.map(p=><option key={p.id} value={p.id}>{p.name} · {p.practice}</option>)}</select></label></div>
  <div className={s.outcomeStats}><div><strong>{count(totals.identified)}</strong><span>Total Identified</span></div><div><strong>{count(totals.closed)}</strong><span>Total Closed</span></div><div title="Included in Total Closed. Each confirmed condition is counted once per member."><strong>{count(totals.added)}</strong><span>Closed — {hcc} Confirmed</span></div><div><strong>{count(totals.open)}</strong><span>Still Open</span></div></div>
  {selected.length?<Chart height={230} label="Cumulative total identified and total closed suspects through each month"><ComposedChart data={series} margin={{left:0,right:15,top:10,bottom:0}}><CartesianGrid vertical={false} stroke="var(--line)"/><XAxis {...axis} dataKey="month"/><YAxis {...axis} width={48} allowDecimals={false}/><Tooltip contentStyle={tip} labelFormatter={month=>`Cumulative Through ${month}`} formatter={v=>count(Number(v))}/><Line dataKey="identified" name="Total Identified" stroke={blue} strokeWidth={2.5} dot={{r:3}} type="linear" isAnimationActive={false}/><Line dataKey="closed" name="Total Closed" stroke={teal} strokeWidth={2.5} dot={{r:3}} type="linear" isAnimationActive={false}/></ComposedChart></Chart>:<NoData/>}
  <Legend items={[["Total Identified",blue],["Total Closed",teal]]}/>
 </Card>;
}

function SocialNeeds({data,report,update,go,frozen}:{data:LandingAnalytics;report:AnalysisReport;update:(values:Record<string,string>)=>void;go:Nav;frozen:boolean}) {
 const keys=[['age_band','Age','All ages'],['gender','Gender','All genders'],['county','County','All counties'],['race','Race','All races'],['social_need','Social need / Z-code','All social needs']] as const;
 type County=LandingAnalytics['social'][number] & {score:number;share:number;members:number;needs:number};
 const [selected,setSelected]=useState('');
 const available=data.social.filter((p):p is County=>!p.suppressed&&[p.score,p.share,p.members,p.needs].every(v=>typeof v==='number'&&Number.isFinite(v))&&(p.members??0)>0);
 const points=[...available].sort((a,b)=>b.share-a.share||a.name.localeCompare(b.name)).slice(0,CHART_LIMITS.comparison);
 const picked=points.find(p=>p.id===selected)||points[0];
 const scoreLabel=report.config.program==='MA'?'Average RAF':'Average risk score';
 const basisLabel=scoreBasisLabel(report.context.basis,report.config.program);
 const filterValue=(key:typeof keys[number][0])=>key==='county'?report.context.counties?.[0]||'':report.context[key]||'';
 const activeFilters=keys.filter(([key])=>filterValue(key));
 const reset=()=>{setSelected('');update(Object.fromEntries(keys.map(([key])=>[key==='county'?'counties':key,''])));};
 const median=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);const middle=Math.floor(sorted.length/2);return sorted.length?(sorted[middle]+sorted[Math.max(0,Math.ceil(sorted.length/2)-1)])/2:0;};
 const scoreMid=median(available.map(p=>p.score));const shareMid=median(available.map(p=>p.share));
 const canCompare=points.length>1&&new Set(points.map(p=>p.share)).size>1;
 const minScore=available.length?Math.min(...available.map(p=>p.score)):0;
 const maxScore=available.length?Math.max(...available.map(p=>p.score)):1;
 const padding=Math.max(maxScore-minScore,.12)*.22;
 const scoreDomain:[number,number]=[Math.max(0,Math.floor((minScore-padding)*100)/100),Math.ceil((maxScore+padding)*100)/100];
 const withheld=data.social.filter(p=>p.suppressed).length;
 const unavailable=data.social.length-available.length-withheld;
 const needFilter=report.context.social_need;
 return <Card wide title="SDOH & Population Risk Stratification" infoContext={`County risk & social needs · ${basisLabel}. Showing ${available.length>points.length?'the top ':''}${points.length} ${points.length===1?'county':'counties'} by social-needs share.`}>
  <div className={s.socialFilterBar}>
   <div className={s.socialFilters}>{keys.map(([key,label,all])=><label key={key}>{label}<select disabled={frozen} aria-label={`Social needs ${label}`} value={filterValue(key)} onChange={e=>{setSelected('');update(key==='county'?{counties:e.target.value?JSON.stringify([e.target.value]):'',zip:''}:{[key]:e.target.value});}}><option value="">{all}</option>{(key==='county'?report.options.counties:data.social_options[key])?.map(v=><option key={v} value={v}>{key==='social_need'?(needs[v]||v):v}</option>)}</select></label>)}</div>
   <div className={s.socialFilterNote}><span>{frozen?'Viewing saved report filters.':'These filters apply to the whole dashboard.'}</span>{activeFilters.length>0&&!frozen&&<button className={s.textButton} onClick={reset}>Clear social filters ({activeFilters.length})</button>}</div>
  </div>
  {needFilter&&points.length>0&&<p className={s.socialNotice}>{needFilter==='none'?'Only members with no recorded social need are included. Their recorded social-needs share is 0%.':`Only members with ${(needs[needFilter]||needFilter).split(' · ')[0].toLowerCase()} are included. The social-needs share is therefore 100% in each county shown.`}</p>}
  {points.length?<div className={s.socialBody}>
   <div className={s.socialPlot}>
    <div className={s.socialChart} role="group" aria-label="Florida counties: risk scores and social needs. Select a circle to see county details.">
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

   </div>
   <aside className={s.countyDetails} aria-label="County details">
    <div className={s.countySelection} aria-live="polite" aria-atomic="true"><h3>{picked.name}</h3>
     <div className={s.countyMetrics}><div><strong>{picked.score.toFixed(3)}</strong><span>{scoreLabel}</span></div><div><strong>{percent(picked.share)}</strong><span>With social needs</span></div></div>
     <p><b>{count(picked.needs)}</b> of <b>{count(picked.members)}</b> members have a recorded social need.</p>
     <ArrowAction label={`Explore ${picked.name}`} onClick={()=>go('/analytics',{view:'geography',counties:JSON.stringify([picked.id])})}/>
    </div>
   </aside>
  </div>:<div className={s.socialEmpty} role="status"><Layers3 size={26}/><h3>{withheld?'County results are too small to display':unavailable?'No scored county results':'No counties match these filters'}</h3><p>{withheld?'County values are withheld to protect small groups. Broaden the filters to compare larger populations.':unavailable?'Risk scores or social-needs measures are unavailable for this selection. Try a broader population.':'Try another age group, county or social need, or clear the filters below.'}</p>{activeFilters.length>0&&!frozen&&<button className={s.socialReset} onClick={reset}>Clear social filters</button>}</div>}

 </Card>;
}
