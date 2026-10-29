# Functional coverage

The approved design has **173 leaves across 12 features**. One leaf represents one case; data-driven leaves produce one result per account or input. Leaf counts measure traceability, not the eventual Playwright test count.

This foundation contains two representative proof cases. A seed verifies only the stated account and checkpoints; it does not complete its feature or its data-driven leaf.

| Feature | Design leaves | Current implementation | Remaining work |
|---|---:|---|---|
| Login | 23 | Protected-page redirection seed | Full Login coverage |
| Reset Password | 9 | Not implemented | All leaves and account rows |
| Logout | 7 | Not implemented | All leaves |
| Profile Management | 15 | Not implemented | All leaves and account rows |
| Power Bill Shock Warning | 14 | Not implemented | Read cases and isolated settings-linked cases |
| Usage | 20 | Dashboard summary seed, July Household only | All 15 summary accounts and remaining leaves |
| Billing | 14 | Not implemented | All leaves and account rows |
| Plan Request | 12 | Not implemented | All leaves, including nine selection combinations |
| Sparky AI | 29 | Not implemented | Chat mocks, live checks, one manual review leaf |
| Settings Change | 16 | Not implemented | All leaves and reviewed Mac screenshot baselines |
| FAQs | 9 | Not implemented | All topics, questions, and search rows |
| Contact | 5 | Not implemented | All leaves; external-app boundary documented |
| **Total** | **173** | **2 provisional seed mappings** | **171 leaves without a seed; both seeds need feature review** |

## Foundation seeds

| Design path | Account | Proof scope |
|---|---|---|
| Login › Access protected pages › Signed out: opening a protected page redirects to /login | Signed out | Opening a protected route shows Login |
| Usage › View the usage summary on the Dashboard › Positive Testing › The four tiles match the API (all 15 accounts) | July Household (`H-JUL`) | Saved sign-in state, Dashboard controls, four API-backed summary values |

The first seed does not establish full Login coverage. The second is one provisional row of the 15-account leaf. Extend these seeds in their feature steps instead of duplicating them as foundation-only acceptance tests.

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
