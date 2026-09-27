import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {renderFeedback} from '../public/promotion-feedback.js';
export const moduleTag='<script type="module" id="promotion-feedback-loader" src="https://travelstocks.github.io/daily-trading-workbench/promotion-feedback.js"></script>';
export function injectFeedback(html,date,day){
 if(day?.date!==date)throw Error('Missing or wrong-date feedback');
 const marker=/<div data-promotion-feedback-date="[^"]+">[\s\S]*?<!-- promotion-feedback-end -->/;
 const block='<div data-promotion-feedback-date="'+date+'">'+renderFeedback(day)+'</div><!-- promotion-feedback-end -->';
 if(marker.test(html))html=html.replace(marker,()=>block);
 else {
  const heading=/<h[23]\b[^>]*>[^<]*(?:连板晋级|连板[^<]*梯队)[^<]*<\/h[23]>/;
  if(!heading.test(html))throw Error('No semantic promotion-ladder heading');
  html=html.replace(heading,m=>m+'\n'+block);
 }
 if(!html.includes('id="promotion-feedback-loader"'))html=html.replace('</body>',moduleTag+'\n</body>');
 return html;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [input,output,date]=process.argv.slice(2);
 if(!input||!output||!/^\d{4}-\d{2}-\d{2}$/.test(date||''))throw Error('Usage: node scripts/render-promotion-feedback.mjs INPUT OUTPUT YYYY-MM-DD');
 const data=JSON.parse(await fs.readFile('public/data/market-context.json','utf8'));
 await fs.writeFile(output,injectFeedback(await fs.readFile(input,'utf8'),date,data.promotionFeedbackDays?.[date]));
 console.log('Embedded dated promotion feedback:',date,output);
}
