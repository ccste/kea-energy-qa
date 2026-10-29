# Kea Energy web E2E tests

Functional browser tests for the deployed Kea Energy customer website, written in Playwright and TypeScript. This directory is a standalone project with its own dependencies; it requires no local application stack and imports no application code.

## Current status

The foundation contains two representative proof tests: signed-out protected-page redirection and the Dashboard usage summary for July Household. These prove the infrastructure; Login and Usage coverage remains incomplete. See [coverage](docs/coverage.md) for the 173-leaf design inventory and implementation status.

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
| `npm test -- tests/login --workers 2` | One feature, once its specs exist |
| `npm run test:ai` | Implemented live Sparky tests only |
| `npm run test:all` | Implemented functional and live Sparky tests |
| `npm run test:list` | List selected tests without signing in or resetting accounts |
| `npm run typecheck` | Check TypeScript without running browser tests |

The managed runner prepares the environment once, then executes selected phases in order: `setup` → `chromium` → `settings` → `ai`. Ordinary test failures are collected without preventing later phases from running. Setup failure stops the run because authentication or shared-data preconditions are not ready. Empty phases contribute no product-test results.

The read-only phase uses two workers by default. Settings and live Sparky each use one. Rangi Paterson can be read during the first phase; settings writes begin only after readers finish. Run individual features through `npm test` so setup and shared-environment safeguards still apply.

Project dependencies are intentionally not used: a failed prerequisite project would prevent its dependents from running, including failures that correctly expose known product defects. `scripts/run-suite.ts` waits for each phase, retains its exit code, and continues after product failures. It stops after setup failure. The runner also prevents overlapping local runs; do not run separate copies against the shared site concurrently.

Use the npm entry points instead of calling `playwright test` directly. An unmatched selection fails before touching the site. Temporary account states are removed at the end of the run. If a forcibly terminated run leaves `.runtime/run.lock`, confirm no test process is still running before deleting that lock.

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
- Authenticated API requests restore alert preferences. Settings tests use Rangi Paterson and restore defaults before and after each test, including failed tests.
- The final Plan Request coverage records one real request per run. Other request scenarios intercept the write. Live Sparky conversations are recorded by the deployed service and may incur model costs.

Saved states, credentials, tokens, reports, and temporary evidence are excluded from version control. Report artifacts can contain session details and demo-account data; review them before sharing.

## Results and evidence

Each managed run produces a combined Playwright HTML report, Allure results, and JUnit XML under `reports/latest/`. Blob reports from separate phases are merged for HTML and JUnit. Allure appends results during each phase into the same clean results directory; it is not replayed during blob merging. All reports retain failures from earlier phases. `run-summary.json` records phase and report-generation exit codes.

```sh
npm run report
npm run report:allure
npm run report:allure:open
```

The pinned Allure command-line tool requires Java. Report outputs are `html/`, `allure-results/`, `allure-report/`, and `junit.xml` inside `reports/latest/`. Failure evidence uses screenshots and retained failure videos. A trace is recorded on the first retry; CI enables one retry for read-only tests, while local runs, settings, and live Sparky default to no retries. Setup retains no browser evidence because authentication carries credentials. Live Sparky tests also attach answers and stream evidence for [manual review](docs/manual-review.md).

Defect annotations identify product findings without changing failures into passes. See [known defects](docs/known-defects.md). Each review records passes, individual failures classified as an existing defect, new finding, or test issue, and any automation limits.

## Scope and remaining work

Only Chromium is configured. The design covers Login, Reset Password, Logout, Profile Management, Power Bill Shock Warning, Usage, Billing, Plan Request, Sparky, Settings Change, FAQs, and Contact. Features are implemented and reviewed individually; the coverage inventory states what exists today.

Solar, Power Clash functionality, voice input, registration beyond its entry link, mobile, non-functional testing, and reading real uploaded bills are outside this suite. Bill-upload validation before reading remains in scope. Jenkins integration will be added in a separate step; this foundation has no Jenkins pipeline.
