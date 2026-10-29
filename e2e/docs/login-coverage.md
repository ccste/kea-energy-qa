# Login coverage

The Login design contains **23 leaves**, implemented as **24 tests**. Google and Apple are separate data rows. Every test starts in a fresh signed-out browser context; credentials are retrieved at runtime. The protected-page test introduced with the foundation is included in these totals.

All paths below begin with `Login`. File names are relative to `tests/login/`.

| Behaviour and design path | Leaf title | Spec / data rows |
|---|---|---|
| Sign in with email and password › Positive Testing | Valid email and password: demo household (July Household) | `credentials.spec.ts` / July Household |
| Sign in with email and password › Positive Testing | Valid email and password: data-platform account (Tama Rewiri) | `credentials.spec.ts` / Tama Rewiri |
| Sign in with email and password › Positive Testing | Valid email and password: generated household (Generated Demo Household) | `credentials.spec.ts` / Generated Demo Household |
| Sign in with email and password › Negative Testing › Email › Length | Longer than 254 characters | `credentials.spec.ts` |
| Sign in with email and password › Negative Testing › Email › Rule | Empty | `credentials.spec.ts` |
| Sign in with email and password › Negative Testing › Email › Rule | Missing @ symbol | `credentials.spec.ts` |
| Sign in with email and password › Negative Testing › Email › Rule | Missing domain part | `credentials.spec.ts` |
| Sign in with email and password › Negative Testing › Email › Rule | Missing username part | `credentials.spec.ts` |
| Sign in with email and password › Negative Testing › Email › Rule | Missing . in domain part | `credentials.spec.ts` |
| Sign in with email and password › Negative Testing › Email › Rule | Extra @ symbol | `credentials.spec.ts` |
| Sign in with email and password › Negative Testing › Email › Rule | Leading / trailing spaces | `credentials.spec.ts` / earlier suspicion #1, not reproduced |
| Sign in with email and password › Negative Testing › Email › Rule | Not registered | `credentials.spec.ts` |
| Sign in with email and password › Negative Testing › Email › Type | Contains special characters | `credentials.spec.ts` |
| Sign in with email and password › Negative Testing › Password › Length | Shorter than 8 characters | `credentials.spec.ts` |
| Sign in with email and password › Negative Testing › Password › Rule | Empty | `credentials.spec.ts` |
| Sign in with email and password › Negative Testing › Password › Rule | Incorrect password | `credentials.spec.ts` |
| Sign in with email and password › Negative Testing › Password › Rule | Correct password in a different case | `credentials.spec.ts` |
| Sign in with email and password › Negative Testing | Login service unavailable | `credentials.spec.ts` / controlled HTTP 502 |
| Other sign-in options | Sign in from a demo account card | `sign-in-options.spec.ts` / Josh Fuller |
| Other sign-in options | Google / Apple sign-in | `sign-in-options.spec.ts` / Google, Apple |
| Password visibility | Show / hide password | `login-controls.spec.ts` |
| Go to sign-up | Create an account link | `login-controls.spec.ts` |
| Access protected pages | Signed out: opening a protected page redirects to /login | `protected-pages.spec.ts` / Billing route |

## Checkpoints

Successful form sign-ins check Dashboard navigation, the heading and greeting, the welcome toast's position and automatic dismissal, and the avatar name and account number against the browser's login response. The three account types each receive an independent result.

Client-side validation checks the field message, invalid state, remaining Login page, and absence of a login POST. Rejected credentials exercise the deployed service and check the error response and visible message. The unavailable-service case replaces only the login request with a gateway error.

Invalid inputs are derived from runtime credentials; no usable passwords are stored in test data. The password-visibility test uses an unrelated example string. Google and Apple exercise the prototype message only; the sign-up case ends at navigation to the Register page.

Finding #1 was not reproduced in the current Chromium run: entering surrounding spaces through the normal email field still signed in successfully. The test does not modify the input type or internal state. It checks the real login response and selected account as well as the Dashboard. The obsolete defect annotation has been removed; the earlier suspicion remains documented in the historical findings.

There are no manual-only or unsupported Login leaves in this design. See the run report for actual execution results.

## Execution review

On 2026-10-29, the deployed AWS site was checked with two workers: all 24 Login tests passed, with no failures, retries, or skips. The existing July Household usage-summary proof also passed. Setup restored all 15 accounts' defaults and prepared their sign-in states. Reports contain 26 passing results in total: 24 Login, one Usage proof, and one setup result.
