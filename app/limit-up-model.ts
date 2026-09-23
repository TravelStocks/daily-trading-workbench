// Original model: abchaoming1/limit-up-calculators-skill, scripts/calculate.js.
// Inputs use percentage points (5 means 5%). Only the opening risk table is clamped.
export const openingRows=[
 [10,5,5,5],[9,4.2,4.8,5.8],[8,3.6,4.4,6.4],[7,3.2,3.8,6.8],[6,2.6,3.4,7.4],
 [5,1.6,3.4,8.4],[4,.8,3.2,9.2],[3,0,3,10],[2,-.4,2.4,10.4],[1,-1.2,2.2,11.2],
 [0,-1.6,1.6,11.6],[-1,-2,1,12],[-2,-2.6,.6,12.6],
];
const clamp=(n:number,lo:number,hi:number)=>Math.min(Math.max(n,lo),hi);
export const inputNumber=(value:string)=>value.trim()===''?undefined:Number(value);
function validPrice(price?:number){if(price!==undefined&&(!Number.isFinite(price)||price<=0))throw Error('昨日收盘价必须大于 0。')}
export function openingConditions(open:number,prevClose?:number){
 if(!Number.isFinite(open))throw Error('请输入有效的开盘涨幅。');validPrice(prevClose);
 const x=clamp(open,-2,10),sorted=[...openingRows].reverse();
 const hi=sorted.findIndex(r=>r[0]>=x),a=sorted[Math.max(0,hi-1)],b=sorted[hi],t=a[0]===b[0]?0:(x-a[0])/(b[0]-a[0]);
 const minLow=a[1]+(b[1]-a[1])*t,openToLow=a[2]+(b[2]-a[2])*t,amp=a[3]+(b[3]-a[3])*t;
 return {minLow,openToLow,amp,clamped:x!==open,clampedOpen:x,protectivePrice:prevClose===undefined?undefined:prevClose*(1+minLow/100)};
}
export function profitModel(open:number,high:number,pullback?:number,prevClose?:number){
 const opening=openingConditions(open,prevClose);
 if(!Number.isFinite(high)||high<=open)throw Error('第一次冲高点必须高于开盘涨幅。');
 if(pullback!==undefined&&(!Number.isFinite(pullback)||pullback>high))throw Error('第一次回落点不能高于第一次冲高点。');
 const impulse=high-open,alphaSafe=clamp(.45-.015*Math.max(open,0),.28,.45),alphaHard=clamp(.62-.012*Math.max(open,0),.45,.62),buffer=clamp(.15*impulse,.3,1.2);
 const safe=high-alphaSafe*impulse,hard=Math.max(high-alphaHard*impulse,open-buffer,opening.minLow);
 return {impulse,safe,hard,opening,status:pullback===undefined?undefined:pullback>=safe?'强承接':pullback>=hard?'偏弱观察':'不能接受',safePrice:prevClose===undefined?undefined:prevClose*(1+safe/100),hardPrice:prevClose===undefined?undefined:prevClose*(1+hard/100)};
}
