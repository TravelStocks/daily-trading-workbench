// Public market observations only. Never reads or publishes personal answers.
export const instruments=[
 ['US','100.SPX','标普500','指数'],['US','100.NDX','纳斯达克综合','指数'],['US','100.DJIA','道琼斯','指数'],
 ['US','105.NVDA','英伟达','AI / 半导体'],['US','105.AVGO','博通','AI / 半导体'],['US','105.AMD','AMD','AI / 半导体'],['US','105.MU','美光','存储'],['US','105.MSFT','微软','软件 / 云'],['US','105.META','Meta','互联网'],['US','105.TSLA','特斯拉','新能源车'],
 ['KR','100.KS11','KOSPI','指数'],['KR','005930','三星电子','存储 / 半导体'],['KR','000660','SK海力士','存储 / 半导体'],['KR','042700','韩美半导体','半导体设备'],['KR','403870','HPSP','半导体设备'],
 ['HK','100.HSI','恒生指数','指数'],['HK','124.HSTECH','恒生科技','指数'],['HK','116.00700','腾讯控股','互联网'],['HK','116.09988','阿里巴巴','互联网'],['HK','116.03690','美团','互联网'],['HK','116.01810','小米集团','消费电子 / 汽车'],['HK','116.00981','中芯国际','半导体'],['HK','116.01347','华虹半导体','半导体'],['HK','116.01801','信达生物','创新药'],['HK','116.02269','药明生物','医药服务'],['JP','100.N225','日经225','指数']
];
export const boards=[['885959','PCB概念',['PCB']],['886020','PET铜箔',['复合铜箔','铜箔']],['885756','芯片概念',['芯片']],['881129','通信设备',['通信']],['881162','通信服务',['通信']],['881164','文化传媒',['文化传媒','传媒']],['886108','AI应用',['AI应用']],['885739','股权转让（并购重组）',['并购重组']],['881153','房地产',['房地产']],['881140','化学制药',['医药','医疗']],['881141','中药',['医药','医疗']],['881142','生物制品',['医药','医疗']],['881143','医药商业',['医药','医疗']]];
export function completed(date,region,now=new Date()){
 // Conservative close + 30 minutes; US uses actual NY date and DST automatically.
 const zone=region==='US'?'America/New_York':region==='KR'?'Asia/Seoul':region==='JP'?'Asia/Tokyo':'Asia/Hong_Kong';
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(x=>[x.type,x.value]));
 const today=`${parts.year}-${parts.month}-${parts.day}`,minutes=Number(parts.hour)*60+Number(parts.minute);
 return date<today||(date===today&&minutes>=(region==='US'||region==='HK'?990:960));
}
export function parseKlines(data,region,now){
 if(!data?.code||!Array.isArray(data.klines))throw Error('Missing quote history');
 return data.klines.map(s=>s.split(',')).filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r[0])&&r[2]!==''&&r[8]!==''&&Number.isFinite(+r[2])&&Number.isFinite(+r[8])&&completed(r[0],region,now)).map(r=>({date:r[0],close:+r[2],pct:+r[8]}));
}
export function parseNaver(text,now){
 const rows=[...text.matchAll(/\[\s*"\d{8}"[^\]]*\]/g)].map(m=>JSON.parse(m[0])).sort((a,b)=>a[0].localeCompare(b[0]));
 if(!rows.length)throw Error('Missing Naver history');
 return rows.slice(1).map((r,i)=>({date:r[0].replace(/(\d{4})(\d{2})(\d{2})/,'$1-$2-$3'),close:r[4],pct:(r[4]/rows[i][4]-1)*100})).filter(r=>r.close>0&&Number.isFinite(r.pct)&&completed(r.date,'KR',now));
}
export function parseBoard(text){
 const j=JSON.parse(text.slice(text.indexOf('(')+1,text.lastIndexOf(')')));
 if(typeof j.data!=='string')throw Error('Missing board history');
 return Object.fromEntries(j.data.split(';').map(s=>s.split(',')).filter(r=>/^\d{8}$/.test(r[0])&&r[6]!==''&&Number.isFinite(+r[6])).map(r=>[r[0].replace(/(\d{4})(\d{2})(\d{2})/,'$1-$2-$3'),+r[6]]));
}
