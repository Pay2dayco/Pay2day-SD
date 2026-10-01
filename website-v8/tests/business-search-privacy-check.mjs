import assert from 'node:assert/strict';
import {startReview} from './review-harness.mjs';
const {browser}=await startReview(3022);
let cases=0;
try{
 console.log('Node '+process.version+'; browser '+browser.version());
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const f=n=>page.locator('[name="'+n+'"]');
  const values={'business.website':'https://website.example.invalid/synthetic','business.googleLink':'https://listing.example.invalid/synthetic'};
  async function next(){await page.locator('#ff-next').click();assert.equal(await page.locator('#ff-errors').isVisible(),false);}
  await page.goto('http://127.0.0.1:3022/fact-find.html');await page.locator('#ff-example').click();
  await f('business.name').fill('Synthetic Privacy Business');await next();await next();await f('business.differentName').selectOption('yes');await f('business.tradingName').fill('Synthetic Trading');
  await f('business.registered.postcode').fill('AB1 2CD');await page.locator('.business-online summary').click();
  if(process.argv.includes('--negative-control'))await page.locator('.business-online').evaluate(e=>{const a=document.createElement('a');a.href='https://search.example.invalid/?q=synthetic';a.textContent='Synthetic search';e.append(a);});
  assert.equal(await page.locator('.business-online a, #business-web-search').count(),0,'outbound search anchor absent');
  for(const [key,value]of Object.entries(values)){await f(key).fill('javascript:synthetic');await page.locator('#ff-next').click();assert.equal(await page.locator('#ff-errors').isVisible(),true);await f(key).fill(value);}
  await next();await page.locator('#ff-back').click();await page.locator('.business-online summary').click();
  for(const [key,value]of Object.entries(values))assert.equal(await f(key).inputValue(),value);
  await next();
  for(let i=0;i<35&&await page.locator('#step-title').innerText()!=='Check and accept';i++)await next();
  assert.equal(await page.locator('#step-title').innerText(),'Check and accept');
  for(const value of Object.values(values))assert.ok((await page.locator('#fields').textContent()).includes(value));
  // Return through the existing back navigation, edit, then verify the review updates.
  for(let i=0;i<35&&await page.locator('.business-online').count()===0;i++)await page.locator('#ff-back').click();
  await page.locator('.business-online summary').click();
  for(const [key,value]of Object.entries(values)){assert.equal(await f(key).inputValue(),value);await f(key).fill(value+'-edited');}
  for(let i=0;i<35&&await page.locator('#step-title').innerText()!=='Check and accept';i++)await next();
  for(const value of Object.values(values))assert.ok((await page.locator('#fields').textContent()).includes(value+'-edited'));
  assert.deepEqual(errors,[]);await page.close();cases++;
 }
 console.log('PASS: '+cases+' viewports; both optional URL fields, invalid-scheme validation, back retention, review/back-edit and no search anchor. No external requests.');
}finally{await browser.close();}
