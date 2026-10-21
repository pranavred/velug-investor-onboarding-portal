# Changelog

## 0.2.0 — Claude pipeline

Live processing moved from OpenAI Decisions/GPT-5 to Anthropic Claude through the official `@anthropic-ai/sdk`: Claude Opus 5.5 classifies bounded page text with model-reported confidence, Claude Sonnet 5.5 extracts fields from the original PDF under JSON-schema structured output, and optional review drafts select sources with Claude Opus 5.5. The endpoint is pinned, no retries are performed, provider error bodies are never surfaced, and refusals, truncation or model substitution route to manual review. Environment names are now `ANTHROPIC_API_KEY` and `ANTHROPIC_*_MODEL`; processing contract `onboarding-anthropic-v1`. Added `scripts/publish-live-evaluation.mjs` and `evaluations/current/report.json`, so a reviewed private run becomes a fingerprint-bound current-pipeline evaluation shown in the app; the status turns `stale` automatically when pipeline source changes. The distribution scanner now checks tracked files only. The review-draft panel is styled like the rest of the workspace. Source traceability and v2 supersession now treat a null value on a non-essential key as an explicit abstention rather than an ungrounded value; essential keys and unmatched quotes still require review, and extra keys still count against precision in evaluations. Historical GPT-4.1 reference records are unchanged.


## 0.1.0 — release candidate

Standalone fictional investor onboarding demo with historical replay, original PDF/page/quote inspection, investor/admin demo views, correction and explicit replacement history, tutorial and browser-memory reset. New live pipeline classifies parsed text with Decisions and extracts source-linked fields with GPT-5 Responses, using signed anonymous sessions and shared fail-closed Redis dispatch budgets. Optional extractive review drafts are explicitly invoked and disabled by default. Current model evaluation: not_run. No production verification or acceptance.
