# WEB-INTAKE-V1-001: connect the website to the Pay2Day intake API (self-service Fact-Find)

Owner decisions on API issue 161 (comment 6457215693) set the scope:
- The API adopted this website's `pay2day-intake-v1` contract.
- The launch scope is the self-service Fact-Find.
- Callbacks, assisted journeys, invitations and lookups stay off, and the phone and email alternative stays.

## What changed

| File | Change |
|---|---|
| `public/fact-find.js` | The confirmation appears only when the API confirms receipt: `status: received`, `submitted: true`, and the same application and revision. Anything else, including a lost answer, keeps the existing "couldn't confirm" message. Retrying with the same key returns the original answer, so no duplicate is created. In the live site, the agent tools are not shown, and address lookup asks for manual entry. |
| `public/lead-capture.js` | In the live site, "Request a callback" and "Keep your results" open a dialog that gives 020 3397 8990 and sales@pay2day.co.uk, plus a link to the online Fact-Find. Nothing is sent. |
| `public/intake-client.js` | Adds the launch-scope switches (`deferred`). Invitation links are ignored in the live site. |
| `public/company-lookup.js` | In the live site, asks for manual entry. |
| `functions/api/intake/v1/[[path]].js` | A Cloudflare Pages Function that proxies `/api/intake/v1/*` same-origin to the API (see below). |
| `tests/intake-proxy.test.js` | Proxy unit tests (`npm test`). |
| `tests/e2e/` | End-to-end journey in a real browser against the real API (see Evidence). |

The preview build (the default) is unchanged: it shows example details, and nothing is sent.

## Proxy

**Settings.** The Pages Function forwards only the 14 contract routes, with these settings:
- `INTAKE_API_ORIGIN`: the Azure API's https origin.
- `INTAKE_PROXY_SECRET`: 32+ random characters. It must equal the API's `P2D_PUBLIC_INTAKE_PROXY_SECRET`.

When either setting is missing, every route answers 503 with the phone number.

**Requests.**
- Only these request headers are forwarded: `Accept`, `Content-Type`, `Origin`, `Sec-Fetch-Site`, `X-CSRF-Token` and `Idempotency-Key`.
- Of the cookies, only `__Host-p2d_intake` is forwarded.
- The proxy adds the secret, and the visitor address from Cloudflare's `CF-Connecting-IP`.
- Bodies are limited to 64 KB, and redirects are not followed.

**Responses.**
- Only the intake cookie and these headers are returned: `Content-Type`, `Cache-Control`, `Retry-After` and `X-Request-Id`.

**Direct access.** With the secret set, the API treats any request that does not come through the proxy as an unknown route.

## Cloudflare Pages settings (owner approval needed to create)

**Project.**

| Setting | Value |
|---|---|
| Root directory | `website-v8` |
| Build command | `npm run build:live` |
| Output | `dist` |
| Functions | `website-v8/functions`, detected automatically |

**Build variables.**
- `PAY2DAY_INTAKE_READY=yes`
- `PAY2DAY_TURNSTILE_SITE_KEY=<site key>`

**Function variables (encrypted).**
- `INTAKE_API_ORIGIN`
- `INTAKE_PROXY_SECRET`

**Before switching DNS:**
- Protect the preview with Cloudflare Access (free for up to 50 users).
- Use a Turnstile widget limited to the website hostnames.
- `_headers` is enforced by Pages. In the live build, the CSP allows only `challenges.cloudflare.com` beyond the site itself.

## Evidence

**Unit and existing tests.** `npm test`: 573 of 575 pass.
- The 2 failures are the frozen lineage checks for WEB-INTAKE-WIRE-001. They already fail on the base `eeaf634`, because they compare against `origin/codex/web-security-evidence-001`, which moved when PR 20 merged.
- 6 of the passes are the new proxy tests.

**End to end.** Run with `API_DIR=… PHP_IMAGE=… E2E_PLAYWRIGHT=… bash tests/e2e/run.sh <db container> <db ip>`. 18 of 18 checks pass on MySQL 8.4.9 and on MariaDB 10.11.19, in Microsoft Edge (headless). The run uses:
- the live build, with its CSP enforced
- this proxy
- the real API, on a synthetic copy with an isolated database

Checks:
- **Launch scope**
  - The site is self-service only.
  - Callbacks show the phone and email alternative.
- **Session**
  - The cookie is `__Host-`, HttpOnly, Secure and Strict.
- **Save and resume**
  - "Save & continue later" sends a link.
  - Resuming on another device uses an email code and signs the first device out.
- **Verify and submit**
  - Email verification is required before submission.
  - A lost submission answer is reported as unconfirmed. The retry is confirmed, with one submission and one CRM lead owned by the intake user.
  - The team notice gives the lead number.
  - Acceptance is recorded once, at the submitted revision.
- **Retries and safety**
  - A lost enquiry answer, retried, creates one application.
  - There is no access to another customer's application.
  - Two concurrent saves resolve to one save and one conflict.
  - A double click starts one application.
  - There are no browser errors and no third-party requests.

The human check (the Turnstile script, stubbed) and email delivery (written to a local outbox) are the only parts replaced.

## Rollback

Before go-live, close the Draft PR. After go-live, use either route:
- Roll back to the previous deployment in the Cloudflare Pages dashboard (instant).
- Unset `INTAKE_API_ORIGIN`. The form then answers "unavailable, please call", and the published phone and email stay on every page.
