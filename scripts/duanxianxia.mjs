const text=s=>s.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').trim();
export function parseLimitUps(payload,date){
 if(payload?.result!=='success'||typeof payload.html!=='string')throw Error('短线侠未返回涨停复盘');
 const html=payload.html;
 const stamped=[...html.matchAll(/\bdate=['"](\d{4}-\d{2}-\d{2})['"]/g)].map(m=>m[1]);
 if(stamped.some(d=>d!==date))throw Error('短线侠响应日期不符');
 const groups=html.split(/(?=<div\b[^>]*class=['"][^'"]*\bztitem\b[^'"]*['"])/i).filter(s=>/^<div\b[^>]*\bztitem\b/i.test(s)).map(chunk=>{
  const name=text(chunk.match(/<b\b[^>]*>([\s\S]*?)<\/b>/i)?.[1]||'');
  const count=chunk.match(/class=['"]ztnum['"][\s\S]*?<div\b[^>]*>\s*(\d+)\s*<\/div>/i)?.[1];
  const stocks=[...chunk.matchAll(/<span\b[^>]*class=['"]kline['"][^>]*code=['"](\d{6})['"][^>]*>([\s\S]*?)<\/span>/g)].map(m=>({code:m[1],name:text(m[2])}));
  const unique=[...new Map(stocks.map(s=>[s.code,s])).values()];
  if(!name||count==null||+count!==unique.length)throw Error(`短线侠分类家数与明细不符：${name}`);
  return {name,count:+count,stocks:unique};
 });
 if(!groups.length||new Set(groups.map(g=>g.name)).size!==groups.length)throw Error('短线侠分类缺失或重复');
 return {date,provider:'短线侠 · 按概念涨停复盘',source:'https://www.duanxianxia.com/web/fupan',endpoint:'https://www.duanxianxia.com/api/getFupanByYidong',groups};
}
export async function fetchLimitUps(date,fetcher=fetch){
 async function post(path,body){const r=await fetcher(`https://www.duanxianxia.com/api/${path}`,{method:'POST',body:new URLSearchParams(body),signal:AbortSignal.timeout(18000)});if(!r.ok)throw Error(`短线侠 HTTP ${r.status}`);return r.json()}
 const calendar=await post('getFupanDate',{date,type:'choose'});
 if(calendar.result!=='success'||calendar.date!==date)throw Error(`短线侠尚无 ${date} 复盘`);
 return parseLimitUps(await post('getFupanByYidong',{date,type:'plate'}),date);
}
