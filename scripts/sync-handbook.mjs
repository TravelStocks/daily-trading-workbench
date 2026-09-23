// Extract only the original recap site's fixed reference content; never execute its HTML.
// Usage: node scripts/sync-handbook.mjs [path/to/original/index.html]
import {readFileSync,writeFileSync} from 'node:fs';
const root='https://travelstocks.github.io/daily-trading-review/';
const html=process.argv[2]?readFileSync(process.argv[2],'utf8'):await (async()=>{const r=await fetch(root,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error(`Source HTTP ${r.status}`);return r.text()})();
const entities={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
const plain=s=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,'').replace(/&(amp|lt|gt|quot|apos|nbsp);/g,(_,n)=>entities[n]).replace(/\s+/g,' ').trim();
const elements=(source,tag,cls)=>[...source.matchAll(new RegExp(`<${tag}\\b[^>]*class="${cls}(?: [^"]*)?"[^>]*>([\\s\\S]*?)<\\/${tag}>`,'g'))].map(m=>m[1]);
const text=(tag,cls)=>plain(elements(html,tag,cls)[0]||'');
const cards=(source,cls)=>elements(source,'article',cls).map(s=>({title:plain(s.match(/<strong>([\s\S]*?)<\/strong>/)?.[1]||''),text:plain(s.match(/<p>([\s\S]*?)<\/p>/)?.[1]||''),emphasis:plain(s.match(/<em>([\s\S]*?)<\/em>/)?.[1]||'')}));
const profile=elements(html,'article','trading-system-profile-panel').map(s=>({title:plain(s.match(/<h3>([\s\S]*?)<\/h3>/)?.[1]||''),items:elements(s,'span','trading-system-tag').map(plain)}));
const table=elements(html,'table','next-day-table')[0]||'';
const rows=[...table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(r=>[...r[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map(c=>plain(c[1])));
const stages=elements(html,'section','theme-rhythm-stage').map(s=>({title:plain(s.match(/<h3>([\s\S]*?)<\/h3>/)?.[1]||''),cards:cards(s,'theme-rhythm-card')}));
const research=[...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].find(m=>m[1].includes('董事长交易模式研究'));
const stats=elements(html,'div','stat').map(s=>({label:plain(s.match(/<span>([\s\S]*?)<\/span>/)?.[1]||''),value:plain(s.match(/<strong>([\s\S]*?)<\/strong>/)?.[1]||'')}));
const img=html.match(/<img[^>]*src="([^"]*emotion-cycle\.png[^"]*)"/);
const data={source:root,asOf:stats.find(s=>s.label==='最新日期')?.value.replaceAll('.','-')||'',cycle:{title:text('h2','emotion-cycle-chart-title'),note:text('p','emotion-cycle-chart-note'),image:new URL(img?.[1]||'assets/emotion-cycle.png',root).href},profile:{title:text('h2','trading-system-profile-title'),note:text('p','trading-system-profile-note'),groups:profile},expectation:{title:text('h2','next-day-expectation-title'),note:text('p','next-day-expectation-note'),headers:rows[0],rows:rows.slice(1)},knowledge:{title:text('h2','daily-knowledge-title'),note:text('p','daily-knowledge-note'),cards:cards(html,'knowledge-card')},rhythm:{title:text('h2','theme-rhythm-run-title'),note:text('p','theme-rhythm-run-note'),stages},research:{title:plain(research?.[2].match(/<strong[^>]*>([\s\S]*?)<\/strong>/)?.[1]||''),description:plain([...research?.[2].matchAll(/<span[^>]*>([\s\S]*?)<\/span>/g)||[]].at(-1)?.[1]||''),url:new URL(research?.[1]||'',root).href},stats};
if(!img||profile.length!==2||rows.length!==7||data.knowledge.cards.length<17||stages.length!==4||stages.reduce((n,s)=>n+s.cards.length,0)<20||!research||stats.length!==5)throw Error('Required handbook content is missing; existing snapshot was not changed');
writeFileSync('app/handbook.json',JSON.stringify(data,null,2)+'\n');
console.log(`Handbook retained: cycle map, 2 profile groups, 6 expectation rows, ${data.knowledge.cards.length} knowledge cards, ${stages.reduce((n,s)=>n+s.cards.length,0)} rhythm cards, research link, 5 source stats (${data.asOf})`);
