import type {Paper,AutoEntry} from './model';
import type {PromotionFeedbackDay} from './market-context';

export type PromotionDay={date:string;previousDate:string;scope:string;sources:string[];updatedAt:string;rows:{label:string;success:number;total:number;rate:number|null;promoted:{code:string;name:string;from:number;to:number}[];failed:{code:string;name:string;from:number}[]}[]};
export const promotionSource='https://travelstocks.github.io/daily-trading-workbench/data/market-context.json';

export function applyPromotionFill(paper:Paper,date:string,day?:PromotionDay,feedback?:PromotionFeedbackDay){
  if(paper.submitted||!day||day.date!==date||day.previousDate>=date||day.rows.length!==4)return {paper,changed:false};
  const labels=['2进3','3进4','4进5','5板以上'];
  if(day.rows.some((r,i)=>r.label!==labels[i]||!Number.isInteger(r.total)||!Number.isInteger(r.success)||r.success<0||r.total<r.success))return {paper,changed:false};
  const answers={...paper.answers},autoFill={...paper.autoFill};let changed=false;
  day.rows.forEach((row,i)=>{
    const rate=row.total?`${(row.success/row.total*100).toFixed(1)}%`:null;
    const values=[`${row.success} / ${row.total}`,rate?`晋级率 ${rate}；未晋级 ${row.total-row.success} 只`:'无参赛样本，不计算晋级率'];
    const group=feedback?.date===date&&feedback.previousDate===day.previousDate?feedback.groups.find(g=>g.label===row.label):undefined;
    if(group&&group.total===row.total&&group.success===row.success&&group.failed){
      values[1]+=`；失败股均值 ${group.mean===null?'待核':(group.mean>0?'+':'')+group.mean.toFixed(2)+'%'}（${group.known}/${group.failed} 已核）`;
      if(group.touched)values[1]+=`；${group.touched}只曾触板，平均板上收盘回撤 ${group.meanDrop===null?'待核':group.meanDrop.toFixed(2)+'%'}`;
    }
    const evidence=`${day.previousDate} → ${date}，按股票代码逐只匹配收盘连板。${day.scope}。晋级：${row.promoted.map(s=>s.name).join('、')||'无'}。`;
    values.forEach((value,c)=>{
      const id=`f11_${i}_${c+1}`,prior=autoFill[id],current=answers[id];
      if(prior?current!==prior.value:Boolean(current))return;
      const next:AutoEntry={value,sourceDate:date,sourceUrl:promotionSource,evidence};
      if(current!==value||JSON.stringify(prior)!==JSON.stringify(next)){answers[id]=value;autoFill[id]=next;changed=true;}
    });
  });
  return {paper:changed?{...paper,answers,autoFill}:paper,changed};
}
