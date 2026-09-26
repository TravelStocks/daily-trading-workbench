import fs from 'node:fs/promises';
import {instruments,boards,parseKlines,parseNaver,parseBoard,completed} from './market-data.mjs';
import {fetchLimitUps} from './duanxianxia.mjs';
const path='public/data/market-context.json',now=new Date(),end=now.toISOString().slice(0,10).replaceAll('-','');
const old=await fs.readFile(path,'utf8').then(JSON.parse).catch(()=>({quotes:[],themes:{}}));
const result={version:1,updatedAt:now.toISOString(),quotes:[...old.quotes],themes:{...old.themes},limitUpDays:{...old.limitUpDays},marketRiskDays:{...old.marketRiskDays},errors:[]};
async function get(url,json=false){const r=await fetch(url,{signal:AbortSignal.timeout(18000),headers:{'User-Agent':'Mozilla/5.0'}});if(!r.ok)throw Error(`HTTP ${r.status}`);return json?r.json():r.text()}
async function batch(items,fn){for(let i=0;i<items.length;i+=4)await Promise.all(items.slice(i,i+4).map(async x=>{try{await fn(x)}catch(e){result.errors.push(`${x[1]||x}: ${e.message}`)}}))}
const topicBase='http://push2ex.eastmoney.com/';
async function topicPool(path,date){
 const sort=path==='getTopicDTPool'?'fund%3Aasc':'fbt%3Aasc',source=`${topicBase}${path}?ut=7eea3edcaed734bea9cbfc24409ed989&dpt=wz.ztzt&Pageindex=0&pagesize=500&sort=${sort}&date=${date.replaceAll('-','')}`;
 const j=await get(source,true),qdate=String(j.data?.qdate||'');
 if(j.rc!==0||!j.data||!/^\d{8}$/.test(qdate))throw Error(`${path} unavailable`);
 return {date:qdate.replace(/(\d{4})(\d{2})(\d{2})/,'$1-$2-$3'),source,pool:(j.data.pool||[]).filter(s=>!String(s.c||'').startsWith('8')&&!String(s.c||'').startsWith('9')),total:Number(j.data.tc||0)};
}
const average=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
async function stockHistory(stock,beg,end){
 const secid=`${Number(stock.m)||0}.${stock.c}`,source=`https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&klt=101&fqt=0&beg=${beg.replaceAll('-','')}&end=${end.replaceAll('-','')}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61`;
 const j=await get(source,true);return parseKlines(j.data,'HK',now);
}
await batch(instruments,async ([region,id,name,theme])=>{
 let rows,source,provider;
 if(!id.includes('.')){source=`https://api.finance.naver.com/siseJson.naver?symbol=${id}&requestType=1&startTime=20260101&endTime=${end}&timeframe=day`;rows=parseNaver(await get(source),now);provider='Naver / KRX';}
 else{source=`https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${id}&klt=101&fqt=0&beg=20260101&end=${end}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61`;const j=await get(source,true);if(j.data?.code!==id.split('.')[1])throw Error('Quote identity mismatch');rows=parseKlines(j.data,region,now);provider='东方财富';}
 if(!rows.length)throw Error('No completed sessions');
 const quote={region,id,name,theme,provider,source,rows,updatedAt:now.toISOString()};const i=result.quotes.findIndex(q=>q.id===id);if(i<0)result.quotes.push(quote);else result.quotes[i]=quote;
});
// Preserve all successfully collected dates. Refresh recent completed A-share dates.
const history=JSON.parse(await fs.readFile('public/data/history.json','utf8'));
const since=new Date(now.getTime()-45*86400000).toISOString().slice(0,10);
const dates=new Set(history.days.map(d=>d.date).filter(d=>d>=since));
for(let i=0;i<14;i++){const d=new Date(now.getTime()-i*86400000);if(d.getUTCDay()!==0&&d.getUTCDay()!==6)dates.add(d.toISOString().slice(0,10))}
// Backfill the recap archive once, then refresh recent dates independently of THS.
const limitDates=new Set([...dates,...history.days.filter(d=>!result.limitUpDays[d.date]).map(d=>d.date)]);
await batch([...limitDates].filter(d=>completed(d,'HK',now)).sort().map(d=>[d]),async ([date])=>{result.limitUpDays[date]={...await fetchLimitUps(date),updatedAt:now.toISOString()}});
const amounts={};await batch(boards,async ([id])=>{amounts[id]={};for(const year of new Set([...dates].map(d=>d.slice(0,4))))Object.assign(amounts[id],parseBoard(await get(`https://d.10jqka.com.cn/v6/line/bk_${id}/01/${year}.js`)))});
const pendingAmounts=new Map();
await batch([...dates].filter(d=>completed(d,'HK',now)).sort().map(d=>[d]),async ([date])=>{
 const source=`https://data.10jqka.com.cn/dataapi/limit_up/block_top?filter=HS,GEM2STAR&date=${date.replaceAll('-','')}`;
 const j=await get(source,true);if(j.status_code!==0||!Array.isArray(j.data)||!j.data.length)throw Error('No board ranking');
 // Reject responses silently falling back to another trading date.
 const stamps=j.data.flatMap(b=>b.stock_list||[]).map(s=>Number(s.last_limit_up_time||s.first_limit_up_time)).filter(Number.isFinite);
 if(!stamps.length||stamps.some(t=>new Date(t*1000+8*3600000).toISOString().slice(0,10)!==date))throw Error('Board session mismatch');
 const extra=j.data.filter(b=>/^88\d{4}$/.test(String(b.code))&&!boards.some(x=>x[0]===String(b.code))).map(b=>[String(b.code),b.name,[b.name,b.name.replace(/概念$/,'')]]);
 // Discover newly strong boards from each day's actual ranking, not a fixed list.
 for(const [id] of extra){const key=id+'-'+date.slice(0,4);if(!pendingAmounts.has(key))pendingAmounts.set(key,(async()=>{try{Object.assign(amounts[id]||=( {}),parseBoard(await get(`https://d.10jqka.com.cn/v6/line/bk_${id}/01/${date.slice(0,4)}.js`)))}catch{result.errors.push(`${key}: board turnover unavailable`)}})());await pendingAmounts.get(key)}
 result.themes[date]=[...boards,...extra].map(([id,name,aliases])=>{const b=j.data.find(b=>String(b.code)===id),prior=old.themes[date]?.find(b=>b.id===id);return {id,name,aliases,limitUps:typeof b?.limit_up_num==='number'?b.limit_up_num:null,turnover:amounts[id]?.[date]??prior?.turnover??null,source,amountSource:`https://d.10jqka.com.cn/v6/line/bk_${id}/01/${date.slice(0,4)}.js`}});
});

// Market risk tape. Eastmoney exposes the latest session only, so preserve one verified snapshot per run.
try{
 const requestDate=[...dates].sort().at(-1)||now.toISOString().slice(0,10),[zt,zb,dt]=await Promise.all([topicPool('getTopicZTPool',requestDate),topicPool('getTopicZBPool',requestDate),topicPool('getTopicDTPool',requestDate)]);
 if(zt.date!==zb.date||zt.date!==dt.date)throw Error('risk pool dates disagree');
 const date=zt.date,limitCodes=new Set(zt.pool.map(s=>String(s.c))),priorDate=Object.keys(result.marketRiskDays).filter(d=>d<date).sort().at(-1),prior=result.marketRiskDays[priorDate],priorLeaders=(prior?.limitUpStocks||[]).filter(s=>Number(s.boards)>=2),cohort=priorLeaders.filter(s=>!limitCodes.has(String(s.code)));
 result.marketRiskDays[date]={date,provider:'东方财富涨停板行情',sources:{limitUp:zt.source,broken:zb.source,limitDown:dt.source},limitUpCount:zt.pool.length,brokenCount:zb.pool.length,brokenRate:zt.pool.length+zb.pool.length?zb.pool.length/(zt.pool.length+zb.pool.length):null,brokenStocks:zb.pool.map(s=>({code:String(s.c),name:s.n,theme:s.hybk||'未分类',pct:Number.isFinite(Number(s.zdp))?Number(s.zdp):null})),limitDownCount:dt.pool.length,limitDownStocks:dt.pool.map(s=>({code:String(s.c),name:s.n,theme:s.hybk||'未分类',pct:Number.isFinite(Number(s.zdp))?Number(s.zdp):null})),limitUpStocks:zt.pool.map(s=>({code:String(s.c),name:s.n,theme:s.hybk||'未分类',pct:Number.isFinite(Number(s.zdp))?Number(s.zdp):null,market:Number(s.m)||0,boards:Number(s.lbc||(s.zttj||{}).ct||1)})),breakCohort:cohort,breakFollowUp:{sampleCount:cohort.length,day1Avg:null,day2Avg:null,day3Avg:null,rebound:[],deepWater:[]}};
 // Refresh every stored cohort so day 2 and day 3 appear automatically on later runs.
 for(const record of Object.values(result.marketRiskDays).filter(r=>r.breakCohort?.length)){
  const histories=new Map();
  await batch(record.breakCohort.map(s=>[s.code,s]),async ([,s])=>histories.set(String(s.code),await stockHistory({c:s.code,m:s.market},record.date,date)));
  const follow=record.breakCohort.map(stock=>({stock,rows:(histories.get(String(stock.code))||[]).filter(r=>r.date>=record.date).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3)})),byDay=n=>follow.map(x=>x.rows[n]?.pct).filter(Number.isFinite),samples=follow.flatMap(({stock,rows})=>rows.map((r,n)=>({code:String(stock.code),name:stock.name,theme:stock.theme,pct:r.pct,priorBoards:stock.boards,day:n+1})));
  record.breakFollowUp={sampleCount:record.breakCohort.length,day1Avg:average(byDay(0)),day2Avg:average(byDay(1)),day3Avg:average(byDay(2)),rebound:samples.filter(s=>s.pct>=9.5).slice(0,12),deepWater:samples.filter(s=>s.pct<=-5).slice(0,12)};
 }
}catch(e){result.errors.push(`market risk: ${e.message}`)}
if(!result.quotes.some(q=>q.updatedAt===now.toISOString())&&!Object.values(result.limitUpDays).some(d=>d.updatedAt===now.toISOString()))throw Error('All sources failed; retain previously published data');
result.quotes.sort((a,b)=>instruments.findIndex(q=>q[1]===a.id)-instruments.findIndex(q=>q[1]===b.id));
await fs.mkdir('public/data',{recursive:true});await fs.writeFile(path,JSON.stringify(result));
await fs.mkdir('docs/data',{recursive:true});await fs.writeFile('docs/data/market-context.json',JSON.stringify(result));
console.log(`Collected ${result.quotes.length} instruments, ${Object.keys(result.themes).length} theme dates. ${result.errors.length} source errors.`);if(result.errors.length)console.log(result.errors.join('\n'));
console.log(`Duanxianxia: ${Object.keys(result.limitUpDays).length} dated recaps, ${Object.values(result.limitUpDays).filter(d=>d.updatedAt===now.toISOString()).length} refreshed.`);
