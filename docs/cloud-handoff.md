# Cloud continuation checkpoint

User authorized building and publishing **pranavred/velug-investor-onboarding-portal** as a separate open-source product. They subsequently requested moving this ongoing run to cloud. Continue the same work autonomously; do not ask again about building or publishing this new repository. Keep it private until complete/reviewed, then publish it as requested. Never modify or deploy the existing Velug website. Never request or copy existing local API credentials. User will add env variables and test real calls locally when done.

## Completed so far

- Fresh Git root and independent history; onboarding-only extraction from upstream c8a7b32b80291a2af2e9773f13098c89913bb3f4. docs/source-manifest.json records 106 allowlisted source files/hashes. No private website history, env or deployment metadata copied.
- Standalone root/layout/styles with system fonts and repository link; package name and deployment-independent Next standalone config.
- Sample/domain code and synthetic PDF fixtures/reference AI records copied. Existing tests retained. Task1 distribution RED then GREEN; full npm test passed (unit/regression/build/rendered root).
- Server configuration/capabilities and .env.example added. Config tests RED four failures, then GREEN5/5. Live origin checks use APP_URL; settings fail closed and public capabilities redact credentials.
- Live API route is an intentional503 setup stub at this checkpoint. New provider pipeline has NOT been implemented. Old lib/investor-onboarding/live-service.ts still contains the historical GPT-4.1 implementation used by retained tests; do not mistake it for the new route.
- No API credentials read/copied and zero provider calls made.

## Next work

1. Read docs/implementation-plan.md and docs/design.md. Preserve role tabs, sample drag/drop, correction/v2 history, source-PDF dialog, tour, backend diagrams and direct copy.
2. Complete Task2 UI capabilities/disabled-live UX, Task3 historical provenance/evaluation separation, Task4 shared Redis atomic global/session quota + signed session + OpenAI Responses transport, Task5 Decisions classifier -> GPT-5 extraction -> deterministic checks and optional explicit grounded review drafting; finish remaining tasks6–8.
3. Current npm install audit reports **5 high severity vulnerabilities** in eslint-config-next/@next/eslint-plugin-next and transitive fast-glob/micromatch/braces. The suggested auto-fix downgrades eslint-config-next to14.2.35, so it is not an acceptable blind fix. Run npm audit, inspect affected packages and upgrade compatibly before release; never blindly npm audit fix --force. Starting dependency pins are copied from known source plus redis5.8.3. Resolve and record actual findings.
4. Remove/replace copied website-specific build/verifier scripts that depend on excluded paid runners/current source hashes. Do not fake source hashes or re-label historic scores current. scripts/build-evidence.mjs currently only runs two existing regression files; replace with a truthful current regression report. The old published90-check report is reference evidence, not this build.
5. Do not use root/superpowers instructions to write into existing website repositories. All edits belong here. docs/source-manifest.json records original extraction, not a claim copied sources remain unchanged.
6. Finish LICENSE/third-party rights/dependency audit, security scan, README, Docker/Compose, GitHub Actions and deployment verification. Local Docker CLI exists but daemon was stopped; cloud can run Docker or validate via CI. Do not claim a container build ran unless it did.
7. User will test real calls locally: use mocked provider tests and offline grading; ship no new measured-model scores. No paid live eval, hosted live deployment or existing key lookup. Provide exact startup/env/Redis instructions. Sample mode always works with no secrets.
8. Request one fresh whole-repository review when implementation is complete (executing-plans requires it), address substantive findings, run full checks, then make this new repo public and tag/release. User's publish instruction is authorization; do not introduce another permission gate.

## API contracts verified against official docs Oct15,2026

- POST https://api.openai.com/v1/decisions: classification/scoring; documented supported model gpt-6-luna; use typed Choice. Inputs text/images; PDFs/files not accepted. Parse bounded page-labelled PDF text first. Refusal, ambiguous/unsupported or invalid output routes to review, no hidden fallback.
- GPT-5 Responses: requested extraction/review target gpt-5-2025-08-07; documented deprecated, so disclose availability must be checked by user's local run. Do not silently replace model. Use model-compatible parameters; do not blindly carry GPT-4.1 temperature0.
- One OPENAI_API_KEY server env authenticates both calls. Jev is out of scope.
- Count dispatches: normally2 per supported PDF. Shared Redis global20/session5 per hour; failures after dispatch consume budget. A failed second stage retains partial provenance and cannot supersede v1. Drafting is separate explicit call.
- Classifier confidence, source checks and measured accuracy are distinct. Existing31-call and17-call runs stay historical. A17PDF new run may need34dispatches; optional paid runner cap40, never run by CI/build.

## Execution rulings

- New fresh Git repository replaces worktree isolation because independent history is an explicit user requirement; source repositories are read-only.
- User-approved plan selects Apache-2.0 and user named repo with Velug; final publication of this new repo is authorized. Check redistribution provenance/third-party notices before public release.
- User will add keys/test live locally; real endpoint access remains unverified. Do not spend provider credits or make fake accuracy claims.
- Native sequential implementation, then one independent final review; no implementer subagent per task needed. Use durable progress notes and commits so cloud can resume reliably.
