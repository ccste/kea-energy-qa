# Kea Energy web E2E tests

Playwright + TypeScript end-to-end tests for Kea Energy, a University of Auckland Internship team project (2026). Work in progress.

Functional browser tests for the deployed Kea Energy customer website, written in Playwright and TypeScript. This directory is a standalone project with its own dependencies; it requires no local application stack and imports no application code.

## Current status

The 12 features now map all 173 design leaves: **172 automated leaves produce 412 product-test rows**, and Sparky has **one manual answer-quality review leaf**. Sparky adds 14 interface/file-validation rows and 39 live-answer rows. Jenkins and final acceptance remain pending.

**Evidence note — 31 October 2026:** The retained evidence identifies **57 test cases with product-expectation failures: 39 from earlier features and 18 from Sparky**. This is a case-by-case assessment across separate runs, including offline checks of the final assertion corrections, not a single Playwright execution result. Environment/service failures and identified test-assertion errors are excluded from this assessment. Live model answers can vary, so future runs may produce different failure counts; a later pass alone does not invalidate an earlier evidenced failure or establish a fix.

Sparky has 53 automated cases: the latest evidence satisfies the checked expectations for 35 cases and does not satisfy them for 18. The final source and usage-timing assertion corrections were verified offline against saved answers; the complete live selection has not been rerun after those last changes. See the [case assessment](docs/sparky-coverage.md#current-case-assessment) and raw execution history below.

The complete AWS regression on 31 October 2026 produced **413 results including setup: 340 passed, 69 failed, and 4 approved Monthly skips**, with no retries. The failures include 39 previously documented product failures, 11 Sparky product-assertion failures, 11 service/environment failures, and eight Sparky test-assertion errors. The eight test errors were corrected; two additional driver checks were tightened after they accepted incomplete explanations. A separate targeted run produced **16 passes and six failures from 22 results**, with no retries or skips; all seven earlier-feature service/wait cases passed. Two final assertion edge cases were corrected against saved answers without another model call. These raw run totals must not be read as 69 distinct bugs or as the final corrected test state. See the [Sparky execution review](docs/sparky-coverage.md#execution-review) for the targeted outcome and failure classification.

See [coverage](docs/coverage.md) for all feature mappings and the 173-leaf inventory. Known-defect tests keep the correct expectation and fail normally. The four skips remain Julia's and Priya's normal Monthly comparisons, two units each; the dedicated incomplete-Monthly behaviour test still executes and fails for #8. Settings Light and Dark baselines were accepted with that step's submission approval on 31 October 2026.

## Install and run

Run commands from this directory with Node.js 22.18 or later and npm installed:

```sh
npm ci
npx playwright install chromium
npm test -- --workers 2
```

`BASE_URL` defaults to `https://13.54.25.80`. Override it when the agreed deployed environment changes:

```sh
BASE_URL=https://13.54.25.80 npm test -- --workers 2
```

The deployed site is shared with demonstrations. Use a small worker count and coordinate a clear test window. Every managed run restores alert preferences for all 15 demo accounts before preparing signed-in browser states.

| Command | Selection |
|---|---|
| `npm test` | Implemented functional tests, excluding live `@ai` tests |
| `npm test -- --grep @smoke --workers 2` | Implemented smoke tests |
| `npm test -- tests/login --workers 2` | The complete Login feature |
| `npm test -- tests/reset-password --workers 2` | All three Reset Password entry points |
| `npm test -- tests/logout` | All seven Logout cases, with two workers by default |
| `npm test -- tests/profile` | All 19 Profile tests; known findings remain visible as failures |
| `npm test -- tests/usage` | All 132 Usage rows, with runtime Monthly eligibility and visible defect failures |
| `npm test -- tests/billing` | All 41 Billing tests, including actual PDF downloads and account-wide outstanding balances |
| `npm test -- tests/plans` | All 22 Plan Request tests; includes one real Customer Care request |
| `npm test -- tests/plans --grep-invert 'Request a new plan'` | The other 21 Plan Request tests, with no real plan submission |
| `npm test -- tests/help/faq` | All 31 FAQ tests; four search-count rows retain finding #35 |
| `npm test -- tests/help/contact` | All five Contact tests; real clipboard copies and link targets; two visible-detail cases retain finding #31 |
| `npm test -- tests/bill-shock` | All 43 Bill Shock tests: 37 reader cases followed by six isolated Rangi settings cases |
| `npm test -- tests/settings` | All 17 Settings tests with one worker; includes Light/Dark viewport comparisons and five known-defect failures |
| `npm test -- tests/sparky` | 14 chat-interface and invalid-file tests; no real model answers |
| `npm run test:ai -- tests/sparky` | 39 live Sparky tests with one worker and no retries; answers retained for review |
| `npm run test:all -- tests/sparky` | Both Sparky layers, with one shared setup |
| `npm run test:ai` | Implemented live Sparky tests only |
| `npm run test:all` | Implemented functional and live Sparky tests |
| `npm run test:list` | List selected tests without signing in or resetting accounts |
| `npm run typecheck` | Check TypeScript without running browser tests |

The managed runner prepares the environment once, then executes selected phases in order: `setup` → `chromium` → `settings` → `ai`. Ordinary test failures are collected without preventing later phases from running. Setup failure stops the run because authentication or shared-data preconditions are not ready. Empty phases contribute no product-test results.

The general functional phase uses two workers by default. Settings and live Sparky each use one. Rangi Paterson can be read during the first phase; settings writes begin only after readers finish. Plan Request's one permitted submission runs in the general phase because it records a request without changing the account's active plan or alert preferences. Run individual features through `npm test` so setup and shared-environment safeguards still apply.

`--workers 2` is optional when the `WORKERS` environment variable is unset: two is already the default. Runs are headless unless `--headed` is supplied. For example, `npm test -- tests/reset-password` runs the 18 Reset Password tests and the required setup result without visible browser windows.

Project dependencies are intentionally not used: a failed prerequisite project would prevent its dependents from running, including failures that correctly expose known product defects. `scripts/run-suite.ts` waits for each phase, retains its exit code, and continues after product failures. It stops after setup failure. The runner also prevents overlapping local runs; do not run separate copies against the shared site concurrently.

Use the npm entry points instead of calling `playwright test` directly. An unmatched selection fails before touching the site. Temporary account states are removed at the end of the run. If a forcibly terminated run leaves `.runtime/run.lock`, confirm no test process is still running before deleting that lock.

`npm test` invokes `scripts/run-suite.ts`, which calls the installed Playwright CLI for each selected phase. The `--` separator forwards file selections and options such as `--headed` and `--workers` to that script. Tests and assertions still run in Playwright Test.

The configuration can be loaded by editors without preparing accounts. Native read-only discovery such as `npx playwright test tests/reset-password --list` also works. The Microsoft Playwright extension can discover tests, but its Run and Debug buttons do not invoke the managed runner and are not supported execution entry points. Actual execution checks the managed run in a global hook and at the setup and fixture entries, before application requests. Use the terminal commands above to run tests; do not initialize a second Playwright project through the extension.

## Structure

```text
api/                 Typed API access for expected values and cleanup
data/                Account metadata and stable expected UI data
docs/                Coverage, known defects, and manual review
fixtures/            Page objects, account selection, API access, cleanup
pages/               Page objects and shared UI components
scripts/             Managed phases and report handling
tests/               Feature specs and setup preconditions
utils/               Small display-format and stream helpers
playwright.config.ts Browser projects, evidence, and reporters
```

Page objects hold locators and customer actions; assertions remain in feature specs. API calls provide expected values and restore shared preferences. Details are in [CONVENTIONS.md](CONVENTIONS.md).

## Authentication and shared data

- Credentials are fetched at runtime from `/api/auth/demo-accounts`. Never store passwords or tokens in source files.
- Setup signs in through the browser once per account, dismisses the Welcome dialog, and saves browser state locally. Every product test gets a fresh browser context.
- Login, Reset Password, and Logout use the sign-in form where their design requires it.
- Reset Password starts signed out and uses a browser sign-in for Profile and Settings journeys. Its reset controls only display prototype confirmations: they send no email and change no password. These cases run in the read-only phase, with unexpected API writes blocked after sign-in and all browser API methods observed during reset actions.
- Logout signs July Household in through the form for every case, then opens Power Clash from the sidebar. It checks confirmation and cancellation from expanded navigation, collapsed navigation, and the profile menu, plus protected-page access after logout. Cancellation checks include a reload and visible account identity.
- Profile reuses setup-created sign-in states and enters through the avatar menu. Request changes remains a browser prototype; tests block unexpected browser API writes and compare refreshed details with the original values. The backend profile-update endpoint is not used.
- Usage reads protected usage-series and hourly-usage endpoints with the selected account's setup token through `usageApi`. It validates the saved origin and account, makes independent API requests for expectations, and performs no extra login. Usage journeys and oracles make no account changes.
- Billing reuses setup-created sign-in states and compares the UI with independent invoice reads. Amount outstanding sums every invoice's remaining balance. Downloads are parsed from real PDF bytes and removed after inspection. Pay remains a prototype: its test blocks unexpected API writes and verifies unchanged invoice data after reload.
- Sparky interface tests replace only the selected browser requests with prepared SSE events. Live cases ask through the real page, capture that same response and compare it with independent account records. Their browser guard allows only the selected account's chat request; invalid-file validation and the mock-history sign-in journey have explicit exceptions. Live conversations are recorded server-side; model calls may incur costs. The plan-switch question stops before confirmation.
- Authenticated API requests restore alert preferences. Settings-change tests use Rangi Paterson and restore defaults before and after each test, including failed tests.
- Plan Request uses the signed-in browser's token for its one real submission. That case requires a 201 response, a pending-review receipt, and an unchanged current plan after reload. It disables automatic retries even in CI and forwards at most one correctly formed request; the failure and double-click cases intercept the write. Each fresh run including the positive case may store one request. Other plan journeys block unexpected API writes.
- FAQ uses Mere Kahu's saved sign-in state and enters Help & Support through the sidebar. Its 15 static answers and two notes have independent fixed expectations; no FAQ API client is needed. Topic filtering, searching, and expansion run in the browser. API writes are blocked, including chat submissions; the two no-match journeys only navigate to the assistant.
- Contact shares the Help entry fixture and API write guard. It checks real clipboard copies, exact phone/email targets, visible contact details, and assistant navigation. Its single file runs cases in order with independent results to prevent clipboard interference in headed mode. Only Copy cases receive origin-scoped clipboard permissions; they seed and clear test-owned values. In headed mode this replaces the Mac clipboard; earlier contents are not captured or restored. No call, email, or chat is sent.
- Bill Shock compares panel presentation with the browser's assessment response and uses visible Billing/Usage dates for the approved calendar-cycle assumption. Reader journeys block browser API writes. Six Rangi cases save settings through the UI in the later single-worker phase, confirm saved preferences and warning state, and restore full defaults through authenticated API calls. These cases are included by selecting `tests/bill-shock`; they do not implement the separate Settings feature. Notification delivery and forecast-model validation are outside this feature's scope.
- Settings uses Rangi after the reader phase, with one worker and no retries. Preference writes are limited to his exact endpoint; full defaults are restored before and after every case. The theme is local to the current sign-in and must not save account preferences. Server-failure cases intercept only the relevant browser GET or PUT; normal saves and invalid-amount responses use the real service. Light and Dark screenshots cover the initial Settings viewport, with initial baselines captured on the Jenkins Mac and accepted with this step's submission approval. See [Settings coverage](docs/settings-coverage.md) for all 16 design leaves and the baseline-review process.
- Live Sparky conversations are recorded by the deployed service and may incur model costs.

Saved states, credentials, tokens, reports, and temporary evidence are excluded from version control. Report artifacts can contain session details and demo-account data; review them before sharing.

## Results and evidence

Each managed run produces a combined Playwright HTML report, Allure results, and JUnit XML under `reports/latest/`. Blob reports from separate phases are merged for HTML and JUnit. Allure appends results during each phase into the same clean results directory; it is not replayed during blob merging. All reports retain failures from earlier phases. `run-summary.json` records phase and report-generation exit codes.

```sh
npm run report
npm run report:allure
npm run report:allure:open
```

The live-answer evidence helpers have offline regression checks:

```sh
node --import tsx --test utils/chat-stream.test.ts utils/chat-text.test.ts utils/chat-dates.test.ts utils/chat-usage-timing.test.ts
```

They cover stream completion and reset, display-format comparison without dropping meaningful content, and dates with an unambiguous year stated earlier in the same sentence. They make no AWS requests.

The pinned Allure command-line tool requires Java. Report outputs are `html/`, `allure-results/`, `allure-report/`, and `junit.xml` inside `reports/latest/`. Failure evidence uses screenshots and retained failure videos. A trace is recorded on the first retry; CI enables one retry for ordinary functional tests, while local runs, settings, and live Sparky default to no retries. The real Plan Request submission always disables retries. Setup retains no browser evidence because authentication carries credentials. Live Sparky tests also attach answers and stream evidence for [manual review](docs/manual-review.md).

Defect annotations identify product findings without changing failures into passes. See [known defects](docs/known-defects.md). Each review records passes, individual failures classified as an existing defect, new finding, or test issue, and any automation limits.

## Scope and remaining work

Only Chromium is configured. The design covers Login, Reset Password, Logout, Profile Management, Power Bill Shock Warning, Usage, Billing, Plan Request, Sparky, Settings Change, FAQs, and Contact. Features are implemented and reviewed individually; the coverage inventory states what exists today.

Solar, Power Clash functionality, voice input, registration beyond its entry link, mobile, non-functional testing, and reading real uploaded bills are outside this suite. Bill-upload validation before reading remains in scope. Jenkins integration will be added in a separate step; this foundation has no Jenkins pipeline.
