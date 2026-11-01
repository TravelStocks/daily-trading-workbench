import {useEffect,useState} from 'react';
import type {Point} from './recap-source';
export type FactorPoint={date:string;rank:number|null;strength:number|null;high:boolean|null;limitUps:number|null};
export type FactorLeader={code:string;name:string;role:string;selectedDate:string;selectedBoards:number;points:{date:string;amount:number|null;volume:number|null;turnover:number|null;pct:number|null;volumeRatio:number|null;source:string|null}[]};
export type ThemeFactor={date:string;provider:string;window:string[];rankCoverage:number;missing:string[];reference:string;items:{code:string;name:string;rank:number|null;strength:number|null;high:boolean|null;firstHigh:boolean|null;startDate:string|null;dayNumber:number|null;streak:number;signals:string[];next:string;points:FactorPoint[];leaders:FactorLeader[]}[]};
export type BaselineSection={id:string;title:string;columns:string[];rows:(string|number|null)[][];note:string;sources:string[];status:'complete'|'partial'|'missing';factor?:ThemeFactor;history?:{label:string;lines:string[]}[]};
export type BaselineDay={date:string;previousDate:string;fetchedAt:string;status:string;metrics:Record<string,string>;topThemes:{name:string;code:string;rank:number;strength:number}[];strengthPoints:Point[];highest:{count:number|null;names:string[]};sections:BaselineSection[];gaps:{id:string;title:string;note:string}[]};
export type Baseline={version:1;updatedAt:string;days:Record<string,BaselineDay>;sessions:string[]};
let pending:Promise<Baseline>|undefined,loaded=0;
function read(){
 if(!pending||Date.now()-loaded>110000){loaded=Date.now();pending=fetch(`${import.meta.env.BASE_URL}data/daily-baseline.json`,{cache:'no-cache',signal:AbortSignal.timeout(15000)}).then(async r=>{if(!r.ok)throw Error('数据未就绪');const j=await r.json();if(j.version!==1||!j.days)throw Error('数据格式不符');return j as Baseline}).catch(e=>{pending=undefined;throw e})}
 return pending;
}
export function useBaseline(){
 const [data,setData]=useState<Baseline|null>(null);
 useEffect(()=>{let active=true;const update=()=>void read().then(d=>{if(active)setData(d)}).catch(()=>{});update();const timer=setInterval(update,120000);return()=>{active=false;clearInterval(timer)}},[]);
 return data;
}
export function baselinePoints(data:Baseline|null){
 const points=new Map<string,Point>();
 for(const day of Object.values(data?.days||{}))for(const p of day.strengthPoints)points.set(p.date+'|'+p.name,p);
 for(const day of Object.values(data?.days||{}))for(const t of day.topThemes)points.set(day.date+'|'+t.name,{date:day.date,name:t.name,strength:t.strength,state:'',raw:String(t.strength),sourceDate:day.date,url:'https://www.duanxianxia.com/web/platerotat'});
 return [...points.values()];
}
