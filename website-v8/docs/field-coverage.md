# Existing website fields: compatibility evidence

This is a website-only inventory for the bounded WEB-FIELDS-001 evidence slice. It is not an API mapping, eligibility decision, new-field specification or full programme completion. Source reviewed: `c3c3356b2ab201ca2268855b8f615cbc5d362008` (WEB-UX parent, PR #6). No private cross-repository field map was used or reproduced.

## Sources and reading conventions

The links below refer to the unchanged parent source. Paths are flat website snapshot keys, not promised backend columns. `i` is a zero-based repeat index. Numbers, dates and select values serialize as strings; checkboxes use `yes`/`no`. Text is trimmed. Required means required only when the current control is enabled. Optional blank values can serialize as an empty string if they were present in state.

- [Control construction and default requirements](../public/fact-find.js#L25): `field`, `money`, `count`, `check`.
- [Banking](../public/fact-find.js#L60), [card processing](../public/fact-find.js#L73), [nationality/status](../public/fact-find.js#L79), [existing finance](../public/fact-find.js#L85), [property](../public/fact-find.js#L63).
- [Active answer selection and snapshots](../public/fact-find.js#L108), [visible conditional controls](../public/fact-find.js#L119), [validation](../public/fact-find.js#L156).
- [Change handlers](../public/fact-find.js#L196), [repeat actions](../public/fact-find.js#L248), [resume count clamps](../public/fact-find.js#L328). These links stay accurate while this test-only diff leaves source untouched.

Clearing codes in the table:

- **C**: disabled controls still in the DOM are saved as empty in state; `cleanFields` excludes inactive paths. The test asserts outgoing omission, not a backend deletion. This does not erase the control's DOM value: for example, selecting main-bank Other again can show its earlier text. Permanent deletion on toggling is not an agreed contract and is not asserted. A rerender may instead recreate a control from the emptied state.
- **R**: reduced or removed repeats are excluded from the active snapshot; explicit Remove actions shift remaining indexed state. Decreasing a numeric count removes controls without promising erasure of all in-memory values.
- **J**: switching business/property routes filters the inactive branch from snapshots and retains still-applicable answers. It does not migrate data or define persistence semantics.
- **K**: active value retained through save/back/edit.

Evidence names: **F** = new [field-boundary-check](../tests/field-boundary-check.mjs), with B1/B2/B3/N1/L1/P1 comments and [table fixtures](../tests/field-fixtures.mjs); **B** = existing [branches-check](../tests/branches-check.mjs); **L** = [loan-compatibility-check](../tests/loan-compatibility-check.mjs); **U** = [ux-check](../tests/ux-check.mjs); **S** = [ux-save-check](../tests/ux-save-check.mjs); **JY** = [final-journey-check](../tests/final-journey-check.mjs); **LF** = [latest-feedback-check](../tests/latest-feedback-check.mjs). Existing assertions are preserved, not copied into the new suite.

## Focused field inventory

| Current path | Visible label / type | Required, condition and limit | Serialized value / clearing | Evidence |
| --- | --- | --- | --- | --- |
| `financial.onlinePercent` | Revenue from online sales (%) / select | Required in business funding; blank differs from zero | `0`, `1-25`, `26-50`, `51-75`, `76-99`, `100`; J/K | F B1: blank blocked, literal `0` saved; P1 route retention |
| `financial.bank` | Business bank / account provider / select | Required, main account; one of up to 8 accounts | Catalogue label or `other`; K/J | B happy path; F B2 snapshots/back |
| `financial.bankOther` | Bank / account provider name / text | Required when main provider is `other` | Entered text; C | B missing text; F B2 active value and omission |
| `banks.i.provider` | Business bank / account provider / select | Additional indices 1–7; required | Catalogue label or `other`; R/J | F B2 8-account cap, remove middle, reindex/back/snapshot |
| `banks.i.providerOther` | Bank / account provider name / text | Required when that provider is `other` | Independent text; C/R/J | F B2 distinct values and removed tail omission |
| `financial.overdraft` | Does the business have an overdraft? / select | Required business banking | `yes`/`no`; K/J | B existing happy path |
| `financial.overdraftAmount` | Total business overdraft limit (£) / number | Required for yes; min 0.01, step 0.01 | Numeric string; C/J | B existing amount; exhaustive numeric bounds not newly covered |
| `financial.cards` | Do you accept card payments? / select | Required in business card block | `yes`/`no`; K/J | F B3 no-card snapshots and back |
| `financial.terminals` | Number of card terminals / number | Cards yes; integer 0–1000 | Numeric string; C/J | F B3 min/max and rejected negative/overflow/fraction |
| `financial.processor` | Main card processor / select | Cards yes; required | Existing provider label or `other`; C/J | F B3 Other then Stripe snapshot |
| `financial.processorOther` | Other processor name / text | Required for main `other` | Text; C/J | F B3 active text, changed-provider and cards-off omission |
| `financial.cardSales` | Average monthly card sales (£) / number | Cards yes; required, min 0, step 0.01 | Numeric string; C/J | B/JY happy paths; F B3 cards-off omission |
| `financial.processorCount` | Number of different processors / number | Terminals >1; integer 1–min(terminals,20); default 1 | Numeric string; C/J | F B3 1/20, invalid 0/21/fraction and decrease |
| `processors.i.provider` | Additional processor N / select | Indices 1–19 according to current processor count; cards yes | Existing label or `other`; C/R/J | B two-processor happy path; F B3 independent repeats and decrease |
| `processors.i.providerOther` | Other processor name / text | Required for repeated `other` | Independent text; C/R/J | F B3 snapshot retains index 1, excludes removed index 2 |
| `financial.locations` | Number of trading locations / number | Cards yes; integer 1–20 | Numeric string; C/J | F B3 numeric boundaries and decrease |
| `locations.i.postcode` | Postcode / text | Additional locations 1–19; required UK postcode | Trimmed text; C/R/J | B required case; F B3 active and removed snapshots |
| `locations.i.address` | Address / textarea | Additional locations 1–19; required, max 2000 chars | Independent text; C/R/J | F B3 back retention and removed-location omission |
| `questions.loans` | Any existing business loans? / select | Required; yes needs a selected category | `yes`/`no`; selecting no explicitly removes loan/category state | B yes/no-category blocks; F L1 no-loan snapshot omission |
| `loanTypes.{bbl,cbils,rls,ggs,mca,other}` | Select all that apply / checkbox group | Individual checkboxes optional; group required when loans yes | `yes`/`no`; category deselection removes its facilities | B/U group validation; L category compatibility/removal |
| `loans.i.type` | Loan type / hidden value; displayed facility title | Up to 30 facilities globally | `BBL`, `CBILS`, `RLS`, `GGS`, `Cash Advance`, `Other`; R | L proves `Cash Advance` remains serialized despite Business Cash Advance display; 30-facility cap not newly exercised |
| `loans.i.original` | Original loan amount (£) / number | Required; min 0.01, step 0.01 | Numeric string; R | B/L independent facilities; F uses synthetic 1000 |
| `loans.i.outstanding` | Outstanding amount (£) / number | Required; min 0, step 0.01 | `0` is valid, blank invalid; R | F L1 boundary and outgoing snapshot |
| `loans.i.lender` | Lender name / text | Required; up to 180 chars | Text; R | L same-lender/same-type independent edit/remove/resume |
| `loans.i.taken` | Date loan taken / date | Optional; no later than current date | ISO date or blank; R | F L1 blank/date-only/future rejection |
| `loans.i.term` | Loan term / number | Optional paired with unit; integer 1–600 if entered | Numeric string or blank; R | U length without unit; F L1 unit-only, paired ends, invalid bounds/fraction |
| `loans.i.termUnit` | Term unit / select | Optional paired with length | `Months`/`Years` or blank; R | F L1 paired/blank serialization; no frequency field inferred |
| `loans.i.otherType` | Describe the loan / facility type / text | Required only for Other | Text; C/R | F L1 missing/filled text and omission after loans no |
| `owners.i.nationality` | Nationality / select | Required; up to 10 people | Existing nationality label; K | B Indian/Irish; F N1 British/Irish/Other transitions |
| `owners.i.nationalityOther` | Please enter nationality / text | Required for Other | Text; C | F N1 active snapshot then British omission |
| `owners.i.britishDual` | I also hold British citizenship / checkbox | Optional; rendered for non-British nationality | `yes`/`no`; when yes status controls are absent | F N1 dual status omission; no citizenship eligibility conclusion |
| `owners.i.immigrationStatus` | Your UK residence / immigration status / select | Required except British/dual-British/Irish | Exact existing status label; C when hidden, otherwise inactive paths omitted | F N1 all six non-visa statuses and visa branch |
| `owners.i.visaRoute` | Visa route / select | Required for Visa holder / limited leave | Exact existing route label | B missing route; F N1 Other route and non-visa omission |
| `owners.i.visaOther` | Visa details / text | Optional, visa route Other / not sure | Text; C | F N1 synthetic text and non-visa omission |
| `owners.i.visaExpiry` | Visa / permission expiry date / date | Optional in visa branch | ISO date or blank; C | F N1 synthetic date then omission; expiry eligibility not tested/defined |
| `owners.i.statusEvidenceLater` | I can provide my status evidence / share code securely when requested / checkbox | Optional for existing status branch | `yes`/`no`; no raw evidence or code field | F N1 dual-branch omission; no actual code collected |
| `owners.i.{first,last,role,ownership,ownedSince,phone,email,dob}` | Identity, role and contact controls | Required; ownership 0–100; combined total <=100; date limits from source | Strings; K/R | B/U/JY existing paths; F checks first-name retention during status changes; no new minimum ownership |
| `owners.i.{address,postcode,country,since,residence}` | Current home address, country, move-in month and residence | Country shown for non-UK residence; postcode optional in that branch; other requirements unchanged | Strings; C/K | B/U existing address paths; overseas address completion remains not newly covered |
| `owners.i.previous.j.{address,postcode,from,to}` | Previous address and dates | History when less than 36 months; up to 10 addresses/person; chronology/gaps checked | Strings; C/R | U add/remove/focus; JY existing journey; full ten-address/date-gap matrix remains not newly covered |
| `funding.route` | What are you looking for? / select | Required; business or property | `business`/`property`; J | F P1 both-direction branch filtering and retained business zero/card-no |
| `property.purpose` | What would you like to do? / select | Required on property route | Existing `purchase`, `remortgage`, `bridge`, `bridgeExit`, `develop`, `capital`, `other` | B remortgage; F P1 purchase; full purpose matrix not newly covered |
| `property.owner`, `property.entity`, `property.individualOwners` | Who will buy/owns the property?; company or individual names | Owner required; corresponding name required for selected branch | Existing label/text; C/J | B/F main-business owner; other owner branches not newly covered |
| `property.type`, `property.commercialType`, `property.otherType` | What type of property?; commercial use; description | Type required; corresponding detail required | Existing type ID/catalogue label/text; C/J | B mixed; F P1 commercial Office; Other detail boundary not newly covered |
| `property.{flats,shops,otherUnits,occupiedFlats,occupiedShops}` | Unit counts / number | Mixed; integer 0–1000; flats/shops required, other/occupied optional; total nonzero; occupied <= total | Numeric strings; C/J | B occupied-count rejection; F does not duplicate |
| `property.location.{address,postcode}` | Property address / textarea; Postcode / text | Required property address and UK postcode | Strings; J/K | B/F P1 snapshots |
| `property.{purchasePrice,value,debt}` | Purchase price, estimated current value, existing debt / number | Required; price/value min 0.01, debt min 0; step 0.01 | Numeric strings; J/K | B equity comparison; F P1 literal zero debt |
| `property.{purchaseDate,maturity,lender}` | Purchase date; loan end date; current lender(s) | Optional; historic purchase date cannot be future on non-purchase route | ISO date/text; J | B existing date; exhaustive date branches not newly covered |
| `property.repayment` | How would you like to repay? / select | Required | `interest`, `capital`, `unsure`; J | B interest; F P1 capital |
| `property.term` | Preferred term / number | Required integer 1–480; Years capped at 40; within entered min/max | Numeric string; J/K | F P1 1/480 months, 40 years, invalid bounds/fraction/ranges |
| `property.termUnit` | Term in / select | Required | `Months`/`Years`; J/K | F P1 exact outgoing values |
| `property.{minimumTerm,maximumTerm}` | Minimum/maximum acceptable term / number | Optional integer 1–480; same unit; min<=max; Years <=40 | Numeric string or blank; J/K | F P1 blank, boundaries and reversed/outside range |
| `property.exit` | How will you repay the balance at the end? / select | Required for interest-only or bridge/bridgeExit | Existing option label; J | B interest-only exit; not new strict-success/repayment-frequency contract |
| `property.timescale` | When do you need the funding? / select | Required | Existing option label; J | B/F P1 |
| `property.rented`, `property.{rent,tenancy,leaseEnd,tenantDetails}` | Property use and tenancy details | Rented/partly requires rent/tenancy; lease/details optional | Existing enum/text/number strings; C/J | B rented mixed use; F business use excludes tenancy branch |
| `property.addSolicitor`, `property.solicitor*` | Add solicitor details; firm/contact/email/phone | Optional toggle and fields | `yes`/`no`, strings; C/J | Existing source only; no new exhaustive solicitor matrix |

## Reused adjacent coverage

Current `business.*` company identity/number/sector/addresses/optional website, `applicant.*` contact/personal-email choice and `funding.amount` are already exercised by B, LF, JY and U. Their source labels/types/conditions live in [businessDetails/content](../public/fact-find.js#L92): text/email/tel/date, optional URL, select and amount >=0.01. Active strings are retained; conditional company number/personal email/trading-address rules and mirrored same-address snapshots are unchanged. This slice does not claim every optional business-field boundary.

`questions.*`, optional premises/franchise controls, and `application.*` acceptance remain covered by B/JY. Existing `journey.*` selects serialize `self`/`field`/`phone`; client acceptance is separate for assisted journeys. Immutable terms and historic serialized values are guarded by existing unit tests and L. S covers failed save/callback and actual timeouts; U covers error associations, conditional focus and repeat navigation. None of these implementations is edited here.

## Outstanding requirements and limits

- New repayment amount/frequency fields, actual deposit/source fields, backend field mapping, consent wording/version policy and strict-success/delivery-state contracts remain unresolved and unimplemented. This evidence does not authorize those decisions.
- Passing local response fixtures establish frontend observations only, never backend integration, real authentication, live collection, email delivery or production readiness.
- Source behavior that excludes inactive fields is not an authorization to delete historic records. All testing is synthetic and loopback-only with the unchanged external-write/WebSocket guard.
- Inherited narrow 200% CSS-zoom header/footer overflow remains documented by WEB-UX; this suite checks its changed journeys at the five listed viewport widths, not manual screen-reader, physical-device or cross-browser certification.
- Source has more optional branches than this bounded coverage. Explicit gaps above remain gaps; no skipped/TODO test is counted as passing. Any genuine discrepancy discovered during execution must be recorded separately rather than turned into an expected contract.

Negative control executed: temporarily changed `loanCases` fixture `zero-and-empty-optionals` from outstanding `0` to blank while retaining its expected-success classification. `node tests/field-boundary-check.mjs` exited 1 at `next()` on Existing business loans because validation remained visible. The fixture was restored to `0` before commit; no production code changed. This is an intentionally malformed fixture, not a discovered runtime defect or a passing test. The independent inactive-DOM text observation above does not establish a permanent-deletion policy.

Exact final commands, executed counts, tested head and parent-tree invariance results are recorded in the Draft PR handoff.
