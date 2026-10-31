# Power Bill Shock Warning coverage

The approved local Power Bill Shock Warning design contains **14 leaves**, implemented as **43 tests: 37 read-only cases and six Settings cases**. The local Xmind file and its Markdown export agree on these leaves and their shared notes. The local files are the authority; the older cloud copy is not used.

The feature opens from the chip at the top right of the Dashboard's 3D house. Every case uses a fresh browser context and setup-prepared authentication. The settings cases use the reserved Rangi Paterson account and run after all read-only cases.

## Design mapping

All design paths below begin with `Power Bill Shock Warning`. Account names expand the existing metadata in `data/accounts.ts`; credentials are obtained at runtime and are not part of this document.

| Design path / leaf | Account rows and checkpoints | Spec | Tests |
|---|---|---|---:|
| View the warning → Positive Testing → Warning panel matches the API | July Household, Rangi Paterson, Ana Whitiora, Tama Rewiri, Mere Kahu, Josh Fuller, Priya Raman, Daniel Okafor, Mereana Tipene, Generated Demo Household: triggered warning, accessible chip state and copy, ringing state, heading, red dot, complete summary, and comparison-basis note | `panel.spec.ts` | 10 |
| View the warning → Positive Testing → No-warning panel matches the API | Cold Snap Household, Spike Household, Usage Collapse Household, Low User Household, Julia Fox: triggered false, green chip and dot, heading, elapsed/cycle days, projection and normal amount, basis note, and absence of warning-only text | `panel.spec.ts` | 5 |
| View the warning → Positive Testing → Open and close the panel | Tama Rewiri: initially closed; chip opens and closes it; outside click and Escape close it; `aria-expanded` follows visibility | `panel.spec.ts` | 1 |
| View the warning → Data scenarios → Days-left line: 0, 1 and 2 days | July Household: zero, closed-cycle copy, no days-left line, and no reference to missing figures below; Tama Rewiri: singular one-day copy; Priya Raman: plural two-day copy | `data-scenarios.spec.ts` | 3 |
| View the warning → Data scenarios → Rising daily use line | Josh Fuller: 9%; Priya Raman: 27%; Tama Rewiri: no line. API reasons and rounded trend support the expected presence and text | `data-scenarios.spec.ts` | 3 |
| View the warning → Data scenarios → Cycle length matches the billing history | Ana Whitiora, Mereana Tipene, Rangi Paterson, Generated Demo Household: compare Dashboard cycle and remaining days with the visible Billing period and default Usage date | `cycle-consistency.spec.ts` | 4 |
| View the warning → Data scenarios → No warning when the overshoot is under the dollar floor | Cold Snap Household: default Email 15% and floor 20; overshoot 17.26 NZD; green panel, 31 of 31 days, projection 87.79 NZD, normal 70.53 NZD | `data-scenarios.spec.ts` | 1 |
| View the warning → Data scenarios → No-warning wording matches the figures | Cold Snap Household: 87.79 versus 70.53 NZD, above normal; Usage Collapse Household: 50.34 versus 80.60 NZD, below normal; Low User Household: 61.35 versus 60.45 NZD, close to normal | `data-scenarios.spec.ts` | 3 |
| View the warning → Negative Testing → Bill-shock data unavailable | Tama Rewiri: separately return HTTP 500 for the bill-shock assessment and household GET; grey unavailable state, exact explanation, no figures or buttons, and all four Usage & Costs tiles showing `—` | `unavailable-and-isolation.spec.ts` | 2 |
| View the warning → Negative Testing → Another household in the address | Tama Rewiri opens `/dashboard?household=H-JUL`: keep Tama's assessment and all four summary tiles, or explicitly refuse access; never show July's data under Tama's name | `unavailable-and-isolation.spec.ts` | 1 |
| Use the panel buttons → View Usage | Tama Rewiri with a warning and Low User Household without one: visible action, `/usage`, Usage heading, and active sidebar destination | `panel.spec.ts` | 2 |
| Use the panel buttons → Ask Sparky AI | Tama Rewiri with a warning and Low User Household without one: `/assistant`, destination heading, and active Sparky AI sidebar destination | `panel.spec.ts` | 2 |
| Warning follows the alert settings → Email level and dollar floor decide the warning | Rangi Paterson: Email 30% → warning; Email 40% → normal; floor 35 → warning; floor 40 → normal. Save one field, return through the sidebar, verify state and unchanged figures, reset defaults, and verify the warning returns | `alert-settings.stateful.spec.ts` | 4 |
| Warning follows the alert settings → Turning alerts off keeps the warning in the app | Rangi Paterson: master switch off; Email channel off. Each saved change preserves the in-app warning and its figures | `alert-settings.stateful.spec.ts` | 2 |
| **Total** | **14 leaves; every data row has an independent result** | **Five spec files** | **43** |

All specs are under [`tests/bill-shock`](../tests/bill-shock). Opening and closing the panel remains one design leaf and one test, with separate steps for its dismissal methods. The six Settings rows belong to the `settings` project; the other 37 belong to `chromium`.

## Page objects and API expectations

`DashboardPage.billShock` exposes `BillShockPanel`, which shares the Dashboard chip controls and scopes the panel heading, summary, comparison note, day lines, status dot, and navigation actions. Assertions stay in the specs and `expectations.ts`. `goto` waits for both the household and bill-shock responses before opening the panel; transient grey loading must not be mistaken for the final state.

The positive panel cases read the browser's real `GET /api/households/{account}/bill-shock` response. They check its customer ID, designed warning state, and the UI's representation of the returned fields. The full warning sentence includes elapsed days, cycle length, projected amount, expected amount, overshoot amount, and overshoot percentage. Money is formatted with two decimal places followed by ` NZD`; percentages are rounded to whole numbers. These cases verify presentation of an assessment, not the correctness of the forecast model.

The comparison-basis notes are independent strings from the design:

| API basis | Expected note |
|---|---|
| `own_recent_cycles` | `Compared with your own average across recent billing periods.` |
| `own_same_period_last_year` | `Compared with your own bill for the same period last year.` |
| `comparable_homes` | `Compared with similar homes — there is not yet a full billing period of your own to compare against.` |

The fixed dollar-floor and wording scenarios retain the design's known amounts, making them independent checks of those examples. The settings cases independently read saved preferences and the resulting assessment through the API client. They check complete preference request and response records, the save toast, and persisted values. The two unavailable cases intercept only the selected GET with HTTP 500; they do not alter server data.

No test rebuilds the forecast formula, confidence calculation, or general trigger algorithm. The known warning/no-warning account groups and the four Rangi setting boundaries are specified outcomes. The one-, two-, and zero-day wording cases check the API's current `days_remaining`; if the underlying cycle calculation is corrected, their boundary accounts must be reassessed rather than silently retaining an unsuitable fixture.

## Calendar-cycle assumption and UI-only oracle

The user approved the design's calendar-period assumption: the current cycle follows the pattern displayed in Billing, from the first to the last day of a month, or the second to the first for Generated Demo Household. The project has ended and no further team confirmation will be sought. Each cycle test records this assumption in its report; it is not presented as a separately confirmed backend contract.

The cycle tests read the newest invoice period from the Billing card and history, then read the date on which Usage opens. The next cycle starts the day after that invoice ends. Inclusive elapsed days and calendar-period length are calculated from these visible dates using UTC date-only arithmetic, avoiding daylight-saving offsets. Bill-shock API cycle fields are never used as expected values for this comparison.

| Account | Latest displayed invoice | Default Usage date | Derived current cycle | Expected elapsed / length | Expected remaining |
|---|---|---|---|---|---:|
| Ana Whitiora | 2024-05-01 – 2024-05-31 | 2024-06-30 | 2024-06-01 – 2024-06-30 | 30 / 30 | 0 |
| Mereana Tipene | 2024-05-01 – 2024-05-31 | 2024-06-10 | 2024-06-01 – 2024-06-30 | 10 / 30 | 20 |
| Rangi Paterson | 2024-07-01 – 2024-07-31 | 2024-08-31 | 2024-08-01 – 2024-08-31 | 31 / 31 | 0 |
| Generated Demo Household | 2026-08-02 – 2026-09-01 | 2026-09-16 | 2026-09-02 – 2026-10-01 | 15 / 30 | 15 |

The visible fixtures must match this table, so data changes cause an explicit failure rather than changing the expected result unnoticed. Mereana's history must also contain the 30-day period 2023-06-01 – 2023-06-30. Every case attaches the displayed dates, derived period, and actual panel lines as report evidence.

Julia Fox is excluded from this specific design leaf because her invoice is missing from Billing under finding #9. This is the approved four-account scope, not a skipped test. With zero remaining days, a warning requires the closed-cycle message and no days-left line; a no-warning panel has neither line. Positive remaining days in these warning scenarios require the exact singular or plural line.

## Shared environment and cleanup

Before a managed run, setup obtains runtime credentials and tokens, restores default alert preferences for all 15 accounts, and prepares their browser sign-in states. Browser sessions and tokens remain temporary. The read-only Bill Shock fixture blocks and records unexpected browser API writes, including any attempted chat submission.

The six Settings cases change only Rangi's alert preferences. Their browser guard permits the account's exact preference PUT endpoint and rejects other writes. The settings project runs with one worker and no retries. The existing automatic alert-isolation fixture restores the complete default record before each case and in teardown even when assertions fail. Cleanup errors remain visible. The four boundary cases also restore defaults inside the test and revisit Dashboard to prove that the warning returns. API restoration is deliberate: the existing Settings issue #30 prevents selecting the original 15% Email level again through the UI.

All six cases start from Rangi's default warning, with projection **144.65 NZD** and normal amount **108.07 NZD**. Changing the threshold or floor must change the state without changing those figures. Switching off the master or Email channel controls messages and must preserve the in-app warning. Saving uses the actual Settings UI, then the Dashboard sidebar link; no page reload is needed.

The managed runner executes setup, then the read-only phase, then Settings. Rangi participates in the read-only cases too, so those phases must not overlap. The approved implementation uses ordered runner phases rather than project dependencies: an ordinary read-only assertion failure must not prevent the later Settings cases from running. Setup failure still stops product tests. The Settings cases remain independent; a failed row must not skip the remaining rows.

Use a coordinated test window on the shared AWS deployment. Do not run these mutations during another person's demonstration.

## Existing defect references and boundaries

| Finding | Annotated rows | Correct expectation retained |
|---|---|---|
| #36 | No-warning wording: Cold Snap Household and Usage Collapse Household | The comparison describes a materially higher or lower bill accurately; both must not be called in line with normal |
| #37 | Zero-day wording: July Household | A reference to figures below is supported by figures actually displayed below the closed-cycle paragraph |
| #38 | Another household in the address: Tama Rewiri | The address parameter cannot replace the signed-in customer's assessment or summary tiles with another household's data |
| #39 | Calendar-cycle consistency: Ana Whitiora and Mereana Tipene | Under the approved calendar assumption, June contains 30 days and remaining days follow the visible Usage date |
| #40 | View Usage: Low User Household | The no-warning panel offers the Usage navigation action too |

These five references annotate seven test rows. An annotation records the relevant existing finding; it does not declare a current execution result. Each case keeps its correct assertion and fails normally if the defect is present. There are no defect-based skips or expected-failure markers.

All 14 leaves are automated; there are **no manual-only leaves or approved Bill Shock skips**. Ask Sparky tests navigation only, without sending a question. The Dashboard's `?day=` demo option, forecast-model validation, notification delivery, and broader authentication or authorization coverage are outside these leaves. The foreign-household address case is the specific customer-isolation check required by the design.

The Bill Shock GET also invokes the server's alert dispatcher when delivery is enabled. The browser write guard cannot suppress that server-side work. Before validation on 31 October 2026, `/api/health` reported `alerts.dispatcher: off` with no active gateways. Presentation checks reuse the browser's assessment response; no notification-delivery claim is made. The foreign-address case accepts retained own-account values or an explicit refusal, including an authorization error with an unavailable panel and four empty summary tiles. An unrelated server outage is not accepted as evidence of access control.

## Commands

Run from the standalone test-project directory:

```sh
npm test -- tests/bill-shock
npm run test:list -- tests/bill-shock
npm run report
```

The default run uses headless Chromium and a maximum of two read-only workers, followed by one Settings worker. `--workers 2` is optional and does not increase the Settings concurrency. Add `--headed` to observe the browser. Use the managed npm entry point so selecting this folder includes setup, both functional phases, cleanup, and merged reports. Test discovery does not access the website.

## Execution review

The final dedicated AWS run on **31 October 2026** produced **44 results: 37 passed and seven failed**, including one passing setup result. Bill Shock itself produced **36 passes and seven ordinary failures**, with no retries or skips. All six Settings rows passed after the 37 reader rows completed, even though seven reader assertions failed. Setup, cleanup, and merged report generation completed successfully.

| Finding | Failing rows | Observed behaviour |
|---|---:|---|
| #36 | 2 | Cold Snap's 87.79 versus 70.53 NZD and Usage Collapse's 50.34 versus 80.60 NZD are both described as `in line with` normal |
| #37 | 1 | July's closed-cycle paragraph says `The figures below are what drove it.`; only buttons and the comparison note follow |
| #38 | 1 | Tama's own 168.51 NZD assessment is replaced by July's 97.50 NZD assessment and July's summary tiles after opening `?household=H-JUL`, while the greeting still identifies Tama |
| #39 | 2 | Ana shows 30 of 31 days and one day left; Mereana shows 10 of 31 days and 21 left. The approved June calendar expectation is 30 days, with zero and 20 left respectively |
| #40 | 1 | Low User's no-warning panel has Ask Sparky but no View Usage button |

All seven failures reproduce five existing findings. Warning/no-warning API presentation for all 15 accounts, comparison-basis notes, panel dismissal, one/two-day wording, daily-use lines, the dollar floor, Rangi and Generated calendar controls, both unavailable-data paths, warning-to-Usage navigation, both assistant navigation cases, and all settings boundaries passed. No new product finding was identified.

Two test implementation issues found in the first run were corrected before this result: navigation now checks the sidebar's actual `active` class, and Email thresholds are selected through their visible associated labels instead of clicking an input covered by the percentage text. No forced interaction is used. The final run has no unresolved test-script failure. Review also tightened supporting-figure checks and valid account-refusal paths.

Type checking passed. A temporary source-only standalone copy installed its locked dependencies offline, passed type checking, and discovered all 43 Bill Shock tests without application imports or parent-directory dependencies.

The final implemented-suite AWS regression produced **343 results: 305 passed, 34 failed, and four approved Monthly skips**, with no retries. Bill Shock again produced 36 passes and seven failures; every prior feature retained its previous outcomes. The 34 failed cases represent 20 existing findings across the implemented suite. The four skips remain Julia and Priya’s normal Monthly comparisons in two units each. The successful Plan Request case recorded its one permitted request.

The reader phase ran with two workers and the six Settings cases ran afterward with one. Setup, all six settings cases, and report generation succeeded. A post-run API read confirmed every managed Rangi preference matched the complete default record. Temporary authentication states and the run lock were removed. HTML, Allure, and JUnit agree on the totals. The run exits with status 1 because known product-defect assertions fail normally, not because setup, cleanup, or reporting failed.
