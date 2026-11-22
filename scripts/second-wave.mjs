// Archive each session so historical views never use the following day's signals.
import {waveThemeEvidence} from './second-wave-themes.mjs';
const start='2026-11-09';
const positive=n=>Number.isFinite(n)&&n>0;
const complete=p=>p?.complete===true&&Array.isArray(p.stocks);
function reversalText(r){
 const e=r.reversalEvent;
 if(e)return `重点 · ${e.date} 断板次日反包涨停；${e.recovered===null?'收复前板情况待核':e.recovered?`已收复前板收盘 ${e.boardClose}`:`尚未收复前板收盘 ${e.boardClose}`}；主动性待核`;
 return r.reversalCheck?`${r.reversalCheck.date} ${r.reversalCheck.result}`:'尚无已核实的断板次日反包记录';
}
export function waveDay({date,prev,prior,current,quotes,last}){
 const pool=Object.fromEntries(Object.entries(last?.pool||{}).map(([k,r])=>[k,{...r}]));
 const added=[],removed=[],missing=[],sources=new Set([prior?.source,current?.source].filter(Boolean));
 const comparable=complete(prior)&&complete(current)&&prior.scopeKey===current.scopeKey;
 const limits=new Set(current?.stocks?.map(r=>r.code));
 const bar=(c,d)=>quotes[c]?.[d];
 const traded=q=>positive(q?.close)&&positive(q?.volume);
 if(!comparable)missing.push('相邻交易日的完整同范围涨停池待核');
 if(comparable)for(const s of prior.stocks){
  if(s.boards<3||!Number.isInteger(s.boards)||limits.has(s.code))continue;
  if(!traded(bar(s.code,date))){missing.push(s.name+'：未核实当日交易，不能认定断板');continue}
  pool[s.code]={code:s.code,name:s.name,height:s.boards,entry:date,boardClose:bar(s.code,prev)?.close??null,window:[],bounds:null};
  added.push(s.code);
 }
 for(const r of Object.values(pool)){
  const q=bar(r.code,date),y=bar(r.code,prev);
  r.close=traded(q)?q.close:null;
  r.reversal=date===r.entry?'新断板，观察下一交易日':reversalText(r);
  r.status=r.bounds?'平台内观察':'平台未形成';
  if(!traded(q)){r.window=[];r.status='行情待核，留池';missing.push(r.name+'：收盘行情缺失或停牌');if(prev===r.entry){r.reversalCheck={date,result:'反包待核'};r.reversal=reversalText(r)}continue}
  if(q.source)sources.add(q.source);
  // Unadjusted OHLC: discard incompatible levels across corporate actions / price gaps in evidence.
  const aligned=positive(y?.close)&&Number.isFinite(q.pct)&&Math.abs(q.close-y.close*(1+q.pct/100))<=Math.max(.012,y.close*.00015);
  if(!aligned){r.window=[];r.bounds=null;r.boardClose=null;r.status='价格口径待核，重建平台';missing.push(r.name+'：价格序列不可比');}
  if(prev===r.entry){
   r.reversalCheck={date,result:!comparable?'反包待核':limits.has(r.code)?'次日封板':'未见次日收盘封板'};
   if(comparable&&limits.has(r.code))r.reversalEvent={date,breakDate:r.entry,close:q.close,boardClose:r.boardClose,recovered:aligned&&positive(r.boardClose)?q.close>=r.boardClose:null,sources:[...new Set([prior.source,current.source,q.source,y?.source].filter(Boolean))]};
   r.reversal=reversalText(r);
  }
  if(r.bounds&&q.close<r.bounds.low){r.status='收盘跌破平台下沿';removed.push(r);delete pool[r.code];continue}
  if(r.bounds&&q.close>r.bounds.high)r.status='收盘突破，核心地位与主动性待核';
  if(!r.bounds&&positive(q.low)&&positive(q.high)&&q.high>=q.low){
   r.window=[...r.window,{date,low:q.low,high:q.high}].slice(-3);
   if(r.window.length===3&&Math.max(...r.window.map(b=>b.low))<=Math.min(...r.window.map(b=>b.high))){
    r.bounds={low:Math.min(...r.window.map(b=>b.low)),high:Math.max(...r.window.map(b=>b.high)),from:r.window[0].date,to:date};
    r.status='形成参考平台';r.window=[];
   }
  }else if(!r.bounds)r.window=[];
 }
 return {pool,added,removed,missing,sources:[...sources]};
}
export function attachWave(base,{from=start,end=base.sessions.at(-1)}={}){
 const snapshots=base.secondWave||={},pools=base.crowdingWatch.pools,quotes=base.quoteCache.stocks;
 for(let i=1;i<base.sessions.length;i++){
  const date=base.sessions[i],prev=base.sessions[i-1],day=base.days[date];
  if(date<start||date>end||!day)continue;
  if(date<from&&snapshots[date])continue;
  // At the rolling calendar boundary the existing snapshot is the checkpoint.
  if(date!==start&&!snapshots[prev]&&snapshots[date])continue;
  const checkpoint=snapshots[prev]||snapshots[Object.keys(snapshots).filter(d=>d<date).sort().at(-1)];
  const saved=snapshots[date],retained=[],inherited={...(checkpoint?.pool||{})};
  const comparable=complete(pools[prev])&&complete(pools[date])&&pools[prev].scopeKey===pools[date].scopeKey;
  // Replaying a source outage must not erase an already verified admission.
  for(const code of saved?.added||[]){
   const r=saved.pool?.[code],q=quotes[code]?.[date];
   if(r?.entry===date&&(!comparable||!positive(q?.close)||!positive(q?.volume))){
    inherited[code]={...r,window:[],bounds:null};retained.push(code);
   }
  }
  const s=waveDay({date,prev,prior:pools[prev],current:pools[date],quotes,last:{...checkpoint,pool:inherited}});
  // A temporary replay outage cannot erase an already verified dated reversal.
  for(const old of [...Object.values(saved?.pool||{}),...saved?.removed||[]]){
   const r=s.pool[old.code]||s.removed.find(r=>r.code===old.code),q=quotes[old.code]?.[date];
   if(r?.entry===old.entry&&old.reversalEvent?.date===date&&!r.reversalEvent&&(!comparable||!positive(q?.close)||!positive(q?.volume))){
    r.reversalEvent=structuredClone(old.reversalEvent);r.reversal=reversalText(r);
    s.missing.push(`${r.name}：本次证据不完整，保留此前已核实的 ${date} 次日反包`);
   }
  }
  if(retained.length){
   s.added=[...new Set([...s.added,...retained.filter(code=>s.pool[code])])];
   s.sources=[...new Set([...s.sources,...saved.sources||[]])];
   s.missing.push('本次证据不完整，保留此前已核实入池：'+retained.map(code=>inherited[code].name).join('、'));
  }
  if(date!==start&&!snapshots[prev])s.missing.push('上个交易日名单未衔接');
  snapshots[date]=s;
  const active=Object.values(s.pool).sort((a,b)=>(b.reversalEvent?.date||'').localeCompare(a.reversalEvent?.date||'')||b.entry.localeCompare(a.entry)||a.code.localeCompare(b.code));
  const focus=active.filter(r=>r.reversalEvent).map(r=>({code:r.code,name:r.name,date:r.reversalEvent.date,entry:r.entry,height:r.height,close:r.reversalEvent.close,boardClose:r.reversalEvent.boardClose,recovered:r.reversalEvent.recovered}));
  const themeEvidence=Object.fromEntries([...active,...s.removed].map(r=>[r.code,waveThemeEvidence(base,r,date)]));
  const row=(r,action)=>[r.name+' '+r.code,r.reversalEvent?`${action==='移出'?'历史信号':'重点'} · ${r.reversalEvent.date} 次日反包`:'普通观察',themeEvidence[r.code].text,r.height,r.entry,action,r.close,r.bounds?`${r.bounds.low}–${r.bounds.high}（${r.bounds.from} 至 ${r.bounds.to}）`:'尚无可核平台',r.status,r.reversal];
  s.sources=[...new Set([...s.sources,...active.flatMap(r=>r.reversalEvent?.sources||[])])];
  const themeMissing=Object.values(themeEvidence).filter(t=>t.missing).length;
  const section={id:'second-wave-watch',title:'龙头二波 · 每日观察池',
   columns:['标的','重点信号','题材强度','首波连板','断板日','名单变化','收盘','参考平台','平台突破路径','断板反包路径'],
   rows:[...active.map(r=>row(r,s.added.includes(r.code)?'新增':'留池')),...s.removed.map(r=>row(r,'移出'))],focus,themeEvidence,
   status:s.missing.length||themeMissing?'partial':'complete',sources:[...new Set([...s.sources,...Object.values(themeEvidence).flatMap(t=>t.sources)])],
   note:`新增 ${s.added.length} · 留池共 ${Object.keys(s.pool).length} · 重点 ${focus.length} · 今日移出 ${s.removed.length}。断板次日封板重点持续保留；参考平台收盘跌破移出。题材沿用首波归属，涨停家数取同日复盘分组，缺项用已标注的同花顺同名概念统计；强度取短线侠。括号为较前一交易日变化，不同口径不比较，未单列不算零。家数与强度同步回升仅供二次爆发观察，不确认买点。`+(s.missing.length?' 待核：'+s.missing.join('；'):'')+(themeMissing?` ${themeMissing} 只题材归属或当日强度缺少来源。`:'')};
  day.sections=[...day.sections.filter(x=>x.id!==section.id),section];
  day.gaps=day.gaps.filter(x=>x.id!==section.id);
  if(s.missing.length||themeMissing)day.gaps.push({id:section.id,title:section.title,status:'partial',note:[...s.missing,...(themeMissing?[`${themeMissing} 只题材归属或当日强度缺少来源`]:[])].join('；')});
  day.status=day.gaps.length?'partial':'complete';
 }
 base.secondWave=snapshots;
}
