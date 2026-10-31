# Known and suspected product defects

These permanent finding numbers connect expected behaviours with earlier code review and deployed-site observations. Runtime confirmations are recorded separately below; other entries remain a triage reference until their tests execute. A live model may reproduce a previous issue inconsistently.

Affected tests retain the correct expectation and a `defect` annotation. The annotation does not skip a test or convert a failure into a pass. Keep each account's result, then group common causes in the review.

## Findings and expected behaviour

| Finding | Feature / behaviour | Expected behaviour |
|---|---|---|
| #2 | Profile / displayed name | Profile and avatar names agree, including Generated Household |
| #3 | Profile / invalid phone | Invalid NZ phone numbers are rejected |
| #4 | Usage / daily axis | Labels show time without overlapping timezone suffixes |
| #6 | Usage / estimated hours | Estimated readings have the promised chart marking |
| #7 | Usage / missing internal day | The selected date remains with a missing-readings explanation |
| #8 | Usage / incomplete Monthly | Available readings display with missing days marked |
| #9 | Billing / Julia's invoice | The documented August 2024 invoice appears |
| #10 | Billing / partially paid PDF | AMOUNT DUE shows remaining debt, not the full invoice total |
| #11 | Billing / total debt | Amount outstanding sums every invoice's `amount_due` |
| #12 | Plans / daily charge | The daily unit appears once in cards and terms |
| #13 | Plans / current plan | Generated Household's Free Weekends style is recognized |
| #14 | Plans / service error | Retry is available and recovers after service restoration |
| #15 | Plans / comparison table | Catalogue rates appear in the corresponding rows |
| #24 | Settings / several saves | Saving reminders preserves saved alert levels |
| #25 | Settings / empty amount | Empty minimum amount is rejected instead of saved as zero |
| #29 | Settings / channel off | That channel's level options cannot be selected |
| #30 | Settings / fixed options | Defaults stay selectable; saved levels do not change the options |
| #31 | Contact / phone and email | Contact details are visible as well as available in links |
| #35 | FAQs / search counts | Topic counts follow the current search |
| #36 | Bill Shock / green wording | Above, below, and near-normal figures are described accurately |
| #37 | Bill Shock / closed cycle | References to figures are supported by figures shown |
| #38 | Bill Shock / household parameter | Another household's parameter cannot expose its figures under the customer's name |
| #39 | Bill Shock / cycle length | Cycle figures match the approved billing-history interpretation |
| #40 | Bill Shock / View Usage | Warning and no-warning panels both offer Usage navigation |
| #41 | Sparky / human handover | The answer never claims contact was arranged when it was not |
| #42 | Sparky / contacts | The answer gives Help & Support details or directs the customer there |
| #43 | Sparky / current cycle | Period and quoted figures agree with Dashboard and Billing |
| #44 | Sparky / plan advice | Catalogue prices and recommendations fit the stated saving |
| #45 | Sparky / scenario driver | The explanation identifies the driver, including cold weather |
| #46 | Sparky / Usage Collapse | Reduced usage is recognized and verified support recommended |
| #47 | Sparky / comparison chart | Figures agree with Billing; notes contain no internal instructions |
| #48 | Sparky / answer quality | Manual review checks arithmetic, relevance, clarity, and tone |

The phone requirement in #3 and cycle interpretation in #39 remain explicit acceptance expectations. The #11 balance expectation applies consistently to all affected cases, including debt from older invoices.

## Confirmed by Profile tests on 29 October 2026

| Finding | Results | Observed behaviour |
|---|---:|---|
| #2 | 1 failed name-consistency row | Generated Household displays `Zara Sutton` on Profile, matching the Profile API, while the avatar displays `Generated Demo Household`, matching the login response |
| #3 | 4 failed invalid-phone rows | Too few digits, too many digits, a non-NZ prefix, and letters all close the dialog and show the submission confirmation without a field error |

All five are ordinary failing tests with defect annotations and evidence. The final two-worker full-suite run produced 65 passed and five failed results, with no retries or skips. Profile itself produced 14 passed and five failed results. No additional product finding, unexpected profile write, or test-execution failure was observed in that run. See [Profile coverage](profile-coverage.md) for each case and the prototype boundary.

## Confirmed by Usage tests on 31 October 2026

| Finding | Results | Observed behaviour |
|---|---:|---|
| #4 | 1 failed Daily axis case | July's 24 labels include `NZST`; adjacent labels overlap at the configured 1280 × 720 viewport |
| #6 | 1 failed estimated-readings case | Priya's Weekly estimated note appears, but all 24 Daily estimated hours lack a per-hour label, tooltip indication, or marker explained by a legend |
| #7 | 1 failed internal missing-day case | Selecting Priya's missing 2024-06-10 silently returns to 2024-06-30 with no missing-day explanation |
| #8 | 1 failed partial-Monthly case | Julia's Monthly view replaces 24 available days with `Something went wrong` and `This period has missing readings. Choose a shorter range or another date.` |

Usage produced 124 passes, four ordinary failures, and four approved Monthly skips. All 15 cross-page latest-day amounts agreed exactly, including cents. Clear-date behaviour passed. No new product finding was identified. See [Usage coverage](usage-coverage.md) for evidence, scope, and the data change that makes Mereana's Monthly rows applicable.

## Confirmed by Billing tests on 31 October 2026

| Finding | Results | Observed behaviour |
|---|---:|---|
| #9 | 1 failed Julia invoice case | The card and history omit the documented `DEMO-INV-20240831`, period `2024-08-08 – 2024-08-31`, Total `$50.54`; the page displays no billing records |
| #10 | 1 failed partially paid download | `INV231931124` prints `AMOUNT DUE $386.84`, the full total, instead of the remaining `$231.37`; the invoice Total is correctly `$386.84` |
| #11 | 5 failed account-balance checks | The card shows only the latest invoice's balance: Rangi `$151.04` instead of `$823.06`; Mereana `$158.31` instead of `$418.14`; Generated `$371.88` instead of `$934.75`. Rangi and Generated each fail both the card and dedicated several-unpaid-invoices cases |

Billing produced 34 passes and seven ordinary failures, with no retries or skips. The seven failures represent three existing findings, not seven distinct bugs. History, visible charge arithmetic, empty state, action availability, three dialog closure methods, unpaid and paid PDF downloads, the payment prototype, and real-service recovery passed. See [Billing coverage](billing-coverage.md) for the full mapping and execution review.

## Confirmed by Plan Request tests on 31 October 2026

| Finding | Results | Observed behaviour |
|---|---:|---|
| #12 | 2 failed cases: option cards and terms | The three cards show `$1.45/day/day`, `$1.50/day/day`, and `$1.55/day/day`; Free Weekends terms show `Daily charge: $1.55/day per day.` |
| #13 | 1 failed current-plan case | Generated's Profile and Billing show `Free Weekends (VECT, Standard user)`, but Plans selects Anytime Rate and shows no current-style tag |
| #14 | 1 failed service-error case | An intercepted catalogue GET 500 displays the expected error but no Retry button; the recovery checkpoint cannot be reached |
| #15 | 1 failed comparison-table case | Anytime Rate's `$0.325/kWh`, Free Weekends' `$0.365/kWh`, and its `$0.000/kWh` free period are replaced by em dashes |

Plan Request produced 17 passes and five ordinary failures, with no retries or skips. All five failures reproduce four existing findings. The nine selection combinations, three scrolling styles, choice changes, default state, real submission, intercepted submission failure, and intercepted double click passed. Exactly one real request returned 201 with `pending_review`; the current plan remained unchanged. See [Plan Request coverage](plan-request-coverage.md) for the complete mapping, request boundary, and execution review.

## Confirmed by FAQ tests on 31 October 2026

| Finding | Results | Observed behaviour |
|---|---:|---|
| #35 | 4 failed search rows | `warning`, `pdf`, `big four`, and `  human  ` show the correct matching questions, but all five topic counts remain `15 / 4 / 2 / 6 / 3` instead of following the search |

FAQ produced 27 passes and four ordinary failures, with no retries or skips. The four failed rows represent one existing finding. Complete answers, notes, topic filtering, exclusive expansion, native and keyboard search clearing, and no-match navigation passed. No new product finding or unexpected API write was observed. See [FAQ coverage](faq-coverage.md) for exact expected counts, the complete mapping, and the execution review.

## Confirmed by Contact tests on 31 October 2026

| Finding | Results | Observed behaviour |
|---|---:|---|
| #31 | 2 failed cases: Call now and Write email | The telephone and email links have the correct targets, but their cards do not display `0800 000 532` or `support@kea-energy.example` as visible text |

Contact produced three passes and two ordinary failures, with no retries or skips. The failures represent one existing finding. Both real clipboard copies, their card text and toasts, and the Contact-to-assistant journey with its active sidebar state passed. No new product finding or unexpected API write was observed. The browser does not launch a phone or email application or send a chat question. See [Contact coverage](contact-coverage.md) for the full mapping and clipboard isolation.

## Confirmed by Bill Shock tests on 31 October 2026

| Finding | Results | Observed behaviour |
|---|---:|---|
| #36 | 2 failed comparison-wording rows | Cold Snap's materially higher projection and Usage Collapse's materially lower projection are both described as `in line with` normal |
| #37 | 1 failed zero-day row | July's closed-cycle copy refers to figures below, but only buttons and the basis note follow |
| #38 | 1 failed account-isolation row | Tama's `?household=H-JUL` address shows July's 97.50 NZD assessment and summary under Tama's own greeting |
| #39 | 2 failed calendar-cycle rows | Ana and Mereana show 31-day June cycles, rather than 30 days under the approved Billing-history assumption; remaining days are one too many |
| #40 | 1 failed no-warning navigation row | Low User's green panel omits View Usage |

Bill Shock produced 36 passes and seven ordinary failures, with no retries or skips. These are five existing findings. All six Rangi settings cases passed in the later single-worker phase; each restores complete defaults even after failure. The cycle expectation remains an explicitly approved test-design assumption. See [Bill Shock coverage](bill-shock-coverage.md) for all 14 leaves, account rows, and execution evidence.

## Historical findings

| Finding | Current design status |
|---|---|
| #1 | Not reproduced on 2026-10-29 in Chromium: normal email entry with surrounding spaces signed in successfully. The regression test retains a reference to the earlier suspicion |
| #5 | Verified fixed on 2026-10-31: Clear removes the chart and total, Weekly remains empty, and entering a date restores the selected chart |
| #22 | Account-persisted theme was replaced by a theme lasting for one sign-in |
| #23 | Theme synchronization was reported fixed; verify both controls |
| #26 | Account theme persistence no longer applies; disabled reminders during a load failure is accepted |

Do not present a passing historical regression check as a currently confirmed defect. Record what the deployed build actually does.

## Boundaries and triage

Finding #49 explains excluded real-bill reading. Earlier observations without design leaves do not silently become requirements; report new observations separately for review.

For each failure capture the account, expectation, actual result, relevant response or stream, and attachment. Classify it as an existing finding, a new product finding, a test issue, or an environment/setup issue. Investigate setup and cleanup failures visibly because they affect the validity of later results.
