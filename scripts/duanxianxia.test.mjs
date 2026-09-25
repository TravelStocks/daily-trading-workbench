import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parseLimitUps,fetchLimitUps} from './duanxianxia.mjs';
const group=(name,count,stocks)=>`<div class='list-group-item ztitem'><b>${name}</b><div class='ztnum'><div style='font-weight:bold;'>${count}</div><div>涨停</div></div></div><div class='zt'><table>${stocks.map(([code,name])=>`<tr><td><span class='kline' code='${code}'>${name}</span></td></tr>`).join('')}</table></div>`;
test('keeps source classifications, counts and stock identities without splitting composites',()=>{
 const j={result:'success',html:group('算力/半导体产业链',2,[['000001','示例甲'],['000002','示例乙']])+group('PCB产业链',0,[])};
 const day=parseLimitUps(j,'2026-09-23');assert.equal(day.groups[0].name,'算力/半导体产业链');assert.equal(day.groups[0].count,2);assert.equal(day.groups[1].count,0);assert.equal(day.groups[0].stocks[1].code,'000002');
});
test('rejects incomplete, duplicate and cross-date source responses',()=>{
 assert.throws(()=>parseLimitUps({result:'success',html:group('PCB',2,[['000001','甲']])},'2026-09-23'),/家数/);
 assert.throws(()=>parseLimitUps({result:'success',html:group('PCB',2,[['000001','甲'],['000001','甲']])},'2026-09-23'),/家数/);
 assert.throws(()=>parseLimitUps({result:'success',html:group('PCB',1,[['000001','甲']])+"<button date='2026-09-24'>查看</button>"},'2026-09-23'),/日期/);
 assert.throws(()=>parseLimitUps({result:'success',html:''},'2026-09-23'),/分类缺失/);
});
test('calendar fallback is rejected instead of labeling previous-day data as today',async()=>{
 let calls=0;await assert.rejects(fetchLimitUps('2026-09-25',async()=>{calls++;return {ok:true,json:async()=>({result:'success',date:'2026-09-24'})}}),/尚无/);assert.equal(calls,1);
});
test('daily collection posts the requested date to both public source endpoints',async()=>{
 const calls=[];const result=await fetchLimitUps('2026-09-23',async(url,options)=>{calls.push([url,Object.fromEntries(options.body)]);return {ok:true,json:async()=>calls.length===1?{result:'success',date:'2026-09-23'}:{result:'success',html:group('医药',1,[['000001','示例']])}}});
 assert.equal(result.date,'2026-09-23');assert.equal(calls[1][1].date,'2026-09-23');assert.equal(calls[1][1].type,'plate');
});
