# Functional coverage

The approved design has **173 leaves across 12 features**. One leaf represents one case; data-driven leaves produce one result per account or input. Leaf counts measure traceability, not the eventual Playwright test count.

Login implements all 23 of its leaves as 24 tests. Reset Password implements all nine leaves as 18 tests. Logout implements all seven leaves as seven tests. Profile Management implements all 15 leaves as 19 tests. Usage implements all 20 leaves as 132 tests. Billing implements all 14 leaves as 41 tests. Plan Request implements all 12 leaves as 22 tests. FAQs implement all nine leaves as 31 tests. Contact implements all five leaves as five tests. The feature mappings record execution details separately from implementation counts, including genuine failures linked to known defects and the approved Monthly data exception.

| Feature | Design leaves | Current implementation | Remaining work |
|---|---:|---|---|
| Login | 23 | All 23 leaves implemented as 24 tests | See [Login mapping](login-coverage.md) and current run results |
| Reset Password | 9 | All 9 leaves implemented as 18 tests | See [Reset Password mapping](reset-password-coverage.md) and current run results |
| Logout | 7 | All 7 leaves implemented as 7 tests | See [Logout mapping](logout-coverage.md) and current run results |
| Profile Management | 15 | All 15 leaves implemented as 19 tests | See [Profile mapping](profile-coverage.md); retain expected behaviour for findings #2 and #3 |
| Power Bill Shock Warning | 14 | Not implemented | Read cases and isolated settings-linked cases |
| Usage | 20 | All 20 leaves implemented as 132 tests | See [Usage mapping](usage-coverage.md); four known findings and runtime Monthly applicability |
| Billing | 14 | All 14 leaves implemented as 41 tests | See [Billing mapping](billing-coverage.md); findings #9, #10, and #11 remain visible |
| Plan Request | 12 | All 12 leaves implemented as 22 tests | See [Plan Request mapping](plan-request-coverage.md); findings #12–15 remain visible |
| Sparky AI | 29 | Not implemented | Chat mocks, live checks, one manual review leaf |
| Settings Change | 16 | Not implemented | All leaves and reviewed Mac screenshot baselines |
| FAQs | 9 | All 9 leaves implemented as 31 tests | See [FAQ mapping](faq-coverage.md); finding #35 remains visible |
| Contact | 5 | All 5 leaves implemented as 5 tests | See [Contact mapping](contact-coverage.md); finding #31 remains visible |
| **Total** | **173** | **114 complete leaf mappings** | **59 leaves remain unfinished** |

## Implemented coverage

The [Login mapping](login-coverage.md), [Reset Password mapping](reset-password-coverage.md), and [Logout mapping](logout-coverage.md) list every implemented leaf for those features. Reset Password has four signed-out cases, one Edit profile case, and 13 Settings-entry cases. The latter include ten independent account-email rows. The three Settings dismissal methods remain checkpoints within one Cancel test, matching the single design leaf. Logout has four sidebar cases, two profile-menu cases, and one independent protected-page case that checks browser Back and direct navigation after signing out.

The [Profile mapping](profile-coverage.md) covers seven view tests and 12 request-change tests. The name-consistency leaf has three account rows, and the valid-phone leaf has three format rows. Generated's name comparison and the four invalid-phone cases keep their expected behaviour and defect annotations; implementation coverage does not imply those product behaviours pass.

The [Usage mapping](usage-coverage.md) covers 17 Dashboard tests, 90 range/unit rows, 15 strict cross-page cost comparisons, and ten page, date, data-scenario, and recovery tests. Both DST dates stay within one leaf. Only incomplete normal Monthly rows may skip; the dedicated partial-Monthly case still executes.

The [Billing mapping](billing-coverage.md) covers 23 latest-invoice tests, ten history tests, four dialog/payment tests, and four PDF downloads. All 14 leaves are automated without skips. Account balances sum every invoice's remaining debt; Julia's fixed invoice expectation is independent of the API. Downloaded PDFs are parsed and removed after checking the actual text and headline amount.

The [Plan Request mapping](plan-request-coverage.md) covers four option tests, 13 selection tests, two comparison/terms dialogs, and three submission tests. All nine combinations and three scrolling styles have separate results. Only the successful submission records a real request, with automatic retries disabled; failure and double-click responses are intercepted. The missing Retry control blocks the recovery checkpoint and remains an ordinary failure.

The [FAQ mapping](faq-coverage.md) covers six browse tests, 17 answer tests, and eight search tests. Every question has an independent full-answer comparison; both extra notes and their absence from the other answers are checked. Four search inputs retain the correct dynamic topic counts and finding #35. Native search cancellation and keyboard deletion are checkpoints within one leaf. No FAQ case requires a live chat response or a manual-only check.

The [Contact mapping](contact-coverage.md) covers real clipboard copies, exact phone and email link targets, visible contact details, and assistant navigation with its selected sidebar state. Its five cases run independently in one ordered file to keep clipboard operations apart in headed mode. The two missing visible details retain finding #31. No phone or email application is launched and no chat question is sent.

The original foundation proofs are now included in their complete feature specs:

| Design path | Account | Proof scope |
|---|---|---|
| Login › Access protected pages › Signed out: opening a protected page redirects to /login | Signed out | Opening a protected route shows Login |
| Usage › View the usage summary on the Dashboard › Positive Testing › The four tiles match the API (all 15 accounts) | All 15 accounts, including July Household | Saved sign-in state, Dashboard controls, four API-backed summary values |

The protected-route case is included in the Login totals. The summary proof was expanded to all 15 accounts without adding a duplicate foundation-only test.

## Coverage rules

- Preserve feature, behaviour, and leaf titles in describe blocks and test titles. Name every data row's account or input.
- Track implementation and execution separately. A passing representative account does not cover other rows.
- Preserve expected behaviour when an existing product defect is present.
- Keep one result per affected case even when a root cause is shared.
- Run each reviewed feature on the deployed site with few workers before advancing its coverage status.

## Approved interpretations

- **Billing balance:** Amount outstanding means total debt: the sum of `amount_due` across all returned invoices. The latest-invoice card and multiple-unpaid-invoices cases use the same expectation.
- **Billing cycles:** The current cycle follows the calendar-period pattern shown by that account's invoice history. The cycle-consistency case retains finding #39 until execution confirms its behaviour.
- **Monthly complete-data rows:** Skip normal 30-point comparisons only when the API lacks complete dates in the requested window. On 31 October 2026, Julia Fox had 24 dates and Priya Raman had 29: two unit rows each, four skips. Mereana Tipene now has 30 dates and both rows execute. Re-evaluate the response at runtime; neither account names nor a fixed skip count determine eligibility.
- **Incomplete Monthly behaviour:** Its dedicated case checks available days and missing-day markings. It executes even when complete-data rows are inapplicable.
- **Theme screenshots:** Functional theme checks are automatable; visual baselines are created on the Jenkins Mac and reviewed before acceptance.

## Manual review and boundaries

`Sparky AI › Other Questions › Answer quality review (exploratory)` is a manual-only leaf. It reviews answers attached by live tests without a placeholder automated case. See [manual-review.md](manual-review.md).

Contact tests check clipboard contents, visible contact details, and `tel:`/`mailto:` targets. A browser test cannot verify a separate phone or mail application.

Real bill reading is excluded because the deployed reader is unavailable. Type, empty-file, and size validation before reading remains planned automation. Solar, voice input, mobile, registration beyond its entry link, and non-functional testing are outside the design scope.
