import fs from 'node:fs/promises';
import {instruments,boards,parseKlines,parseNaver,parseBoard,completed} from './market-data.mjs';
const path='public/data/market-context.json',now=new Date(),end=now.toISOString().slice(0,10).replaceAll('-','');
const old=await fs.readFile(path,'utf8').then(JSON.parse).catch(()=>({quotes:[],themes:{}}));
const result={version:1,updatedAt:now.toISOString(),quotes:[...old.quotes],themes:{...old.themes},errors:[]};
async function get(url,json=false){const r=await fetch(url,{signal:AbortSignal.timeout(18000),headers:{'User-Agent':'Mozilla/5.0'}});if(!r.ok)throw Error(`HTTP ${r.status}`);return json?r.json():r.text()}
async function batch(items,fn){for(let i=0;i<items.length;i+=4)await Promise.all(items.slice(i,i+4).map(async x=>{try{await fn(x)}catch(e){result.errors.push(`${x[1]||x}: ${e.message}`)}}))}
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
if(!result.quotes.some(q=>q.updatedAt===now.toISOString()))throw Error('All overseas sources failed; retain previously published data');
result.quotes.sort((a,b)=>instruments.findIndex(q=>q[1]===a.id)-instruments.findIndex(q=>q[1]===b.id));
await fs.mkdir('public/data',{recursive:true});await fs.writeFile(path,JSON.stringify(result));
await fs.mkdir('docs/data',{recursive:true});await fs.writeFile('docs/data/market-context.json',JSON.stringify(result));
console.log(`Collected ${result.quotes.length} instruments, ${Object.keys(result.themes).length} theme dates. ${result.errors.length} source errors.`);if(result.errors.length)console.log(result.errors.join('\n'));
