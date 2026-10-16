# Audit index

Audit target: standalone `velug-investor-onboarding-portal`, commit `6a45bac`, October 15, 2026. The private Velug business website was not changed or audited here.

Status: all five findings fixed following the user’s approval. See the [fix and verification record](../docs/releases/2026-10-15-audit-fixes.md). The original audit reports remain unchanged as historical evidence.

| Priority | Finding | Category | Impact | Effort | Fix risk | Evidence at audit | Status |
|---|---|---|---|---|---|---|---|
| 1 / P2 | EVAL-01: Adapt service results before extraction grading | Correctness / evaluations | Valid paid outputs become format failures | S | Low | `scripts/run-live-evaluation.mjs:16` | Fixed |
| 2 / P2 | UX-01: Gate sample-mode dummy upload on live capability and show local feedback | Correctness / UX | Default configuration accepts file selection then silently does nothing at intake | S | Low | `components/investor-onboarding/onboarding-demo.tsx:32`, `:123`; `investor-portal.tsx:75` | Fixed |
| 3 / P2 | BUG-01: Preserve confirmations on an original retained after insufficient v2 | Correctness / version history | Still-current original loses active transcription confirmations | S | Medium | `lib/investor-onboarding/live-state.ts:24`; `live-case.ts:14` | Fixed |
| 4 / P3 | DX-01: Implement or remove the advertised APP_NAME setting | Configuration / DX | Self-hosted branding setting silently has no effect | S | Low | `.env.example:2`; `lib/config/server.ts:9`; `app/layout.tsx:5` | Fixed |
| 5 / P3 | UX-02: Reuse readable purpose labels in the live checklist | UX / copy | Live mode exposes raw IDs while readable labels already exist | S | Low | `components/investor-onboarding/live-investor.tsx:16`; `lib/investor-onboarding/live-case.ts:6` | Fixed |

Details and verification: [server/evaluation findings](audit-2026-10-15/root-findings.md), [independent browser audit](audit-2026-10-15/agent-audit.md), [offline test output](audit-2026-10-15/offline-tests.log). Screenshots are under `audit-2026-10-15/screenshots/`.

The fixes included regression-first verification for: real-shaped process-response grading; disabled-live file selection; incomplete/ungrounded replacement confirmation retention; presentation configuration. The evaluation adapter is corrected; no paid run was performed. Preserve historical reports, immutable fixtures and the existing business website throughout.

## Release follow-up

GitHub visibility remains **PRIVATE**, verified read-only with `gh repo view`. Public cloning and unauthenticated Deploy with Vercel cannot work until the repository is published. This is separate from application defects. No visibility change, commit, push, deployment, API call or GitHub Actions run was performed in this audit.

## Considered and rejected

- Investor/admin tabs are intentionally a demo switch, not authentication. Missing production RBAC, tenant isolation, storage and external screening are documented starter boundaries, not new bugs.
- Refresh/reset clears browser-memory documents by explicit user instruction. Scenario changes also deliberately reset the workspace.
- Historical GPT-4.1 replay and current Decisions/GPT-5 `not_run` are correctly separate. An offline pass is not fresh model accuracy.
- Requested GPT-5 availability is unverified and its deprecated status is disclosed. Account-specific failure was not demonstrated and is not reported as a confirmed defect.
- The complex sample intentionally lacks intermediate ownership evidence and has no supplied correction fixture. Keeping that issue open is correct.
- Previewing sample originals and exposing supplied fixtures is intentional for an educational demo, not a data-isolation vulnerability.
- A `next start` warning with standalone output was observed, but the server actually served the UI and health endpoint. Do not report it as a broken local launch without stronger evidence.
- Browser locator/download-event timeouts during automation are not app failures unless the underlying user action fails independently.

## Scope and limits

Correctness and security received detailed source review; performance, tests, architecture, dependencies, tooling, docs and grounded direction received a hotspot review. One fresh independent agent exercised the browser while the primary agent reviewed complementary server/evaluation paths and vetted findings. No exhaustive claim is made about all possible defects.

Fresh offline suite: 142 passed, 0 failed, one real-Redis check skipped. Advisory audit: zero known dependency vulnerabilities. No new paid model execution, load/fuzz/penetration test, clean install/build/container deployment or fresh rights audit was performed. The previous full local verification remains separately documented in `docs/releases/2026-10-15-local-verification.md`.
