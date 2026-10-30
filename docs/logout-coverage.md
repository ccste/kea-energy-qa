# Logout coverage

The local Xmind master and Markdown export contain the same **7 Logout leaves**, implemented as **7 independent tests** in `tests/logout/logout.spec.ts`. All seven passed against the deployed AWS site on 29 October 2026.

Every test starts in a fresh signed-out browser context, signs July Household in through the form using runtime credentials, dismisses Welcome, and opens Power Clash through the sidebar. The URL and Power Clash heading are checked before each logout journey. Power Clash supplies a protected starting page; its game functionality remains outside this suite.

All design paths below begin with `Logout`. There are no data-driven rows for this feature.

| Behaviour | Leaf title | Main checkpoints |
|---|---|---|
| Log out from the sidebar | Expanded sidebar: Logout → Yes | Expanded labels visible; confirmation closes the dialog and shows Login |
| Log out from the sidebar | Expanded sidebar: Logout → Cancel | Dialog closes; Power Clash and July's identity remain, including after reload |
| Log out from the sidebar | Collapsed sidebar: Logout icon → Yes | Navigation is collapsed and the Logout text is hidden; the icon opens confirmation and Yes shows Login |
| Log out from the sidebar | Collapsed sidebar: Logout icon → click outside the dialog | Clicking the backdrop closes the dialog; Power Clash and July's identity remain, including after reload |
| Log out from the profile menu | Avatar → Logout → Yes | Profile-menu Logout opens confirmation; Yes closes it and shows Login |
| Log out from the profile menu | Avatar → Logout → Cancel | Cancel closes the dialog; Power Clash and July's identity remain, including after reload |
| After logging out | Protected pages are no longer accessible | Independently sign out, then check browser Back and direct `/clash` navigation each show Login |

## Shared expectations and session evidence

Every entry checks the Logout dialog, the exact prompt `Are you sure you want to logout?`, and visible, enabled Yes and Cancel buttons. Confirming checks that the dialog disappears, the URL is `/login`, and the Login form is available. The expanded-sidebar confirmation case carries `@smoke`.

The three cancellation cases check `/clash`, the Power Clash heading, and July's name and customer ID in the avatar menu. They reload the page and check the protected page and customer ID again, proving the session survived cancellation without reading or logging token-bearing storage.

The protected-page case checks browser Back before directly opening `/clash`, with separate assertions after each action. Direct navigation loads the application again, so a stale in-memory signed-out view cannot hide a persisted login session. All actions use the actual browser and deployed application; logout success and navigation are not mocked.

These tests run in the ordinary Chromium phase and do not change shared alert settings. The design does not require Escape dismissal, cross-tab synchronization, or backend token revocation. No Logout leaf requires manual execution or a skipped placeholder, and no existing suspected-defect reference applies.

## Execution review

On 29 October 2026, `npm test -- --workers 2` ran headlessly against `https://13.54.25.80`. Setup completed first, followed by the functional tests with two Chromium workers. All **51 results passed**: seven Logout, 24 Login, 18 Reset Password, one Dashboard usage proof, and one setup result. There were no test failures, retries, or skips in this completed AWS run, and no new product defect was observed.

An initial attempt could not launch Chromium inside the restricted execution sandbox and stopped before setup actions or product tests ran. The subsequent run used the required browser process permissions. This was an execution-environment issue, not a product failure or a test-script correction.

`npm run typecheck` passed, and `npm run test:list -- tests/logout` listed exactly seven tests. Playwright HTML, Allure, and JUnit reports were generated and checked. Temporary authentication states and the run lock were removed after execution.

To run only this feature from the E2E directory:

```sh
npm test -- tests/logout
npm run report
```

The focused selection contains eight results including setup. Two workers and headless execution are the defaults; add `--headed` when observing the browser is useful.
