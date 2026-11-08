import archive from './november-close-archives.json' with {type:'json'};

export function restoreDatedEvidence(base,context){
 for(const [date,extra] of Object.entries(archive)){
  const day=base.days[date];if(!day)continue;
  const prev=day.previousDate,sec=id=>day.sections.find(s=>s.id===id);
  const ranks=d=>base.themeFactorInputs?.ranks[d]?.complete?base.themeFactorInputs.ranks[d].rows:[];
  const today=ranks(date),yesterday=ranks(prev).slice(0,5);
  if(today.length)day.topThemes=today.slice(0,5);
  const pop=sec('popularity');
  if(pop.status!=='complete')Object.assign(pop,{columns:['排名','个股'],rows:extra.rows,sources:[extra.source],status:'partial',note:'同花顺日榜前50，来自当日盘后转载；不是15:00整点快照。'});
  const market=sec('market'),values=new Map(market.rows.map(([k,v])=>[k,v]));
  if(extra.breadth){
   const risk=context.marketRiskDays[date],zt=risk.limitUpCount,zb=risk.brokenCount;
   const replacement=[['上涨家数',extra.breadth[0],'家'],['下跌家数',extra.breadth[1],'家'],['涨停家数',zt,'家'],['跌停家数',risk.limitDownCount,'家'],['封板率',Number((100*zt/(zt+zb)).toFixed(2)),'%']];
   market.rows=market.rows.filter(row=>row[1]!=null&&!replacement.some(r=>r[0]===row[0])).concat(replacement);
   market.sources=[...new Set([...market.sources,...Object.values(risk.sources),'https://push2delay.eastmoney.com/api/qt/ulist.np/get?fltt=2&invt=2&fields=f12,f14,f104,f105,f106,f124&secids=1.000002,0.399107'])];
   market.note='东方财富沪深指数成交额、沪深A股涨跌家数和涨跌停池。短线侠当日昨日涨停表现、昨日连板表现未取得。';
   replacement.forEach(([k,v])=>values.set(k,v));
  }
  for(const [name,a,b,unit] of [['涨跌家数','上涨家数','下跌家数',['涨','跌']],['涨跌停','涨停家数','跌停家数',['涨停','跌停']]]){
   if(Number.isFinite(values.get(a))&&Number.isFinite(values.get(b)))day.metrics[name]=values.get(a)+unit[0]+' / '+values.get(b)+unit[1];
  }
  if(Number.isFinite(values.get('封板率')))day.metrics['封板率']=values.get('封板率')+'%';
  const prior=sec('prior-themes');
  if(yesterday.length===5&&!prior.rows.length){
   prior.rows=yesterday.map(t=>{const now=today.find(s=>s.code===t.code);return [t.rank,t.name,t.strength,now?.strength??null,now?.rank??(today.length?'前十外':'当日未发布排名')]});
   prior.status='partial';
  }
  const members=sec('members'),groups=base.themeFactorInputs?.themes[prev]||[],current=base.themeFactorInputs?.themes[date]||[];
  if(!members.rows.length&&groups.length){
   const hits=new Set([...yesterday,...day.topThemes].map(t=>t.name.replace(/概念$/,'')));
   const stocks=new Map(current.flatMap(g=>g.stocks).map(s=>[s.code,s]));
   members.rows=groups.filter(g=>g.name.split(/[/、]/).some(n=>hits.has(n.replace(/概念$/,'')))).flatMap(g=>g.stocks.map(s=>{
    const q=base.quoteCache.stocks[s.code]?.[date],seal=stocks.get(s.code);
    return [g.name,s.name+' '+s.code,q?.pct??null,q?.amount==null?null:Number((q.amount/1e8).toFixed(2)),q?.turnover??null,seal?[seal.firstSeal,seal.lastSeal].filter(Boolean).join(' / ')||null:current.length?'未在当日分类池':'未取得封板记录'];
   }));
   if(members.rows.length){members.status='partial';members.note='固定昨日成员，逐股对照今日收盘。空项表示未取得当日行情或封板时间。'}
  }
  const theme=sec('themes'),risk=context.marketRiskDays[date];
  if(!current.length&&risk?.limitUpStocks?.length&&theme.status!=='complete'){
   const groups=new Map();for(const s of risk.limitUpStocks){const k=s.theme||'未分类';groups.set(k,[...(groups.get(k)||[]),s]);}
   Object.assign(theme,{rows:[...groups].sort((a,b)=>b[1].length-a[1].length).map(([k,v])=>[k,v.length,v.map(s=>s.name+' '+s.boards+'板').join(' / ')]),columns:['来源行业','涨停数','个股与连续板数'],sources:[risk.sources.limitUp],status:'partial',note:'东方财富收盘涨停池，按来源行业展示；不是短线侠概念分类，也不代表题材强度排名。'});
  }
  day.gaps=day.sections.filter(s=>s.status!=='complete').map(({id,title,status,note})=>({id,title,status,note}));
 }
 return base;
}
