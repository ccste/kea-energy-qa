# Functional coverage

The approved design has **173 leaves across 12 features**. One leaf represents one case; data-driven leaves produce one result per account or input. Leaf counts measure traceability, not the eventual Playwright test count.

Login implements all 23 of its leaves as 24 tests. Usage has one representative Dashboard proof row for July Household; that row does not complete its 15-account design leaf. Implementation and execution review remain separate.

| Feature | Design leaves | Current implementation | Remaining work |
|---|---:|---|---|
| Login | 23 | All 23 leaves implemented as 24 tests | See [Login mapping](login-coverage.md) and current run results |
| Reset Password | 9 | Not implemented | All leaves and account rows |
| Logout | 7 | Not implemented | All leaves |
| Profile Management | 15 | Not implemented | All leaves and account rows |
| Power Bill Shock Warning | 14 | Not implemented | Read cases and isolated settings-linked cases |
| Usage | 20 | Dashboard summary seed, July Household only | Remaining 14 summary accounts and other leaves |
| Billing | 14 | Not implemented | All leaves and account rows |
| Plan Request | 12 | Not implemented | All leaves, including nine selection combinations |
| Sparky AI | 29 | Not implemented | Chat mocks, live checks, one manual review leaf |
| Settings Change | 16 | Not implemented | All leaves and reviewed Mac screenshot baselines |
| FAQs | 9 | Not implemented | All topics, questions, and search rows |
| Contact | 5 | Not implemented | All leaves; external-app boundary documented |
| **Total** | **173** | **23 complete leaf mappings and 1 partial leaf** | **150 leaves remain unfinished, including the partial Usage leaf** |

## Implemented coverage

The [Login mapping](login-coverage.md) lists every implemented Login leaf. The original foundation proofs remain in their feature specs:

| Design path | Account | Proof scope |
|---|---|---|
| Login › Access protected pages › Signed out: opening a protected page redirects to /login | Signed out | Opening a protected route shows Login |
| Usage › View the usage summary on the Dashboard › Positive Testing › The four tiles match the API (all 15 accounts) | July Household (`H-JUL`) | Saved sign-in state, Dashboard controls, four API-backed summary values |

The protected-route case is included in the complete Login totals. The summary proof remains one row of the Usage leaf and will be expanded in the Usage step, without duplicating it as a foundation-only acceptance test.

## Coverage rules

- Preserve feature, behaviour, and leaf titles in describe blocks and test titles. Name every data row's account or input.
- Track implementation and execution separately. A passing representative account does not cover other rows.
- Preserve expected behaviour when an existing product defect is present.
- Keep one result per affected case even when a root cause is shared.
- Run each reviewed feature on the deployed site with few workers before advancing its coverage status.

## Approved interpretations

- **Billing balance:** Amount outstanding means total debt: the sum of `amount_due` across all returned invoices. The latest-invoice card and multiple-unpaid-invoices cases use the same expectation.
- **Billing cycles:** The current cycle follows the calendar-period pattern shown by that account's invoice history. The cycle-consistency case retains finding #39 until execution confirms its behaviour.
- **Monthly complete-data rows:** Skip the normal 30-point comparisons only when fewer than 30 complete days exist. Current data identifies Julia Fox, Mereana Tipene, and Priya Raman: two unit rows each, six explicit skip results. Re-evaluate the API response at runtime instead of hard-coding six skips.
- **Incomplete Monthly behaviour:** Its dedicated case checks available days and missing-day markings. It executes even when complete-data rows are inapplicable.
- **Theme screenshots:** Functional theme checks are automatable; visual baselines are created on the Jenkins Mac and reviewed before acceptance.

## Manual review and boundaries

`Sparky AI › Other Questions › Answer quality review (exploratory)` is a manual-only leaf. It reviews answers attached by live tests without a placeholder automated case. See [manual-review.md](manual-review.md).

Contact tests check clipboard contents, visible contact details, and `tel:`/`mailto:` targets. A browser test cannot verify a separate phone or mail application.

Real bill reading is excluded because the deployed reader is unavailable. Type, empty-file, and size validation before reading remains planned automation. Solar, voice input, mobile, registration beyond its entry link, and non-functional testing are outside the design scope.
