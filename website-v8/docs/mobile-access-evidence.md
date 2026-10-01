# Responsive and keyboard regression evidence

WEB-MOBILE-ACCESS-001 extends the existing website review tests without changing runtime code. Parent: codex/web-reuse-001-v8 at e4235b565d688a2688a65ed561d7f75a114b45f0. Its source tree was compared with reviewed website head a573073e8dee37c3b9a99d295ceb904b3b5b72ce: no source-file differences. The exact tested child head is recorded in the Draft PR.

## Additional coverage

The new tests/mobile-access-check.mjs imports the unchanged review-harness and field-fixtures widths. At 320, 390, 768, 1024 and 1440 pixels it adds four journey groups per width:

- Explorer from amount through results using Tab, Home/ArrowDown, Enter and keyboard text insertion; sampled focused controls have a computed outline or shadow and nonzero geometry.
- Fact-Find long synthetic lender/Other text, keyboard repeat add/remove, conditional control focus and back/edit value retention. Existing example data supplies the preceding journey; setup uses pointer/DOM fixture actions, so this group is not claimed as an entirely keyboard-only journey.
- Visible aria-describedby targets, error-summary keyboard targeting, form/control horizontal bounds and a separate 200% CSS zoom observation.
- FAQ details keyboard toggle and callback dialog tab containment/Escape focus return at every width. No callback is submitted.

This supplements rather than replaces ux-check, ux-save-check and field-boundary-check. Those suites already cover broader conditional errors, repeated banks/owners/addresses, saved snapshots, failed saves, details error links and reduced-motion scroll behavior. review-smoke/content-check cover all 17 pages; branches/final-journey/latest-feedback/loan-compatibility cover business/property paths, calculator, handover, lookup and historic loan compatibility.

## Reproduce

From website-v8, run the existing Node unit command and default review build, then the nine existing browser scripts and tests/mobile-access-check.mjs. Use the already provisioned Playwright runtime through CODEX_PRIMARY_RUNTIME_NODE_MODULES if it is not locally installed. No dependency/build/workflow change is required.

The new suite uses port 3020 and the existing harness: loopback-only GET assets, non-GET/API/external traffic blocked unless explicitly mocked by an inherited suite, service workers blocked, all WebSockets blocked. Unexpected attempts fail at browser closure. New suite makes zero write requests. All entered data is synthetic; email/URL examples use .invalid. The default build is noindex and non-submitting. Never use production/live build switches for this evidence.

Run node tests/mobile-access-check.mjs --negative-control to inject a missing aria-describedby target into browser DOM only. Expected result: exit 1 at dangling description at 320, naming synthetic-missing-description. The browser closes in finally; no source fixture or runtime file is modified. A normal subsequent run must pass. This deliberate failure proves the new description-integrity assertion is active, not that every accessibility defect is detectable.

## Observed limitations

Initial long-value setup exceeded the existing input length boundary and failed retention comparison. The final fixture uses a trimmed synthetic string capped at the existing 180-character boundary; runtime truncation/validation was not changed.

The normal focused run reports 20 groups, 90 sampled focus checks, zero runtime errors and zero write requests. These are suite-specific counts, not a WCAG checklist or a count of all intermediate assertions.

200% evidence uses CSS zoom=2 in the real browser, not native browser zoom or assistive-technology magnification. Fact-Find form/control bounds pass, but outer document reflow is NOT a pass: scrollWidth-minus-innerWidth observations at widths 320/390/768/1024/1440 were 146/269/78/825/769 pixels. Preserve the inherited header/footer/outer-layout limitation; these measurements do not attribute every overflowing pixel to one element or prove native zoom behavior. No styling was changed or defect hidden.

Computed outline/shadow checks do not certify contrast, complete occlusion or screen-reader announcements. Manual screen-reader, native 200% browser zoom, physical mobile/touch devices, other browser engines and full accessibility certification were not run. A passing local review is not permission to publish the website or activate intake.

## Safety and handoff

Changed-file allowlist is this document and tests/mobile-access-check.mjs only. Production public JS/HTML/CSS, integration modules, root served files/CNAME, dependencies, build configuration and workflows must remain byte-identical to the parent. Database/schema/data, production and staff permissions impact: none. No installer/APK/AAB is required.

Codex tested Draft -> independent Work security/accessibility-evidence review -> Pay2dayco final decision. Website ownership/visibility/collaborators remain unchanged; no engineering reviewer is automatically added. Rollback is abandoning the unmerged child or a separately reviewed source-only revert; no parent reset, force-push, publication or production rollback.
