import assert from 'node:assert/strict';
import {startReview} from './review-harness.mjs';
import {widths,cardBounds,loanCases,statusCases,propertyTerms} from './field-fixtures.mjs';

const {browser}=await startReview(3019);
const base='http://127.0.0.1:3019',errors=[];
let cases=0;
try{
 for(const width of widths){
  const page=await browser.newPage({viewport:{width,height:1000}});page.on('pageerror',e=>errors.push(e.message));
  let revision=0,lastSnapshot;
  await page.route('**/runtime-config.js',r=>r.fulfill({contentType:'text/javascript',body:"export const runtime={mode:'live',apiBase:'/api/intake/v1',turnstileSiteKey:'test-site-key'};"}));
  await page.route('https://challenges.cloudflare.com/**',r=>r.fulfill({contentType:'text/javascript',body:"window.turnstile={render:(c,o)=>{queueMicrotask(()=>o.callback('test-token'));return 1;},remove:()=>{}};"}));
  await page.route('**/api/intake/v1/**',async r=>{
   const req=r.request(),path=new URL(req.url()).pathname.split('/v1')[1];
   if(path==='/session')return r.fulfill({json:{contract:'pay2day-intake-v1',acceptingEnquiries:true,csrfToken:'synthetic-csrf'}});
   assert.equal(req.headers()['x-csrf-token'],'synthetic-csrf');assert.ok(req.headers()['idempotency-key']);
   if(path==='/lookups/companies')return r.fulfill({json:{items:[]}});
   const body=req.postDataJSON();
   if(path==='/enquiries')return r.fulfill({json:{applicationId:'synthetic-fields',revision:++revision}});
   assert.ok(['/draft/save','/callback/request'].includes(path),'unexpected endpoint '+path);
   assert.equal(body.applicationId,'synthetic-fields');assert.equal(body.revision,revision);
   lastSnapshot=structuredClone(body);
   await r.fulfill({json:{applicationId:'synthetic-fields',revision:++revision,callbackSaved:true,confirmationStatus:'queued'}});
  });
  const f=name=>page.locator(`[name="${name}"]`),title=()=>page.locator('#step-title').innerText();
  async function set(name,value){const el=f(name);if(await el.evaluate(e=>e.tagName)==='SELECT')await el.selectOption(value);else{await el.fill(value);await el.dispatchEvent('change');}}
  async function values(map){for(const [name,value]of Object.entries(map))await set(name,value);}
  async function next(){await page.locator('#ff-next').click();await page.waitForFunction(()=>!document.getElementById('ff-next').disabled);assert.equal(await page.locator('#ff-errors').isVisible(),false,await title());}
  async function until(wanted){for(let i=0;i<35;i++){if(await title()===wanted)return;await next();}throw Error('Missing '+wanted);}
  async function back(){await page.locator('#ff-back').click();}
  async function reset(){revision=0;lastSnapshot=null;await page.goto(base+'/fact-find.html');await page.locator('#ff-example').evaluate(e=>e.click());}
  async function view(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow '+width+' '+await title());assert.deepEqual(await page.locator('#fields [aria-describedby]').evaluateAll(es=>es.flatMap(e=>(e.getAttribute('aria-describedby')||'').split(/\s+/).filter(id=>!document.getElementById(id)))),[]);}
  async function snapshot(){await page.locator('.form-callback button').click();await page.locator('#lead-submit').click();await page.waitForFunction(()=>document.getElementById('lead-status').textContent.includes('request is saved'));await page.locator('#lead-dialog .close-button').click();await page.locator('#lead-dialog').waitFor({state:'detached'});return lastSnapshot;}
  function payloadHas(body,expected){for(const [name,value]of Object.entries(expected))assert.equal(body.fields[name],value,'snapshot '+name);}
  function absent(body,names){for(const name of names)assert.equal(Object.hasOwn(body.fields,name),false,'inactive snapshot '+name);}
  async function invalid(name){const before=await title();await page.locator('#ff-next').click();await page.waitForFunction(()=>!document.getElementById('ff-next').disabled);assert.equal(await title(),before);assert.equal(await f(name).getAttribute('aria-invalid'),'true',name);assert.equal(await page.locator(`[data-error-for="${name}"]`).count(),1);await view();}

  // B1: zero is an explicit option, not the blank required value.
  await reset();await until('Funding and turnover');await set('financial.onlinePercent','');await invalid('financial.onlinePercent');await set('financial.onlinePercent','0');await next();payloadHas(lastSnapshot,{'financial.onlinePercent':'0'});cases++;
  await until('Business bank accounts');
  // B2: Other details serialize only while active; repeated removal shifts independent values.
  await values({'financial.bank':'other','financial.bankOther':'Synthetic Main Bank'});payloadHas(await snapshot(),{'financial.bank':'other','financial.bankOther':'Synthetic Main Bank'});
  await set('financial.bank','Barclays');absent(await snapshot(),['financial.bankOther']);
  for(let i=1;i<8;i++){await page.locator('#add-bank').click();await values({[`banks.${i}.provider`]:'other',[`banks.${i}.providerOther`]:'Synthetic Bank '+i});}
  await page.locator('#add-bank').click();assert.equal(await page.locator('.bank-entry').count(),8);assert.equal((await snapshot()).counts.banks,8);
  await page.locator('[data-remove-bank="3"]').click();assert.equal(await f('banks.3.providerOther').inputValue(),'Synthetic Bank 4');
  const bankPayload=await snapshot();assert.equal(bankPayload.counts.banks,7);payloadHas(bankPayload,{'banks.3.providerOther':'Synthetic Bank 4','banks.6.providerOther':'Synthetic Bank 7'});absent(bankPayload,['banks.7.provider','banks.7.providerOther']);await view();await next();await back();assert.equal(await f('banks.3.providerOther').inputValue(),'Synthetic Bank 4');await next();cases++;
  // B3: source bounds; callback snapshots also expose hidden stale fields.
  await set('financial.terminals','20');
  for(const row of cardBounds){
   assert.equal(await f(row.name).getAttribute('min'),row.min);assert.equal(await f(row.name).getAttribute('max'),row.max);
   for(const value of row.bad){await set(row.name,value);await invalid(row.name);cases++;}
   for(const value of row.good){await set(row.name,value);assert.equal(await f(row.name).evaluate(e=>e.checkValidity()),true);if(value==='20'&&row.name==='financial.processorCount')assert.equal(await page.locator('select[name^="processors."][name$=".provider"]').count(),19);if(value==='20'&&row.name==='financial.locations')assert.equal(await page.locator('textarea[name^="locations."]').count(),19);cases++;}
   await set(row.name,row.name==='financial.terminals'?'20':'1');
  }
  await values({'financial.terminals':'2','financial.processorCount':'3'});assert.equal(await f('financial.processorCount').getAttribute('max'),'2');await invalid('financial.processorCount');await values({'financial.terminals':'20','financial.processorCount':'1'});cases++;
  await values({'financial.processor':'other','financial.processorOther':'Synthetic Processor','financial.processorCount':'3','processors.1.provider':'other','processors.1.providerOther':'Synthetic Processor 2','processors.2.provider':'other','processors.2.providerOther':'Synthetic Processor 3','financial.locations':'3','locations.1.postcode':'AB1 2CD','locations.1.address':'1 Synthetic Location','locations.2.postcode':'AB1 2CD','locations.2.address':'2 Synthetic Location'});
  payloadHas(await snapshot(),{'processors.2.providerOther':'Synthetic Processor 3','locations.2.address':'2 Synthetic Location'});await view();await next();await back();assert.equal(await f('locations.2.address').inputValue(),'2 Synthetic Location');
  await values({'financial.processorCount':'2','financial.locations':'2'});assert.equal(await f('processors.2.provider').count(),0);assert.equal(await f('locations.2.address').count(),0);const reduced=await snapshot();absent(reduced,['processors.2.provider','processors.2.providerOther','locations.2.address','locations.2.postcode']);payloadHas(reduced,{'financial.processorCount':'2','financial.locations':'2','processors.1.providerOther':'Synthetic Processor 2','locations.1.address':'1 Synthetic Location'});
  await set('financial.processor','Stripe');absent(await snapshot(),['financial.processorOther']);
  await set('financial.cards','no');const cardsOff=await snapshot();for(const key of Object.keys(cardsOff.fields))assert.ok(!/^(processors\.|locations\.)/.test(key),'inactive repeat '+key);absent(cardsOff,['financial.terminals','financial.processor','financial.processorOther','financial.processorCount','financial.locations','financial.cardSales']);payloadHas(cardsOff,{'financial.cards':'no','financial.bank':'Barclays'});await next();await back();assert.equal(await f('financial.cards').inputValue(),'no');await view();cases++;

  // N1: status branches are visibility/serialization facts, never eligibility decisions.
  await until('Person 1: about them');await set('owners.0.nationality','Indian');await set('owners.0.immigrationStatus','Visa holder / limited leave');await values({'owners.0.visaRoute':'Other / not sure','owners.0.visaOther':'Synthetic route description','owners.0.visaExpiry':'2030-01-01'});
  payloadHas(await snapshot(),{'owners.0.visaOther':'Synthetic route description'});
  for(const status of statusCases){await set('owners.0.immigrationStatus',status);assert.ok(await f('owners.0.visaRoute').isHidden());const body=await snapshot();payloadHas(body,{'owners.0.immigrationStatus':status,'owners.0.first':'Alex'});absent(body,['owners.0.visaRoute','owners.0.visaOther','owners.0.visaExpiry']);await view();cases++;}
  await set('owners.0.immigrationStatus','Visa holder / limited leave');assert.equal(await f('owners.0.visaRoute').inputValue(),'');assert.equal(await f('owners.0.visaExpiry').inputValue(),'');await set('owners.0.visaRoute','Skilled Worker');
  await f('owners.0.britishDual').check();assert.equal(await f('owners.0.immigrationStatus').count(),0);absent(await snapshot(),['owners.0.immigrationStatus','owners.0.statusEvidenceLater']);await f('owners.0.britishDual').uncheck();
  for(const nationality of ['British','Irish']){await set('owners.0.nationality',nationality);assert.equal(await f('owners.0.immigrationStatus').count(),0);const body=await snapshot();payloadHas(body,{'owners.0.nationality':nationality});absent(body,['owners.0.immigrationStatus','owners.0.visaRoute','owners.0.visaExpiry']);cases++;}
  await set('owners.0.nationality','Other');await set('owners.0.nationalityOther','Synthetic nationality');payloadHas(await snapshot(),{'owners.0.nationalityOther':'Synthetic nationality'});await set('owners.0.nationality','British');absent(await snapshot(),['owners.0.nationalityOther']);

  // L1: category/no-category and same-type independence already have authoritative suites.
  await until('Existing business loans');await set('questions.loans','yes');await f('loanTypes.other').check();
  await values({'loans.0.original':'1000','loans.0.lender':'Synthetic Lender','loans.0.otherType':'Synthetic facility'});
  for(const row of loanCases){for(const [key,value]of Object.entries(row.fields))await set('loans.0.'+key,value);if(row.error)await invalid('loans.0.'+row.error);else{await next();payloadHas(lastSnapshot,Object.fromEntries(Object.entries(row.fields).map(([k,v])=>['loans.0.'+k,v])));await back();}cases++;}
  await values({'loans.0.taken':'','loans.0.term':'','loans.0.termUnit':'','loans.0.outstanding':'0','loans.0.otherType':''});await invalid('loans.0.otherType');await set('loans.0.otherType','Synthetic facility');payloadHas(await snapshot(),{'loans.0.otherType':'Synthetic facility'});await set('questions.loans','no');absent(await snapshot(),['loans.0.type','loans.0.otherType','loans.0.outstanding']);await view();cases++;

  // P1: existing property terms, active-branch snapshots and route retention.
  await page.locator('[data-step="0"]').click();await set('funding.route','property');await until('Your property plans');
  await values({'property.purpose':'purchase','property.owner':'My business','property.type':'commercial','property.commercialType':'Office','property.occupied':'no'});await next();
  await values({'property.location.postcode':'AB1 2CD','property.location.address':'1 Synthetic Property','property.purchasePrice':'200000','property.value':'220000','property.debt':'0'});await next();
  await values({'property.repayment':'capital','property.timescale':'Exploring for now'});
  for(const row of propertyTerms){await values({'property.term':row.term,'property.termUnit':row.unit,'property.minimumTerm':row.min,'property.maximumTerm':row.max});if(row.error)await invalid('property.'+row.error);else{await next();payloadHas(lastSnapshot,{'property.term':row.term,'property.termUnit':row.unit,'property.debt':'0'});await back();}cases++;}
  await values({'property.term':'12','property.termUnit':'Months','property.minimumTerm':'','property.maximumTerm':''});await next();await set('property.rented','business');
  const propertyBody=await snapshot();absent(propertyBody,['financial.onlinePercent','financial.cards','financial.bank']);payloadHas(propertyBody,{'funding.route':'property','property.location.address':'1 Synthetic Property'});
  await page.locator('[data-step="0"]').click();await set('funding.route','business');await until('Funding and turnover');assert.equal(await f('financial.onlinePercent').inputValue(),'0');
  const businessBody=await snapshot();payloadHas(businessBody,{'funding.route':'business','financial.onlinePercent':'0','financial.cards':'no'});assert.ok(!Object.keys(businessBody.fields).some(k=>k.startsWith('property.')));await view();cases++;
  await page.locator('[data-step="0"]').click();await set('funding.route','property');await until('Your property plans');assert.equal(await f('property.purpose').inputValue(),'purchase');await next();assert.equal(await f('property.location.address').inputValue(),'1 Synthetic Property');await view();
  await page.close();console.log('PASS: field boundaries/transitions/snapshots at '+width+'px');
 }
 assert.deepEqual(errors,[]);console.log(`PASS: ${cases} table-driven/transition cases; synthetic local snapshots only. Browser ${browser.version()}.`);
}finally{await browser.close();}
