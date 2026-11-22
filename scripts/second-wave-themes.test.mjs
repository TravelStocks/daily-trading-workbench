import test from 'node:test';
import assert from 'node:assert/strict';
import {waveThemeAssociation,waveThemeEvidence,parseWaveThemeSeries,collectWaveThemeStrength} from './second-wave-themes.mjs';
const dates=['2026-11-11','2026-11-12','2026-11-13','2026-11-16','2026-11-17','2026-11-18','2026-11-19'];
const row={code:'a',name:'sample',entry:dates[4],height:4};
const group=(name,codes,reason='')=>({name,stocks:codes.map(code=>({code,reason}))});
function fixture(){return {sessions:dates,themeFactorInputs:{ranks:{[dates[0]]:{date:dates[0],provider:'duanxianxia',complete:true,rows:[{code:'robot',name:'机器人概念',strength:10}]}},themes:{[dates[0]]:[group('机器人',['a'])],[dates[3]]:[group('其他概念',['a'])],[dates[4]]:[group('机器人',['b'])],[dates[5]]:[group('机器人',['a','b','c'])]}},secondWaveThemes:{series:{robot:{name:'机器人概念',source:'https://www.duanxianxia.com/web/platerotat',points:{[dates[4]]:-100,[dates[5]]:-20,[dates[6]]:0}}}},secondWave:{[dates[5]]:{pool:{a:row},removed:[]}}};}

test('first-wave theme survives generic grouping and never follows future/current unrelated attribution',()=>{
 const base=fixture();base.themeFactorInputs.themes[dates[6]]=[group('芯片',['a'])];
 assert.equal(waveThemeAssociation(base,row).groups[0].name,'机器人');
 assert.equal(waveThemeEvidence(base,row,dates[5]).groups[0].scores[0].value,-20);
 assert.equal(waveThemeEvidence(base,row,dates[6]).groups[0].scores[0].value,0);
});
test('dated count and signed score deltas support observation, not confirmed second-wave claims',()=>{
 const e=waveThemeEvidence(fixture(),row,dates[5]);
 assert.equal(e.groups[0].limitUps,3);assert.equal(e.groups[0].previousLimitUps,1);
 assert.equal(e.groups[0].scores[0].delta,80);assert.match(e.text,/较前日\+2/);
 assert.match(e.text,/观察二次爆发/);assert.doesNotMatch(e.text,/确认二次爆发/);
 assert.equal(e.missing,false);
});
test('unlisted groups and unavailable same-day scores are not zero or yesterday replacements',()=>{
 const b=fixture();delete b.secondWaveThemes.series.robot.points[dates[6]];
 const e=waveThemeEvidence(b,row,dates[6]);
 assert.equal(e.groups[0].limitUps,null);assert.equal(e.groups[0].scores[0].value,null);
 assert.match(e.text,/来源未单列/);assert.equal(e.missing,true);
});
test('same-day concept count fallback is labelled and never compared with recap grouping counts',()=>{
 const b=fixture();b.secondWaveThemes.counts={[dates[6]]:[{name:'机器人概念',limitUps:5,source:'https://data.10jqka.com.cn/dataapi/limit_up/block_top?date=20261119'}]};
 const e=waveThemeEvidence(b,row,dates[6]);assert.equal(e.groups[0].limitUps,5);assert.equal(e.groups[0].previousLimitUps,3);
 assert.match(e.text,/5家 · 同花顺概念口径/);assert.doesNotMatch(e.text,/较前日\+2|同步回升/);
});
test('combined groups keep combined count; no independent index does not borrow unrelated scores',()=>{
 const b=fixture();b.themeFactorInputs.themes[dates[3]]=[group('算力/半导体产业链',['a'])];
 b.themeFactorInputs.themes[dates[5]]=[group('算力/半导体产业链',['a','b']),group('算力租赁',['b','c','d'])];
 b.themeFactorInputs.ranks[dates[5]]={date:dates[5],provider:'duanxianxia',complete:true,rows:[{code:'chip',name:'芯片',strength:100},{code:'compute',name:'算力',strength:200}]};
 const e=waveThemeEvidence(b,row,dates[5]);assert.equal(e.groups[0].limitUps,2);assert.equal(e.groups[0].scores.length,2);
 b.themeFactorInputs.themes[dates[3]]=[group('“东方系”',['a'])];b.themeFactorInputs.themes[dates[5]]=[group('名称炒作',['a','b'])];
 const named=waveThemeEvidence(b,row,dates[5]);assert.equal(named.groups[0].limitUps,2);assert.equal(named.groups[0].scores.length,0);assert.match(named.text,/无对应独立强度指数/);
});
test('consumer reference indices explicitly differ from the broad recap count',()=>{
 const b=fixture();b.themeFactorInputs.themes[dates[3]]=[group('大消费',['a'],'百货零售+国资')];
 b.themeFactorInputs.themes[dates[5]]=[group('大消费',['a','b'])];
 b.themeFactorInputs.ranks[dates[5]]={date:dates[5],provider:'duanxianxia',complete:true,rows:[{code:'retail',name:'零售',strength:-20}]};
 const e=waveThemeEvidence(b,row,dates[5]);assert.equal(e.groups[0].reference,true);assert.match(e.text,/细分参考 · 零售：-20/);assert.match(e.text,/复盘分组口径/);
});
test('series parser validates identity, real dates and ambiguity; zero and negative values survive',()=>{
 const index={name:'机器人概念'},payload={legend:index.name,date:['11-19','11-18','11-17','11-20'],series1:[0,-10,null,99]};
 assert.deepEqual(parseWaveThemeSeries(payload,index,dates),{[dates[6]]:0,[dates[5]]:-10});
 assert.throws(()=>parseWaveThemeSeries({...payload,legend:'wrong'},index,dates));
 assert.throws(()=>parseWaveThemeSeries({legend:index.name,date:['11-19','11-19'],series1:[1,2]},index,dates));
 assert.throws(()=>parseWaveThemeSeries({legend:index.name,date:['11-19'],series1:[1]},index,['2025-11-19','2026-11-19']));
});
test('collector fetches missing out-of-top-ten series, reuses verified cache and preserves failures',async()=>{
 const b=fixture();delete b.secondWaveThemes.series.robot.points[dates[5]];let calls=0;
 const options={from:dates[5],end:dates[5],fetchedAt:'test',post:async(path,body)=>{calls++;assert.equal(path,'getPlateDayChart');assert.equal(body.platecode,'robot');return {legend:'机器人概念',date:['11-18'],series1:[-20]}}};
 b.secondWaveThemes=await collectWaveThemeStrength(b,options);assert.equal(calls,1);assert.equal(b.secondWaveThemes.series.robot.points[dates[4]],-100);
 b.secondWaveThemes=await collectWaveThemeStrength(b,options);assert.equal(calls,1);
 delete b.secondWaveThemes.series.robot.points[dates[5]];
 const failed=await collectWaveThemeStrength(b,{...options,post:async()=>{throw Error('offline')}});
 assert.equal(failed.series.robot.points[dates[4]],-100);assert.match(failed.errors[0],/offline/);
 const checked=await collectWaveThemeStrength(b,{...options,counts:{[dates[5]]:[{name:'机器人概念',limitUps:5,source:'https://data.10jqka.com.cn/dataapi/limit_up/block_top?date=20261119'}]}});
 assert.equal(checked.counts[dates[5]],undefined);
});
