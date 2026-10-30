# Reset Password coverage

The Reset Password design contains **9 leaves**, implemented as **18 tests** across three entry points. All 18 passed against the deployed AWS site on 29 October 2026.

Every test starts in a fresh signed-out browser context. Profile and Settings journeys sign in through the Login form using runtime credentials and dismiss the Welcome dialog. They do not start from saved signed-in states.

All paths below begin with `Reset Password`. File names are relative to `tests/reset-password/`.

| Behaviour and design path | Leaf title | Spec / account or input | Tests |
|---|---|---|---:|
| From the login page (Forgot password?) › Positive Testing | Valid email | `from-login.spec.ts` / July Household sign-in email | 1 |
| From the login page (Forgot password?) › Negative Testing | Empty | `from-login.spec.ts` / empty input | 1 |
| From the login page (Forgot password?) › Negative Testing | Invalid email | `from-login.spec.ts` / email without a full stop in its domain | 1 |
| From the login page (Forgot password?) › Negative Testing | Not registered | `from-login.spec.ts` / unique unregistered email | 1 |
| From Edit profile (signed in) | Reset password button | `from-profile.spec.ts` / Spike Household | 1 |
| From Settings (Password and security) › Positive Testing | Send reset link | `from-settings.spec.ts` / Ana Whitiora | 1 |
| From Settings (Password and security) › Positive Testing | Cancel | `from-settings.spec.ts` / Ana Whitiora; Cancel, Escape, and outside click in one test | 1 |
| From Settings (Password and security) › Data scenarios | Email shown is the account's own | `from-settings.spec.ts` / nine data-platform accounts and Generated Demo Household | 10 |
| From Settings (Password and security) › Data scenarios | Account without an email on file | `from-settings.spec.ts` / July Household | 1 |
| **Total** | **9 leaves** | **4 Login-entry, 1 Profile-entry, 13 Settings-entry tests** | **18** |

The account-email leaf has separate rows for Julia Fox, Ana Whitiora, Tama Rewiri, Mere Kahu, Josh Fuller, Priya Raman, Daniel Okafor, Rangi Paterson, Mereana Tipene, and Generated Demo Household. Each row compares the visible Profile email with an independent API response, then checks that the Settings dialog offers the same destination. The expected address comes from Profile data, including for Generated Demo Household whose sign-in email differs from its contact email.

## Checkpoints

The Login entry checks that a valid email closes the dialog and shows the prepared-instructions confirmation. Empty and invalid values keep the dialog open with the approved error. An unregistered email receives the same confirmation as a registered address. Invalid values are derived from runtime data; usable credentials are not stored in test files.

The Profile entry follows the avatar menu to My Profile and Edit profile. Its Reset password button shows the prepared-instructions toast at the top right while leaving the Edit profile dialog open.

The Settings entry waits for the page's own Profile response before opening Password and security. It checks the accessible dialog name, destination text, expiry guidance, action buttons, and visually hidden title and close control. Sending closes the dialog and shows the approved confirmation. Cancel, Escape, and an outside click each close it without a toast. The account without an email receives the generic destination text and can still request the prototype confirmation.

## Prototype behaviour and isolation

Reset controls prepare or display instructions locally. They do not send an email, change a password, or look up an account for the reset action. Browser API writes are intercepted and blocked after sign-in, with an explicit assertion that no unexpected write occurred. A separate observer starts after page data has loaded and checks that reset controls make no browser API requests, including GET account lookups. Login itself remains a real browser sign-in, and read requests provide expected account data.

These tests run in the read-only Chromium project. Opening the Settings page for a reset does not edit alert preferences, so these journeys do not belong in the later settings-write project or require Rangi as their only account. Rangi appears as one read-only account-email row.

There are no manual-only or unsupported Reset Password leaves in this design. These tests establish the documented prototype behaviour; they do not establish email delivery or a working password-change service.

## Execution review

On 29 October 2026, `npm test -- --workers 2` ran against `https://13.54.25.80` with two Chromium workers after setup. All **44 results passed**: 18 Reset Password, 24 Login, one existing Dashboard usage proof, and one setup result. Reset Password's entry-point totals were 4 Login, 1 Profile, and 13 Settings. There were no failures, retries, skips, or unsupported Reset Password leaves, so no failure classification was needed.

`npm run typecheck` passed. Playwright HTML, Allure, and JUnit reports were generated successfully. Temporary authentication states and the run lock were removed after execution. The Settings wording observation #28 remains outside defect assertions: this design explicitly expects its current prototype confirmation.

The editor-discovery compatibility correction was followed by another two-worker AWS run with the same 44 passing results. Native and managed read-only discovery each listed all 18 Reset Password tests. Offline checks confirmed that unmanaged execution is rejected before application activity and a managed execution reaches its test.

The final design audit compared all nine leaves and their shared notes in the local Xmind master and Markdown export. It added observation of every API method during reset actions. An offline fault probe confirmed that an unexpected GET account lookup is detected and a POST write is blocked. The final two-worker AWS run after this addition passed all 44 results with no failures, retries, or skips. Focused Reset Password runs contain 19 results including setup; full-suite runs contain 44.
