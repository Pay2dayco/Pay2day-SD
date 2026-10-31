import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdtempSync,cpSync,rmSync} from 'node:fs';
import {resolve,join,relative,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {scanText,artifactFindings} from './boundary-scan.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]);}
const textFile=p=>/\.(?:js|mjs|html|css|json|md|txt|svg)$/.test(p)||p.endsWith('_headers');

test('source boundaries: public runtime and server-only references have no bounded prohibited patterns',()=>{
 const findings=[];
 for(const dir of ['public','integration'])for(const p of files(join(root,dir)).filter(textFile))findings.push(...scanText(relative(root,p).split(sep).join('/'),readFileSync(p,'utf8'),{publicCode:dir==='public'&&p.endsWith('.js')}));
 assert.deepEqual(findings,[]);console.log('Source scan covers public and integration text; category/path-only findings.');
});
test('synthetic detector controls cover each bounded category without disclosure',()=>{
 const fake='SYNTHETIC_NOT_A_CREDENTIAL_000000';
 const controls=[['private-key','-----BEGIN '+'PRIVATE KEY-----'],['bearer-literal','Bearer '+fake],['credential-literal','providerSecret="'+fake+'"'],['provider-key','AKIA'+'0'.repeat(16)],['internal-origin','https://synthetic.internal/'],['raw-diagnostic','SELECT synthetic_column FROM synthetic_table'],['browser-persistence','localStorage.setItem("synthetic","value")'],['query-write','location.search = "?synthetic=value"'],['query-data-link',"'https://synthetic.invalid/search?q='+encodeURIComponent(syntheticAnswer)"],['analytics-sink','navigator.sendBeacon("/synthetic")'],['server-import','import x from "../integration/security.mjs"']];
 for(const [category,input]of controls){const out=scanText('synthetic.invalid',input,{publicCode:true});assert.ok(out.some(f=>f.category===category),category);assert.ok(out.every(f=>Object.keys(f).sort().join(',')==='category,path'));assert.ok(!JSON.stringify(out).includes(fake));}
 assert.deepEqual(scanText('safe.js','const accessToken = response.token; const text = "safe example";'),[]);
});
test('artifact detector rejects maps, credentials and private documents',()=>{
 const bad=['app.js.map','.env','key.pem','integration/security.mjs','docs/internal.md','programme.md'];assert.equal(artifactFindings(bad).length,bad.length);assert.deepEqual(artifactFindings(['app.js','assets/logo.png','_headers']),[]);
});
test('default builds remain preview/noindex and satisfy artifact content boundaries',()=>{
 const tmp=mkdtempSync(join(tmpdir(),'p2d-security-build-'));
 // Bound all generated output and cleanup to this newly-created temporary directory.
 assert.ok(resolve(tmp).startsWith(resolve(tmpdir())+sep+'p2d-security-build-'));
 try{
  const artifactScans=[];
  cpSync(join(root,'build.mjs'),join(tmp,'build.mjs'));cpSync(join(root,'public'),join(tmp,'public'),{recursive:true});
  for(const env of [{PAY2DAY_INTAKE_READY:'',PAY2DAY_TURNSTILE_SITE_KEY:''},{PAY2DAY_INTAKE_READY:'yes',PAY2DAY_TURNSTILE_SITE_KEY:'SYNTHETIC_NOT_A_SITE_KEY'}]){
   const r=spawnSync(process.execPath,['build.mjs'],{cwd:tmp,env:{...process.env,...env},encoding:'utf8'});assert.equal(r.status,0,'default build process');
   const dist=join(tmp,'dist'),paths=files(dist).map(p=>relative(dist,p).split(sep).join('/'));
   const expected=new Set(files(join(root,'public')).map(p=>relative(join(root,'public'),p).split(sep).join('/')));expected.add('sitemap.xml');
   assert.deepEqual(paths.sort(),[...expected].sort());assert.deepEqual(artifactFindings(paths),[]);
   const config=readFileSync(join(dist,'runtime-config.js'),'utf8');assert.ok(/"mode":"preview"/.test(config),"preview mode");assert.ok(/"turnstileSiteKey":""/.test(config),"empty site key");assert.ok(!config.includes('SYNTHETIC_NOT_A_SITE_KEY'));
   assert.ok(/Disallow: \//.test(readFileSync(join(dist,'robots.txt'),'utf8')));assert.ok(!readFileSync(join(dist,'sitemap.xml'),'utf8').includes('<loc>'));
   const html=paths.filter(p=>p.endsWith('.html'));assert.equal(html.length,17);
   for(const p of html){const t=readFileSync(join(dist,p),'utf8');assert.ok(/<meta[^>]*content="noindex,nofollow"[^>]*name="robots"|<meta[^>]*name="robots"[^>]*content="noindex,nofollow"/.test(t),"noindex page");assert.ok(t.includes('data-preview-only'));}
   const findings=files(dist).filter(textFile).flatMap(p=>scanText(relative(dist,p),readFileSync(p,'utf8'),{publicCode:p.endsWith('.js')}));artifactScans.push(...findings);
  }
  assert.deepEqual(artifactScans,[]);
 }finally{rmSync(tmp,{recursive:true,force:true});}
});
test('public error paths use bounded messages and never pass raw response text to an Error',()=>{
 const t=readFileSync(join(root,'public/intake-client.js'),'utf8');assert.ok(!/new Error\((?:text|data|response)\)/.test(t));assert.ok(/text.length>limit/.test(t));assert.ok(/if\(preview\)throw new Error/.test(t));
});
