import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {startReview} from './review-harness.mjs';
const {browser,server}=await startReview(3013);
const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
const base='http://127.0.0.1:3013',field=name=>page.locator(`[name="${name}"]`);
const shotDir='test-results/latest-feedback';await mkdir(shotDir,{recursive:true});
try{
 for(const width of [1440,1100,900,768,390,320]){
  await page.setViewportSize({width,height:950});await page.goto(base+'/');
  const rects=await page.locator('.solution-card').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
  assert.equal(rects.length,8);assert.ok(rects.every(r=>Math.abs(r.w-rects[0].w)<1),'All eight cards must have equal width at '+width);
  assert.ok(rects.every(r=>r.x>=0&&r.x+r.w<=width+1));
  for(const a of rects)for(const b of rects)if(a.y===b.y)assert.ok(Math.abs(a.h-b.h)<1,'Cards in each row share height');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Page overflow at '+width);
  if(width===1440)await page.locator('.solutions-grid').screenshot({path:shotDir+'/services-desktop.png'});
  if(width===390){await page.locator('.solutions-grid').screenshot({path:shotDir+'/services-mobile.png'});await page.locator('.menu-toggle').click();await page.locator('#site-nav .nav-callback').click();assert.equal(await page.locator('#lead-dialog').isVisible(),true);await page.locator('#lead-dialog .close-button').click();}
 }
 await page.setViewportSize({width:1440,height:1000});
 for(const path of ['/fixed-direct-debit-loans.html','/business-finance-calculators.html','/funding-explorer.html']){
  await page.goto(base+path);await page.locator('[data-lead-intent="callback"]').first().click();assert.equal(await page.locator('#lead-dialog').isVisible(),true);await page.locator('#lead-dialog .close-button').click();
 }
 await page.goto(base+'/fact-find.html');assert.equal(await page.locator('text=Find my company').count(),0);
 assert.match(await page.locator('.conversation-tools summary').innerText(),/Already speaking/);
 await field('business.name').fill('Example');await page.waitForTimeout(400);assert.match(await page.locator('[id="company-status-business.name"]').innerText(),/when connected/);
 await page.locator('#ff-example').click();await field('applicant.fullName').fill('Alex Test');await page.locator('.form-callback button').click();
 assert.equal(await page.locator('#lead-name').inputValue(),'Alex Test');assert.equal(await page.locator('#lead-email').inputValue(),'alex@example.invalid');await page.locator('#lead-dialog .close-button').click();
 await page.locator('#ff-next').click();
 for(const option of ['Food retail','Non-food retail'])await field('business.sector').selectOption(option);
 await field('business.sector').selectOption('Other');assert.equal(await field('business.sectorOther').isVisible(),true);
 await page.locator('#ff-next').click();assert.match(await page.locator('#ff-errors').innerText(),/describe your business/);
 await field('business.sectorOther').fill('Bicycle repairs');await page.locator('#ff-next').click();await page.locator('.business-online summary').click();
 const href=await page.locator('#business-web-search').getAttribute('href');assert.ok(new URL(href).searchParams.get('q').includes('Example Trading Ltd'));
 await field('business.website').fill('javascript:alert(1)');await page.locator('#ff-next').click();assert.match(await page.locator('#ff-errors').innerText(),/https/);
 await field('business.website').fill('https://example.invalid');await field('business.googleLink').fill('https://maps.google.com/?cid=123');
 await page.screenshot({path:shotDir+'/business-links-desktop.png',fullPage:true});
 await page.locator('#ff-next').click();
 for(let i=0;i<25&&await page.locator('#step-title').innerText()!=='Check and accept';i++){await page.locator('#ff-next').click();assert.equal(await page.locator('#ff-errors').isVisible(),false);}
 assert.match(await page.locator('#fields').textContent(),/Bicycle repairs/);assert.match(await page.locator('#fields').textContent(),/https:\/\/example.invalid/);
 assert.equal(await page.locator('.inline-terms').isVisible(),true);assert.equal(await page.locator('.terms-links a').filter({hasText:'Full Terms'}).getAttribute('href'),'/terms_conditions.html#application-terms');
 // Mock the protected service to verify the real autocomplete adapter without sending client data.
 const live=await browser.newPage({viewport:{width:390,height:950},hasTouch:true,isMobile:true});live.on('pageerror',error=>errors.push(error.message));let queries=[];
 await live.route('**/runtime-config.js',route=>route.fulfill({contentType:'text/javascript',body:"export const runtime={mode:'live',apiBase:'/api/intake/v1',turnstileSiteKey:'test-key'};"}));
 await live.route('**/api/intake/v1/**',async route=>{
  const req=route.request();if(req.url().endsWith('/session'))return route.fulfill({json:{contract:'pay2day-intake-v1',acceptingEnquiries:true,csrfToken:'csrf-test'}});
  const {query}=req.postDataJSON();queries.push(query);assert.equal(req.headers()['x-csrf-token'],'csrf-test');assert.ok(req.headers()['idempotency-key']);
  if(query==='Slow')await new Promise(r=>setTimeout(r,850));
  if(query==='Broken')return route.fulfill({status:503,json:{message:'Unavailable'}});
  return route.fulfill({json:{items:query==='Missing'?[]:[{name:query==='Evil'?'<img src=x onerror=alert(1)>':'Example Result Ltd '+query,number:'12345678',address:'10 Example Street',postcode:'AB1 2CD'}]}});
 });
 await live.goto(base+'/fact-find.html');const company=live.locator('[name="business.name"]');
 await company.fill('Ex');await live.waitForTimeout(420);assert.deepEqual(queries,[]);
 await company.fill('Exa');await company.fill('Example');await live.locator('.company-matches li').waitFor();assert.deepEqual(queries,['Example']);
 await company.press('ArrowDown');await company.press('Enter');assert.equal(await company.inputValue(),'Example Result Ltd Example');assert.equal(await live.locator('#step-title').innerText(),'Let’s start with you');
 await company.fill('12345678');await live.locator('.company-matches li').waitFor();await live.locator('.company-matches li').tap();assert.equal(await company.inputValue(),'Example Result Ltd 12345678');
 await company.fill('Slow');await live.waitForTimeout(450);await company.fill('Newest');await live.waitForTimeout(1100);assert.match(await live.locator('.company-matches').innerText(),/Newest/);assert.doesNotMatch(await live.locator('.company-matches').innerText(),/Slow/);
 await company.fill('Missing');await live.waitForTimeout(450);assert.match(await live.locator('[id="company-status-business.name"]').innerText(),/No matches/);
 await company.fill('Broken');await live.waitForTimeout(450);assert.match(await live.locator('[id="company-status-business.name"]').innerText(),/couldn’t load/);
 await company.fill('Evil');await live.locator('.company-matches li').waitFor();assert.equal(await live.locator('.company-matches img').count(),0);assert.match(await live.locator('.company-matches').innerText(),/<img/);
 await company.fill('Example');await live.locator('.company-matches li').waitFor();await live.screenshot({path:shotDir+'/company-search-mobile.png',fullPage:true});
 await company.fill('');await live.waitForTimeout(450);assert.equal(await live.locator('.company-matches:visible').count(),0);
 assert.deepEqual(errors,[]);await live.close();
 console.log('PASS: equal service cards at six widths; callback entry points/contact reuse; categories/Other; optional safe URLs; full terms links; company name/number, debounce, keyboard/touch, stale response, error and text-safety checks (mock API).');
}finally{await browser.close();server.kill();}
