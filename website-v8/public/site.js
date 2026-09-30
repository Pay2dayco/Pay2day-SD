import {monthlyIllustration,advanceIllustration,fixedDebitIllustration} from './calculators.js';
import {setLeadContext} from './lead-capture.js';
import {money} from './logic.js';
const $=id=>document.getElementById(id);
const menu=document.querySelector('.menu-toggle'),nav=$('site-nav');
function closeMenu(){nav?.classList.remove('open');menu?.setAttribute('aria-expanded','false');}
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('open',open);});
nav?.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav?.classList.contains('open')){closeMenu();menu.focus();}});
const output=$('calc-output');let active='loan';
const row=(label,value)=>`<div><dt>${label}</dt><dd>${value}</dd></div>`;
const months=n=>n>120?'More than 120':n.toLocaleString('en-GB',{maximumFractionDigits:1});
function emptyOutput(){setLeadContext(null);if(output)output.innerHTML='<h3>Your figures,<br>clearly explained.</h3><p>Enter your assumptions and calculate to see the result.</p>';}
function setTab(name){
 active=name;
 for(const n of ['loan','advance','fixed']){$('tab-'+n).setAttribute('aria-selected',String(name===n));$('tab-'+n).tabIndex=name===n?0:-1;$('calc-'+n).hidden=name!==n;}
 emptyOutput();
 $('calc-assumptions').textContent=name==='fixed'?'Illustration only. Fixed cost is added to funding; it is not an APR. Daily collections count Monday–Friday, including bank holidays in this example. Weekly and monthly collections use the selected start date and term. Actual schedules, holidays and fees depend on lender terms and approval.':name==='loan'?'Illustration only, not a quote. Assumes a constant nominal annual rate divided by 12, equal monthly repayments and upfront fees as entered. This is not an APR calculation. Other charges and rounding may change actual payments.':'Illustration only, not a quote. Assumes steady eligible card sales and the same collection percentage, with all funding costs entered. Collections follow actual sales, so duration varies. This is not a fixed term or an APR. Check any minimum payments, fees and other obligations with the provider.';
}
for(const n of ['loan','advance','fixed'])$('tab-'+n)?.addEventListener('click',()=>setTab(n));
document.querySelector('.calc-tabs')?.addEventListener('keydown',e=>{if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();const tabs=['loan','advance','fixed'];const n=e.key==='Home'?tabs[0]:e.key==='End'?tabs.at(-1):tabs[(tabs.indexOf(active)+(e.key==='ArrowRight'?1:2))%3];setTab(n);$('tab-'+n).focus();}});
for(const id of ['loan-calculator','advance-calculator','fixed-calculator'])$(id)?.addEventListener('input',emptyOutput);
$('calc-amount-range')?.addEventListener('input',()=>{$('calc-amount').value=$('calc-amount-range').value;emptyOutput();});
$('calc-amount')?.addEventListener('input',()=>{$('calc-amount-range').value=Math.max(1000,Math.min(250000,Number($('calc-amount').value)));});
function showError(form,text){output.innerHTML=`<p class="calc-error">${text}</p>`;const first=[...form.elements].find(e=>e.checkValidity&&!e.checkValidity());first?.setAttribute('aria-invalid','true');first?.focus();}
$('loan-calculator')?.addEventListener('submit',e=>{
 e.preventDefault();e.target.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
 const r=monthlyIllustration({amount:$('calc-amount').value,rate:$('calc-rate').value,months:$('calc-months').value,fee:$('calc-fee').value});
 if(!r){showError(e.target,'Enter a positive amount, a rate from 0% to 100%, a whole-number term from 1 to 120 months and non-negative upfront fees.');return;}
 output.innerHTML=`<p>Illustrative monthly repayment</p><strong class="calc-value">${money(r.monthly)}</strong><p>for ${r.months} months</p><dl>${row('Amount borrowed',money(r.principal))}${row('Total interest',money(r.interest))}${row('Upfront fees',money(r.fee))}${row('Total cost of borrowing',money(r.cost))}${row('Total paid, including fees',money(r.total))}</dl>`;
});
$('advance-calculator')?.addEventListener('submit',e=>{
 e.preventDefault();e.target.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
 const r=advanceIllustration({amount:$('advance-amount').value,cost:$('advance-cost').value,sales:$('advance-sales').value,share:$('advance-share').value});
 if(!r){showError(e.target,'Enter a positive advance and business-sales amount, a non-negative funding cost, and a collection percentage above 0% and up to 100%.');return;}
 output.innerHTML=`<p>Illustrative monthly collection</p><strong class="calc-value">${money(r.monthly)}</strong><p>at your example level of sales</p><dl>${row('Total funding cost',money(r.cost))}${row('Total to collect',money(r.total))}${row('Approximate duration',months(r.months)+' months')}${row('With 20% lower sales',months(r.slowerMonths)+' months')}${row('With 20% higher sales',months(r.fasterMonths)+' months')}</dl>`;
});
$('use-calc-amount')?.addEventListener('click',e=>{
 const amount=$(active==='loan'?'calc-amount':active==='fixed'?'fixed-amount':'advance-amount').value;
 if(!$('amount'))return;e.preventDefault();
 if(!amount||!Number.isFinite(Number(amount))||Number(amount)<=0){output.textContent='Enter a positive funding amount first.';return;}
 document.body.classList.add('calculator-reveal');$('amount').value=amount;$('amount').dispatchEvent(new Event('input',{bubbles:true}));
 document.querySelector('[data-explorer-step="0"]')?.click();$('explorer').scrollIntoView({behavior:'smooth',block:'start'});$('amount').focus({preventScroll:true});
});

if($('fixed-date'))$('fixed-date').value=new Date().toISOString().slice(0,10);
$('fixed-calculator')?.addEventListener('submit',e=>{e.preventDefault();const r=fixedDebitIllustration({amount:$('fixed-amount').value,cost:$('fixed-cost').value,months:$('fixed-months').value,frequency:$('fixed-frequency').value,firstDate:$('fixed-date').value});if(!r){showError(e.target,'Enter the funding amount, fixed cost, a whole-number term from 1 to 120 months and a valid collection date.');return;}output.innerHTML=`<p>Illustrative ${r.frequency} collection</p><strong class="calc-value">${money(r.payment)}</strong><p>${r.count} collections over ${r.months} months</p><dl>${row('Funding amount',money(r.principal))}${row('Fixed borrowing cost',money(r.cost))}${row('Total repayment',money(r.total))}${row('Final collection (rounding)',money(r.finalPayment))}${row('First collection',r.first)}${row('Last collection',r.last)}</dl>`;setLeadContext({funding:{amount:r.principal,calculator:'fixed',frequency:r.frequency,total:r.total}});});
for(const id of ['loan-calculator','advance-calculator'])$(id)?.addEventListener('submit',()=>{const amount=$(id==='loan-calculator'?'calc-amount':'advance-amount').value;if(!output.querySelector('.calc-error'))setLeadContext({funding:{amount:Number(amount),calculator:id}});});
