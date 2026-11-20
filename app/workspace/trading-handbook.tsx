import handbook from '../handbook.json';
import LimitUpCalculator from './limit-up-calculator';
import SecondWavePool from './second-wave-pool';
import './trading-handbook.css';
type Card={title:string;text:string;emphasis:string};
function CardText({card}:{card:Card}){const at=card.emphasis?card.text.indexOf(card.emphasis):-1;return <p>{at<0?card.text:<>{card.text.slice(0,at)}<em>{card.emphasis}</em>{card.text.slice(at+card.emphasis.length)}</>}</p>}
function Heading({title,note}:{title:string;note?:string}){return <header className="handbook-heading"><div><h2>{title}</h2>{note&&<p>{note}</p>}</div></header>}
export default function TradingHandbook(){return <div id="handbook" className="trading-handbook">
 <div className="handbook-intro"><div><span className="section-kicker">长期保留 · 盘前复读</span><h2>交易手册与常用工具</h2><p>沿用原复盘站的个人交易框架；与每日市场数据分开标注。</p></div><a href={handbook.source} target="_blank" rel="noreferrer">原站资料 ↗</a></div>
 <nav className="handbook-nav" aria-label="交易手册目录">{[['daily-preflight','每日盘前三问'],['weekly-loss-stop','周亏5%停止开仓'],['priority-rules','三件要改的事'],['leader-modes','龙头模式优先级'],['market-anchor','市场情绪锚'],['second-wave-pool','龙二波观察池'],['cycle-map','情绪周期图'],['system-profile','体系优缺点'],['expectations','隔日预期'],['knowledge','日常知识'],['theme-rhythm','题材节奏'],['research','专题研究'],['calculators','风控计算器']].map(([id,label])=><a key={id} href={'#'+id}>{label}</a>)}</nav>
 <section id="daily-preflight" className="handbook-panel handbook-priority"><Heading title="每日盘前三问" note="每次做盘前预案，先检查，再讨论个股"/><ol>
 <li><h3>本周累计亏损有没有达到5%？</h3><p data-weekly-risk-rule>按周初权益计算整周收益，包含已实现和浮动盈亏，不按周内高点回撤。无出入金时，周收益率 =（当前权益 / 周初权益 - 1）× 100%；有出入金先单独核对，数据未确认标待核。本周任一时点周收益率 ≤ -5%（恰好亏5%也算）即触线：本周剩余时间停止开新仓，新增开仓预算统一为0。空仓、换票、亏损收窄、看好龙头或小仓试错均不能解除。进入新周重新核对周初权益与三问，不自动放行；已有持仓继续按原退出计划管理。</p></li>
 <li><h3>我是不是急着回本，才想买得更早、更重？</h3><p>如果这周没有亏损，我还会在这个位置、用这个仓位买它吗？不因回本冲动放宽买点、仓位和筛选要求；心态由本人确认，不凭亏损猜测。</p></li>
 <li><h3>天时和题材，是否支持这个买点及仓位？</h3><p>核对当前回流、主动转强与承接，不只看启动强度和龙头身份。未触及周亏停开仓时，弱天时只考虑三成及以下的右侧确认，更严限仓优先。</p></li>
 </ol><p><strong>第一问触线，后两问不能推翻停止开仓。</strong>当天预案先记录三问的结论、依据与待核项，再列交易计划；触线后新增开仓预算为0，只保留观察和已有持仓处理。空仓、换票或后续回升不能自行解除本周停止开仓。数据不全标待核，不默认通过；账户数值与心态答案不自动公开。</p></section>
 <section id="weekly-loss-stop" className="handbook-panel handbook-priority"><Heading title="整周亏损达到5%，停止开新仓" note="最高优先级 · 不能靠下一笔重仓把亏损赚回来"/><p><strong>相对本周期初权益，账户累计亏损达到5%（含已实现与浮动盈亏），本周停止新开仓。</strong>不是从周内高点计算；空仓一天、换票或出现更强的龙头，都不能重置本周风险额度。恰好5%也触发，不等超过。已有仓位继续按原退出计划管理；这条不另设强制清仓指令。</p><p>顺序固定：先检查周风险开关，再看天时与仓位，再核题材、地位和买点。未触发开关时，弱天时参与仓位控制在三成及以下，更严的模式上限优先；三成不是触线后的开仓许可。</p><p>弱天时、题材节奏不明时，等实际回流、个股主动转强及承接确认，宁可没有买点，不先押爆量日一定扛住分歧。缩量本身不是右侧确认。天时好时才讨论左侧博弈，仍不自动授权满仓。</p><a href="https://travelstocks.github.io/weekly-monthly-quarterly-yearly-trading-review/2026-11-16_2026-11-20/#second-review">11.16–11.20 二次反思：龙头也会领跌</a></section>
 <section id="recovery-mindset" className="handbook-panel"><Heading title="亏损后，不让回本心态接管下一笔" note="11.16–11.20 本人确认的执行教训"/><p>周四急于扳回本周亏损，使仓位、买点与个股选择的执行失控。买前有题材强度与唯一性龙头信号，也不能为越线开仓或临时放宽要求提供例外。把选股判断与风险纪律分开，不因最后亏损就否定所有买前信号，也不因信号成立就忽略风控。</p><p><strong>下单前问：如果这周没有亏损，我还会在这个位置、用这个仓位买它吗？</strong>回本目标不是加仓、提前买入或放宽筛选的依据；这句自问不能替代最高优先级规则：整周亏损达到5%，本周停止开新仓。</p></section>
 <section id="priority-rules" className="handbook-panel handbook-priority"><Heading title="三件要改的事" note="盘前复读 · 先服从周亏损停止开新仓纪律"/><ol>
 <li><h3>切换默认不做，试错最多半成仓</h3><p>这笔是原抱团仓加仓，还是换了方向？若是切换，默认放弃；确需试错，最多用账户的5%。半成仓是上限，不是出手理由。</p></li>
 <li><h3>没定龙别抢，定龙后回封别慢</h3><p>同身位PK有结果了吗？未定龙不抢。已定龙，且题材、量能和分歧回流符合预案，才看回封盘口：连续进攻大单达到上方剩余压单的1/4是准备，进攻压过抛压才执行。</p></li>
 <li><h3>龙二波提前筛，首次突破才是买点</h3><p>今天看到的是首次主动突破，还是涨远了才敢信？每天筛曾走出三连板及以上的标的和走过一波的趋势龙，标前高、平台上沿，观察主动反包。突破新高看买点，不再创新高看卖点；错过不补追。抱团单只约一成，同时管住总仓位。</p></li>
 </ol><a href="https://travelstocks.github.io/weekly-monthly-quarterly-yearly-trading-review/2026-11-09_2026-11-13/#priority-rules">回看11月9日至13日的周复盘</a></section>
 <section id="leader-modes" className="handbook-panel"><Heading title="我的主模式：龙头" note="盘前按以下顺序筛选；都不符合，可以空仓。"/><ol>
 <li><h3>连板主升二阶段的唯一性龙头</h3><p>题材是否处于连板主升二阶段？分歧回流时，同身位竞争是否已经分出胜负？没有定龙，就不预押赢家。</p></li>
 <li><h3>题材主升二波的龙头二波</h3><p>是题材整体再起，还是只有老龙反弹？平台突破和断板反包都可以观察；只有题材重新走主升、原龙头仍是主动核心，才归入这一类。</p>
 <p id="second-wave-exit"><strong>卖点：首板加速，分批退出。</strong>如果二波的第一个涨停就是加速一字板，可以开始减仓，首笔比例不固定。后续交易日，盘中相对昨收涨幅超过 6% 时，按这笔交易最初持仓数量的 50% 减仓，不是卖掉剩余仓位的一半。分批减至清仓；余仓不足这一份时，只卖余仓。</p></li>
 <li><h3>抱团龙</h3><p>如果走强的是跨题材高标，而不是原题材整体回流，就看它是否是抱团中主动走强、分歧时仍有承接的核心。被别人带起来的后排不算。</p></li>
 </ol></section>
 <section id="market-anchor" className="handbook-panel"><Heading title="市场情绪锚：看跨题材高标怎么回应"/><p>盘前选出代表旧周期的高标。开盘记锚先动的时点，再看其他题材高标跟不跟、第一次分歧时有没有承接。锚跌停而其他高标陆续深水，是负反馈扩散；锚转强、别的高标接力且回落有人承接，是抱团相互支撑。只有一只异动，不用它替整个市场下结论。</p><p>有些高标已不只按本题材定价。分仓到不同板块，也可能是在承担同一轮高标情绪风险。<a href="https://travelstocks.github.io/weekly-monthly-quarterly-yearly-trading-review/2026-11-09_2026-11-13/#market-anchor">11月13日新华传媒案例</a></p></section>
 <SecondWavePool/>
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
