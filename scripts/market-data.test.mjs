import assert from 'node:assert/strict';
import {test} from 'node:test';
import {completed,parseKlines,parseNaver,parseBoard} from './market-data.mjs';
test('US close uses New York date, including daylight saving, and never partial bars',()=>{
 assert.equal(completed('2026-09-23','US',new Date('2026-09-23T19:00:00Z')),false);
 assert.equal(completed('2026-09-23','US',new Date('2026-09-23T20:31:00Z')),true);
 assert.equal(completed('2026-01-23','US',new Date('2026-01-23T20:31:00Z')),false);
 assert.equal(completed('2026-01-23','US',new Date('2026-01-23T21:31:00Z')),true);
 assert.equal(completed('2026-09-24','KR',new Date('2026-09-24T05:00:00Z')),false);
});
test('quote parsing keeps zero, filters missing and unclosed sessions',()=>{
 const data={code:'SPX',klines:['2026-09-22,1,2,3,4,5,6,7,0','2026-09-23,1,2,3,4,5,6,7,1','2026-09-21,1,,3,4,5,6,7,1']};
 assert.deepEqual(parseKlines(data,'US',new Date('2026-09-23T12:00:00Z')),[{date:'2026-09-22',close:2,pct:0}]);
});
test('Korea computes change across holiday gaps, no fabricated holiday rows',()=>{
 const rows=parseNaver(`[['header'],["20260918",1,1,1,100,0],["20260923",1,1,1,105,0]]`,new Date('2026-09-24T00:00:00Z'));
 assert.equal(rows.length,1);assert.equal(rows[0].date,'2026-09-23');assert(Math.abs(rows[0].pct-5)<1e-10);
});
test('THS turnover parsed as yuan; zero and missing remain distinct',()=>{
 assert.deepEqual(parseBoard('cb({"data":"20260922,1,2,3,4,5,100000000;20260923,1,2,3,4,5,0;20260924,1,2,3,4,5,"})'),{'2026-09-22':100000000,'2026-09-23':0});
 assert.throws(()=>parseBoard('cb({"error":true})'));
});
