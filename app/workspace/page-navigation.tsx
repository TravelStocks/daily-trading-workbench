import {useEffect,useRef,useState} from 'react';
import {ArrowUp,ArrowUpRight} from 'lucide-react';

const sections=[['external','外围市场'],['overview','市场概览'],['themes','题材强度'],['recap','每日复盘'],['exam','决策考卷'],['report','汇总报告'],['handbook','交易手册']];

export default function PageNavigation({ready,completed,total}:{ready:boolean;completed:number;total:number}){
 const [active,setActive]=useState('external');
 const nav=useRef<HTMLElement>(null);
 useEffect(()=>{
  if(!ready)return;
  let frame=0;
  const update=()=>{
   frame=0;
   const edge=(nav.current?.getBoundingClientRect().bottom||130)+32;
   let current='external';
   for(const [id] of sections){const el=document.getElementById(id);if(el&&el.getBoundingClientRect().top<=edge)current=id}
   setActive(current);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update)};
  update();window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
  return()=>{window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);cancelAnimationFrame(frame)};
 },[ready]);
 useEffect(()=>{const el=nav.current?.querySelector<HTMLElement>('[aria-current="location"]');const rail=el?.parentElement;if(el&&rail)rail.scrollTo({left:el.offsetLeft-rail.offsetLeft-rail.clientWidth/2+el.clientWidth/2,behavior:'instant'})},[active]);
 return <><nav ref={nav} className="page-navigation" aria-label="整页内容导航"><div className="page-navigation-links">{sections.map(([id,label],i)=><a key={id} href={'#'+id} aria-current={active===id?'location':undefined}><span>{String(i+1).padStart(2,'0')}</span>{label}</a>)}</div><a className="nav-completion" href="#exam" aria-label={`日常考卷已填写 ${completed} / ${total} 项`}><span>考卷 <b>{completed}</b> / {total}</span><progress value={completed} max={total}/><ArrowUpRight size={14}/></a></nav>{active!=='overview'&&active!=='external'&&<a className="return-overview" href="#overview" aria-label="回到市场概览"><ArrowUp size={16}/><span>回到概览</span></a>}</>;
}
