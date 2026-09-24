import {fields,validDate,type Paper,type Answers} from './model';
export type FillItem={id:string;label:string;value:string|string[]};
export type FillPreview={items:FillItem[];notes:string[]};
const aliases:Record<string,string[]>={
 f143:['收盘周期','情绪周期','今天的周期'],f3:['一句话判断','核心判断','大盘判断'],f24:['最大市场风险','市场风险'],
 f60:['我的主线','当前主线','主线'],f62:['主线成立依据','主线依据'],f47:['当前分歧'],f48:['分歧后回流','回流情况'],f49:['持续性判断','持续性'],
 f170:['当前真正的核心','核心标的','第一核心'],f70:['谁最主动','最主动的个股'],f71:['谁最抗跌','最抗跌的个股'],f76:['竞争是否结束'],
 f38:['我的主模式','主模式'],f116:['总仓位上限','仓位上限'],f110:['转强确认','转强条件'],f127:['具体卖出计划','卖出计划','退出计划'],
 f133:['今日交易','今天交易'],f135:['实际执行'],f139:['模式外交易'],f164:['今天最大错误','最大错误'],f165:['最主要问题'],f171:['明天修正','明天只改一件事'],
 'review.next':['明日完整预案','明日预案','明天的预案'],
};
const clean=(s:string)=>s.replace(/^[\s：:，,。；;]+|[\s，,。；;]+$/g,'').trim();
const escaped=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const label=(id:string)=>id==='review.next'?'明日完整预案':id==='review.body'?'个人复盘原文':fields.get(id)?.label||id;
function checked(id:string,value:unknown):FillItem|null{
 if(id==='review.next'||id==='review.body')return typeof value==='string'&&value.trim()&&value.length<=(id==='review.body'?60000:12000)?{id,label:label(id),value}:null;
 const field=fields.get(id);if(!field)return null;
 if(field.multi)return Array.isArray(value)&&value.length>0&&value.every(v=>typeof v==='string'&&field.options?.includes(v))?{id,label:label(id),value:[...new Set(value)]}:null;
 return typeof value==='string'&&value.trim()&&value.length<=12000&&(!field.options||field.options.includes(value))?{id,label:label(id),value}:null;
}
export function parseVoiceFill(text:string,date:string):FillPreview{
 if(!validDate(date))throw new Error('请先选择有效复盘日期。');
 if(text.length>60000)throw new Error('一次最多整理 60000 字。');
 const trimmed=text.trim().replace(/^```(?:json)?\s*|\s*```$/g,'');
 if(!trimmed)throw new Error('先粘贴口述文字或整理结果。');
 const items:FillItem[]=[],notes:string[]=[];
 if(trimmed.startsWith('{')){
  let data;try{data=JSON.parse(trimmed)}catch{throw new Error('整理结果不是有效 JSON，请粘贴完整结果。')}
  if(data.version!==1||data.date!==date||!data.answers||typeof data.answers!=='object'||Array.isArray(data.answers))throw new Error('整理结果须包含 version: 1、与当前相同的 date 和 answers。请核对日期。');
  for(const [id,value] of Object.entries(data.answers)){const item=checked(id,value);if(item)items.push(item);else notes.push(`未匹配或选项无效：${id}`)}
  if(data.review)for(const key of ['body','next']){if(data.review[key]!==undefined){const item=checked('review.'+key,data.review[key]);if(item)items.push(item);else notes.push(`复盘内容无效：${key}`)}}
  return {items,notes};
 }
 const dates=[...text.matchAll(/(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})日?/g)].map(m=>`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`);
 if(dates.some(d=>d!==date))notes.push('口述中出现其他日期，请逐项确认内容属于当前所选日。');
 const entries=Object.entries(aliases).flatMap(([id,names])=>names.map(name=>({id,name}))).sort((a,b)=>b.name.length-a.name.length);
 const re=new RegExp('(?:^|[\\n，,。；;])\\s*(?:我认为|我觉得)?\\s*('+entries.map(x=>escaped(x.name)).join('|')+')(?:\\s*[：:]\\s*|是|为|\\s+)', 'g');
 const matches=[...text.matchAll(re)];const seen=new Set<string>();
 for(let i=0;i<matches.length;i++){
  const m=matches[i],id=entries.find(e=>e.name===m[1])!.id;
  const value=clean(text.slice(m.index!+m[0].length,matches[i+1]?.index??text.length));
  if(seen.has(id)){notes.push(`${label(id)}出现多次，请核对后手动修改。`);continue}seen.add(id);
  const item=checked(id,value);if(item)items.push(item);else notes.push(`${label(id)}未能确定选项，保留原文，暂不填写。`);
 }
 if(!items.length)notes.push('没有找到明确题目。可按“收盘周期是…，主线是…，仓位上限是…”口述；也可以把这段文字发给我整理。');
 return {items,notes};
}
export function applyVoiceFill(paper:Paper,items:FillItem[],selected:string[]):Paper{
 const answers:Answers={...paper.answers};const review={cycle:'',body:'',next:'',sectors:[],...paper.review};
 for(const item of items){if(!selected.includes(item.id))continue;const valid=checked(item.id,item.value);if(!valid)throw new Error('存在无效答案，请重新整理。');if(item.id==='review.body')review.body=item.value as string;else if(item.id==='review.next')review.next=item.value as string;else answers[item.id]=item.value}
 return {...paper,answers,review,submitted:false};
}
