import {validDate,validatePaper,type Paper} from './model';
export type Saved={date:string;paper:Paper;revision:number;updatedAt:string};
export const storageKey='daily-trading-workbench-v1';
export function readRecords():Saved[]{
 const raw=localStorage.getItem(storageKey);if(!raw)return [];
 const data=JSON.parse(raw);if(!Array.isArray(data)||!data.every(r=>validDate(r.date)&&validatePaper(r.paper)&&Number.isInteger(r.revision)&&r.revision>0)||new Set(data.map(r=>r.date)).size!==data.length)throw new Error('本机记录无法读取，请先导出原始备份，避免覆盖。');return data;
}
export function saveRecord(date:string,paper:Paper,revision:number):Saved{
 if(!validDate(date)||!validatePaper(paper))throw new Error('答案格式不正确，尚未保存。');
 const records=readRecords(),old=records.find(r=>r.date===date);
 if((old?.revision||0)!==revision)throw new Error('另一标签页已更新这一天。请导出当前草稿，再刷新读取最新记录。');
 const saved={date,paper,revision:revision+1,updatedAt:new Date().toISOString()};
 localStorage.setItem(storageKey,JSON.stringify([...records.filter(r=>r.date!==date),saved].sort((a,b)=>a.date.localeCompare(b.date))));return saved;
}
export function importRecords(input:unknown){
 const data=Array.isArray(input)?input:(input as {records?:unknown[]})?.records;
 if(!Array.isArray(data)||data.length>20000||!data.every(r=>r&&validDate(r.date)&&validatePaper(r.paper))||new Set(data.map(r=>r.date)).size!==data.length)throw new Error('备份格式不正确，请选择完整 JSON 备份。');
 const records=readRecords(),dates=new Set(records.filter(r=>r.paper.submitted||r.paper.done.length||r.paper.review||Object.entries(r.paper.answers).some(([k,v])=>v!==r.paper.autoFill?.[k]?.value)).map(r=>r.date));
 const added=data.filter(r=>!dates.has(r.date)).map(r=>({date:r.date,paper:r.paper,revision:1,updatedAt:new Date().toISOString()}));
 localStorage.setItem(storageKey,JSON.stringify([...records.filter(r=>!added.some(a=>a.date===r.date)),...added].sort((a,b)=>a.date.localeCompare(b.date))));return {added:added.length,skipped:data.length-added.length};
}
