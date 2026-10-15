# Evaluation scopes

Current Decisions classification: **not_run**. GPT-5 extraction: **not_run**. Current end-to-end model case outcomes: **not_run**. Optional draft source selection/quality: **not_run**. Offline software tests and quote matching are not measured model accuracy or external verification.

The 31-call and 17-call GPT-4.1 reports retain their original model, dates, failures, request IDs, source/config hashes and PDF bytes. Files remain at their original sample URLs; `evaluations/reference/manifest.json` binds their immutable hashes. The old 90-check workflow report is archived separately. New build reports are regenerated from current offline tests and show skips separately. Historical source hashes are not rewritten to match this changed application. No excluded one-off runner or personal filesystem path is needed for integrity verification.

`npm run verify:reference` checks reference integrity. `npm run eval:offline` runs current deterministic, transport-mocked and historical replay regressions with actual OpenAI networking forbidden. `TEST_REDIS_URL` enables real disposable Redis integration; otherwise it is visibly skipped. The current pipeline has no measured uncertainty threshold: a malformed distribution/tie/ambiguous-purpose answer is Unsorted; every supported output still needs human review. Provider confidence is not accuracy.

Optional paid execution is deliberately separate, never run by CI/build:

```
node --env-file=.env.local --experimental-strip-types scripts/run-live-evaluation.mjs --allow-paid --max-calls=40 --out=evaluations/runs/local-unique-run
```

Outputs must use an unused private directory under evaluations/runs, which is gitignored. Maximum 40 dispatches; no automatic retry, no drafts, no labels in provider prompts. The 17 synthetic PDFs can need 34 calls. Shared runtime quotas still apply: defaults cannot complete the whole run in one hour. Set explicit local global/session limits of at least 40 only if intentionally budgeting this run. Never raise public deployment limits for the runner. Inspect all retained failures and partials; insufficient budget is not a pass. Runner records confusion/false routing and extraction grades; model case/draft quality remain not_run until separately measured. Unique dataset/version changes must be reviewed. Only deliberately reviewed synthetic outputs may ever be published. Provider responses can include sensitive content; never put real-data runs in public or CI artifacts.

Fingerprints bind pipeline source, contract, prompts/schema, parser, transport, policies, graders, test fixtures and lockfile. Each run also records configured models. A changed fingerprint is stale. Reference compatibility never becomes measured_current. No live measurements were performed during this build.
