"use client";

import { useId, type ReactNode } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, ComposedChart, Pie, PieChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, Treemap, XAxis, YAxis } from 'recharts';
import type { AnalysisReport } from '@/lib/analytics-types';
import s from './analytics-visuals.module.css';
import { ChartInfo } from './analytics-controls';
import { scoreBasisLabel } from '@/lib/analytics-labels';
import { cumulativeOutcomes, outcomeAxisLabel } from '@/lib/suspect-outcomes';
import { CHART_LIMITS } from '@/lib/chart-limits';

const palette=['var(--sapphire)','var(--green)','var(--royal)','var(--yellow)','var(--regent)','var(--chart-6)'];
const blue=palette[0],teal=palette[1],amber=palette[3];
const count=(n:number)=>n.toLocaleString('en-US');
const percent=(n:number)=>`${(n*100).toFixed(1)}%`;
const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:2}).format(n);
const axis={axisLine:false,tickLine:false,tick:{fill:'var(--regent)',fontSize:13}};
const tip={border:'1px solid var(--line)',borderRadius:4,fontSize:13,boxShadow:'0 8px 24px #23334d12'};
const short=(name:string)=>name.replace('Diabetes with complications','Diabetes').replace('Cardiovascular conditions','Cardiovascular').replace('Chronic kidney disease','Kidney disease').replace('Persistent status','Ongoing health status');

function Card({title,children,metric}:{title:string;children:ReactNode;metric?:{value:string;label:string}}) {
 return <section className={`ct-card ${s.card}`}><header className={s.header}><h2>{title}</h2><div className={s.tools}>{metric&&<div className={s.metric}><strong>{metric.value}</strong><span>{metric.label}</span></div>}<ChartInfo title={title}/></div></header><div className={s.body}>{children}</div></section>;
}
function Plot({label,children,height=280}:{label:string;children:ReactNode;height?:number}) {return <div className={s.plot} role="img" aria-label={label} style={{height}}><ResponsiveContainer width="100%" height="100%" initialDimension={{width:650,height}}>{children as React.ReactElement}</ResponsiveContainer></div>;}
function Legend({items}:{items:[string,string][]}) {return <div className={s.legend}>{items.map(([name,color])=><span key={name}><i style={{background:color}}/>{name}</span>)}</div>;}
function NoData(){return <div className={s.empty}>No results for this selection. Broaden the filters to compare more groups.</div>;}

type Slice={name:string;value:number;color?:string;id?:string};
function Donut({rows,value,label,onSelect}:{rows:Slice[];value:string;label:string;onSelect?:(id:string)=>void}) {
 const total=rows.reduce((sum,row)=>sum+Math.max(0,row.value),0);
 if(!total)return <NoData/>;
 return <div className={s.donutLayout}><div className={s.ring}><Plot height={235} label={`${label}. ${rows.map(r=>`${r.name}: ${count(r.value)}`).join('; ')}`}><PieChart><Pie data={rows} dataKey="value" nameKey="name" innerRadius={77} outerRadius={105} paddingAngle={2} cornerRadius={4} startAngle={90} endAngle={-270} stroke="none" isAnimationActive={false} onClick={r=>onSelect?.(r.id||r.name)}>{rows.map((r,i)=><Cell key={r.name} fill={r.color||palette[i%palette.length]} cursor={onSelect?'pointer':'default'}/>)}</Pie><Tooltip contentStyle={tip} formatter={v=>count(Number(v))}/></PieChart></Plot><div className={s.ringCenter}><strong>{value}</strong><span>{label}</span></div></div><div className={s.ringLegend}>{rows.map((r,i)=><button key={r.name} disabled={!onSelect} onClick={()=>onSelect?.(r.id||r.name)}><i style={{background:r.color||palette[i%palette.length]}}/><span>{r.name}<small>{percent(r.value/total)} of shown total</small></span><strong>{count(r.value)}</strong></button>)}</div></div>;
}

type Comparison={id:string;name:string;a:number;b:number};
function ComparisonPlot({rows,label,first,second,format=percent,min=0,max=1,onSelect}:{rows:Comparison[];label:string;first:string;second:string;format?:(value:number)=>string;min?:number;max?:number;onSelect?:(id:string)=>void}) {
 const left=177,right=540,height=rows.length*35+45;
 const x=(v:number)=>left+((v-min)/(max-min||1))*(right-left);
 if(!rows.length)return <NoData/>;
 return <><Legend items={[[first,blue],[second,teal]]}/><svg className={s.comparison} viewBox={`0 0 700 ${height}`} role="img" aria-label={label}>
  {[0,.25,.5,.75,1].map(t=><g key={t}><line x1={x(min+t*(max-min))} x2={x(min+t*(max-min))} y1={5} y2={height-29} stroke="var(--line)" strokeDasharray="3 5"/><text x={x(min+t*(max-min))} y={height-8} textAnchor="middle" fill="var(--regent)" fontSize={11}>{format(min+t*(max-min))}</text></g>)}
  {rows.map((r,i)=><g key={r.id} role={onSelect?'button':undefined} tabIndex={onSelect?0:undefined} aria-label={`${r.name}: ${first} ${format(r.a)}, ${second} ${format(r.b)}`} onClick={()=>onSelect?.(r.id)} onKeyDown={e=>{if(onSelect&&(e.key==='Enter'||e.key===' ')){e.preventDefault();onSelect(r.id);}}} className={onSelect?s.interactive:undefined}>
   <title>{r.name}: {first} {format(r.a)}; {second} {format(r.b)}</title><rect x={0} y={i*35+4} width={700} height={33} fill="transparent"/>
   <text x={0} y={i*35+26} fill="var(--comment)" fontSize={11}>{r.name.length>26?r.name.slice(0,24)+'…':r.name}</text>
   <line x1={x(r.a)} x2={x(r.b)} y1={i*35+22} y2={i*35+22} stroke="#bdcddd" strokeWidth={5} strokeLinecap="round"/>
   <circle cx={x(r.a)} cy={i*35+22} r={5} fill="white" stroke={blue} strokeWidth={2}/><circle cx={x(r.b)} cy={i*35+22} r={5} fill={teal} stroke="white" strokeWidth={1.5}/>
   <text x={564} y={i*35+26} fill="var(--comment)" fontSize={11}>{format(r.a)} → {format(r.b)}</text>
  </g>)}
 </svg></>;
}

function ConditionTile({x=0,y=0,width=0,height=0,index=0,depth=0,rows,onSelect}:{x?:number;y?:number;width?:number;height?:number;index?:number;depth?:number;rows:Slice[];onSelect:(name:string)=>void}) {
 const r=rows[index];if(depth!==1||!r)return null;const ink=[0,4].includes(index%palette.length)?'white':'var(--charcoal)';
 return <g role="button" tabIndex={0} aria-label={`${r.name}, ${count(r.value)} members`} className={s.interactive} onClick={()=>onSelect(r.name)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(r.name);}}}><title>{r.name}: {count(r.value)} members</title><rect x={x+3} y={y+3} width={Math.max(0,width-6)} height={Math.max(0,height-6)} rx={7} fill={palette[index%palette.length]}/>{width>80&&height>45&&<><text x={x+16} y={y+26} fill={ink} fontSize={13}>{short(r.name).slice(0,Math.max(8,Math.floor(width/7)-4))}</text><text x={x+16} y={y+49} fill={ink} fontSize={20} fontWeight={500}>{count(r.value)}</text></>}</g>;
}
export function RiskVisuals({report,selectCondition}:{report:AnalysisReport;selectCondition:(name:string)=>void}) {
 const rows=report.prevalence.filter(r=>r.members>0).sort((a,b)=>b.members-a.members||a.name.localeCompare(b.name)).slice(0,CHART_LIMITS.comparison).map(r=>({name:r.name,value:r.members}));
 const prior=report.prevalence.reduce((n,r)=>n+r.prior,0),confirmed=report.prevalence.reduce((n,r)=>n+r.recaptured,0);
 const gaps=[...report.prevalence].sort((a,b)=>b.gap-a.gap).slice(0,CHART_LIMITS.compact);
 return <div className={s.grid}>
  <Card title="Condition Prevalence" metric={{value:count(rows.reduce((n,r)=>n+r.value,0)),label:'condition records shown'}}>
   {rows.length?<Plot label="Treemap of common conditions by member count" height={310}><Treemap data={rows} dataKey="value" aspectRatio={1.5} isAnimationActive={false} content={<ConditionTile rows={rows} onSelect={selectCondition}/>}/></Plot>:<NoData/>}<div className={s.tileLegend}>{rows.map((r,i)=><button key={r.name} onClick={()=>selectCondition(r.name)}><i style={{background:palette[i%palette.length]}}/><span>{short(r.name)}</span><strong>{count(r.value)}</strong></button>)}</div>
  </Card>
  <Card title="Chronic Condition Recapture" metric={{value:prior?percent(confirmed/prior):'—',label:'confirmed again'}}>
   <div className={s.recapture}><Donut rows={[{name:'Confirmed again',value:confirmed,color:teal},{name:'Still missing',value:prior-confirmed,color:'var(--yellow)'}]} value={count(prior-confirmed)} label="still missing"/><div className={s.gaps}>{gaps.map(r=><button key={r.name} onClick={()=>selectCondition(r.name)}><span>{short(r.name)}</span><div><i style={{width:`${gaps[0]?.gap?r.gap/gaps[0].gap*100:0}%`}}/></div><strong>{count(r.gap)}</strong></button>)}</div></div>
  </Card>
 </div>;
}

export function GeographyVisuals({report,chooseCounty}:{report:AnalysisReport;chooseCounty:(id:string)=>void}) {
 const rows=report.counties.filter(r=>!r.suppressed&&r.score!==null);
 const average=report.bases[report.context.basis]||0;
 const ranked=[...rows].sort((a,b)=>(b.score||0)-(a.score||0)||a.name.localeCompare(b.name)).slice(0,CHART_LIMITS.comparison);
 const opportunities=[...rows].filter(r=>r.capture_members).sort((a,b)=>(b.capture_members||0)-(a.capture_members||0)).slice(0,CHART_LIMITS.compact);
 const name=report.config.program==='MA'?'RAF':'risk score';
 return <div className={s.grid}>
  <Card title={report.config.program==='MA'?'County RAF Benchmarking':'County Risk Benchmarking'} metric={{value:average.toFixed(3),label:`population ${name}`}}>
   <ComparisonPlot rows={ranked.map(r=>({id:r.id,name:r.name.replace(' County',''),a:average,b:r.score||0}))} first="Population average" second="County average" label="County average risk score compared with the population average" min={Math.max(0,Math.min(average,...ranked.map(r=>r.score||0))-.04)} max={Math.max(average,...ranked.map(r=>r.score||0))+.04} format={v=>v.toFixed(2)} onSelect={chooseCounty}/>
  </Card>
  <Card title="Geographic Suspect Opportunities">
   <Donut rows={opportunities.map(r=>({id:r.id,name:r.name.replace(' County',''),value:r.capture_members||0}))} value={count(opportunities.reduce((n,r)=>n+(r.capture_members||0),0))} label="members shown" onSelect={chooseCounty}/>
  </Card>
 </div>;
}

export function ProviderVisuals({report,chooseProvider}:{report:AnalysisReport;chooseProvider:(id:string)=>void}) {
 const providers=(report.providers||[]).filter(r=>!r.suppressed&&r.capture_rate!==null&&r.recapture_rate!==null).sort((a,b)=>(b.open_suspects||0)-(a.open_suspects||0)||a.name.localeCompare(b.name)).slice(0,CHART_LIMITS.comparison);
 const outcomes=(report.landing?.providers||[]).filter(r=>!r.suppressed&&r.series);
 const months=cumulativeOutcomes(outcomes,report.landing?.recapture.months||[]);
 return <div className={s.grid}>
  <Card title="Provider Capture & Recapture Rates">
   <ComparisonPlot rows={providers.map(r=>({id:r.id,name:r.name,a:r.capture_rate||0,b:r.recapture_rate||0}))} first="Suspect capture" second="Chronic Condition Recapture" label="Suspect capture and chronic recapture rates by provider" onSelect={chooseProvider}/>
  </Card>
  <Card title="Cumulative Suspect Identification & Closure">
   <Legend items={[["Total Identified",blue],["Total Closed",teal]]}/>
   {months.length?<Plot label="Cumulative total identified and total closed suspects through each month" height={295}><AreaChart data={months} margin={{left:0,right:12,top:15,bottom:0}}><CartesianGrid vertical={false} stroke="var(--line)"/><XAxis {...axis} dataKey="month"/><YAxis {...axis} width={48} allowDecimals={false} tickFormatter={outcomeAxisLabel}/><Tooltip contentStyle={tip} labelFormatter={month=>`Cumulative Through ${month}`} formatter={v=>count(Number(v))}/><Area dataKey="identified" name="Total Identified" type="linear" stroke={blue} strokeWidth={2.5} fill={blue} fillOpacity={.08} isAnimationActive={false}/><Area dataKey="closed" name="Total Closed" type="linear" stroke={teal} strokeWidth={2.5} fill={teal} fillOpacity={.12} isAnimationActive={false}/></AreaChart></Plot>:<NoData/>}
  </Card>
 </div>;
}

export function ScoreVisuals({report}:{report:AnalysisReport}) {
 const baseline=report.bases.captured_baseline||0,potential=report.bases.potential||0;
 const points=[{id:'captured_baseline',name:'Baseline',value:baseline},{id:'accepted',name:scoreBasisLabel('accepted',report.config.program),value:report.bases.accepted||0},{id:'submitted',name:scoreBasisLabel('submitted',report.config.program),value:report.bases.submitted||0},{id:'potential',name:'Potential',value:potential}];
 const components=[{name:'Age & member details',value:baseline*.36},{name:'Health conditions',value:baseline*.53},{name:'Combined conditions',value:baseline*.11}];
 const data=report.trend.map(r=>({id:r.month,name:r.month,a:r.baseline,b:r.potential}));
 return <>
  <div className="ct-metric-grid">{points.map((p,i)=><div className="ct-metric" key={p.id}><div className="ct-metric-label">{p.name}</div><div className="ct-metric-value">{p.value.toFixed(3)}</div><div className="ct-metric-note">{i===0?'Starting score':`${p.value>=baseline?'+':''}${(p.value-baseline).toFixed(3)} from baseline`}</div></div>)}</div>
  <div className={s.grid}>
   <Card title="Baseline Risk Score Composition">
    <div className={s.donutLayout}><div className={s.ring}><Plot label="Estimated baseline score components" height={235}><PieChart><Pie data={components} dataKey="value" innerRadius={77} outerRadius={105} paddingAngle={3} cornerRadius={4} stroke="none" isAnimationActive={false}>{components.map((r,i)=><Cell key={r.name} fill={palette[i]}/>)}</Pie><Tooltip contentStyle={tip} formatter={v=>Number(v).toFixed(3)}/></PieChart></Plot><div className={s.ringCenter}><strong>{baseline.toFixed(3)}</strong><span>baseline score</span></div></div><div className={s.ringLegend}>{components.map((r,i)=><div key={r.name}><i style={{background:palette[i]}}/><span>{r.name}<small>{baseline?percent(r.value/baseline):'—'} of baseline</small></span><strong>{r.value.toFixed(3)}</strong></div>)}</div></div>
   </Card>
   <Card title="Risk Score Scenario Comparison" metric={{value:`+${(potential-baseline).toFixed(3)}`,label:'potential score increase'}}>
    <Plot label="Baseline, accepted, submitted and potential score comparison" height={260}><ComposedChart data={points} margin={{left:0,right:18,top:20,bottom:0}}><CartesianGrid vertical={false} stroke="var(--line)"/><XAxis {...axis} dataKey="name"/><YAxis {...axis} domain={[0,'dataMax + 0.1']} width={45} tickFormatter={v=>Number(v).toFixed(2)}/><Tooltip contentStyle={tip} formatter={v=>Number(v).toFixed(3)}/><Bar dataKey="value" name="Average score" barSize={48} radius={[7,7,0,0]} isAnimationActive={false}>{points.map((p,i)=><Cell key={p.name} fill={palette[i]} fillOpacity={.16}/>)}</Bar><Line dataKey="value" name="Average score" stroke={blue} strokeWidth={3} dot={{r:7,fill:'white',strokeWidth:3}} isAnimationActive={false} tooltipType="none"/></ComposedChart></Plot>
   </Card>
  </div>

 </>;
}

export function FinancialVisuals({report}:{report:AnalysisReport}) {
 const f=report.financial;
 const stages=[{name:'Total opportunity',value:f.gross,color:blue},{name:'Likely opportunity',value:f.support,color:'var(--royal)'},{name:'Expected payment',value:f.realized,color:teal},{name:'Net revenue',value:f.net,color:'var(--success)'}];
 const monthly=f.scenarios.find(r=>r.name==='Base')?.monthly||[];
 const maximum=Math.max(...stages.map(r=>Math.abs(r.value)),1);
 return <div className={s.grid}>
  <Card title="Risk-Adjusted Revenue Funnel" metric={{value:f.gross?percent(f.net/f.gross):'—',label:'of total opportunity'}}>
   <div className={s.funnel}>{stages.map((r,i)=><div className={s.funnelRow} key={r.name}><span>{r.name}</span><div><div className={s.funnelShape} style={{width:`${Math.max(8,Math.abs(r.value)/maximum*100)}%`,background:r.value<0?'var(--red)':r.color}}><strong>{money(r.value)}</strong></div></div><small>{i===0?'Starting value':`${f.gross?percent(r.value/f.gross):'—'} retained`}</small></div>)}</div>
  </Card>
  <Card title="Monthly Revenue Projection" metric={{value:money(f.net),label:'total expected net revenue'}}>
   <Plot label="Monthly expected additional net revenue" height={295}><BarChart data={monthly} margin={{left:4,right:10,top:15,bottom:0}}><CartesianGrid vertical={false} stroke="var(--line)"/><XAxis {...axis} dataKey="month" tickFormatter={v=>new Date(`${v}-01T12:00:00`).toLocaleDateString('en-US',{month:'short'})} minTickGap={18}/><YAxis {...axis} width={58} tickFormatter={money}/><Tooltip contentStyle={tip} formatter={v=>money(Number(v))}/><Bar dataKey="net" name="Net revenue" radius={[5,5,0,0]} maxBarSize={32} isAnimationActive={false}>{monthly.map(r=><Cell key={r.month} fill={r.net>=0?teal:'var(--red)'}/>)}</Bar></BarChart></Plot>
  </Card>
 </div>;
}

export function AiVisuals({report}:{report:AnalysisReport}) {
 const m=report.ai.metrics;
 const f1=(precision:number,recall:number)=>precision+recall?2*precision*recall/(precision+recall):0;
 const quality=[{name:'Flags supported',manual:m.manual_precision*100,assisted:m.assisted_precision*100},{name:'Conditions found',manual:m.manual_recall*100,assisted:m.assisted_recall*100},{name:'F1 score',manual:f1(m.manual_precision,m.manual_recall)*100,assisted:f1(m.assisted_precision,m.assisted_recall)*100}];
 const saved=m.manual_mean_minutes-m.assisted_mean_minutes;
 return <>
  <div className={s.grid}>
   <Card title="AI Detection Performance"><Plot label="AI precision and recall percentages" height={295}><BarChart data={[{name:'Supported flags',value:m.ai_precision},{name:'Conditions found',value:m.ai_recall}]} margin={{left:0,right:20,top:20,bottom:8}}><CartesianGrid vertical={false} stroke="var(--line)"/><XAxis {...axis} dataKey="name"/><YAxis {...axis} domain={[0,1]} tickFormatter={percent} width={52}/><Tooltip contentStyle={tip} formatter={v=>percent(Number(v))}/><Bar dataKey="value" name="Share" maxBarSize={95} radius={[4,4,0,0]} isAnimationActive={false}><Cell fill={blue}/><Cell fill={teal}/></Bar></BarChart></Plot></Card>
   <Card title="AI-Assisted Review Performance">
    <Legend items={[["Manual",'var(--regent)'],["AI-assisted",teal]]}/><div className={s.qualityRadar}><Plot label="Manual and AI-assisted reviewer quality across supported flags, detected conditions and F1 score" height={295}><RadarChart data={quality} outerRadius="66%"><PolarGrid stroke="var(--line)"/><PolarAngleAxis dataKey="name" tickFormatter={value=>value==='Flags supported'?'Supported':value==='Conditions found'?'Found':'F1'} tick={{fontSize:13,fill:'var(--regent)'}}/><PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false}/><Radar name="Manual" dataKey="manual" stroke="var(--regent)" fill="var(--regent)" fillOpacity={.12} isAnimationActive={false}/><Radar name="AI-assisted" dataKey="assisted" stroke={teal} strokeWidth={2.5} fill={teal} fillOpacity={.22} isAnimationActive={false}/><Tooltip contentStyle={tip} formatter={v=>`${Number(v).toFixed(1)}%`}/></RadarChart></Plot><div className={s.qualityValues}>{quality.map(r=><div key={r.name}><span>{r.name}</span><small>Manual <b>{r.manual.toFixed(1)}%</b></small><small>AI-assisted <strong>{r.assisted.toFixed(1)}%</strong></small></div>)}</div></div>
   </Card>
  </div>

 </>;
}
