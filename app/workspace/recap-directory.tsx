import {useEffect,useRef,useState} from 'react';
import {ChevronDown,CalendarDays,Search,X} from 'lucide-react';
import {recapMonths} from '../desk-model';
import type {Archive} from '../recap-source';

export default function RecapDirectory({archive,date,onSelect}:{archive:Archive|null;date:string;onSelect:(date:string)=>void}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),list=useRef<HTMLDivElement>(null);
 const normalized=query.trim().toLowerCase().replace(/[./]/g,'-');
 const matches=(archive?.days||[]).filter(day=>[day.date,day.label,day.title].some(value=>value?.toLowerCase().includes(normalized)));
 const months=recapMonths(matches);
 useEffect(()=>{const current=list.current?.querySelector<HTMLElement>('[aria-current="date"]');if(current&&list.current)list.current.scrollTop=current.offsetTop-list.current.offsetTop-80},[date,archive]);
 return <aside className={'desk-sidebar recap-directory'+(open?' directory-open':'')} aria-label="每日复盘目录">
  <div className="directory-intro"><span className="section-kicker">每日复盘 · 目录</span><h2>复盘索引</h2><p>按日期查看，一天一份完整复盘。</p><div><span>累计 <b>{archive?.days.length||0}</b> 篇</span><span>最新 {archive?.latest?.replaceAll('-','.')||'—'}</span></div></div>
  <button className="directory-toggle" aria-expanded={open} aria-controls="recap-date-list" onClick={()=>setOpen(!open)}><CalendarDays size={17}/><span>复盘目录</span><time>{date}</time><ChevronDown size={16}/></button>
  <div className="directory-body" id="recap-date-list"><div className="directory-heading"><h3>按月份 / 日期查看</h3><button disabled={!archive} onClick={()=>{if(archive){setQuery('');onSelect(archive.latest);setOpen(false)}}}>最新复盘</button></div><div className="directory-search"><Search size={15}/><input aria-label="搜索复盘日期或情绪" placeholder="搜索日期 / 情绪关键词" type="search" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="清除目录搜索" onClick={()=>setQuery('')}><X size={14}/></button>}</div>{query&&<p className="directory-results" role="status">找到 {matches.length} 篇复盘</p>}<div className="directory-scroll" ref={list}>{months.length===0&&<div className="directory-no-results">{archive?<>没有匹配的复盘<p>试试日期“09-22”或“分歧”。</p></>:<>正在读取复盘目录…</>}</div>}<nav aria-label="按月份查看每日复盘">{months.map(({month,days})=><section className="directory-month" key={month}><h4><span>{month.replace('-','.')}</span><small>{days.length} 篇</small></h4>{days.map(day=><button key={day.date} aria-current={date===day.date?'date':undefined} className="directory-day" title={day.title||day.label} onClick={()=>{onSelect(day.date);setOpen(false)}}><span className="directory-date">{Number(day.date.slice(5,7))}/{Number(day.date.slice(8))}</span><span className="directory-day-copy"><strong>{day.date.replaceAll('-','.')}</strong><small>{day.label||day.title||'每日 A 股复盘'}</small></span></button>)}</section>)}</nav></div></div>
 </aside>
}
