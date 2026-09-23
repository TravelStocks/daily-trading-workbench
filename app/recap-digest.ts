import {plain,tables,type Day} from './recap-source';
export type Digest={date:string;headlines:{market:string;emotion:string;plan:string};marketPoints:string[];emotionPoints:string[];planPoints:string[];themes:{name:string;role:string;ladder:{name:string;board:string;role:string}[];outlook:string}[];stocks:{name:string;level:string;theme:string;role:string}[];scenarios:{name:string;level:string;signal:string;action:string;exit:string}[];plans:{type:string;stock:string;entry:string;exit:string;maxLoss:string}[]};
export function baseDigest(day?:Day):Digest{
 const t=day?.sections?.find(s=>/复盘总纲|整体盘面/.test(s.title))?.text||'';
 const group=(n:number)=>{const m=t.match(new RegExp(`(?:^|\\n)R${n} [^\\n]+\\n([^\\n]+)((?:\\n第[^\\n]+)*)`));return {title:m?.[1]||'',points:(m?.[2]||'').split('\n').filter(Boolean).map(s=>s.replace(/^第[一二三四五六七八九十]+\s*/,''))}};
 const m=group(1),e=group(2),p=group(4);
 return {date:day?.date||'',headlines:{market:m.title||day?.summary||'',emotion:e.title||day?.label||'',plan:p.title},marketPoints:m.points,emotionPoints:e.points,planPoints:p.points,themes:[],stocks:[],scenarios:[],plans:[]};
}
const entities:Record<string,string>={quot:'"',amp:'&',lt:'<',gt:'>',apos:"'",nbsp:' '};
const decode=(s:string)=>s.replace(/&(quot|amp|lt|gt|apos|nbsp);/g,(_,n)=>entities[n]||'').replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n)));
const cell=(row:string[],headers:string[],label:string)=>row[headers.indexOf(label)]||'';
export function parseDigest(html:string,day:Day):Digest{
 const declared=html.match(/data-review-date=["'](\d{4}-\d{2}-\d{2})["']/)?.[1];
 const title=plain(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');
 const dateMatch=title.match(/(20\d{2})[年./-](\d{1,2})[月./-](\d{1,2})/);
 const titleDate=dateMatch?[dateMatch[1],dateMatch[2].padStart(2,'0'),dateMatch[3].padStart(2,'0')].join('-'):'';
 if((declared||titleDate)!==day.date)throw Error('原文日期不匹配，未使用该页内容。');
 const digest=baseDigest(day),all=tables(html);
 for(const [n,key,points] of [[1,'market','marketPoints'],[2,'emotion','emotionPoints'],[4,'plan','planPoints']] as const){
  const start=html.search(new RegExp(`data-summary-section=["']R${n}["']`));if(start<0)continue;
  const fragment=html.slice(start),header=fragment.match(/<header\b[^>]*>([\s\S]*?)<\/header>/)?.[1]||'';
  const headline=header.match(/<p\b[^>]*>([\s\S]*?)<\/p>/)?.[1];if(headline)digest.headlines[key]=plain(headline);
  const list=fragment.match(/<ol\b[^>]*class=["'][^"']*recap-summary-points[^"']*["'][^>]*>([\s\S]*?)<\/ol>/)?.[1];
  if(list)digest[points]=[...list.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map(m=>plain(m[1]).replace(/^第[一二三四五六七八九十]+\s*/,''));
 }
 const scenario=all.find(t=>['场景','确认信号','交易动作','撤退信号'].every(k=>t[0]?.includes(k)));
 if(scenario)digest.scenarios=scenario.slice(1).map(r=>({name:cell(r,scenario[0],'场景'),level:cell(r,scenario[0],'级别'),signal:cell(r,scenario[0],'确认信号'),action:cell(r,scenario[0],'交易动作'),exit:cell(r,scenario[0],'撤退信号')}));
 const pool=all.find(t=>['层级','题材','标的','定位'].every(k=>t[0]?.includes(k)));
 if(pool)digest.stocks=pool.slice(1).map(r=>({name:cell(r,pool[0],'标的'),level:cell(r,pool[0],'层级'),theme:cell(r,pool[0],'题材'),role:cell(r,pool[0],'定位')}));
 const outlook=all.find(t=>['板块题材','核心锚','明日预期'].every(k=>t[0]?.includes(k)));
 const starts=[...html.matchAll(/<(?:section|article|div)\b[^>]*class=["'][^"']*\btheme-analysis-block\b[^"']*["'][^>]*>/g)];
 for(let i=0;i<starts.length;i++){
  const block=html.slice(starts[i].index,starts[i+1]?.index),name=plain(block.match(/<h[34][^>]*class=["'][^"']*theme-analysis-title[^"']*["'][^>]*>([\s\S]*?)<\/h[34]>/)?.[1]||'').replace(/^\d+[.、．]\s*/,'');
  const rows=tables(block).find(t=>t[0]?.includes('涨停表现')&&t[0]?.includes('核心标的'));if(!name||!rows)continue;
  const ladder=rows.slice(1).map(r=>({name:cell(r,rows[0],'核心标的').replace(/\s+\d{6}\b/g,''),board:cell(r,rows[0],'涨停表现'),role:cell(r,rows[0],'市场地位')}));
  const next=outlook?.slice(1).find(r=>cell(r,outlook[0],'板块题材')===name||ladder.some(s=>cell(r,outlook[0],'核心锚').includes(s.name)));
  const role=plain(block.match(/<span\b[^>]*class=["'][^"']*theme-analysis-chip[^"']*["'][^>]*>([\s\S]*?)<\/span>/)?.[1]||'');
  digest.themes.push({name,role,ladder,outlook:next?cell(next,outlook![0],'明日预期'):''});
 }
 // Only read the published JSON defaults. Never execute a source script or read another site's local answers.
 const defaults=html.match(/<script\b(?=[^>]*type=["']application\/json["'])(?=[^>]*\bdata-plan-defaults\b)[^>]*>([\s\S]*?)<\/script>/)?.[1];
 if(defaults){try{const raw:unknown=JSON.parse(decode(defaults));if(Array.isArray(raw))digest.plans=raw.filter(r=>r&&typeof r.stock==='string').map(r=>{const str=(k:string)=>typeof r[k]==='string'?r[k]:'';return {type:str('type'),stock:str('stock'),entry:str('entry'),exit:str('exit'),maxLoss:str('maxLoss')}})}catch{/* A malformed optional table does not invalidate the remaining recap. */}}
 return digest;
}
