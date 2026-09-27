import type {Paper} from '../model';
import {BlockView} from '../block-view';
import {questionBlock} from '../desk-model';
import {activeThemeRows,themeFields,themeSlots} from '../theme-review';
import {requiredValueComplete} from '../required-reviews';

export default function RequiredThemeReview({paper,change,attempted}:{paper:Paper;change:(id:string,value:string|string[])=>void;attempted:boolean}){
 const rows=activeThemeRows(paper);
 return <section className="theme-manual-review" aria-label="各主线板块详细解析">
  <header><h4>逐题材详细解析 · 每日必填</h4><p>七个检查点逐项填写，直接进入报告第六章。强度靠前不等于已经成为主线。</p><a href="#theme-pool" onClick={()=>{const el=document.getElementById('theme-pool');if(el instanceof HTMLDetailsElement)el.open=true;}}>核对 / 校正研究题材 A-C</a></header>
  {rows.length?rows.map(row=><article className="theme-manual-card" key={row}>
   <h5>题材 {'ABC'[row]} · {paper.answers[themeSlots[row].name]}</h5>
   {themeFields(row).map(f=><div key={f.id} className="theme-manual-field"><p>{f.hint}</p><BlockView b={{...questionBlock(f.id),label:f.label}} answers={paper.answers} change={change} required invalid={attempted&&!requiredValueComplete(paper,f.id)}/></div>)}
  </article>):<div className="theme-manual-card"><p>当前未列研究题材。资料未到齐不代表没有题材；可先补录对象。确实没有可研究题材时须说明依据与观察安排。</p><BlockView b={questionBlock('f194')} answers={paper.answers} change={change} required invalid={attempted&&!requiredValueComplete(paper,'f194')}/></div>}
 </section>;
}
