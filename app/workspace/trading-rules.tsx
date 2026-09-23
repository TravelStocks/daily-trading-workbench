const rules=[
 ['启动','观望','头铁前排','新主线启动，第一时间盯前排，不要后排犹豫。'],
 ['冰点','割肉','二冰反转 / 三冰反转','越接近极致冰点，越要准备看反转核心。'],
 ['高潮','接力','二高砸盘 / 三高砸盘','强修复或高潮日，一高二高先砸强票，别等分歧硬扛。'],
 ['主升','空仓','确认后重仓','主升确认后要敢于集中仓位，不要小仓位看戏。'],
 ['退潮','追涨','空仓等待','退潮期不追涨，不接飞刀，等下一次启动。'],
];
export default function TradingRules(){return <section className="trading-rules" aria-labelledby="rules-title"><div className="rules-heading"><h2 id="rules-title">交易提醒</h2><span>原复盘 · 二十字真言</span></div><p className="trading-maxim"><span>启动头铁</span><span>冰点反转</span><span>高潮砸强</span><span>主升重仓</span><span>退潮空仓</span></p><div className="rules-scroll"><table><thead><tr>{['阶段','常见错误','正确动作','盘中提醒'].map(t=><th key={t}>{t}</th>)}</tr></thead><tbody>{rules.map(row=><tr key={row[0]}>{row.map((cell,i)=>i===0?<th scope="row" key={i}>{cell}</th>:<td key={i}>{cell}</td>)}</tr>)}</tbody></table></div></section>}
