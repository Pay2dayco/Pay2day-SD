import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync,lstatSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {readManifest,observeFrozen94,compare,frozen94Head} from './release-evidence.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const privacyHead='6e55fed31f22b87f2d70d6f4c1daca4709609a78';
const modifications=['website-v8/docs/business-search-privacy-evidence.md','website-v8/tests/release-evidence.mjs','website-v8/tests/release-evidence.test.js'];
const additions=['website-v8/docs/release-manifest-95.json','website-v8/tests/release-successor-95.mjs','website-v8/tests/release-successor-95.test.js'];
export const expected={manifestVersion:2,packetId:'WEB-BUSINESS-SEARCH-PRIVACY-001',repository:'Pay2dayco/Pay2day-SD',frozenEvidenceHead:frozen94Head,privacyHead,allowedEvidenceModifications:modifications,allowedEvidenceAdditions:additions,deploymentAuthorized:false};
function git(...args){return execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();}
export function readSuccessor(){return JSON.parse(readFileSync(new URL('../docs/release-manifest-95.json',import.meta.url),'utf8'));}
export function observeSuccessor(){
 const baseline=Object.fromEntries(git('ls-tree','-r',privacyHead).split('\n').map(l=>{const [mode,type,blob,path]=l.split(/[\t ]/);return [path,{mode,blob}];}));
 // Compare actual working files, not just index contents: staged and unstaged drift both count.
 const files=[...new Set([...Object.keys(baseline),...git('ls-files','--cached','--others','--exclude-standard').split('\n').filter(Boolean)])];
 // Runtime discovery does not honor ignore rules: even ignored additions in
 // public/ must be declared. Build output is outside this source directory.
 function runtimeFiles(dir){return readdirSync(resolve(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?runtimeFiles(dir+'/'+e.name):[dir+'/'+e.name]);}
 for(const path of runtimeFiles('website-v8/public'))if(!files.includes(path))files.push(path);
 const current={};
 const modes=Object.fromEntries(git('ls-files','--stage').split('\n').filter(Boolean).map(l=>{const [entry,path]=l.split('\t');return [path,entry.split(' ')[0]];}));
 for(const path of files){try{
  // The inherited root index.html was committed with CRLF. Accept its exact raw
  // blob, or Git's normal checkout/clean conversion for LF-stored files.
  if(!lstatSync(resolve(root,path)).isFile())throw Error('Not a regular source file');
  const raw=git('hash-object','--no-filters',path);
  current[path]={mode:modes[path]||'100644',blob:raw===baseline[path]?.blob?raw:git('hash-object','--path='+path,path)};
 }catch{current[path]=null;}}
 return {baseline,current,privacyParent:git('rev-parse',privacyHead+'^'),parentRef:git('rev-parse','refs/remotes/origin/codex/web-rollback-evidence-001'),frozenFailures:compare(readManifest(),observeFrozen94())};
}
export function validateSuccessor(m,o){
 const failures=[];
 if(JSON.stringify(m)!==JSON.stringify(expected))failures.push('successor-manifest');
 if(o.privacyParent!==frozen94Head||o.parentRef!==frozen94Head)failures.push('successor-ancestry');
 if(o.frozenFailures.length)failures.push('frozen-evidence');
 // Exact explicit exceptions only for this packet's evidence revision, never runtime/root files.
 for(const [path,entry]of Object.entries(o.baseline)){
  const actual=o.current[path];
  if(!actual||actual.mode!==entry.mode||(!modifications.includes(path)&&actual.blob!==entry.blob))failures.push('undeclared-drift:'+path);
 }
 for(const path of Object.keys(o.current))if(!(path in o.baseline)&&!additions.includes(path))failures.push('undeclared-addition:'+path);
 for(const path of additions)if(!o.current[path]||o.current[path].mode!=='100644')failures.push('missing-or-mode:'+path);
 return failures;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const m=readSuccessor(),o=observeSuccessor();
  if(process.argv.includes('--negative-control'))o.current['CNAME']={mode:'100644',blob:'synthetic-drift'};
  const failures=validateSuccessor(m,o);console.log(JSON.stringify({status:failures.length?'FAIL':'PASS',categories:failures,network:'none'}));process.exitCode=failures.length?1:0;
 }catch{console.error('FAIL: successor evidence unavailable or malformed');process.exitCode=1;}
}
