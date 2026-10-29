# Known and suspected product defects

These permanent finding numbers connect expected behaviours with earlier code review and deployed-site observations. They are a triage reference, not results from this rebuild. Confirm each affected case during execution. A live model may reproduce a previous issue inconsistently.

Affected tests retain the correct expectation and a `defect` annotation. The annotation does not skip a test or convert a failure into a pass. Keep each account's result, then group common causes in the review.

## Findings to verify as coverage is added

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

## Historical findings

| Finding | Current design status |
|---|---|
| #1 | Not reproduced on 2026-10-29 in Chromium: normal email entry with surrounding spaces signed in successfully. The regression test retains a reference to the earlier suspicion |
| #5 | Clear-date behaviour was reported fixed; verify the expected behaviour |
| #22 | Account-persisted theme was replaced by a theme lasting for one sign-in |
| #23 | Theme synchronization was reported fixed; verify both controls |
| #26 | Account theme persistence no longer applies; disabled reminders during a load failure is accepted |

Do not present a passing historical regression check as a currently confirmed defect. Record what the deployed build actually does.

## Boundaries and triage

Finding #49 explains excluded real-bill reading. Earlier observations without design leaves do not silently become requirements; report new observations separately for review.

For each failure capture the account, expectation, actual result, relevant response or stream, and attachment. Classify it as an existing finding, a new product finding, a test issue, or an environment/setup issue. Investigate setup and cleanup failures visibly because they affect the validity of later results.
