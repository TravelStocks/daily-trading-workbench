import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export function auctionWindow(now){
 const local=new Date(now.getTime()+28800000),minutes=local.getUTCHours()*60+local.getUTCMinutes();
 return local.getUTCDay()>0&&local.getUTCDay()<6&&minutes>=566&&minutes<570;
}
export function auctionQuote(row,date){
 const stamp=new Date(Number(row.f124)*1000+28800000),minutes=stamp.getUTCHours()*60+stamp.getUTCMinutes();
 if(stamp.toISOString().slice(0,10)!==date||minutes<565||minutes>=570||!(row.f2>0)||!(row.f18>0)||!(row.f17>0)||Math.abs(row.f2-row.f17)>0.005)return null;
 return {code:row.f12,name:row.f14,price:row.f2,reference:row.f18,pct:(row.f2/row.f18-1)*100,amount:row.f6,volume:row.f5,quoteTime:new Date(Number(row.f124)*1000).toISOString()};
}
export async function captureAuction(now=new Date()){
 if(!auctionWindow(now)){console.log('Outside verified 09:26-09:30 capture window; no auction snapshot fabricated.');return}
 const date=new Date(now.getTime()+28800000).toISOString().slice(0,10);
 const context=JSON.parse(await fs.readFile('public/data/market-context.json','utf8'));
 const calendarSource='https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=sh000001,day,,,90,qfq';
 const calendar=await fetch(calendarSource,{signal:AbortSignal.timeout(10000)}).then(r=>r.json());
 const days=(calendar.data?.sh000001?.day||calendar.data?.sh000001?.qfqday||[]).map(r=>r[0]).filter(d=>d<date).sort();
 const previousDate=days.at(-1),pool=context.promotionPools?.[previousDate];
 if(!pool?.complete)throw Error('No verified previous-session pool');
 const rows=[],sources=[];
 for(let i=0;i<pool.stocks.length;i+=50){
  if(!auctionWindow(new Date()))break;
  const list=pool.stocks.slice(i,i+50).map(s=>`${s.code.startsWith('6')?'1':'0'}.${s.code}`).join(',');
  const source='https://push2.eastmoney.com/api/qt/ulist.np/get?'+new URLSearchParams({fltt:'2',invt:'2',secids:list,fields:'f12,f14,f2,f17,f18,f5,f6,f124'});
  const j=await fetch(source,{signal:AbortSignal.timeout(8000)}).then(r=>r.json());
  for(const q of j.data?.diff||[]){const valid=auctionQuote(q,date);if(valid)rows.push({...valid,source})}sources.push(source);
 }
 if(!rows.length)throw Error('No verified final auction quotes; keep gap');
 const file='public/data/auction-snapshots.json',old=await fs.readFile(file,'utf8').then(JSON.parse).catch(()=>({version:1,days:{}}));
 const prior=old.days[date],merged=new Map((prior?.rows||[]).map(s=>[s.code,s]));
 for(const row of rows)merged.set(row.code,row);
 old.days[date]={date,previousDate,collectedAt:new Date().toISOString(),total:pool.stocks.length,rows:[...merged.values()],sources,method:'09:26-09:30现场捕获；行情时间>=09:25且<09:30，成交价与开盘价一致；不是历史日线开盘代理。'};
 for(const path of [file,'docs/data/auction-snapshots.json'])await fs.writeFile(path,JSON.stringify(old));
 console.log(`Auction ${date}: ${merged.size}/${pool.stocks.length}`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await captureAuction();
