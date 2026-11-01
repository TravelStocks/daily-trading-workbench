// Rank signals implement the user's research model, not confirmed trade signals.
export const FACTOR_SOURCE='https://www.duanxianxia.com/web/platerotat';
export const FACTOR_REFERENCE='https://travelstocks.github.io/MESSI-10-Trading-System/资料库%20-%20龙头周期复盘/index.html#patterns';
const finite=Number.isFinite;
const norm=s=>s.replace(/概念|产业链/g,'');
export function rankObservation(snapshot,code){
  const rows=snapshot?.rows||[];
  const valid=snapshot?.complete&&[1,2,3,4].every(n=>rows.some(r=>r.rank===n))&&new Set(rows.map(r=>r.code)).size===rows.length;
  if(!valid)return {rank:null,strength:null,high:null};
  const row=rows.find(r=>r.code===code);
  return {rank:row?.rank??null,strength:row?.strength??null,high:row?row.rank<=4:false};
}
export function firstHigh(sessions,index,code,ranks,provider){
  const window=sessions.slice(Math.max(0,index-9),index+1);
  const points=window.map(d=>ranks[d]?.provider===provider?rankObservation(ranks[d],code):{high:null});
  if(points.at(-1)?.high!==true)return null;
  if(points.slice(0,-1).some(p=>p.high===true))return false;
  return window.length===10&&points.every(p=>p.high!==null)?true:null;
}
export function buildThemeFactor({date,sessions,ranks={},themes={},quotes={}}){
  const calendar=sessions.filter(d=>d<=date),window=calendar.slice(-10),provider=ranks[date]?.provider||'duanxianxia';
  const universe=new Map(window.flatMap(d=>ranks[d]?.provider===provider?(ranks[d].rows||[]).filter(r=>r.rank<=4):[]).map(r=>[r.code,r]));
  const items=[...universe.values()].map(theme=>{
    const points=window.map(d=>({date:d,...(ranks[d]?.provider===provider?rankObservation(ranks[d],theme.code):{rank:null,strength:null,high:null})}));
    const states=points.map(p=>p.high),today=points.at(-1);
    const matches=pattern=>states.length>=pattern.length&&pattern.every((p,i)=>states.at(-pattern.length+i)===p);
    const signals=[];
    if(matches([true,false,true]))signals.push('分歧后回流');
    if(matches([true,true,false,true]))signals.push('续强后回流');
    let streak=0;for(let i=states.length-1;i>=0&&states[i]===true;i--)streak++;
    if(streak>=3)signals.push('一直不弱');
    const starts=window.filter(d=>firstHigh(calendar,calendar.indexOf(d),theme.code,ranks,provider)===true);
    const start=starts.at(-1)||null,offset=start?calendar.indexOf(date)-calendar.indexOf(start):null;
    const first=firstHigh(calendar,calendar.length-1,theme.code,ranks,provider);
    const groups=d=>(themes[d]||[]).filter(g=>g.name.split(/[\/、]/).some(n=>norm(n)===norm(theme.name)));
    const candidates=new Map();
    for(const d of window){
      const stocks=groups(d).flatMap(g=>g.stocks),max=Math.max(0,...stocks.map(s=>s.boards||0));
      if(max<2)continue;
      for(const s of stocks.filter(s=>s.boards===max))if(!candidates.has(s.code))candidates.set(s.code,{code:s.code,name:s.name,selectedDate:d,selectedBoards:s.boards});
    }
    const leaders=[...candidates.values()].map(s=>({...s,role:'最高连板观察样本，非确认龙头',points:window.map((d,i)=>{
      const q=quotes[s.code]?.[d],prev=quotes[s.code]?.[window[i-1]];
      const sameSource=q?.source&&prev?.source&&new URL(q.source).hostname===new URL(prev.source).hostname;
      return {date:d,pct:q?.pct??null,amount:q?.amount??null,volume:q?.volume??null,turnover:q?.turnover??null,source:q?.source??null,volumeRatio:sameSource&&finite(q?.volume)&&prev?.volume>0?Number((q.volume/prev.volume).toFixed(2)):null};
    })}));
    for(const p of points){const gs=groups(p.date);p.limitUps=gs.length?new Set(gs.flatMap(g=>g.stocks.map(s=>s.code))).size:null;}
    let next='未出现已核验持续性结构，继续观察。';
    if(first===true)next='十日内首次高强度：可能启动；跟踪第2、第3个交易日，不直接判主升。';
    else if(offset===1)next=today.high===true?'第2日续强：观察后续分歧承接与回流。':'第2日未续强或待核：第3日观察能否回到前四。';
    else if(offset===2)next=signals.length?'第3日已出现模型信号，核对同日核心量能、封板与后排反馈。':'第3日尚未确认持续性结构；不把一次启动当成延续。';
    else if(signals.length)next='已出现排名结构信号；仍需核验龙头量能与题材共振，不自动构成买点。';
    else if(streak===2)next='前两日连续高强度：有续强证据，尚未出现分歧后的回流节点。';
    else if(today.high&&first===null)next='当前高强度；十日历史不足，首次启动待核。';
    return {code:theme.code,name:theme.name,rank:today.rank,strength:today.strength,high:today.high,firstHigh:first,startDate:start,dayNumber:offset===null?null:offset+1,streak,signals,next,points,leaders};
  }).sort((a,b)=>Number(b.firstHigh===true)-Number(a.firstHigh===true)||Number(b.high===true)-Number(a.high===true)||(a.rank??999)-(b.rank??999)||a.code.localeCompare(b.code));
  const missing=window.filter(d=>ranks[d]?.provider!==provider||rankObservation(ranks[d],'_').high===null);
  const complete=window.length===10&&!missing.length&&items.every(t=>t.points.every(p=>p.limitUps!==null)&&t.leaders.length&&t.leaders.every(s=>s.points.slice(-3).every(p=>finite(p.amount))));
  const factor={date,provider,window,items,rankCoverage:window.length-missing.length,missing,reference:FACTOR_REFERENCE};
  return {id:'leader-theme-factor',title:'龙头题材因子分析',priority:'超重点',status:!items.length?'missing':complete?'complete':'partial',
    columns:['题材','今日排名','首次高强度','持续性信号','次日核验'],rows:items.map(t=>[t.name,t.rank,t.firstHigh===true?'十日首次':t.firstHigh===null?'待核':'非首次',t.signals.join(' / ')||'观察中',t.next]),
    note:'前四为高强度，前三优先。十日含当日，按真实交易日；未进前四只代表非高强度，不等于已确认分歧。排名结构是研究信号，龙头身份及量能共振仍须验证。',
    sources:[FACTOR_SOURCE,'https://www.duanxianxia.com/web/fupan',FACTOR_REFERENCE],factor};
}
