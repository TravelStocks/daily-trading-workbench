import {promotionDay} from './promotions.mjs';

const num=v=>v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v))?Number(v):null;
const validPrice=v=>num(v)>0;
export const quoteUrl=(code,previous,date)=>`https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${code.startsWith('6')?'sh':'sz'}${code},day,${previous},${date},10,`;

export function parseFeedbackQuote(payload,stock,date,previousDate,source){
 const key=(stock.code.startsWith('6')?'sh':'sz')+stock.code,item=payload?.data?.[key];
 if(payload?.code!==0||!Array.isArray(item?.day))throw Error('未复权日线不可用');
 const bars=item.day.filter(b=>b[0]===date);
 if(bars.length!==1)throw Error('目标日无成交日线，停牌/行情缺失待核');
 const b=bars[0],open=num(b[1]),close=num(b[2]),high=num(b[3]),low=num(b[4]);
 if(![open,close,high,low].every(validPrice)||high<Math.max(open,close,low)||low>Math.min(open,close))throw Error('日线价格无效');
 const q=item.qt?.[key];
 const stamp=String(q?.[30]||'');
 const sameQuote=Array.isArray(q)&&q[2]===stock.code&&/^\d{14}$/.test(stamp)&&stamp.startsWith(date.replaceAll('-',''))&&stamp.slice(8,12)>='1500'&&stamp.slice(8,12)<='2359'&&Math.abs(num(q[3])-close)<0.005;
 const reference=sameQuote&&validPrice(q[4])?num(q[4]):null;
 // Never use today's reference/limit prices to label a historical session.
 const limitPrice=sameQuote&&validPrice(q[47])?num(q[47]):null;
 if(limitPrice!==null&&high>limitPrice+0.005)throw Error('日高超过来源涨停价，口径待核');
 const touched=limitPrice===null?null:Math.abs(high-limitPrice)<0.005;
 return {date,previousDate,code:stock.code,open,close,high,low,reference,limitPrice,touched,
  closePct:reference===null?null:(close/reference-1)*100,source,
  note:sameQuote?'同日收盘行情及实际涨停价':'历史日线已取得；同日参考价/涨停价待核'};
}

export function feedbackMember(stock,quote,date){
 const result={...stock,date,closePct:null,touched:null,limitPrice:null,closeDrop:null,maxDrop:null,maxDropBasis:'待核',source:quote?.source||'',note:quote?.note||'同日行情待采集'};
 if(!quote||quote.date!==date||quote.code!==stock.code)return {...result,source:'',note:'同日行情待采集'};
 Object.assign(result,{closePct:num(quote.closePct),touched:quote.touched,limitPrice:quote.limitPrice});
 if(quote.touched===false)result.maxDropBasis='未触板，不适用';
 if(quote.touched===true&&validPrice(quote.limitPrice)&&validPrice(quote.close)&&quote.close<=quote.limitPrice){
  result.closeDrop=(1-quote.close/quote.limitPrice)*100;
  // Opening at the limit proves the session low occurred at/after the touch.
  if(Math.abs(quote.open-quote.limitPrice)<0.005){result.maxDrop=(1-quote.low/quote.limitPrice)*100;result.maxDropBasis='开盘即触板，日内最低价在其后';}
  else result.maxDropBasis='缺少首次触板后的分时，不能用全天最低价代替';
 }
 return result;
}

export function summarizeFeedback(members){
 const values=members.map(s=>s.closePct).filter(Number.isFinite),touched=members.filter(s=>s.touched===true),drops=touched.map(s=>s.closeDrop).filter(Number.isFinite);
 return {failed:members.length,known:values.length,mean:values.length?values.reduce((a,b)=>a+b,0)/values.length:null,
  touchKnown:members.filter(s=>typeof s.touched==='boolean').length,touched:touched.length,
  dropKnown:drops.length,meanDrop:drops.length?drops.reduce((a,b)=>a+b,0)/drops.length:null};
}

export function buildFeedbackDay(previous,current,sessions,quotes,updatedAt){
 const day=promotionDay(previous,current,sessions),today=new Map(current.stocks.map(s=>[s.code,s]));
 const first=previous.stocks.filter(s=>s.boards===1),promoted=first.filter(s=>today.get(s.code)?.boards===2);
 const rows=[{label:'1进2',success:promoted.length,total:first.length,failed:first.filter(s=>!promoted.includes(s)).map(s=>({code:s.code,name:s.name,from:1}))},...day.rows];
 const groups=rows.map(row=>{const members=row.failed.map(s=>feedbackMember(s,quotes[`${day.date}:${s.code}`],day.date));return {label:row.label,success:row.success,total:row.total,members,...summarizeFeedback(members)};});
 return {date:day.date,previousDate:day.previousDate,updatedAt,groups,overall:summarizeFeedback(groups.slice(1).flatMap(g=>g.members)),sources:day.sources,
  scope:'失败均值为同梯队未晋级股的等权收盘涨跌幅；整体仅含昨日二板及以上，首板单列。缺失样本不按0计入。'};
}

export async function collectPromotionFeedback(data,now=new Date(),fetcher=fetch,requestedDates){
 const days={...data.promotionFeedbackDays},quotes={...data.promotionFeedbackQuotes},errors=[],pools=data.promotionPools||{};
 const dates=requestedDates||Object.keys(data.promotionDays||{}).sort().slice(-1);
 for(const date of dates){
  const previousDate=data.promotionDays?.[date]?.previousDate,previous=pools[previousDate],current=pools[date];
  try{
   const skeleton=buildFeedbackDay(previous,current,[previousDate,date],{},now.toISOString());
   for(const stock of skeleton.groups.flatMap(g=>g.members)){
    const key=`${date}:${stock.code}`,prior=quotes[key];
    if(prior?.date===date&&prior?.code===stock.code&&Number.isFinite(prior.closePct)&&typeof prior.touched==='boolean')continue;
    const source=quoteUrl(stock.code,previousDate,date);
    try{const r=await fetcher(source,{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error(`HTTP ${r.status}`);const next=parseFeedbackQuote(await r.json(),stock,date,previousDate,source);quotes[key]=next;}
    catch(e){errors.push(`${date} ${stock.code}: ${e.message}`);}
   }
   days[date]=buildFeedbackDay(previous,current,[previousDate,date],quotes,now.toISOString());
  }catch(e){errors.push(`${date}: ${e.message}`);}
 }
 return {promotionFeedbackDays:days,promotionFeedbackQuotes:quotes,errors};
}
