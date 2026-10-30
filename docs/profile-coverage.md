# Profile Management coverage

The local Xmind master and Markdown export contain the same **15 Profile Management leaves**, implemented as **19 tests**. The name-consistency leaf has three account rows, and the valid-phone leaf has three format rows. Other leaves have one test each.

Each test uses its own browser context with setup-prepared authentication, opens Dashboard, and follows the avatar menu to My Profile. Viewing details uses Cold Snap Household, Julia Fox, and Generated Demo Household. Request-change cases use Ana Whitiora, whose four editable details are populated. All tests run in the ordinary Chromium phase.

All paths below begin with `Profile Management`. File names are relative to `tests/profile/`.

| Behaviour and design path | Leaf title | Spec / account or input | Tests |
|---|---|---|---:|
| View profile details › Positive Testing | Demo household (Cold Snap Household) | `view-details.spec.ts` / Cold Snap | 1 |
| View profile details › Positive Testing | Data-platform account (Julia Fox) | `view-details.spec.ts` / Julia | 1 |
| View profile details › Positive Testing | Generated household (Generated Demo Household) | `view-details.spec.ts` / Generated | 1 |
| View profile details › Positive Testing | Name on the Profile page matches the name in the avatar menu | `view-details.spec.ts` / Cold Snap, Julia, Generated | 3 |
| View profile details › Negative Testing | Profile service unavailable | `view-details.spec.ts` / Cold Snap, intercepted HTTP 500 | 1 |
| Request profile changes › Positive Testing | Edit form opens pre-filled with the current details | `request-changes.spec.ts` / Ana | 1 |
| Request profile changes › Positive Testing | Change all four fields, then Request changes | `request-changes.spec.ts` / Ana | 1 |
| Request profile changes › Positive Testing | Valid NZ phone formats are accepted | `request-changes.spec.ts` / mobile, landline, international | 3 |
| Request profile changes › Positive Testing | Change fields, then Cancel | `request-changes.spec.ts` / Ana | 1 |
| Request profile changes › Negative Testing › Full name | Empty | `request-changes.spec.ts` / empty name | 1 |
| Request profile changes › Negative Testing › Email address | Invalid format | `request-changes.spec.ts` / missing @ | 1 |
| Request profile changes › Negative Testing › Contact number › Length | Too few digits | `request-changes.spec.ts` / `0211` | 1 |
| Request profile changes › Negative Testing › Contact number › Length | Too many digits | `request-changes.spec.ts` / `021 1234 5678 9012 34` | 1 |
| Request profile changes › Negative Testing › Contact number › Rule | Not an NZ number prefix | `request-changes.spec.ts` / `121 196 1501` | 1 |
| Request profile changes › Negative Testing › Contact number › Type | Contains letters | `request-changes.spec.ts` / `021-abc-1001` | 1 |
| **Total** | **15 leaves** | **7 view tests and 12 request-change tests** | **19** |

## Oracles and checkpoints

Details are compared with an independent `GET /api/households/{account}/profile`. The tests check the Profile heading and subtitle, the account and contact fields, the plan, and the fixed password mask. Cold Snap has the documented sign-in-name fallback, missing contact data, and no ICP or Network rows. Julia and Generated require both extra rows and values matching the API.

The name-consistency cases compare the actual avatar name with `display_name` from an independent login response, and the actual Profile name with `name` from the Profile response. Cold Snap uses the sign-in-name fallback because its Profile name is null. The final comparison requires both visible names to agree. Evidence and failure messages label each name and its source; the attachment contains names and the customer ID, never credentials or tokens. Generated retains finding #2.

The error case intercepts only the selected account's Profile GET and returns HTTP 500. It checks the load-error message and the absence of profile details and the edit control. Successful profile data and form submissions are not mocked.

Edit pre-fill is compared with the original details displayed on the page. The all-fields submission case checks the exact prototype confirmation, closes the dialog, and reloads before comparing with the original snapshot. Cancel must leave the profile unchanged, show no toast, and restore the original pre-fill when Edit profile is reopened.

Native validation is checked through the browser's `valueMissing` or `typeMismatch`, a nonempty validation message, field focus, an open dialog, and no submission toast. The tests do not hard-code a browser-language validation bubble.

The four invalid-phone tests retain finding #3 and independently require an open dialog, no submission toast, and native field validation or an inline error requesting a valid NZ phone number. The immediate submission outcome is attached before a transient toast can disappear. A zero-request assertion alone cannot prove validation, because the current prototype also accepts valid input without calling the API.

## Prototype boundary and shared-data protection

The approved web behaviour is request-only: Request changes displays `Contact changes go to our team to apply — nothing on your account has changed yet`, while original account details remain unchanged. These tests establish that behaviour; they do not prove a request was delivered to staff or that an administrator processed it.

The design's statement that no write endpoint exists is historical context. Repository inspection found a backend profile-update endpoint, while the web form still has no save request. Tests preserve the approved web expectations and never invoke that update endpoint or use it for cleanup.

A feature fixture blocks unexpected browser API writes throughout each Profile journey and fails if one is attempted. Action-scoped observers also check that opening, submitting, or cancelling the prototype form makes no browser API request. The shared helper is reused by Reset Password. Reload reads occur after the submission observer has been checked.

There are no manual-only, unsupported, skipped, or inverted Profile cases. The specified Generated account is reused even though a general design note prefers accounts different from Login; it is the only explicitly designated Generated example.

## Execution review

On 29 October 2026, the final `npm test -- --workers 2` run against `https://13.54.25.80` completed headlessly with two functional-test workers after setup. Of **70 results, 65 passed and five failed**, with zero retries or skips. Profile contributed **14 passed and five failed**; the other 51 results all passed: 24 Login, 18 Reset Password, seven Logout, one Dashboard usage proof, and setup.

The passing Profile checks include all three account-detail views, Cold Snap and Julia name consistency, the simulated service error, all six positive edit/form cases, and the native empty-name and invalid-email checks.

| Failing case | Classification | Observed result |
|---|---|---|
| Name on the Profile page matches the name in the avatar menu — Generated Demo Household | Known finding #2 | Profile shows `Zara Sutton`; avatar shows `Generated Demo Household`. Each matches its own API source, but they disagree |
| Contact number › Length › Too few digits | Known finding #3 | `0211` closes the dialog and shows the submission toast; no field validation appears |
| Contact number › Length › Too many digits | Known finding #3 | `021 1234 5678 9012 34` is accepted in the same way |
| Contact number › Rule › Not an NZ number prefix | Known finding #3 | `121 196 1501` is accepted in the same way |
| Contact number › Type › Contains letters | Known finding #3 | `021-abc-1001` is accepted in the same way |

No new product defect or test-execution failure was found. No unexpected browser API write was attempted. Tests retain the approved expectations; they do not skip or invert these five failures.

The first run produced the same five failures. Review then strengthened the phone check to accept only visible inline errors or focused native validation, and required Cold Snap's absent ICP/Network labels as well as values. The final full-suite run verified those refinements. `npm run typecheck` passed, and test discovery listed exactly 19 Profile cases across two specs.

Playwright HTML, Allure, and JUnit reports retain all five failures. Screenshots and labelled name/input evidence were inspected, and temporary authentication states and the run lock were removed. Generated reports remain untracked.

From the E2E directory, run this feature and open its report with:

```sh
npm test -- tests/profile
npm run report
```

The focused selection has 20 results including setup. The default is two workers in headless mode. A nonzero exit is expected while findings #2 and #3 remain reproducible; it represents visible product failures, not a successful run.
