import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {positioning,routes,validate,assess,contextNotes} from '../public/logic.js';
import {loanCategories} from '../public/providers.js';
import {termsClauses,termsVersion} from '../public/application-terms.js';

const root=new URL('../public/',import.meta.url);
const approved='Pay2Day Ltd is a UK commercial finance brokerage. Not a lender. Business finance only. Finance subject to provider criteria, status and approval.';
const htmlFiles=readdirSync(root).filter(f=>f.endsWith('.html'));
const source=name=>readFileSync(new URL(name,root),'utf8');

test('all 17 pages use the exact approved footer and organisation description',()=>{
 assert.equal(htmlFiles.length,17);
 for(const file of htmlFiles){
  const html=source(file);
  assert.equal(html.match(/<p class="broker-statement">([^<]+)<\/p>/)?.[1],approved,file);
  const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(schema.description,approved,file);
 }
});

test('public HTML and dynamic modules contain no obsolete advice or regulatory copy',()=>{
 for(const file of readdirSync(root).filter(f=>/\.(html|js)$/.test(f))){
  const text=source(file);
  assert.doesNotMatch(text,/financial\s+advice|\bunregulated\b/i,file);
  // Internal mca values remain valid. Uppercase display abbreviation is not used.
  assert.doesNotMatch(text,/\bMCA\b/,file);
 }
});

test('product wording is canonical while route and loan category IDs stay compatible',()=>{
 assert.deepEqual(routes.map(r=>r.id),['mca','term','dd','loc','terminal','secured','bridge','mortgage']);
 assert.deepEqual(loanCategories.map(([id])=>id),['bbl','cbils','rls','ggs','mca','other']);
 assert.equal(routes.find(r=>r.id==='mca').name,'Business Cash Advance');
 assert.equal(loanCategories.find(([id])=>id==='mca')[1],'Business Cash Advance');
 for(const file of readdirSync(root).filter(f=>/\.(html|js)$/.test(f))){
  for(const match of source(file).matchAll(/\b(?:(?:merchant|business) )?cash advances?\b/gi)){
   assert.match(match[0],/^Business Cash Advances?$/,file);
  }
 }
 assert.ok(htmlFiles.includes('merchant-cash-advance.html'),'legacy route retained');
});

test('dynamic positioning and scope warnings retain review requirements',()=>{
 assert.equal(positioning,approved);
 const input={amount:'25000',purpose:'stock',repayment:'sales',uk:'yes',entity:'sole',trading:'2plus',turnover:'30000',pattern:'steady',cards:'no',propertyOwner:'yes'};
 const {data,errors}=validate(input);assert.deepEqual(errors,[]);
 for(const route of assess(data)){
  assert.equal(route.status,'Scope check needed');assert.equal(route.score,0);
  assert.match(route.reason,/must first confirm/);assert.doesNotMatch(route.reason,/unregulated/i);
 }
 assert.match(contextNotes(data)[0].text,/Business purpose alone does not establish regulatory status/);
});

test('application terms retain all clauses and matching public wording',()=>{
 assert.equal(termsClauses.length,12);assert.equal(termsVersion,'2026-09-24-fact-find-1');
 const terms=source('terms_conditions.html').replaceAll('&#39;',"'");
 for(const clause of termsClauses)assert.ok(terms.includes(clause),'public and inline terms must agree');
 assert.match(termsClauses[7],/I\/We consent/);
 assert.match(termsClauses[10],/Business Cash Advance/);
});

test('preview source remains noindex and non-live',()=>{
 for(const file of htmlFiles)assert.match(source(file),/<meta content="noindex,nofollow" name="robots"\/>/,file);
 assert.match(source('runtime-config.js'),/mode\s*:\s*['"]preview['"]/);
 assert.match(source('runtime-config.js'),/turnstileSiteKey\s*:\s*['"]['"]/);
});
