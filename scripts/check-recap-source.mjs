import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const compiled=ts.transpileModule(fs.readFileSync('app/recap-source.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {recapSections}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const titles=['天时','地利','题材','阶段','个股与地位','模式、仓位与买卖点','预案推演','持仓处理计划与交易计划'];
const html='<aside><h2>复盘导航</h2></aside><main>'+titles.map((title,i)=>`<section class="decision-step"><header class="step-head"><span>${i+1}</span><h2>${title}</h2></header><h3 class="chapter-title">归档子节</h3><p>正文${i}</p>${i===7?'<table><tr><td>承接不清</td><td>不轮换凑交易。</td></tr></table>':''}<script>unsafe()</script><style>.hidden{}</style></section>`).join('')+'</main><footer>footer not source</footer>';
const sections=recapSections(html);
assert.deepEqual(sections.map(s=>s.title),titles);
assert(sections[7].text.includes('承接不清')&&sections[7].text.includes('不轮换凑交易。'));
assert(sections.every((s,i)=>s.text.includes(`正文${i}`)&&!s.text.includes('unsafe()')&&!s.text.includes('.hidden{}')&&!s.text.includes('footer not source')));
const legacy=recapSections('<main><h2 class="chapter-title">旧版章节</h2><p>旧文&amp;证据</p><script>unsafe()</script></main>');
assert.deepEqual(legacy,[{title:'旧版章节',text:'旧文&证据'}]);
assert.deepEqual(recapSections('<h2>Not a recap</h2>'),[]);
if(process.argv[2]){
 const actual=recapSections(fs.readFileSync(process.argv[2],'utf8'));
 assert.deepEqual(actual.map(s=>s.title),titles);
 for(const branch of ['北纬给分歧','北纬直接拉高','北纬承接不清','真视通四进五','盛剑科技四进五'])assert(actual[7].text.includes(branch),branch);
}
console.log('PASS: eight-step and legacy source extraction; authored tables, order and safe text retention');
