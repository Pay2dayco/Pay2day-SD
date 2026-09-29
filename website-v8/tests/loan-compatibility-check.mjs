import assert from 'node:assert/strict';
import {startReview} from './review-harness.mjs';

// All adapter traffic is fulfilled locally. The on-disk build stays in preview.
const {browser}=await startReview(3016);
try{
 const page=await browser.newPage({viewport:{width:390,height:950}}),errors=[],calls=[];
 page.on('pageerror',e=>errors.push(e.message));
 let revision=0,snapshot,restored;
 await page.route('**/runtime-config.js',r=>r.fulfill({contentType:'text/javascript',body:"export const runtime={mode:'live',apiBase:'/api/intake/v1',turnstileSiteKey:'test-site-key'};"}));
 await page.route('https://challenges.cloudflare.com/**',r=>r.fulfill({contentType:'text/javascript',body:"window.turnstile={render:(c,o)=>{queueMicrotask(()=>o.callback('test-token'));return 1;},remove:()=>{}};"}));
 await page.route('**/api/intake/v1/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname.split('/v1')[1],body=req.method()==='POST'?req.postDataJSON():{};
  calls.push({path,body});let data;
  if(path==='/session')data={contract:'pay2day-intake-v1',acceptingEnquiries:true,csrfToken:'test-csrf'};
  else{
   assert.equal(req.headers()['x-csrf-token'],'test-csrf');assert.ok(req.headers()['idempotency-key']);
   if(path==='/enquiries')data={applicationId:'synthetic-loans',revision:++revision};
   else if(path==='/draft/save'||path==='/callback/request'){
    assert.equal(body.applicationId,'synthetic-loans');assert.equal(body.revision,revision);
    snapshot={applicationId:body.applicationId,revision:++revision,fields:structuredClone(body.fields),counts:structuredClone(body.counts)};
    data={applicationId:body.applicationId,revision,callbackSaved:true,confirmationStatus:'queued'};
   }else if(path==='/access/request')data={accessRef:'synthetic-access'};
   else if(path==='/access/confirm')data={...restored,revision,verified:true};
   else if(path==='/lookups/companies')data={items:[]};
   else throw Error('Unexpected mock endpoint '+path);
  }
  await route.fulfill({json:data});
 });
 const field=name=>page.locator(`[name="${name}"]`);
 async function next(){
  if(await field('financial.turnoverChecked').count())await field('financial.turnoverChecked').selectOption('yes');
  await page.locator('#ff-next').click();await page.waitForFunction(()=>!document.getElementById('ff-next').disabled);
  assert.equal(await page.locator('#ff-errors').isVisible(),false,'synthetic journey validates');
 }
 async function until(title){
  for(let i=0;i<35;i++){if(await page.locator('#step-title').innerText()===title)return;await next();}
  throw Error('Missing synthetic journey step');
 }
 async function fillLoan(i,amount){
  for(const [key,value] of Object.entries({original:amount,outstanding:'500',lender:'Synthetic Same Lender'}))await field(`loans.${i}.${key}`).fill(value);
 }
 function assertPayload(payload,amounts){
  assert.equal(payload.counts.loans,amounts.length);
  for(let i=0;i<amounts.length;i++){
   assert.equal(payload.fields[`loans.${i}.type`],'Cash Advance');
   assert.equal(payload.fields[`loans.${i}.original`],amounts[i]);
   assert.equal(payload.fields[`loans.${i}.lender`],'Synthetic Same Lender');
  }
  assert.ok(!Object.values(payload.fields).includes('Business Cash Advance'),'display label never enters payload');
 }
 async function callback(amounts){
  await page.locator('.form-callback button').click();await page.locator('#lead-submit').click();
  await page.waitForFunction(()=>document.getElementById('lead-status').textContent.includes('request is saved'));
  assertPayload(calls.filter(c=>c.path==='/callback/request').at(-1).body,amounts);
  await page.locator('#lead-dialog .close-button').click();
 }
 function lastSave(){return calls.filter(c=>c.path==='/draft/save').at(-1).body;}
 await page.goto('http://127.0.0.1:3016/fact-find.html');
 await page.locator('#ff-example').evaluate(el=>el.click());await until('Existing business loans');
 await field('questions.loans').selectOption('yes');await field('loanTypes.mca').check();
 await fillLoan(0,'1000');await page.locator('[data-add-loan-type="mca"]').click();await fillLoan(1,'2000');
 assert.equal(await page.locator('.loan-category .ff-repeat').count(),2);
 for(const title of await page.locator('.loan-category h3').allTextContents())assert.match(title,/^Business Cash Advance/);
 assert.match(await page.locator('[data-add-loan-type="mca"]').innerText(),/Business Cash Advance/);
 assert.equal(await field('loans.0.type').inputValue(),'Cash Advance');
 await callback(['1000','2000']);await next();assertPayload(lastSave(),['1000','2000']);
 // Resume a captured draft using the original parent serialized value, not a new enum.
 restored=structuredClone(snapshot);restored.fields['application.acceptance']='yes';
 await page.goto('http://127.0.0.1:3016/fact-find.html#resume='+'s'.repeat(40));
 await page.locator('#resume-send').click();await page.locator('#resume-code').fill('123456');
 await page.locator('#resume-code-form button').click();
 await page.waitForFunction(()=>document.getElementById('step-description').textContent.startsWith('Your saved answers'));
 await until('Existing business loans');
 assert.equal(await page.locator('.loan-category .ff-repeat').count(),2);
 assert.equal(await field('loans.0.original').inputValue(),'1000');assert.equal(await field('loans.1.original').inputValue(),'2000');
 await field('loans.1.original').fill('2500');assert.equal(await field('loans.0.original').inputValue(),'1000');
 await page.locator('[data-remove-loan="0"]').click();
 assert.equal(await page.locator('.loan-category .ff-repeat').count(),1);
 assert.equal(await field('loans.0.original').inputValue(),'2500');assert.equal(await field('loans.0.type').inputValue(),'Cash Advance');
 await page.locator('[data-add-loan-type="mca"]').click();await fillLoan(1,'3000');
 await callback(['2500','3000']);await next();assertPayload(lastSave(),['2500','3000']);
 await until('Check and accept');
 const review=page.locator('.ff-review-section').filter({has:page.locator('[data-edit="4"]')});
 await review.locator('summary').click();
 assert.equal((await review.locator('dd').allTextContents()).filter(t=>t==='Business Cash Advance').length,2);
 assert.equal(await field('application.acceptance').isChecked(),false,'resume never restores acceptance');
 await review.locator('[data-edit="4"]').click();await until('Existing business loans');
 await page.locator('[data-remove-loan="1"]').click();await page.locator('[data-remove-loan="0"]').click();
 assert.equal(await field('loanTypes.mca').isChecked(),false);assert.equal(await page.locator('.loan-category').count(),0);
 await field('loanTypes.mca').check();assert.equal(await field('loans.0.type').inputValue(),'Cash Advance');
 assert.equal(calls.filter(c=>c.path==='/enquiries').length,1);
 assert.equal(calls.filter(c=>c.path==='/access/confirm').length,1);
 assert.deepEqual(errors,[]);
 console.log('PASS: original Cash Advance serialization preserved on selection/repeat/save/callback; old draft resume retains two same-lender facilities; independent edit/removal/re-add and review labels verified; acceptance reset and no unexpected endpoint. All API/challenge traffic mocked locally.');
}finally{await browser.close();}
