import assert from 'node:assert/strict';
import {startReview} from './review-harness.mjs';
const {browser}=await startReview(3018);
try{
 const page=await browser.newPage(),errors=[],calls=[];page.on('pageerror',e=>errors.push(e.message));
 let mode='ok',release,revision=0;
 async function pendingRequest(){for(let i=0;!release&&i<1000;i++)await new Promise(r=>setTimeout(r,10));assert.ok(release,'mock request arrived within ten seconds');}
 await page.route('**/runtime-config.js',r=>r.fulfill({contentType:'text/javascript',body:"export const runtime={mode:'live',apiBase:'/api/intake/v1',turnstileSiteKey:'test-site-key'};"}));
 await page.route('https://challenges.cloudflare.com/**',r=>r.fulfill({contentType:'text/javascript',body:"window.turnstile={render:(c,o)=>{queueMicrotask(()=>o.callback('test-token'));return 1;},remove:()=>{}};"}));
 await page.route('**/api/intake/v1/**',async r=>{
  const request=r.request(),path=new URL(request.url()).pathname.split('/v1')[1];
  if(path==='/session')return r.fulfill({json:{contract:'pay2day-intake-v1',acceptingEnquiries:true,csrfToken:'test-csrf'}});
  assert.equal(request.headers()['x-csrf-token'],'test-csrf');assert.ok(request.headers()['idempotency-key']);
  if(path==='/lookups/companies')return r.fulfill({json:{items:[]}});
  calls.push({path,body:request.postDataJSON(),key:request.headers()['idempotency-key']});
  if(path==='/enquiries')return r.fulfill({json:{applicationId:'synthetic-ux',revision:++revision}});
  assert.ok(['/draft/save','/callback/request'].includes(path),'unexpected write '+path);
  if(mode!=='ok'){await new Promise(resolve=>release=resolve);return r.fulfill({status:503,json:{}}).catch(()=>{});}
  return r.fulfill({json:{revision:++revision}});
 });
 await page.goto('http://127.0.0.1:3018/fact-find.html');await page.locator('#ff-example').evaluate(e=>e.click());
 await page.locator('#ff-next').click();await page.waitForFunction(()=>!document.getElementById('ff-next').disabled);
 assert.equal(await page.locator('#step-title').innerText(),'Business details');
 await page.locator('[name="business.name"]').fill('Synthetic retained business');
 for(const failure of ['503','timeout']){
  mode=failure;release=null;const before=calls.length;await page.locator('#ff-next').click();
  await page.waitForFunction(()=>document.getElementById('ff-next').disabled);await pendingRequest();
  await page.locator('#fact-form').evaluate(f=>{f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
  await page.locator('#ff-back').click();assert.equal(await page.locator('#step-title').innerText(),'Business details');
  if(failure==='503')release();
  await page.waitForFunction(()=>!document.getElementById('ff-next').disabled,{},{timeout:25000});
  if(failure==='timeout')release();
  assert.equal(calls.length,before+1,'no duplicate save while busy');assert.equal(calls.at(-1).path,'/draft/save');
  assert.equal(await page.locator('#step-title').innerText(),'Business details');assert.equal(await page.locator('[name="business.name"]').inputValue(),'Synthetic retained business');
  assert.ok(await page.locator('#ff-errors').isVisible());assert.ok(await page.locator('#ff-errors').evaluate(e=>e===document.activeElement));assert.ok(await page.locator('#ff-end').isHidden());
  console.log('PASS: '+failure+' draft failure retains values/location, focuses error, reenables Continue; busy submit/back does not advance or duplicate requests.');
 }
 assert.equal(calls.filter(c=>c.path==='/enquiries').length,1);assert.equal(calls.at(-1).key,calls.at(-2).key);
 const opener=page.locator('.form-callback button');await opener.click();
 for(const failure of ['503','timeout']){
  mode=failure;release=null;const before=calls.length;await page.locator('#lead-submit').click();await pendingRequest();
  await page.locator('#lead-form').evaluate(f=>{f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
  if(failure==='503')release();await page.waitForFunction(()=>!document.getElementById('lead-submit').disabled,{},{timeout:25000});if(failure==='timeout')release();
  assert.equal(calls.length,before+1);assert.equal(calls.at(-1).path,'/callback/request');assert.equal(await page.locator('#lead-business').inputValue(),'Synthetic retained business');
  assert.ok((await page.locator('#lead-status').innerText()).length>0);assert.equal(await page.locator('#lead-status').getAttribute('role'),'status');assert.ok(await page.locator('#lead-dialog').isVisible());assert.equal(await page.locator('#step-title').innerText(),'Business details');assert.ok(await page.locator('#ff-end').isHidden());
  console.log('PASS: '+failure+' callback failure retains fields/dialog, exposes status and reenables Submit; no duplicate mock request.');
 }
 assert.equal(calls.at(-1).key,calls.at(-2).key);await page.keyboard.press('Escape');assert.ok(await opener.evaluate(e=>e===document.activeElement));
 assert.deepEqual(errors,[]);console.log('PASS: only local intercepted synthetic requests; actual client 20-second abort timers, no production calls or automatic retries.');
}finally{await browser.close();}
