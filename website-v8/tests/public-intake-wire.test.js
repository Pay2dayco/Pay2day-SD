import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,mkdtempSync,cpSync,rmSync} from 'node:fs';
import {resolve,join,relative,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import fixture from './fixtures/public-intake-wire-001.json' with {type:'json'};
import {describeBootstrap,describeDraft,inspectObservedResponse} from '../integration/public-intake-wire.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const canonical=JSON.parse(fixture.canonicalSource);
const opaque=fixture.synthetic.opaqueCharacter.repeat(43);
const bootstrap=()=>({turnstile_token:fixture.synthetic.humanToken});
const draft=()=>({application_ref:opaque,session_token:opaque,revision:0,fields:structuredClone(fixture.synthetic.fields)});
const response=()=>({status:'created',application_ref:opaque,session_token:opaque,revision:0,expires_at:fixture.synthetic.expiry});
const diagnostic=(op,status,json)=>inspectObservedResponse(op,status,json).diagnostics[0];
const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
test('wire pins and full 174-path schema have exact source Git blob',()=>{
 assert.equal(fixture.websiteHead,'99c3d304f5c99734452e21e3d5cb92f86f9fecc0');assert.equal(fixture.apiHead,'17583e394e279999f308262d29f7e6ffa01e4dc2');
 const raw=Buffer.from(fixture.canonicalSource);assert.equal(createHash('sha1').update(Buffer.from('blob '+raw.length+'\0')).update(raw).digest('hex'),fixture.canonicalBlob);
 assert.equal(fixture.canonicalBlob,'2e0f380a0edeb67b4fbd1036cbb7a2cae6cc27ea');assert.equal(canonical.fields.length,174);assert.equal(new Set(canonical.fields.map(f=>f.path)).size,174);
 assert.equal(fixture.sources.length,6);assert.ok(fixture.sources.every(s=>/^[a-f0-9]{40}$/.test(s.blob)));
 assert.deepEqual(fixture.limits,{maxBodyBytes:16384,jsonDecoderDepth:8,maxFields:200,maxHumanTokenBytes:2048,opaqueLength:43});
});
test('bootstrap exact descriptor, no state or input mutation',()=>{
 const input=bootstrap(),before=structuredClone(input),out=describeBootstrap(input);
 assert.deepEqual(out,{method:'POST',path:'/api/website-intake/bootstrap',headers:{'Content-Type':'application/json',Accept:'application/json'},body:before});assert.deepEqual(input,before);
 out.body.turnstile_token='changed';assert.deepEqual(describeBootstrap(input).body,before);
});
test('draft exact observed descriptor preserves null, empty, zero and omission',()=>{
 const input=draft(),before=structuredClone(input),out=describeDraft(input);
 assert.equal(out.method,'POST');assert.equal(out.path,'/api/website-intake/draft');assert.deepEqual(out.body,before);assert.deepEqual(input,before);
 assert.equal(out.body.fields['funding.amount'],0);assert.equal(out.body.fields['property.debt'],null);assert.equal(out.body.fields['business.website'],'');assert.ok(!Object.hasOwn(out.body.fields,'business.number'));
 out.body.fields['business.name']='changed';assert.deepEqual(input,before);assert.deepEqual(describeDraft(input).body,before);
});
for(const field of canonical.fields){
 test('canonical template '+field.path,()=>{const path=field.path.split('.').map(p=>p==='i'?'3':p==='j'?'2':p).join('.');const input=draft();input.fields={[path]:null};assert.deepEqual(describeDraft(input).body.fields,input.fields);});
}
for(const [name,input]of [['missing',{}],['extra',{...bootstrap(),email:'synthetic@example.invalid'}],['empty',{turnstile_token:''}],['type',{turnstile_token:1}],['too many bytes',{turnstile_token:'é'.repeat(1025)}],['array',[]],['null',null]])test('bootstrap rejects '+name,()=>assert.throws(()=>describeBootstrap(input),TypeError));
test('bootstrap exact token UTF-8 byte boundary',()=>{assert.equal(bytes(describeBootstrap({turnstile_token:'é'.repeat(1024)}).body)>2048,true);assert.throws(()=>describeBootstrap({turnstile_token:'x'.repeat(2049)}),/human-token-shape/);});
for(const [name,mutate]of [
 ['missing credentials',x=>delete x.session_token],['short token',x=>x.session_token='x'.repeat(42)],['padding',x=>x.application_ref='='.repeat(43)],['number credential',x=>x.session_token=0],
 ['negative revision',x=>x.revision=-1],['fraction revision',x=>x.revision=1.5],['unsafe revision',x=>x.revision=Number.MAX_SAFE_INTEGER+1],['string revision',x=>x.revision='0'],
 ['navigation metadata',x=>x.section='Business'],['counts metadata',x=>x.counts={owners:1}],['empty fields',x=>x.fields={}],['array fields',x=>x.fields=[]],
 ['unknown path',x=>x.fields={'unknown.answer':'x'}],['literal template',x=>x.fields={'owners.i.first':'x'}],['negative child',x=>x.fields={'owners.-1.first':'x'}],
 ['boolean field',x=>x.fields={'application.acceptance':true}],['object field',x=>x.fields={'business.name':{value:'x'}}],['undefined',x=>x.fields={'business.name':undefined}],['nonfinite',x=>x.fields={'funding.amount':Infinity}],['unsafe number',x=>x.fields={'funding.amount':Number.MAX_SAFE_INTEGER+1}]
])test('draft rejects '+name,()=>{const input=draft();mutate(input);assert.throws(()=>describeDraft(input),TypeError);});
test('field count exact 200 and 201; no chunking or silent drops',()=>{
 const input=draft();input.fields=Object.fromEntries(Array.from({length:200},(_,i)=>['owners.'+i+'.first',null]));assert.equal(Object.keys(describeDraft(input).body.fields).length,200);input.fields['owners.200.first']=null;assert.throws(()=>describeDraft(input),/field-count/);
});
test('UTF-8 request-byte boundary is exact, no truncation/normalisation',()=>{
 // Serialization probe only, not a claim of canonical business-value validity.
 const input=draft();input.fields={'business.name':''};const overhead=bytes(input);input.fields['business.name']='x'.repeat(16384-overhead);assert.equal(bytes(describeDraft(input).body),16384);
 input.fields['business.name']+='x';assert.throws(()=>describeDraft(input),/json-size/);input.fields['business.name']='é'.repeat(9000);assert.throws(()=>describeDraft(input),/json-size/);
});
test('accessors and exotic shapes are refused without executing getters',()=>{
 let calls=0;const input=draft();Object.defineProperty(input,'revision',{enumerable:true,get(){calls++;throw Error('private');}});assert.throws(()=>describeDraft(input),/object-shape/);assert.equal(calls,0);
 const f=draft();Object.defineProperty(f.fields,'business.name',{enumerable:true,get(){calls++;return 'private';}});assert.throws(()=>describeDraft(f),/object-shape/);assert.equal(calls,0);
 assert.throws(()=>describeBootstrap(new Date()),/object-shape/);const symbol=bootstrap();symbol[Symbol('private')]='private';assert.throws(()=>describeBootstrap(symbol),/object-shape/);
});
test('valid observed envelopes produce only fixed diagnostics, never business state',()=>{
 assert.equal(diagnostic('bootstrap',200,response()),'bootstrap-envelope-observed');assert.equal(diagnostic('draft',200,{status:'saved',revision:1,saved_fields:1}),'draft-envelope-observed');
 assert.deepEqual(inspectObservedResponse('bootstrap',200,response()),{profile:'API-PR162-observation-only',diagnostics:['bootstrap-envelope-observed']});
 assert.equal(diagnostic('draft',409,{status:'error',error:'synthetic private',message:'synthetic private',error_code:'PI-REV-01',current_revision:2}),'error-envelope-observed');
 assert.equal(diagnostic('bootstrap',404,{status:'error',message:'Route not found.'}),'error-envelope-observed');
});
for(const [name,op,status,value]of [
 ['null','bootstrap',200,null],['array','bootstrap',200,[]],['raw malformed','bootstrap',200,'not json'],['unrelated','bootstrap',200,{hello:'world'}],
 ['success-shaped submission','bootstrap',200,{status:'accepted',submitted:true}],['wrong operation','submission',200,response()],['wrong HTTP','bootstrap',201,response()],
 ['bad credential','bootstrap',200,{...response(),session_token:'wrong'}],['bootstrap revision','bootstrap',200,{...response(),revision:1}],['bad timestamp','bootstrap',200,{...response(),expires_at:'tomorrow'}],
 ['unknown response key','bootstrap',200,{...response(),receipt:'private'}],['draft zero revision','draft',200,{status:'saved',revision:0,saved_fields:1}],['draft too many fields','draft',200,{status:'saved',revision:1,saved_fields:201}],
 ['unsafe error revision','draft',409,{status:'error',error:'private',message:'private',error_code:'PI-REV-01',current_revision:-1}],['missing error profile','draft',503,{message:'private'}]
])test('response diagnostics refuse '+name,()=>assert.ok(!diagnostic(op,status,value).endsWith('-envelope-observed')));
test('depth, cycles, oversized responses and getters have bounded value-free diagnostics',()=>{
 let deep={};for(let i=0;i<9;i++)deep={nested:deep};assert.equal(diagnostic('bootstrap',200,deep),'json-depth');
 const cycle={};cycle.nested=cycle;assert.equal(diagnostic('bootstrap',200,cycle),'json-shape');
 assert.equal(diagnostic('bootstrap',200,{message:'x'.repeat(17000)}),'json-size');let reads=0;const getter={get message(){reads++;throw Error('private');}};assert.equal(diagnostic('bootstrap',200,getter),'object-shape');assert.equal(reads,0);
});
test('credentials and applicant diagnostics are never reflected, including unexpected exceptions',()=>{
 const canary='SYNTHETIC_PRIVATE_VALUE_000000';const error={status:'error',error:canary,message:canary,error_code:'PI-FIELD-01',field:canary};
 const out=inspectObservedResponse('draft',422,error);assert.ok(!JSON.stringify(out).includes(canary));assert.ok(!JSON.stringify(out).includes(opaque));
 const trap=new Proxy({},{getPrototypeOf(){throw Error(canary);}});assert.deepEqual(inspectObservedResponse('bootstrap',200,trap).diagnostics,['uninspectable']);assert.throws(()=>describeBootstrap(trap),/^TypeError: uninspectable$/);
 let changed;try{describeBootstrap(null);}catch(error){changed=error;}changed.message=canary;const changedTrap=new Proxy({},{getPrototypeOf(){throw changed;}});assert.deepEqual(inspectObservedResponse('bootstrap',200,changedTrap).diagnostics,['uninspectable']);assert.throws(()=>describeBootstrap(changedTrap),/^TypeError: uninspectable$/);
 assert.throws(()=>describeDraft({...draft(),[canary]:canary}),/^TypeError: unknown-key$/);
});
test('import and all pure operations use zero network, storage, retries or logging',async()=>{
 const names=['fetch','WebSocket','XMLHttpRequest','EventSource','localStorage','sessionStorage','indexedDB','document','navigator'];const saved=new Map();let touched=0;
 try{
  for(const name of names){saved.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{configurable:true,get(){touched++;throw Error('side effect');}});}
  const fresh=await import('../integration/public-intake-wire.mjs?zero-side-effects');
  for(let i=0;i<3;i++){fresh.describeBootstrap(bootstrap());fresh.describeDraft(draft());fresh.inspectObservedResponse('bootstrap',200,response());}
  assert.equal(touched,0);assert.deepEqual(Object.keys(fresh).sort(),['describeBootstrap','describeDraft','inspectObservedResponse']);
 }finally{for(const [name,old]of saved){if(old)Object.defineProperty(globalThis,name,old);else delete globalThis[name];}}
 const source=readFileSync(join(root,'integration/public-intake-wire.mjs'),'utf8');assert.doesNotMatch(source,/\b(?:fetch|setTimeout|setInterval)\s*\(|\bconsole\s*\.|node:|\.setItem\s*\(/);
 const imports=[...source.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)].map(m=>m[1]);assert.deepEqual(imports,['../tests/fixtures/public-intake-wire-001.json']);
});
const files=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]);
const leaks=text=>/public-intake-wire|(?:from\s*|import\s*\(?\s*)['"][^'"]*integration\//.test(text);
test('public import graph and default build exclude the reference module/fixture',()=>{
 const source=files(join(root,'public'));for(const p of source.filter(p=>/\.(js|html)$/.test(p)))assert.equal(leaks(readFileSync(p,'utf8')),false,relative(root,p));
 assert.equal(leaks('import x from "../integration/public-intake-wire.mjs";'),true,'detector negative control');
 const tmp=mkdtempSync(join(tmpdir(),'p2d-wire-build-'));assert.ok(resolve(tmp).startsWith(resolve(tmpdir())+sep+'p2d-wire-build-'));
 try{
  cpSync(join(root,'public'),join(tmp,'public'),{recursive:true});cpSync(join(root,'build.mjs'),join(tmp,'build.mjs'));
  const run=spawnSync(process.execPath,['build.mjs'],{cwd:tmp,encoding:'utf8'});assert.equal(run.status,0);
  const paths=files(join(tmp,'dist')).map(p=>relative(join(tmp,'dist'),p).split(sep).join('/'));assert.equal(paths.some(p=>/integration|fixtures|public-intake-wire/.test(p)),false);
  assert.deepEqual(paths.sort(),[...source.map(p=>relative(join(root,'public'),p).split(sep).join('/')),'sitemap.xml'].sort());
  for(const p of files(join(tmp,'dist')).filter(p=>/\.(js|html)$/.test(p)))assert.equal(leaks(readFileSync(p,'utf8')),false);
  assert.match(readFileSync(join(tmp,'dist/runtime-config.js'),'utf8'),/"mode":"preview"/);
 }finally{rmSync(tmp,{recursive:true,force:true});}
});
