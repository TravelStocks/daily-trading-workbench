import {useEffect,useRef,useState} from 'react';
import {Mic,Square,ClipboardPen,ArrowDown} from 'lucide-react';
import {fields,type Paper} from '../model';
import {parseVoiceFill,applyVoiceFill,type FillPreview} from '../voice-fill';
type Recognition={lang:string;continuous:boolean;interimResults:boolean;onresult:((event:{resultIndex:number;results:ArrayLike<{isFinal:boolean;0:{transcript:string}}>})=>void)|null;onerror:((event:{error:string})=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void;abort:()=>void};
type SpeechWindow=Window&{SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
const currentValue=(p:Paper,id:string)=>id==='review.body'?p.review?.body:id==='review.next'?p.review?.next:p.answers[id];
export default function OralReview({date,paper,edit}:{date:string;paper:Paper;edit:(p:Paper)=>void}){
 const [text,setText]=useState(''),[preview,setPreview]=useState<FillPreview|null>(null),[selected,setSelected]=useState<string[]>([]),[note,setNote]=useState(''),[recording,setRecording]=useState(false);
 const speech=useRef<Recognition|null>(null),mounted=useRef(true);
 const Constructor=(window as SpeechWindow).SpeechRecognition||(window as SpeechWindow).webkitSpeechRecognition;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;const r=speech.current;if(r){r.onresult=null;r.onerror=null;r.onend=null;r.abort()}}},[]);
 function changeText(value:string){setText(value.slice(0,60000));setPreview(null);setNote('')}
 function record(){
  if(recording){speech.current?.stop();return}if(!Constructor)return;
  const r=new Constructor();speech.current=r;r.lang='zh-CN';r.continuous=true;r.interimResults=false;
  r.onresult=e=>{if(!mounted.current)return;let words='';for(let i=e.resultIndex;i<e.results.length;i++)if(e.results[i].isFinal)words+=e.results[i][0].transcript+'。';if(words){setText(t=>(t+(t?'\n':'')+words).slice(0,60000));setPreview(null)}};
  r.onerror=e=>{if(mounted.current){setRecording(false);setNote(e.error==='not-allowed'?'麦克风未获授权。可以继续粘贴语音转出的文字。':'语音识别暂不可用，请使用系统听写或粘贴转写文字。')}};
  r.onend=()=>{if(mounted.current)setRecording(false)};
  try{r.start();setRecording(true);setNote('正在听写，结束后点击停止。')}catch{setRecording(false);setNote('无法启动语音识别，请使用系统听写或粘贴文字。')}
 }
 function prepare(){try{const result=parseVoiceFill(text,date);if(!text.trim().replace(/^```(?:json)?\s*/,'').startsWith('{'))result.items.unshift({id:'review.body',label:'个人复盘原文',value:text.trim()});setPreview(result);setSelected(result.items.filter(i=>!currentValue(paper,i.id)?.length).map(i=>i.id));setNote('逐项核对后应用；已有答案默认不覆盖。')}catch(e){setNote((e as Error).message);setPreview(null)}}
 function apply(){if(!preview)return;edit(applyVoiceFill(paper,preview.items,selected));setNote(`已应用 ${selected.length} 项，复盘与考卷共用同一份记录。`);setPreview(null);setSelected([])}
 const prompt=`请把我接下来提供的 ${date} 口述复盘整理成考卷答案。只填写我明确表达的判断，未提到的留空，不推断仓位、买卖或收益。输出一个 JSON：{"version":1,"date":"${date}","answers":{},"review":{"body":"原始口述","next":"仅在提及时填写明日预案"}}。answers 字段对应如下，选择题须严格使用给定选项：\n`+[...fields].map(([id,f])=>`${id}: ${f.label}${f.options?'（'+f.options.join(' / ')+(f.multi?'；多选，使用字符串数组':'；单选')+'）':''}`).join('\n');
 return <div className="oral-review" id="oral-review"><div className="oral-heading"><ClipboardPen size={20}/><div><h3>先说复盘，再整理考卷</h3><p>粘贴一整段语音转写，或直接口述。先预览、再应用到 {date}。</p></div><a href="#exam">手动填写考卷 <ArrowDown size={14}/></a></div>
 <label className="oral-label" htmlFor="oral-text">口述文字 / 已整理的填写结果</label><textarea id="oral-text" value={text} onChange={e=>changeText(e.target.value)} maxLength={60000} placeholder="例如：收盘周期是退潮，主线是芯片，核心标的是……，仓位上限是两成，卖出计划是……，明天修正是……。"/>
 <div className="oral-actions"><button type="button" className="secondary-button" disabled={!Constructor} onClick={record}>{recording?<Square size={15}/>:<Mic size={16}/>} {recording?'停止听写':'开始语音输入'}</button><button type="button" className="primary-button" onClick={prepare} disabled={recording||!text.trim()}>整理并预览考卷</button><span>{text.length.toLocaleString()} / 60,000 字 · 应用后保存</span></div>
 <p className="oral-help">{Constructor?'语音由浏览器识别，音频可能交给浏览器的识别服务。只在你点击开始后启用麦克风。':'当前浏览器不支持直接听写。可用手机或电脑的语音输入，再粘贴到这里。'} 网页按明确题目关键词匹配；自由口述可发给我整理，再粘贴结果。</p>
 <details className="oral-instructions"><summary>自由口述怎么发给我整理？</summary><p>先复制下面这段说明，再把语音转出的整段文字发给我；将返回的完整 JSON 粘贴到上面，点击整理预览。没有 API 密钥，也不会自动上传复盘文字。</p><textarea aria-label="给助手的口述整理说明" readOnly value={prompt} onFocus={e=>e.target.select()}/></details>
 {note&&<p className="oral-note" role="status">{note}</p>}
 {preview&&<div className="oral-preview"><h4>填写预览 · {selected.length} 项已勾选</h4>{preview.notes.map((n,i)=><p className="oral-warning" key={i}>{n}</p>)}{preview.items.map(item=>{const existing=currentValue(paper,item.id),opts=fields.get(item.id)?.options;return <div className="oral-preview-row" key={item.id}><label><input type="checkbox" checked={selected.includes(item.id)} onChange={e=>setSelected(s=>e.target.checked?[...s,item.id]:s.filter(id=>id!==item.id))}/>{item.label}{existing?.length?<small>已有内容 · 勾选即替换</small>:null}</label>{existing?.length?<p className="oral-existing">原答案：{Array.isArray(existing)?existing.join('、'):existing}</p>:null}{opts&&!Array.isArray(item.value)?<select aria-label={'预览：'+item.label} value={item.value} onChange={e=>setPreview({...preview,items:preview.items.map(i=>i.id===item.id?{...i,value:e.target.value}:i)})}>{opts.map(o=><option key={o}>{o}</option>)}</select>:<p className="oral-candidate">{Array.isArray(item.value)?item.value.join('、'):item.value}</p>}</div>})}<button className="primary-button" onClick={apply} disabled={!selected.length}>应用已勾选的 {selected.length} 项</button></div>}
 {paper.review?.body&&<details className="saved-oral"><summary>已保存的个人复盘</summary><label>可继续修改<textarea value={paper.review.body} maxLength={60000} onChange={e=>edit({...paper,review:{cycle:'',next:'',sectors:[],...paper.review,body:e.target.value}})}/></label></details>}
 </div>;
}
