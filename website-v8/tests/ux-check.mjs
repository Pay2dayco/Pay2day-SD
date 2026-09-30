import assert from 'node:assert/strict';
import {startReview} from './review-harness.mjs';
import {mkdir} from 'node:fs/promises';
const baseline=process.argv.includes('--baseline');
const {browser}=await startReview(3017);
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base='http://127.0.0.1:3017',field=n=>page.locator(`[name="${n}"]`);
 const focused=locator=>locator.evaluate(e=>e===document.activeElement);
 async function next(){await page.locator('#ff-next').click();await page.waitForFunction(()=>!document.getElementById('ff-next').disabled);assert.equal(await page.locator('#ff-errors').isVisible(),false,await page.locator('#step-title').innerText());}
 async function until(title){for(let i=0;i<35;i++){if(await page.locator('#step-title').innerText()===title)return;await next();}throw Error('Missing '+title);}
 async function descriptionsValid(){assert.deepEqual(await page.locator('#fields').evaluate(root=>[...root.querySelectorAll('[aria-describedby]')].flatMap(e=>(e.getAttribute('aria-describedby')||'').split(/\s+/).filter(id=>!document.getElementById(id)))),[]);assert.deepEqual(await page.locator('#fields').evaluate(root=>{const ids=[...root.querySelectorAll('[id]')].map(e=>e.id);return ids.filter((id,i)=>ids.indexOf(id)!==i);}),[]);}
 await page.goto(base+'/fact-find.html');await page.locator('#ff-next').click();
 assert.equal(await page.locator('#ff-errors').evaluate(e=>e===document.activeElement),true);
 await field('business.name').fill('Synthetic Business');
 const descriptions=await field('business.name').getAttribute('aria-describedby');
 const dangling=await field('business.name').evaluate(e=>(e.getAttribute('aria-describedby')||'').split(/\s+/).filter(id=>id&&!document.getElementById(id)));
 assert.ok(descriptions.includes('h-business.name'),'help retained');
 assert.equal(await field('applicant.fullName').getAttribute('aria-invalid'),'true','other errors retained');
 await page.locator('#ff-example').click();await page.locator('#ff-next').click();
 const startDate=await field('business.startDate').inputValue();await field('business.startDate').fill('');await field('business.number').fill('');await page.locator('#ff-next').click();
 const duplicate=await page.locator('[id="error-business.number"]').count();
 await field('business.structure').focus();await field('business.structure').selectOption('Sole trader');
 const focusRetained=await field('business.structure').evaluate(e=>e===document.activeElement);
 await page.locator('.form-callback button').focus();await page.keyboard.press('Enter');
 assert.ok(await page.locator('#lead-dialog').isVisible());await page.keyboard.press('Escape');
 const callbackReturns=await page.locator('.form-callback button').evaluate(e=>e===document.activeElement);
 if(baseline)console.log(JSON.stringify({danglingErrorDescriptions:dangling.length,duplicateErrorIds:duplicate,conditionalFocusRetained:focusRetained,callbackEscapeReturnsFocus:callbackReturns}));
 else{assert.deepEqual(dangling,[]);assert.equal(duplicate,1);assert.ok(focusRetained);assert.ok(callbackReturns);}
 if(!baseline){
 assert.equal(await field('business.startDate').getAttribute('aria-invalid'),'true','conditional rerender preserves another active error');await field('business.startDate').fill(startDate);
 await descriptionsValid();
 // Error links reveal closed optional sections without changing their rules.
 await field('business.structure').selectOption('Limited company');await field('business.number').fill('12345678');await next();
 await page.locator('.business-online summary').click();await field('business.website').fill('invalid');await page.locator('.business-online summary').click();
 await page.locator('#ff-next').click();assert.equal(await page.locator('.business-online').getAttribute('open'),'');
 await page.locator('.business-online summary').click();await page.locator('[data-error-for="business.website"]').focus();await page.keyboard.press('Enter');assert.ok(await focused(field('business.website')));
 await field('business.website').fill('https://example.invalid');await descriptionsValid();
 await field('business.sameAddress').selectOption('no');await page.locator('#ff-next').click();assert.equal(await field('business.trading.address').getAttribute('aria-invalid'),'true');
 await field('business.sameAddress').selectOption('yes');assert.equal(await page.locator('[data-error-for="business.trading.address"]').count(),0);await descriptionsValid();await next();
 await until('Business bank accounts');await page.locator('#add-bank').click();assert.ok(await focused(field('banks.1.provider')));await field('banks.1.provider').selectOption('Monzo');
 await page.locator('[data-remove-bank="1"]').click();assert.ok(await focused(page.locator('#add-bank')));assert.equal(await field('financial.bank').inputValue(),'Barclays');
 await until('Person 1: home address');const oldSince=await field('owners.0.since').inputValue();
 await field('owners.0.since').fill(new Date().toISOString().slice(0,7));await field('owners.0.since').dispatchEvent('change');
 await page.locator('[data-add-address="0"]').click();assert.ok(await focused(field('owners.0.previous.1.address')));
 await page.locator('[data-remove-address="0:1"]').click();assert.ok(await focused(page.locator('[data-add-address="0"]')));
 await field('owners.0.since').fill(oldSince);await field('owners.0.since').dispatchEvent('change');
 await page.locator('#add-owner').click();assert.ok(await focused(field('owners.1.first')));await field('owners.1.first').fill('Second synthetic person');
 await page.locator('[data-remove-owner="1"]').click();assert.equal(await page.locator('#step-title').innerText(),'Person 1: about them');assert.ok(await focused(page.locator('#step-title')));assert.equal(await field('owners.0.first').inputValue(),'Alex');
 await until('Existing business loans');await field('questions.loans').selectOption('yes');await field('loanTypes.mca').check();
 for(const [name,value]of Object.entries({original:'10000',outstanding:'5000',lender:'Synthetic Lender',term:'12'}))await field('loans.0.'+name).fill(value);
 await page.locator('#ff-next').click();assert.match(await page.locator('#ff-errors').innerText(),/length and its unit/);await descriptionsValid();await field('loans.0.termUnit').selectOption('Months');
 await page.locator('[data-add-loan-type="mca"]').click();assert.ok(await focused(field('loans.1.original')));await page.locator('[data-remove-loan="1"]').click();assert.ok(await focused(field('loanTypes.mca')));assert.equal(await field('loans.0.lender').inputValue(),'Synthetic Lender');
 await page.locator('[data-remove-loan="0"]').click();assert.ok(await focused(field('loanTypes.mca')));await field('questions.loans').selectOption('no');await next();
 await page.locator('#ff-back').click();assert.equal(await field('questions.loans').inputValue(),'no');
 console.log('PASS: validation links/descriptions, inactive errors, conditional focus, bank/person/address/loan repeats and back retention.');
 // Real browser keyboard navigation, reduced motion and layout at both CSS zoom levels.
 await mkdir('test-results/ux',{recursive:true});await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(()=>{const original=Element.prototype.scrollIntoView;window.scrollBehaviors=[];Element.prototype.scrollIntoView=function(options){window.scrollBehaviors.push(options?.behavior);return original.call(this,options);};});
 for(const width of [320,390,768,1024,1440])for(const zoom of [1,2]){
  await page.setViewportSize({width,height:1000});await page.goto(base+'/fact-find.html');await page.evaluate(z=>document.documentElement.style.zoom=z,zoom);
  await page.locator('#ff-next').click();assert.ok(await focused(page.locator('#ff-errors')));assert.equal(await page.evaluate(()=>window.scrollBehaviors.at(-1)),'auto');
  if(zoom===1)assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`page overflow ${width}`);
  assert.deepEqual(await page.locator('#fact-form, #fact-form *').evaluateAll(es=>es.filter(e=>{const r=e.getBoundingClientRect();return r.width&&(r.left < -1||r.right>innerWidth+1);}).map(e=>e.id||e.tagName)),[],`form overflow ${width} zoom ${zoom}`);
  await page.keyboard.press('Tab');assert.ok(await page.locator('[data-error-for]').first().evaluate(e=>e===document.activeElement));await page.keyboard.press('Enter');assert.ok(await focused(field('business.name')));
  assert.ok(await field('business.name').evaluate(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.left>=-1&&r.right<=innerWidth+1;}));
  if(width===390)await page.screenshot({path:`test-results/ux/errors-390-zoom-${zoom}.png`,fullPage:true});
 }
 console.log('PASS: 320/390/768/1024/1440 px at 100% and 200% CSS zoom, keyboard error links, reduced-motion scroll.');
 // Every rendered callback opener and the results path; Tab never leaves the native modal.
 for(const path of ['/fact-find.html','/funding-explorer.html','/']){
  await page.goto(base+path);const openers=page.locator('[data-lead-intent]');
  for(let i=0;i<await openers.count();i++)if(await openers.nth(i).isVisible()&&await openers.nth(i).isEnabled()){
   for(const close of ['Escape','button']){await openers.nth(i).focus();await page.keyboard.press('Enter');await page.locator('#lead-dialog').waitFor();for(const key of ['Tab','Shift+Tab'])for(let n=0;n<18;n++){await page.keyboard.press(key);assert.ok(await page.locator('#lead-dialog').evaluate(e=>e.contains(document.activeElement)||!document.hasFocus()),'Tab can enter browser chrome but must not focus the background document');}await page.locator('#lead-name').focus();if(close==='Escape')await page.keyboard.press('Escape');else await page.locator('#lead-dialog .close-button').click();await page.locator('#lead-dialog').waitFor({state:'detached'});assert.ok(await focused(openers.nth(i)));}
  }
 }
 await page.goto(base+'/funding-explorer.html');await page.locator('#amount').fill('25000');await page.locator('#purpose').selectOption('stock');await page.locator('#repayment').selectOption('sales');await page.locator('#explorer-next').click();
 for(const [id,value]of Object.entries({uk:'yes',entity:'sole',trading:'2plus',pattern:'steady',cards:'no'}))await page.locator('#'+id).selectOption(value);
 await page.locator('#turnover').fill('30000');await page.locator('#explorer-next').click();await page.locator('#propertyOwner').selectOption('yes');await page.locator('#explore-submit').click();
 const results=page.locator('[data-lead-intent="results"]').filter({visible:true});await results.first().focus();await page.keyboard.press('Enter');assert.ok(await page.locator('#lead-action').isVisible());await page.locator('#lead-action').selectOption('callback');assert.equal(await page.locator('#lead-phone').getAttribute('required'),'');await page.locator('#lead-action').selectOption('email');assert.equal(await page.locator('#lead-phone').getAttribute('required'),null);await page.keyboard.press('Escape');assert.ok(await focused(results.first()));
 console.log('PASS: callback/results keyboard opening, native modal containment, Escape/close return and phone requirement.');
 for(const change of ['hidden','removed'])for(const close of ['Escape','button']){
  await page.goto(base+'/fact-find.html');await page.locator('.form-callback button').focus();await page.keyboard.press('Enter');
  await page.locator('.form-callback button').evaluate((el,change)=>change==='hidden'?el.hidden=true:el.remove(),change);
  if(close==='Escape')await page.keyboard.press('Escape');else await page.locator('#lead-dialog .close-button').click();await page.locator('#lead-dialog').waitFor({state:'detached'});
  assert.ok(await focused(page.locator('#step-title')));assert.ok(await page.locator('#step-title').isVisible());
 }
 console.log('PASS: removed/hidden dialog opener falls back to a visible local heading after Escape and Close.');
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
