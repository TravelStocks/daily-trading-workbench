import handbook from '../handbook.json';
import LimitUpCalculator from './limit-up-calculator';
import './trading-handbook.css';
type Card={title:string;text:string;emphasis:string};
function CardText({card}:{card:Card}){const at=card.emphasis?card.text.indexOf(card.emphasis):-1;return <p>{at<0?card.text:<>{card.text.slice(0,at)}<em>{card.emphasis}</em>{card.text.slice(at+card.emphasis.length)}</>}</p>}
function Heading({title,note}:{title:string;note?:string}){return <header className="handbook-heading"><div><h2>{title}</h2>{note&&<p>{note}</p>}</div></header>}
export default function TradingHandbook(){return <div id="handbook" className="trading-handbook">
 <div className="handbook-intro"><div><span className="section-kicker">长期保留 · 盘前复读</span><h2>交易手册与常用工具</h2><p>沿用原复盘站的个人交易框架；与每日市场数据分开标注。</p></div><a href={handbook.source} target="_blank" rel="noreferrer">原站资料 ↗</a></div>
 <nav className="handbook-nav" aria-label="交易手册目录">{[['priority-rules','三件要改的事'],['cycle-map','情绪周期图'],['system-profile','体系优缺点'],['expectations','隔日预期'],['knowledge','日常知识'],['theme-rhythm','题材节奏'],['research','专题研究'],['calculators','风控计算器']].map(([id,label])=><a key={id} href={'#'+id}>{label}</a>)}</nav>
 <section id="priority-rules" className="handbook-panel handbook-priority"><Heading title="三件要改的事" note="盘前复读 · 个人交易纪律"/><ol>
 <li><h3>切换默认不做，试错最多半成仓</h3><p>这笔是原抱团仓加仓，还是换了方向？若是切换，默认放弃；确需试错，最多用账户的5%。半成仓是上限，不是出手理由。</p></li>
 <li><h3>没定龙别抢，定龙后回封别慢</h3><p>同身位PK有结果了吗？未定龙不抢。已定龙，且题材、量能和分歧回流符合预案，才看回封盘口：连续进攻大单达到上方剩余压单的1/4是准备，进攻压过抛压才执行。</p></li>
 <li><h3>龙二波提前筛，首次突破才是买点</h3><p>今天看到的是首次主动突破，还是涨远了才敢信？每天筛曾走出三连板及以上的标的和走过一波的趋势龙，标前高、平台上沿，观察主动反包。突破新高看买点，不再创新高看卖点；错过不补追。抱团单只约一成，同时管住总仓位。</p></li>
 </ol><a href="https://travelstocks.github.io/weekly-monthly-quarterly-yearly-trading-review/2026-11-09_2026-11-13/#priority-rules">回看11月9日至13日的周复盘</a></section>
 <section id="cycle-map" className="handbook-panel">
  <Heading title={handbook.cycle.title} note={handbook.cycle.note}/>
  <div className="cycle-map-gallery">
   <figure className="cycle-map-figure"><figcaption>情绪周期图（原图）</figcaption><a className="cycle-map-link" href={handbook.cycle.image} target="_blank" rel="noreferrer" aria-label="打开完整情绪周期图（原图）"><img src={handbook.cycle.image} alt="情绪周期图：混沌期、主升期、退潮期，以及主升二阶段、三阶段的原图批注" width={1160} height={639} loading="lazy"/></a></figure>
   <figure className="cycle-map-figure"><figcaption>情绪周期图（交易节奏标注版）</figcaption><a className="cycle-map-link" href={handbook.cycle.annotatedImage} target="_blank" rel="noreferrer" aria-label="打开完整情绪周期图（交易节奏标注版）"><img src={handbook.cycle.annotatedImage} alt="用户标注的情绪周期图：埋伏低吸、切换、唯一性龙头、龙头二波与补涨二板、龙头反抽与超跌反核" width={1736} height={980} loading="lazy"/></a></figure>
  </div>
  <p className="handbook-footnote">保留用户原图及全部批注；点击图片可查看原尺寸。图示为个人交易框架，不代表当日行情判断。</p>
 </section>
 <section id="system-profile" className="handbook-panel"><Heading title={handbook.profile.title} note={handbook.profile.note}/><div className="profile-grid">{handbook.profile.groups.map((g,i)=><article className={i?'profile-challenge':'profile-comfort'} key={g.title}><h3>{g.title}</h3><ul>{g.items.map(item=><li key={item}>{item}</li>)}</ul></article>)}</div></section>
 <section id="expectations" className="handbook-panel"><Heading title={handbook.expectation.title} note={handbook.expectation.note}/><div className="expectation-scroll" tabIndex={0} role="region" aria-label="隔日预期表，可左右滚动"><table><thead><tr>{handbook.expectation.headers.map(h=><th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{handbook.expectation.rows.map(row=><tr key={row[0]}>{row.map((cell,i)=>i===0?<th scope="row" key={i}>{cell}</th>:<td key={i}>{cell}</td>)}</tr>)}</tbody></table></div></section>
 <section id="knowledge" className="handbook-panel"><Heading title={handbook.knowledge.title} note={handbook.knowledge.note}/><div className="knowledge-grid">{handbook.knowledge.cards.map(card=><article className="reference-card" key={card.title}><h3>{card.title}</h3><CardText card={card}/></article>)}</div></section>
 <section id="theme-rhythm" className="handbook-panel"><Heading title={handbook.rhythm.title} note={handbook.rhythm.note}/><div className="rhythm-stages">{handbook.rhythm.stages.map(stage=><article className="rhythm-stage" key={stage.title}><h3>{stage.title}</h3><div>{stage.cards.map(card=><div className="rhythm-reference" key={card.title}><h4>{card.title}</h4><CardText card={card}/></div>)}</div></article>)}</div></section>
 <section id="research" className="handbook-panel"><span className="section-kicker">专题研究 · 龙头接力模型</span><a className="research-link" href={handbook.research.url} target="_blank" rel="noreferrer"><h2>{handbook.research.title}</h2><span>打开完整作战图 ↗</span></a><p className="research-description">{handbook.research.description}</p><div className="handbook-stats">{handbook.stats.map(s=><div key={s.label}><span>{s.label}</span><strong>{s.value}</strong></div>)}</div><p className="handbook-footnote">原复盘站资料库统计 · 截至 {handbook.asOf}，与顶部所选日期无关。<a href={handbook.source} target="_blank" rel="noreferrer">查看资料库 ↗</a></p></section>
 <LimitUpCalculator/>
 </div>}
