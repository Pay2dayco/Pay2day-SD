import test from 'node:test';
import assert from 'node:assert/strict';
import {read93,observe93,validate93} from './release-successor-93.mjs';
import {readSuccessor,observeSuccessor,validateSuccessor} from './release-successor-95.mjs';
const manifest=read93(),observed=observe93();
test('explicit #93 successor validates current source and frozen #95/#94 evidence',()=>assert.deepEqual(validate93(manifest,observed),[]));
test('unchanged version-2 current-tree assertions reject #93 additions',()=>assert.ok(validateSuccessor(readSuccessor(),observeSuccessor()).includes('undeclared-addition:website-v8/tests/boundary-scan.mjs')));
for(const path of ['website-v8/public/fact-find.js','website-v8/public/logic.js','index.html','CNAME','website-v8/build.mjs','website-v8/package.json','website-v8/integration/security.mjs','website-v8/docs/release-manifest.json','website-v8/docs/release-manifest-95.json','website-v8/docs/release-rollback-evidence.md']){
 test('v3 rejects content drift: '+path,()=>{const o=structuredClone(observed);assert.ok(o.current[path]);o.current[path].blob='synthetic';assert.ok(validate93(manifest,o).includes('undeclared-drift:'+path));});
 test('v3 rejects missing file: '+path,()=>{const o=structuredClone(observed);delete o.current[path];assert.ok(validate93(manifest,o).includes('undeclared-drift:'+path));});
}
for(const [name,mutate]of [
 ['extra runtime',o=>o.current['website-v8/public/new.js']={mode:'100644',blob:'synthetic'}],
 ['extra root',o=>o.current['new-root.html']={mode:'100644',blob:'synthetic'}],
 ['extra workflow',o=>o.current['.github/workflows/new.yml']={mode:'100644',blob:'synthetic'}],
 ['extra evidence',o=>o.current['website-v8/docs/new.md']={mode:'100644',blob:'synthetic'}],
 ['runtime mode',o=>o.current['website-v8/public/fact-find.js'].mode='100755'],
 ['evidence mode',o=>o.current['website-v8/tests/boundary-scan.mjs'].mode='120000'],
 ['missing original evidence',o=>delete o.current['website-v8/tests/boundary-scan.mjs']],
 ['missing successor',o=>delete o.current['website-v8/tests/release-successor-93.mjs']],
 ['moved parent',o=>o.parentRef='0'.repeat(40)],
 ['wrong parent ancestry',o=>o.parentParent='0'.repeat(40)],
 ['wrong common ancestor',o=>o.commonBase='0'.repeat(40)],
 ['wrong original parent',o=>o.originalParent='0'.repeat(40)],
 ['original scope widened',o=>o.originalChanges.push('M\tCNAME')],
 ['parent not integrated',o=>o.containsParent=false],
 ['rewritten evidence history',o=>o.containsOriginal=false],
 ['failed prior version',o=>o.frozen95Failures=['synthetic-failure']]
])test('v3 fails closed: '+name,()=>{const o=structuredClone(observed);mutate(o);assert.ok(validate93(manifest,o).length);});
for(const [name,mutate]of [
 ['runtime allowlist',m=>m.allowedEvidenceModifications.push('website-v8/public/fact-find.js')],
 ['wildcard allowlist',m=>m.allowedEvidenceAdditions.push('website-v8/**')],
 ['invented authority',m=>m.deploymentAuthorized=true],
 ['runtime authority',m=>m.evidenceOnly=false],
 ['wrong version',m=>m.manifestVersion=4],
 ['mutable pin',m=>m.parentHead='codex/web-business-search-privacy-001'],
 ['wrong original evidence',m=>m.originalEvidenceHead='0'.repeat(40)]
])test('v3 rejects manifest mutation: '+name,()=>{const m=structuredClone(manifest);mutate(m);assert.ok(validate93(m,observed).includes('manifest-93'));});
