import type {Paper} from './model';

export type CandidateField={id:string;label:string;hint:string};
export const requiredCandidateBlocks=['f67','f80','f84','f88','f92','f187','f188','f189','f190'];
export const candidateAnswer=(p:Paper,id:string)=>typeof p.answers[id]==='string'?p.answers[id].trim():'';
export const reviewValueComplete=(value:string)=>!!value.trim()&&!/^(?:待补充|待填写|待核(?:实)?|待确认|待定|未填(?:写)?|未提供|未知|不确定|暂无|无|不适用|N\/?A|null|undefined|[-—_…\s.]+)[。.!！\s]*$/i.test(value.trim());
export const candidateRows=(p:Paper)=>[0,1,2,3].filter(row=>reviewValueComplete(candidateAnswer(p,`f66_${row}_1`)));
export function nextDayFields(row:number):CandidateField[]{
 return [
  ['量能预期','写明预期量能、比较基准和不符合预期时的处理。'],
  ['开盘预期','写明开盘情景及观察条件，不确定时说明原因。'],
  ['连板 / 形态预期','区分连板、反包、趋势或仅观察，写明失效条件。'],
  ['个股转强确认','写明可以观察、核对的确认信号，不能只写“转强”。'],
  ['板块预期','写题材预期节奏、前后排跟随及失效信号，不只填题材名。'],
 ].map(([label,hint],i)=>({id:`f187_${row}_${i+1}`,label,hint}));
}
export function leaderFields(row:number):CandidateField[]{
 const dimensions=['抗跌性','主动性','领涨性','第一性','价值性','市场性','唯一性'];
 return [
  ...dimensions.map((label,i)=>({id:`f67_${i}_${row+1}`,label,hint:'判断 + 同日依据；证据不足时注明缺口与核验条件。'})),
  ...[
   ['五维结论','综合主动性、领涨性、抗跌性、市场性、价值性，并说明唯一性是否确认。'],
   ['100%异动监管距离','填写日期、口径与依据；无法核实时写明缺失数据，不编造数字。'],
   ['题材梯队完整性','写明高标、中位与低位梯队，以及缺失或负反馈。'],
   ['题材持续性','写明催化、延续证据和失效条件。'],
  ].map(([label,hint],i)=>({id:`f188_${row}_${i+1}`,label,hint})),
  {id:['f80','f84','f88','f92'][row],label:'筹码结构 / 量能备注',hint:'按板序记录量能、换手与承接；未核实部分写原因及核验计划。'},
 ];
}
export const noCandidateFields:CandidateField[]=[
 {id:'f190',label:'无候选时的明日安排',hint:'说明明日不参与或仅观察的安排，以及重新评估的触发条件。'},
 {id:'f189',label:'今日无候选的核验说明',hint:'说明为何没有合格候选及主要证据。资料未到齐不等于市场没有候选。'},
];
export function requiredCandidateReview(p:Paper){
 const rows=candidateRows(p);
 return [
  {id:'required-next-day',title:'明日核心票预期细化',fields:nextDayFields},
  {id:'required-leaders',title:'龙头预备票核验',fields:leaderFields},
 ].map((group,index)=>{
  const fields=rows.length?rows.flatMap(row=>group.fields(row).map(f=>({...f,label:candidateAnswer(p,`f66_${row}_1`)+' · '+f.label}))):[noCandidateFields[index]];
  const missing=fields.filter(f=>!reviewValueComplete(candidateAnswer(p,f.id)));
  return {id:group.id,title:group.title,fields,missing,filled:fields.length-missing.length,total:fields.length,complete:missing.length===0};
 });
}
export function hasCandidateReview(p:Paper,row:number){
 return [...nextDayFields(row),...leaderFields(row)].some(f=>!!candidateAnswer(p,f.id));
}
