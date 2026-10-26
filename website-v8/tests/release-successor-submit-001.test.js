import test from 'node:test';
import assert from 'node:assert/strict';
import {readManifest,observe,validate,readFrozenSubmit,observeFrozenSubmit,observeRevision,validateRevision} from './release-successor-submit-001.mjs';
const m=readFrozenSubmit(),o=observeFrozenSubmit();
test('exact submit successor and frozen historical guards pass',()=>assert.deepEqual(validate(m,o),[]));
for(const p of ['website-v8/public/fact-find.js','website-v8/public/application-terms.js','website-v8/public/runtime-config.js','website-v8/public/intake-client.js','website-v8/public/lead-capture.js','website-v8/public/logic.js','website-v8/build.mjs','website-v8/package.json','website-v8/tests/submission-ack-check.mjs','website-v8/docs/release-manifest-93.json','CNAME','index.html']){
 test('rejects undeclared content drift '+p,()=>{const x=structuredClone(o);x.current[p].blob='synthetic';assert.ok(validate(m,x).includes('drift:'+p));});
 test('rejects deletion '+p,()=>{const x=structuredClone(o);delete x.current[p];assert.ok(validate(m,x).includes('drift:'+p));});
}
for(const p of ['website-v8/public/unexpected.js','.github/workflows/unexpected.yml','unexpected.html','website-v8/docs/extra.md'])test('rejects unexpected addition '+p,()=>{const x=structuredClone(o);x.current[p]={mode:'100644',blob:'synthetic'};assert.ok(validate(m,x).includes('addition:'+p));});
for(const [name,change]of [
 ['mode',x=>x.current['website-v8/public/fact-find.js'].mode='100755'],
 ['missing successor',x=>delete x.current['website-v8/tests/release-successor-submit-001.mjs']],
 ['moved parent',x=>x.parentRef='0'.repeat(40)],
 ['repair parent',x=>x.repairParent='0'.repeat(40)],
 ['ancestry',x=>x.containsRepair=false],
 ['repair widened',x=>x.repairChanges.push('M\tCNAME')],
 ['historical failure',x=>x.frozenFailures=['synthetic']],
 ['old guard weakened',x=>x.oldFailures=[]]
])test('rejects '+name,()=>{const x=structuredClone(o);change(x);assert.ok(validate(m,x).length);});
for(const [name,change]of [
 ['deployment authority',x=>x.deploymentAuthorized=true],
 ['positive acceptance',x=>x.positiveLiveAcknowledgementApproved=true],
 ['wildcard',x=>x.evidenceAdds.push('website-v8/**')],
 ['runtime exemption',x=>x.evidenceMods.push('website-v8/public/fact-find.js')],
 ['mutable parent',x=>x.parent='codex/web-security-evidence-001']
])test('rejects manifest '+name,()=>{const x=structuredClone(m);change(x);assert.ok(validate(x,o).includes('manifest'));});

const revisionManifest=readManifest(),revisionObserved=observeRevision();
test('P2 exact successor validates current tree and frozen original submit',()=>assert.deepEqual(validateRevision(revisionManifest,revisionObserved),[]));
for(const p of ['CNAME','website-v8/public/fact-find.js','website-v8/public/application-terms.js','website-v8/public/intake-client.js','website-v8/tests/submission-ack-check.mjs'])test('P2 rejects drift '+p,()=>{const x=structuredClone(revisionObserved);x.current[p].blob='synthetic';assert.ok(validateRevision(revisionManifest,x).length);});
for(const [name,mutate]of [['missing source',x=>delete x.current['website-v8/public/fact-find.js']],['new file',x=>x.current['website-v8/public/extra.js']={mode:'100644',blob:'synthetic'}],['wrong mode',x=>x.current.CNAME.mode='120000'],['moved parent',x=>x.parentRef='0'.repeat(40)],['repair ancestry',x=>x.repairParent='0'.repeat(40)],['repair missing',x=>x.containsRepair=false],['repair scope',x=>x.changes.push('M\tCNAME')],['historical failure',x=>x.frozenFailures=['synthetic']],['old guard weakened',x=>x.originalFailures=[]]])test('P2 rejects '+name,()=>{const x=structuredClone(revisionObserved);mutate(x);assert.ok(validateRevision(revisionManifest,x).length);});
for(const [name,mutate]of [['authority',x=>x.deploymentAuthorized=true],['acceptance',x=>x.positiveLiveAcknowledgementApproved=true],['wildcard',x=>x.revisionEvidence.push('website-v8/**')]])test('P2 rejects manifest '+name,()=>{const x=structuredClone(revisionManifest);mutate(x);assert.ok(validateRevision(x,revisionObserved).length);});
