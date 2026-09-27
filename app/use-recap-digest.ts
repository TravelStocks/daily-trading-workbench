import {useEffect,useState} from 'react';
import {parseDigest,type Digest} from './recap-digest';
import {publicRoot,type Day} from './recap-source';

const cache=new Map<string,{value:Digest;at:number}>();
const pending=new Map<string,Promise<Digest>>();
export function useRecapDigest(day?:Day){
 const key=day?.date+'|'+day?.url+'|'+day?.updatedAt;
 const [loaded,setLoaded]=useState<{key:string;value:Digest}|null>(null),[state,setState]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  if(!day?.url){setState('');return;}
  let active=true;
  async function read(force=false){
   const cached=cache.get(key);if(!force&&cached&&Date.now()-cached.at<120000){setLoaded({key,value:cached.value});setState('');return;}
   setState('正在整理同日原文…');
   try{
    let request=pending.get(key);
    if(!request){request=(async()=>{const url=new URL(day!.url!);if(!url.href.startsWith(publicRoot+'pages/'))throw Error('原文地址不属于复盘资料库');const response=await fetch(url.href,{signal:AbortSignal.timeout(10000),cache:'no-store',credentials:'omit'});if(!response.ok)throw Error('原文读取失败');const value=parseDigest(await response.text(),day!);cache.set(key,{value,at:Date.now()});return value;})();pending.set(key,request);request.finally(()=>pending.delete(key)).catch(()=>{});}
    const value=await request;if(active){setLoaded({key,value});setState('');}
   }catch{if(active)setState('暂时无法读取完整原文，保留已同步内容，待恢复后自动补充。');}
  }
  void read(retry>0);const timer=setInterval(()=>void read(),120000);
  return()=>{active=false;clearInterval(timer);};
 },[key,retry]);
 return {data:loaded?.key===key?loaded.value:undefined,state,retry:()=>setRetry(n=>n+1)};
}
