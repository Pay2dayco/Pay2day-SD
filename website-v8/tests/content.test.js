import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {positioning,routes,validate,assess,contextNotes} from '../public/logic.js';
import {loanCategories,loanDisplayLabel} from '../public/providers.js';
import {termsClauses,termsVersion} from '../public/application-terms.js';

const root=new URL('../public/',import.meta.url);
const approved='Pay2Day Ltd is a UK commercial finance brokerage. Not a lender. Business finance only. Finance subject to provider criteria, status and approval.';
const htmlFiles=readdirSync(root).filter(f=>f.endsWith('.html'));
const source=name=>readFileSync(new URL(name,root),'utf8');
const historicalTermsHash='12cd556b2de3fa112f1f3f54f24beb8932381b0b5d4ba98b98cf52bb37aad575';
function currentCopy(file){
 let text=source(file);
 // Exempt only the exact immutable historical clause strings, not whole policy files.
 if(file==='application-terms.js'||file==='terms_conditions.html'){
  for(const clause of termsClauses){
   text=text.replaceAll(clause,'').replaceAll(clause.replaceAll("'",'&#39;'),'');
  }
 }
 if(file==='providers.js')text=text.replace("['mca','Cash Advance']", "['mca','INTERNAL_VALUE']").replace("type==='Cash Advance'","type==='INTERNAL_VALUE'");
 return text;
}

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
  const text=currentCopy(file);
  assert.doesNotMatch(text,/financial\s+advice|\bunregulated\b/i,file);
  // Internal mca values remain valid. Uppercase display abbreviation is not used.
  assert.doesNotMatch(text,/\bMCA\b/,file);
 }
});

test('product wording is canonical while route and loan category IDs stay compatible',()=>{
 assert.deepEqual(routes.map(r=>r.id),['mca','term','dd','loc','terminal','secured','bridge','mortgage']);
 assert.deepEqual(loanCategories.map(([id])=>id),['bbl','cbils','rls','ggs','mca','other']);
 assert.equal(routes.find(r=>r.id==='mca').name,'Business Cash Advance');
 assert.equal(loanCategories.find(([id])=>id==='mca')[1],'Cash Advance');
 assert.equal(loanDisplayLabel('Cash Advance'),'Business Cash Advance');
 for(const value of ['BBL','CBILS','RLS','GGS','Other','CASH_ADVANCE','OTHER'])assert.equal(loanDisplayLabel(value),value);
 for(const file of readdirSync(root).filter(f=>/\.(html|js)$/.test(f))){
  for(const match of currentCopy(file).matchAll(/\b(?:(?:merchant|business) )?cash advances?\b/gi)){
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

test('versioned terms remain byte-for-byte parent text with an identical public clause list',()=>{
 assert.equal(createHash('sha256').update(source('application-terms.js').replaceAll('\r\n','\n')).digest('hex'),historicalTermsHash);
 assert.equal(termsClauses.length,12);assert.equal(termsVersion,'2026-09-24-fact-find-1');
 const terms=source('terms_conditions.html').replaceAll('&#39;',"'");
 const list=terms.match(/<section id="application-terms">[\s\S]*?<ol>([\s\S]*?)<\/ol>/)[1];
 assert.deepEqual([...list.matchAll(/<li><p>([\s\S]*?)<\/p><\/li>/g)].map(m=>m[1]),termsClauses);
 assert.match(termsClauses[7],/I\/We consent/);
 assert.match(termsClauses[10],/business cash advance/);
});

test('preview source remains noindex and non-live',()=>{
 for(const file of htmlFiles)assert.match(source(file),/<meta content="noindex,nofollow" name="robots"\/>/,file);
 assert.match(source('runtime-config.js'),/mode\s*:\s*['"]preview['"]/);
 assert.match(source('runtime-config.js'),/turnstileSiteKey\s*:\s*['"]['"]/);
});
