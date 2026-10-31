import test from 'node:test';
import assert from 'node:assert/strict';
import {readFrozenEnquiry,observeFrozenEnquiry,validate} from './release-successor-enquiry-001.mjs';
const m=readFrozenEnquiry(),o=observeFrozenEnquiry();
test('enquiry exact successor and historical submit evidence pass',()=>assert.deepEqual(validate(m,o),[]));
for(const p of ['CNAME','website-v8/public/lead-capture.js','website-v8/public/fact-find.js','website-v8/public/intake-client.js','website-v8/public/application-terms.js','website-v8/tests/enquiry-ack-check.mjs']){
 test('enquiry rejects drift '+p,()=>{const x=structuredClone(o);x.current[p].blob='synthetic';assert.ok(validate(m,x).includes('drift:'+p));});
 test('enquiry rejects deletion '+p,()=>{const x=structuredClone(o);delete x.current[p];assert.ok(validate(m,x).includes('drift:'+p));});
}
for(const [name,mutate]of [
 ['new runtime',x=>x.current['website-v8/public/extra.js']={mode:'100644',blob:'synthetic'}],
 ['source mode',x=>x.current.CNAME.mode='120000'],
 ['missing evidence',x=>delete x.current['website-v8/docs/release-manifest-enquiry-001.json']],
 ['evidence mode',x=>x.current['website-v8/tests/release-successor-enquiry-001.mjs'].mode='100755'],
 ['moved parent',x=>x.parentRef='0'.repeat(40)],
 ['repair parent',x=>x.repairParent='0'.repeat(40)],
 ['repair missing',x=>x.containsRepair=false],
 ['merge ancestry',x=>x.mergeParents.reverse()],
 ['merge tree',x=>x.sameMergedTree=false],
 ['scope',x=>x.changes.push('M\tCNAME')],
 ['frozen failure',x=>x.frozenFailures=['synthetic']],
 ['old guard weakened',x=>x.oldFailures=[]]
])test('enquiry rejects '+name,()=>{const x=structuredClone(o);mutate(x);assert.ok(validate(m,x).length);});
for(const [name,mutate]of [['deployment',x=>x.deploymentAuthorized=true],['positive acceptance',x=>x.positiveLiveAcknowledgementApproved=true],['wildcard',x=>x.evidenceAdds.push('website-v8/**')],['runtime exemption',x=>x.repairMods.push('CNAME')],['mutable parent',x=>x.parent='codex/web-security-evidence-001']])test('enquiry rejects manifest '+name,()=>{const x=structuredClone(m);mutate(x);assert.ok(validate(x,o).includes('manifest'));});
