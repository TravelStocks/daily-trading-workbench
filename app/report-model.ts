import {fields,type Paper} from './model';
import {topFive,type Archive, type SourceSection} from './recap-source';
export type ReportSection={title:string;summary:string;facts:[string,string][];table?:{headers:string[];rows:string[][]};source?:SourceSection;missing:boolean};
export type DailyReport={date:string;title:string;sections:ReportSection[];sourceUrl?:string;sourceTitle?:string;pending:string[];answered:number;submitted:boolean;appendix:[string,string][]};
const text=(p:Paper,key:string)=>{const v=p.answers[key];return Array.isArray(v)?v.join('、'):v||''};
export function buildReport(date:string,p:Paper,archive:Archive):DailyReport{
 const a=(id:string)=>text(p,id),first=(...ids:string[])=>ids.map(a).find(Boolean)||'';
 const sourceDay=archive.days.find(d=>d.date===date),source=(pattern:RegExp)=>sourceDay?.sections?.find(s=>pattern.test(s.title));
 const facts=(ids:string[])=>ids.map(id=>[fields.get(id)?.label||id,a(id)] as [string,string]).filter(([,v])=>v);
 const top=topFive(archive.points,date),days=[...new Set(archive.points.map(x=>x.date))].filter(d=>d<=date).sort().slice(-4);
 const pointMap=new Map(archive.points.map(x=>[x.date+'|'+x.name,x]));
 const candidates=[0,1,2,3].filter(i=>a(`f66_${i}_1`));
 const candidateRows=candidates.map(i=>[a(`f66_${i}_1`),a(`f66_${i}_2`),a(`f66_${i}_3`),a(`f66_${i}_4`)].map(v=>v||'待补充'));
 const qualityRows=candidates.map(i=>[a(`f66_${i}_1`),a(`f66_${i}_3`),a(`f67_2_${i+1}`),a(`f67_0_${i+1}`),a(`f67_5_${i+1}`),a(`f67_4_${i+1}`),'', '', '', '',a(['f80','f84','f88','f92'][i])].map(v=>v||'待补充'));
 const join=(parts:string[])=>parts.filter(Boolean).join('；')+'。';
 const raw:Omit<ReportSection,'missing'>[]=[
  {title:'一、复盘总纲',summary:join([first('f3'),first('f143','f5')&&'收盘周期：'+first('f143','f5'),first('f60','f148')&&'主线：'+first('f60','f148'),first('f175','f38')&&'主模式：'+first('f175','f38'),a('f1')&&'实际总仓位：'+a('f1')]),facts:facts(['f172','f173','f174','f176','f177','f178','f179','f180']),source:source(/复盘总纲|整体盘面|情绪定调/)},
  {title:'二、市场风格与赚钱效应解析',summary:join([first('f146','f36','f25')&&'市场奖励：'+first('f146','f36','f25'),first('f147','f37','f28')&&'亏钱集中在：'+first('f147','f37','f28'),a('f39')&&'模式选择依据：'+a('f39')]),facts:facts(['f6','f7','f8','f9','f12','f13','f14','f15','f16','f17','f18','f20','f21','f22','f26','f27','f35']),source:source(/市场风格|赚钱效应/)},
  {title:'三、近4日板块强度+次日节奏预测表',summary:top.length?`${date} 原始强度前 ${top.length} 名依次为：${top.map(s=>s.name+'（'+s.strength+' / '+(s.state||'节奏未标注')+'）').join('、')}。`:'',facts:[],table:top.length?{headers:['题材',...days,'次日节奏预测','原文核心判断'],rows:top.map(s=>[s.name,...days.map(d=>pointMap.get(d+'|'+s.name)?.raw||'未提供'),s.next||'未提供',s.judgment||'未提供'])}:undefined,source:source(/板块强度|题材强度/)},
  {title:'四、今日操作结果+核心失误+核心反思',summary:join([a('f135')&&'实际执行：'+a('f135'),a('f164')&&'最大错误：'+a('f164'),a('f165')&&'主要问题：'+a('f165'),first('f171','f186')&&'下一次修正：'+first('f171','f186')]),facts:facts(['f1','f2','f133','f134','f136','f137','f138','f139','f140','f141','f142','f143','f144','f145','f150','f151','f152','f156','f157','f158','f162','f163']),source:source(/今日操作结果|今日操作复盘/)},
  {title:'五、操作与情绪复盘（KISS模型）',summary:join([first('f171','f186')&&'Improve · 首要改进：'+first('f171','f186'),a('f140')&&'Stop · 已记录的模式外交易：'+a('f140')]),facts:[...facts(['f181','f182','f183','f184','f185']),...(p.review?.body?[['补充复盘与反思',p.review.body] as [string,string]]:[])],source:source(/KISS|操作与情绪/)},
  {title:'六、各主线板块详细解析',summary:join([a('f60')&&'主线：'+a('f60'),a('f61')&&'支线：'+a('f61'),[a('f62'),a('f63'),a('f64')].filter(Boolean).length?'主线成立依据：'+[a('f62'),a('f63'),a('f64')].filter(Boolean).join('；'):'']),facts:[...['f40','f50','f55'].flatMap((name,i)=>a(name)?[[a(name)+' · 逻辑',a(['f41','f51','f56'][i])],[a(name)+' · 节奏 / 持续性',[a(['f46','f53','f58'][i]),a(['f49','f54','f59'][i])].filter(Boolean).join(' / ')]] as [string,string][]:[]),...facts(['f43','f44','f45','f47','f48','f65'])].filter(([,v])=>v),source:source(/各主线|各板块|题材详细/)},
  {title:'七、事件催化时间线',summary:'',facts:[],source:source(/事件催化/)},
  {title:'八、异动监管与龙虎榜+人气榜情况',summary:'',facts:[],source:source(/异动监管|龙虎榜|人气榜情况/)},
  {title:'九、跌停与炸板情况',summary:join([a('f24')&&'主要市场风险：'+a('f24'),a('f34')&&'典型错误交易亏损幅度：'+a('f34')]),facts:facts(['f29','f30','f31','f32','f33','f131','f132']),source:source(/跌停|炸板情况/)},
  {title:'十、大盘明日预期节奏与操作适配',summary:p.review?.next||'',facts:facts(['f166','f167','f168','f169','f116','f117','f120','f123','f126','f127','f130']),source:source(/明日作战推演|大盘明日|明日.*操作计划/)},
  {title:'十一、核心关键票汇总+明日个股预案',summary:join([first('f170','f149','f74')&&'当前核心：'+first('f170','f149','f74'),a('f75')&&'第二核心：'+a('f75'),a('f76')&&'竞争状态：'+a('f76')]),facts:facts(['f100','f101','f102','f103','f106','f107','f110','f111','f112_0_1','f112_1_1','f112_2_1','f113','f114']),table:candidateRows.length?{headers:['标的','所属题材','板数','核心逻辑'],rows:candidateRows}:undefined,source:source(/核心关键票|明日作战推演/)},
  {title:'十二、明日核心票弱转强/转强确定+板块预期细化表',summary:join([a('f110')&&'我的转强确认定义：'+a('f110'),a('f111')&&'确认后的买点计划：'+a('f111')]),facts:facts(['f104_0_rating','f104_0_6','f104_1_rating','f104_1_6','f104_2_rating','f104_2_6','f105','f108','f109']),table:candidates.length?{headers:['核心票','量能预期','开盘预期','连板 / 形态预期','个股转强确认','板块预期'],rows:candidates.map(i=>[a(`f66_${i}_1`),'待补充','待补充','待补充','待补充',a(`f66_${i}_2`)||'待补充'])}:undefined,source:source(/预期细化|明日作战推演/)},
  {title:'十三、龙头预备票',summary:join([a('f99')&&'综合量价最有资格：'+a('f99'),a('f70')&&'最主动：'+a('f70'),a('f71')&&'最抗跌：'+a('f71'),a('f72')&&'回流最快：'+a('f72'),a('f73')&&'最能带动板块：'+a('f73')]),facts:facts(['f68','f69','f93','f94','f95','f96','f97','f98']),table:qualityRows.length?{headers:['标的','身位','领涨性','抗跌性','市场性','价值性','五维结论','100%异动监管距离','题材梯队完整性','题材持续性','筹码结构 / 量能备注'],rows:qualityRows}:undefined,source:source(/龙头预备票/)}
 ];
 // Keep source-only chapters (oral notes, operation plans, etc.) in the complete report.
 const usedSources=new Set(raw.map(s=>s.source?.title).filter(Boolean));
 for(const extra of sourceDay?.sections||[])if(!usedSources.has(extra.title))raw.push({title:extra.title,summary:'',facts:[],source:extra});
 const sections=raw.map(s=>({...s,summary:s.summary==='。'?'':s.summary,missing:(!s.summary||s.summary==='。')&&!s.facts.length&&!s.table?.rows.length&&!s.source?.text}));
 const pending=sections.filter(s=>s.missing).map(s=>s.title);
 if(!a('f143'))pending.unshift('盘后情绪节点尚未填写');
 if(!p.review?.next)pending.push('个人明日预案尚未填写');
 if(candidates.length)pending.push('个股量能、开盘、形态预期及龙头核验的待补充项，请结合原文核对');
 return {date,title:date+' 每日市场判断与交易复盘',sections,sourceUrl:sourceDay?.url,sourceTitle:sourceDay?.title,pending,answered:Object.values(p.answers).filter(v=>Array.isArray(v)?v.length:!!v).length,submitted:p.submitted,appendix:Object.keys(p.answers).filter(k=>a(k)).map(k=>[(fields.get(k)?.label||k)+' ['+k+']',a(k)])};
}
export function reportMarkdown(report:DailyReport){return '# '+report.title+'\n\n'+(report.pending.length?'待补充报告':'已汇总报告')+' · 来源：个人考卷与同日复盘资料\n\n'+(report.sourceUrl?'原文：'+report.sourceUrl+'\n\n':'')+report.sections.map(s=>'## '+s.title+'\n\n'+(s.summary?s.summary+'\n\n':'')+s.facts.map(([k,v])=>`- ${k}：${v}`).join('\n')+(s.table?'\n\n| '+s.table.headers.join(' | ')+' |\n| '+s.table.headers.map(()=>'---').join(' | ')+' |\n'+s.table.rows.map(r=>'| '+r.map(v=>v.replaceAll('|','／').replaceAll('\n',' ')).join(' | ')+' |').join('\n'):'')+(s.source?'\n\n### 同日复盘资料 · '+s.source.title+'\n\n'+s.source.text:'')+(s.missing?'\n\n待补充：考卷与当天复盘均未提供该模块资料。':'')).join('\n\n')+(report.pending.length?'\n\n## 待补充与核对\n\n'+report.pending.map(s=>'- '+s).join('\n'):'')+'\n\n## 完整答卷底稿（全部已填字段）\n\n'+report.appendix.map(([k,v])=>'- '+k+'：'+v).join('\n')}
