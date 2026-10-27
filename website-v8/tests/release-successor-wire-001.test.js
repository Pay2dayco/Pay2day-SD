import test from 'node:test';
import assert from 'node:assert/strict';
import {readManifest,observe,validate,readFrozenWire,observeFrozenWire,observeNormalized,validateNormalized} from './release-successor-wire-001.mjs';
import {scanText} from './boundary-scan.mjs';
const current=observe(),m=readFrozenWire(),o=observeFrozenWire(current);
test('wire exact successor and frozen enquiry lineage pass',()=>assert.deepEqual(validate(m,o),[]));
for(const p of ['CNAME','website-v8/public/fact-find.js','website-v8/public/lead-capture.js','website-v8/public/intake-client.js','website-v8/public/application-terms.js','website-v8/build.mjs','website-v8/integration/security.mjs','website-v8/integration/public-intake-wire.mjs','website-v8/tests/fixtures/public-intake-wire-001.json']){
 test('wire rejects drift '+p,()=>{const x=structuredClone(o);x.current[p].blob='synthetic';assert.ok(validate(m,x).includes('drift:'+p));});
 test('wire rejects deletion '+p,()=>{const x=structuredClone(o);delete x.current[p];assert.ok(validate(m,x).includes('drift:'+p));});
}
for(const [name,mutate]of [
 ['new public runtime',x=>x.current['website-v8/public/unexpected.js']={mode:'100644',blob:'synthetic'}],
 ['new integration',x=>x.current['website-v8/integration/extra.mjs']={mode:'100644',blob:'synthetic'}],
 ['new workflow',x=>x.current['.github/workflows/extra.yml']={mode:'100644',blob:'synthetic'}],
 ['source mode',x=>x.current.CNAME.mode='120000'],
 ['missing evidence',x=>delete x.current['website-v8/docs/release-manifest-wire-001.json']],
 ['evidence mode',x=>x.current['website-v8/tests/release-successor-wire-001.mjs'].mode='100755'],
 ['moved parent',x=>x.parentRef='0'.repeat(40)],
 ['repair parent',x=>x.repairParent='0'.repeat(40)],
 ['repair missing',x=>x.containsRepair=false],
 ['merge order',x=>x.mergeParents.reverse()],
 ['merge tree',x=>x.sameMergedTree=false],
 ['scope',x=>x.changes.push('M\tCNAME')],
 ['frozen failure',x=>x.frozenFailures=['synthetic']],
 ['old guard weakened',x=>x.oldFailures=[]]
])test('wire rejects '+name,()=>{const x=structuredClone(o);mutate(x);assert.ok(validate(m,x).length);});
for(const [name,mutate]of [['deployment',x=>x.deploymentAuthorized=true],['positive acknowledgement',x=>x.positiveLiveAcknowledgementApproved=true],['public connection',x=>x.publicConnectionAuthorized=true],['wildcard',x=>x.evidenceAdds.push('website-v8/**')],['runtime exemption',x=>x.repairMods.push('website-v8/public/intake-client.js')],['mutable parent',x=>x.parent='codex/web-security-evidence-001'],['API pin',x=>x.apiHead='0'.repeat(40)],['schema pin',x=>x.canonicalBlob='0'.repeat(40)]])test('wire rejects manifest '+name,()=>{const x=structuredClone(m);mutate(x);assert.ok(validate(x,o).includes('manifest'));});
test('secret exposure negative remains value-free and detects the sentinel',()=>{const canary='SYNTHETIC_NOT_A_CREDENTIAL_000000';const out=scanText('synthetic.invalid','Bearer '+canary);assert.ok(out.some(x=>x.category==='bearer-literal'));assert.ok(!JSON.stringify(out).includes(canary));assert.ok(out.every(x=>Object.keys(x).sort().join(',')==='category,path'));});

const normalizedManifest=readManifest(),normalizedObserved=observeNormalized(current);
test('normalized exact successor and frozen original wire pass',()=>assert.deepEqual(validateNormalized(normalizedManifest,normalizedObserved),[]));
for(const p of ['CNAME','website-v8/public/fact-find.js','website-v8/public/intake-client.js','website-v8/integration/public-intake-wire.mjs','website-v8/tests/fixtures/public-intake-wire-001.json'])test('normalized rejects drift '+p,()=>{const x=structuredClone(normalizedObserved);x.current[p].blob='synthetic';assert.ok(validateNormalized(normalizedManifest,x).length);});
for(const [name,mutate]of [['missing module',x=>delete x.current['website-v8/integration/public-intake-wire.mjs']],['new file',x=>x.current['website-v8/public/extra.js']={mode:'100644',blob:'synthetic'}],['mode',x=>x.current.CNAME.mode='120000'],['moved parent',x=>x.parentRef='0'.repeat(40)],['repair parent',x=>x.repairParent='0'.repeat(40)],['repair missing',x=>x.containsRepair=false],['scope',x=>x.changes.push('M\tCNAME')],['frozen failure',x=>x.frozenFailures=['synthetic']],['old guard weakened',x=>x.oldFailures=[]]])test('normalized rejects '+name,()=>{const x=structuredClone(normalizedObserved);mutate(x);assert.ok(validateNormalized(normalizedManifest,x).length);});
for(const [name,mutate]of [['deployment',x=>x.deploymentAuthorized=true],['acknowledgement',x=>x.positiveLiveAcknowledgementApproved=true],['connection',x=>x.publicConnectionAuthorized=true],['wildcard',x=>x.normalizedEvidence.push('website-v8/**')],['ErrorContext pin',x=>x.errorContextBlob='0'.repeat(40)]])test('normalized rejects manifest '+name,()=>{const x=structuredClone(normalizedManifest);mutate(x);assert.ok(validateNormalized(x,normalizedObserved).length);});
