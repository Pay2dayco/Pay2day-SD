# Recovered v8 review source

WEB-REUSE-001 / website issue #1. This directory preserves the recovered version 8 frontend (package 3.0.0), source commit `224484f0f086dd38ef7aa6cfb6924cd14b495d57`. It is a preview, not a launch or connected intake service.

The existing repository root and CNAME are unchanged. Serve `website-v8/dist` as a separate local web root: the recovered source uses root-relative URLs and is not intended to run at `/website-v8/public` on the live website. Do not publish this directory through the existing Pages root. Merging needs separate owner review and approval.

## Reproduction

Node 24.19.0 was used. No dependency installation is needed for the unit tests or build:

```sh
node --test tests/*.test.js
node build.mjs
```

The equivalent package scripts are `npm test` and `npm run build`. Only the default preview build was run. Do not run the production/live build scripts for this review. `dist/` and `test-results/` remain ignored.

Browser tests require Playwright (tested with 1.62.1) and Microsoft Edge, or a Chromium executable supplied through `CHROMIUM_EXECUTABLE_PATH`. Set `CODEX_PRIMARY_RUNTIME_NODE_MODULES` to an existing directory containing Playwright, or install Playwright in an isolated test environment. Run from this directory:

```sh
node tests/final-journey-check.mjs
node tests/latest-feedback-check.mjs
node tests/branches-check.mjs
node tests/review-smoke.mjs
node tests/content-check.mjs
```

These serve only the built `dist/` on 127.0.0.1 ports 3011–3015. Each browser context blocks unmocked external requests, API paths, non-GET requests and WebSockets; service workers are disabled. Tests fail if that guard blocks an unexpected attempt. Mock adapter cases intercept synthetic session/save/lookup/verification/submission and challenge responses entirely in Playwright; they do not change preview configuration on disk or contact an intake service. The servers/browsers close on completion.

## Source reconciliation

All 61 original file hashes matched SOURCE-PROVENANCE.json before editing. The supplied archive SHA-256 was `723d0546a8a87b46a20d822014286b58ca3ffc9d761653fb9234fad736c4067b`.

At initial recovery, 58 original files were byte-identical, including all public source/assets, build/package files, unit tests and reference modules. Only the three original browser scripts changed for portable startup, build-directory serving and local screenshot paths; their behavioral assertions remain. The manifest retains original recovery hashes, not hashes of subsequent content revisions. The private handoff README and its administrative metadata were not copied into this public directory. No hosting identity, private handoff documents, dependencies or generated artifacts are included.

## Customer-facing wording revision

All 17 recovered pages and relevant dynamic descriptions now use the approved brokerage wording and Business Cash Advance product name. Internal route/category IDs, URLs, form controls, calculations, runtime configuration and consent-capture behavior are unchanged. The inline/public application terms receive display terminology changes only; clause count, acceptance controls and the existing preview terms version remain unchanged. This does not activate intake or authorize live use of those terms.

The six added content unit checks bring the total to 37 passing tests. The additional browser suite checks all 17 pages at 320, 390, 768, 1024 and 1440 pixels, calculator notices, Explorer scope/compare/summary text and a synthetic Business Cash Advance Fact-Find through non-submitting completion. All four existing browser suites also pass. Source HTML structure, links, IDs, values and non-description attributes were compared against the parent; they are unchanged. Local screenshots remain ignored. Responsive emulation and synthetic tests are not production or legal certification.

## Results on 29 September 2026

- Original unit tests: 31 passed, 0 failed, 0 skipped.
- Default preview build: passed; 17 HTML pages, noindex, preview runtime and blank challenge key.
- All three recovered browser suites: passed. Explorer results and calculator carryover, complete business/property Fact-Find paths, conditional/repeated fields, validation, terms, callback behavior, mocked adapter failures/idempotency and responsive layouts were exercised.
- Additional review smoke: all 17 pages at 1440, 390 and 320 pixels passed noindex/notice/image/overflow checks; no failed resources or runtime errors. Empty-form validation, back/edit retention and callback non-submission passed with zero write requests.
- Desktop home and mobile Fact-Find screenshots visually reviewed. Original suites also check intermediate widths up to six breakpoints.
- Source hash comparison, targeted credential/private-key/JWT scan, public-file inventory and conflict checks passed. No detected credentials/customer records; synthetic test values only. This is not an exhaustive security or accessibility certification.

Exact base/head and publication checks are recorded in the Draft PR. GitHub CI has not been claimed: this repository has no source test workflow.

## Limits and launch dependencies

This is the recovered frontend, not a connected backend. Real CRM/DB writes, mail, callback delivery, uploads, production company/address lookup, secure saved progress, identity/consent integration and live submission are not enabled or validated. Reference integration modules are synthetic-test examples, not deployed services. Mock-service passes do not establish real authentication or production readiness.

Existing financial illustrations, provider lists, legal/privacy wording and marketing claims are preserved; owner/content/compliance review remains a launch dependency. Testing used Edge on Windows, not physical mobile devices or every browser. No public preview was deployed.

Roles/authorization in CRM are unchanged. Database/schema impact: none. Windows installer: NO. Android APK/AAB: NO. Rollback reference is repository base `96a6be46aba5f274e9c38daa52f8e0b1c3630315`; discarding this unmerged feature branch leaves the served root unchanged. No production rollback is authorized.
