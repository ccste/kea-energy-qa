# Test conventions

## Traceability and scope

Organize specs by feature. Describe blocks mirror the approved feature and behaviour path; each test title matches its leaf title. Add the account or input to every data-driven title for independent results. Keep a leaf's related checkpoints in one test, using `test.step` for the journey and soft assertions for related data comparisons.

Keep imports and runtime files inside this project. Application code can inform investigation but must not provide imported expected results. Do not modify the application to make a test pass. API verification belongs in its separate suite; these API calls supply oracles, preconditions, and cleanup.

## Browser journeys and page objects

- Use relative URLs with the configured `baseURL` instead of environment URLs in specs or page objects.
- Give each test a fresh browser context. Reuse setup-created account states except where the journey explicitly tests authentication.
- Navigate through visible controls as the customer would. Direct navigation fits cases explicitly testing an address or an access boundary.
- Keep locators and actions in page objects, with assertions visible in specs.
- Prefer roles, accessible names, labels, and placeholders. Scope repeated controls to their section or dialog. Document narrowly scoped CSS selectors where semantics are insufficient.
- Never call `waitForTimeout`. Wait for a UI condition, response, request, download, or controlled mock event. Register event waits before the triggering action.
- Use `test.step`, attachments, and standard reporters instead of a custom logger.

## Expected values

Use independent API requests, the browser's own response, cross-page comparisons, documented scenario facts, and approved visible text. Simple display transformations, sums, maxima, dates, and currency formatting are acceptable. Do not query a database or reimplement backend forecasting, pricing, alert decisions, or tiering.

Compare displayed values at their displayed precision. Preserve strict cross-page currency checks; do not add tolerances to hide an inconsistency. A fixed documented fixture can expose a data defect hidden by comparing the UI only with the API.

## Shared-environment isolation

The managed runner resets all 15 accounts to default alert preferences before preparing browser states. Setup holds preconditions only, never product acceptance assertions that belong in feature specs.

Keep configuration loading and test discovery free of application requests and execution-only checks. Enforce the managed entry point when execution starts, including setup tests and fixture preparation. Editor discovery must not require a prepared account state or change the deployed environment.

Run readers before settings writes. Rangi Paterson is the settings-write account. Every mutating settings test restores the complete default record in fixture setup and teardown; teardown runs after failures too. A cleanup error remains visible.

Use one settings worker without a serial test group that skips later cases after a failure. Each case runs independently. Later selected phases still execute after ordinary test failures; setup failure stops the run.

Only the designated successful Plan Request case records a real request. Intercept failed and duplicate-request cases. Keep live Sparky concurrency low and avoid test runs during demonstrations.

## Sparky streams and answers

Mock chat-interface behaviour with prepared SSE events. Control pending requests or stream stages when checking intermediate states such as chart visibility before `done`. A single complete mocked response cannot prove progressive rendering.

Send live questions through the browser and tag them `@ai`. Parse the browser's own SSE response. Check tool events, successful sources, conversation identifiers, escalation metadata, and figures against the appropriate oracle. Attach each answer for review.

Use exact text for deterministic server messages and soft required/forbidden patterns for model prose. Never compare separate model generations or turn a model outage into a passing result. Pattern checks support the manual quality checklist; they do not replace it.

## Failures and coverage

Assert approved expected behaviour even when the product is wrong. Use `defect` annotations with the permanent finding number and an actionable description, also exposed in Allure. Use `tdd` only for an explicit unimplemented requirement. Never invert a defect result with `test.fail()` or skip a case because it exposes a defect.

One root cause can produce several independent failures. Keep each account's result and summarize common causes in the review. Distinguish existing defects, new product findings, test issues, and environment/setup issues using evidence from the current run.

The Monthly complete-data comparison has an explicit exception: skip an account row when the API returns fewer than 30 complete days, recording the reason. The dedicated incomplete-Monthly behaviour test must still run. This does not authorize other defect-based skips.

Record manual-only work in coverage and the review checklist. Do not create passing or permanently skipped placeholders. Establish and review theme screenshot baselines on the Jenkins Mac with the agreed browser and viewport; inspect changes before updating them.

## Repository hygiene

Never commit passwords, tokens, saved browser states, customer downloads, or generated reports. Logs and attachments must not print credential responses. Examples must run from this directory alone. Commit only reviewed source and intentional, reviewed screenshot baselines.

Every rebuild commit must use Stephen Li <stephenccu@gmail.com> as both author and committer. Check both identities and the commit message with `git log` before every push, including portfolio synchronization. Keep messages, pull request text, code, comments, and documentation in English. Use one continuing pull request and one commit per reviewed implementation step. Address review feedback with new commits; do not amend or force-push published history.

For the team repository, assign the continuing rebuild pull request to `ccste` and request review from `nanhangfei`. The portfolio repository receives reviewed steps through the synchronization script and does not use pull requests for this workflow.
