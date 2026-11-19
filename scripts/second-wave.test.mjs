import test from 'node:test';
import assert from 'node:assert/strict';
import {waveDay,attachWave} from './second-wave.mjs';
const stock=(code,boards)=>({code,name:code,boards});
const pool=(stocks=[])=>({complete:true,scopeKey:'HS',stocks});
const q=(close=10,prev=10)=>({volume:100,close,high:close+.2,low:close-.2,pct:(close/prev-1)*100});
const quotes={a:{d0:q(),d1:q(9,10),d2:q(9,9),d3:q(9,9),d4:q(10,9),d5:q(8,10)},b:{d1:q()},c:{d1:q()}};
function run(i,prior,current,last,history=quotes){
 return waveDay({date:'d'+i,prev:'d'+(i-1),prior,current,quotes:history,last});
}
test('three consecutive boards then a traded break; neither promotion nor missing quote counts',()=>{
 const day=run(1,pool([stock('a',3),stock('b',2),stock('c',4),stock('d',5)]),pool([stock('c',5)]));
 assert.deepEqual(day.added,['a']);assert.match(day.missing.join(''),/未核实/);
 assert.equal(run(1,pool([stock('a',3)]),{...pool(),complete:false}).added.length,0);
});
test('fixed reference platform: close above, absent quote retained, close below removed, day replay stable',()=>{
 let s=run(1,pool([stock('a',3)]),pool());
 for(let i=2;i<=3;i++)s=run(i,pool(),pool(),s);
 assert.equal(s.pool.a.bounds.low,8.8);
 const before=JSON.stringify(s);
 assert.match(run(4,pool(),pool(),s,{}).pool.a.status,/待核/);
 const up=run(4,pool(),pool(),s);assert.match(up.pool.a.status,/收盘突破/);
 const down=run(5,pool(),pool(),up);assert.deepEqual(Object.keys(down.pool),[]);assert.equal(down.removed[0].code,'a');
 assert.equal(JSON.stringify(s),before);assert.deepEqual(up,run(4,pool(),pool(),s));
});
test('next-session reversal does not need a platform; unverified pool is not a reversal',()=>{
 const s=run(1,pool([stock('a',3)]),pool());
 const history={a:{...quotes.a,d2:q(10,9)}};
 assert.match(run(2,pool(),pool([stock('a',1)]),s,history).pool.a.reversal,/主动性待核/);
 assert.equal(run(2,pool(),{...pool(),complete:false},s,history).pool.a.reversal,'反包待核');
});
test('replaying mismatched providers or missing quotes preserves verified admissions, not invented ones',()=>{
 const dates=['2026-11-06','2026-11-09','2026-11-10'];
 const make=()=>({sessions:dates,days:Object.fromEntries(dates.slice(1).map(d=>[d,{sections:[],gaps:[]}])),crowdingWatch:{pools:{[dates[0]]:pool([stock('a',3)]),[dates[1]]:pool(),[dates[2]]:pool()}},quoteCache:{stocks:{a:{[dates[0]]:q(),[dates[1]]:q(9,10),[dates[2]]:q(9,9)}}}});
 const original=make();attachWave(original);assert.deepEqual(original.secondWave[dates[1]].added,['a']);
 const changed=structuredClone(original);changed.crowdingWatch.pools[dates[1]].scopeKey='other-HS';
 attachWave(changed);assert.deepEqual(changed.secondWave[dates[1]].added,['a']);assert(changed.secondWave[dates[2]].pool.a);
 assert.match(changed.secondWave[dates[1]].missing.join(''),/保留此前已核实/);
 const noQuote=structuredClone(original);delete noQuote.quoteCache.stocks.a[dates[1]];attachWave(noQuote);
 assert(noQuote.secondWave[dates[1]].pool.a);assert.equal(noQuote.secondWave[dates[1]].pool.a.close,null);
 const noEvidence=make();noEvidence.crowdingWatch.pools[dates[1]].scopeKey='other-HS';attachWave(noEvidence);
 assert.deepEqual(noEvidence.secondWave[dates[1]].added,[]);
 const contradicted=structuredClone(original);contradicted.crowdingWatch.pools[dates[1]]=pool([stock('a',4)]);attachWave(contradicted);
 assert.equal(contradicted.secondWave[dates[1]].pool.a,undefined);
});
