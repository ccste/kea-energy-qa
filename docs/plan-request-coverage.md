# Plan Request coverage

The authoritative local Xmind master and its Markdown export contain the same **12 Plan Request leaves**, implemented as **22 tests**. All 15 notes, including the feature and shared behaviour notes, match between the two local documents. The nine style-and-term combinations produce nine independent results, and the scrolling leaf produces one result for each of the three pricing styles.

The catalogue is shared across accounts. Low User Household supplies the ordinary catalogue, selection, comparison, and submission scenarios. Generated Demo Household supplies the independent current-plan scenario. Each test starts in a fresh browser context using setup-prepared authentication, opens Dashboard, and enters Plans through the sidebar.

All paths below begin with `Plan Request`; file names are relative to `tests/plans/`.

| Behaviour and design path | Leaf title | Spec / account or input | Tests |
|---|---|---|---:|
| View plan options › Positive Testing | Opens on the default selection | `options.spec.ts` / Low User Household; Anytime Rate + Flexible | 1 |
| View plan options › Positive Testing | Plan options match the API | `options.spec.ts` / three pricing cards and three commitment cards | 1 |
| View plan options › Data scenarios | Current plan is recognised | `options.spec.ts` / Generated Demo Household; Profile and Billing comparison | 1 |
| View plan options › Negative Testing | Plans service unavailable | `options.spec.ts` / intercepted catalogue GET 500, followed by Retry | 1 |
| Choose a plan | Choosing a pricing style scrolls to Step 2 | `selection.spec.ts` / Anytime Rate, Time of Use, and Free Weekends | 3 |
| Choose a plan | Your selection for all 9 combinations | `selection.spec.ts` / three pricing styles × three commitment terms | 9 |
| Choose a plan | Change the selection | `selection.spec.ts` / Time of Use + 12 months → Free Weekends + 12 months → Free Weekends + Flexible | 1 |
| Check rates and terms | Compare all rates | `comparison.spec.ts` / Time of Use + 6 months | 1 |
| Check rates and terms | Terms & Conditions | `comparison.spec.ts` / Free Weekends + 12 months | 1 |
| Request this plan › Positive Testing | Request a new plan | `requests.spec.ts` / one real Time of Use + 6 months request | 1 |
| Request this plan › Negative Testing | Request fails | `requests.spec.ts` / intercepted POST 500 | 1 |
| Request this plan › Negative Testing | Click Request twice quickly | `requests.spec.ts` / held, intercepted POST 201 | 1 |
| **Total** | **12 leaves** | **4 option, 13 selection, 2 comparison, and 3 request tests** | **22** |

## Catalogue and selection expectations

`api.plans()` makes an independent request for the selected account's catalogue. The tests require the documented three pricing-style IDs and three commitment-term IDs before comparing visible values. Catalogue values supply rate labels, time windows, amounts, units, daily charges, highlights, best-for descriptions, price treatments, credits, and exit fees. The tests do not recalculate retail tariffs or import application code.

The option-card case checks the six cards in API order, including their displayed labels, ticked highlights, and monetary wording. A daily-charge value must contain its unit exactly once. Related comparisons use soft assertions so an incorrect daily unit does not prevent inspection of the remaining pricing and commitment details.

`plan-expectations.ts` centralises the selected-state and summary assertions. Exactly one style and one commitment must be checked. The summary must show the chosen style, the term and lower-case price treatment, every usage-rate line, daily charge, monthly credit, total credit over the term, and early exit fee. The request button must be enabled. Each of the nine combinations has a separate result, and changing one choice must preserve the other choice.

The three scrolling tests use a 1280 × 720 viewport and a fresh journey. The commitment heading must initially be outside the viewport. After choosing a pricing style, the product must scroll it into view near the top with the term cards visible. No action targets Step 2 before these assertions, so Playwright cannot satisfy them by scrolling a term control into view itself. The checks allow two seconds for the product's delayed smooth scrolling without adding a fixed sleep.

## Current-plan recognition

Generated Demo Household's documented plan is `Free Weekends (VECT, Standard user)`. The test first verifies that Profile and Billing both display this plan, then visits Plans and requires Free Weekends to be selected and tagged `Your current style`. Anytime Rate must be unselected and have no current-style tag.

The catalogue's current-plan value is attached as evidence, not used to excuse a missing recognition result. An empty `current_plan` cannot make this case pass. The design specifies a pricing style for this scenario but does not specify a commitment term, so the test does not invent one.

## Comparison and terms dialogs

The comparison case selects Time of Use + 6 months. Its pricing table must include all three styles and the six documented rows: Daily charge, Anytime rate, Peak rate, Off-peak rate, Night rate, and Free period. The assertions explicitly map API `Usage rate` entries to the Anytime rate row and `Free weekend power` to Free period. This mapping follows the approved design independently of the application's label lookup. An em dash is expected only where a style has no rate for that row.

The commitment table must show every term and its price treatment, monthly credit, total credit, and early exit fee. The chosen pricing column and commitment row must carry a tick and a distinct visible highlight. The indicative-pricing note is checked exactly, and Done must close the dialog.

The Terms & Conditions case selects Free Weekends + 12 months. It checks the selected-plan tag, best-for text, rate labels and time windows, daily charge, commitment wording, and four important conditions. The daily charge accepts either a single `/day` or a single `per day`; repeating both fails. The final condition must read `You can request a plan change through Customer Care at any time.` Done must close the dialog.

## Submission and shared-environment boundary

`plan-test.ts` supplies the default account and an automatic API write guard. Ordinary browsing and selection tests must not attempt an application write. The three explicit submission tests install a narrower route for their account's plan-change endpoint. That route checks the request body and the presence of a Bearer token before deciding whether to forward it or answer locally. Evidence records only a Boolean token-presence check, never the token value.

**Request a new plan is the only case that forwards a real plan-change POST.** It has `retries: 0`, including in CI, to prevent an automatic retry from recording another request. The route permits at most one correctly formed POST in the test and blocks any additional attempt. The required body is:

```json
{
  "customer_id": "<signed-in account number>",
  "pricing_style": "time-of-use",
  "commitment_term": "6-months"
}
```

The route waits on an explicit release signal while the test checks `Sending request…` and the disabled button. It then forwards the original browser request to the deployed service. The response must be 201 and identify the account, requested style, and pending Customer Care review. The information toast must read `Plan request recorded for Customer Care review. Your current plan remains active.` The request button must become available again.

After reloading, the page must return to Anytime Rate + Flexible for this account. Independent Plans and Profile responses must confirm that the current plan remains unchanged. The stored request is an intentional side effect of this one acceptance case; it does not activate a new plan. Each fresh run that includes this case may record one request, even though automatic retries are disabled.

The two negative submission cases never reach the service:

- **Request fails:** a held local response returns 500 after pending state is checked. The warning toast must show `Account request failed (500).`, no success toast may appear, and the selected Time of Use + 6 months choice must remain available to retry.
- **Click Request twice quickly:** two physical pointer clicks target the request button while the intercepted response remains pending. Exactly one request must be observed and the button must be disabled. Releasing a local 201 response must produce exactly one success toast. The second click does not use an auto-waiting locator action that could wait for the button to become enabled again.

Deferred response release replaces the design note's suggested fixed two-second delay. It keeps the pending-state assertion deterministic while preserving the required request and UI behaviour. Each control releases any pending route and removes its handler during cleanup.

## Service failure and prior defect references

The catalogue-error case intercepts only the selected account's Plans GET. HTTP 500 must replace the builder with `Something went wrong` and `Account request failed (500).` After the interception is removed, Retry must fetch the real catalogue and restore the default builder. A browser reload is not substituted for a missing Retry control.

| Finding | Expected behaviour retained by the tests | Affected test cases |
|---|---|---|
| #12 | Daily-charge wording states the unit once | Plan options match the API; Terms & Conditions |
| #13 | Plans recognises the Free Weekends plan shown by Profile and Billing | Current plan is recognised |
| #14 | Catalogue errors offer Retry and recover when the service returns | Plans service unavailable |
| #15 | The comparison table includes every applicable usage rate and free period | Compare all rates |

The annotations identify prior suspected findings. They do not pre-assign an outcome or hide a failure. Every case retains the approved expectation and reports the deployed result; no `test.fail()` or defect-based skip is used. One shared cause can affect multiple independent cases.

## Boundaries and commands

All 12 Plan Request leaves are automated. There are no manual-only cases or approved skips for this feature. Solar and Sparky plan recommendations remain outside these tests. The suite verifies a Customer Care request, not an immediate plan switch or downstream approval workflow.

The functional tests use headless Chromium and two workers by default. Each browser context is independent. The normal managed runner still prepares authentication, restores alert defaults, orders execution phases, generates reports, and removes temporary authentication state.

Run commands from the standalone test-project directory:

```sh
npm test -- tests/plans
npm run test:list -- tests/plans
npm run report
```

The first command includes the one real submission case. Add `--headed` to observe browser windows or explicitly supply `--workers 2` to restate the default. Test discovery does not submit a plan request.

## Execution review

Verified on **31 October 2026** against `https://13.54.25.80`, using headless Chromium and two functional-test workers. Plan Request produced **22 results: 17 passed, 5 failed, 0 retries, and 0 skips**. The full implemented suite, including setup, produced **264 results: 239 passed, 21 failed, and 4 approved Usage Monthly skips**, with no retries. Earlier features retained their previous results.

| Failed case | Classification | Observed result |
|---|---|---|
| Plan options match the API | Existing finding #12, reproduced | The three pricing cards repeat the daily unit: `$1.45/day/day`, `$1.50/day/day`, and `$1.55/day/day` |
| Terms & Conditions | Existing finding #12, reproduced | Free Weekends displays `Daily charge: $1.55/day per day.` |
| Current plan is recognised | Existing finding #13, reproduced | Profile and Billing confirm Free Weekends for Generated; Plans selects Anytime Rate and has no current-style tag |
| Plans service unavailable | Existing finding #14, reproduced | The expected 500 error appears, but Retry does not exist; the subsequent recovery checkpoint is blocked |
| Compare all rates | Existing finding #15, reproduced | The table replaces Anytime Rate's `$0.325/kWh`, Free Weekends' `$0.365/kWh`, and the `$0.000/kWh` free period with em dashes |

The five failures represent four existing product findings. No new product finding or unresolved test-script failure was identified. All nine combinations, all three scrolling styles, default selection, choice changes, real submission, intercepted request failure, and intercepted double click passed. Other checkpoints within the failed comparison and terms cases, including selected highlights, commitment details, and Done closure, passed.

Validation first excluded the real-submit case. That run identified an overly narrow test assertion about table-header colour: the requirement concerns the selected data column, whose highlight is present. The assertion was corrected to check its data cells while retaining the header tick check. Request recording now waits for route bookkeeping, and the double-click case waits for the delayed style scroll before one stable double-click action. These test refinements are not counted as product bugs; the final regression verifies them.

The final run forwarded **one** plan-change POST for Low User Household (`H-TARIFF`), selecting `time-of-use` and `6-months`. The real service returned **201**, `pending_review`, and `Time of Use · 6-months`. Independent reads confirmed the current plan remained unchanged. The two negative cases each observed one browser POST fulfilled locally and forwarded none. No unexpected API write was observed by the plan guard.

Playwright HTML, JUnit, and Allure agree on all 264 results; Allure contains 264 unique result identities. Report generation completed successfully, and temporary authentication state was removed. Attached evidence includes catalogue values, displayed daily units, comparison-table values and highlights, cross-page plan identity, the missing Retry control, and request bodies and receipts without token values. Reports remain local.

Type checking passed. A separate temporary directory installed its own locked dependencies from the local cache, passed type checking, and discovered exactly 22 Plan Request tests across four spec files without application-source imports. Implementation and deployed-site validation are complete for this reviewed step.
