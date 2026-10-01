# Business search privacy evidence

Packet WEB-BUSINESS-SEARCH-PRIVACY-001 starts from `codex/web-rollback-evidence-001` at `f14bc1032efa496e4bb797b3304c1b20643a528b`, not the blocked security-evidence branch. This is unmerged source evidence, not deployment or release approval.

The parent generated a user-clicked Google search URL from business/trading name and registered postcode. The optional details block now offers manual website and Google/Maps listing entry only. The generated anchor, URL helper and link-only input listener are removed. Both optional URL field definitions, serialization, validation, company/address lookup and API contracts remain unchanged.

## Reproduce locally

Use Node 24.19.0 and the existing Playwright 1.62.1 review harness (tested with Edge/Chromium 154.0.4258.37). Configure `CODEX_PRIMARY_RUNTIME_NODE_MODULES` to the local runtime's node_modules if Playwright is not installed locally.

- `node build.mjs`: default noindex, non-submitting review output.
- `node --test tests/*.test.js`: full suite, including the historical manifest restriction described below.
- `node tests/business-search-privacy-check.mjs`: manual URL validation and retention through forward/back navigation, review and back-edit at 390/1440 px; absence of outbound search anchor.
- `node tests/business-search-privacy-check.mjs --negative-control`: expected exit 1 when a synthetic data-bearing outbound anchor is inserted into the local DOM. It is never clicked and no source/build file is mutated. Run the normal command again afterward.
- Existing browser commands: `node tests/review-smoke.mjs`, `node tests/content-check.mjs`, `node tests/branches-check.mjs`, `node tests/final-journey-check.mjs`, `node tests/latest-feedback-check.mjs`, `node tests/loan-compatibility-check.mjs`, `node tests/ux-check.mjs`, `node tests/ux-save-check.mjs`, `node tests/field-boundary-check.mjs`, `node tests/mobile-access-check.mjs`.

The source test examines public source and the built artifact and rejects an injected synthetic search anchor in memory. The inherited feedback test now asserts anchor absence instead of expecting the removed Google URL. All newly supplied URL fixtures use `.invalid`; the shared browser harness permits only local GET requests, blocks external/API traffic and WebSockets, and fails on unexpected attempts. Existing mock-service tests fulfill their requests locally.

## Historical evidence and limits

The Issue #94 version-1 manifest and historical documentation remain byte-for-byte frozen. Its original current-tree checker still rejects successor changes. The full suite now checks its exact diff at immutable evidence head `f14bc1032efa496e4bb797b3304c1b20643a528b`, and also unconditionally validates the current working tree against the explicit Issue #95 version-2 successor manifest.

`node tests/release-successor-95.mjs` verifies the reviewed privacy head `6e55fed31f22b87f2d70d6f4c1daca4709609a78`, its exact parent, remote parent ref and frozen evidence. Every inherited file must retain its blob/mode except the three named evidence-revision files. Exactly three new evidence files are permitted. Runtime (including the corrected Fact-Find), root/CNAME, frozen manifest, historical docs, dependencies and configuration are not exceptions. Missing files, additional files, mode drift, undeclared content changes, changed pins and manifest broadening fail closed. Raw blobs accommodate the inherited CRLF root index; Git's clean conversion accommodates normal checkout line endings. No content is ignored.

`node tests/release-successor-95.mjs --negative-control` must exit 1 for synthetic CNAME drift in memory. The unit suite also exercises runtime/root/CNAME drift and deletion, mode changes, unexpected files, missing evidence, ancestry and generic-allowlist mutations. The initial 60/61 result is superseded by the revised complete results recorded at the new exact head in the same Draft PR. No tests are skipped or excluded.

This bounded fix does not certify all website security or resolve the other staging, legal, provider, API/data, infrastructure or release gates. Prior blocked PR #10 remains separate historical evidence. No live Google/provider/CRM/email/database/challenge request, production probe, deployment or configuration action is authorised by these tests. Independent Work review and Pay2dayco approval remain required. Before release, abandon this feature branch or use a separately reviewed source-only revert; no production rollback is authorised.
