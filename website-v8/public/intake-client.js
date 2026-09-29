import {runtime} from './runtime-config.js';
export const preview=runtime.mode!=='live';
let session=null,ready=null,invitation=null,challengeLoader=null;
const limit=250000;const requestKeys=new Map();
async function decode(response){
 const text=await response.text();if(text.length>limit)throw new Error('The service returned an unexpected response.');
 let data;try{data=JSON.parse(text);}catch{throw new Error('Online enquiries are unavailable. Please call 020 3397 8990.');}
 if(!response.ok)throw new Error(response.status===429?'Please wait before trying again.':response.status===409?'This form has changed or was already submitted. Please reload your secure link.':'We could not complete that request. Please try again or call 020 3397 8990.');
 return data;
}
export async function connect(){
 if(preview)return null;
 if(!ready)ready=(async()=>{const r=await fetch(runtime.apiBase+'/session',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000)});const d=await decode(r);if(d.contract!=='pay2day-intake-v1'||d.acceptingEnquiries!==true||typeof d.csrfToken!=='string'||!d.csrfToken)throw new Error('Online enquiries are unavailable. Please call 020 3397 8990.');session=d;return d;})().catch(e=>{ready=null;throw e;});
 return ready;
}
export async function request(path,body={},key){
 if(!key){const signature=path+'\n'+JSON.stringify(body);if(!requestKeys.has(signature)){if(requestKeys.size>=30)requestKeys.delete(requestKeys.keys().next().value);requestKeys.set(signature,crypto.randomUUID());}key=requestKeys.get(signature);}
 if(preview)throw new Error('Review version: nothing has been sent.');
 await connect();
 const r=await fetch(runtime.apiBase+path,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','Accept':'application/json','X-CSRF-Token':session.csrfToken,'Idempotency-Key':key},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
 return decode(r);
}
export async function checkInvitation(){
 const h=new URLSearchParams(location.hash.slice(1));const token=h.get('invite');if(!token)return null;
 history.replaceState(null,'',location.pathname);
 if(!/^[A-Za-z0-9_-]{32,256}$/.test(token)||preview)return {pending:true};
 const result=await request('/invitations/resolve',{token});
 if(typeof result.invitationRef!=='string')throw new Error('This invitation could not be verified.');
 invitation=result.invitationRef;return {verified:true,agentDisplay:typeof result.agentDisplay==='string'?result.agentDisplay:'Pay2Day team member'};
}
export const invitationRef=()=>invitation;
export async function challenge(container,action){
 if(preview)return '';
 if(!runtime.turnstileSiteKey)throw new Error('Online enquiries are unavailable. Please call our team.');
 if(!challengeLoader)challengeLoader=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';s.async=true;s.onload=resolve;s.onerror=()=>{challengeLoader=null;s.remove();reject(new Error('The security check could not load. Please try again.'));};document.head.append(s);});
 await challengeLoader;
 return new Promise((resolve,reject)=>{let id;const timer=setTimeout(()=>{if(id!==undefined)window.turnstile.remove(id);reject(new Error('The security check expired. Please try again.'));},120000);id=window.turnstile.render(container,{sitekey:runtime.turnstileSiteKey,action,callback:token=>{clearTimeout(timer);setTimeout(()=>window.turnstile.remove(id),0);resolve(token);},'error-callback':()=>{clearTimeout(timer);setTimeout(()=>window.turnstile.remove(id),0);reject(new Error('Please retry the security check.'));}});});
}
