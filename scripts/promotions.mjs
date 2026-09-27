import {parseLimitUps} from './duanxianxia.mjs';
// Count transitions of the same stock, never ratios of unrelated ladder totals.
export function parsePool(payload, date, source) {
  const d = payload?.data;
  if (payload?.rc !== 0 || String(d?.qdate) !== date.replaceAll('-', '') || !Array.isArray(d.pool) || d.pool.length !== Number(d.tc)) throw Error(`Incomplete or wrong-date limit-up pool: ${date}`);
  const stocks = d.pool.filter(s => /^[036]\d{5}$/.test(String(s.c))).map(s => ({code:String(s.c),name:s.n,boards:Number(s.lbc)}));
  if (new Set(stocks.map(s => s.code)).size !== stocks.length || stocks.some(s => !s.name || !Number.isInteger(s.boards) || s.boards < 1)) throw Error('Invalid consecutive-board identity');
  return {date,source,stocks,complete:true,scopeKey:'eastmoney-HS'};
}

export function parseDxxPool(payload,date){
  const groups=parseLimitUps(payload,date).groups, stocks=new Map();
  const clean=s=>s.replace(/<[^>]*>/g,'').trim();
  for(const table of payload.html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)){
    const headers=[...table[1].matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(m=>clean(m[1]));
    const column=headers.indexOf('连板');
    for(const tr of table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
      const cells=[...tr[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>m[1]);
      const code=cells[0]?.match(/\bcode=['"](\d{6})['"]/)?.[1];
      if(!code)continue;
      const boards=Number(column<0?NaN:clean(cells[column]||''));
      if(!Number.isInteger(boards)||boards<1)throw Error(`缺少连续板数 ${code}`);
      if(stocks.has(code)&&stocks.get(code).boards!==boards)throw Error(`重复标的板数冲突 ${code}`);
      stocks.set(code,{code,name:clean(cells[0]),boards});
    }
  }
  const codes=new Set(groups.flatMap(g=>g.stocks.map(s=>s.code)));
  if(!codes.size||codes.size!==stocks.size||[...codes].some(c=>!stocks.has(c)))throw Error('短线侠全量名单与板数不匹配');
  return {date,source:'https://www.duanxianxia.com/web/fupan',stocks:[...stocks.values()].filter(s=>/^[036]\d{5}$/.test(s.code)),complete:true,scopeKey:'duanxianxia-HS'};
}

export function promotionDay(previous, current, sessions) {
  const i = sessions.indexOf(current.date);
  if (i < 1 || sessions[i-1] !== previous.date || !previous.complete || !current.complete) throw Error('Need complete adjacent trading-day pools');
  if(previous.scopeKey!==current.scopeKey)throw Error('Do not mix provider universes across days');
  const today = new Map(current.stocks.map(s => [s.code,s]));
  const rows = [2,3,4,5].map(n => {
    const cohort = previous.stocks.filter(s => n === 5 ? s.boards >= 5 : s.boards === n);
    const promoted = cohort.filter(s => today.get(s.code)?.boards === s.boards + 1);
    return {label:n===5?'5板以上':`${n}进${n+1}`,success:promoted.length,total:cohort.length,rate:cohort.length?promoted.length/cohort.length:null,
      promoted:promoted.map(s => ({code:s.code,name:s.name,from:s.boards,to:s.boards+1})),
      failed:cohort.filter(s => !promoted.includes(s)).map(s => ({code:s.code,name:s.name,from:s.boards}))};
  });
  return {date:current.date,previousDate:previous.date,scope:'沪深A股，按来源涨停池口径；5板以上指昨日≥5板继续晋级',sources:[previous.source,current.source],rows};
}

export async function collectPromotions(old={}, now=new Date(), fetcher=fetch) {
  const pools={...old.promotionPools}, days={...old.promotionDays}, errors=[];
  async function get(url) {const r=await fetcher(url,{signal:AbortSignal.timeout(18000)});if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json();}
  const calendarSource='https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=sh000001,day,,,90,qfq';
  const j=await get(calendarSource), bars=j.data?.sh000001?.day||j.data?.sh000001?.qfqday;
  if(j.code!==0||!Array.isArray(bars))throw Error('Trading calendar unavailable');
  const china=new Date(now.getTime()+8*3600000),today=china.toISOString().slice(0,10),closed=china.getUTCHours()>=16;
  const sessions=[...new Set(bars.map(r=>r[0]).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&(d<today||(d===today&&closed))))].sort();
  const recent=sessions.slice(-12),refresh=new Set(recent.slice(-2));
  for(const date of recent){
    if(pools[date]?.complete&&!refresh.has(date))continue;
    const source=`https://push2ex.eastmoney.com/getTopicZTPool?ut=7eea3edcaed734bea9cbfc24409ed989&dpt=wz.ztzt&Pageindex=0&pagesize=1000&sort=fbt%3Aasc&date=${date.replaceAll('-','')}`;
    try{
      const post=async(path)=>{const r=await fetcher(`https://www.duanxianxia.com/api/${path}`,{method:'POST',body:new URLSearchParams({date,type:path==='getFupanDate'?'choose':'plate'}),signal:AbortSignal.timeout(18000)});if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json();};
      const calendar=await post('getFupanDate');if(calendar.result!=='success'||calendar.date!==date)throw Error('短线侠日期不符');
      pools[date]={...parseDxxPool(await post('getFupanByYidong'),date),updatedAt:now.toISOString()};
    }catch(e){
      try{const fallback=parsePool(await get(source),date,source);if(!pools[date]?.complete)pools[date]={...fallback,updatedAt:now.toISOString()};}catch(f){errors.push(`${date}: ${e.message}; ${f.message}`);}
    }
  }
  for(const date of recent.slice(1)){
    const previousDate=sessions[sessions.indexOf(date)-1];
    if(!pools[date]?.complete||!pools[previousDate]?.complete){errors.push(`${date}: 缺少相邻交易日完整涨停池，晋级数据待核`);continue;}
    try{days[date]={...promotionDay(pools[previousDate],pools[date],sessions),calendarSource,updatedAt:now.toISOString()};}catch(e){errors.push(`${date}: ${e.message}`);}
  }
  return {promotionPools:pools,promotionDays:days,errors};
}
