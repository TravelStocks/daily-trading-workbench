import {fields,sections,type Paper,type Block} from './model';
import type {Day} from './recap-source';
import {candidateRows,nextDayFields,leaderFields} from './required-candidates';
import {requiredMarketFields,manualReviewGroups,requiredDailyReviews} from './required-reviews';
import {themeSlots} from './theme-review';

export const dailyGroups=[
 ...manualReviewGroups.map(g=>({...g,ids:g.checks.flatMap(c=>c.ids),optional:[] as string[]})),
 {title:'执行与反思',subtitle:'同日复盘自动摘录，可随时校正',ids:['f135','f165','f171'],optional:['f1','f2','f139'],source:/今日操作结果|今日操作复盘/,hint:'自动读取操作结果、核心失误及 KISS 改进项，不必重复填写。只摘录原文；手动修改和已归档答案保持不变。'},
] as const;
export const blockById=new Map(sections.flatMap(s=>s.blocks).filter(b=>b.id).map(b=>[b.id!,b]));
export const dailyIds=dailyGroups.flatMap(g=>[...g.ids]);
export const progressIds=(p:Paper)=>[...requiredDailyReviews(p).flatMap(g=>g.fields.map(f=>f.id)),'f135','f165','f171'];
export const completedProgress=(p:Paper)=>requiredDailyReviews(p).reduce((n,g)=>n+g.filled,0)+['f135','f165','f171'].filter(id=>!!p.answers[id]).length;
export const optionalIds=dailyGroups.flatMap(g=>[...g.optional]);
export const factualGroups=[
 {title:'晋级情况',ids:['f11']},
 {title:'题材研究对象与涨停数量',ids:['f40','f50','f55','f44']},
 {title:'龙头候选池',ids:['f66']},
] as const;
const questionLabels:Record<string,string>={
 f143:'收盘情绪周期',f24:'当前最大的市场风险',
 ...Object.fromEntries(requiredMarketFields.map(f=>[f.id,f.label])),
 f60:'我认定的主线（没有可写无）',f61:'支线 / 对照题材（没有可写无）',f62:'主线成立依据与失效信号（无主线须解释原因）',
 f170:'我认定的第一核心（未确定可写观察中）',f76:'龙头竞争是否结束',
 f38:'我的参与模式',f116:'明日仓位上限',f110:'满足什么条件才参与',f127:'出现什么信号减仓或退出',
 f135:'今日实际操作与结果',f165:'最值得修正的一处问题（没有则写无）',f171:'明天只改哪一件事',
 f10:'空间突破 / 压制的具体证据',f13:'最高标表现与带动',f14:'断板高标的承接与反馈',f15:'炸板高标的回封与反馈',
 f68:'低位卡高位：是否发生及依据',f69:'同身位互卡：竞争过程与依据',
 f177:'买点时机',f178:'买点前置 / 等待确认的理由',f179:'卖点时机',f180:'卖点前置 / 后置的理由',
 f104_0_rating:'天时综合等级',f104_1_rating:'地利综合等级',f104_2_rating:'人和综合等级',
};
export function questionBlock(id:string):Block{
 const field=fields.get(id);
 const b=blockById.get(id)||{id,type:field?.options?'choice':'text',label:field?.label,options:field?.options,multi:field?.multi};
 return {...b,label:questionLabels[id]||b.label,placeholder:['f135','f165','f171'].includes(id)?'等待同日复盘自动摘录；原文缺失时留空，不自动编写。':b.placeholder||'写明判断、依据与验证条件；不适用时说明原因。',long:b.type==='text'&&!['f116','f117',...themeSlots.map(s=>s.name)].includes(id)&&!id.startsWith('f112_')};
}
export const answer=(p:Paper,id:string)=>{const v=p.answers[id];return Array.isArray(v)?v.join('、'):v||''};
export const answered=(p:Paper,ids:readonly string[])=>ids.filter(id=>!!answer(p,id)).length;
export const hasBlockAnswers=(p:Paper,ids:readonly string[])=>Object.keys(p.answers).some(id=>answer(p,id)&&ids.some(base=>id===base||id.startsWith(base+'_')));
export function legacyAnswerGroups(p:Paper){
 const shown:string[]=[...dailyIds,...optionalIds,...factualGroups.flatMap(g=>[...g.ids]),'f6','f189','f190','f194'];
 // Keep orphaned row answers editable in the legacy drawer when its name is removed.
 const activeFields=new Set([...candidateRows(p).flatMap(row=>[...nextDayFields(row),...leaderFields(row)].map(f=>f.id)),...requiredDailyReviews(p).flatMap(g=>g.fields.map(f=>f.id))]);
 // Presentation changes only: keep every original field and answer in storage/export.
 const entries=[...fields].filter(([id])=>answer(p,id)&&!activeFields.has(id)&&!shown.some(base=>id===base||id.startsWith(base+'_')));
 return sections.map(s=>({title:s.title,blocks:entries.filter(([id])=>s.blocks.some(b=>b.id&&(id===b.id||id.startsWith(b.id+'_')))).map(([id,f])=>({id,type:f.options?'choice':'text',label:f.label,options:f.options,multi:f.multi,long:!f.options} as Block))})).filter(g=>g.blocks.length);
}
export function cycleWindow<T extends {date:string}>(days:T[],date:string,range:string){
 if(range==='all')return days;
 const found=days.findIndex(d=>d.date>=date),at=found<0?days.length-1:found,size=Number(range);
 const start=Math.max(0,Math.min(days.length-size,at-Math.floor(size/2)));
 return days.slice(start,start+size);
}
export function marketMetrics(day?:Day){
 const entries=Object.entries(day?.metrics||{}),find=(pattern:RegExp)=>entries.find(([k])=>pattern.test(k))?.[1]||'—';
 return [
  ['沪指',find(/^(沪指|上证)(?!量能)/)],['深指',find(/深指|深证/)],['创业',find(/创业/)],['科创',find(/科创/)],
  ['沪指量能',find(/沪指量能|成交额|量能/)],['极端腾落数（涨停-跌停）',find(/极端腾落/)],['腾落数（上涨-下跌）',find(/^(?!极端).*腾落数/)],
  ['一板',find(/^一板$/)],['二板',find(/^二板$/)],['三板',find(/^三板$/)],['高度板',find(/高度板/)],['封板率',find(/封板率/)],['断板',find(/^断板$/)],
 ];
}
export function recapMonths(days:Day[]){
 const months=new Map<string,Day[]>();
 for(const day of [...days].sort((a,b)=>b.date.localeCompare(a.date))){const month=day.date.slice(0,7);months.set(month,[...(months.get(month)||[]),day])}
 return [...months].map(([month,days])=>({month,days}));
}
export function recapBriefs(day?:Day){
 const text=day?.sections?.find(s=>/复盘总纲|整体盘面/.test(s.title))?.text||'';
 const matches=[...text.matchAll(/^R([1-4])\s+([^\n]+)\n([^\n]+)/gm)];
 if(matches.length)return matches.map(m=>({title:m[2],text:m[3]}));
 return day?[{title:'复盘定调',text:day.label||'原文未标注'},{title:'市场摘要',text:day.summary||'原文未提供摘要'}]:[];
}
export function sectionProgress(p:Paper,index:number){const ids=[...fields.keys()].filter(id=>sections[index].blocks.some(b=>b.id===id||id.startsWith(b.id+'_')));return {filled:answered(p,ids),total:ids.length}}
