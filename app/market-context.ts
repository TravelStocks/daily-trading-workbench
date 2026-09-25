export type Quote={region:string;id:string;name:string;theme:string;provider:string;source:string;updatedAt:string;rows:{date:string;close:number;pct:number}[]};
export type Board={id:string;name:string;aliases:string[];limitUps:number|null;turnover:number|null;source:string;amountSource:string};
export type MarketContext={version:1;updatedAt:string;quotes:Quote[];themes:Record<string,Board[]>};
export function snapshot(q:Quote,date:string){return q.rows.filter(r=>r.date<=date).sort((a,b)=>a.date.localeCompare(b.date)).at(-1)}
export function matchingBoards(name:string,boards:Board[]){if(/退潮|断板反馈/.test(name))return [];const parts=name.split(/[\/、，]/).map(s=>s.trim());return boards.filter(b=>b.aliases.some(a=>parts.includes(a)))}
export const pct=(v:number)=>`${v>0?'+':''}${v.toFixed(2)}%`;
