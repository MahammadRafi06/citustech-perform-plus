"use client";

import { Fragment, useState, type ReactNode } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Crosshair, Layers3 } from 'lucide-react';
import { Bar, CartesianGrid, Cell, ComposedChart, LabelList, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import type { AnalysisReport, LandingAnalytics } from '@/lib/analytics-types';
import s from './landing-analytics.module.css';

const blue='#3659ad', teal='#258582', amber='#b78639', purple='#8174a8';
const axis={axisLine:false,tickLine:false,tick:{fontSize:10,fill:'#778398'}};
const tip={border:'1px solid #e1e7ef',borderRadius:7,fontSize:11,boxShadow:'0 8px 25px #20334c12'};
const count=(value:number)=>value.toLocaleString('en-US');
const percent=(value:number)=>`${Math.round(value*100)}%`;
const money=(value:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:1}).format(value);
const needs:Record<string,string>={none:'No recorded social need',food:'Food insecurity · Z59.41',transport:'Transportation insecurity · Z59.82',housing:'Housing instability · Z59.811'};
const short=(name:string)=>name.replace('Diabetes with complications','Diabetes').replace('Cardiovascular conditions','Cardiovascular').replace('Chronic kidney disease','Kidney disease').replace('Persistent status','Ongoing health status');
type Nav=(target:string,extra?:Record<string,string>)=>void;
function Card({index,title,description,tools,children,wide=false}:{index:string;title:string;description:string;tools?:ReactNode;children:ReactNode;wide?:boolean}) {
 return <section className={`${s.card} ${wide?s.wide:''}`}><header className={s.header}><div><span className={s.kicker}>{index}</span><h2>{title}</h2><p>{description}</p></div>{tools}</header>{children}</section>;
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
    <CartesianGrid stroke="#e9edf3" strokeDasharray="3 4"/><XAxis {...axis} type="number" dataKey="closure" domain={[0,1]} ticks={[0,.25,.5,.75,1]} tickFormatter={percent} name="Chance of closure" label={{value:'Chance of closure',position:'bottom',fontSize:10,fill:'#778398',offset:4}}/><YAxis {...axis} type="number" dataKey="gain" domain={[0,.30]} tickFormatter={v=>Number(v).toFixed(2)} width={40} name={`Expected ${scoreName} gain`}/><ZAxis dataKey="members" range={[75,620]} name="Members"/>
    <ReferenceArea x1={.65} x2={1} y1={.14} y2={.3} fill={teal} fillOpacity={.06} onClick={()=>go('/suspects',{closure:'priority',category:'capture',condition:'',disposition:'open'})} style={{cursor:'pointer'}}/>
    <ReferenceLine x={.65} stroke="#bac6d7" strokeDasharray="4 5"/><ReferenceLine y={.14} stroke="#bac6d7" strokeDasharray="4 5"/>
    <Tooltip contentStyle={tip} cursor={{strokeDasharray:'3 3'}} labelFormatter={(_,p)=>p?.[0]?.payload?.name||'Condition group'} formatter={(v,n)=>n==='Chance of closure'?percent(Number(v)):n==='Members'?count(Number(v)):Number(v).toFixed(3)}/>
    <Scatter data={points} isAnimationActive={false} onClick={p=>setSelected(p.id)}>{points.map(p=><Cell key={p.id} fill={(p.closure||0)>=.65&&(p.gain||0)>=.14?teal:blue} fillOpacity={selected===p.id?.toString()?1:.64} stroke={selected===p.id?'#142d58':'white'} strokeWidth={selected===p.id?2.5:1.5} cursor="pointer"/>)}</Scatter>
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
   {conditions.length?<div className={s.heat} style={{gridTemplateColumns:`minmax(116px,1.3fr) repeat(${Math.max(1,shown.length)},minmax(62px,1fr))`}}><span/>{shown.map(c=><strong key={c.key} title={c.name}>{c.name}</strong>)}{conditions.map(condition=><Fragment key={condition}><span title={condition}>{short(condition)}</span>{shown.map(c=>{const h=r.heat.find(h=>h.condition===condition&&h.dimension===dimension&&h.key===c.key);const id=`${condition}|${dimension}|${c.key}`;return <button key={c.key} aria-label={`${short(condition)}, ${c.name}: ${!h?'no conditions':h.suppressed?'not shown to protect small groups':`${percent(h.rate||0)} confirmed`}`} title={!h?'No conditions':h.suppressed?'Not shown to protect small groups':undefined} disabled={!h||h.suppressed} aria-pressed={cell===id} style={{background:!h||h.suppressed?'#f4f6f8':`rgba(37,133,130,${.06+(h.rate||0)*.62})`,color:(h?.rate||0)>.66?'#fff':'#365865'}} onClick={()=>setCell(id)}>{!h||h.suppressed?'—':percent(h.rate||0)}</button>;})}</Fragment>)}</div>:<NoData/>}
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
   <Chart label="Projected V24 to V28 risk score waterfall" height={250}><ComposedChart data={bars} margin={{left:-10,right:12,top:24,bottom:12}}><CartesianGrid vertical={false} stroke="#edf0f5"/><XAxis {...axis} dataKey="name" interval={0} tick={{fontSize:9,fill:'#778398'}}/><YAxis {...axis} tickFormatter={v=>Number(v).toFixed(2)} domain={[floor,(model.start||0)+.1]} allowDataOverflow width={45}/><Tooltip contentStyle={tip} formatter={(_v,_n,p)=>[`${p.payload.total?'':p.payload.change>=0?'+':''}${p.payload.change.toFixed(4)}`,p.payload.total?'Projected RAF':'Change']}/><Bar dataKey="range" maxBarSize={49} isAnimationActive={false} radius={[3,3,0,0]}>{bars.map((b,i)=><Cell key={b.name} fill={b.total?blue:b.change>0?teal:amber}/>)}<LabelList dataKey="change" position="top" formatter={v=>Number(v).toFixed(3)} fontSize={10} fill="#4b5d74"/></Bar></ComposedChart></Chart><Legend items={[["Projected score (zoomed axis)",blue],["Increase",teal],["Decrease",amber]]}/>
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
  {selected.length?<Chart height={210} label="Provider outcomes: confirmed conditions and closed rules by month, with closure rate"><ComposedChart data={series} margin={{left:-15,right:-10,top:10,bottom:0}}><CartesianGrid vertical={false} stroke="#edf0f5"/><XAxis {...axis} dataKey="month"/><YAxis {...axis} yAxisId="count" width={46}/><YAxis {...axis} yAxisId="rate" orientation="right" domain={[0,1]} tickFormatter={percent} width={43}/><Tooltip contentStyle={tip} formatter={(v,n)=>n==='Closure rate'?percent(Number(v)):count(Number(v))}/><Bar yAxisId="count" dataKey="closed" name="Rules closed" fill="#c3d1e9" radius={[3,3,0,0]} maxBarSize={16} isAnimationActive={false}/><Bar yAxisId="count" dataKey="added" name={`Additional ${hcc}`} fill={blue} radius={[3,3,0,0]} maxBarSize={16} isAnimationActive={false}/><Line yAxisId="rate" dataKey="rate" name="Closure rate" stroke={teal} strokeWidth={2.5} dot={{r:3,fill:teal,stroke:'white'}} isAnimationActive={false}/></ComposedChart></Chart>:<NoData/>}
  <Legend items={[["Rules closed",'#c3d1e9'],[`Additional ${hcc}`,blue],["Closure rate",teal]]}/><footer className={s.footnote}>Historical outcomes, separate from the open suspect list. Closed rules include supported and unsupported findings; additions count distinct member–condition pairs. Rates use rules identified in the same month. No operational activity is measured.</footer>
 </Card>;
}

function SocialNeeds({data,report,update,go,frozen}:{data:LandingAnalytics;report:AnalysisReport;update:(values:Record<string,string>)=>void;go:Nav;frozen:boolean}) {
 const keys:[string,string][]=[['age_band','Age'],['gender','Gender'],['zip','ZIP code'],['race','Race'],['social_need','Social need / Z-code']];
 const [selected,setSelected]=useState('');const points=data.social.filter(p=>!p.suppressed&&p.score!==null);const picked=points.find(p=>p.id===selected);
 return <Card wide index="05 / Understand social needs" title="Where do health risks and social needs overlap?" description="Florida county clusters. Compare average risk scores with the share of members with a recorded social need.">
  <div className={s.socialFilters}>{keys.map(([key,label])=><label key={key}>{label}<select disabled={frozen} aria-label={`Social needs ${label}`} value={String(report.context[key as keyof typeof report.context]||'')} onChange={e=>update({[key]:e.target.value})}><option value="">{({age_band:'All ages',gender:'All genders',zip:'All ZIP codes',race:'All races',social_need:'All social needs'} as Record<string,string>)[key]}</option>{data.social_options[key]?.map(v=><option key={v} value={v}>{key==='social_need'?needs[v]:v}</option>)}</select></label>)}</div>
  <div className={s.socialBody}><div><div className={s.chartCaption}>Share of members with social needs · select a circle to inspect a county</div>{points.length?<Chart height={280} label="Florida county clusters by average risk score and share with social needs"><ScatterChart margin={{left:0,right:30,top:20,bottom:24}}><CartesianGrid stroke="#e9edf3" strokeDasharray="3 4"/><XAxis {...axis} type="number" dataKey="score" domain={['dataMin - 0.1','dataMax + 0.1']} tickFormatter={v=>Number(v).toFixed(2)} name="Average score" label={{value:'Average risk score',position:'bottom',fontSize:10,fill:'#778398',offset:4}}/><YAxis {...axis} type="number" dataKey="share" domain={[0,1]} tickFormatter={percent} width={43} name="With social needs"/><ZAxis dataKey="members" range={[120,1100]} name="Members"/><Tooltip contentStyle={tip} labelFormatter={(_,p)=>p?.[0]?.payload?.name||'County'} formatter={(v,n)=>n==='With social needs'?percent(Number(v)):n==='Members'?count(Number(v)):Number(v).toFixed(3)}/><Scatter data={points} fill={purple} fillOpacity={.65} stroke="white" isAnimationActive={false} onClick={p=>setSelected(p.id)}>{picked&&<LabelList dataKey="name" position="top" fontSize={10} fill="#5c637a" content={props=>{const p=points[Number(props.index)];return p?.id===picked.id?<text x={Number(props.x)+Number(props.width)/2} y={Number(props.y)-8} textAnchor="middle" fontSize={11} fill="#52647d">{p.name}</text>:null;}}/>}</Scatter></ScatterChart></Chart>:<NoData/>}</div>
   <aside className={s.countyList}><span className={s.kicker}>County comparison · % with social needs</span><div className={s.countyRows}>{[...points].sort((a,b)=>(b.share||0)-(a.share||0)).map(p=><button key={p.id} aria-pressed={selected===p.id} onClick={()=>setSelected(p.id)}><span>{p.name}<small>{count(p.members||0)} members</small></span><strong>{percent(p.share||0)}</strong></button>)}</div>{picked&&<div className={s.countySelection}><p>{count(picked.needs||0)} members with social needs · average score {(picked.score||0).toFixed(3)}</p><button className={s.textButton} onClick={()=>go('/analytics',{view:'geography',counties:JSON.stringify([picked.id])})}>Explore {picked.name} <ArrowUpRight size={13}/></button></div>}</aside>
  </div><footer className={s.footnote}><Layers3 size={13}/> Social-needs, race and ZIP attributes are separate from medical-record evidence. Filters apply across the dashboard. Bubble size shows members; groups under 20 and a complementary group are hidden. Housing category: housed, with risk of homelessness.</footer>
 </Card>;
}
