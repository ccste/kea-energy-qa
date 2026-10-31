# Jenkins demonstration

One local Jenkins Pipeline job runs this suite against the deployed AWS website. It demonstrates Git checkout, a test-selection parameter, automated execution and report publication. It does not build or deploy the application. The Mac and Jenkins must remain running during a build; no cloud Jenkins service, automatic trigger or recurring schedule is required for this portfolio demonstration.

## Test selection

The `SUITE` choice parameter uses the existing managed npm commands. It does not introduce new tags or duplicate tests.

| Choice | Command | Product tests collected |
|---|---|---:|
| `smoke` (default) | `npm test -- --grep @smoke` | 14 |
| `regression` | `npm test` | 373 |
| `sparky-live` | `npm run test:ai` | 39 |
| `full` | `npm run test:all` | 412 |

Each execution also requires one setup test. These are selection counts, not passes; Monthly eligibility is evaluated at runtime. The tags are lowercase `@smoke` and `@ai`. Regression includes mocked Sparky interface tests but excludes live answers. Sparky-live selects only live answers, while full includes both layers and all other features.

All selections prepare the shared environment and reset the 15 demo accounts' alert preferences. Regression and full include the permitted positive Plan Request submission, which can create one real Customer Care request; smoke does not select that submission. Live selections record conversations and may incur model costs. Do not run a second working copy against the shared site while Jenkins is executing.

## Local prerequisites

- Jenkins with Pipeline, Git, JUnit and HTML Publisher plugins. Pipeline Stage View is optional for a stage overview.
- Git, Node.js 22.18 or later, npm and Java available to the Jenkins process. The demonstration Mac uses Node.js 24 and Java 21.
- The public portfolio repository can be cloned over HTTPS without a GitHub credential. Jenkins administrator credentials stay in the local instance and are never added to the repository or pipeline.

If Jenkins cannot find the Mac's Node installation, add the Jenkins environment entry `PATH+NODE` with value `/usr/local/bin` under **Manage Jenkins → System → Global properties → Environment variables**. Use the installation directory appropriate to another machine. Keep machine-specific paths out of the Jenkinsfile.

The Allure Jenkins plugin and a separate global Allure installation are not needed. The pipeline uses this project's pinned `allure-commandline` dependency through `npm run report:allure`, then publishes its HTML using HTML Publisher.

## Create the job from Git

Create a **Pipeline** job named `kea-energy-e2e`, using Jenkins's own workspace. Do not set a custom workspace to the developer checkout: the pipeline clears its dedicated workspace before checkout.

Under Pipeline, select **Pipeline script from SCM → Git**:

| Setting | Portfolio repository (local demonstration) | Team repository (optional separate job) |
|---|---|---|
| Repository URL | `https://github.com/ccste/kea-energy-qa.git` | `https://github.com/CS778-S2-2026-AWS-Challenge/HAKAS-kea-energy.git` |
| Credentials | None for the public repository | Jenkins-managed read credentials for the private repository |
| Branch specifier | `*/main` | `*/qa/e2e-rebuild` while the Draft PR is open; select `*/main` after merge |
| Script Path | `Jenkinsfile` | `qa/e2e/Jenkinsfile` |

Both repositories contain the same Jenkinsfile and test project. The synchronization script exports the committed team `qa/e2e/` contents to the portfolio root. `checkout scm` uses the job's repository, branch and credentials; the pipeline then detects whether the test project is at the checkout root or under `qa/e2e`. No repository-specific pipeline copy is required. A local GitHub CLI login does not automatically provide Jenkins with private-repository credentials.

The local demonstration job uses only the portfolio configuration. Publishing the Jenkinsfile to the team branch does not create a team Jenkins job, enable triggers, alter GitHub Actions, or merge the Draft PR. A second job is unnecessary for this demonstration.

Build #1 used a temporary **Pipeline script** copy before publication. Its only checkout adaptation replaced `checkout scm` with:

```groovy
git branch: 'main', url: 'https://github.com/ccste/kea-energy-qa.git'
```

Use **Pipeline script from SCM** with the settings above for subsequent builds. The Git version defines the pipeline; do not maintain a separate inline copy. A new Pipeline job may show **Build Now** until the first execution initializes its parameters; subsequent runs use **Build with Parameters**.

Leave build triggers disabled. Choose a suite manually and start the build. The pipeline checks out the repository, installs locked npm dependencies and Chromium, checks TypeScript, then executes the selected tests.

## Reports and results

The three report outputs describe the same execution:

| Output | Purpose |
|---|---|
| JUnit XML | Machine-readable results consumed by Jenkins for its native test totals, failed-test details and build-to-build trends. No Java or JUnit tests are added. |
| Playwright HTML | Browser-test details and the suite's screenshots, videos, attachments and available traces. |
| Allure Report | An alternative HTML view of test steps, attachments and classifications. |

After testing starts, report publication is attempted even when tests fail. One publisher error does not suppress the other reports, but it remains a build failure. User aborts and timeouts are not swallowed. A failing test command continues to make the build unsuccessful; existing product defects are not converted into passing results for the demonstration.

Open the build's **Tests**, **Playwright HTML** and **Allure Report** links. JUnit XML and `run-summary.json` are also downloadable artifacts. Setup or installation failures may prevent some reports from being created; inspect Console Output for the original failure. Do not use `npm run report` or `npm run report:allure:open` as build steps, because those interactive servers wait for a user to stop them.

### HTML report rendering

Do not disable Jenkins's Content Security Policy for user-created files. On the local demonstration instance, use **Manage Jenkins → System → Jenkins Location** with:

- Jenkins URL: `http://localhost:8080/`
- Resource Root URL: `http://127.0.0.1:8080/`

Access Jenkins through `localhost`. The distinct resource hostname serves report content on a separate origin, allowing the HTML reports to run their scripts without weakening Jenkins's main-origin policy. Both addresses refer to this Mac only; these are not public portfolio links. Resource links contain temporary access tokens: do not share their full URLs or capture them in a public demonstration. Review report contents before sharing exported evidence.

## Execution settings

The pipeline uses headless Chromium with `CI=true` and two ordinary functional workers. Existing configuration keeps Settings and live Sparky at one worker each. CI permits one retry for ordinary functional tests; setup, Settings, live Sparky and the real Plan Request submission retain their no-retry rules.

Runs are limited to 90 minutes and the same job cannot execute concurrently. Jenkins retains at most ten builds and downloadable artifacts for five builds. HTML reports are retained with their builds. Each run starts from a clean workspace, preventing old reports from being published as new evidence. Saved session state is removed during cleanup and is never archived.

An unsuccessful build can correctly expose a product defect or service failure. Use the test details and [known defects](known-defects.md) to explain the outcome. A Jenkins execution is not proof that all selected cases passed, and a live model's future answers may differ from recorded evidence.

## Initial validation

On 31 October 2026, local build **#1** checked out portfolio revision `5e7518aa8a0c2cae2cda73b913a7d59096ce04de` and ran `smoke`. It completed in 49 seconds with **15 results: 14 passed and 1 failed**, including setup, with no retries or skips. The failure reproduced known Settings defect **#29**: the disabled Call channel leaves its threshold radios enabled. The build correctly remained **FAILURE**.

Checkout, dependency installation, TypeScript checking and report publication completed. Jenkins's native Tests page showed the same totals. Both HTML reports were opened interactively, including the failed test's steps and screenshot evidence. No live Sparky answers were generated by this smoke run.

This initial validation used the temporary inline pipeline described above. Subsequent SCM-based builds record the selected Git revision in Jenkins. The other three selections were checked through test discovery and command mapping, but were not executed in Jenkins during this initial validation.
