// Server-only reference helpers. These are not an Azure deployment or a database.
import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
export const hashToken=token=>createHash('sha256').update(token).digest('hex');
export function secureEqual(a,b){if(typeof a!=='string'||typeof b!=='string')return false;const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb);}
export function assertBrowserRequest(request,{origin,csrfToken}){
 if(request.method!=='POST'||request.headers.get('origin')!==origin||!request.headers.get('content-type')?.startsWith('application/json')||!secureEqual(request.headers.get('x-csrf-token'),csrfToken))throw new Error('Forbidden');
 const site=request.headers.get('sec-fetch-site');if(site&&site!=='same-origin')throw new Error('Forbidden');
}
export async function readBoundedJson(request,maximumBytes=65536){
 const reader=request.body?.getReader();if(!reader)throw new Error('Missing body');const chunks=[];let size=0;
 try{for(;;){const{value,done}=await reader.read();if(done)break;size+=value.length;if(size>maximumBytes){await reader.cancel();throw new Error('Body too large');}chunks.push(value);}}finally{reader.releaseLock();}
 const raw=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!raw||Array.isArray(raw)||typeof raw!=='object')throw new Error('Invalid body');return raw;
}
export function validateContact(input,kind){
 if(!input||typeof input!=='object')throw new Error('Invalid contact');
 const clean=(name,max)=>{const v=input[name];if(typeof v!=='string'||v.length>max||/[\r\n\x00-\x1f\x7f]/.test(v))throw new Error('Invalid '+name);return v.trim();};
 const name=clean('name',120),business=clean('business',160),email=clean('email',180),phone=clean('phone',25);
 if(!name||!business||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)||((kind!=='results'||phone)&&!/^\+?[\d\s().-]{7,25}$/.test(phone)))throw new Error('Invalid contact');
 return {name,business,email,phone};
}
export async function verifyChallenge({token,secret,hostname,action='enquiry',fetchImpl=fetch}){
 if(typeof token!=='string'||!token||token.length>2048||!secret||!hostname)return false;
 try{const response=await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret,response:token}),signal:AbortSignal.timeout(10000)});if(!response.ok)return false;const data=await response.json();return data.success===true&&data.hostname===hostname&&data.action===action;}catch{return false;}
}
export async function createAgentInvitation({principal,store,publicOrigin,expiresAt}){
 // principal MUST come from validated Entra identity. Never construct it from request JSON.
 if(!principal?.authenticated||!principal.active||!principal.agentId||!['agent','admin','operations'].includes(principal.role))throw new Error('Forbidden');
 const origin=new URL(publicOrigin);if(origin.protocol!=='https:'||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('Invalid public origin');
 if(!(expiresAt instanceof Date)||expiresAt<=new Date())throw new Error('Invalid expiry');
 const token=randomBytes(32).toString('base64url');
 await store.insertInvitation({tokenHash:hashToken(token),agentId:principal.agentId,expiresAt:expiresAt.toISOString(),usedAt:null,createdBy:principal.subject});
 return {url:origin.origin+'/fact-find.html#invite='+token,expiresAt:expiresAt.toISOString()};
}
export async function redeemAgentInvitation({token,sessionId,store,now=new Date()}){
 if(typeof token!=='string'||!/^[-_A-Za-z0-9]{43}$/.test(token)||!sessionId)throw new Error('Invalid invitation');
 // Implement as ONE database transaction: unused + unexpired + active agent, mark used,
 // create invitationRef bound to this session. A link grants attribution only, NEVER draft access.
 const result=await store.consumeInvitationAtomically({tokenHash:hashToken(token),sessionId,now:now.toISOString()});
 if(!result?.invitationRef||!result.agentId)throw new Error('Invalid invitation');
 return {invitationRef:result.invitationRef,agentDisplay:result.agentDisplay};
}
export function verifiedAttribution({invitation,sessionId,agentDirectory}){
 if(!invitation||invitation.sessionId!==sessionId||!agentDirectory.has(invitation.agentId))return {source:'ONLINE',agentId:null};
 return {source:'AGENT_INVITATION',agentId:invitation.agentId};
}
export function assertSubmission({record,session,expectedTermsVersion,accepted}){
 if(!record||!session||record.sessionId!==session.id||record.status!=='draft'||record.revision!==session.acceptedRevision||!session.emailVerified||session.assisted||session.termsVersion!==expectedTermsVersion||accepted!==true)throw new Error('Submission not authorised');
 return true;
}
export const securityHeaders={
 'Cache-Control':'no-store, private','Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"
};
