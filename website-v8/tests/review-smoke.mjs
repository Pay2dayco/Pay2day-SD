import {startReview} from './review-harness.mjs';
import {readdir,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {browser}=await startReview(3014);
try{
 const page=await browser.newPage(),errors=[],bad=[],writes=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.url());});page.on('request',r=>{if(r.method()!=='GET')writes.push(r.method());});
 const base='http://127.0.0.1:3014',pages=(await readdir('dist')).filter(f=>f.endsWith('.html'));
 assert.equal(pages.length,17);
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:950});
  for(const file of pages){await page.goto(base+'/'+file);await page.waitForTimeout(70);
   assert.match(await page.locator('meta[name=robots]').getAttribute('content'),/noindex/);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),file+' overflow '+width);
   assert.equal(await page.locator('.site-notice').isVisible(),true);
   const assets=await page.locator('img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0));assert.ok(assets,file+' images');
  }
 }
 await page.goto(base+'/fact-find.html');await page.locator('#ff-next').click();assert.equal(await page.locator('#ff-errors').isVisible(),true);
 await page.locator('#ff-example').click();await page.locator('[name="applicant.fullName"]').fill('Synthetic Edited Person');await page.locator('#ff-next').click();await page.locator('#ff-back').click();assert.equal(await page.locator('[name="applicant.fullName"]').inputValue(),'Synthetic Edited Person');
 await page.locator('.form-callback button').click();await page.locator('#lead-submit').click();assert.match(await page.locator('#lead-status').innerText(),/Nothing was sent/i);
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);assert.deepEqual(writes,[]);
 console.log('PASS: all 17 pages at 1440/390/320 px; noindex, preview notice, images, no failed resources/runtime errors; empty validation, back/edit retention, callback non-submission; zero write requests.');
}finally{await browser.close();}
