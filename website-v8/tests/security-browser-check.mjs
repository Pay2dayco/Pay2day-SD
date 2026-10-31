import assert from 'node:assert/strict';
import {startReview} from './review-harness.mjs';
const base='http://127.0.0.1:3021';
let normalChecks=0,blockedChecks=0;
{
 const {browser}=await startReview(3021);
 try{
  console.log('Browser '+browser.version()+'; Node '+process.version);
  const page=await browser.newPage();const errors=[],writes=[];
  page.on('pageerror',()=>errors.push('pageerror'));page.on('request',r=>{if(r.method()!=='GET')writes.push('write');});
  await page.goto(base+'/fact-find.html');
  const result=await page.evaluate(async()=>{const m=await import('/intake-client.js');let rejected=false;try{await m.request('/enquiries',{email:'synthetic@example.invalid'});}catch{rejected=true;}return {preview:m.preview,connected:await m.connect(),challenge:await m.challenge('#synthetic','enquiry'),rejected};});
  assert.deepEqual(result,{preview:true,connected:null,challenge:'',rejected:true});normalChecks++;
  await page.locator('#ff-example').evaluate(e=>e.click());
  await page.locator('[name="business.name"]').fill('SYNTHETIC_MEMORY_ONLY');
  assert.deepEqual(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length,search:location.search,cookie:document.cookie})),{local:0,session:0,search:'',cookie:''});normalChecks++;
  await page.reload();assert.notEqual(await page.locator('[name="business.name"]').inputValue(),'SYNTHETIC_MEMORY_ONLY');normalChecks++;
  for(const kind of ['invite','resume','review']){
   await page.goto('about:blank'); // Fresh link load, not same-document hash navigation.
   await page.goto(base+'/fact-find.html#'+kind+'=SYNTHETIC_NOT_A_TOKEN_000000000000000000');
   await page.waitForFunction(()=>location.hash==='');
   assert.equal(new URL(page.url()).search,'');
   assert.deepEqual(await page.evaluate(()=>[localStorage.length,sessionStorage.length]),[0,0]);normalChecks++;
  }
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
 }finally{await browser.close();}
}
// Each probe gets a fresh harness and must trigger its own expected close assertion.
// These are forbidden attempts, not real network contacts: targets are loopback/.invalid.
for(const kind of ['external','api-get','post','websocket']){
 const {browser}=await startReview(3021);let expected=false;
 try{
  const page=await browser.newPage();await page.goto(base+'/fact-find.html');
  const settled=await page.evaluate(async kind=>{
   if(kind==='websocket')return new Promise(resolve=>{const w=new WebSocket('wss://synthetic.invalid/socket');w.onclose=()=>resolve(true);w.onerror=()=>resolve(true);setTimeout(()=>resolve(false),3000);});
   try{await fetch(kind==='external'?'https://synthetic.invalid/probe':kind==='api-get'?'/api/synthetic':'/synthetic',{method:kind==='post'?'POST':'GET'});return false;}catch{return true;}
  },kind);
  assert.equal(settled,true,'probe must be rejected');
 }finally{
  try{await browser.close();}catch(e){if(e.code==='ERR_ASSERTION'&&e.message.includes('Unexpected network attempt blocked'))expected=true;else throw e;}
 }
 assert.equal(expected,true,'harness must detect forbidden '+kind);blockedChecks++;
}
{
 const {browser}=await startReview(3021);
 try{
  const page=await browser.newPage();await page.goto(base+'/fact-find.html');
  // Serve a synthetic worker locally only if browser requests it; blocked SW policy should not.
  let fetched=false;await page.route('**/synthetic-worker.js',r=>{fetched=true;return r.fulfill({contentType:'text/javascript',body:'self.addEventListener("fetch",()=>{});'});});
  await page.evaluate(()=>navigator.serviceWorker.register('/synthetic-worker.js').catch(()=>null));
  assert.equal(fetched,false);assert.equal(page.context().serviceWorkers().length,0);blockedChecks++;
 }finally{await browser.close();}
}
console.log(JSON.stringify({normalChecks,blockedChecks}));
console.log('PASS: preview API/challenge suppression, memory-only synthetic answers, fragment clearing and five harness isolation probes.');
