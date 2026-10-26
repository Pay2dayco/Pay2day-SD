import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {startReview} from './review-harness.mjs';
const message="We couldn't confirm that your fact-find was received. Your answers are still here. Please contact Pay2Day before submitting again.";
const {browser}=await startReview(3022);
const baseline=process.argv.includes('--baseline');
try{
 for(const assisted of [false,true]){
  const page=await browser.newPage();let revision=0,mode='empty';const calls=[];
  await page.route('**/runtime-config.js',r=>r.fulfill({contentType:'text/javascript',body:"export const runtime={mode:'live',apiBase:'/api/intake/v1',turnstileSiteKey:'synthetic'};"}));
  await page.route('**/fact-find.js',async r=>{const source=await readFile(new URL('../dist/fact-find.js',import.meta.url),'utf8');await r.fulfill({contentType:'text/javascript',body:source+"\nwindow.syntheticSnapshot=()=>structuredClone({state,step,substep,emailVerified,submitKey,applicationId,revision,finished});"});});
  await page.route('https://challenges.cloudflare.com/**',r=>r.fulfill({contentType:'text/javascript',body:"window.turnstile={render:(c,o)=>{queueMicrotask(()=>o.callback('synthetic'));return 1;},remove:()=>{}};"}));
  await page.route('**/api/intake/v1/**',async r=>{
   const path=new URL(r.request().url()).pathname.split('/v1')[1];calls.push({path,key:r.request().headers()['idempotency-key'],body:r.request().method()==='POST'?r.request().postDataJSON():null});
   if(path==='/session')return r.fulfill({json:{contract:'pay2day-intake-v1',acceptingEnquiries:true,csrfToken:'synthetic'}});
   if(path==='/enquiries')return r.fulfill({json:{applicationId:'synthetic-application',revision:++revision}});
   if(path==='/draft/save')return r.fulfill({json:{revision:++revision}});
   if(path==='/lookups/companies')return r.fulfill({json:{items:[]}});
   if(path==='/verification/request')return r.fulfill({json:{sent:true}});
   if(path==='/verification/confirm')return r.fulfill({json:{verified:true}});
   assert.equal(path,assisted?'/client-review/request':'/submission');
   if(mode==='network')return r.abort('failed');
   if(mode==='timeout'){await new Promise(ok=>setTimeout(ok,21000));return r.fulfill({json:{}}).catch(()=>{});}
   if(mode==='malformed')return r.fulfill({contentType:'application/json',body:'not json'});
   if(mode==='503')return r.fulfill({status:503,json:{message:'synthetic private diagnostic'}});
   const values={empty:{},null:null,list:[],scalar:1,unrelated:{hello:'world'},plausible:{status:'accepted',application_ref:'synthetic-application',submitted:true},reference:{reference:'P2D-TEST'}};
   return r.fulfill({contentType:'application/json',body:JSON.stringify(values[mode])});
  });
  await page.goto('http://127.0.0.1:3022/fact-find.html');await page.locator('#ff-example').evaluate(e=>e.click());
  if(assisted){await page.locator('.conversation-tools summary').click();await page.locator('[name="journey.mode"]').selectOption('phone');}
  for(let i=0;await page.locator('#step-title').innerText()!=='Check and accept';i++){assert.ok(i<35);await page.locator('#ff-next').click();await page.waitForFunction(()=>!document.getElementById('ff-next').disabled);assert.ok(await page.locator('#ff-errors').isHidden());}
  if(!assisted){for(const name of ['businessUse','noPropertyPurchase','acceptance'])await page.locator('[name="application.'+name+'"]').check();await page.locator('#ff-next').click();await page.locator('#verification-code').fill('123456');await page.locator('#verify-email').click();await page.waitForFunction(()=>document.getElementById('verification-status').textContent.includes('confirmed'));}
  for(const failure of baseline?['empty']:['empty','null','list','scalar','unrelated','plausible','reference','malformed','503','network','timeout']){
   mode=failure;const before=await page.evaluate(()=>window.syntheticSnapshot());const count=calls.length;
   if(failure==='reference')await page.locator('#ff-next').press('Enter');else await page.locator('#ff-next').click();
   if(failure==='timeout'){await page.waitForFunction(()=>document.getElementById('ff-next').disabled);const started=calls.length;await page.locator('#fact-form').evaluate(f=>{f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});await page.waitForTimeout(100);assert.equal(calls.length,started,'busy duplicate submits suppressed');}
   await page.waitForFunction(()=>!document.getElementById('ff-next').disabled,null,{timeout:26000});
   if(baseline){assert.ok(await page.locator('#ff-end').isVisible(),'baseline false completion reproduced');console.log('BASELINE FALSE SUCCESS:',assisted?'client review':'submission');break;}
   assert.equal(await page.locator('#ff-errors').innerText(),message);assert.ok(await page.locator('#ff-errors').evaluate(e=>document.activeElement===e));assert.ok(await page.locator('#ff-end').isHidden());
   const after=await page.evaluate(()=>window.syntheticSnapshot());assert.deepEqual(after.state,before.state);for(const k of ['step','substep','emailVerified','submitKey','applicationId','finished'])assert.deepEqual(after[k],before[k],k);
   assert.equal(after.revision,assisted&&failure==='empty'?before.revision+1:before.revision,'acknowledged draft revision retained');
   assert.equal(calls.filter(c=>c.path===(assisted?'/client-review/request':'/submission')).at(-1).key, calls.filter(c=>c.path===(assisted?'/client-review/request':'/submission'))[0].key);
   const finals=calls.filter(c=>c.path===(assisted?'/client-review/request':'/submission'));assert.deepEqual(finals.at(-1).body,finals[0].body,'same key requires exact same final body');if(assisted&&failure!=='empty')assert.equal(calls.slice(count).filter(c=>c.path==='/draft/save').length,0,'no new save for retained final attempt');
   const settled=calls.length;await page.waitForTimeout(100);assert.equal(calls.length,settled,'no automatic retry');assert.ok(calls.length>count);
  }
  if(!baseline){
   const retained=await page.evaluate(()=>window.syntheticSnapshot());
   await page.evaluate(()=>{window.fetch=()=>Promise.reject({privateDiagnostic:'synthetic unknown'});});
   await page.locator('#ff-next').click();await page.waitForFunction(()=>!document.getElementById('ff-next').disabled);assert.equal(await page.locator('#ff-errors').innerText(),message);const unknown=await page.evaluate(()=>window.syntheticSnapshot());assert.deepEqual(unknown,retained,'unknown errors preserve entire final state');
   await page.locator('#ff-back').click();await page.locator('[name="business.moreTrading"]').check();
   const edited=await page.evaluate(()=>window.syntheticSnapshot());assert.notEqual(edited.submitKey,retained.submitKey,'real answer edit starts a different generation');assert.equal(edited.emailVerified,false);assert.equal(edited.state['application.acceptance'],'no');
  }
  await page.close();
 }
 console.log(baseline?'PASS: both original false successes reproduced':'PASS: both paths, 22 uncertain outcomes, accessible message and state/key preservation; no real traffic');
}finally{await browser.close();}
