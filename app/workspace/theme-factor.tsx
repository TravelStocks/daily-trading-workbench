import {useEffect,useRef} from 'react';
import type {BaselineSection,ThemeFactor} from '../daily-baseline';
import './theme-factor.css';
const show=(v:number|null,suffix='')=>v===null?'待核':`${v}${suffix}`;
function ThemeRow({item:t}:{item:ThemeFactor['items'][number]}){
 const track=useRef<HTMLDivElement>(null);
 const lastDate=t.points.at(-1)?.date;
 useEffect(()=>{if(track.current)track.current.scrollLeft=track.current.scrollWidth-track.current.clientWidth},[lastDate]);
 return <article className="factor-theme">
  <header><h4>{t.name}</h4><div className="factor-tags"><span className={t.high?'factor-high':''}>{t.rank?`第${t.rank}名`:(t.high===null?'排名待核':'未入来源前列')}</span>{t.rank!==null&&t.rank<=3&&<span>前三优先</span>}{t.firstHigh===true&&<strong>十日首次高强度</strong>}{t.dayNumber!==null&&<span>启动观察第{t.dayNumber}日</span>}{t.signals.map(s=><strong key={s}>{s}</strong>)}</div></header>
  <p className="factor-verdict">{t.next}</p>
  <div ref={track} className="factor-track" role="region" tabIndex={0} aria-label={`${t.name}题材与量能逐日对照`}>
   <div className="factor-lane factor-dates"><b>交易日</b>{t.points.map(p=><span key={p.date}>{p.date.slice(5)}</span>)}</div>
   <div className="factor-lane"><b>题材强度<small>排名 / 涨停数</small></b>{t.points.map(p=><div key={p.date} className={p.high?'factor-cell high':'factor-cell'}><strong>{p.rank?`#${p.rank}`:p.high===false?'前四外':'待核'}</strong><span>{show(p.strength)}</span><small>{show(p.limitUps,'家涨停')}</small></div>)}</div>
   {!t.leaders.length&&<p className="factor-pending">龙头量能待核：尚无可对应题材的连板观察样本，不自动指定龙头。</p>}
   {t.leaders.map(leader=>{const max=Math.max(1,...leader.points.map(p=>p.amount??0));return <div className="factor-lane factor-volume" key={leader.code}><b>{leader.name}<small>{leader.code}</small><small>{leader.selectedDate.slice(5)} · {leader.selectedBoards}板观察样本</small></b>{leader.points.map(p=><div className="factor-cell" key={p.date} title={`${p.date} 成交额${p.amount===null?'待核':(p.amount/1e8).toFixed(2)+'亿元'}；成交量${show(p.volume,'手')}；较前日量${show(p.volumeRatio,'倍')}；换手${show(p.turnover,'%')}`}><div className="factor-bar-slot">{p.amount!==null?<i style={{height:`${Math.max(2,p.amount/max*100)}%`}}/>:<span>待核</span>}</div><strong>{p.amount===null?'—':`${(p.amount/1e8).toFixed(2)}亿`}</strong><small>{p.pct===null?'涨幅待核':`${p.pct>0?'+':''}${p.pct.toFixed(2)}%`}</small><small>量比 {show(p.volumeRatio,'x')}</small></div>)}</div>})}
  </div>
  <details className="factor-evidence"><summary>量能与共振核验</summary><p>柱高为成交额；量比为同来源成交量 / 前一交易日成交量。观察样本保留此前高标，不仅展示今天赢家。</p><p>题材回流当日，分别核对个股放量承接、回封和次日缩量转强；一字缩量不等于健康量能，排名回流不等于买点。</p>{t.leaders.map(s=><p key={s.code}>{s.name}：{s.role}。{s.points.filter(p=>p.source).slice(-1).map(p=><a key={p.date} href={p.source!} target="_blank" rel="noreferrer">行情来源</a>)}</p>)}</details>
 </article>;
}
export default function ThemeFactorModule({section}:{section:BaselineSection}){
 const f=section.factor;
 if(!f)return null;
 const active=f.items.filter(t=>t.high===true||t.firstHigh===true||(t.dayNumber!==null&&t.dayNumber<=3));
 const others=f.items.filter(t=>!active.includes(t));
 return <details open id="leader-theme-factor" className="baseline-module theme-factor-module"><summary><span>龙头题材因子分析 <em>超重点</em></span><small className={section.status}>{section.status==='complete'?'已核验':'含待核项'}</small></summary><div className="baseline-module-body">
  <div className="factor-brief"><strong>{f.items.filter(t=>t.firstHigh===true).length} 个首次高强度</strong><span>{f.items.filter(t=>t.signals.length).length} 个持续性信号</span><span>排名覆盖 {f.rankCoverage}/10 日</span></div>
  <p className="factor-rule">高强度＝当日前四，前三优先。十日首次可能启动；次日、第三日继续验证。</p>
  <div className="factor-models"><span>分歧后回流 <b>强 → 弱 → 强</b></span><span>续强后回流 <b>强 → 强 → 弱 → 强</b></span><span>一直不弱 <b>连续保持前四</b></span></div>
  {active.map(t=><ThemeRow item={t} key={t.code}/>)}
  {!active.length&&<p className="factor-pending">当日无可确认的高强度信号，或数据尚待补齐。</p>}
  {others.length>0&&<details className="factor-older"><summary>近十日其他重点题材（{others.length}）</summary>{others.map(t=><ThemeRow item={t} key={t.code}/>)}</details>}
  <p className="factor-note">{section.note} “一直不弱”从连续3日开始标记，前2日显示续强观察；这是展示口径，不是买入阈值。题材名称无法同源对应时，涨停数留待核。</p>
  <div className="factor-links">{section.sources.map((s,i)=><a href={s} key={s} target="_blank" rel="noreferrer">{['短线侠强度','短线侠涨停明细','题材持续性与龙头量能节奏'][i]}</a>)}</div>
 </div></details>;
}
