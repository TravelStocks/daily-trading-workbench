export type Quote={region:string;id:string;name:string;theme:string;provider:string;source:string;updatedAt:string;rows:{date:string;close:number;pct:number}[]};
export type Board={id:string;name:string;aliases:string[];limitUps:number|null;turnover:number|null;source:string;amountSource:string};
export type LimitUpGroup={name:string;count:number;stocks:{code:string;name:string}[]};
export type LimitUpDay={date:string;provider:string;source:string;updatedAt:string;groups:LimitUpGroup[]};
export type RiskStock={code:string;name:string;theme:string;pct:number|null;priorBoards?:number;day?:number};
export type MarketRiskDay={date:string;provider:string;sources:{limitUp:string;broken:string;limitDown:string};limitUpCount:number;oneWordCount:number;oneWordStocks:RiskStock[];brokenCount:number;brokenRate:number|null;brokenStocks:RiskStock[];limitDownCount:number;limitDownStocks:RiskStock[];limitUpStocks?:Array<RiskStock&{market:number;boards:number}>;breakCohort?:Array<RiskStock&{market:number;boards:number}>;breakFollowUp:{sampleCount:number;day1Avg:number|null;day2Avg:number|null;day3Avg:number|null;rebound:RiskStock[];deepWater:RiskStock[]}};
export type MarketContext={version:1;updatedAt:string;quotes:Quote[];themes:Record<string,Board[]>;limitUpDays?:Record<string,LimitUpDay>;marketRiskDays?:Record<string,MarketRiskDay>};
export function snapshot(q:Quote,date:string){return q.rows.filter(r=>r.date<=date).sort((a,b)=>a.date.localeCompare(b.date)).at(-1)}
export function matchingBoards(name:string,boards:Board[]){if(/退潮|断板反馈/.test(name))return [];const parts=name.split(/[\/、，]/).map(s=>s.trim());return boards.filter(b=>b.aliases.some(a=>parts.includes(a)))}
export const pct=(v:number)=>`${v>0?'+':''}${v.toFixed(2)}%`;
const normalize=(s:string)=>s.toLowerCase().replace(/产业链|概念|板块/g,'').replace(/半导体/g,'芯片').replace(/房地产|地产链/g,'地产').replace(/医疗/g,'医药').trim();
export function matchingLimitUps(name:string,groups:LimitUpGroup[]){if(/退潮|断板反馈/.test(name))return [];const parts=name.split(/[\/、，]/).map(normalize);return groups.filter(g=>g.name.split(/[\/、，]/).map(normalize).some(p=>parts.includes(p)))}
