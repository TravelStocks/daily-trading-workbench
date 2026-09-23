import type {AutoEntry,Paper} from './model';
import {topFive,type Archive} from './recap-source';
// Only this allowlist can be machine-filled. Judgment, trades, exposure and reflection stay human-owned.
export const objectiveFields=['f6','f40','f50','f55'] as const;
export function objectiveCandidates(date:string,archive:Archive){const day=archive.days.find(d=>d.date===date);const candidates:Record<string,AutoEntry>={};if(!day?.url)return candidates;const add=(key:string,value:string,evidence:string)=>{candidates[key]={value,sourceDate:date,sourceUrl:day.url!,evidence}};
 const height=day.metrics?.['高度板'];if(height&&/^\d+(?:板)?$/.test(height))add('f6',height.replace(/板$/,'')+'板','当日市场表 · 高度板：'+height);
 topFive(archive.points,date).slice(0,3).forEach((p,i)=>add(['f40','f50','f55'][i],p.name,`当日原始强度第 ${i+1} 名：${p.strength}。仅预填研究对象，不代表主线或买入判断。`));return candidates}
export function applyObjectiveFill(paper:Paper,date:string,archive:Archive){if(paper.submitted)return {paper,changed:[],status:'archived'};const candidates=objectiveCandidates(date,archive),answers={...paper.answers},autoFill={...paper.autoFill};const changed:string[]=[];
 for(const [id,next] of Object.entries(candidates)){const current=answers[id],prior=autoFill[id];const untouched=prior?current===prior.value:!current;if(!untouched)continue;if(current!==next.value||JSON.stringify(prior)!==JSON.stringify(next)){answers[id]=next.value;autoFill[id]=next;changed.push(id)}}
 return {paper:changed.length?{...paper,answers,autoFill}:paper,changed,status:Object.keys(candidates).length?'synced':'waiting'};
}
