import type {Paper} from '../model';
import {candidateAnswer,candidateRows,nextDayFields,leaderFields,noCandidateFields,requiredCandidateReview,reviewValueComplete,type CandidateField} from '../required-candidates';
import './required-candidate-review.css';

export default function RequiredCandidateReview({paper,change,attempted,kind}:{paper:Paper;change:(id:string,value:string)=>void;attempted:boolean;kind?:"next"|"leaders"}){
 const rows=candidateRows(paper),groups=requiredCandidateReview(paper);
 function input(field:CandidateField,name=''){
  const value=candidateAnswer(paper,field.id),invalid=attempted&&!reviewValueComplete(value);
  return <div className="candidate-review-field" key={field.id}>
   <label htmlFor={field.id}>{field.label}<span>必填</span></label>
   <p id={field.id+'-hint'}>{field.hint}</p>
   <textarea id={field.id} aria-label={[name,field.label].filter(Boolean).join(' · ')} required aria-required="true" aria-invalid={invalid||undefined} aria-describedby={field.id+'-hint'+(invalid?' '+field.id+'-error':'')} maxLength={12000} value={typeof paper.answers[field.id]==='string'?paper.answers[field.id]:''} placeholder="写明判断与依据；无法确认时说明原因和核验条件。" onChange={e=>change(field.id,e.target.value)}/>
   {invalid&&<small className="candidate-field-error" id={field.id+'-error'}>请补充具体内容，不能只写“待补充”或“待核”。</small>}
  </div>;
 }
 return <div className="required-candidate-reviews">
  {groups.map((group,index)=>(!kind||(kind==='next'?index===0:index===1))&&<section className="candidate-review-module" id={group.id} key={group.id} aria-labelledby={group.id+'-title'}>
   <header><span className="candidate-review-index">逐票</span><div><span className="candidate-required-badge">每日必填 · 报告第{index===0?'十二':'十三'}章</span><h3 id={group.id+'-title'}>{group.title}</h3><p>{index===0?'每只核心票的量能、开盘、形态、转强条件和板块节奏，填写一次直接进入报告。':'七维比较与监管、梯队、持续性、筹码核验集中在这里，不再隐藏于选填。'}</p></div><span className="module-progress">{group.filled} / {group.total}</span></header>
   <div className="candidate-review-intro"><p>按系统候选池 A-D 逐只填写；不要求凑满四只。不确定的项须说明证据缺口与核验条件，不代填交易结论。</p><a href="#candidate-pool" onClick={()=>{const el=document.getElementById('candidate-pool');if(el instanceof HTMLDetailsElement)el.open=true;}}>核对 / 校正候选池</a></div>
   {rows.length?rows.map(row=><article className="candidate-review-card" key={row}>
    <div className="candidate-review-identity"><span>候选 {'ABCD'[row]}</span><h4>{candidateAnswer(paper,`f66_${row}_1`)}</h4><p>{[candidateAnswer(paper,`f66_${row}_2`),candidateAnswer(paper,`f66_${row}_3`)].filter(Boolean).join(' · ')}</p></div>
    <div className="candidate-review-grid">{(index===0?nextDayFields(row):leaderFields(row)).map(field=>input(field,candidateAnswer(paper,`f66_${row}_1`)))}</div>
   </article>):<div className="candidate-review-empty"><p>当前候选池为空。若同日资料还未到齐，请先核对资料或补录候选；确实没有候选时，也必须完成以下说明。</p>{input(noCandidateFields[index])}</div>}
  </section>)}
 </div>;
}
