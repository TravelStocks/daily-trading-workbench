import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePool,parseDxxPool,promotionDay,collectPromotions} from './promotions.mjs';
const previous={date:'2026-09-22',complete:true,source:'prior',stocks:[{code:'600001',name:'A',boards:2},{code:'600002',name:'B',boards:2},{code:'600003',name:'C',boards:3},{code:'600004',name:'D',boards:5},{code:'600005',name:'E',boards:6}]};
const current={date:'2026-09-23',complete:true,source:'today',stocks:[{code:'600001',name:'A',boards:3},{code:'600003',name:'C',boards:1},{code:'600004',name:'D',boards:6},{code:'600099',name:'X',boards:3}]};
test('identity matching, broken rebounds, disjoint 5+ cohort, empty denominator',()=>{const r=promotionDay(previous,current,[previous.date,current.date]);assert.deepEqual(r.rows.map(x=>[x.success,x.total]),[[1,2],[0,1],[0,0],[1,2]]);assert.equal(r.rows[2].rate,null);assert.equal(r.rows[0].promoted[0].code,'600001');});
test('cannot bridge a missing trading session',()=>assert.throws(()=>promotionDay({...previous,date:'2026-09-21'},current,['2026-09-21','2026-09-22','2026-09-23'])));
test('holiday adjacency uses calendar, not weekday arithmetic',()=>assert.doesNotThrow(()=>promotionDay({...previous,date:'2026-09-18'}, {...current,date:'2026-09-21'},['2026-09-18','2026-09-21'])));
test('wrong date, partial pool, invalid board count rejected',()=>{for(const d of [{qdate:20260922,tc:0,pool:[]},{qdate:20260923,tc:2,pool:[]},{qdate:20260923,tc:1,pool:[{c:'600001',n:'A',lbc:0}]}])assert.throws(()=>parsePool({rc:0,data:d},'2026-09-23','url'));});
test('real zero distinct from unavailable',()=>assert.deepEqual(parsePool({rc:0,data:{qdate:20260923,tc:0,pool:[]}},'2026-09-23','url').stocks,[]));
test('Duanxianxia uses consecutive column, not N-days M-boards',()=>{
 const html="<div class='ztitem'><b>测试题材</b><div class='ztnum'><div>1</div></div></div><table><thead><tr><th>名称</th><th>板数</th><th>连板</th></tr></thead><tr><td><span class='kline' code='600001'>测试股</span></td><td>9天7板</td><td>2</td></tr></table>";
 assert.equal(parseDxxPool({result:'success',html},'2026-09-23').stocks[0].boards,2);
 assert.throws(()=>parseDxxPool({result:'success',html:html.replace('<td>2</td>','<td></td>')},'2026-09-23'));
});
test('different provider universes cannot be mixed',()=>assert.throws(()=>promotionDay({...previous,scopeKey:'a'},{...current,scopeKey:'b'},[previous.date,current.date])));
test('failed fetch retains verified dates without relabeling',async()=>{const fetcher=async u=>({ok:true,json:async()=>u.includes('gtimg')?{code:0,data:{sh000001:{day:[['2026-09-22'],['2026-09-23']]}}}:{rc:0,data:{qdate:20260924,tc:0,pool:[]}}});const old={promotionPools:{[previous.date]:previous,[current.date]:current}};const r=await collectPromotions(old,new Date('2026-09-23T10:00:00Z'),fetcher);assert.equal(r.promotionDays[current.date].rows[0].success,1);assert.equal(r.errors.length,2);assert.equal(r.promotionPools[current.date].date,current.date);});
