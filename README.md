# Kea Energy QA

This repository holds the end-to-end test work for **Kea Energy**, a customer web app for a New Zealand electricity retailer. Customers use it to see their usage and bills, get warned before a bill shock, compare plans, and ask Sparky, an AI assistant, about their account.

Kea Energy was built by team HAKAS for COMPSCI 778 at the University of Auckland in 2026. The team's main repository is private, so the QA code is mirrored here after each step.

## My role

- **QA**: the test-point analysis (12 features, 173 test cases, designed in Xmind) and the Playwright + TypeScript end-to-end suite in this repository.
- **Design**: the Figma prototype the web app was built from.
- **Web frontend**: frontend development of the web app.

## What's here

| Folder | Contents |
|---|---|
| `e2e/` | The Playwright + TypeScript end-to-end suite. It runs against the deployed site, and features are added one at a time. |

## Status

The suite is being rebuilt feature by feature, starting in October 2026. Each commit is one finished step.
