import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
function check(source){
 const block=source.match(/<details class="ff-existing business-online">[\s\S]*?<\/details>/)?.[0];
 assert.ok(block,'optional business details block exists');
 assert.doesNotMatch(block,/<a\b|\bhref\s*=|encodeURIComponent|URLSearchParams|state\[/i,'no answer-derived outbound link in optional details');
 assert.doesNotMatch(source,/businessSearchUrl|business-web-search|https:\/\/(?:www\.)?google\.com\/search/i);
 for(const key of ['business.website','business.googleLink'])assert.ok(block.includes("field('"+key+"'"));
 assert.equal((block.match(/type:'url',required:false,optional:true,wide:true/g)||[]).length,2);
}
for(const file of ['../public/fact-find.js','../dist/fact-find.js'])test('manual URL fields without outbound search: '+file,()=>check(readFileSync(new URL(file,import.meta.url),'utf8')));
test('synthetic data-bearing search anchor is rejected without request or file mutation',()=>{
 const source=readFileSync(new URL('../public/fact-find.js',import.meta.url),'utf8');
 const mutated=source.replace('<summary>Add a website','<a href="https://search.example.invalid/?q=synthetic">Search</a><summary>Add a website');
 assert.throws(()=>check(mutated),/no answer-derived outbound link/);
});
