import {plain,tables,type Day} from './recap-source';
import type {Paper,AutoEntry} from './model';

export const reflectionFields=['f135','f165','f171'] as const;
type Excerpt={value:string;section:string};
export type ExecutionReflection=Partial<Record<typeof reflectionFields[number],Excerpt>>;
const clean=(text:string)=>text.replace(/^\s*(?:\d+[.、]\s*|[•·]\s*)/,'').trim();

function chapter(html:string,pattern:RegExp,kiss=false){
 const headings=[...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)];
 const at=headings.findIndex(h=>pattern.test(plain(h[1])));if(at<0)return '';
 let end=at+1;
 const prefix=plain(headings[end]?.[1]||'').match(/^(\d+)\.\d+\s/)?.[1];
 while(end<headings.length){
  const title=plain(headings[end][1]);
  if((prefix&&title.startsWith(prefix+'.'))||(kiss&&/^(?:\d+[.、\s]*)?(?:Keep|Improve|Start|Stop|情绪复盘)\b/i.test(title)))end++;
  else break;
 }
 return html.slice(headings[at].index!+headings[at][0].length,headings[end]?.index);
}

// Extract only the dated personal-operation/KISS chapters, never generic trading advice.
export function parseExecutionReflection(html:string):ExecutionReflection{
 html=html.replace(/<(script|style|nav)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
 const operation=chapter(html,/今日操作结果|今日操作复盘|个人操作复盘/);
 const kiss=chapter(html,/操作与情绪复盘|KISS模型/i,true);
 const results:Excerpt[]=[],tableResults:Excerpt[]=[],mistakes:Excerpt[]=[],roots:Excerpt[]=[],reflections:Excerpt[]=[],improvements:Excerpt[]=[],starts:Excerpt[]=[];
 let current:Excerpt[]|undefined=results,section='今日操作结果';
 for(const match of operation.matchAll(/<(h[2-6]|p|li|table)\b[^>]*>([\s\S]*?)<\/\1>/gi)){
  const tag=match[1].toLowerCase(),text=plain(match[2]);
  if(tag==='table'){
   for(const table of tables(match[0])){
    const headers=table[0],name=headers.findIndex(h=>/^(标的|个股|股票|名称)$/.test(h));
    const action=headers.findIndex(h=>/^(今日处理|今日操作|实际操作|实际执行|操作结果)$/.test(h));
    const result=headers.findIndex(h=>/^(实际结果|今日结果|交易结果|操作结果)$/.test(h));
    if(name<0||action<0)continue;
    for(const row of table.slice(1))if(row[name]&&row[action])tableResults.push({value:row[name]+'：'+[row[action],result>=0&&result!==action?row[result]:''].filter(Boolean).join('；'),section:'操作复盘表 · 今日处理'});
   }
   continue;
  }
  const label=text.replace(/^[\d.、（）()一二三四五六七八九十\s]+/,'').replace(/^[✅❌]\s*/u,'');
  if(tag.startsWith('h')||/^(做对操作|做错操作[\/和]?需要反思|做错操作|需要反思)$/.test(label)){
   section=text;
   current=/核心失误|失误根源/.test(label)?roots:/做错|需要反思/.test(label)?mistakes:/核心反思/.test(label)?reflections:/操作复盘|今日操作结果|做对|做得好/.test(label)?results:undefined;
  }else if(current&&text)current.push({value:clean(text),section});
 }
 current=undefined;
 for(const match of kiss.matchAll(/<(h[2-6]|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)){
  const text=plain(match[2]),label=text.replace(/^[\d.、（）()一二三四五六七八九十\s]+/,'');
  if(match[1].toLowerCase().startsWith('h')||/^(Improve|Start|Keep|Stop)\b/i.test(label)){
   section=text;current=/^Improve\b/i.test(label)?improvements:/^Start\b/i.test(label)?starts:/核心失误/.test(label)?roots:undefined;
  }else if(current&&text)current.push({value:clean(text),section});
 }
 const resultSource=tableResults.length?tableResults:results;
 const uniqueResults=resultSource.filter((entry,i)=>resultSource.findIndex(other=>other.value===entry.value)===i);
 const fallback=[...roots,...mistakes,...reflections].find(e=>/(明日|明天|下一步|后续|盘前).{0,20}(必须|要|需|应|先|把|以|只)|正确计划是|改进点是/.test(e.value));
 const action=fallback?{...fallback,value:fallback.value.match(/(?:改进点是|正确计划是|下一步需要)(.+)$/)?.[1]||fallback.value}:undefined;
 const candidates:ExecutionReflection={
  f135:uniqueResults.length?{value:uniqueResults.map(e=>e.value).join('\n\n'),section:'今日操作结果 / 操作复盘'}:undefined,
  f165:roots[0]||mistakes[0],
  f171:improvements[0]||starts[0]||action,
 };
 // Oversize or absent source content is not replaced with a fabricated summary.
 return Object.fromEntries(Object.entries(candidates).filter(([,entry])=>entry?.value&&entry.value.length<=12000));
}

export function applyExecutionReflectionFill(paper:Paper,date:string,day:Day|undefined,excerpts:ExecutionReflection|undefined){
 if(paper.submitted||!excerpts||day?.date!==date||!day.url?.startsWith('https://travelstocks.github.io/daily-trading-review/pages/'))return {paper,changed:false};
 const answers={...paper.answers},autoFill={...paper.autoFill};let changed=false;
 for(const id of reflectionFields){
  const entry=excerpts[id];if(!entry)continue;
  const prior=autoFill[id],current=answers[id];
  if(prior?current!==prior.value:Object.hasOwn(answers,id))continue;
  const next:AutoEntry={value:entry.value,sourceDate:date,sourceUrl:day.url,evidence:`${date} · ${entry.section} · ${id==='f135'?'摘录已发生的操作，不含次日预案。':'按原文顺序摘录首条，不另行推断优先级。'}`};
  if(current!==next.value||JSON.stringify(prior)!==JSON.stringify(next)){answers[id]=next.value;autoFill[id]=next;changed=true;}
 }
 return {paper:changed?{...paper,answers,autoFill}:paper,changed};
}
