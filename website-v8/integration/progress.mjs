// Server-only reference guards. Wire to authenticated sessions, strict field schemas,
// transactional storage and an outbox before enabling the browser adapter.
export const declarationVersion='2026-09-25-use-of-funds-1';
export function assertProgressAccess({record,session,revision,now=Date.now()}){
 if(!record||!session||record.sessionId!==session.id||record.status!=='draft'||record.revision!==revision||!Number.isInteger(revision)||!Number.isFinite(Date.parse(record.expiresAt))||Date.parse(record.expiresAt)<=now)throw new Error('Draft access denied');
 return true;
}
export function assertFundsUse({record,accepted,version}){
 if(version!==declarationVersion||accepted?.businessUse!==true||!['business','property'].includes(record?.fields?.['funding.route'])|| (record.fields['funding.route']==='business'&&accepted.noPropertyPurchase!==true) || (record.fields['funding.route']==='property'&&accepted.noPropertyPurchase!==null))throw new Error('Use of funds confirmation required');
 return true;
}
export function progressEvent({applicationId,revision,section,block,callback=false}){
 if(typeof applicationId!=='string'||!applicationId||!Number.isInteger(revision)||revision<1||!['Start','Business','Funding','People','Commitments','Review'].includes(section)||typeof block!=='string'||block.length>100||/[\r\n\x00-\x1f]/.test(block))throw new Error('Invalid progress event');
 // Reference-only message: CRM pulls the authorised snapshot; no form data in email/events.
 return {type:callback?'enquiry.callback_requested':'enquiry.progress_saved',applicationId,revision,section,block};
}
