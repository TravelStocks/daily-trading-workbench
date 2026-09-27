import {plain,tables,type Day} from './recap-source';
import type {Paper,AutoEntry} from './model';

export type LeaderCandidate={name:string;theme:string;board:string;logic:string};
export type LeaderPool={candidates:LeaderCandidate[];available:boolean};
const cleanName=(name:string)=>name.replace(/\b\d{6}\b/g,'').trim();
const value=(row:string[],headers:string[],labels:string[])=>row[headers.findIndex(h=>labels.includes(h))]||'';

// Called only after parseDigest has verified the page's own review date.
export function parseLeaderCandidates(html:string):LeaderPool{
 const headings=[...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)];
 const at=headings.findIndex(h=>/龙头预备票|龙头候选池/.test(plain(h[1])));
 if(at<0)return {candidates:[],available:false};
 // Some Word conversions promote 13.1-13.5 subsections to h2 as well.
 let end=at+1;const childPrefix=plain(headings[end]?.[1]||'').match(/^(\d+)\.\d+\s/)?.[1];
 if(childPrefix)while(end<headings.length&&plain(headings[end][1]).startsWith(childPrefix+'.'))end++;
 const section=html.slice(headings[at].index,headings[end]?.index);
 const local=tables(section),all=tables(html);
 const facts=(name:string)=>{
  let theme='',board='';
  for(const table of [...local,...all]){
   const headers=table[0],nameCol=headers.findIndex(h=>['名称','标的','个股','核心标的','核心票','方向/个股'].includes(h));
   const row=table.slice(1).find(r=>cleanName(r[nameCol]||'')===name);if(!row)continue;
   theme ||= value(row,headers,['所属题材','题材','板块']);
   board ||= value(row,headers,['当前板数','连板情况','身位','涨停表现','当前状态']);
  }
  return {theme:theme||'原文未明确',board:board||'原文未明确'};
 };
 const candidates:LeaderCandidate[]=[];
 const add=(name:string,logic:string,theme='',board='')=>{
  name=cleanName(name);if(!name||name.length>30||/^(无|暂无|待定|待确认|待核|原文未明确|[_—-]+)$/.test(name)||candidates.some(c=>c.name===name))return;
  const detail=facts(name);candidates.push({name,theme:theme||detail.theme,board:board||detail.board,logic:logic||'原文未明确'});
 };
 const explicit=local.find(t=>['名称','所属题材','当前板数','核心逻辑'].every(h=>t[0].includes(h)));
 if(explicit){for(const row of explicit.slice(1))add(value(row,explicit[0],['名称']),value(row,explicit[0],['核心逻辑']),value(row,explicit[0],['所属题材']),value(row,explicit[0],['当前板数']));return {candidates,available:true};}
 const picks=[...section.matchAll(/<article\b[^>]*class=["'][^"']*\bleader-pick\b[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi)];
 for(const pick of picks){const text=pick[1],name=plain(text.match(/<h4\b[^>]*>([\s\S]*?)<\/h4>/i)?.[1]||'');const role=plain(text.match(/<span\b[^>]*>([\s\S]*?)<\/span>/i)?.[1]||'');const logic=[...text.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>plain(m[1])).join(' ');add(name,[role,logic].filter(Boolean).join('。'));}
 if(picks.length)return {candidates,available:true};
 const rankingHeading=section.match(/<h[23]\b[^>]*>[^<]*(?:备选排序|候选排序)[\s\S]*?<\/h[23]>/i);
 if(rankingHeading){
  const fragment=section.slice(rankingHeading.index!+rankingHeading[0].length).split(/<h[23]\b/i)[0];
  const paragraphs=[...section.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>plain(m[1]));
  for(const match of fragment.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)){
   const row=plain(match[1]).match(/^\d+[.、．]\s*([^：:。]+)[：:。]\s*(.+)$/);if(!row)continue;
   const name=row[1].trim(),detail=paragraphs.find(p=>p.startsWith(name+'。')||p.startsWith(name+'：')||p.startsWith(name+':'));
   add(name,[row[2],detail?.slice(name.length+1).trim()].filter(Boolean).join(' '));
  }
  if(candidates.length)return {candidates,available:true};
 }
 // Older recaps explicitly name core/space/switch candidates in separate paragraphs.
 for(const match of section.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)){
  const text=plain(match[1]),list=text.match(/^(核心候选|空间候选|切换候选|条件候选|总龙候选)[：:]([^。；]+)[。；]?(.*)$/);
  if(list)for(const name of list[2].split(/[、，,]/))add(name,`${list[1]}。${list[3]||'按原文列入观察池。'}`);
 }
 return {candidates,available:candidates.length>0||/无(?:明确)?(?:龙头|总龙)?候选|暂无候选/.test(plain(section))};
}

export function candidateRowProtected(paper:Paper,row:number){
 for(let col=1;col<=4;col++){const id=`f66_${row}_${col}`,prior=paper.autoFill?.[id],current=paper.answers[id];if(prior?current!==prior.value:Boolean(current))return true;}
 // A row with authored seven-dimension scores must not silently change identity.
 return Object.entries(paper.answers).some(([id,v])=>new RegExp(`^f67_\\d+_${row+1}$`).test(id)&&Boolean(v));
}

export function applyLeaderCandidateFill(paper:Paper,date:string,day:Day|undefined,pool:LeaderPool|undefined){
 if(paper.submitted||!pool?.available||day?.date!==date||!day.url?.startsWith('https://travelstocks.github.io/daily-trading-review/pages/'))return {paper,changed:false};
 const answers={...paper.answers},autoFill={...paper.autoFill};let changed=false;
 const protectedRows=[0,1,2,3].filter(row=>candidateRowProtected(paper,row));
 const reserved=protectedRows.map(row=>paper.answers[`f66_${row}_1`]);
 const pending=pool.candidates.slice(0,4).filter(candidate=>!reserved.includes(candidate.name));
 for(let row=0;row<4;row++){
  if(protectedRows.includes(row))continue;
  const candidate=pending.shift(),values=candidate?[candidate.name,candidate.theme,candidate.board,candidate.logic]:['','','',''];
  for(let col=1;col<=4;col++){
   const id=`f66_${row}_${col}`,prior=autoFill[id];if(!candidate&&!prior)continue;
   const next:AutoEntry={value:values[col-1],subject:candidate?.name||'',sourceDate:date,sourceUrl:day.url,evidence:candidate?`${date} · 龙头预备票 · ${candidate.name}：${candidate.logic}`:`${date} · 原文候选池已更新，该行无对应候选。`};
   if(answers[id]!==next.value||JSON.stringify(prior)!==JSON.stringify(next)){answers[id]=next.value;autoFill[id]=next;changed=true;}
  }
 }
 return {paper:changed?{...paper,answers,autoFill}:paper,changed};
}
