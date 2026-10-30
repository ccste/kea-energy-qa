# Kea Energy web E2E tests

Playwright + TypeScript end-to-end tests for Kea Energy, a University of Auckland Internship team project (2026). Work in progress.

Functional browser tests for the deployed Kea Energy customer website, written in Playwright and TypeScript. This directory is a standalone project with its own dependencies; it requires no local application stack and imports no application code.

## Current status

Login covers all 23 design leaves as 24 tests, Reset Password covers nine leaves as 18 tests, and Logout covers seven leaves as seven tests. Profile Management covers 15 leaves as 19 tests; Usage covers 20 leaves as 132 tests; Billing covers 14 leaves as 41 tests; Plan Request covers 12 leaves as 22 tests; FAQs cover nine leaves as 31 tests. The latest full-suite AWS run produced **295 results: 266 passed, 25 failed, and 4 skipped**, with no retries. Five failures reproduce Profile findings #2 and #3; four reproduce Usage findings #4, #6, #7, and #8; seven reproduce Billing findings #9, #10, and #11; five reproduce Plan Request findings #12–15; four reproduce FAQ search-count finding #35. The skips are the approved incomplete Monthly comparisons for Julia and Priya, two units each. Mereana's current 30-day data supports both Monthly comparisons.

See [coverage](docs/coverage.md) for the 173-leaf inventory and the [Login](docs/login-coverage.md), [Reset Password](docs/reset-password-coverage.md), [Logout](docs/logout-coverage.md), [Profile](docs/profile-coverage.md), [Usage](docs/usage-coverage.md), [Billing](docs/billing-coverage.md), [Plan Request](docs/plan-request-coverage.md), and [FAQ](docs/faq-coverage.md) mappings for traceability and execution details. Known-defect tests preserve the correct expectation and fail normally; the current full run therefore exits with a nonzero status. The partial-Monthly behaviour test executes and fails for finding #8; the complete-data exception does not suppress it.

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
- Authenticated API requests restore alert preferences. Settings-change tests use Rangi Paterson and restore defaults before and after each test, including failed tests.
- Plan Request uses the signed-in browser's token for its one real submission. That case requires a 201 response, a pending-review receipt, and an unchanged current plan after reload. It disables automatic retries even in CI and forwards at most one correctly formed request; the failure and double-click cases intercept the write. Each fresh run including the positive case may store one request. Other plan journeys block unexpected API writes.
- FAQ uses Mere Kahu's saved sign-in state and enters Help & Support through the sidebar. Its 15 static answers and two notes have independent fixed expectations; no FAQ API client is needed. Topic filtering, searching, and expansion run in the browser. API writes are blocked, including chat submissions; the two no-match journeys only navigate to the assistant.
- Live Sparky conversations are recorded by the deployed service and may incur model costs.

Saved states, credentials, tokens, reports, and temporary evidence are excluded from version control. Report artifacts can contain session details and demo-account data; review them before sharing.

## Results and evidence

Each managed run produces a combined Playwright HTML report, Allure results, and JUnit XML under `reports/latest/`. Blob reports from separate phases are merged for HTML and JUnit. Allure appends results during each phase into the same clean results directory; it is not replayed during blob merging. All reports retain failures from earlier phases. `run-summary.json` records phase and report-generation exit codes.

```sh
npm run report
npm run report:allure
npm run report:allure:open
```

The pinned Allure command-line tool requires Java. Report outputs are `html/`, `allure-results/`, `allure-report/`, and `junit.xml` inside `reports/latest/`. Failure evidence uses screenshots and retained failure videos. A trace is recorded on the first retry; CI enables one retry for ordinary functional tests, while local runs, settings, and live Sparky default to no retries. The real Plan Request submission always disables retries. Setup retains no browser evidence because authentication carries credentials. Live Sparky tests also attach answers and stream evidence for [manual review](docs/manual-review.md).

Defect annotations identify product findings without changing failures into passes. See [known defects](docs/known-defects.md). Each review records passes, individual failures classified as an existing defect, new finding, or test issue, and any automation limits.

## Scope and remaining work

Only Chromium is configured. The design covers Login, Reset Password, Logout, Profile Management, Power Bill Shock Warning, Usage, Billing, Plan Request, Sparky, Settings Change, FAQs, and Contact. Features are implemented and reviewed individually; the coverage inventory states what exists today.

Solar, Power Clash functionality, voice input, registration beyond its entry link, mobile, non-functional testing, and reading real uploaded bills are outside this suite. Bill-upload validation before reading remains in scope. Jenkins integration will be added in a separate step; this foundation has no Jenkins pipeline.
