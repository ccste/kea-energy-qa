# Billing coverage

The local Xmind master and Markdown export contain the same **14 Billing leaves**, implemented as **41 tests**. All 17 Billing notes, including shared behaviour notes, were compared between the two local documents. The account-balance expectation includes the approved correction: **Amount outstanding is the sum of `amount_due` across every invoice**.

Three data-driven leaves expand across the nine invoice-bearing accounts: Ana Whitiora, Tama Rewiri, Mere Kahu, Josh Fuller, Priya Raman, Daniel Okafor, Rangi Paterson, Mereana Tipene, and Generated Demo Household. The several-unpaid-invoices leaf has two account rows. The invoice-details leaf has three independent tests for its three closing methods.

Each test uses a fresh browser context with setup-prepared authentication. Journeys start on Dashboard and enter Billing through the sidebar. All paths below begin with `Billing`; file names are relative to `tests/billing/`.

| Behaviour and design path | Leaf title | Spec / account or input | Tests |
|---|---|---|---:|
| View the latest invoice › Positive Testing | Invoice card matches the API | `latest-invoice.spec.ts` / all nine invoice-bearing accounts | 9 |
| View the latest invoice › Positive Testing | Charges excluding GST + GST = Total | `latest-invoice.spec.ts` / all nine invoice-bearing accounts | 9 |
| View the latest invoice › Data scenarios | Account with no invoices | `latest-invoice.spec.ts` / July Household | 1 |
| View the latest invoice › Data scenarios | Julia Fox's August 2024 invoice is shown | `latest-invoice.spec.ts` / Julia Fox; independent printed-invoice fixture | 1 |
| View the latest invoice › Data scenarios | Several unpaid invoices: Amount outstanding | `latest-invoice.spec.ts` / Rangi Paterson and Generated Demo Household | 2 |
| View the latest invoice › Negative Testing | Billing service unavailable | `latest-invoice.spec.ts` / Ana; intercepted billing GET 500 and recovery | 1 |
| Billing history › Positive Testing | Rows match the API | `history.spec.ts` / all nine invoice-bearing accounts | 9 |
| Billing history › Positive Testing | Actions offered per status | `history.spec.ts` / Generated Demo Household; Due and Paid rows | 1 |
| View an invoice | View opens the invoice details | `invoice-actions.spec.ts` / Ana; Close button, Escape, and outside click | 3 |
| Download an invoice | Download from the history row | `download-invoice.spec.ts` / Ana; DEMO-INV-232001 | 1 |
| Download an invoice | Download from the View dialog | `download-invoice.spec.ts` / Ana; DEMO-INV-232001 | 1 |
| Download an invoice | Partially paid invoice | `download-invoice.spec.ts` / Generated; INV231931124 | 1 |
| Download an invoice | Paid invoice | `download-invoice.spec.ts` / Generated; INV568320337 | 1 |
| Pay an invoice | Pay a due invoice | `invoice-actions.spec.ts` / Ana; prototype action | 1 |
| **Total** | **14 leaves** | **23 latest-invoice, 10 history, 4 action, and 4 download tests** | **41** |

## Invoice values and account balance

Independent Billing API requests supply the selected account's customer details, current plan, and issued invoices. The tests verify the oracle's customer ID before comparing the latest invoice. The newest invoice supplies the card's period, status, due date, record, charge lines, and invoice Total. The card's Account and the avatar menu's customer ID must both match the selected account.

Amount outstanding is an account-wide balance. The tests validate each `amount_due` as a finite number, convert balances to cents, sum every invoice, and format the result as dollars with two decimal places. They do not substitute the newest invoice's balance or sum invoice totals. The dedicated multiple-invoice cases also require several unpaid records and check that each record with money owed is labelled Due.

The card comparison checks the fixed title, subtitle, explanatory note, customer fields, charge rows, and agreement with the first history row. Related field comparisons use soft assertions so an incorrect balance does not hide otherwise useful evidence. The separate arithmetic leaf reads Charges excluding GST, GST, and Total from the screen and verifies their sum to the cent without using API figures as its arithmetic oracle.

History comparisons check each record's position, period and due-date text, amount, status, and total row count against the response. A separate comparison of visible ISO period-start dates verifies that the screen is strictly newest first, independently of the response order. Due-date absence uses the specified `Due date not on file` text. The Generated household provides both Paid and Due records for action availability: every record offers View and Download, and only Due records offer Pay.

The suite does not impose a new GST calculation or infer payments from an invoice's age. The existing data questions about zero GST and missing payment records are outside these functional leaves.

## Independent Julia invoice scenario

`data/billing-cases.ts` contains Julia Fox's documented printed invoice: record `DEMO-INV-20240831`, period `2024-08-08 – 2024-08-31`, Total `$50.54`, customer `Julia Fox`, and address `1 Alpha Road, Deltaville`.

This test does not obtain its expectations from the Billing API. It requires both the card and history record to be present. An empty API response cannot turn the missing invoice into a passing test. The fixture contains no credentials or authentication state.

## Dialogs, downloads, and payment boundary

The invoice dialog checks the selected record's title, amount, period, due date, status, bank-transfer reference text, and enabled download action. Close button, Escape, and outside click each have a fresh context and an independent result. After closure, the history record remains visible.

Download listeners are registered before the click. Both Ana entry points check the suggested filename, success toast, readable single-page PDF, customer and invoice fields, charge rows, and Total. The PDF's billing-period separator is a plain hyphen. Its payment-status headline and the amount immediately below it are checked in the top-right header region, so a matching amount elsewhere on the page cannot satisfy the balance assertion.

The partial-payment scenario fixes the documented invoice total at `$386.84` and remaining balance at `$231.37`. Its header must show `AMOUNT DUE` with the remaining balance, while Total remains the invoice total. The Paid scenario fixes the documented `$166.44` invoice, its period and due date, and the `$144.73` charges plus `$21.71` GST. Its header must show `AMOUNT PAID` with the full invoice total.

The implementation uses `pdfjs-dist` to parse the actual downloaded bytes instead of the design note's suggested direct text extraction. A PDF parser handles document encoding and text placement and exposes coordinates for checking which amount belongs to the payment-status label. The helper groups text by baseline for charge-row comparisons; it does not calculate billing values or import application code. The parser releases its resources in `finally`. The calling download assertion owns file cleanup in its own `finally` block, including failures before parsing, so downloaded documents do not remain as test fixtures.

Pay is a prototype action. The expected toast is `Payments require retailer payment-provider setup. No payment was taken.` The test checks that the record remains Due and Amount outstanding remains unchanged, then reloads the page and confirms that the API record is unchanged. An API write guard blocks and records any attempted non-GET/non-HEAD application request; an unexpected attempt fails the test while preventing a real payment write to the shared environment.

## Service recovery and defect references

The service-error test intercepts only the selected account's Billing GET and returns HTTP 500. It checks the error title, error message, Retry button, and absence of the card and history. The interception is then removed; Retry must load the real latest invoice and history. Successful responses are not mocked.

| Finding | Expected behaviour retained by the tests | Affected test rows |
|---|---|---|
| #9 | Julia's independently documented August invoice is visible | Julia invoice scenario |
| #10 | A partially paid PDF labels the remaining balance as AMOUNT DUE | Generated partial-payment download |
| #11 | Account balance includes every invoice's remaining amount | Card comparisons for Rangi, Mereana, and Generated; dedicated outstanding-balance comparisons for Rangi and Generated |

These annotations identify prior suspected findings. They do not pre-assign a failing outcome: tests assert the approved expectation and report the deployed result. No `test.fail()` or defect-based skip is used. One shared cause can produce multiple independent failures, each with its own result and evidence.

## Boundaries and commands

All 14 Billing leaves are automated. There are no manual-only Billing cases or approved Billing skips. Billing scenarios do not change account settings; Rangi is a reader and runs before the later Settings phase. Normal managed-run preparation still restores alert defaults and prepares account states.

Run these commands from the standalone test-project directory:

```sh
npm test -- tests/billing
npm run test:list -- tests/billing
npm run report
```

Execution uses headless Chromium and two workers by default. An explicit `--workers 2` is optional; `--headed` opens browser windows for observing a run. The existing npm runner remains the execution entry point so preparation, phase ordering, report generation, and cleanup apply. Native Playwright discovery does not replace that execution flow.

## Execution review

Verified on **31 October 2026** against `https://13.54.25.80`, using headless Chromium and two functional-test workers after setup.

- Billing: **41 tests — 34 passed, 7 failed, 0 retries, and 0 skips**. The separate setup result passed, giving 42 results for the feature-only run.
- Current implemented suite: **242 results — 222 passed, 16 failed, 0 retries, and 4 approved Usage Monthly skips**, including setup. Previously implemented features retained the same five Profile failures and four Usage failures.
- All seven Billing failures reproduce existing findings. No new product finding, environment failure, or unresolved test-script failure was identified.

| Failing test | Finding | Expected | Observed |
|---|---|---|---|
| Julia's August invoice | #9 | Documented invoice `DEMO-INV-20240831`, Total `$50.54`, visible on the card and in history | Empty state and no invoice row |
| Partially paid PDF | #10 | AMOUNT DUE `$231.37`; Total `$386.84` | AMOUNT DUE incorrectly shows `$386.84`; Total is correct |
| Card matches API — Rangi | #11 | Account balance `$823.06` | Newest-invoice balance `$151.04` |
| Card matches API — Mereana | #11 | Account balance `$418.14` | Newest-invoice balance `$158.31` |
| Card matches API — Generated | #11 | Account balance `$934.75` | Newest-invoice balance `$371.88` |
| Several unpaid invoices — Rangi | #11 | Account balance `$823.06`; unpaid rows Due | Balance `$151.04`; statuses correct |
| Several unpaid invoices — Generated | #11 | Account balance `$934.75`; unpaid rows Due | Balance `$371.88`; statuses correct |

The seven failing rows represent three distinct defects. Passing coverage includes history ordering and values, action availability, UI charge arithmetic, empty-state behaviour, dialog closure, prototype Pay behaviour, unpaid and paid PDF contents, and recovery from an intercepted service error.

The initial verification exposed test issues with the avatar's `CID:` display prefix, a PDF headline split into separate text items, and duplicate download cleanup masking the original assertion. These were corrected before the final feature run and full regression. History row counting also remains independent of whether a View action is present. The final failures contain only the product assertions recorded above.

TypeScript checking and whitespace checks passed. A clean standalone copy installed its own dependencies, passed type checking, discovered all 41 Billing tests, and loaded the PDF parser successfully without application-source imports. HTML, JUnit, and Allure agree on all 242 results; Allure contains 242 unique test histories, no broken results, and no duplicate attempts. Every failed result retains its defect reference, screenshot, video, and diagnostic evidence. Report generation succeeded, temporary authentication states were removed, and downloaded PDFs were deleted after inspection. Reports, credentials, and runtime files remain excluded from version control.
