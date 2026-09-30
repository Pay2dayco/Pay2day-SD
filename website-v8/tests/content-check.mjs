import assert from 'node:assert/strict';
import {readdir,mkdir} from 'node:fs/promises';
import {startReview} from './review-harness.mjs';

const approved='Pay2Day Ltd is a UK commercial finance brokerage. Not a lender. Business finance only. Finance subject to provider criteria, status and approval.';
const {browser}=await startReview(3015);
try{
 const page=await browser.newPage(),errors=[],bad=[],writes=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)bad.push(r.url());});
 page.on('request',r=>{if(r.method()!=='GET')writes.push(r.method());});
 const base='http://127.0.0.1:3015',pages=(await readdir('dist')).filter(f=>f.endsWith('.html'));
 assert.equal(pages.length,17);
 await mkdir('test-results/content',{recursive:true});
 async function checkView(label){
  assert.doesNotMatch(await page.locator('body').innerText(),/\bmca\b|\bunregulated\b|financial\s+advice/i,label);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+' overflow');
 }
 async function next(){
  await page.locator('#ff-next').click();
  if(await page.locator('#ff-errors').isVisible())throw Error('Synthetic journey validation failed');
 }
 for(const width of [320,390,768,1024,1440]){
  await page.setViewportSize({width,height:1000});
  for(const file of pages){
   await page.goto(base+'/'+file);
   await page.waitForTimeout(60);
   assert.equal(await page.locator('.broker-statement').innerText(),approved,file);
   assert.match(await page.locator('meta[name=robots]').getAttribute('content'),/noindex/);
   assert.ok(await page.locator('.site-notice').isVisible());
   await checkView(file+' '+width);
  }
  await page.goto(base+'/business-finance-calculators.html');
  for(const tab of ['loan','advance','fixed']){
   await page.locator('#tab-'+tab).click();await checkView('calculator '+tab+' '+width);
   assert.doesNotMatch(await page.locator('#calc-assumptions').innerText(),/financial advice/i);
  }
  await page.goto(base+'/funding-explorer.html');
  assert.match(await page.locator('#route-list').innerText(),/Business Cash Advance/);
  await page.locator('#amount').fill('25000');await page.locator('#purpose').selectOption('stock');
  await page.locator('#repayment').selectOption('sales');await page.locator('#explorer-next').click();
  for(const [id,value] of Object.entries({uk:'yes',entity:'sole',trading:'2plus',pattern:'steady',cards:'no'}))await page.locator('#'+id).selectOption(value);
  await page.locator('#turnover').fill('30000');await page.locator('#explorer-next').click();
  await page.locator('#propertyOwner').selectOption('yes');await page.locator('#explore-submit').click();
  assert.match(await page.locator('#route-list').innerText(),/Scope check needed/);
  await checkView('Explorer scope '+width);
  await page.locator('[data-select="mca"]').check();await page.locator('[data-select="term"]').check();
  await page.locator('#compare').click();
  assert.equal(await page.locator('#compare-dialog .dialog-disclaimer').innerText(),approved);
  assert.match(await page.locator('#comparison-table').innerText(),/Business Cash Advance/);
  await checkView('comparison '+width);await page.locator('#close-dialog').click();
  await page.locator('#share-results').click();
  const summary=await page.locator('#share-text').inputValue();
  assert.ok(summary.includes(approved));assert.match(summary,/BUSINESS CASH ADVANCE/);
  assert.doesNotMatch(summary,/\bmca\b|unregulated|financial advice/i);
  await page.screenshot({path:`test-results/content/summary-${width}.png`,fullPage:true});
  await page.goto(base+'/fact-find.html');await page.locator('#ff-example').click();
  for(let step=0;step<35;step++){
   const title=await page.locator('#step-title').innerText();
   if(title==='Existing business loans'){
    await page.locator('[name="questions.loans"]').selectOption('yes');
    await page.locator('[name="loanTypes.mca"]').check();
    assert.match(await page.locator('.loan-types').innerText(),/Business Cash Advance/);
    for(const [key,value] of Object.entries({original:'10000',outstanding:'5000',lender:'Synthetic Lender'}))await page.locator(`[name="loans.0.${key}"]`).fill(value);
   }
   if(await page.locator('[name="financial.turnoverChecked"]').count())await page.locator('[name="financial.turnoverChecked"]').selectOption('yes');
   if(title==='Check and accept')break;
   await next();
  }
  assert.equal(await page.locator('#step-title').innerText(),'Check and accept');
  const loanReview=page.locator('.ff-review-section').filter({has:page.locator('[data-edit="4"]')});
  await loanReview.locator('summary').click();
  assert.ok((await loanReview.locator('dd').allTextContents()).includes('Business Cash Advance'));
  assert.ok((await page.locator('#fields').innerText()).includes(approved));
  await checkView('Fact-Find terms '+width);
  await page.screenshot({path:`test-results/content/terms-${width}.png`,fullPage:true});
  for(const name of ['businessUse','noPropertyPurchase','acceptance'])await page.locator(`[name="application.${name}"]`).check();
  await next();assert.match(await page.locator('#ff-end').innerText(),/nothing has been sent or saved/i);
  assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
 }
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);assert.deepEqual(writes,[]);
 console.log('PASS: 17 pages at 320/390/768/1024/1440; exact brokerage copy, product labels, calculator tabs, scope results, comparison/download text, synthetic Business Cash Advance Fact-Find/terms and non-submission. No runtime/resource errors, overflow, storage or write requests.');
}finally{await browser.close();}
