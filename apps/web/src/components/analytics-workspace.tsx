"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownToLine, ArrowRight, ArrowUpRight, BarChart3, BookOpen, Check, Clock3, FileBarChart2, GitBranch, Layers3, LoaderCircle, MapPin, RefreshCw, Save, Search, ShieldCheck, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { toast } from 'sonner';
import { analysisText, calculationText, plainLabel, reportCopy, metricNames, calculationNotes } from '@/lib/analytics-language';
import { api, num } from '@/lib/api';
import { OPPORTUNITY_LEVELS, opportunityLevelLabel, opportunityQuadrantLabel } from '@/lib/opportunity-matrix';
import { useUrlState } from '@/hooks/workspace-state';
import { configurationForYear, configurationLabel, reportingMonths } from '@/lib/risk-context-labels';
import type { AnalysisBasis, AnalysisContext, AnalysisReport, AnalysisView, CountRow, FinancialSettings, GeoRow, ProviderRow, SavedAnalysis, ScenarioOutput, SuspectCase } from '@/lib/analytics-types';
import type { User } from '@/lib/types';
import { useRiskContext } from './risk-ui';
import { Button } from './ui/button';
import { ArrowAction, ChartInfo } from './analytics-controls';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { scoreBasisLabel } from '@/lib/analytics-labels';
import { CHART_LIMITS } from '@/lib/chart-limits';
import { SuspectEvidenceDrawer } from './suspect-evidence';
import { DEFAULT_PAGE_SIZE, TablePagination } from './table-pagination';
import styles from './analytics-workspace.module.css';
import { DiscoveryOverview } from './suspect-discovery';
import { LandingAnalyticsPanels } from './landing-analytics';
import { DashboardFocus } from './dashboard-focus';
import { RiskVisuals, GeographyVisuals, ProviderVisuals, ScoreVisuals, AiVisuals } from './analytics-visuals';

const COLORS=['var(--sapphire)','var(--green)','var(--royal)','var(--yellow)','var(--chart-6)','var(--regent)','var(--charcoal)'];
const TABS: {id:AnalysisView;label:string}[]=[{id:'risk',label:'Risk & conditions'},{id:'geography',label:'Geography'},{id:'provider',label:'Provider'},{id:'financial',label:'Financial'}];
const reportPath=(view:string)=>view==='overview'?'/overview':['suspecting','registry'].includes(view)?'/suspects':'/analytics';
const BASES: {id:AnalysisBasis;label:string;note:string}[]=[{id:'captured_baseline',label:'Baseline',note:'Starting average score'},{id:'potential',label:'Potential',note:'Possible score if all suspects are confirmed'},{id:'submitted',label:'Submitted',note:'Score based on submitted diagnosis codes'},{id:'accepted',label:'Accepted',note:'Score based on accepted diagnosis codes'}];
const CATEGORIES: Record<string,string>={CG:'Coding gap',RC:'Recapture',NC:'New condition',SP:'Specificity',ST:'Persistent status',OC:'Potential overcapture',DR:'Data representation'};
const HEALTH_NETWORK_OPTIONS=['Central MA Network','Northside Medical','Harbor Primary Care','Dr. A. Carter'];
const matchesHealthNetwork=(row:NonNullable<AnalysisReport['options']['hierarchy']>[number],value:string)=>!value||[row.network,row.group,row.provider].includes(value);
const financialInputs=({reach,realization,benchmark,months,recognition,start}:FinancialSettings):FinancialSettings=>({reach,realization,benchmark,months,recognition,start});
const DEFAULT_MONEY:FinancialSettings={reach:.75,realization:.90,benchmark:1000,months:12,recognition:1,start:'2027-01'};
const score=(n:number|null|undefined,d=3)=>n==null?'Not available':n.toFixed(d);
const pct=(n:number|null|undefined,d=1)=>n==null?'Not available':`${(n*100).toFixed(d)}%`;
const usd=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const compact=(n:number)=>Math.abs(n)>=1e6?`${(n/1e6).toFixed(1)}m`:Math.abs(n)>=1000?`${(n/1000).toFixed(0)}k`:String(Math.round(n));
const axis={tick:{fill:'var(--regent)',fontSize:13},axisLine:false,tickLine:false};
const tooltipStyle={border:'1px solid var(--line)',borderRadius:4,fontSize:13,boxShadow:'0 5px 18px #17253b0d'};

function Panel({title,children,action,info}: {title:string;children:ReactNode;action?:ReactNode;info?:string}) {
 return <section className={`ct-card ${styles.panel}`}><div className={styles.panelHeader}><div><h2>{title}</h2></div><div className={styles.panelTools}>{action}<ChartInfo title={title} description={info}/></div></div><div className={styles.panelBody}>{children}</div></section>;
}
function LinkAction({children,onClick}:{children:string;onClick:()=>void}) {return <ArrowAction label={children} onClick={onClick}/>;}
function ModelDetails({configurations}:{configurations:{id:string;name:string;status:string}[]}) {
 const [open,setOpen]=useState(false);
 return <><button className={styles.panelAction} onClick={()=>setOpen(true)}>Model details</button><Dialog open={open} onOpenChange={setOpen}><DialogContent className={styles.forecastDialog}><DialogHeader><DialogTitle>Model availability</DialogTitle><DialogDescription>Report data and supported model calculations have separate availability.</DialogDescription></DialogHeader><dl className={styles.modelList}>{configurations.map(c=><div key={c.id}><dt>{c.name}</dt><dd>{plainLabel(c.status.replaceAll('_',' '))}</dd></div>)}</dl><DialogFooter><Button variant="outline" onClick={()=>setOpen(false)}>Close</Button></DialogFooter></DialogContent></Dialog></>;
}
function Stats({items}:{items:{label:string;value:string;note:string}[]}) {return <div className="ct-metric-grid">{items.map(x=><div className={`ct-metric ${styles.stat}`} key={x.label}><div className="ct-metric-label">{x.label}</div><div className="ct-metric-value">{x.value}</div><div className="ct-metric-note">{x.note}</div></div>)}</div>;}
function Chart({children,height=240,label}:{children:ReactNode;height?:number;label:string}) {return <div className={styles.chart} role="img" aria-label={label}><ResponsiveContainer width="100%" height={height} initialDimension={{width:500,height}}>{children as React.ReactElement}</ResponsiveContainer></div>;}
function MethodNotes({report}:{report:AnalysisReport}) {
 return <><dl className={styles.methodList}>{calculationNotes.map(([title,description])=><div key={title}><dt>{title}</dt><dd>{description}</dd></div>)}</dl><details className={styles.disclosure}><summary>Technical calculation details</summary><dl className={styles.methodList}>{Object.entries(report.method).map(([key,value])=><div key={key}><dt>{key.replaceAll('_',' ')}</dt><dd>{calculationText(value)}</dd></div>)}</dl><p>Data version: {report.version}<br/>Report reference: {report.snapshot_hash.slice(0,16)}<br/>Filter reference: {report.filter_hash.slice(0,16)}<br/>Input reference: {report.input_hash.slice(0,16)}</p></details></>;
}

function EmptyScope() {return <div className={styles.empty}><strong>No matching records</strong>No members match these filters. Remove a filter to see results.</div>;}
function Rank({rows,format=num,onSelect,color=COLORS[0],limit=CHART_LIMITS.comparison}:{rows:{name:string;value:number}[];format?:(v:number)=>string;onSelect?:(name:string)=>void;color?:string;limit?:5|10}) {
 const selected=[...rows].sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name)).slice(0,limit);const max=Math.max(...selected.map(x=>x.value),1);
 return <div className={styles.rank}>{selected.map(r=><button key={r.name} onClick={()=>onSelect?.(r.name)} disabled={!onSelect}><span className={styles.rankLabel} title={plainLabel(r.name)}>{plainLabel(r.name)}</span><span className={styles.track}><i style={{width:`${r.value/max*100}%`,background:color}}/></span><span className={styles.rankValue}>{format(r.value)}</span></button>)}</div>;
}
function Paged<T>({rows,headers,render,label,scope,tableClassName=''}:{rows:T[];headers:ReactNode;render:(row:T,index:number)=>ReactNode;label:string;scope?:string;tableClassName?:string}) {
 const [size,setSize]=useState(DEFAULT_PAGE_SIZE);const [page,setPage]=useState(0);
 useEffect(()=>setPage(0),[scope]);
 const current=Math.min(page,Math.max(0,Math.ceil(rows.length/size)-1));
 return <><div className={styles.tableWrap}><table className={`${styles.table} ${tableClassName}`} aria-label={label}><thead><tr>{headers}</tr></thead><tbody>{rows.slice(current*size,(current+1)*size).map((row,i)=>render(row,i+current*size))}</tbody></table>{!rows.length&&<EmptyScope/>}</div><TablePagination totalRows={rows.length} pageIndex={current} pageSize={size} onPageChange={setPage} onPageSizeChange={v=>{setSize(v);setPage(0);}} label={label}/></>;
}

function Ring({rows:rawRows,label}:{rows:CountRow[];label:string}) {const rows=rawRows.map(row=>({...row,name:plainLabel(row.name)}));return <div><Chart height={190} label={rows.map(r=>`${r.name}: ${r.count}`).join('; ')}><PieChart><Pie data={rows} dataKey="count" nameKey="name" innerRadius={57} outerRadius={78} paddingAngle={2} stroke="none" isAnimationActive={false}>{rows.map((r,i)=><Cell key={r.name} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip contentStyle={tooltipStyle}/><text x="50%" y="48%" textAnchor="middle" fill="var(--charcoal)" fontSize={23}>{num(rows.reduce((s,r)=>s+r.count,0))}</text><text x="50%" y="60%" textAnchor="middle" fill="var(--regent)" fontSize={11}>{label}</text></PieChart></Chart><div className={styles.legend}>{rows.map((r,i)=><span key={r.name}><i style={{background:COLORS[i%COLORS.length]}}/>{r.name} · {num(r.count)}</span>)}</div></div>;}
function Trend({report}:{report:AnalysisReport}) {
 if(!report.trend.length)return <div className={styles.empty}><strong>No calculated scores for this selection</strong>Choose a population with calculated scores to compare monthly trends.</div>;
 return <><div className={styles.legend}>{['captured_baseline','potential','submitted','accepted'].map(key=>scoreBasisLabel(key,report.config.program)).map((n,i)=><span key={n}><i style={{background:COLORS[i]}}/>{n}</span>)}</div>
  <Chart label="Risk score trend across six reporting months" height={260}>
   <ComposedChart data={report.trend} margin={{left:0,right:14,top:12,bottom:0}}>
    <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 4"/>
    <XAxis dataKey="month" {...axis} dy={7}/>
    <YAxis {...axis} domain={[(value:number)=>Math.floor((value-.006)*1000)/1000,(value:number)=>Math.ceil((value+.006)*1000)/1000]} width={44} tickCount={6} tickFormatter={v=>Number(v).toFixed(2)}/>
    <Tooltip contentStyle={tooltipStyle} formatter={v=>score(Number(v))}/>
    {(['baseline','potential','submitted','accepted'] as const).map((key,i)=><Line key={key} type="monotone" dataKey={key} name={['captured_baseline','potential','submitted','accepted'].map(key=>scoreBasisLabel(key,report.config.program))[i]} stroke={COLORS[i]} strokeWidth={2.5} strokeDasharray={key==='potential'?'6 4':undefined} dot={{r:3.5,fill:'white',strokeWidth:2,strokeDasharray:'none'}} activeDot={{r:5,stroke:'white',strokeWidth:2,strokeDasharray:'none'}} isAnimationActive={false}/>)}
   </ComposedChart>
  </Chart></>;
}
function Distribution({report}:{report:AnalysisReport}) {
 const total=report.histogram.reduce((sum,row)=>sum+row.count,0);
 const rows=report.histogram.map(row=>({name:row.name,share:total?row.count/total:0}));
 return <><div className={styles.legend}><span>Median <strong>{score(report.percentiles.median)}</strong></span><span>90th percentile <strong>{score(report.percentiles.p90)}</strong></span></div><Chart height={235} label="Risk score distribution as a percentage of scored members"><BarChart data={rows} margin={{left:0,right:0,top:12,bottom:0}}><CartesianGrid vertical={false} stroke="var(--line)"/><XAxis dataKey="name" {...axis} dy={6}/><YAxis {...axis} width={45} tickFormatter={v=>pct(Number(v),0)}/><Tooltip contentStyle={tooltipStyle} formatter={v=>pct(Number(v))}/><Bar dataKey="share" name="Population share" radius={[4,4,0,0]} maxBarSize={38} isAnimationActive={false}>{rows.map((r,i)=><Cell key={r.name} fill={i===2?COLORS[0]:'var(--royal)'}/>)}</Bar></BarChart></Chart></>;
}

type OverviewSlice={id:string;name:string;value:number;detail:string};
function OverviewDonut({rows,label,centerLabel,onSelect}:{rows:OverviewSlice[];label:string;centerLabel:string;onSelect:(id:string)=>void}) {
 const [highlighted,setHighlighted]=useState<string|null>(null);
 const total=rows.reduce((sum,row)=>sum+row.value,0);
 if(!total)return <EmptyScope/>;
 return <div className={styles.overviewDonut}>
  <div className={styles.donutGraphic}>
   <Chart height={215} label={`${label}. ${rows.map(row=>`${row.name}: ${num(row.value)}, ${row.detail}`).join('; ')}`}>
    <PieChart>
     <Pie data={rows} dataKey="value" nameKey="name" innerRadius={72} outerRadius={98} startAngle={90} endAngle={-270} paddingAngle={3} cornerRadius={4} stroke="none" isAnimationActive={false} onClick={row=>onSelect(row.id)} onMouseEnter={row=>setHighlighted(row.id)} onMouseLeave={()=>setHighlighted(null)}>
      {rows.map((row,index)=><Cell key={row.id} fill={COLORS[index]} fillOpacity={highlighted&&highlighted!==row.id ? .35 : 1} cursor="pointer"/>)}
     </Pie>
     <Tooltip contentStyle={tooltipStyle} formatter={(value,_name,item)=>[`${num(Number(value))} · ${item.payload.detail}`,item.payload.name]}/>
    </PieChart>
   </Chart>
   <div className={styles.donutCenter}><strong>{num(total)}</strong><span>{centerLabel}</span></div>
  </div>
  <div className={styles.donutLegend}>
   {rows.map((row,index)=><button key={row.id} aria-label={`${row.name}: ${num(row.value)} members, ${row.detail}`} onClick={()=>onSelect(row.id)} onMouseEnter={()=>setHighlighted(row.id)} onMouseLeave={()=>setHighlighted(null)} onFocus={()=>setHighlighted(row.id)} onBlur={()=>setHighlighted(null)}>
    <i style={{background:COLORS[index]}}/>
    <span className={styles.donutName} title={row.name}>{row.name}<small>{row.detail}</small></span>
    <strong>{num(row.value)}</strong><ArrowUpRight size={12}/>
   </button>)}
  </div>
 </div>;
}
function OverviewBreakdowns({report,go,tab,scoreName}:{report:AnalysisReport;go:(target:string,extra:Record<string,string>)=>void;tab:(view:string)=>void;scoreName:string}) {
 const conditions=[...report.prevalence].filter(row=>row.members>0).sort((a,b)=>b.members-a.members).slice(0,CHART_LIMITS.compact);
 const counties=report.counties.filter(row=>!row.suppressed&&(row.eligible||0)>0).sort((a,b)=>(b.eligible||0)-(a.eligible||0)).slice(0,CHART_LIMITS.compact);
 const practices=report.practices.filter(row=>!row.suppressed&&(row.capture_members||0)>0).sort((a,b)=>(b.capture_members||0)-(a.capture_members||0)).slice(0,CHART_LIMITS.compact);
 return <div className={`${styles.threeGrid} ${styles.overviewBreakdowns}`}>
  <Panel title="HCC Prevalence" action={<LinkAction onClick={()=>tab('risk')}>Explore HCC prevalence</LinkAction>}>
   <OverviewDonut label="Member counts across the five most common conditions" centerLabel="conditions" rows={conditions.map(row=>({id:row.name,name:plainLabel(row.name),value:row.members,detail:`${row.prevalence?.toFixed(1)||'0'}% of included members`}))} onSelect={condition=>go('/analytics',{view:'risk',condition})}/>

  </Panel>
  <Panel title="Geographical Distribution" action={<LinkAction onClick={()=>tab('geography')}>Compare risk by geography</LinkAction>}>
   <OverviewDonut label="Included members across the five largest counties" centerLabel="members" rows={counties.map(row=>({id:row.id,name:row.name.replace(' County',''),value:row.eligible||0,detail:`${score(row.score)} average ${scoreName}`}))} onSelect={county=>go('/analytics',{view:'geography',counties:JSON.stringify([county])})}/>

  </Panel>
  <Panel title="Suspect Opportunities" action={<LinkAction onClick={()=>tab('provider')}>Compare providers</LinkAction>}>
   <OverviewDonut label="Members with possible additions across the five leading practices" centerLabel="opportunities" rows={practices.map(row=>({id:row.id,name:row.name,value:row.capture_members||0,detail:`${((row.rate||0)/10).toFixed(1)}% with opportunities`}))} onSelect={practice=>go('/analytics',{view:'provider',practices:JSON.stringify([practice])})}/>

  </Panel>
 </div>;
}

export function AnalyticsWorkspace({user,route}:{user:User;route:string}) {
 const risk=useRiskContext();const params=useSearchParams();const path=usePathname();const router=useRouter();
 const [view]=useUrlState('view','risk');const [contract,setContract]=useUrlState('contract','');
 const [healthNetwork]=useUrlState('health_network','');const [providerGroup]=useUrlState('provider_group','');const [provider]=useUrlState('provider','');

 const [counties,setCounties]=useUrlState<string[]>('counties',[]);const [practices]=useUrlState<string[]>('practices',[]);
 const [snapshot]=useUrlState('snapshot','2026-09-15');const [stage]=useUrlState('stage','adjusted');
 const [category,setCategory]=useUrlState('category','');const [condition]=useUrlState('condition','');const [conditions]=useUrlState<string[]>('conditions',[]);
 const [band,setBand]=useUrlState('band','');const [evidence,setEvidence]=useUrlState('evidence','');const [rule,setRule]=useUrlState('rule','');
 const [discovery,setDiscovery]=useUrlState('discovery','all');
 const [source,setSource]=useUrlState('source','');const [disposition,setDisposition]=useUrlState('disposition','open');
 const [search,setSearch]=useUrlState('grid_q','');const [freshness,setFreshness]=useUrlState('freshness','fresh');
 const [closure]=useUrlState('closure','');const [quadrant]=useUrlState('quadrant','');
 const [age_band]=useUrlState('age_band','');const [gender]=useUrlState('gender','');const [race]=useUrlState('race','');const [zip]=useUrlState('zip','');const [social_need]=useUrlState('social_need','');
 const [money,setMoney]=useUrlState<FinancialSettings>('financial',DEFAULT_MONEY);
 const [selected,setSelected]=useUrlState<string[]>('selection',[]);const [focused,setFocused]=useState<SuspectCase|null>(null);
 const [busy,setBusy]=useState(false);const format='zip';
 const [scenario,setScenario]=useState<ScenarioOutput|null>(null);const [scenarioError,setScenarioError]=useState('');const [scenarioMode,setScenarioMode]=useState('illustrative');const [operation,setOperation]=useState('combined');
 const savedId=params?.get('saved')||'';
 const basis=BASES.some(b=>b.id===risk.basis)?risk.basis as AnalysisBasis:'captured_baseline';
 const ctx:AnalysisContext={discovery:route==='suspects'?discovery:'',hcc_only:route==='suspects'&&risk.configuration?.program==='MA',snapshot,stage,basis,run_month:risk.reportMonth,contract,health_network:healthNetwork,provider_group:providerGroup,provider,counties,practices,category,condition,conditions,evidence,band,rule,source,disposition,q:search,freshness,financial:money,closure,quadrant,age_band,gender,race,zip,social_need};
 const contextKey=JSON.stringify(ctx);
 const query=useQuery({queryKey:['analytics-experience',user.id,risk.configId,contextKey],queryFn:()=>api<AnalysisReport>(`/analytics/experience?${new URLSearchParams({config_id:risk.configId,context:contextKey})}`),enabled:!!risk.configId&&!savedId,staleTime:30000,
  // Preserve the dashboard's height while filters load; never reuse another user's or model's results.
  placeholderData:(previous,previousQuery)=>route==='overview'&&previousQuery?.queryKey[1]===user.id&&previousQuery?.queryKey[2]===risk.configId?previous:undefined,
 });
 const savedQuery=useQuery({queryKey:['analytics-saved',user.id,savedId],queryFn:()=>api<{id:string;name:string;report_id:string;report:AnalysisReport}>(`/analytics/reports/${encodeURIComponent(savedId)}`),enabled:!!savedId});
 const report=savedId?savedQuery.data?.report:query.data;
 const refreshing=query.isPlaceholderData&&!savedId;
 const savedList=useQuery({queryKey:['analytics-saves',user.id],queryFn:()=>api<{items:SavedAnalysis[]}>('/analytics/reports'),enabled:route==='reports'});
 const rawView=({'Risk & conditions':'risk',Geography:'geography',Suspecting:'suspecting','Financial scenarios':'financial','AI Impact':'ai'} as Record<string,string>)[view]||view;
 const activeView=route==='suspects'?'registry':route==='scenarios'||['raf','ai'].includes(rawView)?'risk':rawView;
 const reportId=savedQuery.data?.report_id||params?.get('report')||(activeView==='registry'?'registry':'')||({overview:'R01',risk:'R02',geography:'R05',provider:'R12',suspecting:category==='OC'?'R09':'R06',raf:'R04',financial:'R08',ai:'R10',coverage:'R11'}[route==='overview'?'overview':activeView]||'R01');
 const title=route==='overview'?'Dashboard':route==='reports'?'Reports':route==='suspects'?'Suspected conditions':'Risk analytics';
 const hidePageHeader=['overview','analytics','suspects'].includes(route);
 const canExport=user.permissions.includes('export');const canScenario=false; // Score scenarios are hidden from the analytics experience.
 const scoreName=report?.config.program==='Part D'?'RxHCC score':report?.config.program==='ACA'?'HHS-HCC score':report?.config.program==='Medicaid'?'Risk score':'RAF';
 const selectionContext=useRef(`${risk.configId}:${contextKey}`);
 useEffect(()=>{const key=`${risk.configId}:${contextKey}`;if(selectionContext.current!==key){if(selected.length)setSelected([]);setFocused(null);setScenario(null);setScenarioError('');selectionContext.current=key;}},[contextKey,risk.configId]);
 useEffect(()=>{if(route==='analytics'&&view==='Executive')router.replace(risk.href('/overview'));},[route,view,risk,router]);
 useEffect(()=>{
  if(route!=='analytics'||rawView!=='suspecting')return;
  const next=new URLSearchParams(params?.toString());
  next.set('view','suspecting');
  router.replace(`/suspects?${next}`,{scroll:false});
 },[route,rawView,params,router]);
 const update=(values:Record<string,string>)=>{const p=new URLSearchParams(window.location.search);for(const [k,v]of Object.entries(values)){if(v)p.set(k,v);else p.delete(k);}p.delete('saved');window.history.replaceState(null,'',`${path}?${p}`);};
 const setCondition=(value:string)=>update({condition:value,conditions:''});
 const go=(target:string,extra:Record<string,string>={})=>{const p=new URLSearchParams(window.location.search);p.delete('saved');p.delete('report');p.delete('selection');if('condition' in extra)p.delete('conditions');if('conditions' in extra)p.delete('condition');if('practices' in extra){p.delete('health_network');p.delete('provider_group');p.delete('provider');}if(target==='/suspects'){if(!('view' in extra))p.set('view','registry');if(!('discovery' in extra))p.set('discovery','any');}for(const[k,v]of Object.entries(extra)){if(v)p.set(k,v);else p.delete(k);}router.push(`${target}?${p}`,{scroll:true});};
 const tab=(v:string)=>{const target=reportPath(v);if(path!==target)go(target,{view:v});else update({view:v,report:''});};
 const reset=()=>update({contract:'',health_network:'',provider_group:'',provider:'',counties:'',practices:'',category:'',condition:'',conditions:'',evidence:'',band:'',rule:'',source:'',disposition:'',grid_q:'',freshness:'',discovery:'',closure:'',quadrant:'',age_band:'',gender:'',race:'',zip:'',social_need:''});
 const payload=()=>({config_id:report?.config.id||risk.configId,context:report?.context||ctx,snapshot_hash:report?.snapshot_hash,report_id:reportId,saved_id:savedId||undefined});
 async function exportReport(ids?:string[]) {
  if(!report)return;setBusy(true);
  try{const response=await fetch('/api/v1/analytics/export',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json','x-csrf-token':user.csrf_token},body:JSON.stringify({...payload(),format,ids})});if(!response.ok){const b=await response.json();throw new Error(b.error?.message||'Export could not be created');}const href=URL.createObjectURL(await response.blob());const a=document.createElement('a');a.href=href;a.download=`perform-plus-${reportId}.${format}`;a.click();setTimeout(()=>URL.revokeObjectURL(href),3000);toast.success('Report exported with the current filters and assumptions');}catch(e){toast.error((e as Error).message);}finally{setBusy(false);}
 }
 async function calculate(){if(!report||!selected.length)return;setBusy(true);setScenarioError('');setScenario(null);try{const result=await api<ScenarioOutput>('/analytics/scenario',{method:'POST',body:JSON.stringify({...payload(),ids:selected,mode:scenarioMode,operation,name:`${operation} scenario`})},user.csrf_token);setScenario(result);toast.success('Scenario calculated. Member records were not changed.');}catch(e){setScenarioError((e as Error).message);toast.error((e as Error).message);}finally{setBusy(false);}}
 const toggle=(id:string)=>setSelected(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
 const error=(savedId?savedQuery.error:query.error)||risk.error;
 if(!report)return <div className={styles.workspace}>{hidePageHeader?<h1 className="sr-only">{title}</h1>:<div className={`ct-card ${styles.header}`}><div><span className={styles.eyebrow}>Population risk</span><h1>{title}</h1><p>Loading scores, suspected conditions and reports.</p></div></div>}{error?<div className={styles.error}><strong>The analysis could not be loaded</strong><p>{error.message}</p><Button variant="outline" onClick={()=>{savedId?savedQuery.refetch():query.refetch();}}>Try again</Button>{savedId&&<Button variant="ghost" onClick={()=>update({saved:''})}>Open current analysis</Button>}</div>:<><div role="status">Loading the selected analysis…</div><div className={styles.skeleton}/><div className={styles.skeleton}/></>}</div>;
 const filterCount=conditions.length+counties.length+([healthNetwork,providerGroup,provider].filter(Boolean).length||practices.length)+[contract,category,condition,evidence,band,rule,source,search,closure,quadrant,age_band,gender,race,zip,social_need].filter(Boolean).length;
 const launchReport=(r:AnalysisReport['reports'][number])=>go(reportPath(r.view),{view:r.view,report:r.id,category:r.id==='R09'?'OC':'',condition:'',evidence:'',band:'',rule:''});
 const hierarchyRows=report.options.hierarchy||[];
 const networks=HEALTH_NETWORK_OPTIONS;
 const groups=[...new Set(hierarchyRows.filter(member=>matchesHealthNetwork(member,healthNetwork)).map(member=>member.group))];
 const providers=[...new Set(hierarchyRows.filter(member=>matchesHealthNetwork(member,healthNetwork)&&(!providerGroup||member.group===providerGroup)).map(member=>member.provider))];
 function chooseHierarchy(level:'health_network'|'provider_group'|'provider',value:string){
  const next={health_network:healthNetwork,provider_group:providerGroup,provider,[level]:value};
  if(level==='health_network'){next.provider_group='';next.provider='';}
  if(level==='provider_group')next.provider='';
  const active=Object.values(next).some(Boolean);
  const ids=[...new Set(hierarchyRows.filter(member=>matchesHealthNetwork(member,next.health_network)&&(!next.provider_group||member.group===next.provider_group)&&(!next.provider||member.provider===next.provider)).map(member=>member.practiceId))];
  update({...next,practices:active?JSON.stringify(ids.length?ids:['unmatched-member360-hierarchy']):''});
 }
 return <>{refreshing&&<div className={styles.refreshStatus} role="status"><LoaderCircle size={17} className={styles.refreshSpinner}/>Updating dashboard results…</div>}<div className={styles.workspace} aria-busy={refreshing} inert={refreshing||undefined}>
  {hidePageHeader?<h1 className="sr-only">{title}</h1>:<div className={`ct-card ${styles.header}`}><div><span className={styles.eyebrow}>{route==='reports'?'Your reports':'Population risk'}</span><h1>{title}</h1><p>{route==='reports'?'Explore reports and save results to share with your team.':'Compare risk scores, suspected conditions and revenue opportunities.'}</p></div></div>}
  {savedId?<div className={styles.banner}><Clock3 size={18}/><span><strong>{savedQuery.data?.name}</strong> · Saved report. Values and filters stay unchanged.</span><Button variant="outline" size="sm" onClick={()=>update({saved:''})}>Return to current analysis</Button></div>:<div className={`ct-card ${styles.context}`}><div className={styles.contextTop}>
   <label className={styles.field}><span>CONTRACT</span><select aria-label="Contract" value={contract} onChange={e=>setContract(e.target.value)}><option value="">All contracts</option>{report.options.contracts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
   <label className={styles.field}><span>PROGRAM & MODEL</span><select aria-label="Program and model configuration" value={risk.configId} onChange={e=>risk.choose(e.target.value,basis)}>{risk.configurations.filter(c=>c.run_type!=='historical').map(c=><option value={c.id} key={c.id}>{configurationLabel(c)}</option>)}</select></label>
   <label className={styles.field}><span>YEAR</span><select aria-label="Reporting year" value={risk.configuration?.year} onChange={e=>{const c=configurationForYear(risk.configurations,Number(e.target.value),risk.configuration);if(c)risk.choose(c.id,basis);}}>{[...new Set(risk.configurations.map(c=>c.year))].sort((a,b)=>b-a).map(y=><option key={y}>{y}</option>)}</select></label>
   <label className={styles.field}><span>RUN MONTH</span><select aria-label="Run month" value={risk.reportMonth} onChange={e=>risk.chooseMonth(e.target.value)}><option value="all">Latest</option>{reportingMonths.map((m,i)=><option key={m} value={String(i+1).padStart(2,'0')}>{m}</option>)}</select></label>
   <label className={styles.field}><span>HEALTH NETWORK</span><select aria-label="Health Network" value={healthNetwork} onChange={e=>chooseHierarchy('health_network',e.target.value)}><option value="">All health networks</option>{networks.map(value=><option key={value}>{value}</option>)}</select></label>
   <label className={styles.field}><span>PROVIDER GROUP</span><select aria-label="Provider Group" value={providerGroup} onChange={e=>chooseHierarchy('provider_group',e.target.value)}><option value="">All provider groups</option>{groups.map(value=><option key={value}>{value}</option>)}</select></label>
   <label className={styles.field}><span>PROVIDER</span><select aria-label="Provider" value={provider} onChange={e=>chooseHierarchy('provider',e.target.value)}><option value="">All providers</option>{providers.map(value=><option key={value}>{value}</option>)}</select></label>
  </div>{filterCount>0&&<div className={styles.filterRow}>{filterCount>0&&<button className={styles.reset} onClick={reset}><X size={12}/>Reset {filterCount} filters</button>}{quadrant&&<span>{opportunityQuadrantLabel(quadrant)}</span>}{closure&&<span>{closure==='priority'?opportunityQuadrantLabel('priority'):OPPORTUNITY_LEVELS.some(level=>level===closure)?`${opportunityLevelLabel(closure)} chance of closure`:`${opportunityLevelLabel(Number(closure)<.35?'low':Number(closure)<.65?'medium':'high')} chance of closure`}</span>}{[age_band,gender,race,zip,social_need].filter(Boolean).length>0&&<span>{[age_band,gender,race,zip,social_need].filter(Boolean).join(' · ')}</span>}{(condition||conditions.length>0||category||evidence||rule)&&<span>{[...conditions,condition,CATEGORIES[category],evidence,rule].filter(Boolean).map(plainLabel).join(' · ')}</span>}</div>}</div>}
  {['analytics','scenarios'].includes(route)&&<div className={`ct-tabs ${styles.tabs}`} role="tablist" aria-label="Analytics reports">{TABS.map(t=><button key={t.id} role="tab" aria-selected={activeView===t.id} onClick={()=>tab(t.id)}>{t.label}</button>)}{activeView==='coverage'&&<button role="tab" aria-selected>Data quality</button>}</div>}
  {route==='overview'?<>
   <div className="ct-metric-grid" role="group" aria-label="Score view">{BASES.map(b=><button key={b.id} className={`ct-metric ${styles.score}`} aria-pressed={report.context.basis===b.id} onClick={()=>!savedId&&risk.choose(risk.configId,b.id)}><div className="ct-metric-label">{scoreBasisLabel(b.id,report.config.program)}</div><div className="ct-metric-value">{score(report.bases[b.id])}</div><div className="ct-metric-note">{b.note}</div></button>)}</div>
   <div className={styles.grid}><Panel title={`${scoreName} Trend`} action={<LinkAction onClick={()=>tab('risk')}>Explore risk</LinkAction>}><Trend report={report}/></Panel><Panel title="Risk Score Distribution"><Distribution report={report}/></Panel></div>
   <OverviewBreakdowns report={report} go={go} tab={tab} scoreName={scoreName}/>
   <LandingAnalyticsPanels key={report.scope_hash+report.context.snapshot} report={report} go={go} update={update} frozen={!!savedId}/>
   <Panel title="Risk Adjustment Opportunity Analysis" action={<LinkAction onClick={()=>go('/suspects')}>View all conditions</LinkAction>}><DashboardFocus categories={report.categories} onSelect={category=>go('/suspects',{category})}/></Panel>
  </>:route==='reports'?<Reports report={report} saved={savedList.data?.items||[]} launch={launchReport} openSaved={id=>{const entry=savedList.data?.items.find(s=>s.id===id);const item=report.reports.find(r=>r.id===entry?.report_id);const savedView=entry?.report_id==='registry'?'registry':item?.view||'risk';go(reportPath(savedView),{saved:id,view:savedView,report:entry?.report_id||item?.id||'R01'});}}/>:activeView==='registry'?<Registry discovery={discovery} setDiscovery={setDiscovery} report={report} selected={selected} toggle={toggle} focus={setFocused} search={search} setSearch={setSearch} category={category} setCategory={setCategory} disposition={disposition} setDisposition={setDisposition} source={source} setSource={setSource} onExport={()=>exportReport(selected.length?selected:undefined)} canExport={canExport}/>:activeView==='risk'?<RiskReport report={report} selectCondition={setCondition}/>:activeView==='geography'?<Geography report={report} chooseCounty={name=>setCounties([name])}/>:activeView==='provider'?<ProviderReport report={report} chooseProvider={id=>update({practices:JSON.stringify([id]),health_network:'',provider_group:'',provider:''})} inspectCases={id=>go('/suspects',{view:'registry',practices:JSON.stringify([id]),disposition:'open'})}/>:activeView==='suspecting'?<Suspecting report={report} selectCategory={setCategory} selectRule={setRule} selectCondition={setCondition} selectEvidence={(e,b)=>update({evidence:e,band:b})} openRegistry={()=>update({view:'registry',report:'',discovery:'any'})} selectedCategory={category}/>:activeView==='financial'?<Financial report={report} onApply={setMoney} frozen={!!savedId}/>:activeView==='raf'?<RafIntelligence report={report} error={scenarioError} selected={selected} toggle={toggle} focus={setFocused} scenario={scenario} mode={scenarioMode} setMode={setScenarioMode} operation={operation} setOperation={setOperation} calculate={calculate} busy={busy} canScenario={canScenario} configurations={risk.configurations.map(c=>({id:c.id,name:configurationLabel(c),status:c.status}))}/>:activeView==='ai'?<AiImpact report={report}/>:<Coverage report={report} freshness={freshness} setFreshness={setFreshness}/>}
  <SuspectEvidenceDrawer finding={focused} onOpenChange={open=>!open&&setFocused(null)}/>
 </div></>;
}

function RiskReport({report,selectCondition}:{report:AnalysisReport;selectCondition:(name:string)=>void}) {
 const recapture=report.prevalence.reduce((s,r)=>s+r.recaptured,0);const prior=report.prevalence.reduce((s,r)=>s+r.prior,0);
 return <><Stats items={[{label:'Average risk score',value:score(report.bases[report.context.basis]),note:`${num(report.summary.member_months)} covered months used in the average`},{label:'Median risk score',value:score(report.percentiles.median),note:'Half of scored members are below this value'},{label:'Past conditions confirmed again',value:pct(prior?recapture/prior:null),note:`${num(recapture)} of ${num(prior)} recorded conditions across members`},{label:'Members with possible additions',value:num(report.summary.capture_members),note:'Each member counted once'}]}/><RiskVisuals report={report} selectCondition={selectCondition}/><Panel title="Condition Prevalence & Recapture"><Paged rows={report.prevalence} label="Conditions and yearly confirmation" scope={report.filter_hash} headers={<><th>Condition / category</th><th>Members included</th><th>Share of members</th><th>Past conditions</th><th>Confirmed again</th><th>Still missing</th><th>Confirmed (%)</th></>} render={r=><tr key={r.name}><td><button onClick={()=>selectCondition(r.name)}><strong>{r.name}</strong></button><small>{r.hcc} · condition grouping</small></td><td>{num(r.members)}</td><td>{r.prevalence?.toFixed(1)||'0.0'}%</td><td>{num(r.prior)}</td><td>{num(r.recaptured)}</td><td>{num(r.gap)}</td><td><div className={styles.track}><i style={{width:`${r.recapture||0}%`,background:COLORS[1]}}/></div><small>{r.recapture?.toFixed(1)||'0.0'}%</small></td></tr>}/></Panel></>;
}

function Geography({report,chooseCounty}:{report:AnalysisReport;chooseCounty:(name:string)=>void}) {
 const rows=report.counties;
 return <><GeographyVisuals report={report} chooseCounty={chooseCounty}/><Panel title="County Risk Profile" info="Compare county scores and suspected conditions. Average RAF includes valid scores and gives more weight to members with more months of coverage. Each member with possible additions is counted once per county, but may have several suspects. Small groups and totals that could reveal them are hidden."><Paged rows={rows} label="Geographic risk comparisons" scope={report.filter_hash} headers={<><th>County</th><th>Members included</th><th>Score</th><th>Possible additions / 1,000</th><th>Suspected conditions</th><th>With scores</th></>} render={r=><tr key={r.id}><td><button disabled={r.suppressed} onClick={()=>chooseCounty(r.id)}>{r.name}</button></td>{r.suppressed?<td colSpan={5}>Hidden to protect small groups</td>:<><td>{num(r.eligible||0)}</td><td>{score(r.score)}</td><td>{score(r.rate,1)}</td><td>{num(r.cases||0)}</td><td>{pct(r.coverage)}</td></>}</tr>}/></Panel></>;
}

function ProviderReport({report,chooseProvider,inspectCases}:{report:AnalysisReport;chooseProvider:(id:string)=>void;inspectCases:(id:string)=>void}) {
 const [search,setSearch]=useState('');
 const [sort,setSort]=useState<keyof Pick<ProviderRow,'open_suspects'|'members'|'score'|'capture_rate'|'recapture_rate'>>('open_suspects');
 const rows=report.providers||[];
 const visible=rows.filter(row=>!row.suppressed);
 const scoreLabel=report.config.program==='MA'?'Average RAF':'Average risk score';
 const total=(key:keyof ProviderRow)=>visible.reduce((sum,row)=>sum+(typeof row[key]==='number'?Number(row[key]):0),0);
 const ratio=(numerator:number,denominator:number)=>denominator?numerator/denominator:null;
 const weightedScore=ratio(visible.reduce((sum,row)=>sum+(row.score||0)*(row.member_months||0),0),total('member_months'));
 const filtered=[...rows].filter(row=>`${row.name} ${row.practice} ${row.specialty}`.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>Number(a.suppressed)-Number(b.suppressed)||(b[sort]??-1)-(a[sort]??-1)||a.name.localeCompare(b.name));
 if(!report.providers)return <div className={styles.banner}><BookOpen size={18}/>This saved report predates provider comparisons. Return to current analysis to view provider results.</div>;
 return <>
  <Stats items={[
   {label:'Panel size',value:num(total('members')),note:`Eligible members across ${visible.length} ${visible.length===1?'provider':'providers'} shown`},
   {label:scoreLabel,value:score(weightedScore),note:'Weighted by covered months with a score'},
   {label:'Suspect capture rate',value:pct(ratio(total('captured_suspects'),total('identified_suspects'))),note:`${num(total('captured_suspects'))} confirmed / ${num(total('identified_suspects'))} identified`},
   {label:'Recapture rate',value:pct(ratio(total('recaptured_conditions'),total('prior_conditions'))),note:`${num(total('recaptured_conditions'))} of ${num(total('prior_conditions'))} past conditions confirmed again`},
  ]}/>
  <ProviderVisuals report={report} chooseProvider={chooseProvider}/>
  <Panel title="Provider Risk & Capture Performance" info="Compare providers by how often identified suspects are confirmed and last year’s conditions are documented again. These are the capture and recapture rates. Open suspects show what is still unresolved, separately from past outcomes. Small provider groups and totals that could reveal them are hidden.">
   <div className={styles.toolbar}>
    <label className={styles.search}><Search size={14}/><input aria-label="Search providers" placeholder="Find a provider, practice or specialty…" value={search} onChange={event=>setSearch(event.target.value)}/></label>
    <select className={styles.inlineSelect} aria-label="Sort providers" value={sort} onChange={event=>setSort(event.target.value as typeof sort)}>
     <option value="open_suspects">Most open suspects</option><option value="members">Largest panel</option><option value="score">Highest average score</option><option value="capture_rate">Highest capture rate</option><option value="recapture_rate">Highest recapture rate</option>
    </select>
    <span className={styles.note}>{filtered.length} providers</span>
   </div>
   <Paged rows={filtered} label="Provider performance" scope={report.filter_hash+search+sort} headers={<><th>Provider Name</th><th>Panel Size</th><th>{scoreLabel}</th><th>Suspect Capture Rate (%)</th><th>Recapture Rate (%)</th><th>Open Suspects</th></>} render={row=><tr key={row.id}>
    <td><button disabled={row.suppressed} onClick={()=>chooseProvider(row.id)}><strong>{row.name}</strong></button><small>{row.practice} · {row.specialty}</small></td>
    {row.suppressed?<td colSpan={5}>— · Small group protected</td>:<>
     <td>{num(row.members||0)}</td><td>{score(row.score)}</td><td>{pct(row.capture_rate)}<small>{num(row.captured_suspects||0)} / {num(row.identified_suspects||0)} identified</small></td>
     <td>{pct(row.recapture_rate)}<small>{num(row.recaptured_conditions||0)} / {num(row.prior_conditions||0)} past conditions</small></td>
     <td><button disabled={!row.open_suspects} aria-label={`View open suspects for ${row.name}`} onClick={()=>inspectCases(row.id)}>{num(row.open_suspects||0)} <ArrowUpRight size={12}/></button></td>
    </>}
   </tr>}/>

  </Panel>
 </>;
}

function Suspecting({report,selectCategory,selectRule,selectCondition,selectEvidence,openRegistry,selectedCategory}:{report:AnalysisReport;selectCategory:(s:string)=>void;selectRule:(s:string)=>void;selectCondition:(s:string)=>void;selectEvidence:(s:string,band:string)=>void;openRegistry:()=>void;selectedCategory:string}) {
 const [group,setGroup]=useState('category');const rows=group==='category'?report.categories:group==='rule'?report.rules:report.hccs;
 const integrity=selectedCategory==='OC'||selectedCategory==='DR';
 const evidenceRows=['Strong','Moderate','Limited','Unknown'].map(name=>({name,count:report.cases.filter(c=>c.evidence===name).length}));
 return <><Stats items={[{label:report.config.program==='MA'&&selectedCategory!=='DR'?'Suspected HCCs':'Suspects',value:num(report.config.program==='MA'&&selectedCategory!=='DR'?report.cases.filter(c=>c.hcc.startsWith('HCC ')&&c.category!=='DR').length:report.summary.cases),note:report.config.program==='MA'&&selectedCategory!=='DR'?'Mapped findings; other signals remain in Conditions list':`${num(report.summary.aliases)} document and case signals`},{label:'Members with flagged conditions',value:num(report.summary.qualified_members),note:'Included members who match a rule; each counted once'},{label:integrity?'Cases with documents':'Expected confirmations',value:integrity?num(report.summary.sources):report.summary.conditional_support.toFixed(1),note:integrity?'Original document quotes available':'If every case is reviewed within 30 days'},{label:integrity?'Cases without an estimate':'After planned reviews',value:integrity?num(report.cases.filter(c=>c.delta==null).length):report.summary.reached_support.toFixed(1),note:integrity?'Listed even when the score change is unknown':`At ${pct(report.financial.assumptions.reach,0)} reviewed · confirmed within 90 days`} ]}/><div className={styles.equalGrid}><Panel title={group==='category'?'Suspect Category Distribution':group==='rule'?'Suspect Rule Distribution':report.config.program==='MA'?'Suspected HCCs':'Risk Group Suspect Distribution'} action={<select className={styles.inlineSelect} aria-label="Suspect grouping" value={group} onChange={e=>setGroup(e.target.value)}><option value="category">By category</option><option value="rule">By rule type</option><option value="hcc">{report.config.program==='MA'?'By HCC':'By risk group'}</option></select>}><Rank rows={rows.map(r=>({name:r.name,value:r.count}))} limit={CHART_LIMITS.comparison} onSelect={name=>group==='category'?selectCategory(Object.keys(CATEGORIES).find(k=>CATEGORIES[k]===name)||'Unknown'):group==='rule'?selectRule(name):selectCondition(name)}/></Panel><Panel title={integrity?"Clinical Evidence Profile":"Confirmation Probability Distribution"}><Ring rows={integrity?evidenceRows:report.bands} label="suspects"/></Panel></div><div className={styles.equalGrid}><Panel title={integrity?(selectedCategory==='DR'?"Data Quality Assessment":"Overcoding Risk Assessment"):"Evidence Strength & Confirmation Probability"}>{integrity?<div className={styles.aiLayers}><div><ShieldCheck size={21}/><h3>{selectedCategory==='DR'?'Data Quality Validation':'Coding Integrity Validation'}</h3><p>{selectedCategory==='DR'?'Data issues do not receive a chance-of-confirmation estimate. Resolve missing or conflicting inputs before interpreting a score.':'Possible overcoding does not receive a chance-of-confirmation estimate. It remains visible even when it reduces a score.'}</p></div><div><BookOpen size={21}/><h3>{selectedCategory==='DR'?'Source Record Validation':'Clinical Evidence Assessment'}</h3><p>{selectedCategory==='DR'?'Check member identity, dates, eligibility and missing information against the original sources.':'Check whether a condition is current, how clearly it is documented and which member the source belongs to before deciding.'}</p></div></div>:<><div className={styles.matrix}><span>Evidence</span>{['High','Medium','Low','Unknown','Not applicable'].map(b=><span key={b}>{b}</span>)}{report.evidence_matrix.map(r=><Fragment key={r.evidence}><strong>{r.evidence}</strong>{['High','Medium','Low','Unknown','Not applicable'].map(b=><button key={b} title={`${r.evidence} evidence, ${b}: ${r[b]} cases`} onClick={()=>selectEvidence(r.evidence,b)} style={{background:`rgba(37,133,130,${.035+Math.min(Number(r[b])/400,.65)*.5})`}}>{num(Number(r[b]))}</button>)}</Fragment>)}</div></>}</Panel><Panel title="Condition-Level Suspect Distribution" action={<LinkAction onClick={openRegistry}>Inspect cases</LinkAction>}><Rank rows={report.conditions.map(r=>({name:r.name,value:r.count}))} limit={CHART_LIMITS.comparison} color={COLORS[1]} onSelect={selectCondition}/></Panel></div>{selectedCategory==='OC'&&report.cases.some(c=>c.authored_extension)&&<Panel title="Possible overcoding"><div className={styles.threeGrid}>{report.cases.filter((c,index,all)=>c.authored_extension&&all.findIndex(other=>other.authored_extension&&other.condition===c.condition)===index).map(c=><button key={c.id} className={styles.topic} onClick={()=>selectCondition(c.domain)}><strong>{c.condition}</strong><p>{analysisText(c.countercheck).replaceAll('representation','coding').replaceAll('represented','recorded')}</p><span aria-hidden="true"><ArrowUpRight size={17}/></span></button>)}</div></Panel>}<Panel title="Rule-Based Detection & AI Evidence Analysis"><div className={styles.aiLayers}><div><GitBranch size={21}/><h3>01 · Rule-Based Suspect Detection</h3><p>Rules check member details, source documents and condition history. Each result keeps a link to the rule and original signals.</p></div><div><Sparkles size={21}/><h3>02 · AI Evidence Analysis</h3><p>Explanations show dates, conflicting evidence and other possible interpretations. One drug, measurement or old label is not enough to confirm a diagnosis.</p></div></div><ArrowAction label="Inspect supporting evidence" onClick={openRegistry}/></Panel></>;
}

function Registry({discovery,setDiscovery,report,selected,toggle,focus,search,setSearch,category,setCategory,disposition,setDisposition,source,setSource,onExport,canExport}:{report:AnalysisReport;selected:string[];toggle:(id:string)=>void;focus:(c:SuspectCase)=>void;search:string;setSearch:(s:string)=>void;category:string;setCategory:(s:string)=>void;disposition:string;setDisposition:(s:string)=>void;source:string;setSource:(s:string)=>void;onExport:()=>void;canExport:boolean;discovery:string;setDiscovery:(value:string)=>void}) {
 return <><DiscoveryOverview report={report} value={discovery} onChange={setDiscovery}/><Panel title="Suspected Condition Registry"><div className={styles.toolbar}><label className={styles.search}><Search size={14}/><input aria-label="Search suspected conditions" placeholder="Find a condition, member or clinical signal…" value={search} onChange={e=>setSearch(e.target.value)}/></label><select className={styles.inlineSelect} aria-label="Discovery pattern" value={discovery} onChange={e=>setDiscovery(e.target.value)}><option value="all">All context gaps</option>{report.discovery_groups?.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}<option value="any">All signals</option></select><select className={styles.inlineSelect} aria-label="Suspect category" value={category} onChange={e=>setCategory(e.target.value)}><option value="">All categories</option><option value="capture">All possible additions</option><option value="Unknown">Not yet classified</option>{Object.entries(CATEGORIES).map(([k,v])=><option key={k} value={k}>{plainLabel(v)}</option>)}</select><select className={styles.inlineSelect} aria-label="Case status" value={disposition} onChange={e=>setDisposition(e.target.value)}><option value="open">Open cases</option><option value="all">All statuses</option><option value="resolved">Resolved</option><option value="unknown">Unknown status</option></select><select className={styles.inlineSelect} aria-label="Source availability" value={source} onChange={e=>setSource(e.target.value)}><option value="">All source types</option><option value="retained">Cases with documents</option></select>{canExport&&<Button variant="outline" size="sm" onClick={onExport}><ArrowDownToLine size={13}/>{selected.length?`Export ${selected.length} selected`:'Export all filtered'}</Button>}</div><CaseTable discoveryView report={report} selected={selected} toggle={toggle} focus={focus}/><p className={styles.note}>These are evidence patterns, not measured miss rates for a particular ML model. Open a condition to see why it was flagged and check its evidence. A flag does not confirm a diagnosis.</p></Panel></>;
}
function CaseMemberName({finding:c}:{finding:SuspectCase}) {
 return c.profile_reference?<Link className={styles.memberLink} href={`/member360?member=${encodeURIComponent(c.member_id)}&tab=risk`}>{c.member_name} <ArrowUpRight size={12}/></Link>:<>{c.member_name||c.member_id}</>;
}
function CaseMember({finding:c}:{finding:SuspectCase}) {
 return <small><CaseMemberName finding={c}/> · {c.member_id}</small>;
}
function CaseImpact({finding:c}:{finding:SuspectCase}) {
 if(c.profile_reference)return <span title={c.category==='OC'?'RAF at risk':'RAF contribution'}>{c.profile_reference.delta.toFixed(3)}</span>;
 return <>{c.delta==null?'—':`${c.delta>0?'+':''}${c.delta.toFixed(3)}`}</>;
}
function CaseSource({finding:c}:{finding:SuspectCase}) {
 return c.profile_reference?<small>{c.profile_reference.hcc?`HCC ${c.profile_reference.hcc}`:'—'}</small>:<small>{plainLabel(c.hcc)} · {c.aliases.length} signal{c.aliases.length>1?'s':''}</small>;
}
function CaseConfidence({finding:c}:{finding:SuspectCase}) {
 return c.profile_reference?<span title={c.category==='OC'?'Confidence in existing code':undefined}>{c.profile_reference.confidence}</span>:<>{c.probability.band}<small>{c.status==='open'?'If reviewed within 30 days':c.status}</small></>;
}
function CaseTable({report,selected,toggle,focus,limit,discoveryView=false}:{report:AnalysisReport;selected:string[];toggle:(id:string)=>void;focus:(c:SuspectCase)=>void;limit?:number;discoveryView?:boolean}) {if(discoveryView)return <DiscoveryCaseTable report={report} selected={selected} toggle={toggle} focus={focus}/>;return <Paged rows={limit?report.cases.slice(0,limit):report.cases} scope={report.filter_hash} label="Suspected condition list" headers={<><th>Select</th><th>Condition / member</th><th>Category</th><th>Evidence</th><th>Confidence / Confirmation Chance</th><th>Score Impact</th><th>Analysis date</th></>} render={c=><tr key={c.id}><td><input type="checkbox" aria-label={`Select ${c.id}`} checked={selected.includes(c.id)} onChange={()=>toggle(c.id)}/></td><td><button onClick={()=>focus(c)}>{c.condition}</button><CaseMember finding={c}/><CaseSource finding={c}/></td><td>{c.profile_reference?.category||plainLabel(c.category_label)}<small>{c.direction==='remove'?'Potential correction':c.direction==='data'?'Data issue':'Potential addition'}</small></td><td>{c.profile_reference?c.profile_reference.evidence:<>{c.evidence}<small>{c.source_available?'Document available':'Case details'}</small></>}</td><td><CaseConfidence finding={c}/></td><td><CaseImpact finding={c}/></td><td>{c.analysis_date}<small>{c.stale?'Older estimate':'Current analysis'}</small></td></tr>}/>;}
function DiscoveryCaseTable({report,selected,toggle,focus}:{report:AnalysisReport;selected:string[];toggle:(id:string)=>void;focus:(c:SuspectCase)=>void}) {
 return <Paged rows={report.cases} scope={report.filter_hash} label="Clinical context conditions list" tableClassName={styles.registryTable}
  headers={<><th>Select</th><th>HCC</th><th>Member</th><th>Gap Type</th><th>Clinical Signal</th><th>Confidence / Evidence</th><th>Score Impact</th></>}
  render={c=><tr key={c.id}>
   <td><input type="checkbox" aria-label={`Select ${c.id}`} checked={selected.includes(c.id)} onChange={()=>toggle(c.id)}/></td>
   <td className={styles.discoveryCondition}><button onClick={()=>focus(c)}>{c.profile_reference?(c.profile_reference.hcc?`HCC-${c.profile_reference.hcc}: `:''):c.hcc.startsWith('HCC ')?`${c.hcc.replace('HCC ','HCC-')}: `:''}{c.condition}</button></td>
   <td><CaseMemberName finding={c}/></td>
   <td className={styles.discoveryKind}>{c.profile_reference?.category||c.discovery?.label||'Standard signal'}{!c.profile_reference&&<small>{plainLabel(c.category_label)}</small>}</td>
   <td className={styles.discoverySignal}><span>{c.discovery?.signal||analysisText(c.summary)}</span></td>
   <td><div className={styles.confidenceValue}>{c.profile_reference?<CaseConfidence finding={c}/>:<span title={c.probability.base===null?'No confirmation percentage available':'Confirmation likelihood'}>{c.probability.base===null?'—':pct(c.probability.base,0)}</span>}<ArrowAction className={styles.discoveryLink} label={`Inspect evidence for ${c.condition}, ${c.member_name||c.member_id}`} onClick={()=>focus(c)}/></div></td>
   <td className={styles.number}><CaseImpact finding={c}/></td>
  </tr>}/>;
}


function Financial({report,onApply,frozen=false}:{report:AnalysisReport;onApply:(s:FinancialSettings)=>void;frozen?:boolean}) {
 const f=report.financial;const [draft,setDraft]=useState<FinancialSettings>(()=>financialInputs(f.assumptions));
 useEffect(()=>setDraft(financialInputs(f.assumptions)),[f.assumptions]);
 const [editing,setEditing]=useState(false);
 const openEditor=()=>{setDraft(financialInputs(f.assumptions));setEditing(true);};
 const change=(key:keyof FinancialSettings,value:number|string)=>setDraft(d=>({...d,[key]:value}));
 if(!f.dollars_available)return <><div className={styles.banner}><BookOpen size={18}/>A revenue estimate is not set up for {report.config.program}. You can still explore risk scores and suspected conditions.</div><Stats items={[{label:'Members with flagged conditions',value:num(report.summary.qualified_members),note:'Members in the selected group'},{label:'Possible additions',value:num(f.selected_count),note:'One selected finding per member'},{label:'Expected confirmations',value:report.summary.conditional_support.toFixed(1),note:'If every case is reviewed'},{label:'Program',value:report.config.program,note:'Requires its own payment calculation'}]}/><Panel title="Suspected conditions"><Rank rows={report.conditions.map(c=>({name:c.name,value:c.count}))}/></Panel></>;
 const scenarioName=(name:string)=>name==='Base'?'Expected':name;
 const supportName=(range:string)=>range==='low'?'Lower chance of confirmation':range==='high'?'Higher chance of confirmation':'Standard chance of confirmation';
 return <>
  <Stats items={[
   {label:'Total opportunity',value:usd(f.gross),note:`If all ${num(f.selected_count)} selected findings are confirmed and paid`},
   {label:'Likely opportunity',value:usd(f.support),note:'Allows for review rates and supporting evidence'},
   {label:'Coding deductions',value:usd(f.corrections),note:'Estimated reduction from correcting overcoding'},
   {label:f.partial?'Net revenue · incomplete':'Estimated net revenue',value:usd(f.net),note:f.partial?`${f.unvalued_corrections} corrections still need an estimate`:'Additional revenue after deductions, before costs'},
  ]}/>
  <div className={styles.equalGrid}>
   <Panel title="Risk-Adjusted Revenue Bridge">
    <Chart label="Total opportunity to estimated net revenue" height={285}><BarChart data={f.waterfall.map((r,i)=>({...r,name:plainLabel(r.name),range:[Math.min(r.start,r.end),Math.max(r.start,r.end)]}))} margin={{left:5,right:5,top:10,bottom:25}}><CartesianGrid vertical={false} stroke="var(--line)"/><XAxis dataKey="name" {...axis} interval={0} angle={-12} textAnchor="end" height={50}/><YAxis {...axis} tickFormatter={v=>`$${compact(Number(v))}`} width={58}/><Tooltip contentStyle={tooltipStyle} formatter={(_v,_n,p)=>usd(Math.abs(Number(p.payload.end)-Number(p.payload.start)))}/><ReferenceLine y={0} stroke="#ced7e5"/><Bar dataKey="range" name="Amount" isAnimationActive={false} radius={[3,3,0,0]} maxBarSize={55}>{f.waterfall.map((r,i)=><Cell key={r.name} fill={i===0?COLORS[0]:i===4?COLORS[1]:'#b9c6db'}/>)}</Bar></BarChart></Chart>

   </Panel>
   <Panel title="Cumulative Revenue Projection">
    <div className={styles.legend}>{['Conservative','Base','Optimistic'].map((name,i)=><span key={name}><i style={{background:COLORS[i]}}/>{scenarioName(name)}</span>)}</div>
    <Chart label="Conservative expected and optimistic revenue forecasts" height={260}><AreaChart data={f.curve} margin={{left:5,right:12,top:12,bottom:8}}><CartesianGrid vertical={false} stroke="var(--line)"/><XAxis dataKey="month" {...axis} tickFormatter={v=>new Date(`${v}-01T12:00:00`).toLocaleDateString('en-US',{month:'short'})} minTickGap={20}/><YAxis {...axis} width={58} tickFormatter={v=>`$${compact(Number(v))}`}/><Tooltip contentStyle={tooltipStyle} formatter={v=>usd(Number(v))}/>{['Conservative','Base','Optimistic'].map((name,i)=><Area key={name} name={scenarioName(name)} type="linear" dataKey={name} fill={i===1?COLORS[1]:'transparent'} fillOpacity={.08} stroke={COLORS[i]} strokeWidth={i===1?2.5:1.5} strokeDasharray={i===1?undefined:'4 4'} isAnimationActive={false}/>)}</AreaChart></Chart>
   </Panel>
  </div>
  <div className={`ct-card ${styles.forecastSummary}`}><div><strong>Forecast assumptions</strong><span>{pct(f.assumptions.reach,0)} reviewed · {pct(f.assumptions.realization,0)} payment rate · {usd(f.assumptions.benchmark)} per RAF point / month · {f.assumptions.months} months from {f.assumptions.start}</span></div><Button variant="outline" onClick={openEditor} disabled={frozen}><SlidersHorizontal size={14}/>Edit forecast</Button></div>
  <Dialog open={editing} onOpenChange={setEditing}><DialogContent className={styles.forecastDialog}><DialogHeader><div className={styles.panelTools}><DialogTitle>Edit forecast</DialogTitle><ChartInfo title="Forecast assumptions" description="Change review and payment rates to adjust the Expected forecast. The dollar amount, dates and payment timing apply to all three forecasts. Coding deductions start in the first month, and members are assumed to stay covered throughout. Evidence support estimates whether a condition will be confirmed within 90 days when reviewed within 30 days. Results are estimated revenue, not actual CMS payments, and do not include costs."/></div><DialogDescription>Adjust the Expected forecast. Apply changes to update the charts and comparison.</DialogDescription></DialogHeader>
   <form onSubmit={e=>{e.preventDefault();onApply(draft);setEditing(false);}}><fieldset disabled={frozen} style={{border:0,padding:0,margin:0}}><div className={styles.assumptions}>
    <label>Cases reviewed (%)<input aria-label="Cases reviewed percentage" required type="number" min="0" max="100" value={Math.round(draft.reach*100)} onChange={e=>change('reach',Number(e.target.value)/100)}/><small>Share reviewed within 30 days</small></label>
    <label>Expected payment rate (%)<input aria-label="Expected payment rate percentage" required type="number" min="0" max="100" value={Math.round(draft.realization*100)} onChange={e=>change('realization',Number(e.target.value)/100)}/><small>Share of likely value expected to be paid</small></label>
    <label>$ per RAF point / month<input aria-label="Dollars per RAF point per month" required type="number" min="1" max="100000" value={draft.benchmark} onChange={e=>change('benchmark',Number(e.target.value))}/><small>Per member; a planning estimate</small></label>
    <label>Forecast starts<input aria-label="Forecast starts" required type="month" value={draft.start} onChange={e=>change('start',e.target.value)}/><small>First month shown in the forecast</small></label>
    <label>Forecast length (months)<input aria-label="Forecast length in months" required type="number" min="1" max="24" value={draft.months} onChange={e=>change('months',Number(e.target.value))}/><small>How many months to include</small></label>
    <label>Payments start in month<input aria-label="Payments start in month" required type="number" min="1" max={draft.months} value={draft.recognition} onChange={e=>change('recognition',Number(e.target.value))}/><small>1 means the first forecast month</small></label>

   </div></fieldset><DialogFooter className={styles.forecastActions}><Button type="button" variant="ghost" onClick={()=>setDraft({...DEFAULT_MONEY,start:`${report.config.year}-01`})}>Reset defaults</Button><Button type="button" variant="outline" onClick={()=>setEditing(false)}>Cancel</Button><Button type="submit">Apply forecast</Button></DialogFooter></form>
  </DialogContent></Dialog>
  <Panel title="Revenue Scenario Comparison">
   <Paged rows={f.scenarios} label="Revenue forecast comparison" headers={<><th>Forecast</th><th>Cases reviewed</th><th>Payment rate</th><th>Total opportunity</th><th>Likely opportunity</th><th>Coding deductions</th><th>Net revenue</th></>} render={row=><tr key={row.name}><td><strong>{scenarioName(row.name)}</strong><small>{supportName(row.probability)}</small></td><td>{pct(row.reach,0)}</td><td>{pct(row.realization,0)}</td><td>{usd(row.gross)}</td><td>{usd(row.support)}</td><td>{usd(row.corrections)}</td><td><strong>{usd(row.net)}</strong></td></tr>}/>
  </Panel>
 </>;
}

function RafIntelligence({report,error,selected,toggle,focus,scenario,mode,setMode,operation,setOperation,calculate,busy,canScenario,configurations}:{report:AnalysisReport;error:string;selected:string[];toggle:(id:string)=>void;focus:(c:SuspectCase)=>void;scenario:ScenarioOutput|null;mode:string;setMode:(s:string)=>void;operation:string;setOperation:(s:string)=>void;calculate:()=>void;busy:boolean;canScenario:boolean;configurations:{id:string;name:string;status:string}[]}) {
 return <><ScoreVisuals report={report}/><Panel title="Risk Score Scenario Modeling" action={<ModelDetails configurations={configurations}/>} info="Try different score assumptions without changing member records. A model calculation needs supporting clinical evidence, checked code mappings and a supported model. See Model details for available configurations. Clinical confirmation requirements still apply."><div className={styles.toolbar}><select className={styles.inlineSelect} aria-label="Scenario calculation mode" value={mode} onChange={e=>setMode(e.target.value)}><option value="illustrative">Planning estimate</option><option value="calculated">Model calculation using documents</option></select><select className={styles.inlineSelect} aria-label="Scenario operation" value={operation} onChange={e=>setOperation(e.target.value)} disabled={mode==='calculated'}><option value="combined">Additions & corrections</option><option value="add">Additions only</option><option value="remove">Corrections only</option></select><span style={{fontSize:13,color:'#667284'}}>{selected.length} selected conditions</span>{canScenario&&<Button size="sm" onClick={calculate} disabled={busy||!selected.length}>{busy?<LoaderCircle size={14} className="animate-spin"/>:<Layers3 size={14}/>}Calculate & save scenario</Button>}</div>{error&&<div className={styles.error} role="alert" style={{marginBottom:20}}>{error}</div>}{scenario&&<div style={{marginBottom:20}}><Stats items={scenario.mode==='calculated'?[{label:'Members calculated',value:num(scenario.result?.member_count||0),note:'Members with the required model inputs'},{label:'Findings used',value:num(scenario.result?.finding_count||0),note:'Related findings combined for each member'},{label:'Average score change',value:score(scenario.result?.selected_cohort_weighted_delta,4),note:'Selected members and score type'},{label:'Clinical change',value:'None',note:'No member records are changed'}]:[{label:'Baseline',value:score(scenario.baseline,6),note:'Same members and covered months'},{label:'Scenario',value:score(scenario.potential,6),note:'Planning estimate with selected findings'},{label:'Average change',value:score(scenario.delta,6),note:`${scenario.cases} findings used`},{label:'Findings not used',value:num(scenario.exclusions?.length||0),note:'Original findings stay unchanged'}]}/></div>}<CaseTable report={report} selected={selected} toggle={toggle} focus={focus}/><p className={styles.note}>Model calculation needs a supported model and the required source documents. Use Planning estimate to explore cases without complete model inputs.</p></Panel></>;
}

function AiImpact({report}:{report:AnalysisReport}) {
 const m=report.ai.metrics;
 return <><div className={styles.banner}><ShieldCheck size={18}/><span>Reference comparison · 200 charts, 100 with AI and 100 without. These results stay the same when you filter the population.</span></div><Stats items={[{label:'AI flags supported by evidence',value:pct(m.ai_precision),note:'108 supported flags / 135 AI flags'},{label:'Known conditions found by AI',value:pct(m.ai_recall),note:'108 found / 120 known conditions'},{label:'AI flags confirmed by reviewers',value:pct(m.human_confirmation_yield,2),note:'105 reviewer confirmations / 135 AI flags'},{label:'Less review time',value:pct(m.review_time_reduction),note:'36 → 22 minutes per chart'}]}/><AiVisuals report={report}/><Panel title="AI Performance Comparison"><Paged rows={[
  {name:'Supported flags (precision)',manual:pct(m.manual_precision),assisted:pct(m.assisted_precision),definition:'Supported flags / all flags in each reviewer arm'},
  {name:'Known conditions found (recall)',manual:pct(m.manual_recall),assisted:pct(m.assisted_recall),definition:'Conditions found / known conditions in each reviewer arm'},
  {name:'Mean review time',manual:`${m.manual_mean_minutes} min`,assisted:`${m.assisted_mean_minutes} min`,definition:'Mean minutes per chart; 100 charts per arm'},
  {name:'AI flags confirmed by reviewers',manual:'Not applicable',assisted:pct(m.human_confirmation_yield,2),definition:'105 reviewer confirmations / 135 AI flags'},
  {name:'AI detection reference',manual:'Not applicable',assisted:'108 correct · 27 incorrect · 12 missed',definition:'1,000 checks; 853 correctly left unflagged'},
 ]} label="AI reference results" headers={<><th>Measure</th><th>Manual</th><th>AI-assisted</th><th>Calculation</th></>} render={r=><tr key={r.name}><td><strong>{r.name}</strong></td><td>{r.manual}</td><td>{r.assisted}</td><td>{r.definition}</td></tr>}/></Panel></>;
}

function Reports({report,saved,launch,openSaved}:{report:AnalysisReport;saved:SavedAnalysis[];launch:(r:AnalysisReport['reports'][number])=>void;openSaved:(id:string)=>void}) {
 return <><div className={styles.reportGrid}>{report.reports.map((r,i)=><button key={r.id} className={styles.reportCard} onClick={()=>launch(r)}><span><FileBarChart2 size={17}/>{r.id} · {i<5?'POPULATION RISK':i<9?'OPPORTUNITIES':'DATA & RESULTS'}</span><h3>{reportCopy[r.id]?.title||r.title}</h3><p>{reportCopy[r.id]?.question||r.question}</p><small aria-hidden="true"><ArrowUpRight size={17}/></small></button>)}</div><Panel title="Saved reports">{saved.length?<Paged rows={saved} label="Saved reports" headers={<><th>Report name</th><th>Report</th><th>Saved</th><th>Report reference</th><th>Action</th></>} render={r=><tr key={r.id}><td>{r.name}</td><td>{r.report_id||'Restricted'}</td><td>{new Date(r.created_at).toLocaleString()}</td><td>{r.snapshot_hash?.slice(0,12)||'Restricted'}</td><td><button disabled={!r.available} onClick={()=>openSaved(r.id)}>{r.available?'Open saved report':'You do not have access'}</button></td></tr>}/>:<div className={styles.banner}><Save size={20}/><div><strong>Your report library is ready</strong><p>Open a report and choose Save report to keep a copy of its results.</p></div></div>}</Panel></>;
}
function Coverage({report,freshness,setFreshness}:{report:AnalysisReport;freshness:string;setFreshness:(s:string)=>void}) {
 const s=report.summary;
 return <><Stats items={[{label:'Members included',value:num(s.eligible),note:`${num(s.enrolled)} total members`},{label:'Members with scores',value:pct(s.coverage),note:`${num(s.scored)} with scores / ${num(s.eligible)} included`},{label:'Members with outdated scores',value:num(s.stale),note:'Not included when using current scores only'},{label:'Cases with documents',value:num(s.sources),note:`${num(s.cases-s.sources)} use case details`} ]}/><Panel title="Data Lineage & Methodology" action={<select aria-label="Which scores to include" className={styles.inlineSelect} value={freshness} onChange={e=>setFreshness(e.target.value)}><option value="fresh">Current scores only</option><option value="last_available">Include older scores</option></select>}><MethodNotes report={report}/></Panel><Panel title="Metric Reconciliation"><Paged rows={Object.entries(report.metrics)} label="Calculation details" headers={<><th>Metric</th><th>Value</th><th>Amount counted</th><th>Total used</th><th>Unit</th><th>Version</th></>} render={([id,m])=><tr key={id}><td>{metricNames[id]||id}<small>{id}</small></td><td>{m.value==null?'Unavailable':Number(m.value.toFixed(6))}</td><td>{m.numerator==null?'Not applicable':Number(m.numerator.toFixed(6))}</td><td>{m.denominator==null?'Not applicable':num(m.denominator)}</td><td>{({members:'Members',ratio:'Share (0–1)',score:'Risk score',canonical_cases:'Conditions',expected_cases:'Expected cases'} as Record<string,string>)[m.unit]||m.unit}</td><td>{m.definition_version}</td></tr>}/></Panel></>;
}
