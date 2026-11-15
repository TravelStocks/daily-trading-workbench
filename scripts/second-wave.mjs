// Archive each session so historical views never use the following day's signals.
const start='2026-11-09';
const positive=n=>Number.isFinite(n)&&n>0;
const complete=p=>p?.complete===true&&Array.isArray(p.stocks);
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
  r.reversal=date===r.entry?'新断板，观察下一交易日':'非断板次日';
  r.status=r.bounds?'平台内观察':'平台未形成';
  if(!traded(q)){r.window=[];r.status='行情待核，留池';missing.push(r.name+'：收盘行情缺失或停牌');if(prev===r.entry)r.reversal='待核';continue}
  if(q.source)sources.add(q.source);
  // Unadjusted OHLC: discard incompatible levels across corporate actions / price gaps in evidence.
  const aligned=positive(y?.close)&&Number.isFinite(q.pct)&&Math.abs(q.close-y.close*(1+q.pct/100))<=Math.max(.012,y.close*.00015);
  if(!aligned){r.window=[];r.bounds=null;r.boardClose=null;r.status='价格口径待核，重建平台';missing.push(r.name+'：价格序列不可比');}
  if(prev===r.entry)r.reversal=!complete(current)||!positive(r.boardClose)||!aligned?'反包待核':limits.has(r.code)&&q.close>=r.boardClose?'收复前板并封板，主动性待核':'未见收复前板并封板';
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
  const s=waveDay({date,prev,prior:pools[prev],current:pools[date],quotes,last:checkpoint});
  if(date!==start&&!snapshots[prev])s.missing.push('上个交易日名单未衔接');
  snapshots[date]=s;
  const row=(r,action)=>[r.name+' '+r.code,r.height,r.entry,action,r.close,r.bounds?`${r.bounds.low}–${r.bounds.high}（${r.bounds.from} 至 ${r.bounds.to}）`:'尚无可核平台',r.status,r.reversal];
  const section={id:'second-wave-watch',title:'龙头二波 · 每日观察池',columns:['标的','首波连板','断板日','名单变化','收盘','参考平台','平台突破路径','断板反包路径'],rows:[...Object.values(s.pool).map(r=>row(r,s.added.includes(r.code)?'新增':'留池')),...s.removed.map(r=>row(r,'移出'))],status:s.missing.length?'partial':'complete',sources:s.sources,note:`新增 ${s.added.length} · 留池共 ${Object.keys(s.pool).length} · 今日移出 ${s.removed.length}。按收盘核对；暂以断板起连续三个交易日高低区间有交集时的总上下沿作为参考平台，形成后固定，不滚动下移。反包独立看断板次日封板并收复前板收盘。两者均不确认龙头地位。`+(s.missing.length?' 待核：'+s.missing.join('；'):'')};
  day.sections=[...day.sections.filter(x=>x.id!==section.id),section];
  day.gaps=day.gaps.filter(x=>x.id!==section.id);
  if(s.missing.length)day.gaps.push({id:section.id,title:section.title,status:'partial',note:s.missing.join('；')});
  day.status=day.gaps.length?'partial':'complete';
 }
 base.secondWave=snapshots;
}
