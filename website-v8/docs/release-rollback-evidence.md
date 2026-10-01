# Source rollback and release-readiness evidence

WEB-ROLLBACK-EVIDENCE-001 records source facts only. The companion release-manifest.json is version 1, anchored to main 96a6be46aba5f274e9c38daa52f8e0b1c3630315 and Work-reviewed parent 9689f13999c7253f23133ae25bfbd4c6a8cc0c4d. It grants no merge, deployment, rollback or live-health authority. Exact tested child head is recorded in the Draft PR.

## Source chain and exclusions

Website PR #2 remains the cumulative unmerged main candidate at e4235b565d688a2688a65ed561d7f75a114b45f0. PR #9 at the selected parent adds mobile/keyboard evidence and is also unmerged. PRs #4/#6/#8 were merged into feature branches only; their captured final heads are provenance, not separate deployment instructions. Work review of source does not clear final release gates.

Blocked PR #10 at 402ec1983ae961fd1eb47d0781ec7567fa116b66 is excluded from this ancestry. Its finding remains unresolved: a user-clicked Google search link includes entered business/trading name and registered postcode. No customer values are recorded, no link is followed and no runtime remediation is authorised here. This manifest passing proves that the blocker remains represented, not that the website is safe to launch.

## Offline verification

From website-v8, run node tests/release-evidence.mjs and node --test tests/*.test.js. The checker reads local Git objects, local remote-tracking refs, working changes and non-ignored untracked files. It does not fetch GitHub, execute a checkout/revert/reset, or contact any service. Missing objects/refs fail closed. Remote-tracking refs can be stale: a separate authorised read-only refresh and exact-head review are required at a later release decision. This snapshot intentionally fails after refs, version, tree identities, protected root/CNAME values or expected changes drift; never regenerate it automatically to bless drift.

The manifest captures all main-to-parent changed paths/statuses, root mode/blob expectations and exactly four allowed packet additions. Existing parent files must remain byte-identical. The checker detects a working runtime/root modification or extra tracked/non-ignored file. Ignored build output is not a Git source manifest and is validated by the default review build/browser suites; this manifest is not a binary release bill of materials.

Run node tests/release-evidence.mjs --negative-control for an expected exit 1. It mutates only an in-memory clone's main/parent SHAs, CNAME, version and additions; no file/ref is written. A subsequent normal run must pass. Unit cases independently mutate manifest expectations and observed Git metadata, including root/runtime/dependency drift. Reports contain category names, no credentials or customer data.

## Proposed decision tree, subject to owner approval

1. If the change is still an unmerged source proposal, stop its promotion. Preserve its evidence; abandon the child PR or propose a reviewed source-only revert. Do not reset shared parent/main or force-push. No production recovery is implied because deployment has not been established.
2. If a later website-main release has a defect, freeze further promotion and ask Pay2dayco to approve the specific production recovery plan. Identify the exact deployed build and prior known source, asset/config compatibility and routing before choosing a rollback or forward fix. A Git SHA proves source identity, not the deployed version or live health. No rollback is executed by this packet.
3. If intake API/runtime, database/schema/data, provider settings or infrastructure configuration participates, require separate component plans and state-compatibility evidence. Website source restoration cannot undo submissions, data/schema changes, credential rotation, provider side effects or delivery. Where reversibility is unknown, assess an owner-approved forward fix instead of assuming rollback is safe.
4. Before any later authorised recovery, require independent Work review, explicit owner production approval and a non-production rehearsal with synthetic data. After an approved action, a separately authorised operator verifies live health and reconciliation; source comparison alone never closes the incident.

## Unresolved release gates

The Google-query-string finding, legal/consent policy, authoritative API/data contracts and final cumulative Work/owner review remain gates. A final staging/E2E package must cover synthetic complete journeys, negative authorization/ownership, save/resume/revision/replay, failure/retry/delivery, approved rollback rehearsal and exact build/environment evidence. This packet neither provisions nor runs staging.

Deployment, Cloudflare/Azure, DNS/CNAME, secrets, production DB/schema/data, live Fact-Find, provider configuration, live-health checks, actual headers/no-store, origin isolation, session/cookie/retention and real challenge/rate limits stay outside this packet. All manifest gates deliberately remain unresolved. Source-only independence does not waive any launch blocker. Inherited 200% CSS-zoom outer overflow, native-zoom/physical-device/manual-screen-reader gaps remain unchanged.

## Scope and handoff

Only this document, release-manifest.json, tests/release-evidence.mjs and tests/release-evidence.test.js are added. Runtime/public source, integration references, root/CNAME, build/dependencies/workflows are unchanged. Default build remains noindex/non-submitting. Exact unit/browser counts, Node/browser versions, negative-control results, full diff review and hosted-CI presence/absence are recorded in the Draft PR. No unrun check is passing.

All customer/staff roles, permissions, historical users/leads and ownership are unchanged. Database/schema/data and production impact: none. Windows installer and Android APK/AAB: no. Review route: Codex tested Draft -> independent Work exact-head programme/security/release-evidence review -> Pay2dayco final decision; no Prakash website gate. Rollback reference for this evidence-only commit is its unmerged Draft or a separately reviewed source-only revert, never automatic production recovery.
