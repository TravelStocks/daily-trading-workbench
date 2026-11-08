import type {Paper} from '../model';
import {leaderChecks,leaderFields,stages,outcomes} from '../leader-plan';
import './leader-plan.css';

export default function LeaderPlan({paper,date,change}:{paper:Paper;date:string;change:(key:string,value:string)=>void}){
 const value=(key:string)=>String(paper.answers[key]||'');
 const select=(key:string,options:string[])=><select value={value(key)} onChange={e=>change(key,e.target.value)}><option value="">未判断</option>{options.map(s=><option key={s}>{s}</option>)}</select>;
 const note=(key:string)=> <textarea aria-label={leaderFields.get(key)} maxLength={12000} rows={2} value={value(key)} onChange={e=>change(key,e.target.value)}/>;
 return <section id="leader-plan" className="leader-plan"><header><small>{date} · 次日个人预案</small><h2>龙头预案</h2></header><fieldset disabled={paper.submitted}>
 <h3>一、先定地位，再定仓位</h3><div className="lp-identity">{['lpStock','lpTheme','lpRole'].map(k=><label key={k}>{leaderFields.get(k)}<input value={value(k)} maxLength={12000} onChange={e=>change(k,e.target.value)}/></label>)}<label>是否龙头{select('lpLeader',['是','不是','尚未确认'])}</label>{value('lpLeader')==='不是'&&<label>是否有合格机会{select('lpOpportunity',['切换','补涨','都不是'])}</label>}</div>
 <p className="lp-rule">{value('lpLeader')==='不是'?( ['切换','补涨'].includes(value('lpOpportunity'))?'符合个人切换或补涨条件：最多一成，不是必须开仓。':'非龙头：没有确认的切换或补涨机会，观望。'):'个人纪律：非龙头仓位上限一成；仅考虑合格的切换或补涨机会，否则观望。'}</p>
 <h3>二、三种预期，分别写应对</h3>{stages.map((s,i)=><div key={s} className="lp-stage"><h4>{s}</h4><div className="lp-grid">{outcomes.map((o,j)=><label key={o}>{o}{note('lpCase'+i+j)}</label>)}</div></div>)}
 <h3>三、盘口验证与买点</h3><div className="lp-checks">{leaderChecks.map((s,i)=><label key={s}>{s}{note('lpCheck'+i)}</label>)}</div>
 </fieldset></section>;
}
