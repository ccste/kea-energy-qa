# FAQ coverage

The approved local FAQ design contains **9 leaves**, implemented as **31 tests**. Topic filtering produces five results, answer expansion produces one result for each of the 15 questions, search matching produces four results, and no-match handling produces two results. Clearing the search remains one test with four explicit checkpoints.

The FAQ content is the same for every account. These tests use Mere Kahu, start in a fresh browser context with setup-prepared authentication, open Dashboard, and enter Help & Support through the sidebar. The FAQ is the left-hand card on `/help`; Contact controls are outside this feature's scope.

All paths below begin with `FAQ's`; file names are relative to `tests/help/faq/`.

| Behaviour and design path | Leaf title | Spec / account or input | Tests |
|---|---|---|---:|
| Browse questions by topic | Opens on All | `browse.spec.ts` / Mere Kahu; all four groups and 15 closed questions | 1 |
| Browse questions by topic | Filter by topic | `browse.spec.ts` / each of the four topics, then All | 5 |
| Read an answer | Open and close an answer | `answers.spec.ts` / one independent result per question | 15 |
| Read an answer | Only one answer open at a time | `answers.spec.ts` / What is Sparky AI? → How does Sparky work? → Can I speak to a real person? | 1 |
| Read an answer | Answers with an extra note | `answers.spec.ts` / the two documented notes; no note for the other 13 questions | 1 |
| Search help topics › Positive Testing | Search matches questions, answers and notes | `search.spec.ts` / `warning`, `pdf`, `big four`, and `  human  ` | 4 |
| Search help topics › Positive Testing | Search within a topic | `search.spec.ts` / Bills, warnings and plans + `warning`, then All | 1 |
| Search help topics › Positive Testing | Clear the search | `search.spec.ts` / native cancel control and keyboard deletion, each under All and Bills, warnings and plans | 1 |
| Search help topics › Negative Testing | No matching topic | `search.spec.ts` / `solar` and `%#@`; Ask Sparky instead navigation | 2 |
| **Total** | **9 leaves** | **6 browsing, 17 answer, and 8 search tests** | **31** |

## Content expectations and page order

`data/faq-cases.ts` holds the 15 complete expected questions and answers, two optional notes, the four topic labels, and the explicit search scenarios. The content baseline was captured from the current page source and approved design on **31 October 2026**. It is fixed test data: tests do not import application code or read the displayed answer to generate its own expected value. The page supplies this FAQ locally, so no FAQ API oracle is required.

The rendered order is About Sparky (4), Accuracy and limits (2), Bills, warnings and plans (6), then Privacy and support (3). The suite checks group and question order, not only total counts. Group headings appear uppercase through CSS; their underlying text is compared with the topic labels in the design.

The opening case checks the page title, subtitle, FAQ heading, empty search field and placeholder, five topic buttons and their counts, All's selected appearance, and all 15 closed questions. Filtering requires only the chosen group's questions and heading, a count matching that group, and restoration of all four groups after choosing All. The separate All row first chooses another topic so it exercises a real filter change.

The baseline verifies the displayed FAQ content. It does not establish the correctness of every claim in that content, such as the service's pricing calculations or data-handling practices; those questions require their own acceptance or specialist checks.

## Answers, notes, and selection state

Each question has its own open-and-close test. Opening must set `aria-expanded` to `true`, display that question's complete expected answer, and rotate its arrow to 180 degrees. Closing must set `aria-expanded` to `false`, hide the answer and any note, and return the arrow to zero degrees. Arrow checks poll the computed rotation and allow the CSS transition to finish without a fixed sleep.

The single-open case moves through three questions in different positions. At each checkpoint exactly one answer must remain visible, and the previous question must be collapsed. The extra-note case checks the precise notes for `How does Kea compare plans?` and `Where do Sparky’s numbers come from?`, then opens every other question to verify that none displays an extra note.

The topic controls expose their active state through a CSS class rather than `aria-pressed`. The tests require the selected button's active class and visible gradient and require every other topic button to be inactive.

## Search expectations

Search matching must examine question text, answer text, and optional notes. The expected questions are written explicitly in the fixture instead of reproducing the page's search algorithm. This also makes the purpose of each input visible:

| Input | Behaviour exercised | Expected question count | Counts in All / About / Accuracy / Bills / Privacy order |
|---|---|---:|---|
| `warning` | Matches question text and an answer-only occurrence | 3 | 3 / 1 / 0 / 2 / 0 |
| `pdf` | Lowercase input matches uppercase answer text | 1 | 1 / 0 / 0 / 1 / 0 |
| `big four` | Matches text present only in an extra note | 1 | 1 / 0 / 0 / 1 / 0 |
| `  human  ` | Leading and trailing spaces are ignored | 4 | 4 / 2 / 1 / 0 / 1 |

Every search case checks the exact visible questions, their group headings and grouping, absence of empty groups, and all five topic counts. The query remains in the search field as entered. Searching within Bills, warnings and plans must restrict `warning` to its two matching questions; switching to All must retain the query and include the matching About Sparky question.

Clearing the search is one result with four `test.step` checkpoints: native cancel control under All, keyboard deletion under All, native cancel control under Bills, warnings and plans, and keyboard deletion under that topic. Every checkpoint first verifies the filtered results, then requires an empty field, the same selected topic, and the complete question list for that topic.

Chromium's native search cancel control has no ordinary DOM locator or accessible name. The page object focuses the search field and clicks its right-hand cancel area using the field's own bounds. It does not replace that click with `fill('')`. The keyboard path selects the text with `ControlOrMeta+A` and removes it with Backspace. Successful clearing must be observed in the rendered application for both paths.

The two no-match inputs require no question or group, the exact message `No help topics match “{query}”.`, and the Ask Sparky instead button. Clicking it must open `/assistant` and display the AI Assistant heading. These cases do not ask a question or validate a generated answer.

## Shared-environment boundary and defect reference

`faq-test.ts` installs an automatic API write guard before each browser journey. FAQ operations must not attempt account changes or submit chat questions. Navigation to the assistant may perform its ordinary read requests; no live response is requested by these tests. Setup still prepares authentication and restores the agreed alert defaults through the managed runner.

The four search-matching rows carry **#35**, the existing suspected finding that topic counts remain at the full FAQ totals while search results are filtered. The correct search-specific counts remain the assertions. The annotation does not pre-assign an execution outcome or hide a failure, and the four data rows retain independent results. No `test.fail()` or defect-based skip is used.

## Boundaries and commands

All nine FAQ leaves have automated coverage. There are no manual-only leaves or approved skips for this feature. Contact calling, email and copy controls belong to the next feature. FAQ-to-assistant navigation is covered here; assistant conversations and answer quality remain in the later Sparky work.

The normal runner uses headless Chromium and two functional-test workers by default. It preserves isolated browser contexts, execution-phase ordering, report generation, and temporary authentication cleanup.

Run commands from the standalone test-project directory:

```sh
npm test -- tests/help/faq
npm run test:list -- tests/help/faq
npm run report
```

Add `--headed` to observe browser windows or explicitly supply `--workers 2` to restate the default. Listing tests does not access the deployed application.

## Execution review

On **31 October 2026**, the dedicated two-worker AWS run produced **32 results: 28 passed and 4 failed**, including the passing setup result. FAQ itself produced **27 passes and four ordinary failures**, with no retries or skips.

All four failures reproduce existing finding **#35**. The exact question lists and group membership passed first. Topic counts then remained at **15 / 4 / 2 / 6 / 3** for every keyword, instead of the search-specific values above. Failure reports contain expected/actual counts, defect references, screenshots, and retained videos. These are four affected data rows for one defect, not four distinct bugs.

The other 27 tests passed, including all 15 full answer texts, arrow and expansion states, exclusive opening, both notes and their absence from the other 13 answers, all topic filters, search within a topic, native cancel and keyboard clearing, and both no-match navigation journeys. No unexpected API write or chat submission was observed. No FAQ leaf requires manual-only execution.

Development validation found and corrected two test issues: an answer locator whose inner `has` selector repeated its outer container, and a module-level navigation hook that was not registered for every spec when its helper module was cached. The final code uses candidate-relative button locators and a test-scoped automatic entry fixture that depends on the write guard. These development failures are not product findings.

Type checking passed. A separate temporary directory containing only standalone test-project source installed its own dependencies, passed type checking, and discovered exactly 31 FAQ tests in three spec files. No application-source imports or parent-directory resources were required.

The final two-worker regression produced **295 results: 266 passed, 25 failed, and four approved Monthly skips**, with no retries. FAQ again produced 27 passes and four failures. The prior 21 Profile, Usage, Billing, and Plan Request failures remained unchanged; no additional regression or unresolved test-script failure was observed. The four skips are Julia's and Priya's normal Monthly comparisons in two units each. The existing positive Plan Request case recorded its one permitted request during this full run.

Playwright HTML, Allure, and JUnit agree on these totals. Setup and report generation succeeded, and temporary authentication states were removed. The run exits with status 1 because the 25 known product-defect cases fail normally.
