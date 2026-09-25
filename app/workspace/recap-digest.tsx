import {useEffect,useState} from 'react';
import {baseDigest,parseDigest,type Digest} from '../recap-digest';
import {marketMetrics} from '../desk-model';
import {publicRoot,type Day} from '../recap-source';
import './recap-digest.css';
import {ThemeTotals} from './market-context';
const cache=new Map<string,{value:Digest;at:number}>();
const Missing=()=> <p className="digest-missing">同日资料暂未提供这一项，可展开原文核对。</p>;
export default function RecapDigest({day}:{day?:Day}){
 const [loaded,setLoaded]=useState<{key:string;value:Digest}|null>(null),[state,setState]=useState(''),[allPlans,setAllPlans]=useState(false),[retry,setRetry]=useState(0);
 const key=day?.date+'|'+day?.url+'|'+day?.updatedAt;
 useEffect(()=>{
  setAllPlans(false);if(!day?.url){setState('');return}
  const cached=cache.get(key);if(!retry&&cached&&Date.now()-cached.at<120000){setLoaded({key,value:cached.value});setState('');return}
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);let active=true;
  setState('正在整理同日原文…');
  void (async()=>{try{const url=new URL(day.url!);if(!url.href.startsWith(publicRoot+'pages/'))throw Error('原文地址不属于复盘资料库');const r=await fetch(url.href,{signal:controller.signal,cache:'no-store',credentials:'omit'});if(!r.ok)throw Error('原文读取失败');const value=parseDigest(await r.text(),day);if(active){cache.set(key,{value,at:Date.now()});setLoaded({key,value});setState('')}}catch{if(active)setState('暂时无法读取完整原文，先展示已同步摘要；其余项目待资料恢复。')}finally{clearTimeout(timeout)}})();
  return()=>{active=false;clearTimeout(timeout);controller.abort()};
 },[key,retry]);
 const data=loaded?.key===key?loaded.value:baseDigest(day),metrics=marketMetrics(day),get=(k:string)=>metrics.find(([name])=>name===k)?.[1]||'—';
 const plans=allPlans?data.plans:data.plans.slice(0,4);
 return <div className="recap-digest"><p className="digest-context">{day?.date||'所选日'} · 同日复盘浓缩版。场景和预案沿用原文，供下一交易日核对。</p>{state&&<p role="status" className="digest-load-state">{state}{state.startsWith('暂时')&&<button className="digest-more" onClick={()=>setRetry(n=>n+1)}>重试整理</button>}</p>}
 <div className="digest-overview"><article className="digest-section"><h3><span>01</span>今日大盘</h3><p className="digest-headline">{data.headlines.market||'待当日复盘'}</p><div className="digest-indices">{metrics.slice(0,4).map(([k,v])=><div key={k}><span>{k}</span><strong>{v}</strong></div>)}</div><p className="digest-facts">量能 {get('沪指量能')}（原文口径） · 上涨/下跌 {get('腾落数（上涨-下跌）')}</p>{data.marketPoints.find(s=>/分化|主线竞争/.test(s))&&<p className="digest-note">{data.marketPoints.find(s=>/主线竞争/.test(s))||data.marketPoints.find(s=>/分化/.test(s))}</p>}</article>
 <article className="digest-section"><h3><span>02</span>今日情绪</h3><p className="digest-headline">{data.headlines.emotion||'待当日复盘'}</p><div className="digest-emotion-facts">{[['涨停/跌停',get('极端腾落数（涨停-跌停）')],['封板率',get('封板率')],['高度板',get('高度板')],['断板',get('断板')]].map(([k,v])=><div key={k}><span>{k}</span><strong>{v}</strong></div>)}</div><p className="digest-facts">首板 {get('一板')} · 二板 {get('二板')} · 三板 {get('三板')}</p>{data.emotionPoints.length>0&&<p className="digest-note">{data.emotionPoints.at(-1)}</p>}</article></div>
 <article className="digest-section"><h3><span>03</span>题材梯队</h3>{data.themes.length?<div className="digest-themes">{data.themes.map(t=><div className="digest-theme" key={t.name}><div className="digest-theme-heading"><strong>{t.name}</strong><span>{t.role}</span></div><ThemeTotals name={t.name} date={day?.date||''}/><ul>{t.ladder.map(s=><li key={s.name}><b>{s.name}</b><span>{s.board}</span><small>{s.role}</small></li>)}</ul>{t.outlook&&<p>次日：{t.outlook}</p>}</div>)}</div>:<Missing/>}</article>
 <article className="digest-section"><h3><span>04</span>关注标的<small>保留原文分级与风险观察票</small></h3>{data.stocks.length?<div className="digest-stocks">{data.stocks.map(s=><div key={s.name}><strong>{s.name}<small>{s.level}</small></strong><span>{s.theme} · {s.role}</span></div>)}</div>:<Missing/>}</article>
 <article className="digest-section"><h3><span>05</span>四种场景<small>确认信号 → 动作 → 撤退条件</small></h3>{data.scenarios.length?<div className="digest-scenarios">{data.scenarios.map(s=><section key={s.name}><h4>{s.name}<span>{s.level}</span></h4><dl><div><dt>确认</dt><dd>{s.signal||'原文待补'}</dd></div><div><dt>动作</dt><dd>{s.action||'原文待补'}</dd></div><div><dt>撤退</dt><dd>{s.exit||'原文待补'}</dd></div></dl></section>)}</div>:<Missing/>}</article>
 <article className="digest-section"><h3><span>06</span>交易预案<small>原复盘计划</small></h3>{data.headlines.plan&&<p className="digest-headline">{data.headlines.plan}</p>}{data.planPoints.length>0&&<ul className="digest-plan-points">{data.planPoints.map(p=><li key={p}>{p}</li>)}</ul>}{plans.length?<><div className="digest-plans">{plans.map(p=><section key={p.stock}><h4>{p.stock}<span>{p.type}</span></h4><dl><div><dt>进场/持有</dt><dd>{p.entry||'原文待补'}</dd></div><div><dt>退出</dt><dd>{p.exit||'原文待补'}</dd></div><div className="digest-plan-risk"><dt>最大亏损</dt><dd>{p.maxLoss||'原文待填'}</dd></div></dl></section>)}</div>{data.plans.length>4&&<button className="digest-more" aria-expanded={allPlans} onClick={()=>setAllPlans(!allPlans)}>{allPlans?'收起其余预案':`展开其余 ${data.plans.length-4} 项预案`} · 共 {data.plans.length} 项</button>}</>:!data.planPoints.length&&<Missing/>}</article>
 </div>
}
