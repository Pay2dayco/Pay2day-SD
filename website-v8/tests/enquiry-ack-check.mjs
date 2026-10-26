import assert from 'node:assert/strict';
import {startReview} from './review-harness.mjs';
const baseline=process.argv.includes('--baseline');
const message="We couldn't confirm that your enquiry was received. Your details are still here. Please contact Pay2Day before sending again.";
const {browser}=await startReview(3023);
try{
 for(const intent of ['callback','results']){
  const page=await browser.newPage();const calls=[];let mode='empty',challenges=0;
  await page.route('**/runtime-config.js',r=>r.fulfill({contentType:'text/javascript',body:"export const runtime={mode:'live',apiBase:'/api/intake/v1',turnstileSiteKey:'synthetic'};"}));
  await page.route('https://challenges.cloudflare.com/**',r=>r.fulfill({contentType:'text/javascript',body:"window.turnstile={render:(c,o)=>{window.syntheticChallenges=(window.syntheticChallenges||0)+1;queueMicrotask(()=>o.callback('synthetic-'+window.syntheticChallenges));return window.syntheticChallenges;},remove:()=>{}};"}));
  await page.route('**/api/intake/v1/**',async r=>{
   const path=new URL(r.request().url()).pathname.split('/v1')[1];
   if(path==='/session')return r.fulfill({json:{contract:'pay2day-intake-v1',acceptingEnquiries:true,csrfToken:'synthetic'}});
   assert.equal(path,'/enquiries');assert.equal(r.request().headers()['x-csrf-token'],'synthetic');
   calls.push({body:r.request().postDataJSON(),key:r.request().headers()['idempotency-key']});
   if(mode==='network')return r.abort('failed');
   if(mode==='timeout'){await new Promise(ok=>setTimeout(ok,21000));return r.fulfill({json:{}}).catch(()=>{});}
   if(mode==='malformed')return r.fulfill({contentType:'application/json',body:'not json'});
   if(mode==='503')return r.fulfill({status:503,json:{message:'synthetic private diagnostic'}});
   const values={empty:{},null:null,list:[],scalar:1,unrelated:{hello:'world'},sent:{applicationId:'synthetic',revision:1,confirmationStatus:'sent'},queued:{confirmationStatus:'queued'},accepted:{status:'accepted',receipt:'synthetic'}};
   return r.fulfill({contentType:'application/json',body:JSON.stringify(values[mode])});
  });
  await page.goto('http://127.0.0.1:3023/');
  await page.evaluate(async intent=>{const m=await import('/lead-capture.js');m.setLeadContext({funding:{amount:10000},summary:'Synthetic comparison'});m.setLeadContact({name:'Synthetic Applicant',business:'Synthetic Business',email:'applicant@example.invalid',phone:'020 0000 0000'});m.openLead(intent);},intent);
  if(intent==='callback')await page.locator('#lead-time').selectOption('Weekday afternoon');
  const snapshot=()=>page.locator('#lead-form').evaluate(f=>Object.fromEntries(new FormData(f)));
  for(const failure of baseline?['empty']:['empty','null','list','scalar','unrelated','sent','queued','accepted','malformed','503','network','timeout']){
   mode=failure;const before=await snapshot(),count=calls.length;
   await page.locator('#lead-submit').click();
   if(failure==='timeout'){
    await page.waitForFunction(()=>document.getElementById('lead-submit').disabled);await page.waitForTimeout(100);
    const busyCount=calls.length;await page.locator('#lead-form').evaluate(f=>{f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
    await page.waitForTimeout(100);assert.equal(calls.length,busyCount,'busy duplicate requests suppressed');
   }
   if(baseline){await page.waitForFunction(()=>document.getElementById('lead-status').textContent.includes('request is saved'));assert.ok(await page.locator('#lead-submit').isDisabled());console.log('REPRODUCED standalone false confirmation:',intent);break;}
   await page.waitForFunction(()=>!document.getElementById('lead-submit').disabled,null,{timeout:26000});
   assert.equal(calls.length,count+1);assert.equal(await page.locator('#lead-status').innerText(),message);assert.ok(await page.locator('#lead-status').evaluate(e=>e===document.activeElement));
   assert.deepEqual(await snapshot(),before);assert.ok(await page.locator('#lead-dialog').isVisible());assert.equal(await page.locator('#lead-name').isDisabled(),false);
   assert.deepEqual(calls.at(-1),calls[0],'unchanged deliberate retry has exact body/key including challenge');
   challenges=await page.evaluate(()=>window.syntheticChallenges);assert.equal(challenges,1,'no new challenge changes retry body');
   const settled=calls.length;await page.waitForTimeout(100);assert.equal(calls.length,settled,'no automatic retry');
  }
  if(!baseline){
   mode='empty';const old=calls.at(-1);await page.locator('#lead-business').fill('Changed Synthetic Business');await page.locator('#lead-submit').click();await page.waitForFunction(()=>!document.getElementById('lead-submit').disabled);
   assert.notEqual(calls.at(-1).key,old.key);assert.notDeepEqual(calls.at(-1).body,old.body);assert.equal(calls.at(-1).body.contact.business,'Changed Synthetic Business');
   const edited=calls.at(-1);await page.evaluate(async()=>{(await import('/lead-capture.js')).setLeadContext({funding:{amount:20000},summary:'Changed synthetic comparison'});});
   await page.locator('#lead-submit').click();await page.waitForFunction(()=>!document.getElementById('lead-submit').disabled);assert.notEqual(calls.at(-1).key,edited.key);assert.equal(calls.at(-1).body.funding.amount,20000);
   // Freeze the dispatched body even if inputs change during the request.
   mode='timeout';await page.locator('#lead-submit').click();await page.waitForFunction(()=>document.getElementById('lead-submit').disabled);await page.waitForTimeout(100);const inFlight=structuredClone(calls.at(-1));
   await page.locator('#lead-business').fill('Edited while pending');await page.waitForFunction(()=>!document.getElementById('lead-submit').disabled,null,{timeout:26000});assert.deepEqual(calls.at(-1),inFlight);
   mode='empty';await page.locator('#lead-submit').click();await page.waitForFunction(()=>!document.getElementById('lead-submit').disabled);assert.notEqual(calls.at(-1).key,inFlight.key);assert.equal(calls.at(-1).body.contact.business,'Edited while pending');
   const retained=await snapshot();await page.evaluate(()=>{window.fetch=()=>Promise.reject({privateDiagnostic:'synthetic unknown'});});await page.locator('#lead-submit').click();await page.waitForFunction(()=>!document.getElementById('lead-submit').disabled);assert.equal(await page.locator('#lead-status').innerText(),message);assert.deepEqual(await snapshot(),retained);
  }
  await page.close();
 }
 const preview=await browser.newPage();await preview.goto('http://127.0.0.1:3023/');await preview.evaluate(async()=>{const m=await import('/lead-capture.js');m.setLeadContact({name:'Preview',business:'Synthetic',email:'preview@example.invalid',phone:'020 0000 0000'});m.openLead();});await preview.locator('#lead-submit').click();assert.match(await preview.locator('#lead-status').innerText(),/Nothing was sent/);await preview.close();
 console.log(baseline?'PASS: both standalone false confirmations reproduced':'PASS: callback/results, 24 uncertain outcomes, exact attempts, changed-body keys, pending edits, no retries/raw errors/completion, preview zero writes');
}finally{await browser.close();}
