// Observed API PR162 profile only. Never import into a public journey.
// These descriptions do not execute requests or approve an acknowledgement.
import fixture from '../tests/fixtures/public-intake-wire-001.json' with {type:'json'};
const schema=JSON.parse(fixture.canonicalSource);
const paths=schema.fields.map(({path})=>new RegExp('^'+path.split('.').map(part=>part==='i'||part==='j'?'[0-9]+':part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\.')+'$'));
const opaque=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{43}$/.test(value);
const revision=value=>Number.isSafeInteger(value)&&value>=0;
class ProfileError extends TypeError{}
const codes=new Set(['object-shape','unknown-key','missing-key','json-shape','json-depth','json-size','uninspectable','human-token-shape','credential-shape','revision-shape','field-count','field-path','field-shape','operation-shape','http-shape','bootstrap-shape','draft-shape','error-shape']);
const fail=code=>{throw new ProfileError(code);};
function safeCode(error){try{const d=Object.getOwnPropertyDescriptor(error,'message');return error instanceof ProfileError&&d&&Object.hasOwn(d,'value')&&codes.has(d.value)?d.value:'uninspectable';}catch{return 'uninspectable';}}
function object(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail('object-shape');
 const descriptors=Object.getOwnPropertyDescriptors(value);
 for(const key of Reflect.ownKeys(descriptors)){const d=descriptors[key];if(typeof key!=='string'||!d.enumerable||!Object.hasOwn(d,'value'))fail('object-shape');}
 return value;
}
function keys(value,allowed,required=allowed){
 object(value);
 if(Object.keys(value).some(key=>!allowed.includes(key)))fail('unknown-key');
 if(required.some(key=>!Object.hasOwn(value,key)))fail('missing-key');
}
function bounded(value){
 const seen=new Set();
 function visit(v,depth){
  if(v===null||typeof v==='string'||typeof v==='boolean')return;
  if(typeof v==='number'){if(!Number.isFinite(v))fail('json-shape');return;}
  if(typeof v!=='object')fail('json-shape');
  if(depth>=8)fail('json-depth');
  if(seen.has(v))fail('json-shape');seen.add(v);
  if(Array.isArray(v))fail('object-shape');
  object(v);for(const child of Object.values(v))visit(child,depth+1);seen.delete(v);
 }
 visit(value,0);
 if(new TextEncoder().encode(JSON.stringify(value)).length>16384)fail('json-size');
}
function guarded(fn){try{return fn();}catch(error){fail(safeCode(error));}}
function descriptor(path,body){bounded(body);return {method:'POST',path,headers:{'Content-Type':'application/json',Accept:'application/json'},body};}
export function describeBootstrap(input){return guarded(()=>{
 keys(input,['turnstile_token']);
 if(typeof input.turnstile_token!=='string'||!input.turnstile_token||new TextEncoder().encode(input.turnstile_token).length>2048)fail('human-token-shape');
 return descriptor('/api/website-intake/bootstrap',{turnstile_token:input.turnstile_token});
});}
export function describeDraft(input){return guarded(()=>{
 keys(input,['application_ref','session_token','revision','fields']);
 if(!opaque(input.application_ref)||!opaque(input.session_token))fail('credential-shape');
 if(!revision(input.revision))fail('revision-shape');
 object(input.fields);const entries=Object.entries(input.fields);
 if(!entries.length||entries.length>200)fail('field-count');
 const fields={};
 for(const [path,value]of entries){
  if(!/^[A-Za-z0-9_.]{1,120}$/.test(path)||!paths.some(pattern=>pattern.test(path)))fail('field-path');
  if(value!==null&&typeof value!=='string'&&!(typeof value==='number'&&Number.isFinite(value)&&(!Number.isInteger(value)||Number.isSafeInteger(value))))fail('field-shape');
  // Preserve null, empty, zero and omission; never guess clearing or normalise.
  fields[path]=value;
 }
 return descriptor('/api/website-intake/draft',{application_ref:input.application_ref,session_token:input.session_token,revision:input.revision,fields});
});}
export function inspectObservedResponse(operation,httpStatus,json){
 let code;
 try{
  if(!['bootstrap','draft'].includes(operation))fail('operation-shape');
  if(!Number.isInteger(httpStatus)||httpStatus<100||httpStatus>599)fail('http-shape');
  object(json);bounded(json);
  if(httpStatus===200&&operation==='bootstrap'){
   keys(json,['status','application_ref','session_token','revision','expires_at']);
   if(json.status!=='created'||!opaque(json.application_ref)||!opaque(json.session_token)||json.revision!==0||typeof json.expires_at!=='string'||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/.test(json.expires_at))fail('bootstrap-shape');
   code='bootstrap-envelope-observed';
  }else if(httpStatus===200&&operation==='draft'){
   keys(json,['status','revision','saved_fields']);
   if(json.status!=='saved'||!revision(json.revision)||json.revision<1||!Number.isInteger(json.saved_fields)||json.saved_fields<1||json.saved_fields>200)fail('draft-shape');
   code='draft-envelope-observed';
  }else if(httpStatus>=400){
   keys(json,['status','error','message','error_code','field','current_revision','consent_type'],httpStatus===404?['status','message']:['status','error','message','error_code']);
   if(json.status!=='error'||typeof json.message!=='string'||(Object.hasOwn(json,'error')&&typeof json.error!=='string')||(Object.hasOwn(json,'error_code')&&(typeof json.error_code!=='string'||!/^PI-[A-Z0-9-]{1,64}$/.test(json.error_code)))||(Object.hasOwn(json,'current_revision')&&!revision(json.current_revision))||['field','consent_type'].some(key=>Object.hasOwn(json,key)&&typeof json[key]!=='string'))fail('error-shape');
   code='error-envelope-observed';
  }else fail('http-shape');
 }catch(error){code=safeCode(error);}
 // Fixed categories only: no payload, credential, applicant value or live state.
 return {profile:'API-PR162-observation-only',diagnostics:[code]};
}
