# Contact coverage

The approved local Contact design contains **five leaves**, implemented as **five tests**. The local Xmind and its Markdown export agree. These are the three contact cards on the right of Help & Support, separate from the FAQ card on the left.

All cases use **Mere Kahu**, account `DEMO-ACCT-224001`, because these static contact details are the same for every account. Each test starts in a fresh browser context with setup-prepared authentication, opens Dashboard, and enters Help & Support through the sidebar.

All paths below begin with `Contact`; all cases are in `tests/help/contact/contact.spec.ts`.

| Behaviour | Design leaf / test title | Expected checks | Tests |
|---|---|---|---:|
| Call Customer Care | Copy the phone number | Card title, `Monday to Friday, 9am–5pm`, `Customer Care number copied` toast, and real clipboard value `0800 000 532` | 1 |
| Call Customer Care | Call now | Visible link with `tel:0800000532`; phone number visibly displayed inside its card; finding #31 | 1 |
| Email Support | Copy the email address | Card title, `Get a response from the support team.`, `Support email copied` toast, and real clipboard value `support@kea-energy.example` | 1 |
| Email Support | Write email | Visible link with `mailto:support@kea-energy.example?subject=Kea%20Energy%20support`; email address visibly displayed inside its card; finding #31 | 1 |
| Ask Sparky AI | Ask Sparky opens Sparky AI | Card title and description, real button click, `/assistant`, destination heading, and active Sparky AI sidebar button | 1 |
| **Total** | **Five leaves** | **Five independent results** | **5** |

The assistant card description must read `Get an instant answer about your own usage, bill or plan.` The destination must show `AI Assistant`. Its sidebar button uses the application's `active` class; the test does not invent an `aria-current` attribute that the page does not expose.

## Page objects, fixtures, and expected data

`HelpPage` scopes each contact control to its own article and heading, distinguishing the two Copy buttons and the Contact Ask Sparky button from the FAQ's Ask Sparky instead button. Assertions remain in the spec. `data/contact-details.ts` contains the two fixed expected contact values from the design. The exact link targets remain explicit assertions, including the encoded email subject; expected values are not read from the page under test or imported from application source.

FAQ and Contact share `tests/help/help-test.ts`. Its test-scoped automatic fixtures install the API write guard before navigation and enter Help & Support independently for every case. These journeys must not submit account changes or chat questions. Setup still restores the agreed alert defaults and prepares authentication before the functional phase. No additional API client is needed for static contact information.

## Real clipboard checks

Only the two Copy tests request `clipboard-read` and `clipboard-write`, scoped to the deployed website origin. Before clicking Copy, the fixture writes a synthetic marker that differs from both expected values. This prevents an old correct clipboard value from making a broken Copy button pass.

Each test clicks the actual page control, checks its success toast, and polls `navigator.clipboard.readText()` until the value matches the design. Clipboard methods are not replaced or mocked. The comparison happens inside the browser and returns a boolean, so unrelated clipboard text is not included in assertion output or attachments. The fixture brings the page to the foreground before clipboard access.

The five cases share one file configured with `mode: 'default'`, overriding `fullyParallel` for this small group. This keeps the Copy operations apart when running with browser windows, where the Mac system clipboard is shared. Each case still gets a fresh context and an independent outcome: a failed Call now test must not skip Copy email or the later navigation case. This is not Playwright's failure-dependent `serial` mode. Other feature files retain the suite's two-worker concurrency limit.

In headed mode the checks replace the clipboard with their synthetic marker and public contact value. Teardown clears it only while it still contains one of those owned values, including after a test failure. The fixture does not capture or restore the user's earlier clipboard, which could contain private text or non-text formats. Avoid copying unrelated content while observing these two tests.

The earlier code-review observation **#32** concerns a denied or failed clipboard write still producing a success toast. The approved design does not contain that fault-injection case. These tests verify actual successful copying, rather than treating the toast alone as proof; they do not claim coverage of denied clipboard permissions.

## Link and conversation boundaries

Call now and Write email are checked as visible links with exact targets. Their href assertions run before the visible-contact-detail checks, so a missing phone number or address does not hide whether the target is correct. Neither link is clicked: operating-system phone and email applications are outside these browser checks. No call or email is sent.

Ask Sparky verifies navigation only. The write guard prevents chat submission; the test does not ask for or evaluate a generated answer. Assistant conversation coverage belongs to the later Sparky feature.

All five Contact leaves are automated. There are no manual-only Contact leaves or approved skips. Both visible-detail assertions retain **#31** and the correct expectation; no expected-failure marker or defect-based skip hides the result.

## Commands

Run from the standalone test-project directory:

```sh
npm test -- tests/help/contact
npm run test:list -- tests/help/contact
npm run report
```

The runner defaults to headless Chromium and a maximum of two functional workers. This single Contact file deliberately uses one worker at a time. `--workers 2` is optional; add `--headed` to observe the browser. Read-only test discovery does not access the website.

## Execution review

On **31 October 2026**, the dedicated AWS run with a two-worker limit produced **six results: four passed and two failed**, including the passing setup result. Contact itself produced **three passes and two ordinary failures**, with no retries or skips.

Copy phone, Copy email, and Ask Sparky navigation passed, including the actual clipboard values and active destination in the sidebar. Both external-link targets passed. The subsequent visible-detail assertions failed because the phone card contains no displayed `0800 000 532` and the email card contains no displayed `support@kea-energy.example`. These are two affected cases for **one existing finding, #31**. No new product finding, unexpected API write, chat submission, or unresolved test-script issue was observed.

Type checking passed. A temporary standalone source copy installed its own locked dependencies offline, passed type checking, and discovered exactly five Contact tests and all 31 FAQ tests. It required no application imports or parent-directory resources.

A separate headed check selected only the two Copy tests. Both passed, together with setup, with no retries or skips. This verified actual clipboard access in browser windows as well as in the default headless run.

The final two-worker headless regression produced **300 results: 269 passed, 27 failed, and four approved Monthly skips**, with no retries. Contact again produced three passes and two failures. The prior 25 failures in Profile, Usage, Billing, Plan Request, and FAQ remained unchanged. The shared Help fixture preserved all 31 FAQ outcomes: 27 passes and four existing search-count failures. No additional regression or unresolved test-script failure was observed.

The four skips are Julia's and Priya's normal Monthly comparisons in two units each. The existing positive Plan Request test recorded its one permitted request and returned 201. Playwright HTML, Allure, and JUnit agree on the result totals. Setup and report generation succeeded, and temporary authentication states were removed. The full run exits with status 1 because the 27 known product-defect cases fail normally.
