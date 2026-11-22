const rankSource='https://www.duanxianxia.com/web/platerotat';
const groupSource='https://www.duanxianxia.com/web/fupan';
const aliases={'半导体':'芯片','传媒':'文化传媒','“东方系”':'名称炒作','东方系':'名称炒作'};
const norm=name=>{const n=name.replace(/概念|产业链/g,'').trim();return aliases[n]||n};
const parts=name=>name.split(/[\/、]/).map(norm);
const finite=Number.isFinite;
const signed=n=>(n>0?'+':'')+n;

// Freeze attribution to the first wave, not whichever unrelated theme is hot today.
export function waveThemeAssociation(base,row){
 const dates=base.sessions.filter(d=>d<row.entry).slice(-row.height).reverse();
 const themes=base.themeFactorInputs?.themes||{};
 for(const date of dates){
  const groups=(themes[date]||[]).filter(g=>g.name!=='其他概念'&&g.stocks.some(s=>s.code===row.code));
  if(!groups.length)continue;
  return {date,groups:groups.map(g=>({name:g.name,reason:g.stocks.find(s=>s.code===row.code)?.reason||''})),source:groupSource};
 }
 return null;
}

function indices(base,group,date){
 const catalog=new Map();
 for(const [d,s] of Object.entries(base.themeFactorInputs?.ranks||{}).sort())if(d<=date&&s.provider==='duanxianxia')for(const r of s.rows||[])catalog.set(norm(r.name),{code:r.code,name:r.name});
 let names=parts(group.name),reference=false;
 if(names.includes('大消费')){
  reference=true;
  names=[/百货|零售/.test(group.reason)?'零售':/食品|预制菜|肉制品/.test(group.reason)?'食品饮料':/旅游/.test(group.reason)?'旅游':'大消费'];
 }
 return {items:names.map(n=>catalog.get(n)).filter(Boolean),reference};
}

function count(base,date,name){
 const groups=base.themeFactorInputs?.themes?.[date];
 const keys=parts(name);
 // A combined source group stays combined; never call its total a component count.
 const matches=(groups||[]).filter(g=>{const p=parts(g.name);return p.length===keys.length&&keys.every(n=>p.includes(n))});
 if(matches.length)return {value:new Set(matches.flatMap(g=>g.stocks.map(s=>s.code))).size,scope:'短线侠复盘分组',source:groupSource};
 const alternate=keys.length===1?base.secondWaveThemes?.counts?.[date]?.find(g=>norm(g.name)===keys[0]&&Number.isInteger(g.limitUps)&&g.limitUps>=0):null;
 return alternate?{value:alternate.limitUps,scope:'同花顺概念统计',source:alternate.source}:{value:null,scope:null,source:null};
}
function strength(base,date,index){
 const ranked=base.themeFactorInputs?.ranks?.[date];
 const row=ranked?.date===date&&ranked.provider==='duanxianxia'&&ranked.complete?ranked.rows?.find(r=>r.code===index.code):null;
 if(finite(row?.strength))return {value:row.strength,source:ranked.source||rankSource};
 const series=base.secondWaveThemes?.series?.[index.code];
 return series?.name===index.name&&finite(series.points?.[date])?{value:series.points[date],source:series.source}:{value:null,source:null};
}

export function waveThemeEvidence(base,row,date){
 const association=waveThemeAssociation(base,row),prev=base.sessions[base.sessions.indexOf(date)-1];
 if(!association)return {date,association:null,groups:[],text:'首波题材归属缺少来源记录',missing:true,sources:[]};
 const sources=new Set([association.source]);
 const groups=association.groups.map(group=>{
  const selected=indices(base,group,date),todayCount=count(base,date,group.name),priorCount=count(base,prev,group.name);
  const limitUps=todayCount.value,previousLimitUps=priorCount.value;
  if(todayCount.source)sources.add(todayCount.source);if(priorCount.source)sources.add(priorCount.source);
  const scores=selected.items.map(index=>{
   const now=strength(base,date,index),before=strength(base,prev,index);
   if(now.source)sources.add(now.source);if(before.source)sources.add(before.source);
   return {...index,value:now.value,previous:before.value,delta:finite(now.value)&&finite(before.value)?now.value-before.value:null};
  });
  const countDelta=todayCount.scope===priorCount.scope&&finite(limitUps)&&finite(previousLimitUps)?limitUps-previousLimitUps:null;
  const lines=[group.name,`${date.slice(5)} 涨停：${limitUps===null?'来源未单列':limitUps+'家'}${countDelta===null?'':`（较前日${signed(countDelta)}）`}${todayCount.scope==='同花顺概念统计'?' · 同花顺概念口径':''}`];
  for(const s of scores)lines.push(`${selected.reference?'细分参考 · ':''}${s.name}：${s.value===null?'当日数值暂缺':s.value}${s.delta===null?'':`（${signed(s.delta)}）`}`);
  if(!scores.length)lines.push('无对应独立强度指数');
  if(selected.reference)lines.push('涨停家数为上方复盘分组口径');
  const aligned=!selected.reference&&scores.length===1&&parts(group.name).length===1;
  if(aligned&&finite(countDelta)&&finite(scores[0].delta))lines.push(countDelta>0&&scores[0].delta>0?'家数与强度同步回升，观察二次爆发':'未见家数与强度同步增强');
  return {...group,limitUps,previousLimitUps,countScope:todayCount.scope,previousCountScope:priorCount.scope,scores,reference:selected.reference,text:lines.join('\n')};
 });
 return {date,previousDate:prev,association,groups,text:groups.map(g=>g.text).join('\n\n'),missing:groups.some(g=>g.scores.some(s=>s.value===null)),sources:[...sources]};
}

export function parseWaveThemeSeries(payload,index,sessions){
 if(payload?.legend!==index.name||!Array.isArray(payload.date)||payload.date.length!==payload.series1?.length)throw Error('题材强度日期或身份不匹配');
 const points={};
 for(let i=0;i<payload.date.length;i++){
  const stamp=payload.date[i],matches=sessions.filter(d=>d===stamp||d.slice(5)===stamp),raw=payload.series1[i];
  if(matches.length!==1||raw===null||String(raw).trim()===''||!finite(Number(raw)))continue;
  if(Object.hasOwn(points,matches[0]))throw Error('题材强度日期重复');
  points[matches[0]]=Number(raw);
 }
 if(!Object.keys(points).length)throw Error('未返回请求交易日的强度');
 return points;
}

export async function collectWaveThemeStrength(base,{from,end,post,fetchedAt,counts={}}){
 const saved=base.secondWaveThemes||{},series={...saved.series},errors=[];
 const requests=new Map();
 for(const date of base.sessions.filter(d=>d>=from&&d<=end)){
  const snapshot=base.secondWave?.[date],prev=base.sessions[base.sessions.indexOf(date)-1];
  for(const row of [...Object.values(snapshot?.pool||{}),...snapshot?.removed||[]]){
   for(const group of waveThemeAssociation(base,row)?.groups||[]){
    for(const index of indices(base,group,date).items){
     for(const d of [prev,date].filter(Boolean))if(!finite(strength(base,d,index).value)){
      const r=requests.get(index.code)||{...index,dates:new Set()};r.dates.add(d);requests.set(index.code,r);
     }
    }
   }
  }
 }
 for(const index of requests.values()){
  const dates=[...index.dates].sort(),begin=dates[0],last=dates.at(-1);
  const body={platecode:index.code,days:'30',dates:`${begin} - ${last}`};
  try{
   const payload=await post('getPlateDayChart',body),points=parseWaveThemeSeries(payload,index,base.sessions.filter(d=>d>=begin&&d<=last));
   series[index.code]={name:index.name,source:rankSource,endpoint:'https://v.duanxianxia.com/api/getPlateDayChart',request:body,collectedAt:fetchedAt,points:{...series[index.code]?.points,...points}};
   for(const date of dates)if(!finite(points[date]))errors.push(`${date} ${index.name}：接口未返回同日强度`);
  }catch(e){errors.push(`${index.name}：${e.message}`)}
 }
 const verifiedCounts={...saved.counts};
 for(const [date,rows] of Object.entries(counts))if(date<=end&&base.sessions.includes(date)){
  const verified=rows.filter(r=>Number.isInteger(r.limitUps)&&r.limitUps>=0&&r.source?.startsWith('https://data.10jqka.com.cn/dataapi/limit_up/block_top?')&&new URL(r.source).searchParams.get('date')===date.replaceAll('-',''));
  if(verified.length)verifiedCounts[date]=verified.map(({name,limitUps,source})=>({name,limitUps,source}));
 }
 return {series,counts:verifiedCounts,errors};
}
