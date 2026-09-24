import type {Day} from './recap-source';
export function marketLeaders(day?:Day){
 const raw=Object.entries(day?.metrics||{}).find(([k])=>/高度板|最高连板/.test(k))?.[1]||'';
 const count=/^\s*(\d{1,2})(?:\s*(?:连)?板)?\s*$/.exec(raw)?.[1];
 const names=new Map<string,string>();
 if(count)for(const section of day?.sections||[]){
  let rows=0;
  for(const line of section.text.split('\n')){
   if(/^标的\s+身位/.test(line)){rows=50;continue}
   if(rows--<=0)continue;
   const row=/^([\u4e00-\u9fffA-Za-z*ＳＴ]{2,12})\s+(?:\d{6}\s+)?(\d{1,2})\s*(?:连)?板([^\s]*)\s+(.*)/.exec(line);
   if(!row)continue;
   if(row[2]===count&&!/失败|断板|未涨停|昨日|昨天/.test(row[3]+row[4].slice(0,15)))names.set(row[1],line);
  }
 }
 return {count:count?Number(count):null,names:[...names.keys()],evidence:[...names.values()],url:day?.url};
}
