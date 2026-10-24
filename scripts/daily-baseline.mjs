import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseDxxPool,promotionDay} from './promotions.mjs';
import {parseLimitUps} from './duanxianxia.mjs';

export const number=v=>v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v))?Number(v):null;
export const plain=s=>String(s??'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const fixed=n=>Number.isFinite(n)?Number(n.toFixed(2)):null;
const chinaDate=t=>new Date(new Date(t).getTime()+28800000).toISOString().slice(0,10);
const sourceDxx='https://www.duanxianxia.com/web/fupan';
const sourceRank='https://www.duanxianxia.com/web/platerotat';
const money=s=>{const n=number(plain(s).replace(/[亿万%,]/g,''));return n===null?null:n*(String(s).includes('亿')?1e8:String(s).includes('万')?1e4:1)};

export function parseStrength(payload,date){
 const html=payload?.html||'',stamps=html.match(/20\d{2}-\d{2}-\d{2}/g)||[];
 if(!stamps.length||stamps.some(d=>d!==date))throw Error('题材排行日期不符');
 const rows=[...html.matchAll(/<td\b[^>]*\bcode=['"](\d+)['"][^>]*\bname=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/td>/g)].map(m=>({code:m[1],name:m[2],strength:number(plain(m[3]).split(' ').at(-1))}));
 if(rows.length<5||rows.some(r=>r.strength===null)||new Set(rows.map(r=>r.code)).size!==rows.length)throw Error('题材排名不完整');
 if(rows.some((r,i)=>i&&r.strength>rows[i-1].strength))throw Error('来源排行不是强度降序');
 return rows.sort((a,b)=>b.strength-a.strength||a.code.localeCompare(b.code)).map((r,i)=>({...r,rank:i+1}));
}

export function parseStockBars(payload,code,source){
 if(payload?.data?.code!==code||!Array.isArray(payload.data.klines))throw Error('日线身份或数据缺失');
 return Object.fromEntries(payload.data.klines.map(line=>{const c=line.split(',');return [c[0],{date:c[0],open:number(c[1]),close:number(c[2]),high:number(c[3]),low:number(c[4]),volume:number(c[5]),amount:number(c[6]),pct:number(c[8]),change:number(c[9]),turnover:number(c[10]),source}]}));
}

export function parseThemeDetails(payload,date){
 const base=parseLimitUps(payload,date),chunks=payload.html.split(/(?=<div\b[^>]*class=['"][^'"]*\bztitem\b)/i).filter(s=>/^<div\b/.test(s));
 return base.groups.map((g,index)=>{
  const chunk=chunks[index]||'',table=chunk.match(/<table\b[^>]*>([\s\S]*?)<\/table>/i)?.[1]||'';
  const heads=[...table.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map(m=>plain(m[1]));
  const rows=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map(m=>[...m[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(c=>c[1]));
  const stocks=rows.filter(c=>c[0]?.match(/code=['"]\d{6}/)).map(c=>{const get=k=>plain(c[heads.indexOf(k)]);return {code:c[0].match(/code=['"](\d{6})/)[1],name:get('股票名称'),boards:number(get('连板')),pct:money(get('涨幅')),amount:money(get('成交额')),turnover:money(get('换手率')),firstSeal:get('首次封板'),lastSeal:get('最后封板'),opens:number(get('开板')),reason:get('异动原因')}});
  if(stocks.length!==g.count)throw Error('题材明细行数不符');
  return {...g,stocks,catalyst:plain(chunk.slice(0,chunk.indexOf('</span>'))).replace(/^.*?：/,'')};
 });
}

export function cohortStats(cohort,date,bars){
 const members=cohort.map(s=>({...s,...bars[s.code]?.[date],date,pct:bars[s.code]?.[date]?.pct??null}));
 const values=members.map(s=>s.pct).filter(Number.isFinite);
 return {date,total:cohort.length,known:values.length,mean:fixed(mean(values)),members};
}

export function followUp(eventDate,cohort,sessions,bars,asOf){
 const i=sessions.indexOf(eventDate);
 return [1,2,3].map(offset=>{const date=sessions[i+offset];return date&&date<=asOf?{offset,...cohortStats(cohort,date,bars)}:{offset,date:date||null,total:cohort.length,known:0,mean:null,members:[],pending:true}});
}

export function section(id,title,columns,rows,note,sources=[],status='complete'){
 return {id,title,columns,rows,note,sources:[...new Set(sources.filter(Boolean))],status};
}

export async function collectBaseline({from,to,now=new Date(),cacheDir}={}){
 const fetchedAt=now.toISOString(),today=chinaDate(now),end=to||today;
 for(const d of [from,to].filter(Boolean))if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(Date.parse(d)))throw Error('日期须为 YYYY-MM-DD');
 if(from&&from>end)throw Error('开始日期晚于结束日期');
 if(end>today)throw Error('不采集未来日期');
 const file='public/data/daily-baseline.json',old=await fs.readFile(file,'utf8').then(JSON.parse).catch(()=>({days:{}}));
 const context=await fs.readFile('public/data/market-context.json','utf8').then(JSON.parse);
 const auctions=await fs.readFile('public/data/auction-snapshots.json','utf8').then(JSON.parse).catch(()=>({days:{}}));
 const errors=[];
 async function get(url,body){
  const key=createHash('sha256').update(url+'\n'+JSON.stringify(body||null)).digest('hex');
  const cache=cacheDir?`${cacheDir}/${key}.json`:null;
  if(cache){try{return JSON.parse(await fs.readFile(cache,'utf8')).data}catch{}}
  let failure;
  for(let n=0;n<2;n++){try{const r=await fetch(url,{method:body?'POST':'GET',body:body?new URLSearchParams(body):undefined,headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(14000)});if(!r.ok)throw Error(`HTTP ${r.status}`);const data=await r.json();if(cache){await fs.mkdir(cacheDir,{recursive:true});await fs.writeFile(cache,JSON.stringify({url,body,fetchedAt,data}))}return data}catch(e){failure=e}}
  throw failure;
 }
 const post=(path,body)=>get(`https://www.duanxianxia.com/api/${path}`,body);
 async function attempt(label,fn,fallback=null){try{return await fn()}catch(e){errors.push(`${label}: ${e.message}`);return fallback}}
 async function each(items,fn){for(let i=0;i<items.length;i+=4)await Promise.all(items.slice(i,i+4).map(fn))}
 const emotion=await post('getChartByQingxu',{});
 const calendarUrl='https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=sh000001,day,,,90,qfq';
 const calendar=await get(calendarUrl),calendarBars=calendar.data?.sh000001?.day||calendar.data?.sh000001?.qfqday;
 if(!Array.isArray(calendarBars)||emotion.result!=='success')throw Error('真实交易日历或情绪日期缺失');
 const sessions=[...new Set(calendarBars.map(r=>r[0]).filter(d=>d<=end&&(d<today||new Date(now.getTime()+28800000).getUTCHours()>=16)))].sort();
 const start=from||sessions.at(-8),dates=sessions.filter(d=>d>=start),needed=sessions.slice(Math.max(0,sessions.indexOf(dates[0])-4));
 if(!dates.length)throw Error('所选区间没有已收盘交易日');
 console.log(`Baseline ${dates.join(', ')}`);
 const rankings={},themes={},pools={...context.promotionPools},bars={},strengthPoints=[];
 await each(needed,async date=>{
  rankings[date]=await attempt(`${date} raw strength`,async()=>parseStrength(await post('getPlateRotatData',{from:'kaipan',days:'1',dates:`${date} - ${date}`}),date));
  await attempt(`${date} theme details`,async()=>{const c=await post('getFupanDate',{date,type:'choose'});if(c.date!==date)throw Error('日期回退');const p=await post('getFupanByYidong',{date,type:'plate'});themes[date]=parseThemeDetails(p,date);pools[date]=parseDxxPool(p,date)});
 });
 const themeNames=new Map(needed.flatMap(d=>(rankings[d]||[]).slice(0,5).map(r=>[r.code,r.name])));
 await each([...themeNames],async ([code,name])=>attempt(`${name} four-session strength`,async()=>{
  const r=await post('getPlateDayChart',{platecode:code,days:'30',dates:`${needed[0]} - ${end}`});
  if(!Array.isArray(r.date)||r.date.length!==r.series1?.length||r.legend!==name)throw Error('强度历史身份不符');
  r.date.forEach((stamp,i)=>{const matching=needed.filter(d=>d===stamp||d.slice(5)===stamp);if(matching.length===1&&number(r.series1[i])!==null)strengthPoints.push({date:matching[0],name,code,strength:number(r.series1[i]),state:'',raw:String(r.series1[i]),sourceDate:matching[0],url:sourceRank})});
 }));
 const stockUrl=(id)=>`https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${id}&klt=101&fqt=0&beg=${needed[0].replaceAll('-','')}&end=${end.replaceAll('-','')}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61`;
 const indices={};
 await each([['沪指','1.000001'],['深指','0.399001'],['创业板','0.399006'],['科创50','1.000688']],async([name,id])=>{indices[name]=await attempt(name,async()=>parseStockBars(await get(stockUrl(id)),id.split('.')[1],stockUrl(id)),{})});
 const dataUrl=(report,filter,size=500,page=1)=>'https://datacenter-web.eastmoney.com/api/data/v1/get?'+new URLSearchParams({reportName:report,columns:'ALL',filter,pageNumber:String(page),pageSize:String(size),source:'WEB',client:'WEB'});
 const ipoSource=dataUrl('RPTA_APP_IPOAPPLY',`(LISTING_DATE>='${needed[0]}')(LISTING_DATE<='${end}')`);
 const ipo=await attempt('new stocks',async()=>{const j=await get(ipoSource);if(!j.success||j.result?.pages>1)throw Error('新股来源不完整');return (j.result?.data||[]).filter(s=>/^[036]\d{5}$/.test(s.SECURITY_CODE)).map(s=>({code:s.SECURITY_CODE,name:s.SECURITY_NAME,listingDate:s.LISTING_DATE.slice(0,10),issuePrice:number(s.ISSUE_PRICE)}))});
 const universe=new Map(needed.flatMap(d=>[...(pools[d]?.stocks||[]),...(context.marketRiskDays?.[d]?.brokenStocks||[]),...(context.marketRiskDays?.[d]?.breakCohort||[]) ]).concat(ipo||[]).map(s=>[s.code,s]));
 await each([...universe],async([code])=>{const u=stockUrl(`${code.startsWith('6')?'1':'0'}.${code}`);bars[code]=await attempt(code,async()=>parseStockBars(await get(u),code,u),{})});
 console.log(`Retrieved ${Object.keys(bars).length} stock histories; ${strengthPoints.length} strength observations`);
 const turnoverSource='https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=20&po=1&np=1&fltt=2&invt=2&fid=f6&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23&fields=f12,f14,f2,f3,f6,f8,f13,f124';
 const liveTurnover=await attempt('turnover top20',async()=>{const j=await get(turnoverSource);const r=j.data?.diff;if(!Array.isArray(r)||r.length!==20)throw Error('排行不足20');return r});
 const hotSource='https://dq.10jqka.com.cn/fuyao/hot_list_data/out/hot_list/v1/stock?stock_type=a&type=day&list_type=normal';
 const hot=await attempt('popularity',()=>get(hotSource));
 const days={...old.days};
 for(const date of dates){
  const previousDate=sessions[sessions.indexOf(date)-1],i=emotion.dates?.[date];
  if(!Number.isInteger(i)||emotion.Aaxis?.[i]!==date){errors.push(`${date}: emotion date mismatch`);continue}
  const ev=k=>number(emotion.series?.[k]?.[i]),pv=k=>number(emotion.series?.[k]?.[emotion.dates[previousDate]]);
  const risk=context.marketRiskDays?.[date],pool=pools[date],prior=pools[previousDate],sections=[],metrics={};
  for(const [name,data] of Object.entries(indices)){const r=data[date];metrics[name]=r?`${r.close} / ${r.pct>0?'+':''}${r.pct}%`:'待核'}
  metrics['成交额']=ev('HSLN')===null?'待核':`${ev('HSLN')} 亿元`;
  metrics['涨跌家数']=`${ev('SZ')??'待核'}涨 / ${ev('XD')??'待核'}跌`;
  metrics['涨跌停']=`${ev('ZT')??'待核'}涨停 / ${ev('DT')??'待核'}跌停`;
  for(const [n,label] of [[1,'一板'],[2,'二板'],[3,'三板']])metrics[label]=pool?String(pool.stocks.filter(s=>s.boards===n).length):'待核';
  metrics['高度板']=pool?`${Math.max(0,...pool.stocks.map(s=>s.boards))}板`:'待核';
  metrics['封板率']=ev('FB')===null?'待核':`${ev('FB')}%`;
  metrics['断板']=prior&&pool?`${prior.stocks.filter(s=>s.boards>=2&&!pool.stocks.some(t=>t.code===s.code)).length}家`:'待核';
  const marketRows=[['沪深成交额',ev('HSLN'),'亿元'],['较上日增减',ev('HSLN')!==null&&pv('HSLN')!==null?ev('HSLN')-pv('HSLN'):null,'亿元'],['上涨家数',ev('SZ'),'家'],['下跌家数',ev('XD'),'家'],['涨停家数',ev('ZT'),'家'],['跌停家数',ev('DT'),'家'],['封板率',ev('FB'),'%'],['昨日涨停表现',ev('ZTBX'),'%'],['昨日连板表现',ev('LBBX'),'%']];
  sections.push(section('market','市场基础与连板溢价',['指标','数值','单位'],marketRows,'短线侠原指标；ZTBX/LBBX 为昨日样本今日表现，供应商权重未公开。不与东方财富池的不同统计口径混算。',[sourceDxx],marketRows.every(r=>r[1]!==null)?'complete':'partial'));
  sections.push(section('indices','四大指数',['指数','收盘','涨跌幅（%）','成交额（亿元）'],Object.entries(indices).map(([name,data])=>[name,data[date]?.close??null,data[date]?.pct??null,fixed((data[date]?.amount??NaN)/1e8)]),'东方财富同日未复权指数日线。',Object.values(indices).map(d=>d[date]?.source),Object.values(indices).every(d=>d[date])?'complete':'partial'));
  if(risk)sections.push(section('risk','涨跌停与炸板池',['统计','家数'],[['涨停',risk.limitUpCount],['跌停',risk.limitDownCount],['炸板',risk.brokenCount],['一字板',risk.oneWordCount]],'东方财富池口径，沪深样本；与上表短线侠家数分别保留。',Object.values(risk.sources)));
  else sections.push(section('risk','涨跌停与炸板池',[],[],'同日完整涨跌停/炸板池未取得，不能用其他交易日替代。',[],'missing'));
  const promotions=pool&&prior?await attempt(`${date} promotions`,async()=>promotionDay(prior,pool,sessions)):null;
  const todayPool=new Map((pool?.stocks||[]).map(s=>[s.code,s]));
  const first=prior?.stocks.filter(s=>s.boards===1)||[],firstSuccess=first.filter(s=>todayPool.get(s.code)?.boards===2);
  if(promotions)sections.push(section('promotions','连板晋级与梯队',['梯队','成功','总数','晋级率（%）','晋级标的'],[['1进2',firstSuccess.length,first.length,first.length?fixed(firstSuccess.length/first.length*100):null,firstSuccess.map(s=>s.name).join(' / ')],...promotions.rows.map(r=>[r.label,r.success,r.total,r.rate===null?null:fixed(r.rate*100),r.promoted.map(s=>s.name).join(' / ')])],`昨日样本日 ${previousDate}；同代码晋级匹配，零分母为无样本。`,promotions.sources));
  else sections.push(section('promotions','连板晋级与梯队',[],[],'缺少同来源相邻交易日完整样本。',[],'missing'));
  const firstStats=cohortStats(first,date,bars);
  sections.push(section('first','昨日首板表现',['样本日','样本数','有效数','等权平均涨幅（%）'],[[previousDate,first.length,firstStats.known,firstStats.mean]],'等权样本代理，非来源原指标；包含失败股和正负收益。',firstStats.members.map(s=>s.source),firstStats.known===first.length&&prior?'complete':'partial'));
  const feedback=context.promotionFeedbackDays?.[date];
  if(feedback)sections.push(section('failure','晋级失败负反馈',['梯队','个股','收盘涨幅（%）','涨停至收盘回撤（%）','触板后最大回撤（%）','依据'],feedback.groups.flatMap(g=>g.members.map(s=>[g.label,`${s.name} ${s.code}`,s.closePct??bars[s.code]?.[date]?.pct??null,s.closeDrop,s.maxDrop,s.maxDropBasis])),`二板及以上失败平均 ${feedback.overall.mean??'待核'}%；覆盖 ${feedback.overall.known}/${feedback.overall.failed}。不能用全天低点替代触板后低点。`,feedback.sources,feedback.groups.some(g=>g.members.some(s=>s.closePct===null||s.touched===null||(s.touched===true&&s.maxDrop===null)))?'partial':'complete'));
  else sections.push(section('failure','晋级失败负反馈',[],[],'同日晋级失败逐股涨幅与实际涨停价证据待补。',[],'missing'));
  if(prior){const sample=prior.stocks.filter(s=>s.boards>=2&&!todayPool.has(s.code));sections.push(section('follow','炸板 / 连板断板后续表现',['事件日','类型','后续交易日','偏移','已核/总数','等权日涨幅（%）'],needed.filter(d=>d<date).flatMap(e=>{
    const p=sessions[sessions.indexOf(e)-1],before=pools[p],after=pools[e];
    const broken=before&&after?before.stocks.filter(s=>s.boards>=2&&!after.stocks.some(t=>t.code===s.code)):[];
    return [['炸板',context.marketRiskDays?.[e]?.brokenStocks||[]],['连板断板',broken]].flatMap(([label,c])=>c.length?followUp(e,c,sessions,bars,date).filter(r=>!r.pending&&r.date===date).map(r=>[e,label,r.date,`D${r.offset}`,`${r.known}/${r.total}`,r.mean]):[]);
   }),'仅后续真实交易日 D1/D2/D3；不把事件日当 D1。不以固定9.5%判定反包。',[sourceDxx]));void sample}
  const followRows=[];
  for(const event of needed.filter(d=>d<date)){
   const before=pools[sessions[sessions.indexOf(event)-1]],after=pools[event];
   const broken=before&&after?before.stocks.filter(s=>s.boards>=2&&!after.stocks.some(t=>t.code===s.code)):[];
   for(const [label,cohort] of [['炸板',context.marketRiskDays?.[event]?.brokenStocks||[]],['连板断板',broken]]){
    for(const r of followUp(event,cohort,sessions,bars,date).filter(r=>r.date===date&&!r.pending)){
     for(const s of r.members)followRows.push([event,label,`D${r.offset}`,`${s.name} ${s.code}`,s.pct,todayPool.has(s.code)?'重新涨停':risk?.limitDownStocks?.some(t=>t.code===s.code)?'跌停':'未命中已采集涨跌停池',r.mean,`${r.known}/${r.total}`]);
    }
   }
  }
  sections.push(section('follow-detail','固定失败样本逐股跟踪',['事件日','类型','今日偏移','个股','今日涨幅（%）','结果','同组均值（%）','覆盖'],followRows,'按事件日冻结样本，成功与失败股均保留；重新涨停不自动等同于形态反包。两类事件有交集，不合并相加。',[sourceDxx,...Object.values(risk?.sources||{})],followRows.some(r=>r[4]===null)?'partial':'complete'));
  const themeRows=themes[date]||[];
  sections.push(section('themes','题材涨停结构',['题材','涨停数','个股与连续板数'],themeRows.map(g=>[g.name,g.count,g.stocks.map(s=>`${s.name} ${s.boards}板`).join(' / ')]),'保留来源复合分类，不拆分、不把重叠题材求和。',[sourceDxx],themeRows.length?'complete':'missing'));
  const priorTop=(rankings[previousDate]||[]).slice(0,5);
  sections.push(section('prior-themes','昨日最强五题材跟踪',['昨日排名','题材','昨日强度','今日强度','今日排名'],priorTop.map(t=>[t.rank,t.name,t.strength,strengthPoints.find(p=>p.date===date&&p.code===t.code)?.strength??null,rankings[date]?.find(r=>r.code===t.code)?.rank??'未入来源前十 / 待核']),`固定 ${previousDate} 五强，不用今天赢家替换昨天样本。`,[sourceRank],priorTop.length===5?'complete':'missing'));
  const norm=s=>s.replace(/半导体/g,'芯片').replace(/房地产/g,'地产').replace(/概念|产业链/g,'');
  const focus=new Set([...(rankings[date]||[]).slice(0,5),...priorTop].map(s=>norm(s.name)));
  const comparisons=(themes[previousDate]||[]).filter(g=>g.name.split(/[\/、]/).some(n=>focus.has(norm(n))));
  sections.push(section('members','题材内昨日涨停股今日对照',['昨日题材','个股','收盘涨幅（%）','成交额（亿元）','换手率（%）','今日首次 / 最后封板'],comparisons.flatMap(g=>g.stocks.map(s=>{const q=bars[s.code]?.[date],seal=themeRows.flatMap(t=>t.stocks).find(t=>t.code===s.code);return [g.name,`${s.name} ${s.code}`,q?.pct??null,fixed((q?.amount??NaN)/1e8),q?.turnover??null,seal?`${seal.firstSeal} / ${seal.lastSeal}`:'未在今日涨停池']})),'保留昨日成员和失败股；未人工确认的核心/容量角色不推断。',[sourceDxx],comparisons.length?'partial':'missing'));
  const newStocks=(ipo||[]).filter(s=>s.listingDate<=date&&sessions.indexOf(date)-sessions.indexOf(s.listingDate)<5);
  sections.push(section('new-stocks','新股观察',['个股','上市日','上市交易日序','发行价','收盘涨幅（%）','成交额（亿元）','换手率（%）'],newStocks.map(s=>[`${s.name} ${s.code}`,s.listingDate,sessions.indexOf(date)-sessions.indexOf(s.listingDate)+1,s.issuePrice,bars[s.code]?.[date]?.pct??null,fixed((bars[s.code]?.[date]?.amount??NaN)/1e8),bars[s.code]?.[date]?.turnover??null]),'沪深上市首5个交易日；新股无涨跌幅限制阶段单独观察，不混入常规连板溢价。不另设ST、北交所模块。',[ipoSource],ipo===null?'missing':'complete'));
  const currentTop=liveTurnover?.every(s=>chinaDate(Number(s.f124)*1000)===date)?liveTurnover:null;
  const oldTop=old.days?.[date]?.sections?.find(s=>s.id==='turnover'&&s.status==='complete');
  sections.push(currentTop?section('turnover','全市场成交额前20',['排名','个股','成交额（亿元）','涨跌幅（%）','换手率（%）','题材'],currentTop.map((s,i)=>[i+1,`${s.f14} ${s.f12}`,fixed(s.f6/1e8),s.f3,s.f8,themeRows.filter(g=>g.stocks.some(t=>t.code===s.f12)).map(g=>g.name).join(' / ')||'未匹配涨停题材']), '沪深A股按实际成交额排序；成交额不等于净流入。',[turnoverSource]):oldTop||section('turnover','全市场成交额前20',[],[],'历史全市场成交额排行尚未取得；实时接口回传其他日期，已拒绝套用。',[turnoverSource],'missing'));
  const hotTime=hot?.data?.timestamp||hot?.data?.time;
  const hotDate=hotTime?chinaDate(Number(hotTime)<1e12?Number(hotTime)*1000:Number(hotTime)):(date===today&&sessions.at(-1)===today?today:null);
  const hotRows=hot?.data?.stock_list;
  const oldHot=old.days?.[date]?.sections?.find(s=>s.id==='popularity'&&s.status==='complete');
  sections.push(hotDate===date&&Array.isArray(hotRows)?section('popularity','人气榜',['排名','个股'],hotRows.map((s,i)=>[s.order??s.rank??i+1,`${s.name} ${s.code}`]),'同花顺日榜；无来源时间戳时仅按当天采集时点留存，非官方历史收盘榜。采集时刻 '+fetchedAt+'；排名变化须有此前同口径快照。',[hotSource]):oldHot||section('popularity','人气榜',[],[],'历史同花顺排行未取得可验证的目标日期；不以最新榜单回填。',[hotSource],'missing'));
  const auction=auctions.days[date]?.previousDate===previousDate?auctions.days[date]:null,auctionMap=new Map((auction?.rows||[]).map(r=>[r.code,r]));
  sections.push(section('auction','昨日涨停 / 连板竞价与收盘对照',['样本','总数','竞价有效数','配对有效数','竞价等权涨幅（%）','配对收盘等权涨幅（%）'],[['全部涨停',prior?.stocks||[]],['连板',prior?.stocks.filter(s=>s.boards>=2)||[]],['首板',first]].map(([label,c])=>{const matched=c.filter(s=>auctionMap.has(s.code)),paired=matched.filter(s=>Number.isFinite(bars[s.code]?.[date]?.pct));return [label,c.length,matched.length,paired.length,fixed(mean(paired.map(s=>auctionMap.get(s.code).pct))),fixed(mean(paired.map(s=>bars[s.code][date].pct)))]}),auction?`${auction.method} 竞价与收盘均值使用同一配对子集。`:'未取得可验证的最终集合竞价历史快照；日线开盘价不冒充竞价。缺少竞价的配对子集均值不计算。',auction?.sources||[sourceDxx],auction&&auction.rows.length===prior?.stocks.length?'complete':'partial'));
  const leaderSource=dataUrl('RPT_DAILYBILLBOARD_DETAILS',`(TRADE_DATE='${date}')`);
  const leaderboard=await attempt(`${date} leaderboard`,async()=>{const j=await get(leaderSource);if(!j.success||j.result?.pages>1)throw Error('龙虎榜分页未完整');const rows=j.result?.data||[];if(rows.some(r=>!r.TRADE_DATE.startsWith(date)))throw Error('龙虎榜日期不符');return rows});
  sections.push(section('leaderboard','龙虎榜公开明细',['个股','上榜原因','买入（万元）','卖出（万元）','净额（万元）'],(leaderboard||[]).map(s=>[`${s.SECURITY_NAME_ABBR} ${s.SECURITY_CODE}`,s.EXPLANATION,fixed(s.BILLBOARD_BUY_AMT/1e4),fixed(s.BILLBOARD_SELL_AMT/1e4),fixed(s.BILLBOARD_NET_AMT/1e4)]),'东方财富转引披露；一日与多日上榜分别保留，不汇总重复榜单。逐席位明细仍待补齐。',[leaderSource],leaderboard?'partial':'missing'));
  const noticeBase='https://np-anotice-stock.eastmoney.com/api/security/ann?';
  const notices=await attempt(`${date} announcements`,async()=>{
   const all=[];let total=Infinity;
   for(let page=1;all.length<total&&page<=30;page++){
    const url=noticeBase+new URLSearchParams({sr:'-1',page_size:'100',page_index:String(page),ann_type:'A',begin_time:date,end_time:date});
    const j=await get(url);if(!Array.isArray(j.data?.list))throw Error('公告列表缺失');total=Number(j.data.total_hits);if(!j.data.list.length&&all.length<total)throw Error('公告分页缺失');all.push(...j.data.list);
   }
   if(all.length<total)throw Error('公告超分页上限，覆盖不全');
   return [...new Map(all.filter(s=>s.notice_date?.startsWith(date)).map(s=>[s.art_code,s])).values()];
  });
  const themeCodes=new Set(themeRows.flatMap(g=>g.stocks.map(s=>s.code)));
  const selected=(notices||[]).filter(s=>s.codes?.some(c=>themeCodes.has(c.stock_code))||/异常波动|严重异常|停牌|复牌|监管|警示|风险提示|澄清/.test(s.title));
  sections.push(section('announcements','监管 / 催化与证伪公告线索',['披露时间','个股','标题','原文'],selected.map(s=>[s.display_time||s.notice_date,s.codes.map(c=>`${c.short_name} ${c.stock_code}`).join(' / '),s.title,`https://data.eastmoney.com/notices/detail/${s.codes[0]?.stock_code}/${s.art_code}.html`]),'公告列表为东方财富转引，包含盘后披露；标题只作待核线索，不自动判定催化成立。政策原文及逐条证伪、有效期须进一步核验。',[noticeBase+new URLSearchParams({begin_time:date,end_time:date,ann_type:'A'})],notices?'partial':'missing'));
  const foreign=context.quotes.map(q=>{const row=q.rows.filter(r=>r.date<=date).at(-1);return [q.name,row?.date||null,row?.close??null,row?.pct??null,q.region]});
  sections.push(section('overseas','已配置外围观察',['标的','实际交易日','收盘','日涨幅（%）','市场'],foreign,'美股当晚收盘作为次日盘前资料；早于目标日的行保留实际日期，不混为当日。',context.quotes.map(q=>q.source),foreign.every(r=>r[1]===date)?'complete':'partial'));
  const topThemes=(rankings[date]||[]).slice(0,5),height=Math.max(0,...(pool?.stocks||[]).map(s=>s.boards));
  for(let si=0;si<sections.length;si++){if(sections[si].status==='missing'){const saved=old.days?.[date]?.sections?.find(s=>s.id===sections[si].id&&s.status==='complete');if(saved)sections[si]={...saved,note:saved.note+' 本次刷新未取得，保留此前同日已核数据。'}}}
  const gaps=sections.filter(s=>s.status!=='complete').map(s=>({id:s.id,title:s.title,status:s.status,note:s.note}));
  days[date]={date,previousDate,fetchedAt,asOf:`${date} 盘后；海外另标实际交易日`,metrics,topThemes,strengthPoints:strengthPoints.filter(p=>p.date<=date&&p.date>=sessions[Math.max(0,sessions.indexOf(date)-3)]&&topThemes.some(t=>t.code===p.code)),highest:{count:height||null,names:(pool?.stocks||[]).filter(s=>s.boards===height).map(s=>s.name)},sections,gaps,status:gaps.length?'partial':'complete',scope:'来源分别标注；不单列ST/北交所，不改写已有全市场统计口径。'};
  console.log(`${date}: ${sections.filter(s=>s.status==='complete').length}/${sections.length} complete sections; ${topThemes.length} top themes`);
 }
 const result={version:1,updatedAt:fetchedAt,calendarSource:calendarUrl,sessions,days,errors};
 for(const path of [file,'docs/data/daily-baseline.json']){await fs.mkdir(path.slice(0,path.lastIndexOf('/')),{recursive:true});await fs.writeFile(path,JSON.stringify(result))}
 return result;
}
