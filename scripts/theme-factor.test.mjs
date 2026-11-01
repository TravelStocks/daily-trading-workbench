import test from 'node:test';
import assert from 'node:assert/strict';
import {buildThemeFactor,rankObservation,firstHigh,describeThemeRhythm} from './theme-factor.mjs';
const sessions=Array.from({length:22},(_,i)=>`2026-10-${String(i+1).padStart(2,'0')}`);
const snapshot=(rank=5,provider='duanxianxia')=>({provider,complete:true,rows:Array.from({length:6},(_,i)=>({code:i+1===rank?'t':`x${i+1}`,name:i+1===rank?'测试':'其他'+(i+1),rank:i+1,strength:100-i}))});
const setup=(tail)=>{const ranks=Object.fromEntries(sessions.map(d=>[d,snapshot()]));tail.forEach((v,i)=>{ranks[sessions.at(-tail.length+i)]=v===null?null:snapshot(v?2:5)});return ranks};
const item=(ranks,extra={})=>buildThemeFactor({date:sessions.at(-1),sessions,ranks,...extra}).factor.items.find(t=>t.code==='t');
test('rank four is high, five is not; missing snapshot is not weak',()=>{assert.equal(rankObservation(snapshot(4),'t').high,true);assert.equal(rankObservation(snapshot(5),'t').high,false);assert.equal(rankObservation(null,'t').high,null)});
test('three-day divergence return and four-day continuation return are distinct',()=>{assert.deepEqual(item(setup([true,false,true])).signals,['分歧后回流']);assert.deepEqual(item(setup([true,true,false,true])).signals,['分歧后回流','续强后回流']);assert.equal(item(setup([true,false,false,true])).signals.length,0)});
test('unknown day cannot bridge a return or uninterrupted strength',()=>{assert.equal(item(setup([true,null,true])).signals.length,0);assert.equal(item(setup([true,null,true])).streak,1)});
test('ten sessions includes today and nine prior, with full coverage',()=>{const ranks=setup([true]);assert.equal(item(ranks).firstHigh,true);ranks[sessions.at(-10)]=snapshot(2);assert.equal(item(ranks).firstHigh,false);delete ranks[sessions.at(-10)];assert.equal(item(ranks).firstHigh,null)});
test('first high event follows day two and day three without future leakage',()=>{const ranks=setup([true,false,true]);const t=item(ranks);assert.equal(t.startDate,sessions.at(-3));assert.equal(t.dayNumber,3);const date=sessions.at(-3);const earlier=buildThemeFactor({date,sessions,ranks}).factor.items.find(t=>t.code==='t');assert.equal(earlier.dayNumber,1);assert.equal(earlier.signals.length,0)});
test('uninterrupted model starts at three, two remains observation',()=>{assert.ok(item(setup([true,true,true])).signals.includes('一直不弱'));assert.equal(item(setup([true,true])).signals.length,0)});
test('provider changes are missing evidence, not a merged track',()=>{const r=setup([true,false,true]);r[sessions.at(-2)]=snapshot(5,'kaipanla');assert.equal(item(r).signals.length,0)});
test('real session order, not calendar arithmetic',()=>{const days=['2026-10-09','2026-10-12','2026-10-13'];const ranks=Object.fromEntries(days.map((d,i)=>[d,snapshot(i===1?5:2)]));const t=buildThemeFactor({date:days[2],sessions:days,ranks}).factor.items.find(t=>t.code==='t');assert.ok(t.signals.includes('分歧后回流'));assert.equal(t.firstHigh,false);assert.equal(firstHigh(days,0,'t',ranks,'duanxianxia'),null)});
test('previous highest samples retained after failure; absent quotes not zero',()=>{const r=setup([true,false,true]),date=sessions.at(-3);const t=item(r,{themes:{[date]:[{name:'测试',stocks:[{code:'a',name:'老高标',boards:4}]}]}});assert.equal(t.leaders[0].code,'a');assert.equal(t.leaders[0].points.at(-1).amount,null);assert.equal(t.points.at(-1).limitUps,null)});
test('incomplete top four does not certify strength',()=>{const s=snapshot(2);s.rows=s.rows.filter(r=>r.rank!==4);assert.equal(rankObservation(s,'t').high,null)});

test('first high shows startup, second high continuation, long streak remains strong',()=>{
 assert.equal(describeThemeRhythm(item(setup([true]))).label,'启动观察');
 assert.equal(describeThemeRhythm(item(setup([true]))).sequence,'强');
 assert.equal(describeThemeRhythm(item(setup([true,true]))).label,'续强');
 assert.equal(describeThemeRhythm(item(setup([true,true,true]))).label,'一直不弱 · 3日');
});
test('right-side rhythm shows strong-weak and both return structures',()=>{
 assert.deepEqual([describeThemeRhythm(item(setup([true,false]))).label,describeThemeRhythm(item(setup([true,false]))).sequence],['分歧候选','强 → 弱']);
 assert.equal(describeThemeRhythm(item(setup([true,false,true]))).sequence,'强 → 弱 → 强');
 const return4=describeThemeRhythm(item(setup([true,true,false,true])));
 assert.equal(return4.label,'续强后回流');assert.equal(return4.sequence,'强 → 强 → 弱 → 强');
});
test('keep top three from each of the prior three sessions, excluding older days and rank four',()=>{
 for(let ago=1;ago<=3;ago++){
  const ranks=setup([true,...Array(ago).fill(false)]),r=describeThemeRhythm(item(ranks));
  assert.equal(r.recentTop3.length,1);assert.equal(r.recentTop3[0].date,sessions.at(-1-ago));
 }
 assert.equal(describeThemeRhythm(item(setup([true,false,false,false,false]))).recentTop3.length,0);
 const fourth=setup([true,false]);fourth[sessions.at(-2)]=snapshot(4);
 assert.equal(describeThemeRhythm(item(fourth)).recentTop3.length,0);
});
test('missing current data retains former top three without declaring a weak day',()=>{
 const t=item(setup([true,null])),r=describeThemeRhythm(t);
 assert.equal(r.label,'数据待核');assert.equal(r.sequence,'强 → 待核');assert.equal(r.recentTop3.length,1);
 const gap=describeThemeRhythm(item(setup([true,null,true])));
 assert.equal(gap.sequence,'强 → 待核 → 强');assert.ok(!gap.label.includes('回流'));
});
test('retention uses trading sessions through the selected day, without future results',()=>{
 const days=['2026-10-09','2026-10-12','2026-10-13','2026-10-14','2026-10-15'];
 const ranks=Object.fromEntries(days.map((d,i)=>[d,snapshot(i===0||i===4?2:5)]));
 const t=buildThemeFactor({date:days[3],sessions:days,ranks}).factor.items.find(t=>t.code==='t');
 assert.deepEqual(describeThemeRhythm(t).recentTop3,[{date:days[0],rank:2}]);
 assert.equal(describeThemeRhythm(t).sequence,'强 → 弱 → 弱 → 弱');
});
