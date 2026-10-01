import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const pins={main:'96a6be46aba5f274e9c38daa52f8e0b1c3630315',parent:'9689f13999c7253f23133ae25bfbd4c6a8cc0c4d'};
const additions=['website-v8/docs/release-manifest.json','website-v8/docs/release-rollback-evidence.md','website-v8/tests/release-evidence.mjs','website-v8/tests/release-evidence.test.js'];
const gates=['google-query-string','independent-work-review','owner-release-approval','final-staging-e2e','legal-consent','api-data-contract','live-headers-no-store','origin-network-protection','session-cookie-retention','provider-challenge-rate-limits','runtime-data-config-rollback','manual-live-health'];
const staging=['synthetic-end-to-end','negative-authorization-and-ownership','save-resume-revision-replay','failure-retry-and-delivery','approved-rollback-rehearsal','exact-build-and-environment-evidence'];
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function git(...args){return execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();}
function treeRoots(sha){return Object.fromEntries(git('ls-tree','-r',sha).split('\n').map(l=>l.split('\t')).filter(([,p])=>!p.startsWith('website-v8/')).map(([v,p])=>[p,v]));}
export function readManifest(){return JSON.parse(readFileSync(new URL('../docs/release-manifest.json',import.meta.url),'utf8'));}
export function observe(){
 // Read-only local Git only. Remote-tracking refs are observations, not a network refresh.
 const changes=git('diff','--name-status',pins.parent).split('\n').filter(Boolean);
 for(const p of git('ls-files','--others','--exclude-standard').split('\n').filter(Boolean))changes.push('A\t'+p);
 const dependencies=[['codex/web-reuse-001-v8','e4235b565d688a2688a65ed561d7f75a114b45f0'],['codex/web-mobile-access-001',pins.parent]];
 return {main:git('rev-parse','refs/remotes/origin/main'),parent:git('rev-parse','refs/remotes/origin/codex/web-mobile-access-001'),mainTree:git('rev-parse',pins.main+'^{tree}'),parentTree:git('rev-parse',pins.parent+'^{tree}'),mainRoots:treeRoots(pins.main),parentRoots:treeRoots(pins.parent),mainToParent:git('diff','--name-status',pins.main,pins.parent).split('\n').filter(Boolean),changes:changes.sort(),dependencyHeads:dependencies.map(([branch])=>git('rev-parse','refs/remotes/origin/'+branch))};
}
export function compare(m,o){
 const failures=[];const check=(ok,category)=>{if(!ok)failures.push(category);};
 check(m.manifestVersion===1,'manifest-version');check(m.packetId==='WEB-ROLLBACK-EVIDENCE-001'&&m.repository==='Pay2dayco/Pay2day-SD','identity');
 check(m.evidenceOnly===true&&m.deploymentAuthorized===false,'authority');
 for(const name of ['main','parent'])check(m[name]?.sha===pins[name]&&o[name]===pins[name],'sha-'+name);
 check(m.main?.ref==='refs/remotes/origin/main'&&m.parent?.ref==='refs/remotes/origin/codex/web-mobile-access-001','ref-names');
 check(m.main?.tree===o.mainTree&&m.parent?.tree===o.parentTree,'tree-ids');
 check(same(m.protectedRootEntries,o.parentRoots)&&same(o.mainRoots,o.parentRoots),'root-cname');
 check(same(m.expectedMainToParentChanges,o.mainToParent),'main-parent-changes');
 check(same(m.allowedPacketAdditions,additions)&&same(o.changes,additions.map(p=>'A\t'+p).sort()),'packet-changes');
 check(same(m.sourceOnlyDependencies,[{pr:2,branch:'codex/web-reuse-001-v8',sha:'e4235b565d688a2688a65ed561d7f75a114b45f0',stateAtCapture:'OPEN_DRAFT_UNMERGED_TO_MAIN'},{pr:9,branch:'codex/web-mobile-access-001',sha:pins.parent,stateAtCapture:'OPEN_DRAFT_WORK_PASSED_UNMERGED'}])&&same(o.dependencyHeads,['e4235b565d688a2688a65ed561d7f75a114b45f0',pins.parent]),'source-dependencies');
 check(same(m.integratedFeatureHistory,[{pr:4,head:'b48ea66c09abb511300988cb59c096ab30200b72',stateAtCapture:'MERGED_TO_FEATURE_ONLY'},{pr:6,head:'c8a6b946fa5911cf6d3024c0521dff6444529174',stateAtCapture:'MERGED_TO_FEATURE_ONLY'},{pr:8,head:'a573073e8dee37c3b9a99d295ceb904b3b5b72ce',stateAtCapture:'MERGED_TO_FEATURE_ONLY'}]),'feature-history');
 check(m.excludedBlockedEvidence?.pr===10&&m.excludedBlockedEvidence?.head==='402ec1983ae961fd1eb47d0781ec7567fa116b66'&&m.excludedBlockedEvidence?.runtimeRemediationAuthorized===false&&typeof m.excludedBlockedEvidence?.reason==='string'&&m.excludedBlockedEvidence.reason.length>0,'blocked-security-gate');
 check(same(m.launchGates,gates.map(id=>({id,status:'UNRESOLVED'}))),'launch-gates');check(same(m.requiredStagingEvidence,staging),'staging-evidence');
 check(same(m.rollback,{knownSourceIsLiveHealthProof:false,unmergedSource:'ABANDON_OR_REVIEW_SOURCE_ONLY_REVERT',websiteMain:'EXPLICIT_OWNER_PRODUCTION_APPROVAL_REQUIRED',apiRuntimeDataConfig:'SEPARATE_COMPONENT_PLANS_REQUIRED',preferForwardFixWhenStateCompatibilityUnknown:true}),'rollback-boundaries');
 return failures;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const m=readManifest(),o=observe();
  if(process.argv.includes('--negative-control')){m.manifestVersion=999;m.main.sha='0'.repeat(40);m.parent.sha='1'.repeat(40);m.protectedRootEntries.CNAME='synthetic-drift';m.allowedPacketAdditions=[];}
  const failures=compare(m,o);console.log(JSON.stringify({status:failures.length?'FAIL':'PASS',categories:failures,network:'none',authority:'evidence-only'}));process.exitCode=failures.length?1:0;
 }catch{console.error('FAIL: local evidence unavailable or malformed; no values disclosed');process.exitCode=1;}
}
