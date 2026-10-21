> **Historical checkpoint.** Written before the October 21, 2026 move to Claude; provider details below are outdated.

# Cloud continuation checkpoint

All work is scoped to **pranavred/velug-investor-onboarding-portal**, branch `build/standalone`. The existing Velug website must remain untouched. The user authorized publication of only this new repo after verification. Do not create another repository or ask for authorization again.

## Implemented

- Standalone Next application with independent history, fictional PDF samples, role tabs, folders/drag-drop, source PDF/page/quote inspection, correction/v2 history, tutorial, diagrams and ephemeral reset.
- Bounded PDF text intake → OpenAI Decisions `gpt-6-luna` classification → purpose-specific GPT-5 Responses extraction (`gpt-5-2025-08-07`) → conservative deterministic source/case checks, with visible stage traces. Partial/failed extraction cannot supersede current evidence.
- Server-only configuration, exact-origin validation, signed anonymous sessions, atomic shared Redis budgets, cancellation/deadlines and four local parser slots. No process-local quota fallback.
- Optional explicit grounded review/correction drafts, disabled by default, using signed extraction receipts. No messages sent or review-state mutations.
- Separate historical GPT-4.1 references, current offline regressions and new-model `not_run` status. No historical accuracy scores applied to changed code.
- Docker/Compose, health/deployment verifier, Apache-2.0 and dependency notices, security/contribution docs, README and independent Vercel instructions.
- Dependency audit reports zero vulnerabilities after compatible dependency changes. No blind downgrade or advisory suppression.
- Follow-up transport hardening bounds provider bodies while streaming, aborts stalled reads and cancels non-OK response bodies; mocked regression tests cover these paths.

## Authorization and execution constraints

No local API credentials may be read/copied and no paid provider calls may be made. The user will add environment variables and verify real API/model access locally. Preserve the requested GPT-5 snapshot; it is documented deprecated and must never be silently substituted. Jev is out of scope. No real investor data, authentication, verification or acceptance claims.

GitHub Actions minutes are exhausted: **do not trigger Actions**. The workflow is manual-only (`workflow_dispatch`). Run available checks in the cloud task. GitHub integration can read/write source, but this connection does not expose repository visibility or tag/release creation operations; shell Git has no credentials. Do not retrieve credentials to bypass this limitation.

## Remaining release gates

See `docs/releases/v0.1-verification.md` for actual evidence. Docker and Redis executables are absent in this cloud runtime; their integration gates must not be claimed as executed. Public visibility, `v0.1.0` tag/release, unauthenticated clone and deploy-button import remain blocked by unavailable publication capabilities and unexecuted container/Redis checks. Keep the repository private until those gates are satisfied. No hosted live deployment is requested.

Use the current branch head rather than the original faba68b checkpoint. Before any remote write, re-read the branch head and preserve intervening changes. Final independent code review was required and performed; follow-up changes receive a fresh read-only review. No provider/model accuracy measurement has been run.
