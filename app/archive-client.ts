import fallback from '@/app/workspace/history.json';
import {publicRoot,recapPoints,recapSections,recapMetrics,type Archive} from '@/app/recap-source';
type IndexRecord={date_iso:string;page_path:string;title:string;emotion_label:string;emotion_summary:string;updated_at:string};
async function getJson(path:string){const r=await fetch(publicRoot+path,{signal:AbortSignal.timeout(7000),cache:'no-store',credentials:'omit'});if(!r.ok)throw new Error('Archive unavailable');return r.json()}
async function fetchArchive(){
 let data:Archive={...(fallback as unknown as Archive),source:'snapshot'};
 try{const remote=await getJson('assets/cycle-history.json') as Archive;if(remote.version===1&&Array.isArray(remote.days)&&Array.isArray(remote.points)&&remote.latest>=data.latest&&remote.days.every(d=>d.metrics!==undefined))data={...remote,source:'live'}}catch{}
 // Recap updates do not have to rebuild the chart feed: hydrate new or revised daily pages directly.
 try{const index=await getJson('site-data.json') as IndexRecord[];if(!Array.isArray(index))throw new Error('Invalid index');const changed=index.filter(r=>!data.days.some(d=>d.date===r.date_iso&&d.updatedAt===r.updated_at&&d.sections?.length&&d.metrics!==undefined)).sort((a,b)=>b.date_iso.localeCompare(a.date_iso));
  for(let i=0;i<changed.length;i+=4){const batch=await Promise.allSettled(changed.slice(i,i+4).map(async r=>{const path=r.page_path.replaceAll('\\','/');if(!path.startsWith('pages/')||path.includes('..'))throw new Error('Invalid source path');const url=publicRoot+path.split('/').map(encodeURIComponent).join('/');const response=await fetch(url,{signal:AbortSignal.timeout(7000),cache:'no-store',credentials:'omit'});if(!response.ok)throw new Error('Page unavailable');const html=await response.text();return {r,url,sections:recapSections(html),metrics:recapMetrics(html,r.date_iso),points:recapPoints(html,r.date_iso,url)}}));
   for(const result of batch){if(result.status==='rejected'){data.syncNote='部分复盘原文暂未同步，显示已取得的资料。';continue}const {r,url,sections,metrics,points}=result.value;data.days=data.days.filter(d=>d.date!==r.date_iso).concat({date:r.date_iso,label:r.emotion_label||'',summary:r.emotion_summary||'',title:r.title,url,updatedAt:r.updated_at,sections,metrics});const merged=new Map(data.points.filter(p=>p.sourceDate!==r.date_iso).map(p=>[p.date+'|'+p.name,p]));for(const p of points){const key=p.date+'|'+p.name,old=merged.get(key);if(!old||p.sourceDate===p.date||(old.sourceDate!==old.date&&p.sourceDate!>=(old.sourceDate||'')))merged.set(key,p)}data.points=[...merged.values()];}
  }data.days.sort((a,b)=>a.date.localeCompare(b.date));data.latest=data.days.at(-1)?.date||'';data.source='live';
 }catch{data.syncNote='原站暂时无法连接，显示已同步资料及其截至日期。'}
 return data;
}

let cached:Archive|null=null,stamp=0,inflight:Promise<Archive>|null=null;
export async function loadArchive(){if(cached&&Date.now()-stamp<60000)return cached;if(inflight)return inflight;inflight=fetchArchive().then(d=>{cached=d;stamp=Date.now();return d}).finally(()=>{inflight=null});return inflight}
