# Public-source and preview security evidence

WEB-SECURITY-EVIDENCE-001 reconciles the same evidence branch and Draft PR #10 onto reviewed privacy-fix parent `0f9a238cc255b51ec8940ad2a9344bbdb73d9e2a` (`codex/web-business-search-privacy-001`). The original evidence commit `402ec1983ae961fd1eb47d0781ec7567fa116b66` and parent `9689f13999c7253f23133ae25bfbd4c6a8cc0c4d` remain in history. Integration preserves both histories without reset or force-push. Runtime, root/CNAME, build/config, dependencies, workflow and integration references retain the new parent's tree entries.

## Historical finding and reviewed resolution

The original 40/42 unit result was blocked: the old parent constructed an optional Google search link from entered business/trading name and registered postcode. The bounded detector rejected that link in source and generated artifacts. This was evidence of a source/DOM link, not automatic transmission, a deployed route or a production incident. It was never followed during these tests.

Separately authorised Issue #95 removed the link, helper and dedicated listener. Work recorded PASS at the exact new parent above. Manual `business.website` and `business.googleLink` fields and their payload contracts remain. This packet reconciles evidence over that reviewed change; it makes no runtime fix and does not erase the historical finding. The original source/artifact assertions now pass without relaxing their detectors.

## Bounded checks

- `boundary-scan.mjs` reports only category/path. Its lexical patterns cover secret literals, internal origins, obvious diagnostics, browser persistence/query writes/data-bearing links, analytics sinks and server imports. It is not comprehensive secret detection or dataflow analysis.
- `security-boundary.test.js` scans public runtime and integration references. It builds temporary copies twice, with empty gates and with synthetic live-looking environment settings. Both default builds retain preview mode, an empty site key, 17 noindex pages, preview notices, disallow-all robots and no sitemap locations. Artifact inventory must equal public files plus the generated sitemap; private documents, maps and credential-file names fail.
- `security-negative-control.mjs` uses an in-memory, clearly synthetic non-credential bearer sentinel. Expected exit 1 reports only category/path. Detector controls also cover a synthetic answer-bearing query URL without contacting it.
- `security-browser-check.mjs` verifies six preview/memory/fragment observations and five isolation probes. External requests, API GET, POST and WebSocket attempts must be blocked and must trigger the harness's failure assertion. Service-worker code must never be fetched or registered. Only loopback and `.invalid` synthetic targets are used; ordinary preview API/session/challenge paths make no writes.
- Fresh invitation/resume/review loads clear fragments. Coverage deliberately uses a fresh document, not same-document hash navigation. It does not certify arbitrary same-document navigation. Answers remain in memory and disappear on reload. Existing browser suites continue to cover manual URL fields and preview journeys.

## Explicit evidence versions

Version 1 (#94) manifest/docs remain immutable. Version 2 (#95) manifest also remains byte-for-byte unchanged. Its original current-tree observer and validator are retained; tests now evaluate the historical positive at immutable reviewed head `0f9a238cc255b51ec8940ad2a9344bbdb73d9e2a`. Negative assertions prove the old current-tree validators still reject #93 additions.

Version 3 (`release-manifest-93.json`) names only the five original evidence paths, three new successor files and two prior-version test/helper modifications. Its validator compares the whole source tree to the exact reviewed parent, checks parent-ref/ancestry and retention of the original evidence commit, and validates the frozen earlier chain. Unknown additions, deleted files, content/mode drift, runtime/root/CNAME/build/config/dependency/integration changes, widened manifests and invented deployment authority fail. Runtime discovery includes ignored additions. Ordinary generated build/screenshot outputs are not source authority; artifact contents are tested separately. There is no wildcard evidence exception or mutable branch-only pin.

## Validation and limits

From `website-v8`, run the complete unfiltered `node --test tests/*.test.js`, default `node build.mjs`, every inherited browser `*-check.mjs` plus `review-smoke.mjs`, and the security browser suite. Run `node tests/release-successor-93.mjs` for the current positive. Prior current-tree validators intentionally exit 1 for this successor; frozen-version positives run inside the unfiltered suite. Negative controls include secret sentinel, answer-bearing query link, CNAME/content/mode/file/manifest drift and ancestry/parent-ref mutations. Final exact head, command results/counts and runtime versions are recorded on the same Draft PR; historical blocked counts are not current results.

No live provider, CRM, email, challenge, production or hosted preview was contacted. No real credential/customer data is used or logged. Source canonical URLs and guarded provider endpoints are not evidence of deployment or live controls. No API/schema/data, staff-role, ownership or production change. No installer or APK/AAB is required or published.

Live CSP/headers, cache/no-store, origin protection, challenge/rate limits, cookie/session policy, retention, provider configuration and staging/live end-to-end operation remain separate gates. Inherited 200% CSS-zoom outer overflow and unrun manual screen-reader/native-zoom/physical-device checks remain unchanged. No hosted-CI pass is claimed for this website evidence work.

Review route: Codex tested Draft handoff -> independent Work exact-head review -> Pay2dayco final consolidated website decision. No Prakash review is required for this repository. Rollback remains abandoning the unmerged branch or a separately reviewed source-only revert, never parent/main reset, deployment or production rollback.
