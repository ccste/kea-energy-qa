# Usage coverage

The local Xmind master and Markdown export contain the same **20 Usage leaves**, implemented as **132 tests**. Eight data-driven leaves contribute 120 rows: 15 Dashboard summaries, 90 range/unit comparisons, and 15 cross-page cost comparisons. The remaining 12 leaves have one test each.

Each test has a fresh browser context with setup-prepared authentication. Usage-page journeys start on Dashboard and enter Usage through the sidebar. The previous July Household summary proof has been expanded into the 15-account leaf rather than retained as a duplicate.

All paths below begin with `Usage`. File names are relative to `tests/usage/`.

| Behaviour and design path | Leaf title | Spec / account or input | Tests |
|---|---|---|---:|
| View the usage summary on the Dashboard › Positive Testing | The four tiles match the API (all 15 accounts) | `dashboard-summary.spec.ts` / all 15 accounts | 15 |
| View the usage summary on the Dashboard › Positive Testing | The summary opens and closes | `dashboard-summary.spec.ts` / July Household | 1 |
| View the usage summary on the Dashboard › Negative Testing | Usage data unavailable | `dashboard-summary.spec.ts` / July; intercepted household GET 500 | 1 |
| View usage on the Usage page › Page and chart display | Opens on the latest reading date, in $ and Daily | `page-display.spec.ts` / July | 1 |
| View usage on the Usage page › Page and chart display | Daily x-axis shows only the time | `page-display.spec.ts` / July | 1 |
| View usage on the Usage page › Figures match the API (all 15 accounts) › Daily (24 hourly points) | $ | `figures.spec.ts` / all 15 accounts | 15 |
| View usage on the Usage page › Figures match the API (all 15 accounts) › Daily (24 hourly points) | kWh | `figures.spec.ts` / all 15 accounts | 15 |
| View usage on the Usage page › Figures match the API (all 15 accounts) › Weekly (7 daily points) | $ | `figures.spec.ts` / all 15 accounts | 15 |
| View usage on the Usage page › Figures match the API (all 15 accounts) › Weekly (7 daily points) | kWh | `figures.spec.ts` / all 15 accounts | 15 |
| View usage on the Usage page › Figures match the API (all 15 accounts) › Monthly (30 daily points) | $ | `figures.spec.ts` / all 15 accounts; conditional complete-data rule | 15 |
| View usage on the Usage page › Figures match the API (all 15 accounts) › Monthly (30 daily points) | kWh | `figures.spec.ts` / all 15 accounts; conditional complete-data rule | 15 |
| View usage on the Usage page › Figures match the API (all 15 accounts) | Same latest-day cost as the Dashboard | `cross-page-cost.spec.ts` / all 15 accounts | 15 |
| View usage on the Usage page › Choose a date › Positive Testing | Date with readings | `date-selection.spec.ts` / Rangi, 2024-01-15; three ranges in one test | 1 |
| View usage on the Usage page › Choose a date › Negative Testing | Date with no readings | `date-selection.spec.ts` / Julia; 2024-07-01 and calendar Today in one test | 1 |
| View usage on the Usage page › Choose a date › Negative Testing | Clear the date | `date-selection.spec.ts` / July; clear, change range, re-enter date | 1 |
| View usage on the Usage page › Data scenarios | Daylight-saving change days | `data-scenarios.spec.ts` / Rangi; two transition dates in one test | 1 |
| View usage on the Usage page › Data scenarios | Estimated readings | `data-scenarios.spec.ts` / Priya; Weekly and Daily checkpoints | 1 |
| View usage on the Usage page › Data scenarios | Missing day inside the data range | `data-scenarios.spec.ts` / Priya, 2024-06-10 | 1 |
| View usage on the Usage page › Data scenarios | Less than 30 days of readings: Monthly | `data-scenarios.spec.ts` / Julia's 24 available days | 1 |
| View usage on the Usage page › Negative Testing | Usage service unavailable | `service-unavailable.spec.ts` / July; usage-series GET 500 and recovery | 1 |
| **Total** | **20 leaves** | **17 Dashboard, 90 numeric, 15 cross-page, 2 display, 3 date, 4 data, 1 service tests** | **132** |

## Account dates

The default is the account's latest reading date, not the current calendar date. The matrix checks the documented date against the household response before comparing the chart.

| Accounts | Default date |
|---|---|
| July, Cold Snap, Spike, Usage Collapse, Low User | 2026-07-31 |
| Julia Fox, Rangi Paterson | 2024-08-31 |
| Ana Whitiora, Tama Rewiri, Mere Kahu, Josh Fuller, Priya Raman | 2024-06-30 |
| Daniel Okafor | 2024-06-12 |
| Mereana Tipene | 2024-06-10 |
| Generated Demo Household | 2026-09-16 |

Range boundaries are inclusive: Daily uses the selected date, Weekly ends on that date and starts six days earlier, and Monthly starts 29 days earlier. Date-only arithmetic uses UTC calendar operations to avoid shifts at daylight-saving boundaries.

## API oracles and authentication

Dashboard expectations come from independent household and bill-shock GETs. The four displayed values are usage so far, latest-day cost, cost so far, and projected-cycle cost. Latest-day cost uses the last household reading within the first `days_elapsed` entries, multiplied by `cost_so_far_nzd / usage_so_far_kwh`. No bill-shock or forecasting decision is reimplemented.

Usage comparisons use independent `usage-series` and `hourly-usage` GETs. These deployed endpoints require authentication. The `usageApi` fixture reads the selected account's token from the state prepared by setup, validates the origin and account identity, and supplies it to those requests. It performs no additional login and never attaches or prints the token. Browser authentication remains the normal saved sign-in state, with the Welcome dialog already closed.

Daily points use `hours[].kwh`; Weekly and Monthly use ordered `daily_kwh`. Dollar values use the requested series' `estimated_cost_nzd / total_kwh`. Totals sum raw readings before formatting; they do not add already-rounded point labels. Dollar points and totals use two decimal places. The selected kWh total uses one decimal place; kWh point precision follows the graph's padded top scale.

Point values, ordered labels, range/unit selection, point counts, y-axis units, selected total, explanation, and source note are checked on the same screen with soft assertions. API identity, dates, and completeness are preconditions for a meaningful comparison. Daily source notes match the hourly response. Longer ranges distinguish fixture readings, estimated readings, and account meter readings.

Numeric Daily comparisons normalize only an optional terminal NZST/NZDT suffix when matching hours and point names. This checks the ordered time/value mapping without requiring the known incorrect display format. The separate axis-display leaf requires exact `00:00` through `23:00` labels, no timezone suffix, rendered text, and no adjacent overlap. Weekly and Monthly date labels are compared exactly. DST's repeated local hour remains two ordered readings, with distinct API start instants.

The cross-page leaf reads the actual latest-day amount on Dashboard and the actual selected-period dollar amount on Usage. They must be exactly equal, including cents. Evidence includes both displayed strings and the Usage date. No tolerance or independent recomputation replaces this comparison.

## Monthly complete-data exception

Only the two normal Monthly numeric leaves may skip an account row when the API lacks one or more complete dates in the requested 30-day window. The endpoint returns complete dates; estimated readings still count as usable dates. The skip reason and attachment identify the missing dates. Weekly comparisons have no equivalent skip rule.

The final deployed-site run found:

| Account | Complete dates in the requested window | Effect on the two Monthly leaves |
|---|---:|---|
| Julia Fox | 24 | Two rows skipped |
| Priya Raman | 29; 2024-06-10 is absent | Two rows skipped |
| Mereana Tipene | 30 | Both rows passed |

The master's older note describes Mereana as having only ten days. The current rolling 30-day API window is complete, so the tests do not hard-code that older exclusion. **Four rows skipped in this run.** The result is determined again at runtime; it is not a fixed four-skip allowance.

The dedicated partial-Monthly leaf always runs for Julia. It checks that the 24 readings from 2024-08-08 through 2024-08-31 remain plotted, the six missing dates from 2024-08-02 through 2024-08-07 are marked, and the page does not replace the chart with an error. The regular complete-data exception cannot suppress this expected behaviour or finding #8.

## Dates, state changes, and failure evidence

- The summary interaction case checks all four tiles, an internal tile click, chip toggle, outside click, and Escape.
- Rangi's chosen-date case checks Daily, Weekly, and Monthly for 2024-01-15 within one leaf.
- Julia's before-range selection and calendar Today each return to 2024-08-31 and its original chart without an error. Today comes from the browser calendar in the configured New Zealand timezone.
- Clearing the date removes the chart and selected total, shows the specified empty-state text, remains empty after choosing Weekly, and restores the chart after a date is entered.
- The DST leaf selects kWh and checks 25 hourly readings on 2024-04-07 and 23 on 2023-09-24, including the API values and selected total.
- Priya's estimated-data leaf checks the Weekly note and an observable quality indication for every estimated Daily hour. A generic source note or an internal class name alone cannot prove per-hour marking.
- Priya's internal missing-day leaf checks that 2024-06-10 remains selected and the page explains the absence of readings. It must not silently adopt the outside-range fallback behaviour.
- The service-error leaf intercepts only the usage-series GET, checks the error and Retry, removes that interception, and requires the real chart to recover. Successful data is not mocked.

The page object registers the exact date/range response wait before changing a control, waits for that response to finish, and waits for loading to end. Chart assertions then wait for the expected ordered values. This prevents a control change from being accepted merely because an earlier chart is still present.

Findings #4, #6, #7, and #8 were reproduced in this run. They remain failing product expectations with defect references; they are not marked as expected failures. The Clear-date regression (#5) passed, confirming the reported fix. The separate root-household Retry observation #17 has no leaf in this design and is not added to the Usage service-error case.

## Boundaries and commands

Usage is read-only apart from the managed run's existing alert-default preparation. Rangi appears as a reader; these tests execute before the later settings-write phase. There are no manual-only Usage leaves. The axis-layout test checks geometry at the configured desktop viewport. The separate appliance breakdown, Where your power goes, remains outside scope.

```sh
npm test -- tests/usage --workers 2
npm run test:list -- tests/usage
npm run report
```

The managed runner and native discovery decision are unchanged. Native read-only Playwright discovery and editor discovery are supported; actual execution uses the npm runner so account preparation, phase ordering, reporting, and cleanup apply. An editor Run or Debug action that bypasses the runner is not a supported execution entry point.

## Execution review

Final validation on 31 October 2026 used `npm test -- --workers 2` against `https://13.54.25.80`, with headless Chromium and no retries. The complete suite produced **201 results: 188 passed, 9 failed, and 4 skipped**. Usage contributed **132 tests: 124 passed, 4 failed, and 4 skipped**. The other five failures are the previously confirmed Profile cases for defects #2 and #3.

| Failed Usage leaf | Classification | Observed result |
|---|---|---|
| Daily x-axis shows only the time | Known defect #4 | July's 24 labels include `NZST`; adjacent labels overlap at the configured 1280 × 720 viewport. |
| Estimated readings | Known defect #6 | Priya's Weekly note identifies estimated data, but all 24 estimated Daily hours lack an observable per-hour quality indication. |
| Missing day inside the data range | Known defect #7 | Selecting Priya's missing 2024-06-10 silently changes the date to 2024-06-30 without explaining the missing day. |
| Less than 30 days of readings: Monthly | Known defect #8 | Julia's 24 available days are replaced by an error and Retry; no chart points remain. |

All 15 Dashboard summary rows and all 15 exact cross-page cost comparisons passed. The numeric matrix passed 86 rows and skipped the four incomplete Monthly rows described above. The remaining passes cover default state, summary interaction, date selection and clearing, both DST transitions, and intercepted service failures with real-service recovery. No new product defects, unresolved test failures, or environment failures were identified in this run. There are no manual-only Usage leaves; the four data-dependent skips are not automation limitations.

Type checking and test enumeration passed. Review also verified ordered Dashboard tiles, zero-usage arithmetic, explicit default-date checks, and visible evidence for estimated or missing readings. HTML, JUnit, and Allure reports agree on the result counts. Every failed case retains its defect reference and screenshot; Usage evidence also records the relevant labels, values, dates, or missing markers. All 201 Allure history IDs are unique, with no repeated attempts. The runner completed report generation and removed temporary authentication states and the run lock. Generated reports and authentication data are excluded from version control.
