const finite = v => typeof v === 'number' && Number.isFinite(v);
const round = v => finite(v) ? Number(v.toFixed(2)) : null;
const mean = a => a.length && a.every(finite) ? a.reduce((x,y)=>x+y,0)/a.length : null;
const ratio = (a,b) => finite(a) && finite(b) && b>0 ? round(a/b) : null;
const display = v => finite(v) ? String(round(v)) : '待核';
const billions = v => display(finite(v)?v/1e8:null);

export function parseAdjustedSeries(payload, code, source) {
  if (payload?.data?.code !== code || !Array.isArray(payload.data.klines)) throw Error('复权日线身份缺失');
  return {source, basis:'同次请求前复权', rows:Object.fromEntries(payload.data.klines.map(line=>{
    const c=line.split(',');
    const n=i=>c[i]!==''&&Number.isFinite(Number(c[i]))?Number(c[i]):null;
    return [c[0],{date:c[0],close:n(2),low:n(4)}];
  }))};
}

export function parseTencentAdjusted(payload,key,source) {
  const item=payload?.data?.[key],rows=item?.qfqday||item?.day;
  if(payload?.code!==0||item?.qt?.[key]?.[2]!==key.slice(2)||!Array.isArray(rows))throw Error('备用复权行情身份缺失');
  return {source,basis:'腾讯同次请求前复权',rows:Object.fromEntries(rows.map(r=>[r[0],{date:r[0],close:Number(r[2]),low:Number(r[4])}]))};
}

export function parseSohuHistory(payload,code,source,begin,end) {
  const p=Array.isArray(payload)?payload.find(s=>s.code===`cn_${code}`):payload;
  if(p?.status!==0||p.code!==`cn_${code}`||!Array.isArray(p.hq))throw Error('备用历史行情身份缺失');
  const n=v=>v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(String(v).replace('%','')))?Number(String(v).replace('%','')):null;
  const rows=p.hq.filter(r=>r[0]>=begin&&r[0]<=end);
  if(rows.some(r=>!/^\d{4}-\d{2}-\d{2}$/.test(r[0])||n(r[2])===null)||new Set(rows.map(r=>r[0])).size!==rows.length)throw Error('备用历史日线重复或格式无效');
  return Object.fromEntries(rows.map(r=>[r[0],{date:r[0],open:n(r[1]),close:n(r[2]),change:n(r[3]),pct:n(r[4]),low:n(r[5]),high:n(r[6]),volume:n(r[7]),amount:n(r[8])===null?null:n(r[8])*10000,turnover:n(r[9]),source}]));
}

export function priceStructure(series, date) {
  if (!series?.basis || !series.rows?.[date]) return {ma5:null,ma10:null,lowSequence:[],basis:null,source:null};
  const rows=Object.values(series.rows).filter(r=>r.date<=date).sort((a,b)=>a.date.localeCompare(b.date));
  const avg=n=>rows.length>=n?round(mean(rows.slice(-n).map(r=>r.close))):null;
  const current=series.rows[date],ma5=avg(5),ma10=avg(10);
  return {ma5,ma10,close:current.close,lowSequence:rows.slice(-5).map(r=>({date:r.date,low:r.low})),
    above5:finite(ma5)&&finite(current.close)?current.close>=ma5:null,
    above10:finite(ma10)&&finite(current.close)?current.close>=ma10:null,basis:series.basis,source:series.source};
}

// Replaying dated evidence keeps backfills deterministic and prevents future exits
// from changing the historical view. The archive, not a rolling survivor list, owns membership.
export function buildCrowdingWatch({previous={},sessions,pools={},quotes={},adjusted={},themes={},asOf}) {
  const calendar=[...new Set([...(previous.sessions||[]),...sessions])].filter(d=>d<=asOf).sort();
  const savedPools={...(previous.pools||{})};
  for(const [date,pool] of Object.entries(pools)) if(date<=asOf&&pool?.complete&&pool.date===date) savedPools[date]=pool;
  const oldRecords=previous.records||[];
  const oldById=new Map(oldRecords.map(r=>[r.id,r]));
  const seeds=new Map();
  for(const r of oldRecords.filter(r=>r.entryDate<=asOf)) {
    if(!seeds.has(r.entryDate))seeds.set(r.entryDate,[]);
    seeds.get(r.entryDate).push(r);
  }
  const firstKnown=Object.keys(savedPools).filter(d=>d<=asOf).sort()[0];
  const originDate=[previous.originDate,firstKnown,...oldRecords.map(r=>r.entryDate)].filter(Boolean).sort()[0]||asOf;
  const records=[],active=new Map(),days={};
  for(const date of calendar.filter(d=>d>=originDate)) {
    const pool=savedPools[date];
    const candidates=new Map((seeds.get(date)||[]).map(r=>[r.code,{code:r.code,name:r.name,boards:r.entryBoards,seed:r}]));
    for(const s of pool?.stocks||[])if(Number.isInteger(s.boards)&&s.boards>=4)candidates.set(s.code,s);
    for(const s of candidates.values()) {
      if(active.has(s.code))continue;
      const id=`${s.code}:${date}`,prior=oldById.get(id)||s.seed;
      const record={id,code:s.code,name:s.name,entryDate:date,entryBoards:s.boards,
        entrySource:pool?.source||prior?.entrySource,scopeKey:pool?.scopeKey||prior?.scopeKey,
        peakBoards:s.boards,breakDate:null,observed:0,negativeStreak:0,exitDate:null,observations:[]};
      const entryIndex=calendar.indexOf(date);
      record.leadIn=calendar.slice(Math.max(0,entryIndex-5),entryIndex).map(d=>{
        const saved=prior?.leadIn?.find(o=>o.date===d),q=quotes[s.code]?.[d]||saved?.quote||{},i=calendar.indexOf(d);
        const priorVolumes=calendar.slice(Math.max(0,i-5),i).map(p=>quotes[s.code]?.[p]?.volume??null);
        return {date:d,offset:i-entryIndex,quote:q,negativeStreak:0,
          volumeVsPrevious:ratio(q.volume,quotes[s.code]?.[calendar[i-1]]?.volume)??saved?.volumeVsPrevious??null,
          volumeVs5:(priorVolumes.length===5?ratio(q.volume,mean(priorVolumes)):null)??saved?.volumeVs5??null,
          structure:adjusted[s.code]?.rows?.[d]?priceStructure(adjusted[s.code],d):saved?.structure||priceStructure(null,d)};
      });
      records.push(record);active.set(s.code,record);
    }
    const daily=[];
    for(const r of active.values()) {
      const prior=oldById.get(r.id)?.observations.find(o=>o.date===date);
      const q={...(prior?.quote||{}),...Object.fromEntries(Object.entries(quotes[r.code]?.[date]||{}).filter(([,v])=>v!==null&&v!==undefined))};
      const valid=finite(q.close)&&finite(q.pct)&&q.volume!==0&&q.suspended!==true;
      const current=pool?.stocks?.find(s=>s.code===r.code);
      if(current?.boards)r.peakBoards=Math.max(r.peakBoards,current.boards);
      if(date>r.entryDate&&valid&&pool?.scopeKey===r.scopeKey&&!r.breakDate&&(!current||current.boards<4))r.breakDate=date;
      if(date>r.entryDate&&valid)r.observed++;
      r.negativeStreak=valid&&q.pct < -6-1e-9?r.negativeStreak+1:0;
      const position=calendar.indexOf(date),previousDate=calendar[position-1];
      const volumeRows=calendar.slice(Math.max(0,position-5),position).map(d=>quotes[r.code]?.[d]?.volume??oldById.get(r.id)?.observations.find(o=>o.date===d)?.quote?.volume??null);
      const priorVolume=quotes[r.code]?.[previousDate]?.volume??r.observations.at(-1)?.quote?.volume;
      const structure=adjusted[r.code]?.rows?.[date]?priceStructure(adjusted[r.code],date):prior?.structure||priceStructure(null,date);
      const themeNames=(themes[date]||[]).filter(g=>g.stocks.some(s=>s.code===r.code)).map(g=>g.name);
      const inherited=r.observations.at(-1)?.themes||[];
      const themeEvidence=themeNames.length?themeNames.map(name=>({name,date})):prior?.themes||inherited;
      const obs={date,offset:position-calendar.indexOf(r.entryDate),quote:valid?q:{...q,pct:null},valid,
        boards:current?.boards??(pool?.complete&&pool.scopeKey===r.scopeKey&&valid?0:null),
        volumeVsPrevious:ratio(q.volume,priorVolume)??prior?.volumeVsPrevious??null,volumeVs5:(volumeRows.length===5?ratio(q.volume,mean(volumeRows)):null)??prior?.volumeVs5??null,
        structure,themes:themeEvidence,observed:r.observed,negativeStreak:r.negativeStreak,peakBoards:r.peakBoards,breakDate:r.breakDate};
      r.observations.push(obs);
      if(r.negativeStreak>=3){r.exitDate=date;r.exitEvidence=r.observations.slice(-3).map(o=>({date:o.date,pct:o.quote.pct}));}
      daily.push({id:r.id,...obs,status:r.exitDate?'今日退出':!valid||r.observed<obs.offset?'数据待核':r.observed<4?'未满4日':'继续观察'});
    }
    days[date]={date,rows:daily,poolComplete:!!pool?.complete};
    for(const [code,r] of active)if(r.exitDate)active.delete(code);
  }
  return {version:1,originDate,asOf,sessions:calendar,pools:savedPools,records,days};
}

export function crowdingSection(watch,date) {
  const day=watch.days[date],sources=new Set(),rows=[];
  const ordered=[...(day?.rows||[])].sort((a,b)=>Number(a.status==='今日退出')-Number(b.status==='今日退出')||b.id.split(':')[1].localeCompare(a.id.split(':')[1])||a.id.localeCompare(b.id));
  for(const row of ordered) {
    const r=watch.records.find(r=>r.id===row.id),tail=[...(r.leadIn||[]),...r.observations].filter(o=>o.date<=date).slice(-5),q=row.quote;
    if(r.entrySource)sources.add(r.entrySource);
    for(const o of tail){if(o.quote.source)sources.add(o.quote.source);if(o.structure.source)sources.add(o.structure.source);}
    const s=row.structure;
    rows.push([
      `${r.name} ${r.code}\n${row.themes.map(t=>`${t.name}（${t.date}）`).join(' / ')||'题材待核'}`,
      `${r.entryDate} 首次可核${r.entryBoards}板\nD${row.offset} / 有效后续${row.observed}日\n${row.status}`,
      `阶段最高${row.peakBoards}板\n${row.boards===null?'今日状态待核':row.boards===0?'今日未涨停':`今日${row.boards}板`}\n${row.breakDate?`首次可核断板 ${row.breakDate}`:'未核实断板'}`,
      tail.map(o=>`${o.date.slice(5)}: ${display(o.quote.volume)}手 · ${display(o.volumeVsPrevious)}倍前日`).join('\n')+'\n成交额/换手/均量倍数见完整轨迹',
      s.basis?`MA5 ${display(s.ma5)} / MA10 ${display(s.ma10)}\n收盘${s.above5===null?'与MA5待核':s.above5?'在MA5及以上':'低于MA5'}；${s.above10===null?'与MA10待核':s.above10?'在MA10及以上':'低于MA10'}\n低点 ${s.lowSequence.map(p=>`${p.date} ${display(p.low)}`).join(' / ')}\n${s.basis}`:'一致复权行情待核，不用未复权跨除权拼接均线',
      `收盘 ${display(q.close)}元\n总市值 ${billions(q.totalCap)}亿 / 流通 ${billions(q.floatCap)}亿\n市值仅接受同日证据`,
      tail.map(o=>`${o.date}: ${display(o.quote.pct)}%`).join('\n')+`\n连续低于-6%：${row.negativeStreak}/3`,
      row.status==='今日退出'?`三日均低于-6%，退出并留档\n${r.exitEvidence.map(e=>`${e.date} ${display(e.pct)}%`).join(' / ')}`:'仅观察池，不自动确认抱团龙；爆量/低价/防御属性不设未经确认的硬阈值。'
    ]);
  }
  const history=watch.records.filter(r=>r.entryDate<=date).map(r=>({label:`${r.name} ${r.code} · ${r.entryDate}入池 · ${r.exitDate&&r.exitDate<=date?`${r.exitDate}退出`:'持续观察'}`,
    lines:[...(r.leadIn||[]),...r.observations].filter(o=>o.date<=date).map(o=>`${o.date} | D${o.offset}${o.offset<0?' 入池前参考':''} | 涨幅${display(o.quote.pct)}% | ${display(o.quote.volume)}手 / ${billions(o.quote.amount)}亿 / 换手${display(o.quote.turnover)}% | 较前日${display(o.volumeVsPrevious)}倍 / 前5日均量${display(o.volumeVs5)}倍 | MA5 ${display(o.structure.ma5)} / MA10 ${display(o.structure.ma10)}${o.offset>=0?` | 连续负反馈${o.negativeStreak}/3`:''}`)}));
  return {id:'crowding-watch',title:'抱团龙识别',history,columns:['标的 / 题材','入池与进度','连板 / 断板','连续量能轨迹','MA5 / MA10与承接','股价 / 市值','逐日反馈','结论 / 退出依据'],rows,
    note:`四连板及以上入池，D0后至少观察4个交易日，满4日仍继续；连续3日收盘涨幅严格小于-6%才退出（可提前触发）。缺测、停牌不拼接负反馈。当前记录起点 ${watch.originDate}，此前未取得的四板事件不宣称已覆盖。量能与涨幅显示最近5日，完整轨迹保存在同日数据包。市值/复权/风格解释未核齐时保留待核，不算确认龙头。`,
    sources:[...sources],status:!day?.poolComplete?'partial':rows.length?'partial':'complete'};
}
