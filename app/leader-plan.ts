export const stages=['完整预案','竞价','开盘与量能'];
export const outcomes=['符合预期','超预期','不及预期'];
export const leaderChecks=[
 '竞价是否跳空高开？高开后是否下杀试探抛压？',
 '开盘先下杀还是先冲高？上板是首封还是回封？',
 '个股量能关系与题材节奏是否同步？',
 '题材梯队是否正反馈？有无一字板、后排首板助攻？辨识度前排是否普遍正反馈？',
 '连续大单进攻时，最后几单是否达到压单的 1/4？上方压单是否很小？',
 '买点在哪个分时节点？竞价、回封半路还是板上确认？触发、放弃与退出条件是什么？',
];
export const leaderFields=new Map<string,string>([
 ['lpStock','候选个股'],['lpTheme','题材'],['lpRole','题材内地位'],['lpLeader','是否龙头'],['lpOpportunity','非龙头机会类型'],
 ...stages.flatMap((s,i)=>outcomes.map((o,j)=>['lpCase'+i+j,s+' · '+o] as [string,string])),
 ...leaderChecks.map((s,i)=>['lpCheck'+i,s] as [string,string]),
]);
