import {RadioGroup,RadioGroupItem} from '@/components/ui/radio-group';
import {Checkbox} from '@/components/ui/checkbox';
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from '@/components/ui/table';
import type {Answers,Block} from './model';
function Choice({id,label,options,multi,answers,change}:{id:string;label:string;options:string[];multi?:boolean;answers:Answers;change:(k:string,v:string|string[])=>void}){
 const val=answers[id];return <fieldset className="field"><legend>{label}{multi&&<small className="inline-hint">可多选</small>}</legend>{multi?<div className="choices">{options.map((o,i)=><label key={o} className="choice"><Checkbox id={id+'-'+i} checked={Array.isArray(val)&&val.includes(o)} onCheckedChange={checked=>change(id,checked?[...(Array.isArray(val)?val:[]),o]:(Array.isArray(val)?val:[]).filter(x=>x!==o))}/>{o}</label>)}</div>:<><RadioGroup aria-label={label} className="choices" value={typeof val==='string'?val:''} onValueChange={v=>change(id,v)}>{options.map((o,i)=><label className="choice" key={o}><RadioGroupItem id={id+'-'+i} value={o}/>{o}</label>)}</RadioGroup>{val&&<button className="clear-choice" onClick={()=>change(id,'')}>清除选择</button>}</>}</fieldset>
}
export function BlockView({b,answers,change}:{b:Block;answers:Answers;change:(k:string,v:string|string[])=>void}){
 if(b.type==='heading')return <h3>{b.label}</h3>;
 if(b.type==='note')return <p className="note">{b.label}</p>;
 if(b.type==='choice')return <Choice id={b.id!} label={b.label!} options={b.options!} multi={b.multi} answers={answers} change={change}/>;
 if(b.type==='text')return <label className="field" htmlFor={b.id}>{b.label}{b.long?<textarea id={b.id} value={answers[b.id!] as string||''} maxLength={12000} onChange={e=>change(b.id!,e.target.value)} placeholder="写下判断，以及支持它的证据…"/>:<input id={b.id} value={answers[b.id!] as string||''} maxLength={12000} onChange={e=>change(b.id!,e.target.value)} placeholder="填写…"/>}</label>;
 if(b.type!=='table')return null;
 const hasChoices=b.rows!.some(row=>row.some(c=>c.includes('□')));
 if(hasChoices)return <div className="rating-rows">{b.rows!.map((row,r)=><div className="rating-row" key={r}><h4>{row[0]}</h4><Choice id={b.id+'_'+r+'_rating'} label={b.id==='f104'?'等级':'变化'} options={row.map((v,i)=>v.includes('□')?b.headers![i]:'').filter(Boolean)} answers={answers} change={change}/>{row.map((v,c)=>v.includes('_')&&<label className="field" key={c}>{b.headers![c]}<input aria-label={row[0]+' '+b.headers![c]} value={answers[b.id+'_'+r+'_'+c] as string||''} onChange={e=>change(b.id+'_'+r+'_'+c,e.target.value)}/></label>)}</div>)}</div>;
 return <div className="data-table"><Table><TableHeader><TableRow>{b.headers!.map(h=><TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{b.rows!.map((row,r)=><TableRow key={r}>{row.map((cell,c)=><TableCell key={c}>{c===0?cell:<input aria-label={b.id+' '+row[0]+' '+b.headers![c]} value={answers[b.id+'_'+r+'_'+c] as string||''} onChange={e=>change(b.id+'_'+r+'_'+c,e.target.value)} placeholder={b.headers![c]==='量能状态'?'缩量 / 起量…':'—'}/>}</TableCell>)}</TableRow>)}</TableBody></Table></div>;
}
