import test from 'node:test';
import assert from 'node:assert/strict';
import {readSuccessor,observeSuccessor,observeFrozen95,validateSuccessor} from './release-successor-95.mjs';
import {readManifest,observe,compare} from './release-evidence.mjs';
const manifest=readSuccessor(),observed=observeFrozen95();
test('frozen #95 evidence validates its immutable reviewed head and frozen #94 independently',()=>assert.deepEqual(validateSuccessor(manifest,observed),[]));
test('legacy current-tree guard still rejects successor rather than silently accepting it',()=>assert.ok(compare(readManifest(),observe()).includes('packet-changes')));
for(const path of ['website-v8/public/fact-find.js','website-v8/public/logic.js','index.html','CNAME','website-v8/docs/release-manifest.json','website-v8/docs/release-rollback-evidence.md']){
 test('undeclared content drift rejected: '+path,()=>{const o=structuredClone(observed);o.current[path].blob='synthetic-drift';assert.ok(validateSuccessor(manifest,o).includes('undeclared-drift:'+path));});
 test('deletion rejected: '+path,()=>{const o=structuredClone(observed);delete o.current[path];assert.ok(validateSuccessor(manifest,o).includes('undeclared-drift:'+path));});
}
for(const [name,mutate]of [
 ['extra runtime',o=>o.current['website-v8/public/undeclared.js']={mode:'100644',blob:'synthetic'}],
 ['runtime mode',o=>o.current['website-v8/public/fact-find.js'].mode='100755'],
 ['missing evidence',o=>delete o.current['website-v8/tests/release-successor-95.mjs']],
 ['evidence mode',o=>o.current['website-v8/tests/release-successor-95.mjs'].mode='120000'],
 ['parent ref moved',o=>o.parentRef='0'.repeat(40)],
 ['wrong ancestry',o=>o.privacyParent='0'.repeat(40)],
 ['historical evidence failure',o=>o.frozenFailures=['packet-changes']]
])test('successor fails closed: '+name,()=>{const o=structuredClone(observed);mutate(o);assert.ok(validateSuccessor(manifest,o).length);});
for(const [name,mutate]of [
 ['generic runtime exception',m=>m.allowedEvidenceModifications.push('website-v8/public/fact-find.js')],
 ['extra addition',m=>m.allowedEvidenceAdditions.push('index.html')],
 ['wrong frozen head',m=>m.frozenEvidenceHead='0'.repeat(40)],
 ['wrong privacy head',m=>m.privacyHead='0'.repeat(40)],
 ['release authority',m=>m.deploymentAuthorized=true],
 ['wrong version',m=>m.manifestVersion=3]
])test('successor manifest mutation rejected: '+name,()=>{const m=structuredClone(manifest);mutate(m);assert.ok(validateSuccessor(m,observed).includes('successor-manifest'));});

test('version 2 current-tree guard still rejects the explicit #93 successor additions',()=>assert.ok(validateSuccessor(manifest,observeSuccessor()).includes('undeclared-addition:website-v8/tests/boundary-scan.mjs')));
