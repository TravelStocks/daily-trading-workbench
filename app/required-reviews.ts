import {fields,type Paper} from './model';
import {candidateAnswer,candidateRows,requiredCandidateReview,reviewValueComplete} from './required-candidates';
import {activeThemeRows,themeFields,themeSlots} from './theme-review';

export const requiredMarketFields=[
 {id:'f3',label:'市场风格与盘面定调（含依据）'},
 {id:'f36',label:'赚钱效应：市场奖励什么（含依据）'},
 {id:'f37',label:'亏钱效应：市场惩罚什么（含依据）'},
];
export const manualReviewGroups=[
 {title:'天时 · 市场环境',subtitle:'周期、空间、反馈、赚钱与亏钱效应',source:/市场风格|赚钱效应/,hint:'自动数据是证据，不代替判断。逐项检查市场允许什么、不允许什么。',checks:[
  {title:'周期与盘面',ids:['f143','f3','f24']},
  {title:'空间、晋级与回流',ids:['f8','f10','f12','f17','f18']},
  {title:'高标与负反馈',ids:['f13','f14','f15','f16']},
  {title:'赚钱与亏钱效应',ids:['f36','f27','f37','f29','f30','f31','f32','f33','f35']},
  {title:'天时等级',ids:['f104_0_rating']},
 ]},
 {title:'地利 · 主线板块',subtitle:'主线依据与逐题材详细解析',source:/各主线|各板块|题材详细/,hint:'原始强度排序只提供研究对象。没有主线也要写明原因，并分析实际关注题材。',checks:[
  {title:'主线与支线',ids:['f60','f61','f62','f65']},
  {title:'地利等级',ids:['f104_1_rating']},
 ]},
 {title:'人和 · 龙头竞争',subtitle:'核心选择、卡位比较与逐票核验',source:/龙头预备票|核心关键票/,hint:'候选池自动带入，比较和结论由你填写。七维核验只填一次，直接进入报告。',checks:[
  {title:'核心与竞争状态',ids:['f170','f76','f68','f69']},
  {title:'横向比较',ids:['f70','f71','f72','f73']},
  {title:'人和等级',ids:['f104_2_rating']},
 ]},
 {title:'交易 · 执行与风控',subtitle:'模式、买卖点、盈亏比、仓位与红线',source:/明日作战推演|大盘明日|明日.*操作计划/,hint:'自己检查条件再定计划；不会根据等级自动给出买卖建议。空仓仍要写观察与重新评估条件。',checks:[
  {title:'模式与参与边界',ids:['f38','f39','f110','f192']},
  {title:'仓位与风险上限',ids:['f116','f191','f117']},
  {title:'买点、卖点与退出',ids:['f177','f178','f179','f180','f127']},
  {title:'交易盈亏比',ids:['f112_0_1','f112_1_1','f112_2_1','f112_3_1','f113','f114']},
 ]},
];
export const entryOnly=new Set(['f117','f177','f178','f179','f180','f112_0_1','f112_1_1','f112_2_1','f112_3_1','f113','f114']);
const comparisonOnly=new Set(['f70','f71','f72','f73']);
export function manualChecks(p:Paper,index:number){
 return manualReviewGroups[index].checks.map(c=>({...c,ids:c.ids.filter(id=>!(index===3&&p.answers.f38==='空仓'&&entryOnly.has(id))&&!(index===2&&!candidateRows(p).length&&comparisonOnly.has(id)))})).filter(c=>c.ids.length);
}
export function requiredValueComplete(p:Paper,id:string){
 const meta=fields.get(id),value=p.answers[id];
 if(meta?.options)return Array.isArray(value)?!!meta.multi&&value.length>0&&value.every(v=>meta.options!.includes(v)):typeof value==='string'&&meta.options.includes(value);
 // Explicit absence is a valid selection; separate evidence fields remain required.
 if(['f60','f61','f170'].includes(id)&&/^(无|暂无|没有)$/.test(candidateAnswer(p,id)))return true;
 return reviewValueComplete(candidateAnswer(p,id));
}
function progress(p:Paper,id:string,title:string,items:{id:string;label:string}[]){
 const missing=items.filter(f=>!requiredValueComplete(p,f.id));
 return {id,title,fields:items,missing,filled:items.length-missing.length,total:items.length,complete:missing.length===0};
}
export const requiredMarketReview=(p:Paper)=>progress(p,'decision-0','市场风格与赚钱效应解析',requiredMarketFields);
export function requiredDailyReviews(p:Paper){
 const candidate=requiredCandidateReview(p);
 return manualReviewGroups.map((group,index)=>{
  const items=manualChecks(p,index).flatMap(c=>c.ids.map(id=>({id,label:requiredMarketFields.find(f=>f.id===id)?.label||fields.get(id)?.label||id})));
  if(index===1){const rows=activeThemeRows(p);items.push(...(rows.length?rows.flatMap(row=>themeFields(row).map(f=>({id:f.id,label:candidateAnswer(p,themeSlots[row].name)+' · '+f.label}))):[{id:'f194',label:'无研究题材的原因与观察安排'}]));}
  if(index===2)items.push(...candidate[1].fields);
  if(index===3)items.push(...candidate[0].fields);
  return progress(p,'decision-'+index,group.title,items);
 });
}
