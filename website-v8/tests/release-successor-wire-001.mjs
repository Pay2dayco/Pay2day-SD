import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {observe93} from './release-successor-93.mjs';
import {readFrozenEnquiry,observeFrozenEnquiry,validate as validateEnquiry} from './release-successor-enquiry-001.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const parent='99c3d304f5c99734452e21e3d5cb92f86f9fecc0';
export const repair='e873247a868bef059b83b1d2dabae03edba3baa8';
const frozen='45196eb034726bb3e842f5585048b76e33080146';
const oldParent='3a7f895f4ff99e031ece570f092c1df980e2019b';
const repairMods=['website-v8/tests/release-successor-enquiry-001.mjs','website-v8/tests/release-successor-enquiry-001.test.js'];
const repairAdds=['website-v8/integration/public-intake-wire.mjs','website-v8/tests/public-intake-wire.test.js','website-v8/tests/fixtures/public-intake-wire-001.json','website-v8/docs/web-intake-wire-001.md'];
const evidenceAdds=['website-v8/docs/release-manifest-wire-001.json','website-v8/tests/release-successor-wire-001.mjs','website-v8/tests/release-successor-wire-001.test.js'];
export const expected={version:1,packet:'WEB-INTAKE-WIRE-001',repository:'Pay2dayco/Pay2day-SD',parent,repair,frozen,oldParent,apiHead:'17583e394e279999f308262d29f7e6ffa01e4dc2',canonicalBlob:'2e0f380a0edeb67b4fbd1036cbb7a2cae6cc27ea',repairMods,repairAdds,evidenceAdds,deploymentAuthorized:false,positiveLiveAcknowledgementApproved:false,publicConnectionAuthorized:false};
function git(...args){return execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();}
function tree(sha){return Object.fromEntries(git('ls-tree','-r',sha).split('\n').map(l=>{const [mode,type,blob,path]=l.split(/[\t ]/);return [path,{mode,blob}];}));}
export function readManifest(){return JSON.parse(readFileSync(new URL('../docs/release-manifest-wire-001.json',import.meta.url),'utf8'));}
export function observe(){
 const current=observe93().current,historical=observeFrozenEnquiry();
 return {current,repaired:tree(repair),repairParent:git('rev-parse',repair+'^'),parentRef:git('rev-parse','refs/remotes/origin/codex/web-security-evidence-001'),mergeParents:git('show','-s','--format=%P',parent).split(' '),sameMergedTree:git('rev-parse',parent+'^{tree}')===git('rev-parse',frozen+'^{tree}'),containsRepair:git('merge-base',repair,'HEAD')===repair,changes:git('diff','--name-status',parent,repair).split('\n').sort(),frozenFailures:validateEnquiry(readFrozenEnquiry(),historical),oldFailures:validateEnquiry(readFrozenEnquiry(),{...historical,current})};
}
export function validate(m,o){
 const f=[];
 if(JSON.stringify(m)!==JSON.stringify(expected))f.push('manifest');
 if(o.repairParent!==parent||o.parentRef!==parent||!o.containsRepair||JSON.stringify(o.mergeParents)!==JSON.stringify([oldParent,frozen])||!o.sameMergedTree)f.push('ancestry');
 if(JSON.stringify(o.changes)!==JSON.stringify([...repairMods.map(p=>'M\t'+p),...repairAdds.map(p=>'A\t'+p)].sort()))f.push('scope');
 if(o.frozenFailures.length)f.push('frozen-enquiry');
 if(!o.oldFailures.includes('addition:website-v8/integration/public-intake-wire.mjs'))f.push('old-guard-weakened');
 for(const [p,e]of Object.entries(o.repaired)){const a=o.current[p];if(!a||a.mode!==e.mode||a.blob!==e.blob)f.push('drift:'+p);}
 for(const p of Object.keys(o.current))if(!(p in o.repaired)&&!evidenceAdds.includes(p))f.push('addition:'+p);
 for(const p of evidenceAdds)if(!o.current[p]||o.current[p].mode!=='100644')f.push('missing-or-mode:'+p);
 return f;
}
export const previousWire='254729bf365d408679f38772c8508b2d7c6fdded';
export const normalizedRepair='7a1d33187c54c5921a633c6cca1548583042e731';
const normalizedMods=['website-v8/integration/public-intake-wire.mjs','website-v8/tests/public-intake-wire.test.js','website-v8/tests/fixtures/public-intake-wire-001.json','website-v8/docs/web-intake-wire-001.md'];
const normalizedEvidence=['website-v8/docs/release-manifest-wire-001.json','website-v8/tests/release-successor-wire-001.mjs','website-v8/tests/release-successor-wire-001.test.js'];
export const normalizedExpected={version:2,packet:'WEB-INTAKE-WIRE-001',previousWire,normalizedRepair,normalizedMods,normalizedEvidence,apiHead:expected.apiHead,canonicalBlob:expected.canonicalBlob,errorContextBlob:'e117b203d29909f325c9034e026a26a2e75cc787',deploymentAuthorized:false,positiveLiveAcknowledgementApproved:false,publicConnectionAuthorized:false};
export function readFrozenWire(){return JSON.parse(git('show',previousWire+':website-v8/docs/release-manifest-wire-001.json'));}
export function observeFrozenWire(current=observe()){return {...current,current:tree(previousWire)};}
export function observeNormalized(current=observe()){
 return {current:current.current,repaired:tree(normalizedRepair),repairParent:git('rev-parse',normalizedRepair+'^'),containsRepair:git('merge-base',normalizedRepair,'HEAD')===normalizedRepair,parentRef:current.parentRef,changes:git('diff','--name-status',previousWire,normalizedRepair).split('\n').sort(),frozenFailures:validate(readFrozenWire(),observeFrozenWire(current)),oldFailures:validate(readFrozenWire(),current)};
}
export function validateNormalized(m,o){
 const f=[];
 if(JSON.stringify(m)!==JSON.stringify(normalizedExpected))f.push('normalized-manifest');
 if(o.repairParent!==previousWire||o.parentRef!==parent||!o.containsRepair)f.push('normalized-ancestry');
 if(JSON.stringify(o.changes)!==JSON.stringify(normalizedMods.map(p=>'M\t'+p).sort()))f.push('normalized-scope');
 if(o.frozenFailures.length)f.push('frozen-wire');
 if(!o.oldFailures.includes('drift:website-v8/integration/public-intake-wire.mjs'))f.push('original-wire-guard-weakened');
 for(const [p,e]of Object.entries(o.repaired)){const a=o.current[p];if(!a||a.mode!==e.mode||(!normalizedEvidence.includes(p)&&a.blob!==e.blob))f.push('normalized-drift:'+p);}
 for(const p of Object.keys(o.current))if(!(p in o.repaired))f.push('normalized-addition:'+p);
 return f;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const m=readManifest(),o=observeNormalized();if(process.argv.includes('--negative-control'))o.current.CNAME={mode:'100644',blob:'synthetic'};const failures=validateNormalized(m,o);console.log(JSON.stringify({status:failures.length?'FAIL':'PASS',failures,network:'none',deploymentAuthorized:false}));process.exitCode=failures.length?1:0;}catch{console.error('FAIL: exact wire successor evidence missing');process.exitCode=1;}
}
