import type {Paper} from './model';
import {candidateAnswer,reviewValueComplete} from './required-candidates';

export const themeSlots=[
 {name:'f40',logic:'f41',effect:'f45',rhythm:'f46',continuity:'f49'},
 {name:'f50',logic:'f51',effect:'f52',rhythm:'f53',continuity:'f54'},
 {name:'f55',logic:'f56',effect:'f57',rhythm:'f58',continuity:'f59'},
];
export function themeFields(row:number){
 const s=themeSlots[row];
 return [
  {id:s.logic,label:'题材逻辑与催化',hint:'写清逻辑、催化和依据，不把消息强度当成持续性。'},
  {id:s.effect,label:'板块效应强度',hint:'根据前后排跟随、赚钱效应选择，不只看单只高标。'},
  {id:s.rhythm,label:'当前运行节奏',hint:'按当日实际阶段选择，和次日预期区分开。'},
  {id:`f193_${row}_1`,label:'梯队结构与核心角色',hint:'分清龙头、前排、后排、中军、弹性；缺位时写清缺口。'},
  {id:`f193_${row}_2`,label:'分歧承接与回流验证',hint:'分别看前排、后排跟随、承接与量能，写出观察依据。'},
  {id:s.continuity,label:'题材持续性',hint:'写清延续条件和当前短板，不重复填写题材名称。'},
  {id:`f193_${row}_3`,label:'次日预期与失效信号',hint:'写预期节奏、验证信号和否定信号，不只写“看涨”。'},
 ];
}
export const activeThemeRows=(p:Paper)=>themeSlots.flatMap((s,i)=>reviewValueComplete(candidateAnswer(p,s.name))?[i]:[]);
export function themeRowProtected(p:Paper,row:number){
 return [...themeFields(row).map(f=>f.id),...(row===0?['f42','f43','f47','f48']:[])].some(id=>{const v=p.answers[id];return Array.isArray(v)?v.length>0:!!v?.trim();});
}
