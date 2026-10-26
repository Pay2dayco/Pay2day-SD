# WEB-ENQUIRY-CONTRACT-001

Website-only standalone enquiry safety repair. Parent is feature merge
3a7f895f4ff99e031ece570f092c1df980e2019b, whose tree equals the tested
38c986e639a5250af60f841c129e68834448cb2f. PR 14 is completed at the feature
branch, not approved for production. Issue 15 controls this independent packet.

## Bounded behaviour

Standalone callback and Funding Explorer results/email enquiries use the existing
/enquiries request. No positive website acknowledgement contract exists. Every
live outcome remains unconfirmed, including plausible sent/queued/accepted JSON.
The accessible, focused status says:

> We couldn't confirm that your enquiry was received. Your details are still here. Please contact Pay2Day before sending again.

Fields, chosen action/time and context remain; the dialog remains editable.
No receipt, saved record, notification, email, callback or CRM import is claimed.
HTTP, network, timeout and unknown errors use the same neutral status; a timeout
is not called a definite failure. Nothing retries automatically.

The synchronous pre-await snapshot includes every existing request field.
An explicit standalone attempt retains its exact body, challenge token and
operation key for an unchanged deliberate retry. No new challenge silently
changes that body under an old key. A different payload/context gets a new key
and challenge. Edits while pending do not mutate the dispatched snapshot. The
latest attempt survives dialog reopen in module memory; no customer data is
written to persistent browser storage. There is a shared in-flight guard as well
as the dialog guard. This promises no server replay or token reuse capability;
the server may refuse it. Recovery policy still needs an approved contract.

Preview behaviour is unchanged and sends nothing. The embedded Fact-Find
callback adapter and both final operations are unchanged. In particular this
packet does not approve the embedded callback's existing success semantics,
draft mutation, verification invalidation or challenge/key lifecycle.

## Evidence and tests

Before repair, `node tests/enquiry-ack-check.mjs --baseline` reproduced false
saved confirmation for both callback and results/email intents. The initial
fixture incorrectly selected a hidden callback-time control for the email-only
intent; it was corrected to select that field only when relevant and the full
baseline rerun passed. An edit invocation using unavailable Python did not run;
the premature regular test therefore tested unchanged source and timed out on
its old disabled completion state. Neither invocation is repaired PASS evidence.
The actual repair was applied and rebuilt before required repaired validation.

Required evidence: full unfiltered unit suite; default preview build; all twelve
inherited browser scripts; prior final-submission suite; new enquiry suite with
24 uncertain outcomes, actual abort timeouts, exact retry/key/body/token equality,
changed body/context, pending edits, state retention, double activation, neutral
unknown errors and preview zero writes. Restore parent lead-capture only in
ignored dist for a regression negative, then rebuild/byte-verify the repair.
Run successor and historical/security negatives and exact protected-file checks.
Exact final commands, counts, SHA and limitations are recorded in the Draft PR.

Historical validators remain unchanged. Their frozen observations now use the
immutable merge first parent instead of the feature branch which legitimately
moved on merge. A new successor pins this packet's parent and repair, freezes
earlier evidence at reviewed trees, and rejects current drift or extra scope.
Original current-tree guards must still reject this successor's runtime drift.
Repair and evidence are separate append-only commits.

## Authoritative integration decisions still open

Refreshed API PR 162 head: 17583e394e279999f308262d29f7e6ffa01e4dc2.
Sources: API `app/Services/PublicIntake/PublicIntakeRoutes.php` and
`docs/api-public-intake-runtime-001.md` at that SHA; canonical queue issue 54;
API issue 161 and its owner non-production baseline. That approval is not a
website wire-contract or public activation approval.

- Website currently uses GET /api/intake/v1/session, POST /enquiries,
  /draft/save, /verification/request, /verification/confirm, /resume/request,
  /submission and /client-review/request. The API instead mounts POST
  /api/website-intake/bootstrap, /draft, /resume, /resume/verify, /consent,
  /submit and lookup/company and lookup/address. No callback route exists.
  Exact public session/CSRF/origin credentials, identifiers, revision and field
  mapping, verification/resume and error recovery require a versioned profile.
- Positive acknowledgements for enquiry, final submission and client review,
  callback delivery/outbox and outcome recovery are unapproved. Decide exact
  same-body replay/challenge refresh policy before permitting positive UI or
  automatic delivery recovery. Transport 2xx alone proves none of these.
- Approve legal consent text/version registry and evidence/revision mapping;
  preserve current website versions until explicitly reconciled. Decide data
  retention/purge and subject access/deletion handling.
- Turnstile custody/binding, quotas, proxy client-IP trust and secure verification
  delivery remain disabled/pending review. Provider contracts, key custody,
  costs, caching/retention for Companies House and addresses remain unapproved.
- Public submission creates no CRM lead. Import is staff-authenticated with
  explicit leads permission and a separate disabled switch. ONLINE/unassigned
  attribution is unresolved; current API attributes to the importing actor.
  Review duplicate/import uncertainty, staff listing/reconciliation and RBAC.
- Hosting must actually enforce reviewed security headers; GitHub Pages does
  not apply the source header configuration. Owner must select an enforcing
  host/proxy, approve CSP/frame/referrer/permissions policies and staging origin.
  DNS/hosting/Azure changes are separate owner release actions.

## Separate queue sequence

1. Independent Claude, Work and owner review of this exact safety head.
2. Embedded Fact-Find callback safety assessment/repair as a separate bounded
   packet: draft mutation, revision/verification preservation, false success,
   exact body/key/challenge recovery. No hidden expansion of this packet.
3. WEB-INTAKE-WIRE-001: disconnected wire-contract module using the verified API
   runtime profile, with synthetic fixtures and no public journey imports.
   Resolve unapproved mappings rather than fabricate them. Reuse any existing
   issue/branch on refresh; this document creates none.
4. WEB-HOSTING-SECURITY-001: owner-selected enforcing hosting design and isolated
   header tests, no production configuration changes under this packet.
5. WEB-CRM-STAGING-001: after contract/security approvals and reviewed API gates,
   approve isolated staging resources/origins and synthetic E2E. Test bootstrap,
   save/revision conflict, verification/resume expiry/replay, consent evidence,
   valid/invalid final submission, lost responses/idempotency, callback only if
   contracted, lookup enabled/disabled cases, attribution and staff-only import,
   duplicate hold, unauthorized roles, no second lead, redaction/abuse limits and
   responsive/accessibility journeys. Prove default feature-off and rollback.

No staging infrastructure, providers or databases are authorised by this source
repair. No live intake, merge to main, production deployment or release approval.
