import fs from 'node:fs/promises';
import {collectFactorInputs} from './daily-baseline.mjs';
import {buildThemeFactor} from './theme-factor.mjs';
const arg=name=>process.argv[process.argv.indexOf(name)+1];
if(!process.argv.includes('--from')||!process.argv.includes('--to'))throw Error('Require --from and --to');
const file='public/data/daily-baseline.json',data=JSON.parse(await fs.readFile(file,'utf8'));
const dates=Object.keys(data.days).filter(d=>d>=arg('--from')&&d<=arg('--to')).sort();
if(!dates.length)throw Error('No existing completed dates selected');
const now=new Date().toISOString();
const post=async(path,body)=>{
 const r=await fetch(`https://www.duanxianxia.com/api/${path}`,{method:'POST',body:new URLSearchParams(body),signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json();
};
const inputs=await collectFactorInputs({sessions:data.sessions,dates,saved:data.themeFactorInputs,post,fetchedAt:now});
for(const date of dates){
 const day=data.days[date],section=buildThemeFactor({date,sessions:data.sessions,ranks:inputs.ranks,themes:inputs.themes,quotes:data.quoteCache?.stocks});
 day.sections=day.sections.filter(s=>s.id!==section.id);day.sections.splice(1,0,section);
 day.gaps=day.sections.filter(s=>s.status!=='complete').map(s=>({id:s.id,title:s.title,status:s.status,note:s.note}));
 day.status=day.gaps.length?'partial':'complete';
 console.log(`${date}: ${section.factor.items.length} themes, ${section.factor.rankCoverage}/10 ranks; ${section.status}`);
}
data.themeFactorInputs=inputs;data.updatedAt=now;
for(const folder of ['public','docs'])await fs.writeFile(`${folder}/data/daily-baseline.json`,JSON.stringify(data));
console.log(JSON.stringify({errors:inputs.errors}));
