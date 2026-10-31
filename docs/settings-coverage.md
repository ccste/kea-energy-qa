# Settings coverage

The approved local Settings Change design contains **16 leaves**, implemented as **17 tests**. All 16 leaves and all 21 plain notes, including the shared rules, agree between the local Xmind file and its Markdown export after whitespace and blockquote normalization. The local files are authoritative.

Only **Amount outside $0–$500** is explicitly data-driven, with separate results for `501` and `-5`. Dark and Light screenshots, the three channel changes, reminders off and on, and the three Privacy dialog dismissal methods remain checkpoints inside their respective design leaves. They are not counted as additional tests.

All cases use **Rangi Paterson** in a fresh browser context. They belong to the existing `settings` project, which runs after the read-only phase, with one worker and no retries. Setup and teardown restore the complete approved alert-preference defaults.

## Design mapping

All paths begin with `Settings Change`. The specs are under [`tests/settings`](../tests/settings).

| Behaviour | Design leaf | Inputs and required checkpoints | Tests |
|---|---|---|---:|
| View the settings → Positive Testing | Opens with the saved settings | Settings title and subtitle; current-visit Appearance explanation; Light selected; all API-backed switches, levels, options, channel notes, floor and quiet hours; disabled unchanged Save button; reminders on; default off Call row visually dimmed and its level choices disabled | 1 |
| View the settings → Negative Testing | Alert settings unavailable | Intercept both preference GETs with HTTP 500; reason appears in the alert-settings error; editor controls are absent; Bill reminders is disabled | 1 |
| Change the theme → Positive Testing | Switch to Dark and back to Light | Each Settings button changes the whole app and selected button, shows its exact toast, then matches its initial-viewport baseline after the toast disappears | 1 |
| Change the theme → Positive Testing | Theme lasts for this sign-in only | Dark survives reload and a sidebar visit to Usage; logout makes Login light; a new sign-in starts light and Settings selects Light | 1 |
| Change the theme → Positive Testing | Top-bar theme button | Dashboard moon button switches to Dark; Settings retains Dark and selects it; the next top-bar click selects Light in both places; the top-bar action has no theme toast | 1 |
| Set bill-shock alerts → Positive Testing | Turn all bill-shock alerts off | Turn the master off; every subordinate channel switch, radio, floor and quiet-hours select is disabled and dimmed; Bill reminders stays usable; Save becomes enabled, succeeds with the expected toast, and reload retains the off state | 1 |
| Set bill-shock alerts → Positive Testing | Turn one channel off or on | Email off, Text off, Call on; each row's dimmed/enabled state changes independently; off-row levels cannot be chosen while the row's own switch remains usable; save toast and reload retain all three choices | 1 |
| Set bill-shock alerts → Positive Testing | Choose alert levels and save | Email 30%, Text 60%, Call enabled at 90%, floor 50, quiet hours 10 pm–7 am; displayed level labels update; Save is enabled after editing, reads `Saving…` during the request, then becomes disabled; success toast, reload and API confirm every value | 1 |
| Set bill-shock alerts → Positive Testing | Level options stay the same and include the default | Capture all three option sets; save Email 40% and Call enabled at 90%; reload; option sets are unchanged and still contain every channel's default | 1 |
| Set bill-shock alerts → Negative Testing → Never alert me under ($) | Amount outside $0–$500 | Separate rows `501` and `-5`; real API rejects with 422 and the corresponding explanatory toast; no success toast; reload retains the previous floor 20 | 2 |
| Set bill-shock alerts → Negative Testing → Never alert me under ($) | Empty | Clear the floor and attempt Save; require an amount instead of silently storing zero; reload retains 20 | 1 |
| Set bill-shock alerts → Negative Testing | Save fails | Intercept preference PUT with HTTP 500; choose Email 30% and Save; failure reason appears, success toast does not; remove interception and reload to the original saved Email 15% | 1 |
| Turn bill reminders on or off → Positive Testing | Turn bill reminders off and on | Off saves immediately without the alert Save button, shows its toast, persists after reload and in the API; On saves immediately and shows its own toast | 1 |
| Turn bill reminders on or off → Negative Testing | Save fails | Intercept preference PUT with HTTP 500; turn reminders off; show the failure reason and no off-success toast; switch returns to On and the server record remains unchanged | 1 |
| Change settings in several sections | Every change is kept | Save Email 30%, then switch Bill reminders off; reload and independently read the full record; both changes must remain | 1 |
| View privacy information | Privacy and data | Centred dialog with its accessible name, exact collection explanation and three rights; no visible title or Close control; Done, Escape and outside click each close it | 1 |
| **Total** | **16 leaves** | **One additional result for the second invalid-amount row** | **17** |

## Saved preferences and exact copy

The initial view compares UI state with an independent `GET /api/households/{account}/alert-preferences`. Setup establishes the following approved defaults before the tests read that record:

| Preference | Default |
|---|---|
| Bill-shock master | On |
| Email | On, 15% |
| Text message | On, 40% |
| A call from Sparky | Off, 75% |
| Never alert me under | 20 NZD |
| Quiet hours | 21 to 8, displayed as `9 pm` to `8 am` |
| Bill reminders | On |

The title is `Settings`; the subtitle is `Manage your account preferences and privacy.` Appearance reads `Choose how Kea Energy looks for this visit. Each new sign-in starts in light mode.`

The current offered steps are Email `10/20/30/40`, Text `40/50/60/70`, and Call `70/80/90/100`. The initial-view case allows a saved level outside those steps to appear in its ordered position, as the design describes. The separate fixed-options case checks the stricter requirement that options must not disappear after saving a different level and that the default can always be selected again. The requirement accepts either aligning defaults with fixed steps or permanently including the defaults among those steps; it does not require a reset button.

The three channel explanations are exact:

- Email: `Always in writing, so you have a record.`
- Text message: `Interrupts your day — set this higher than the email.`
- A call from Sparky: `Sparky calls you. Off unless you turn it on.`

Each selected level is accompanied by `{level}% above normal`. An off row uses the dimmed `channel-off` state, with opacity 0.5, and must disable its level choices. The row's switch remains usable while the master is on. The master-off case checks effective disabled controls, not just a grey appearance. Bill reminders is a separate setting and remains enabled.

The multi-field save expects `tier1_pct: 30`, `tier2_pct: 60`, `tier3_pct: 90`, `voice_enabled: true`, `min_overshoot_nzd: 50`, `quiet_hours_start: 22`, and `quiet_hours_end: 7`. Assertions compare the whole record where appropriate, preserving unrelated fields. The alert success toast is `Alert settings saved`. Reminder saves use `Bill reminders off` and `Bill reminders on`.

For invalid amounts, the exact failure messages are:

| Input | API result | Toast |
|---|---|---|
| `501` | 422 | `Could not save: Input should be less than or equal to 500` |
| `-5` | 422 | `Could not save: Input should be greater than or equal to 0` |

The field accepts numbers from 0 to 500 inclusive, in steps of 5. The design explicitly identifies 0 and 500 as allowed boundaries but does not add separate positive boundary rows. It contains no letter-input case because the browser number field prevents that input. Empty remains a separate validation requirement: clearing the field must not silently become a successful zero-dollar save.

GET and PUT server-failure cases use narrowly scoped browser routes with deterministic error reasons. HTTP 500 is simulated; invalid-amount 422 responses come from the real service. After a rejected or simulated failed save, API reads and reloads verify that no new value persisted. The reminder failure also checks immediate visual rollback.

## Appearance and visual baselines

Appearance belongs to the current browser-tab sign-in and is not an account preference. The API record still contains a legacy `theme` field, but changing either theme control must not save preferences or alter the server record. Every theme test records browser preference PUTs and requires zero, and compares the full API record before and after its journey.

Settings theme buttons show `Dark theme enabled` or `Light theme enabled`. The top-bar button's accessible name describes its next action: `Use dark theme` while light and `Use light theme` while dark. Both controls must stay synchronized. The tests check `html[data-theme]` and the selected Appearance button, plus persistence across reload/navigation and resetting on logout/new sign-in.

The visual case compares two images, `settings-dark.png` and `settings-light.png`, using viewport screenshots, disabled animations and a mask limited to the toast stack. It observes the success toast before waiting for it to disappear, waits for fonts and image decoding, and moves the pointer off the theme controls. No page section, normal content or layout is hidden to make the comparison pass, and no broad pixel tolerance is introduced.

The application scrolls inside its main content container. Consequently, these images cover the initial Settings viewport: the sidebar, top bar, Appearance and the upper part of Bill-shock alerts. They do not claim visual coverage of the entire scrolling Settings content. Enabling a full-page screenshot would not expand that internal scroll container, so the suite retains the real layout and states the viewport scope explicitly. The `data-theme` and selected-control assertions separately verify the theme state; other Settings tests exercise the controls below the initial viewport.

The initial baselines use **headless Chromium on the same Mac that will run Jenkins**, with the configured **1280 × 720** viewport. The resulting files live beside `theme.spec.ts` in its `-snapshots` directory and include the project/platform suffix selected by Playwright. Browser version, operating system, viewport and default saved settings must stay consistent when comparing them.

**The user accepted the initial images with this step's submission approval on 31 October 2026, after receiving both baseline links and the validation report.** Automated generation or a matching comparison alone does not authorize baseline acceptance. Future baseline changes require review. A baseline captures the current appearance, including any visible consequences of existing functional defects; it is not evidence that those functional defects are acceptable or absent. The separate behavior assertions retain the correct requirements.

## Privacy information

The dialog's accessible name is `Privacy information`; its title is not displayed on screen. Its collection paragraph must read `Kea Energy collects account, contact, usage, billing and support information to provide your energy service.` Beneath `Your rights`, it shows:

- `You can request access to your personal information.`
- `You can ask for incorrect details to be corrected.`
- `Your data is protected using appropriate security controls.`

The test checks centring within the configured desktop viewport and verifies the content each time the dialog opens. Done, Escape and an outside click are separate steps in one test. There is no visible X/Close control. Closing keeps the user on Settings and must not write preferences. These assertions check the displayed information and dialog behavior; they do not certify implementation of the stated privacy controls.

## Isolation, ordering and cleanup

`settings-test.ts` reuses the existing API client and page-object fixtures. Its browser guard permits only Rangi's exact preference PUT endpoint, with authentication POST permitted only for the explicitly designated sign-out/sign-in theme case. It records unexpected writes and fails if another write is attempted. `preferenceWrites` tracks browser PUTs so tests can distinguish an immediate reminder save, an explicit alert save, and operations that must not save anything.

`openSettings` enters Dashboard and follows the Settings sidebar control. It waits for both the alert editor and reminder preference loads before interacting. The page and editor maintain separate loaded copies of the same server record, which makes the cross-section case important: saving reminders must preserve the Email change saved just before it. Assertions and input expectations remain visible in the specs; page objects contain locators and actions.

Setup resets all 15 demo accounts before preparing sign-in states. During the Settings phase, the automatic alert-isolation fixture restores Rangi's complete default record with his runtime sign-in token before each test and in teardown after it, including after failures. Cleanup restores the managed preferences without overwriting contact details. Cleanup errors remain visible. API restoration is necessary while #30 prevents selecting the original Email and Call defaults again through the UI.

Settings runs only after all reader cases, including Bill Shock's Rangi readers. The already approved managed runner uses ordered phases instead of project dependencies, so ordinary reader failures do not suppress the later Settings results. Setup failure stops product execution. One Settings worker provides sequencing without a failure-dependent serial group: one failed case must not skip the next one. Coordinate a test window on the shared deployment and avoid running writes during demonstrations.

## Defect references and scope boundaries

| Existing finding | Annotated test row | Correct expectation |
|---|---|---|
| #29 | Opens with the saved settings | The default off Call row disables its level choices |
| #29 | Turn one channel off or on | Switching a channel off disables only its own level choices while leaving its switch usable |
| #30 | Level options stay the same and include the default | Every option set stays fixed after save/reload and retains its selectable default |
| #25 | Empty | Clearing the floor requires an amount and does not save zero |
| #24 | Every change is kept | Saving reminders preserves the previously saved Email level |

The final dedicated AWS run on **31 October 2026 reproduced all five failing rows, covering four existing findings**. Each retains the correct expectation and fails normally; no `test.fail()` or defect skip hides it.

The earlier theme findings #22 and #23, and the old unavailable-settings finding #26, were resolved or superseded by the current per-sign-in theme design. They are not annotated as expected defects. Theme behavior and unavailable settings are still tested as normal requirements. API authorization finding #27 is outside this UI functional scope; cleanup nevertheless sends the account's valid runtime token.

All 16 design leaves have automated coverage, with **no manual-only leaves or approved Settings skips**. First-baseline visual approval is a human review gate for the screenshots, not an additional automated case or a permanently manual feature leaf. Password and security is covered by Reset Password. Answers without a connection and Connected home are outside the Settings design. Bill Shock already covers how Email thresholds, dollar floors and message switches affect its Dashboard panel; these Settings cases focus on controls, persistence, validation and theme/privacy behavior.

## Commands

Run from the standalone test-project directory:

```sh
npm test -- tests/settings
npm run test:list -- tests/settings
npm run report
```

The managed runner uses headless Chromium by default. Settings always runs with one worker, even if the general suite's default is two or `--workers 2` is supplied. `--headed` is useful for observing functional interactions; baseline generation and comparison use the agreed headless Mac environment.

To deliberately generate or update only the two theme baseline candidates for review:

```sh
npm test -- tests/settings/theme.spec.ts --grep 'Switch to Dark and back to Light' --update-snapshots
```

Review generated changes before accepting them. Do not routinely update snapshots to clear a visual regression. The test-list command does not access the website.

## Execution review

On **31 October 2026**, the final dedicated AWS run produced **18 results: 13 passed and five failed**, including the passing setup result. Settings itself produced **17 results: 12 passed and five ordinary failures**, with **no retries or skips**. The Settings phase used one worker.

The five failures reproduced the four existing findings above: #29 affects both the default off Call channel and the channel-toggle case; #30 removes the Email and Call defaults after saving other levels; #25 accepts an empty floor as zero; #24 loses the saved Email level when reminders are saved. No additional product finding was identified.

All three theme cases passed. The unavailable-settings state, master switch, multi-field alert save, both invalid-amount boundaries, both simulated save failures, immediate reminder saves, and Privacy dialog also passed. Theme controls stayed synchronized without preference writes; reload/navigation retained Dark and logout/new sign-in restored Light. Reminder failure rolled back visibly, and both real 422 cases retained the previous saved amount. Cleanup completed without an unresolved failure.

Both Light and Dark viewport comparisons passed against the generated Mac baselines. **The user accepted the initial baselines with this step's submission approval on 31 October 2026.** A matching comparison confirms repeatability; it does not establish absence of the separately recorded functional defects.

Initial validation also found two test-code issues: a disabled-fieldset assertion used a matcher that did not represent the native fieldset state, and an anchored error locator did not account for leading DOM whitespace. The fieldset check now verifies its native disabled attribute and the actual disabled child controls; the error locator finds the intended alert while the assertion still requires its complete expected text. Both corrected cases passed in the final run. These were test issues, not new product bugs.

The subsequent full AWS regression produced **360 results: 317 passed, 39 failed and four approved Monthly skips**, with no retries. Every earlier feature retained its previous outcome. The reader phase completed before all 23 Settings-project rows: six Bill Shock settings-linked cases passed, followed by the 17 Settings cases with the same 12 passes and five failures. The runner retained both phases' ordinary product failures and generated the combined reports successfully.

HTML, Allure and JUnit contain matching totals. All 360 Allure result IDs and history IDs are unique. A separate post-run API read verified all 14 managed Rangi preferences against their defaults; temporary authentication state was removed. An independent copy installed its own dependencies, passed TypeScript checking and listed all 17 Settings tests without importing application source or requiring the parent repository. The initial baseline acceptance is recorded above; future changes still require review.
