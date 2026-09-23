import raw from './exam.json';
export type Block={id?:string;type:string;label?:string;long?:boolean;options?:string[];multi?:boolean;headers?:string[];rows?:string[][]};
export const sections=raw as {title:string;blocks:Block[]}[];
export type Answers=Record<string,string|string[]>;
export type SectorEntry={name:string;strength:string;state:string};
export type Review={cycle:string;body:string;next:string;sectors:SectorEntry[]};
export const sectorStates=['正常','小分歧','大分歧','分歧转一致','弱回流','强回流','高潮','退潮','尚未确认'];
export type AutoEntry={value:string;sourceDate:string;sourceUrl:string;evidence:string};
export type Paper={answers:Answers;done:number[];submitted:boolean;review?:Review;autoFill?:Record<string,AutoEntry>};
export const emptyPaper=():Paper=>({answers:{},done:[],submitted:false});
export const fields=new Map<string,{label:string;options?:string[];multi?:boolean}>();
for(const s of sections)for(const b of s.blocks){
 if(b.type==='text'||b.type==='choice')fields.set(b.id!,{label:b.label!,options:b.options,multi:b.multi});
 if(b.type==='table')for(const [r,row]of b.rows!.entries()){
  const choices=row.map((v,c)=>v.includes('□')?c:-1).filter(c=>c>=0);
  if(choices.length)fields.set(b.id+'_'+r+'_rating',{label:row[0]+' · '+b.headers!.filter((_,i)=>choices.includes(i)).join('/'),options:choices.map(c=>b.headers![c])});
  for(let c=1;c<row.length;c++)if(row[c].includes('_'))fields.set(b.id+'_'+r+'_'+c,{label:row[0]+' · '+b.headers![c]});
 }
}
export function validatePaper(v:unknown):v is Paper{
 if(!v||typeof v!=='object')return false;
 const p=v as Paper;
 if(p.autoFill!==undefined){if(!p.autoFill||typeof p.autoFill!=='object'||Array.isArray(p.autoFill)||Object.keys(p.autoFill).length>30)return false;for(const [k,e] of Object.entries(p.autoFill)){if(!fields.has(k)||!e||!['value','sourceDate','sourceUrl','evidence'].every(key=>typeof e[key as keyof AutoEntry]==='string'&&e[key as keyof AutoEntry].length<=12000)||!validDate(e.sourceDate)||!e.sourceUrl.startsWith('https://travelstocks.github.io/daily-trading-review/'))return false}}
 if(p.review!==undefined){const r=p.review;if(!r||typeof r!=='object'||!['cycle','body','next'].every(k=>typeof r[k as 'cycle']==='string'&&r[k as 'cycle'].length<=(k==='body'?60000:12000))||!Array.isArray(r.sectors)||r.sectors.length>80||!r.sectors.every(s=>s&&typeof s.name==='string'&&s.name.length<=100&&typeof s.strength==='string'&&(s.strength===''||(/^[+-]?\d+(\.\d+)?$/.test(s.strength)&&Number.isFinite(Number(s.strength))))&&typeof s.state==='string'&&(!s.state||sectorStates.includes(s.state))))return false;}
 if(!p.answers||typeof p.answers!=='object'||Array.isArray(p.answers)||!Array.isArray(p.done)||typeof p.submitted!=='boolean')return false;
 if(!p.done.every(i=>Number.isInteger(i)&&i>=0&&i<sections.length)||new Set(p.done).size!==p.done.length)return false;
 return Object.entries(p.answers).every(([id,val])=>{const f=fields.get(id);if(!f)return false;if(f.multi)return Array.isArray(val)&&val.length<=f.options!.length&&val.every(x=>f.options!.includes(x));return typeof val==='string'&&val.length<=12000&&(!f.options||!val||f.options.includes(val));});
}
export function validDate(d:string){return /^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d}
export function chinaDate(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
export function markdown(date:string,p:Paper){return '# 交易日课 · '+date+'\n\n'+sections.map((s,i)=>'## '+s.title+(p.done.includes(i)?' ✓':'')+'\n\n'+s.blocks.map(b=>{
 if(b.type==='heading')return '### '+b.label;
 if(b.type==='text'||b.type==='choice'){const val=p.answers[b.id!];return '**'+b.label+'**：'+(Array.isArray(val)?val.join('、'):val||'未填写')}
 if(b.type==='table')return b.rows!.map((row,r)=>row[0]+'：'+row.slice(1).map((v,j)=>{const c=j+1;return v.includes('□')?'':b.headers![c]+' '+(p.answers[b.id+'_'+r+'_'+c]||'—')}).filter(Boolean).join('；')+(p.answers[b.id+'_'+r+'_rating']?'；判断 '+p.answers[b.id+'_'+r+'_rating']:'')).join('\n\n');
 return b.label;
 }).join('\n\n')).join('\n\n')+(p.review?'\n\n## 每日复盘\n\n周期：'+p.review.cycle+'\n\n'+p.review.body+'\n\n### 明日预案\n\n'+p.review.next+'\n\n### 题材跟踪\n\n'+p.review.sectors.map(s=>s.name+'：'+(s.strength||'未填')+' / '+(s.state||'未判定')).join('\n'):'')}

