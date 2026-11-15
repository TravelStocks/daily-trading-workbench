import {useState} from 'react';
import {Plus, X} from 'lucide-react';
import {useBaseline} from '../daily-baseline';
import {EvidenceTable} from './daily-baseline';

type Row={name:string;mode:string;note:string};
const key='second-wave-watchlist-v1';
export default function SecondWavePool(){
 const baseline=useBaseline();
 const latest=Object.keys(baseline?.days||{}).sort().at(-1);
 const snapshot=latest&&baseline?.days[latest].sections.find(s=>s.id==='second-wave-watch');
 const [rows,setRows]=useState<Row[]>(()=>{try{const data=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(data)?data.filter(r=>r&&['name','mode','note'].every(k=>typeof r[k]==='string')):[]}catch{return []}});
 const [name,setName]=useState(''),[mode,setMode]=useState('平台突破'),[note,setNote]=useState(''),[msg,setMsg]=useState('');
 function save(next:Row[],message:string){setRows(next);try{localStorage.setItem(key,JSON.stringify(next));setMsg(message)}catch{setMsg('当前浏览器无法保存，记录仅在本次打开时保留。')}}
 return <section id="second-wave-pool" className="handbook-panel wave-pool"><h2>龙头二波 · 每日观察池</h2><p>收盘后把三板及以上刚断板的标的单列，逐日复核。入池只是观察，不代表已经出现买点。</p><dl><dt>平台突破</dt><dd>标出平台上下沿和前高；跌破平台就移出。主动突破且核心地位仍在，才符合我的入场预案。</dd><dt>断板反包</dt><dd>东方海洋是历史案例。没有平台也可以观察：断板后能否主动收复失地、带动同梯队？如果只是跟着别人拉，不当作龙头二波。</dd></dl>
 <h3>收盘自动名单{latest?' · '+latest:''}</h3>{snapshot?<EvidenceTable section={snapshot}/>:<p>尚未取得当日收盘名单。</p>}
 <h3>我的补充笔记</h3><form onSubmit={e=>{e.preventDefault();const n=name.trim();if(!n)return;const row={name:n,mode,note:note.trim()};save([...rows.filter(r=>r.name!==n),row],'已保存观察记录');setName('');setNote('')}}>
 <label>标的<input required maxLength={32} value={name} onChange={e=>setName(e.target.value)}/></label><label>观察路径<select value={mode} onChange={e=>setMode(e.target.value)}><option>平台突破</option><option>断板反包</option></select></label>
 <label>每日记录<input value={note} onChange={e=>setNote(e.target.value)} placeholder="断板日、首波高度、平台边界、核心地位" maxLength={240}/></label><button type="submit"><Plus size={16}/>保存</button></form>
{rows.length?<ul>{rows.map(r=><li key={r.name}><strong>{r.name}</strong> · {r.mode}<p>{r.note}</p><button type="button" onClick={()=>{setName(r.name);setMode(r.mode);setNote(r.note)}}>更新记录</button> <button type="button" aria-label={'移出'+r.name} onClick={()=>save(rows.filter(v=>v.name!==r.name),'已移出'+r.name)}><X size={14}/>移出</button></li>)}</ul>:<p>暂无个人补充笔记</p>}<small>补充笔记仅保存在当前浏览器，不影响收盘自动名单。</small><span role="status">{msg}</span></section>
}
