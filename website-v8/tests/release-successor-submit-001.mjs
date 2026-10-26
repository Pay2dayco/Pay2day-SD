import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {observe93,observeFrozen93,read93,validate93} from './release-successor-93.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const parent='5b85978f435d5193d5bbef104b8a5bd2620ed952';
export const repair='f49f733eb231037d43a22a9b1dbef7bd3fc27fb9';
const repairMods=['website-v8/public/fact-find.js','website-v8/tests/branches-check.mjs'];
const repairAdds=['website-v8/tests/submission-ack-check.mjs','website-v8/docs/web-submit-contract-001.md'];
const evidenceMods=['website-v8/tests/release-successor-93.mjs','website-v8/tests/release-successor-93.test.js'];
const evidenceAdds=['website-v8/docs/release-manifest-submit-001.json','website-v8/tests/release-successor-submit-001.mjs','website-v8/tests/release-successor-submit-001.test.js'];
export const expected={version:4,packet:'WEB-SUBMIT-CONTRACT-001',repository:'Pay2dayco/Pay2day-SD',parent,repair,repairMods,repairAdds,evidenceMods,evidenceAdds,deploymentAuthorized:false,positiveLiveAcknowledgementApproved:false};
function git(...args){return execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();}
function tree(sha){return Object.fromEntries(git('ls-tree','-r',sha).split('\n').map(l=>{const [mode,type,blob,path]=l.split(/[\t ]/);return [path,{mode,blob}];}));}
export function readManifest(){return JSON.parse(readFileSync(new URL('../docs/release-manifest-submit-001.json',import.meta.url),'utf8'));}
export function observe(){
 return {baseline:tree(parent),repaired:tree(repair),current:observe93().current,repairParent:git('rev-parse',repair+'^'),parentRef:git('rev-parse','refs/remotes/origin/codex/web-security-evidence-001'),containsRepair:git('merge-base',repair,'HEAD')===repair,repairChanges:git('diff','--name-status',parent,repair).split('\n').sort(),frozenFailures:validate93(read93(),observeFrozen93()),oldFailures:validate93(read93(),observe93())};
}
export function validate(m,o){
 const fail=[];
 if(JSON.stringify(m)!==JSON.stringify(expected))fail.push('manifest');
 if(o.repairParent!==parent||o.parentRef!==parent||!o.containsRepair)fail.push('ancestry');
 if(JSON.stringify(o.repairChanges)!==JSON.stringify([...repairMods.map(p=>'M\t'+p),...repairAdds.map(p=>'A\t'+p)].sort()))fail.push('repair-scope');
 if(o.frozenFailures.length)fail.push('historical-evidence');
 if(!o.oldFailures.includes('undeclared-drift:website-v8/public/fact-find.js'))fail.push('original-guard-weakened');
 for(const [p,e]of Object.entries(o.repaired)){const a=o.current[p];if(!a||a.mode!==e.mode||(!evidenceMods.includes(p)&&a.blob!==e.blob))fail.push('drift:'+p);}
 for(const p of Object.keys(o.current))if(!(p in o.repaired)&&!evidenceAdds.includes(p))fail.push('addition:'+p);
 for(const p of evidenceAdds)if(!o.current[p]||o.current[p].mode!=='100644')fail.push('missing-or-mode:'+p);
 return fail;
}

export const previousSubmit='88d85c628550c55b319f260f5b80d2e15b49aa21';
export const revisionRepair='0e41116f8106636e4ad4c8cd2fbad8010968377b';
const revisionMods=['website-v8/public/fact-find.js','website-v8/tests/submission-ack-check.mjs','website-v8/docs/web-submit-contract-001.md'];
const revisionEvidence=['website-v8/docs/release-manifest-submit-001.json','website-v8/tests/release-successor-submit-001.mjs','website-v8/tests/release-successor-submit-001.test.js'];
export const revisionExpected={version:5,packet:'WEB-SUBMIT-CONTRACT-001',previousSubmit,revisionRepair,revisionMods,revisionEvidence,deploymentAuthorized:false,positiveLiveAcknowledgementApproved:false};
export function readFrozenSubmit(){return JSON.parse(git('show',previousSubmit+':website-v8/docs/release-manifest-submit-001.json'));}
export function observeFrozenSubmit(){return {...observe(),current:tree(previousSubmit)};}
export function observeRevision(){return {current:observe93().current,repaired:tree(revisionRepair),repairParent:git('rev-parse',revisionRepair+'^'),containsRepair:git('merge-base',revisionRepair,'HEAD')===revisionRepair,parentRef:git('rev-parse','refs/remotes/origin/codex/web-security-evidence-001'),changes:git('diff','--name-status',previousSubmit,revisionRepair).split('\n').sort(),frozenFailures:validate(readFrozenSubmit(),observeFrozenSubmit()),originalFailures:validate(readFrozenSubmit(),observe())};}
export function validateRevision(m,o){const f=[];if(JSON.stringify(m)!==JSON.stringify(revisionExpected))f.push('revision-manifest');if(o.repairParent!==previousSubmit||!o.containsRepair||o.parentRef!==parent)f.push('revision-ancestry');if(JSON.stringify(o.changes)!==JSON.stringify(revisionMods.map(p=>'M\t'+p).sort()))f.push('revision-scope');if(o.frozenFailures.length)f.push('frozen-submit');if(!o.originalFailures.includes('drift:website-v8/public/fact-find.js'))f.push('original-submit-guard-weakened');for(const [p,e]of Object.entries(o.repaired)){const a=o.current[p];if(!a||a.mode!==e.mode||(!revisionEvidence.includes(p)&&a.blob!==e.blob))f.push('revision-drift:'+p);}for(const p of Object.keys(o.current))if(!(p in o.repaired))f.push('revision-addition:'+p);return f;}

export const previousRevision='a9cbe30d880ef99d05113b63b5d2c7c19aefd842';
export const unknownSaveRepair='3bdb56a521c50337ec91e52e4b7a4ef46e277845';
export const unknownSaveExpected={version:6,packet:'WEB-SUBMIT-CONTRACT-001',previousRevision,unknownSaveRepair,repairMods:revisionMods,evidenceMods:revisionEvidence,deploymentAuthorized:false,positiveLiveAcknowledgementApproved:false};
export function readFrozenRevision(){return JSON.parse(git('show',previousRevision+':website-v8/docs/release-manifest-submit-001.json'));}
export function observeFrozenRevision(){return {...observeRevision(),current:tree(previousRevision)};}
export function observeUnknownSave(){return {current:observe93().current,repaired:tree(unknownSaveRepair),repairParent:git('rev-parse',unknownSaveRepair+'^'),containsRepair:git('merge-base',unknownSaveRepair,'HEAD')===unknownSaveRepair,parentRef:git('rev-parse','refs/remotes/origin/codex/web-security-evidence-001'),changes:git('diff','--name-status',previousRevision,unknownSaveRepair).split('\n').sort(),frozenFailures:validateRevision(readFrozenRevision(),observeFrozenRevision()),originalFailures:validateRevision(readFrozenRevision(),observeRevision())};}
export function validateUnknownSave(m,o){const f=[];if(JSON.stringify(m)!==JSON.stringify(unknownSaveExpected))f.push('unknown-save-manifest');if(o.repairParent!==previousRevision||!o.containsRepair||o.parentRef!==parent)f.push('unknown-save-ancestry');if(JSON.stringify(o.changes)!==JSON.stringify(revisionMods.map(p=>'M\t'+p).sort()))f.push('unknown-save-scope');if(o.frozenFailures.length)f.push('frozen-revision');if(!o.originalFailures.includes('revision-drift:website-v8/public/fact-find.js'))f.push('revision-guard-weakened');for(const [p,e]of Object.entries(o.repaired)){const a=o.current[p];if(!a||a.mode!==e.mode||(!revisionEvidence.includes(p)&&a.blob!==e.blob))f.push('unknown-save-drift:'+p);}for(const p of Object.keys(o.current))if(!(p in o.repaired))f.push('unknown-save-addition:'+p);return f;}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const m=readManifest(),o=observeUnknownSave();if(process.argv.includes('--negative-control'))o.current.CNAME={mode:'100644',blob:'synthetic'};const failures=validateUnknownSave(m,o);console.log(JSON.stringify({status:failures.length?'FAIL':'PASS',failures,network:'none',deploymentAuthorized:false}));process.exitCode=failures.length?1:0;}catch{console.error('FAIL: exact successor evidence missing');process.exitCode=1;}
}
