import {fields,sections,type Paper} from './model';
import type {Day} from './recap-source';

export const dailyGroups=[
 {title:'市场与周期',subtitle:'先确定今天处在什么环境',ids:['f143','f3','f24'],source:/市场风格|赚钱效应/,hint:'原复盘观点供核对；收盘周期和风险由你判断。'},
 {title:'题材与主线',subtitle:'强度排名之后，作出自己的选择',ids:['f60','f62','f47','f48','f49'],source:/各主线|各板块|题材详细/,hint:'数值前五不等于主线。结合持续性、核心反馈与分歧承接作答。'},
 {title:'核心与龙头',subtitle:'从题材强，走到个股强',ids:['f170','f70','f71','f76'],source:/龙头预备票|核心关键票/,hint:'原文候选仅作参考。第一核心、主动性、抗跌性留给你判断。'},
 {title:'明日计划',subtitle:'把判断写成可以执行的条件',ids:['f38','f116','f110','f127'],source:/明日作战推演|大盘明日/,hint:'先写参与条件、退出条件和仓位上限。原复盘预案不会直接替你作答。'},
 {title:'执行与反思',subtitle:'今天做了什么，下一次改什么',ids:['f133','f135','f139','f164','f165','f171'],source:/今日操作结果|今日操作复盘/,hint:'账户、交易和反思属于你的个人记录。'},
] as const;
export const blockById=new Map(sections.flatMap(s=>s.blocks).filter(b=>b.id).map(b=>[b.id!,b]));
export const dailyIds=dailyGroups.flatMap(g=>[...g.ids]);
export const answer=(p:Paper,id:string)=>{const v=p.answers[id];return Array.isArray(v)?v.join('、'):v||''};
export const answered=(p:Paper,ids:readonly string[])=>ids.filter(id=>!!answer(p,id)).length;
export function cycleWindow<T extends {date:string}>(days:T[],date:string,range:string){
 if(range==='all')return days;
 const found=days.findIndex(d=>d.date>=date),at=found<0?days.length-1:found,size=Number(range);
 const start=Math.max(0,Math.min(days.length-size,at-Math.floor(size/2)));
 return days.slice(start,start+size);
}
export function marketMetrics(day?:Day){
 const entries=Object.entries(day?.metrics||{}),find=(pattern:RegExp)=>entries.find(([k])=>pattern.test(k))?.[1]||'—';
 return [
  ['沪指',find(/沪指|上证/)],['成交额',find(/成交额|量能/)],['涨停 / 跌停',find(/极端腾落/).replace(/^(\d+)-(\d+)$/,'$1 / $2')],
  ['上涨 / 下跌',find(/^(?!极端).*腾落数/).replace(/^(\d+)-(\d+)$/,'$1 / $2')],['最高连板',find(/高度板/)],['封板率',find(/封板率/)],
 ];
}
export function recapBriefs(day?:Day){
 const text=day?.sections?.find(s=>/复盘总纲|整体盘面/.test(s.title))?.text||'';
 const matches=[...text.matchAll(/^R([1-4])\s+([^\n]+)\n([^\n]+)/gm)];
 if(matches.length)return matches.map(m=>({title:m[2],text:m[3]}));
 return day?[{title:'复盘定调',text:day.label||'原文未标注'},{title:'市场摘要',text:day.summary||'原文未提供摘要'}]:[];
}
export function sectionProgress(p:Paper,index:number){const ids=[...fields.keys()].filter(id=>sections[index].blocks.some(b=>b.id===id||id.startsWith(b.id+'_')));return {filled:answered(p,ids),total:ids.length}}
