# Manual review

## Live Sparky answer quality

This checklist represents the manual-only leaf `Sparky AI › Other Questions › Answer quality review (exploratory)`. Review answers attached to the live report. Automated metadata, numerical, and pattern checks support this review without establishing the full quality of an explanation.

Record the run date, account, test title, attachment, question and follow-up context. Mark each checkpoint as pass, fail, or not applicable; give a short finding with the relevant quotation or figures.

1. The first line answers the question.
2. Figures are consistent. Parts presented as components of a change sum to it, with matching units and periods.
3. The answer uses plain words, usually 60–140 words, without unnecessary long headings or tables.
4. A closing question follows the topic and serves a useful purpose.
5. Statements agree with other pages and available records. An explained issued bill should appear in Billing.
6. The tone fits the situation, without pressure to switch or an upsell.
7. Uncertain causes remain uncertain; a whole-house meter does not prove which appliance used power.
8. Handover wording does not imply a person received the chat or will contact the customer when no contact was arranged.

Use finding #48 for reproduced answer-quality observations where appropriate. Distinguish new findings from an automated check's overly narrow pattern.

Do not add a passing or permanently skipped placeholder for this review. Its completion is a recorded human judgement alongside the automated run.

## Theme screenshot acceptance

Create Settings Light and Dark baselines on the Jenkins Mac with the agreed Chromium version and viewport. Restore defaults, disable animations, and remove or mask transient toasts.

Inspect both images before accepting them: text and controls stay readable, selected and disabled states are clear, and the application shell follows the chosen theme. Review changed baselines as product changes; generating a replacement alone does not establish correctness.

## External application boundaries

Contact tests verify visible contact details, link targets, and clipboard contents. Whether `tel:` opens a dialer or `mailto:` opens an email client depends on the device and its configuration. Record any device-specific check separately from browser-test results.

Actual bill reading is outside the deployed suite's current scope. File checks before reading remain automated; passing them does not establish a working bill reader.
