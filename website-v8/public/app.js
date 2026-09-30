import {setLeadContext} from './lead-capture.js';
import {initExplorerTools,summaryText} from './explorer-tools.js';
import {mapExplorerToFactFind} from './handover.js';
import {routes,assess,validate,contextNotes,money,positioning,purposeLabels,styleLabels,tradingLabels,entityLabels} from './logic.js';
const originalTitle=document.title;const $=id=>document.getElementById(id);const form=$('funding-form');let current=null;let dirty=false;let selected=new Set();let shown=assess(null);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={building:'<path d="M3 21h18M5 21V5l14-3v19M9 8h2m3-1h2M9 12h2m3-1h2M9 16h2m3-1h2"/>',bridge:'<path d="M2 19h20M5 19V5m14 14V5M2 9c5 7 15 7 20 0M8 13v6m4-5v5m4-6v6"/>',wave:'<path d="M2 13c3-10 5 10 9 0s6 8 11-2M2 19h20"/>',calendar:'<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 10h16M8 3v4m8-4v4M8 14h3m3 0h2m-8 4h3"/>',repeat:'<path d="M4 8h15l-4-4m5 12H5l4 4M4 8v4m16 4v-4"/>',loop:'<path d="M16 5a8 8 0 10 4 7M16 2v5h5"/><path d="M8 12h8m-4-4v8"/>',terminal:'<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M9 6h6v5H9zM9 15h1m4 0h1m-6 3h1m4 0h1"/>'};
function renderRoutes(){const ready=!!current&&!dirty;$('explorer').classList.toggle('has-results',!!current);$('share-results').disabled=!ready;$('illustration-panel').hidden=!ready||current.uk!=='yes'||current.purpose==='personal';$('callback-panel').hidden=!ready||current.uk!=='yes'||current.purpose==='personal';if(!ready)$('illustration-result').textContent='';$('handover-panel').hidden=!current||dirty||current.uk!=='yes'||current.purpose==='personal';shown=assess(dirty?null:current);selected=new Set([...selected].filter(id=>shown.some(route=>route.id===id)));document.querySelectorAll('.route-count strong').forEach(el=>el.textContent=String(shown.length).padStart(2,'0'));setLeadContext(ready?{funding:current,summary:summaryText(current,shown)}:null);$('route-list').innerHTML=shown.map(r=>`<article class="route-card ${selected.has(r.id)?'selected':''}" data-route="${r.id}"><div class="route-main"><div class="route-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${paths[r.icon]}</svg></div><div>${r.status?`<span class="fit-tag ${r.tone}">${r.status}</span>`:''}<div class="route-name"><h3>${r.name}</h3><span class="tag">${r.tag}</span></div><p class="route-summary">${r.summary}</p>${r.reason?`<p class="route-reason">${escape(r.reason)}</p>`:''}</div><label class="select-route"><input type="checkbox" data-select="${r.id}" aria-label="Select ${r.name} for comparison" ${selected.has(r.id)?'checked':''}><span>Compare</span></label></div><div class="route-bottom"><span class="rhythm">${r.rhythm}</span><button class="details-toggle" type="button" data-detail="${r.id}" aria-expanded="false" aria-controls="detail-${r.id}">Details <span aria-hidden="true">+</span></button></div><div class="route-detail" id="detail-${r.id}" hidden><p><strong>How it works</strong><br>${r.mechanics}</p><p><strong>What to weigh up</strong><br>${r.tradeoff}</p><p><strong>What needs checking</strong><br>${r.needs}</p><p><strong>Costs to compare</strong><br>${r.cost}</p><p><strong>Where routes overlap</strong><br>${r.overlap}</p></div></article>`).join('');updateSelection();}
function updateSelection(){document.querySelectorAll('[data-select]').forEach(el=>{el.checked=selected.has(el.dataset.select);el.disabled=selected.size>=3&&!el.checked;el.closest('.route-card').classList.toggle('selected',el.checked)});$('selected-count').textContent=`${selected.size} route${selected.size===1?'':'s'} selected`;$('compare').disabled=selected.size<2;}
function cardVisibility(){const property=$('propertyFinance').checked;$('property-explorer-fields').hidden=!property;for(const id of ['propertyType','propertyOccupied']){$(id).disabled=!property;$(id).required=property;if(!property)$(id).value='';}const show=$('cards').value==='yes';$('card-fields').hidden=!show;for(const id of ['cardAmount','terminal']){$(id).disabled=!show;$(id).required=show;if(!show)$(id).value='';}}
function markDirty(){if(!current||dirty)return;dirty=true;$('dirty-notice').hidden=false;$('context').hidden=true;$('results-title').textContent='Update your comparison';$('results-description').textContent='Your previous comparison has been cleared while you edit. General route information is shown below.';$('results-eyebrow').textContent='DETAILS CHANGED';$('download').disabled=true;$('comparison-caption').textContent='General information • Update to compare your details';renderRoutes();$('live-status').textContent='Details changed. Update the comparison to use your new entries.';}
form.addEventListener('input',markDirty);form.addEventListener('change',()=>{cardVisibility();markDirty();});
form.addEventListener('submit',e=>{e.preventDefault();const raw=Object.fromEntries(new FormData(form));const {data,errors}=validate(raw);form.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
 if(errors.length){$('form-errors').hidden=false;$('form-errors').innerHTML='<strong>Check these details</strong><ul>'+errors.map(e=>`<li>${escape(e.message)}</li>`).join('')+'</ul>';document.dispatchEvent(new CustomEvent('explorer-invalid',{detail:errors[0].field}));errors.forEach(e=>$(e.field).setAttribute('aria-invalid','true'));$(errors[0].field).focus();return;}
 $('form-errors').hidden=true;current=data;dirty=false;$('dirty-notice').hidden=true;$('download').disabled=false;const outside=data.uk==='no'||data.purpose==='personal';const scope=!['limited','llp'].includes(data.entity);const early=['pre','early'].includes(data.trading);
 $('results-eyebrow').textContent=outside?'UK BUSINESS FINANCE ONLY':'YOUR FUNDING EXPLORATION';$('results-title').textContent=outside?'General route information':scope?'Let’s check the scope first':early?'Routes to understand first':'A clearer view of your routes';$('results-description').textContent=outside?'No personalised suitability comparison is available for this request.':scope||early?'Review the differences below. The highlighted checks need to be resolved before any route can be considered available.':'Your initial comparison. Any ‘may be eligible’ label is subject to lender underwriting and approval, not a funding decision.';
 const ratio=data.turnover>0?(data.amount/data.turnover).toLocaleString('en-GB',{maximumFractionDigits:2}):null;
 $('context').hidden=false;$('context').innerHTML=(outside?'':`<div class="context-summary"><h3>${money(data.amount)} <span>for ${escape(purposeLabels[data.purpose].toLowerCase())}</span></h3><p>${escape(tradingLabels[data.trading])} trading · ${money(data.turnover)} monthly turnover${data.cards==='yes'?` · ${money(data.cardAmount)} card takings`:''}</p><p>${ratio?`Funding target equals about <strong>${ratio}× monthly turnover</strong>. This is context, not an affordability test or provider limit.`:'No revenue-based context is available before trading begins.'}</p></div>`)+contextNotes(data).map(n=>`<div class="scope-notice"><strong>${n.title}</strong><p>${n.text}</p></div>`).join('');
 $('comparison-caption').textContent=outside||scope||early?'Informational overview • Review checks below':'Subject to lender underwriting and approval';renderRoutes();$('live-status').textContent='Comparison updated.';$('results-title').focus();$('results-title').scrollIntoView({behavior:'smooth',block:'start'});
});
$('route-list').addEventListener('change',e=>{const id=e.target.dataset.select;if(!id)return;if(e.target.checked&&selected.size<3)selected.add(id);else selected.delete(id);updateSelection();$('live-status').textContent=`${selected.size} routes selected. ${selected.size===3?'Maximum of three. Deselect one to choose another.':''}`;});
$('route-list').addEventListener('click',e=>{const button=e.target.closest('[data-detail]');if(!button)return;const open=button.getAttribute('aria-expanded')==='true';button.setAttribute('aria-expanded',String(!open));$('detail-'+button.dataset.detail).hidden=open;button.querySelector('span').textContent=open?'+':'−';});
$('reset').addEventListener('click',()=>{form.reset();cardVisibility();current=null;dirty=false;selected.clear();$('form-errors').hidden=true;form.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));$('dirty-notice').hidden=true;$('context').hidden=true;$('context').innerHTML='';$('download').disabled=true;$('results-eyebrow').textContent='GET TO KNOW YOUR OPTIONS';$('results-title').textContent='Your funding options, explained.';$('results-description').textContent='Start with an overview, then enter your details to see which features align with your business.';$('comparison-caption').textContent='General information • No rates or offers';renderRoutes();$('live-status').textContent='All entries and selections cleared.';$('amount').focus();});
$('compare').addEventListener('click',()=>{const chosen=shown.filter(r=>selected.has(r.id));const rows=[...(current&&!dirty?[['Initial screening','status'],['Context from your entries','reason']]:[]),['Repayment style','rhythm'],['How it works','mechanics'],['Main consideration','tradeoff'],['What needs checking','needs'],['Costs to compare','cost'],['Further access','flexibility'],['Overlap with other routes','overlap']];$('comparison-table').innerHTML=`<caption class="sr-only">Selected business funding routes and their features</caption><thead><tr><th scope="col">Compare features</th>${chosen.map(r=>`<th scope="col">${r.name}</th>`).join('')}</tr></thead><tbody>${rows.map(([label,key])=>`<tr><th scope="row">${label}</th>${chosen.map(r=>`<td>${escape(r[key])}</td>`).join('')}</tr>`).join('')}</tbody>`;$('compare-dialog').showModal();$('close-dialog').focus();});
$('close-dialog').addEventListener('click',()=>$('compare-dialog').close());$('compare-dialog').addEventListener('click',e=>{if(e.target===$('compare-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('compare-dialog').addEventListener('close',()=>{$('comparison-table').innerHTML='';});
cardVisibility();renderRoutes();

// Load the same fact-find view into this document to keep the handover in memory.
let factApi=null,factLoading=null,factView=null;
async function openFactFind(){
 const button=$('continue-fact-find');button.disabled=true;$('handover-error').hidden=true;
 try{
  if(!factApi){
   if(!factLoading)factLoading=(async()=>{
    const response=await fetch('/fact-find.html',{credentials:'same-origin',cache:'no-store'});
    if(!response.ok)throw new Error('Form unavailable');
    const doc=new DOMParser().parseFromString(await response.text(),'text/html');
    const main=doc.querySelector('#fact-find'),dialog=doc.querySelector('#reset-dialog');
    if(!main||!dialog)throw new Error('Form unavailable');
    factView=document.importNode(main,true);factView.querySelector('#main-content')?.remove();factView.hidden=true;
    const back=document.createElement('button');back.type='button';back.className='journey-back';back.id='back-to-explorer';back.textContent='← Back to funding explorer';back.addEventListener('click',()=>showExplorer('#explorer'));factView.prepend(back);
    $('explorer-main').after(factView);document.body.append(document.importNode(dialog,true));
    const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href='/fact-find.css';
    const styled=new Promise((resolve,reject)=>{stylesheet.onload=resolve;stylesheet.onerror=reject;});document.head.insertBefore(stylesheet,document.querySelector('link[href="/refinements.css"]'));
    await styled;
    return import('./fact-find.js');
   })();
   factApi=await factLoading;
  }
  const seed=current&&!dirty?mapExplorerToFactFind(current):null;
  factApi.setJourneyContext({mode:$('journey-mode').value,intent:openFactFind.intent||'application',agentCode:$('explorer-agent-code')?.value||''});openFactFind.intent=null;
  $('explorer-main').hidden=true;factView.hidden=false;
  factApi.offerExplorerDetails(seed);if(!seed)factApi.offerFundingAmount(Number($('amount').value.replace(/,/g,'')));
  document.title='Get Started | Pay2Day';
  if(location.hash!=='#fact-find')history.pushState(null,'','#fact-find');
  $('step-title').focus();factView.scrollIntoView({behavior:'smooth',block:'start'});
 }catch{
  if(!factApi){factView?.remove();factView=null;$('reset-dialog')?.remove();factLoading=null;}
  $('explorer-main').hidden=false;$('handover-error').hidden=false;$('handover-error').textContent='The form could not be opened. Your explorer details are still here. Please try again.';$('handover-error').scrollIntoView({block:'center'});
 }finally{button.disabled=false;}
}
function showExplorer(hash='#explorer',push=true){
 if(!factView)return;factView.hidden=true;$('explorer-main').hidden=false;document.title=originalTitle;
 if(push)history.pushState(null,'',hash);document.querySelector(hash)?.scrollIntoView({behavior:'smooth',block:'start'});
}
$('continue-fact-find').addEventListener('click',openFactFind);
// The fact-find navigation links use the same in-memory journey as the main CTA.
for(const link of document.querySelectorAll('a[href="/fact-find.html"]'))link.addEventListener('click',e=>{if(e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();openFactFind();});
for(const link of document.querySelectorAll('.site-header a[href^="/#"],.site-header a[href="/"],.site-footer a[href^="/#"],.skip-link'))link.addEventListener('click',e=>{if(factView&&!factView.hidden){e.preventDefault();showExplorer(link.hash||'#main-content');}});
window.addEventListener('popstate',()=>{if(location.hash==='#fact-find'&&factApi){$('explorer-main').hidden=true;factView.hidden=false;document.title='Get Started | Pay2Day';}else showExplorer('#explorer',false);});
// A fresh load never restores financial details from history or persistent storage.
if(location.hash==='#fact-find')openFactFind();

initExplorerTools({getData:()=>current,getRoutes:()=>shown,isDirty:()=>dirty,openFactFind});
