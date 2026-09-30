import {validate,money,positioning,purposeLabels,styleLabels,tradingLabels,entityLabels,contextNotes,illustrateLoan} from './logic.js';
const $=id=>document.getElementById(id);
export function summaryText(d,routes){
 const answer=v=>({yes:'Yes',no:'No',unsure:'Not sure'}[v]||'Not recorded');
 return ['PAY2DAY | BUSINESS FUNDING EXPLORATION',`Created: ${new Date().toLocaleDateString('en-GB')}`,'Informational comparison. Not an offer, recommendation, eligibility decision or application.',
  '',`Funding target: ${money(d.amount)}`,`Purpose: ${purposeLabels[d.purpose]}`,`Repayment preferences: ${[d.repayment,d.repayment2].filter(Boolean).map(k=>styleLabels[k]).join(' / ')}`,
  `UK business: ${answer(d.uk)}`,`Structure: ${entityLabels[d.entity]}`,`Time trading: ${tradingLabels[d.trading]}`,`Monthly turnover: ${money(d.turnover)}`,`Card payments: ${answer(d.cards)}`,
  ...(d.cards==='yes'?[`Monthly card takings: ${money(d.cardAmount)}`]:[]),`Director / owner personally owns property: ${answer(d.propertyOwner)}`,'',
  ...contextNotes(d).map(n=>n.title+'\n'+n.text),'',...routes.map(r=>[r.name.toUpperCase(),r.status,r.reason,'Repayments: '+r.rhythm,'Consideration: '+r.tradeoff,'Costs to compare: '+r.cost,''].join('\n')),
  'Illustrations are not included in this comparison summary. Actual amounts, costs, fees, terms and guarantees require provider assessment. No credit search or submission has been made.',positioning,'Contact Pay2Day: https://www.pay2day.co.uk/#contact'].join('\n');
}
export function initExplorerTools({getData,getRoutes,isDirty,openFactFind}){
 let panel=0;const form=$('funding-form');
 function show(i,focus=false){panel=i;document.querySelectorAll('[data-explorer-panel]').forEach(el=>el.hidden=Number(el.dataset.explorerPanel)!==i);document.querySelectorAll('[data-explorer-step]').forEach(el=>el.setAttribute('aria-current',Number(el.dataset.explorerStep)===i?'step':'false'));$('explorer-back').hidden=i===0;$('explorer-next').hidden=i===2;$('explore-submit').hidden=i!==2;if(focus){const heading=document.querySelector(`[data-explorer-panel="${i}"] h3`);heading.focus();form.scrollIntoView({block:'start',behavior:'smooth'});}}
 function checkPanel(){const {errors}=validate(Object.fromEntries(new FormData(form)));const local=errors.filter(e=>document.querySelector(`[data-explorer-panel="${panel}"]`).contains($(e.field)));if(!local.length){$('form-errors').hidden=true;return true;}const box=$('form-errors');box.textContent=local.map(e=>e.message).join(' ');box.hidden=false;$(local[0].field).focus();return false;}
 $('explorer-next').addEventListener('click',()=>{if(checkPanel())show(panel+1,true);});$('explorer-back').addEventListener('click',()=>show(panel-1,true));
 document.querySelectorAll('[data-explorer-step]').forEach(el=>el.addEventListener('click',()=>{const to=Number(el.dataset.explorerStep);if(to<=panel||checkPanel())show(to,true);}));
 document.addEventListener('explorer-invalid',e=>{const target=$(e.detail)?.closest('[data-explorer-panel]');if(target)show(Number(target.dataset.explorerPanel));});
 $('repayment').addEventListener('change',()=>{const unsure=['unsure','all'].includes($('repayment').value);$('repayment2').disabled=unsure;if(unsure||$('repayment2').value===$('repayment').value)$('repayment2').value='';for(const option of $('repayment2').options)option.disabled=option.value!==''&&option.value===$('repayment').value;});
 $('journey-mode').addEventListener('change',()=>{$('agent-help').hidden=$('journey-mode').value==='self';$('next-client').hidden=$('journey-mode').value==='self';});
 $('next-client').addEventListener('click',()=>{if(window.confirm('Start the next client? This clears every explorer and fact-find entry, including contact choices. Nothing has been saved.'))location.replace(location.pathname);});
 $('reset').addEventListener('click',()=>{show(0);$('repayment2').disabled=false;for(const o of $('repayment2').options)o.disabled=false;$('illustration-rate').value='';$('illustration-result').textContent='';$('share-text').value='';$('print-output').textContent='';$('share-dialog').close();});

 function getSummary(){const d=getData();return d&&!isDirty()?summaryText(d,getRoutes()):null;}
 $('share-results').addEventListener('click',()=>{const text=getSummary();if(!text)return;$('share-text').value=text;$('share-status').textContent='';$('native-share').hidden=!navigator.share;$('share-dialog').showModal();});
 $('close-share').addEventListener('click',()=>$('share-dialog').close());
 $('copy-summary').addEventListener('click',async()=>{if(!getSummary())return;try{await navigator.clipboard.writeText($('share-text').value);$('share-status').textContent='Summary copied. Paste it into your email or message to the client.';}catch{$('share-text').focus();$('share-text').select();$('share-status').textContent='Select and copy the summary above using your device’s copy command.';}});
 $('native-share').addEventListener('click',async()=>{if(!getSummary())return;try{await navigator.share({title:'Pay2Day funding exploration',text:$('share-text').value});$('share-status').textContent='The share sheet has closed.';}catch(e){$('share-status').textContent=e.name==='AbortError'?'Sharing cancelled.':'Sharing is unavailable here. Copy or download the summary instead.';}});
 $('download').addEventListener('click',()=>{const text=getSummary();if(!text)return;const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='Pay2Day-funding-comparison.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('share-status').textContent='Summary downloaded.';});
 $('print-summary').addEventListener('click',()=>{const text=getSummary();if(!text)return;$('print-output').textContent=text;$('share-dialog').close();window.print();});
 function invalidateIllustration(){$('illustration-result').textContent='';}
 form.addEventListener('input',invalidateIllustration);form.addEventListener('change',invalidateIllustration);
 for(const id of ['illustration-rate','illustration-months'])$(id).addEventListener('input',invalidateIllustration);
 $('calculate-illustration').addEventListener('click',()=>{const d=getData();if(!d||isDirty())return;const rate=$('illustration-rate').value,months=$('illustration-months').value;const result=rate.trim()!==''&&months.trim()!==''?illustrateLoan(d.amount,Number(rate),Number(months)):null;
  if(!result){$('illustration-result').textContent='Enter an example interest rate from 0% to 100% and a whole-number term from 1 to 120 months.';return;}
  $('illustration-result').textContent=`Illustration only: ${money(d.amount)} over ${months} months at your example ${rate}% annual interest rate → ${money(result.monthly)} per month; ${money(result.total)} total repayable, including ${money(result.interest)} interest. Fees excluded. No funding availability is implied.`;
 });
 show(0);
}
