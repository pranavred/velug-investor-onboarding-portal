# Server, evaluation and configuration audit

Reviewed commit: `6a45bac`, October 15, 2026. Read-only source audit. No provider calls, credentials, deployments, source edits or GitHub Actions runs.

## [EVAL-01] Grade the extraction contract rather than the service envelope — P2

- **Evidence:** `scripts/run-live-evaluation.mjs:16` passes the whole `processUpload` response to `gradeLiveDocument`. `lib/investor-onboarding/live-evaluation.ts:9` calls `validateLiveOutput`; `lib/investor-onboarding/live-contract.ts:13` requires exactly three top-level keys and line 15 requires exactly five keys per field. `lib/server/process-upload.ts:44` returns a richer envelope and `lib/server/grounding.ts:15` adds `sourceStatus` to each field.
- **Reproduction:** Grade an exact bank extraction with one correct account holder, page and literal quote: `formatValid=true`, `passed=true`. Add the service envelope fields returned by the route and run the same grader: `formatValid=false`, `passed=false`, although `classificationCorrect=true` and every value/source check remains true. This was executed locally with synthetic objects and no network calls. Actual grounded service fields also have the extra `sourceStatus` key.
- **Impact:** Every successful current-pipeline extraction is reported as a format failure by the optional paid runner. A user can pay for correct outputs and receive misleading failed grades. Individual value/source checks still provide information; this does not create false successful model results.
- **Effort:** S, including an offline process-response-to-grader regression.
- **Risk:** LOW, if the runner explicitly projects the validated extraction contract and keeps transport/runtime validation separate. Preserve immutable historical reports and bytes.
- **Confidence:** HIGH.
- **Fix sketch:** Project purpose, category and the five extraction field properties before grading, or introduce an explicitly typed service-result adapter. Cover a real-shaped successful `processUpload` result with mocked transport, plus malformed extraction fields. Do not weaken strict provider output validation globally.

## [BUG-01] Keep original confirmations until a replacement qualifies to supersede it — P2

- **Evidence:** `lib/investor-onboarding/live-state.ts:24` clears confirmations on every same-purpose completion. `lib/investor-onboarding/live-case.ts:14` requires a completed extraction, grounded essential fields, no `other` fields and the replacement link before superseding an original.
- **Reproduction:** Start with a current bank v1, its four grounded essential fields and `confirmed:{0:true}`. Add explicitly linked processing v2. Complete v2 as bank but with only the grounded account-holder field and a completed extraction trace. `currentLiveDocuments` retains both v1 and v2, while v1's `confirmed` becomes `{}` and its old confirmation moves to `confirmationHistory`. Executed through the actual reducer locally.
- **Impact:** An incomplete replacement erases active transcription review on the still-current original. The substantive discrepancy stays visible, but reviewers must redo confirmations and the history implies a supersession that did not occur.
- **Effort:** S, including reducer regressions for incomplete and ungrounded v2 results.
- **Risk:** MED, because confirmation history and replacement eligibility must remain consistent for valid v2/v3 chains.
- **Confidence:** HIGH.
- **Fix sketch:** Share the replacement eligibility predicate between current-version selection and confirmation invalidation. Only archive/clear confirmations on the documents actually superseded. Keep insufficient replacements retained for review.

## [DX-01] Wire the advertised application-name setting into presentation — P3

- **Evidence:** `.env.example:2` exposes `APP_NAME`; `lib/config/server.ts:9` parses it into `appName`. `app/layout.tsx:5` hardcodes metadata and line 6 hardcodes the visible product title. No consumer outside the config module reads `appName`; `lib/config/public.ts:1` does not expose it.
- **Reproduction:** Trace `appName`/`APP_NAME` references across app/components/lib: the only runtime read is the configuration construction. Changing the environment setting cannot affect the title or header.
- **Impact:** Self-hosters are offered a branding setting that silently does nothing.
- **Effort:** S, including a presentation-config check.
- **Risk:** LOW; expose/read only the non-secret presentation value and preserve optional upstream attribution.
- **Confidence:** HIGH.
- **Fix sketch:** Use the bounded public name in runtime layout/metadata and relevant product copy, or remove the unsupported setting and its promises until supported. Never serialize server credentials.

## Verification and scope

- Read the improve audit playbook, README, contributing/security/deployment/evaluation docs, API routes, provider transport, parser admission/deadlines, signing, Redis quota adapter, model-output grounding, reducers/controllers, grader/runner, packaging and manual-only workflow.
- Fresh `npm run test:unit`: **142 passed, 0 failed, 1 skipped**, 143 total. The skipped test is real Redis integration because no disposable Redis was configured for this audit. See `offline-tests.log`. Existing tests do not cover the two reproduced cross-module defects above.
- Fresh `npm audit --audit-level=moderate --json`: **0 vulnerabilities**. This is dependency advisory evidence, not a full security certification.
- Current report fingerprint equals the current source fingerprint: `2ff9f3cf770464057c965b9559f2fc25c2d9ca37330bf949042708296ea6774b`.
- Health endpoint returned sample mode true, liveConfigured false. Running the existing production build did not modify tracked artifacts.
- Decisions request/answer structure was checked against the [official Decisions API reference](https://developers.openai.com/api/reference/resources/decisions/methods/create). No authenticated availability or behavior check was performed.
- No evidenced new exploitable vulnerability was confirmed in the inspected server paths. This audit did not perform penetration testing, fuzzing, load testing, a fresh build/container run, cloud deployment, external screening, a new rights audit or paid model evaluation.

## Release follow-up, separate from code defects

Read-only `gh repo view` confirmed `pranavred/velug-investor-onboarding-portal` is still **PRIVATE**, default branch `build/standalone`. Public cloning and the deploy button cannot serve unauthenticated users until publication is completed. Do not describe the repository as publicly available yet. Visibility was not changed during this audit.
