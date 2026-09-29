import {createAgentInvitation} from './security.mjs';
// CRM-side adapter example, never import this module into the public website.
// The existing CRM supplies authenticated identity, authorisation, contacts and its approved mail queue.
export async function prepareClientInvitation({principal,contactId,crm,store,publicOrigin,expiresAt}){
 if(!principal?.authenticated||!principal.active)throw new Error('Forbidden');
 const contact=await crm.getContactAuthorisedFor(principal,contactId);
 if(!contact?.email||!contact.id)throw new Error('Contact unavailable');
 const invitation=await createAgentInvitation({principal,store,publicOrigin,expiresAt});
 const draft={template:'pay2day-client-fact-find',recipientContactId:contact.id,recipientEmail:contact.email,
  variables:{firstName:contact.firstName||'',secureUrl:invitation.url},createdBy:principal.subject,
  classification:'requested_funding_enquiry',generalMarketing:false};
 // Preserve current admin approval rules; do not introduce a new unrestricted outbound route.
 const queued=await crm.enqueueUnderExistingEmailApprovalRules(principal,draft);
 return {status:queued.status,mailQueueId:queued.id,expiresAt:invitation.expiresAt};
}
