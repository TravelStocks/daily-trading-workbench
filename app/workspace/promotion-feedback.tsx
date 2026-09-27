import {useMarketContext} from './market-context';
import {renderFeedback} from '../../public/promotion-feedback.js';

export default function PromotionFeedback({date}:{date:string}){
 const {data}=useMarketContext();
 const day=data?.promotionFeedbackDays?.[date];
 return <div dangerouslySetInnerHTML={{__html:renderFeedback(day?.date===date?day:null)}}/>;
}
