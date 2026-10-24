import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCrowdingWatch,crowdingSection,priceStructure,parseAdjustedSeries,parseSohuHistory,parseTencentAdjusted} from './crowding-watch.mjs';
const sessions=['2026-10-16','2026-10-19','2026-10-20','2026-10-21','2026-10-22','2026-10-23','2026-10-26','2026-10-27'];
const stock={code:'000001',name:'测试标的',boards:4};
const pool=(date,stocks=[])=>({date,stocks,complete:true,scopeKey:'test',source:'https://example.com/pool'});
function fixture(returns=[10,1,2,0,1,2,3,1]) {
 return {sessions,asOf:sessions.at(-1),pools:Object.fromEntries(sessions.map((d,i)=>[d,pool(d,i===0?[stock]:[])])),
 quotes:{'000001':Object.fromEntries(sessions.map((d,i)=>[d,{date:d,close:10+i,pct:returns[i]??null,volume:100+i,amount:10000,source:'https://example.com/quote'}]))}};
}
test('four boards enter; break retained; four days is minimum not expiry; weekends excluded',()=>{
 const w=buildCrowdingWatch(fixture());assert.equal(w.records.length,1);assert.equal(w.records[0].breakDate,sessions[1]);
 assert.equal(w.days[sessions[4]].rows[0].observed,4);assert.equal(w.days[sessions[4]].rows[0].status,'继续观察');
 assert.equal(w.days[sessions[7]].rows.length,1);assert.equal(w.days['2026-10-17'],undefined);
});
test('strict threshold and three daily losses, not cumulative or intraday lows',()=>{
 const f=fixture([10,-7,-6,-7,-7,-7,2,3]);const w=buildCrowdingWatch(f);
 assert.equal(w.records[0].exitDate,sessions[5]);assert.equal(w.days[sessions[5]].rows[0].status,'今日退出');
 assert.equal(w.days[sessions[6]].rows.length,0);assert.equal(w.records[0].exitEvidence.length,3);
});
test('three-day exception can exit before four valid follow-up days',()=>{
 const w=buildCrowdingWatch(fixture([10,-7,-8,-9,2,3,4,5]));assert.equal(w.records[0].exitDate,sessions[3]);
 assert.equal(w.days[sessions[3]].rows[0].observed,3);
});
test('floating-point noise at exactly minus six does not trigger removal',()=>{
 const w=buildCrowdingWatch(fixture([10,-7,-6.000000000000005,-7,-7,1,2,3]));assert.equal(w.records[0].exitDate,null);
});
test('unknown or suspended day is not zero, completed observation, or bridged loss streak',()=>{
 const f=fixture([10,-7,null,-7,-7,2,3,4]);f.quotes['000001'][sessions[2]].volume=0;
 const w=buildCrowdingWatch(f);assert.equal(w.records[0].exitDate,null);assert.equal(w.days[sessions[2]].rows[0].observed,1);
 assert.equal(w.days[sessions[4]].rows[0].negativeStreak,2);assert.equal(w.days[sessions[2]].rows[0].quote.pct,null);
});
test('unknown history never invents fourth-board date, three boards never enter',()=>{
 const f=fixture();f.pools[sessions[0]].stocks=[{...stock,boards:5},{code:'000002',name:'三板',boards:3}];
 const w=buildCrowdingWatch(f);assert.equal(w.records.length,1);assert.equal(w.records[0].entryBoards,5);assert.equal(w.records[0].entryDate,sessions[0]);
});
test('persisted membership and facts survive rolling-window and missing-source refresh',()=>{
 const original=buildCrowdingWatch(fixture());const f=fixture();f.previous=original;f.pools={};f.quotes={};f.sessions=sessions.slice(-2);
 const w=buildCrowdingWatch(f);assert.deepEqual(w.records,original.records);assert.equal(w.days[sessions.at(-1)].rows.length,1);
});
test('new verified four-board episode can reenter, old observation cannot',()=>{
 const f=fixture([10,-7,-8,-9,10,10,10,10]);f.pools[sessions[7]].stocks=[stock];const w=buildCrowdingWatch(f);
 assert.equal(w.records.length,2);assert.equal(w.records[1].entryDate,sessions[7]);assert.equal(w.records[1].observed,0);
});
test('historical views and volume ratios cannot use future data',()=>{
 const f=fixture([10,-7,-7,-7,2,3,4,5]);f.asOf=sessions[2];const w=buildCrowdingWatch(f);
 assert.equal(w.records[0].exitDate,null);assert.equal(w.days[sessions[3]],undefined);
 assert.ok(!crowdingSection(w,sessions[2]).rows[0].join(' ').includes(sessions[3]));
});
test('MA uses consistent adjusted series, includes current date, rejects short history',()=>{
 const rows=Object.fromEntries(Array.from({length:11},(_,i)=>[`2026-10-${String(i+1).padStart(2,'0')}`,{date:`2026-10-${String(i+1).padStart(2,'0')}`,close:i+1,low:i}]));
 const s={rows,basis:'同次请求前复权',source:'url'};const p=priceStructure(s,'2026-10-10');
 assert.equal(p.ma5,8);assert.equal(p.ma10,5.5);assert.equal(priceStructure(s,'2026-10-04').ma5,null);
 assert.equal(priceStructure(null,'2026-10-10').ma5,null);
 assert.throws(()=>parseAdjustedSeries({data:{code:'other',klines:[]}},'000001','url'));
});
test('missing capitalization is not rendered as zero and zero return stays valid',()=>{
 const f=fixture();f.quotes['000001'][sessions[0]].totalCap=null;const w=buildCrowdingWatch(f);
 assert.match(crowdingSection(w,sessions[0]).rows[0][5],/总市值 待核/);
 assert.equal(w.days[sessions[3]].rows[0].quote.pct,0);
});
test('empty known pool differs from missing pool and no sample module remains',()=>{
 const f=fixture();for(const p of Object.values(f.pools))p.stocks=[];
 assert.equal(crowdingSection(buildCrowdingWatch(f),sessions[0]).status,'complete');
 f.pools={};assert.equal(crowdingSection(buildCrowdingWatch(f),sessions.at(-1)).status,'partial');
});
test('historical fallback uses provider percent and verifies code/date and units',()=>{
 const p=[{code:'cn_000001',status:0,hq:[['2026-10-16','10','9','-1','-10%','8','11','100','200','1%']]}];
 const r=parseSohuHistory(p,'000001','url','2026-10-16','2026-10-16');assert.equal(r['2026-10-16'].pct,-10);assert.equal(r['2026-10-16'].amount,2000000);
 assert.throws(()=>parseSohuHistory(p,'000002','url','2026-10-16','2026-10-16'));
 assert.equal(Object.keys(parseSohuHistory(p,'000001','url','2026-10-19','2026-10-20')).length,0);
});
test('adjusted fallback verifies instrument and keeps provider series separate',()=>{
 const q=[];q[2]='000001';const p={code:0,data:{sz000001:{qt:{sz000001:q},qfqday:[['2026-10-16','10','9','11','8','100']]}}};
 assert.equal(parseTencentAdjusted(p,'sz000001','url').rows['2026-10-16'].low,8);
 assert.throws(()=>parseTencentAdjusted(p,'sz000002','url'));
});
