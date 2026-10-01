import assert from 'node:assert/strict';
import {startReview} from './review-harness.mjs';
import {widths} from './field-fixtures.mjs';

// Supplement existing UX/field suites; no production scripts or styles are changed.
const negative=process.argv.includes('--negative-control');
const {browser}=await startReview(3020);
const errors=[],writes=[],zoomEvidence=[];
let groups=0,tabStops=0;
try{
 console.log('Browser '+browser.version()+'; Node '+process.version);
 for(const width of widths){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.method()!=='GET')writes.push(r.method());});
  const base='http://127.0.0.1:3020',f=n=>page.locator('[name="'+n+'"]');
  async function focusVisible(){
   assert.ok(await page.evaluate(()=>{
    const e=document.activeElement,r=e.getBoundingClientRect(),s=getComputedStyle(e);
    return r.width>0&&r.height>0&&s.visibility!=='hidden'&&
     ((s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0)||s.boxShadow!=='none');
   }),'visible focus indicator at '+width);tabStops++;
  }
  async function tabTo(selector){
   const target=page.locator(selector);
   for(let i=0;i<160;i++){
    if(await target.evaluate(e=>e===document.activeElement)){await focusVisible();return;}
    await page.keyboard.press('Tab');
   }
   throw Error('Keyboard target unreachable: '+selector+' at '+width);
  }
  async function bounds(selector){
   assert.deepEqual(await page.locator(selector).evaluateAll(es=>es.filter(e=>{
    const r=e.getBoundingClientRect();return r.width&&r.height&&(r.left < -1||r.right>innerWidth+1);
   }).map(e=>e.id||e.tagName)),[],'horizontal clipping '+selector+' '+width);
  }
  async function descriptions(){
   assert.deepEqual(await page.locator('[aria-describedby]').evaluateAll(es=>es.filter(e=>e.getClientRects().length).flatMap(e=>
    (e.getAttribute('aria-describedby')||'').split(/\s+/).filter(id=>id&&!document.getElementById(id)))),[],'dangling description at '+width);
  }
  // Keyboard-only Explorer traversal and input from the first form control to results.
  await page.goto(base+'/funding-explorer.html');
  await tabTo('#amount');await page.keyboard.insertText('25000');
  async function selectByKeyboard(id,value){
   await tabTo('#'+id);
   const index=await page.locator('#'+id).evaluate((e,v)=>[...e.options].findIndex(o=>o.value===v),value);
   assert.ok(index>=0);await page.keyboard.press('Home');
   for(let i=0;i<index;i++)await page.keyboard.press('ArrowDown');
   await page.keyboard.press('Tab');assert.equal(await page.locator('#'+id).inputValue(),value);
  }
  await selectByKeyboard('purpose','stock');await selectByKeyboard('repayment','sales');
  await tabTo('#explorer-next');await page.keyboard.press('Enter');
  for(const [id,value]of Object.entries({uk:'yes',entity:'limited',trading:'2plus',pattern:'steady'}))await selectByKeyboard(id,value);
  await tabTo('#turnover');await page.keyboard.insertText('30000');await selectByKeyboard('cards','no');
  await tabTo('#explorer-next');await page.keyboard.press('Enter');
  await selectByKeyboard('propertyOwner','no');await tabTo('#explore-submit');await page.keyboard.press('Enter');
  await descriptions();await bounds('#funding-form, #amount, #route-list');
  assert.ok(await page.locator('#route-list').isVisible());groups++;

  // Fact-Find fixture setup reuses the reviewed synthetic example, then keyboard navigation.
  await page.goto(base+'/fact-find.html');await page.locator('#ff-example').evaluate(e=>e.click());
  async function next(){await page.locator('#ff-next').click();assert.equal(await page.locator('#ff-errors').isVisible(),false);}
  for(let i=0;i<35&&await page.locator('#step-title').innerText()!=='Existing business loans';i++)await next();
  assert.equal(await page.locator('#step-title').innerText(),'Existing business loans');
  await f('questions.loans').selectOption('yes');await f('loanTypes.other').check();
  const long='Synthetic lender and Other facility description '.repeat(8).slice(0,180).trim();
  for(const [key,value]of Object.entries({original:'10000',outstanding:'0',lender:long,otherType:long}))await f('loans.0.'+key).fill(value);
  await descriptions();await bounds('#fact-form, #fields input, #fields select, #fields textarea');
  await page.locator('[data-add-loan-type="other"]').focus();await page.keyboard.press('Enter');
  assert.ok(await f('loans.1.original').evaluate(e=>e===document.activeElement));await focusVisible();
  await page.locator('[data-remove-loan="1"]').focus();await page.keyboard.press('Enter');
  assert.equal(await f('loans.0.lender').inputValue(),long);
  await next();await page.locator('#ff-back').focus();await page.keyboard.press('Enter');
  assert.equal(await f('loans.0.lender').inputValue(),long);assert.equal(await f('loans.0.otherType').inputValue(),long);groups++;

  // Fresh error view: original shared harness covers targeted fields at both zoom levels.
  // This adds an explicit malformed description control and reports outer overflow separately.
  await page.goto(base+'/fact-find.html');await page.locator('#ff-next').focus();await page.keyboard.press('Enter');
  assert.ok(await page.locator('#ff-errors').evaluate(e=>e===document.activeElement));
  if(negative)await f('business.name').evaluate(e=>e.setAttribute('aria-describedby','synthetic-missing-description'));
  await descriptions();
  await page.keyboard.press('Tab');await focusVisible();await page.keyboard.press('Enter');
  assert.ok(await f('business.name').evaluate(e=>e===document.activeElement));await focusVisible();
  await page.evaluate(()=>document.documentElement.style.zoom='2');
  await bounds('#fact-form, #fields input, #fields select');
  zoomEvidence.push({width,cssZoom:2,outerOverflow:await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth))});
  await page.evaluate(()=>document.documentElement.style.zoom='1');groups++;

  // Details and callback focus at every width, without submitting any data.
  await page.goto(base+'/funding-explorer.html');
  const summary=page.locator('.faq-list summary').first();await summary.focus();await page.keyboard.press('Enter');
  assert.equal(await summary.evaluate(e=>e.parentElement.open),true);await focusVisible();
  await page.keyboard.press('Enter');assert.equal(await summary.evaluate(e=>e.parentElement.open),false);
  await page.goto(base+'/fact-find.html');const opener=page.locator('.form-callback button');
  await opener.focus();await page.keyboard.press('Enter');await page.locator('#lead-dialog').waitFor();
  for(let i=0;i<10;i++){await page.keyboard.press('Tab');assert.ok(await page.locator('#lead-dialog').evaluate(e=>e.contains(document.activeElement)||!document.hasFocus()));}
  await page.keyboard.press('Escape');await page.locator('#lead-dialog').waitFor({state:'detached'});
  assert.ok(await opener.evaluate(e=>e===document.activeElement));await focusVisible();groups++;
  await page.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
 console.log(JSON.stringify({groups,tabStops,zoomEvidence,writeRequests:writes.length}));
 console.log('PASS: 20 supplementary journey/width groups; keyboard Explorer, visible focus, long repeat values/back retention, descriptions, details/dialog return and bounded CSS zoom.');
}finally{await browser.close();}
