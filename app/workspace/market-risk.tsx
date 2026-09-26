import {useMarketContext} from './market-context';
import {pct} from '../market-context';
import './market-risk.css';

const value=(n:number|null)=>n==null?'待后续交易日':pct(n);
export default function MarketRisk({date}:{date:string}){
 const {data}=useMarketContext(),risk=data?.marketRiskDays?.[date];
 if(!risk)return <section className="market-risk"><div className="market-risk-heading"><div><h4>炸板、跌停与断板反馈</h4><p>当日风险数据尚未取得，自动同步后补充。</p></div></div></section>;
 const follow=risk.breakFollowUp;
 return <section className="market-risk" aria-label="炸板跌停与断板反馈">
  <div className="market-risk-heading"><div><span>亏钱效应补充</span><h4>炸板、跌停与断板反馈</h4></div><small>{risk.provider} · {date}</small></div>
  <div className="risk-summary-grid">
   <article><span>炸板率</span><strong>{risk.brokenRate==null?'—':`${(risk.brokenRate*100).toFixed(1)}%`}</strong><small>{risk.brokenCount} 炸 / {risk.limitUpCount+risk.brokenCount} 次冲板</small></article>
   <article><span>跌停</span><strong>{risk.limitDownCount}</strong><small>标的与题材见下方</small></article>
   <article><span>断板第1日均涨幅</span><strong>{value(follow.day1Avg)}</strong><small>{follow.sampleCount} 个前日二板及以上样本</small></article>
   <article><span>断板第2日均涨幅</span><strong>{value(follow.day2Avg)}</strong><small>按后续交易日自动补齐</small></article>
   <article><span>断板第3日均涨幅</span><strong>{value(follow.day3Avg)}</strong><small>按后续交易日自动补齐</small></article>
  </div>
  <div className="risk-detail-grid">
   <details open><summary>炸板标的 <b>{risk.brokenCount}</b></summary><div className="risk-stock-list">{risk.brokenStocks.map(s=><span key={s.code}><b>{s.name}</b><small>{s.theme} · {s.pct==null?'—':pct(s.pct)}</small></span>)}</div></details>
   <details open><summary>跌停标的与题材 <b>{risk.limitDownCount}</b></summary><div className="risk-stock-list">{risk.limitDownStocks.map(s=><span key={s.code}><b>{s.name}</b><small>{s.theme} · {s.pct==null?'—':pct(s.pct)}</small></span>)}</div></details>
   <details><summary>断板反包样本 <b>{follow.rebound.length}</b></summary><div className="risk-stock-list">{follow.rebound.length?follow.rebound.map((s,i)=><span key={`${s.code}-${s.day}-${i}`}><b>{s.name}</b><small>断板后第{s.day}日 · {pct(s.pct!)} · {s.theme}</small></span>):<p>暂未捕捉到涨停反包样本。</p>}</div></details>
   <details><summary>断板后深水样本 <b>{follow.deepWater.length}</b></summary><div className="risk-stock-list">{follow.deepWater.length?follow.deepWater.map((s,i)=><span key={`${s.code}-${s.day}-${i}`}><b>{s.name}</b><small>断板后第{s.day}日 · {pct(s.pct!)} · {s.theme}</small></span>):<p>暂未捕捉到跌幅超过 5% 的样本。</p>}</div></details>
  </div>
 </section>;
}
