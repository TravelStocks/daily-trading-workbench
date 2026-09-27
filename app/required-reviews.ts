import type {Paper} from './model';
import {candidateAnswer,requiredCandidateReview,reviewValueComplete} from './required-candidates';

export const requiredMarketFields=[
 {id:'f3',label:'市场风格与盘面定调（含依据）'},
 {id:'f36',label:'赚钱效应：市场奖励什么（含依据）'},
 {id:'f37',label:'亏钱效应：市场惩罚什么（含依据）'},
];
export function requiredMarketReview(p:Paper){
 const missing=requiredMarketFields.filter(f=>!reviewValueComplete(candidateAnswer(p,f.id)));
 return {id:'decision-0',title:'市场风格与赚钱效应解析',fields:requiredMarketFields,missing,filled:requiredMarketFields.length-missing.length,total:requiredMarketFields.length,complete:missing.length===0};
}
export const requiredDailyReviews=(p:Paper)=>[requiredMarketReview(p),...requiredCandidateReview(p)];
