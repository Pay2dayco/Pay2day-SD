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
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const m=readManifest(),o=observe();if(process.argv.includes('--negative-control'))o.current.CNAME={mode:'100644',blob:'synthetic'};const failures=validate(m,o);console.log(JSON.stringify({status:failures.length?'FAIL':'PASS',failures,network:'none',deploymentAuthorized:false}));process.exitCode=failures.length?1:0;}catch{console.error('FAIL: exact successor evidence missing');process.exitCode=1;}
}
