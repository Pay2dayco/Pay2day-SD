# WEB-INTAKE-WIRE-001

Disconnected bootstrap/draft observation profile, owner-approved in website issue
16. This is not an adopted browser contract, integration adapter, server security
implementation, acknowledgement approval, staging proof or release permission.

## Immutable evidence

- Website parent: 99c3d304f5c99734452e21e3d5cb92f86f9fecc0, PR 19 merge into
  codex/web-security-evidence-001. Its tree equals reviewed source
  45196eb034726bb3e842f5585048b76e33080146, with merge first parent
  3a7f895f4ff99e031ece570f092c1df980e2019b.
- API PR 162: 17583e394e279999f308262d29f7e6ffa01e4dc2. Source pins in the
  synthetic fixture cover the six original sources (PublicIntakeService, Policy,
  OpaqueId, Controller, core Controller and app/Contracts/fact-find-v2.json), plus
  core/ErrorContext.php blob e117b203d29909f325c9034e026a26a2e75cc787.
- The exact canonical JSON text is preserved in the fixture; its Git blob is
  2e0f380a0edeb67b4fbd1036cbb7a2cae6cc27ea and has 174 unique paths. API main
  and the observed PR share that schema and FactFindContract definition.

No credentials were fetched. Fixture identity/token data is synthetic. The raw
schema contains definitions, not customer data. Tests verify the exact Git blob.
GitHub reads are preparation evidence; the module and its tests never fetch API
or provider data. New API heads require a new source-backed review, not silent
schema/route updates.

## Pure interfaces

`describeBootstrap({turnstile_token})` returns a POST description for the observed
/api/website-intake/bootstrap route, JSON content headers and an independent
body. It checks the exact key, nonempty string and PHP-observed 2048-byte UTF-8
token limit. It neither executes a human challenge nor creates a session/draft.

`describeDraft({application_ref,session_token,revision,fields})` describes the
observed POST /api/website-intake/draft envelope. Opaque values have exactly 43
base64url characters. Revision must be a nonnegative JavaScript safe integer;
this conservative representation guard is not a new PHP revision policy. The
field map has 1..200 known canonical paths, expanding i/j to numeric indices,
with at most 120 path characters. Values are strings, finite representable
numbers or null. Undefined, booleans, objects and unsafe integers are refused.

The request must fit the observed 16384 UTF-8-byte body bound. Nested/array or
non-JSON shapes, accessors and cycles are refused. Diagnostics also bound nested
objects using the observed decoder depth of eight; no valid bootstrap/draft or
diagnostic envelope needs deeply nested data. This is not a general PHP JSON
decoder replacement. Schema path/scalar representation checks do not replicate
PHP canonical field-value, business completion, consent or security validation.
A descriptor is not proof the API would accept its values. The server remains
authoritative for enums, field lengths, conditional values, ownership and all
other business validation.

Null, empty string, numeric zero, explicit fields and omitted fields are retained
without coercion or guessed clearing. Numbers follow standard JSON serialization
(including negative zero becoming zero); descriptors add no normalisation.
This describes request representation, not API storage: PublicIntakeService
fieldMap (line 437) casts validated scalar values to strings and trims them,
storing null for null or trim-empty values. FactFindContract::value first
validates values, so whitespace-only input can be refused before that storage
conversion. Numeric zero becomes stored text "0", not null. An omitted field is
not cleared by the API upsert. The reference still performs no storage,
normalisation, deletion or unknown-outcome recovery on the caller's behalf.
Nothing drops metadata, maps CRM columns, chunks a save, clears hidden/repeat
fields, advances a revision or resolves a conflict. Unsupported metadata and
oversize input are refused instead. Pure descriptions contain caller-supplied
credentials and answers by definition: they must never be logged or published.

`inspectObservedResponse(operation,httpStatus,json)` returns only a fixed profile
label and fixed diagnostic categories. It recognises observed bootstrap/draft
200 envelopes and bounded structured error shapes, including feature-off 404.
Date text is checked for observed syntax only; no expiry/security authority is
inferred. It returns no payload, credential, applicant value, raw exception,
success/accepted/saved/delivered flag or state transition. Malformed, unexpected,
accessor/proxy and oversized values produce fixed categories. Even a modified
error originating from the module cannot inject a private diagnostic message.

Error profiles now describe the actual wire output: Controller::jsonResponse
calls ErrorContext::normalize, which adds request_id and the HTTP-<status>
default when the producer did not supply a code. Source-shaped IDs are exactly
R- plus ten uppercase letters/digits (12 characters), required on normalized
errors, checked without returning their values. Feature-off 404 includes both
error/message, HTTP-404 and request_id; it is not the old producer-only body.
Fixtures derive 404, 409 revision conflict, 503 unavailable, 413 size, 422 field
and 500 unhandled envelopes from the pinned producers/normalizer, using synthetic
IDs. Known PI/SYS codes must match their source HTTP status; HTTP defaults must
equal HTTP-<actual status>. Unknown keys/codes, missing or unsafe IDs, incorrect
status/code combinations and invalid revisions remain refused. Normalizer
messages need not be equal in every path (the unhandled SYS error differs), and
no raw message is copied to diagnostics. These are observations, not acceptance
or recovery authority.

## Claude P2 correction

At reviewed head 254729bf365d408679f38772c8508b2d7c6fdded, independent
pre-edit synthetic reproduction rejected all four normalized 404/409/503/413
bodies as unknown-key because request_id was absent from the profile. HTTP-404
was also rejected without request_id. The revised profile addresses both errors;
artificial unnormalized positive fixtures were replaced, not used as wire truth.
All six original source pins and the raw 174-path schema remain unchanged; the
new ErrorContext raw source is Git-blob checked. The previous wire evidence is
frozen at its reviewed head, with a separate exact P2 successor; historical
validators and negative assertions remain unchanged.

The module imports only the pinned JSON fixture. It has no fetch, timer, storage,
logging, runtime service, public import, session manager, retry, consent mapper,
submission, callback, resume, CRM import or production/provider dependency.
Repeated descriptions do not perform operations or generate/change a key.
Existing server-only security/progress/invitation helpers remain unchanged.

## Preservation and evidence successor

Exactly nine approved paths are used. All public files, build configuration,
consent versions, security settings and other helpers remain identical to parent.
The public import graph and isolated default build are checked to exclude the
module and fixture, with an injected import negative control.

Enquiry evidence remains frozen at 45196eb; its original parent is read through
the immutable PR19 merge first parent. Only frozen observation exports and their
test inputs change. Its validator and all mutation assertions remain intact.
The new successor pins this implementation and its exact parent/changes; only
the three named evidence additions follow in the second commit. Original
current-tree guards must still reject the new files. Neither historic evidence
nor deployment/positive acknowledgement flags are widened.

## Validation and remaining decisions

Required: full unfiltered Node units; default preview build; twelve inherited
browser suites; both final-submission/enquiry focused suites; exact scope and
protected-file comparisons; historical/new successors and mutation controls;
schema-blob/inventory, key/path/type/revision/byte/depth negatives; value-free
diagnostics, zero network/storage and import/build disconnection controls.
Exact commands/counts/tool versions/final SHA belong in the Draft PR. Synthetic
author tests are not independent review, hosted CI, staging or live acceptance.

Unchanged live blockers are recorded in issue 16's matrix: credential/CSRF/Origin
profile, initial enquiry and callback/outbox contracts, draft deltas/repeat
clearing/recovery, resume/retention UI reconciliation, verified client acceptance
bound to email/revision/terms, legal consent versions/evidence, authoritative
acknowledgements and replay/challenge recovery, validated referral or approved
ONLINE/unassigned attribution, staff-only import/reconciliation, provider and
delivery/security gates. Issues 17 and 18 cover enforcing hosting and isolated
synthetic staging. None of these are silently resolved by this reference code.

Codex tested Draft PR -> independent Claude review -> Work review -> owner
approval. No merge, main push, public connection, live intake, feature flags,
deployment, hosting/DNS/Azure/database changes or migrations are authorised.
