import {useMarketContext} from './market-context';
import {pct} from '../market-context';
import './market-risk.css';

export default function MarketRisk({date}:{date:string}){
 const {data}=useMarketContext(),risk=data?.marketRiskDays?.[date];
 if(!risk)return <section className="market-risk"><div className="market-risk-heading"><div><h4>炸板、跌停与断板反馈</h4><p>当日风险数据尚未取得，自动同步后补充。</p></div></div></section>;
 return <section className="market-risk" aria-label="炸板跌停与断板反馈">
  <div className="market-risk-heading"><div><span>亏钱效应补充</span><h4>炸板、跌停与断板反馈</h4></div><small>{risk.provider} · {date}</small></div>
  <div className="risk-summary-grid">
   <article><span>炸板率</span><strong>{risk.brokenRate==null?'—':`${(risk.brokenRate*100).toFixed(1)}%`}</strong><small>{risk.brokenCount} 炸 / {risk.limitUpCount+risk.brokenCount} 次冲板</small></article>
   <article className="one-word-summary"><span>一字板</span><strong>{risk.oneWordCount??0}</strong><small>09:25 封板且全天未开板</small></article>
   <article><span>跌停</span><strong>{risk.limitDownCount}</strong><small>标的与题材见下方</small></article>
  </div>
  <p><a href="#objective-data">断板 / 炸板后续 D1-D3 表现见客观数据模块：固定事件日样本，不以事件日冒充后续首日。</a></p>
  <div className="risk-detail-grid">
   <details open><summary>一字板个股与题材 <b>{risk.oneWordCount??0}</b></summary><div className="risk-stock-list">{risk.oneWordStocks?.length?risk.oneWordStocks.map(s=><span key={s.code}><b>{s.name} <i>{s.code}</i></b><small>{s.theme} · {s.priorBoards??1}板</small></span>):<p>当日没有符合严格口径的一字板。</p>}</div></details>
   <details open><summary>炸板标的 <b>{risk.brokenCount}</b></summary><div className="risk-stock-list">{risk.brokenStocks.map(s=><span key={s.code}><b>{s.name}</b><small>{s.theme} · {s.pct==null?'—':pct(s.pct)}</small></span>)}</div></details>
   <details open><summary>跌停标的与题材 <b>{risk.limitDownCount}</b></summary><div className="risk-stock-list">{risk.limitDownStocks.map(s=><span key={s.code}><b>{s.name}</b><small>{s.theme} · {s.pct==null?'—':pct(s.pct)}</small></span>)}</div></details>
  </div>
 </section>;
}
