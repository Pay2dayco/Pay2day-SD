import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync,lstatSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {readSuccessor,observeFrozen95,validateSuccessor,frozen95Head} from './release-successor-95.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
export const original93Head='402ec1983ae961fd1eb47d0781ec7567fa116b66';
const commonBase='9689f13999c7253f23133ae25bfbd4c6a8cc0c4d';
const originalEvidence=[
 'website-v8/docs/security-boundary-evidence.md',
 'website-v8/tests/boundary-scan.mjs',
 'website-v8/tests/security-boundary.test.js',
 'website-v8/tests/security-browser-check.mjs',
 'website-v8/tests/security-negative-control.mjs'
];
const modifications=['website-v8/tests/release-successor-95.mjs','website-v8/tests/release-successor-95.test.js'];
const additions=[...originalEvidence,'website-v8/docs/release-manifest-93.json','website-v8/tests/release-successor-93.mjs','website-v8/tests/release-successor-93.test.js'];
export const expected93={manifestVersion:3,packetId:'WEB-SECURITY-EVIDENCE-001',repository:'Pay2dayco/Pay2day-SD',evidenceOnly:true,parentHead:frozen95Head,originalEvidenceHead:original93Head,commonBase,allowedEvidenceModifications:modifications,allowedEvidenceAdditions:additions,deploymentAuthorized:false};
function git(...args){return execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();}
function tree(sha){return Object.fromEntries(git('ls-tree','-r',sha).split('\n').map(l=>{const [mode,type,blob,path]=l.split(/[\t ]/);return [path,{mode,blob}];}));}
export function read93(){return JSON.parse(readFileSync(new URL('../docs/release-manifest-93.json',import.meta.url),'utf8'));}
export function observe93(){
 const baseline=tree(frozen95Head);
 const files=new Set([...Object.keys(baseline),...git('ls-files','--cached','--others','--exclude-standard').split('\n').filter(Boolean)]);
 // Ignore rules must never hide extra runtime sources. Generated dist and local
 // browser screenshots are not source inputs and are checked by artifact tests.
 function runtimeFiles(dir){for(const e of readdirSync(resolve(root,dir),{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())runtimeFiles(p);else files.add(p);}}
 runtimeFiles('website-v8/public');
 const indexedModes=Object.fromEntries(git('ls-files','--stage').split('\n').filter(Boolean).map(l=>{const [entry,path]=l.split('\t');return [path,entry.split(' ')[0]];}));
 const current={};
 for(const path of files){try{
  const stat=lstatSync(resolve(root,path));if(!stat.isFile())throw Error('Non-regular file');
  const raw=git('hash-object','--no-filters',path);
  // Preserve inherited CRLF blobs; otherwise apply the repository's Git clean conversion.
  const blob=raw===baseline[path]?.blob?raw:git('hash-object','--path='+path,path);
  const mode=process.platform==='win32'?(indexedModes[path]||'100644'):((stat.mode&0o111)?'100755':'100644');
  current[path]={mode,blob};
 }catch{current[path]=null;}}
 function contains(sha){try{git('merge-base','--is-ancestor',sha,'HEAD');return true;}catch{return false;}}
 return {baseline,current,parentRef:git('rev-parse','refs/remotes/origin/codex/web-business-search-privacy-001'),parentParent:git('rev-parse',frozen95Head+'^'),commonBase:git('merge-base',original93Head,frozen95Head),originalParent:git('rev-parse',original93Head+'^'),originalChanges:git('diff','--name-status',commonBase,original93Head).split('\n').sort(),containsParent:contains(frozen95Head),containsOriginal:contains(original93Head),frozen95Failures:validateSuccessor(readSuccessor(),observeFrozen95())};
}
export function validate93(m,o){
 const failures=[];
 if(JSON.stringify(m)!==JSON.stringify(expected93))failures.push('manifest-93');
 if(o.parentRef!==frozen95Head||o.parentParent!=='6e55fed31f22b87f2d70d6f4c1daca4709609a78'||o.commonBase!==commonBase||o.originalParent!==commonBase||!o.containsParent||!o.containsOriginal)failures.push('ancestry-93');
 if(JSON.stringify(o.originalChanges)!==JSON.stringify(originalEvidence.map(p=>'A\t'+p).sort()))failures.push('original-evidence-scope');
 if(o.frozen95Failures.length)failures.push('frozen-evidence-95');
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
  const m=read93(),o=observe93();
  if(process.argv.includes('--negative-control'))o.current.CNAME={mode:'100644',blob:'synthetic-drift'};
  const failures=validate93(m,o);console.log(JSON.stringify({status:failures.length?'FAIL':'PASS',categories:failures,network:'none',authority:'evidence-only'}));process.exitCode=failures.length?1:0;
 }catch{console.error('FAIL: version 3 evidence unavailable or malformed');process.exitCode=1;}
}
