import type {AutoEntry,Paper} from './model';
import {matchingLimitUps,type LimitUpDay} from './market-context';

const source='https://travelstocks.github.io/daily-trading-workbench/data/market-context.json';
const normalize=(name:string)=>name.toLowerCase().replace(/产业链|概念|板块/g,'').replace(/半导体/g,'芯片').replace(/房地产|地产链/g,'地产').replace(/医疗/g,'医药').trim();

export function applyThemeLimitUpFill(paper:Paper,date:string,day?:LimitUpDay){
 if(paper.submitted)return {paper,changed:false};
 const theme=typeof paper.answers.f40==='string'?paper.answers.f40.trim():'';
 const current=paper.answers.f44,prior=paper.autoFill?.f44;
 if(prior?current!==prior.value:Boolean(current))return {paper,changed:false};
 const sameSubject=prior?.sourceDate===date&&prior.subject===theme;
 // A temporary feed failure must not erase an already verified same-date count.
 if(theme&&(!day||day.date!==date)&&sameSubject)return {paper,changed:false};
 let value=theme?'待核':'',evidence=theme?`${date} · ${theme}：等待同日涨停复盘，系统自动补充，无需手写。`:'请先填写题材名称，系统按所选日期自动匹配涨停家数。';
 if(theme&&day?.date===date){
  const exact=day.groups.filter(g=>normalize(g.name)===normalize(theme));
  const groups=exact.length?exact:matchingLimitUps(theme,day.groups);
  const valid=groups.every(g=>Number.isInteger(g.count)&&g.count>=0&&g.count===new Set(g.stocks.map(s=>s.code)).size);
  if(!valid){
   if(sameSubject)return {paper,changed:false};
   evidence=`${date} · ${theme}：来源家数与个股明细不一致，等待重新核验。`;
  }else if(!groups.length){
   value='未单列';evidence=`${date} · ${theme}：短线侠当日未单列匹配分类，不代表零涨停。系统继续检查同日数据。`;
  }else{
   value=exact.length===1?`${groups[0].count} 家`:groups.map(g=>`${g.name}：${g.count} 家`).join('；')+'（原始分类，未拆分或合计）';
   evidence=`${date} · 研究题材：${theme}。短线侠原始分类：${groups.map(g=>`${g.name} ${g.count} 家`).join('；')}。已按股票代码核对家数，复合分类不当作子题材独立数量。`;
  }
 }
 const next:AutoEntry={value,sourceDate:date,sourceUrl:source,subject:theme,evidence};
 if(current===value&&JSON.stringify(prior)===JSON.stringify(next))return {paper,changed:false};
 return {paper:{...paper,answers:{...paper.answers,f44:value},autoFill:{...paper.autoFill,f44:next}},changed:true};
}
