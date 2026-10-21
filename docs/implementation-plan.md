> **Superseded on October 21, 2026.** Provider-specific steps below refer to the earlier OpenAI pipeline; the current implementation is documented in [architecture](architecture.md) and the [changelog](../CHANGELOG.md).

# Standalone Open-Source Investor Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the verified investor-onboarding demo into a separate, independently deployable open-source GitHub product using each deployer's own credentials.

**Architecture:** Create a fresh Git repository containing only the onboarding app and its dependencies. Keep the current UI/domain engine; separate OpenAI Decisions classification, GPT-5 extraction/on-demand review drafting, server configuration and shared quotas. Default to a fully working, credential-free sample mode, with explicit live processing configuration and truthful evaluation provenance.

**Tech Stack:** Next.js App Router, React, TypeScript, Node test runner, npm lockfile, unpdf, Redis, Docker and GitHub Actions. Start from inspected versions; select a supported Node LTS and exact package/container/action versions at implementation, documenting any compatibility/security upgrades. Use Vercel as the first GitHub deployment path and Docker as the portable path.

**Spec:** [Proposed design](design.md). This is a reviewable plan, not authorization to publish or change the live website.

## Global Constraints

- This new Decisions/GPT-5 pipeline is for the open-source repository only. Do not edit, redeploy or change the existing Velug web demo, its GPT-4.1 runtime or historical reports.
- Open-source application code lives in a separate repository with a fresh history. Never publish the private Velug website repository, its history, or its unfinished voice work.
- Source snapshot: website commit `c8a7b32b80291a2af2e9773f13098c89913bb3f4`. Verify the source commit before copying. The website primary checkout is older and dirty; do not extract from it.
- Sample mode requires no credentials, Redis or provider calls. CI, tests and builds make zero paid calls.
- The sole provider key is server-only `OPENAI_API_KEY`; Jev is removed from the open-source release scope. Live quotas use the deployer's own `REDIS_URL` and `APP_SESSION_SECRET`.
- Default `LIVE_AI_ENABLED=false`, `REVIEW_DRAFTS_ENABLED=false`; public live configuration fails closed without a distributed quota service.
- Preserve 2MiB,10page,12retained-PDF and4local-parser limits and cancellation/stale-response guarantees.
- Use `gpt-6-luna` for Decisions as currently documented, and the requested GPT-5 target for Responses; verify account access and GPT-5 retirement status before execution.
- Count provider dispatches, not files: normally two calls per supported PDF; one on-demand draft is a separate call. No silent classifier/model fallback.
- Maintain explicit Unknown/missing/conflict review states. Transcription confirmation never clears substantive discrepancies or accepts an investor.
- The two tabs are demo views, not separate authenticated roles. v0.1 has browser-memory state and fictional documents only.
- Preserve original model records and PDF bytes. Never relabel old metrics as measurements of changed code, prompts, models, datasets or the new Decisions/GPT-5 pipeline.
- No personal absolute paths, Velug cloud IDs, private documents, real keys or required Velug network endpoints in the distributed product.
- README/setup copy is direct; disclose paid external APIs, data destinations, ephemeral state and missing production capabilities.

## Review Focus

1. A fresh fork without secrets must build and run sample mode without network calls to a provider or Velug. Task1/2/7.
2. A clone behind a reverse proxy or preview domain must accept its configured origin and reject forged Host/forwarded-origin requests. Task2/4/6.
3. Multiple instances and fresh anonymous sessions must not bypass the global paid-call cap; Redis outage must not dispatch. Task4.
4. A provider/model/code change must visibly invalidate current evaluation status while retaining historical evidence. Task3/5.
5. Classification refusal, uncertainty, quota exhaustion between stages or failed extraction must leave partial evidence in review and retain the prior current PDF. Task4/5.

## Repository boundary and file map

All destination paths below are relative to the **new repository**, not either existing private repository. Proposed working directory: `./velug-investor-onboarding-portal`. Check it is absent before creating it; if occupied, stop rather than overwrite. No GitHub owner/name is assumed.

| Source from verified snapshot | Destination and treatment |
|---|---|
| `components/investor-onboarding/**`, `lib/investor-onboarding/**` | Keep module paths initially; isolate report imports under Task3. |
| `app/investor-onboarding-example/onboarding.css` | Move to `app/onboarding.css`; extract only needed shared tokens, button and accessibility styles from global CSS. |
| Onboarding page | New `app/page.tsx`; own metadata/header/footer. Optional redirect from old demo route to `/`. |
| `app/api/investor-onboarding/process/route.ts` | Same route, replace website-specific configuration and limiter. |
| `public/investor-onboarding/**` | Only inventoried synthetic PDFs and approved public reference reports. No blanket copy of `public/`. |
| `tests/investor-onboarding-*.test.mjs`, `tests/fixtures/onboarding-live-eleven-pages.pdf` | Copy scoped tests/fixture; rewrite website-only rendered-page assertions. |
| Onboarding generators, graders, verifiers and docs | Copy by explicit manifest. Replace one-off paid runners only after archived-evidence separation. |
| Root package/build config | New minimal package/lockfile/TS/ESLint config; no marketing-site scripts, content or redirects. |
| New modules | `lib/config/{server,public}.ts`, `lib/server/{quota,session}.ts`, `lib/server/providers/{openai-decisions,openai-responses}.ts`, `lib/investor-onboarding/processing-contract.ts`, `lib/investor-onboarding/evaluation-status.ts`. |
| New operations/docs | `.env.example`, Docker files, `.github/workflows/ci.yml`, `LICENSE`, `NOTICE` if needed, `THIRD_PARTY_NOTICES.md`, `SECURITY.md`, `CONTRIBUTING.md`, `docs/{deployment,architecture,evaluations,production-readiness}.md`. |

Do not copy `.git`, `.vercel`, `.env*`, caches, build outputs, Downloads, plans containing internal operational details, business documents, service-account JSON, analytics or unrelated website routes. An `.env.example` will be authored from scratch.

## Task 1: Extract a working app into a fresh local Git root

**Files:** create `scripts/verify-distribution.mjs`, `docs/source-manifest.json`, new root app/config/package files; copy only the manifest-listed onboarding files; create `tests/distribution-engine.test.mjs` and `tests/rendered-html.test.mjs`.

**Interfaces:** consume the exact approved source commit; produce an independent npm project with `npm run dev`, `npm run test:unit`, `npm run build`, `npm start`, `npm run lint`, `npm run typecheck`, `npm run verify:distribution`. Product root is `/`; live API remains `/api/investor-onboarding/process`.

- [ ] Inspect source status/commit and create a manifest of every copied file with source path, source hash, reason, destination and rights-review status. Initialize a fresh directory with `git init`; never copy or clone the website `.git` directory. Do not create a remote yet.
- [ ] Add a failing distribution test that checks the shipped root, absence of website pages/config, and no runtime dependency on Velug. Pin its contract with a fixture scan:

```js
test('release tree excludes private website and deployment files', () => {
  for (const path of ['app/insights', 'app/api/voice-demo', '.vercel/project.json'])
    assert.equal(existsSync(path), false, path);
  assert.equal(existsSync('app/page.tsx'), true);
  assert.equal(existsSync('docs/source-manifest.json'), true);
});
```

- [ ] Run `node --test tests/distribution-engine.test.mjs`; verify failure before extraction. Add the allowlisted modules/assets and minimal app shell. Set neutral metadata, repository links and optional upstream attribution. Remove mandatory firm sales CTA, hardcoded canonical/domain/mailto, organization JSON-LD, marketing navigation and Velug download filenames. Preserve optional tutorial, backend diagrams and sample labels. Keep compatible drag IDs/storage keys initially or migrate them together with consumers/tests.
- [ ] Vendor properly licensed font assets with their licenses or use a system-font stack; remove build-time Google font fetching. Produce a minimal lockfile with `npm install --package-lock-only`, then verify using `npm ci`. Do not copy all website dependencies.
- [ ] Run unit tests, rendered-page checks and distribution checks. Review both tabs at375,768and1280 widths; check sample upload/handoff/evidence/correction/export and tutorial. Fix actual import/style dependencies rather than importing the marketing layout wholesale.
- [ ] Commit only in the new repository: `chore: extract standalone onboarding starter`. Record the upstream commit in provenance without importing upstream history.

## Task 2: Centralize environment configuration and expose safe capabilities

**Files:** create `lib/config/server.ts`, `lib/config/public.ts`, `.env.example`, `app/api/capabilities/route.ts`, `tests/config-engine.test.mjs`; modify live route/UI, `.gitignore`, distribution verifier and evaluation runners.

**Interfaces:** `readServerConfig(env: Record<string,string|undefined>): ServerConfig` is pure and never returns credentials to the browser. `getPublicCapabilities(config: ServerConfig): PublicCapabilities` exposes only feature availability and safe setup messages. `validateRequestOrigin(request: Request, appUrl: string): boolean` compares against configured origin, never forwarded headers.

```ts
type PublicCapabilities = {
  liveUploads: boolean;
  classification: 'disabled' | 'available' | 'unavailable';
  reviewDrafts: boolean;
  setupMessage: string | null;
};
```

- [ ] Write/run failing tests for no-env sample mode, malformed URL/flags/positive integer limits, disabled live AI without a key, live enabled with missing key/Redis/signing secret, and configured preview/proxy origin behavior. Test a hostile Host/X-Forwarded-Host with an attacker Origin:403, no provider invocation. Test full public-capability serialization contains none of the sentinel key values:

```js
test('capabilities never serialize credentials', () => {
  const config = readServerConfig({OPENAI_API_KEY:'private-openai-sentinel',
    REDIS_URL:'redis://private-redis-sentinel', APP_SESSION_SECRET:'private-session-sentinel'});
  const text = JSON.stringify(getPublicCapabilities(config));
  assert.ok(!text.includes('private-openai-sentinel'));
  assert.ok(!text.includes('private-redis-sentinel'));
  assert.ok(!text.includes('private-session-sentinel'));
});
```

- [ ] Implement bounded configuration and explicit safe projection. The route constructs server config per request; pure tests do not import a server-only framework boundary. Actual server entrypoints enforce server-only usage. Expose human-readable missing-variable **names**, never values. Disabled live endpoints return503 with a setup message and never substitute sample output.
- [ ] Author `.env.example` with blank keys and these defaults; exempt only this file with `!.env.example` after `.env*` in `.gitignore`:

```dotenv
APP_NAME=Investor Onboarding
APP_URL=http://localhost:3000
LIVE_AI_ENABLED=false
OPENAI_API_KEY=
OPENAI_CLASSIFICATION_MODEL=gpt-6-luna
OPENAI_EXTRACTION_MODEL=gpt-5-2025-08-07
OPENAI_REVIEW_MODEL=gpt-5-2025-08-07
REVIEW_DRAFTS_ENABLED=false
REDIS_URL=
APP_SESSION_SECRET=
QUOTA_NAMESPACE=investor-onboarding
GLOBAL_CALLS_PER_HOUR=20
SESSION_CALLS_PER_HOUR=5
```

- [ ] Replace personal env-file loading with already-injected process environment or an explicit `--env-file=.env.local` CLI option. Do not require a developer's filesystem. Do not load any env file during build. Remove legacy key aliases from the new product and document migration from `ONBOARDING_OPENAI_API_KEY`/`ONBOARDING_LIVE_ENABLED`.
- [ ] Run configuration, origin, browser capability and build tests with all secret variables unset. Inspect emitted HTML/client JS for sentinel values in a separate fake-key build. Commit `feat: add portable server configuration`.

## Task 3: Preserve evaluation provenance without misrepresenting the new app

**Files:** create `evaluations/reference/2026-10-01/`, `evaluations/reference/2026-10-03/`, `evaluations/runs/`, `evaluations/reference/manifest.json`, `lib/investor-onboarding/evaluation-status.ts`, `scripts/{verify-reference-evaluations,run-live-evaluation}.mjs`, `tests/evaluation-provenance-engine.test.mjs`; modify report loaders/UI and copied evaluation/build scripts.

**Interfaces:** `evaluationStatus(run: {fingerprint:string; kind:'reference'|'provider'; compatibilityPassed:boolean}|null, currentFingerprint: string): 'not_run'|'compatible_replay_only'|'measured_current'|'stale'` must distinguish historical recorded calls, offline compatibility replay and a current provider run. Null means not_run; a provider run requires an exact current fingerprint to be measured_current; reference runs may show compatible_replay_only after successful offline replay but never measured_current. A mismatched provider fingerprint or failed reference compatibility is stale. Reference artifacts are immutable. New runs use unique output directories and never overwrite earlier records.

- [ ] Add/run failing tests: changed prompt/model/service/grader causes stale status; reference PDF mutation fails integrity; reference failure examples remain visible; loading reference reports cannot mark the current product measured. Also test the runner refuses an existing output directory before any provider dispatch.

```js
test('changed fingerprint cannot inherit recorded accuracy', () => {
  assert.equal(evaluationStatus({fingerprint:'old-fingerprint', kind:'provider',
    compatibilityPassed:true}, 'new-fingerprint'), 'stale');
  assert.equal(evaluationStatus({fingerprint:'old-fingerprint', kind:'reference',
    compatibilityPassed:true}, 'new-fingerprint'), 'compatible_replay_only');
  assert.equal(evaluationStatus(null, 'new-fingerprint'), 'not_run');
});
```

- [ ] Move approved original reports/raw records/expected sidecars/PDFs to immutable reference datasets. Preserve run IDs, dates, values, failures and original source/config/PDF hashes. Record upstream commit provenance. Review raw metadata for sensitive material before redistribution. Do not include private reference documents or personal absolute-path source snapshots. A historical artifact manifest validates retained artifacts; it does not claim the new source is byte-identical to the original evaluated pipeline.
- [ ] Preserve sample replay mappings and historic PDFs, updating URLs coherently. Do not regenerate old PDFs just to remove their historical Velug attribution. Newly neutralized samples are a new dataset and must not inherit the old scores.
- [ ] Separate `verify:reference`, `eval:offline`, `eval:live` and build commands. `eval:offline` runs deterministic tests and mocked recorded-response compatibility checks. `eval:live` requires `--allow-paid --max-calls=40 --out=evaluations/runs/<unique-id>`; the parser requires a concrete unused directory name, not the literal angle-bracket example. All stage attempts count against the cap; no automatic retry. Forty dispatches accommodate the17document two-stage set; a20dispatch cap supports at most10supported PDFs. Optional drafting is excluded from this run. Persist failures and prevent expected labels entering provider prompts. Default new outputs are gitignored, outside `public/`; deliberate synthetic-only publication is a separate command/review step.
- [ ] Fingerprint model, instructions/schema, parser/transport, source checks, case rules, grader, dataset, relevant dependency lockfile, classifier taxonomy and optional review-drafting configuration. Recompute current fingerprints without rewriting recorded ones. A configured model different from the recorded model shows stale/unmeasured status in UI.
- [ ] Run offline gates with networking blocked. Require a new labelled current-product evaluation before displaying a current accuracy claim. Existing17PDF and31call reports remain clearly dated historical evidence until then. Commit `feat: version evaluation provenance and runners`.

## Task 4: Replace Velug-specific quotas and isolate OpenAI transport

**Files:** create `lib/server/quota.ts`, `lib/server/session.ts`, `lib/server/providers/openai-responses.ts`, `tests/{quota,provider-config}-engine.test.mjs`; modify live service/route/backend copy and lockfile. Remove required `@vercel/firewall` dependency.

**Interfaces:** `reserveProviderDispatch({namespace, sessionHash, provider, now}, store): Promise<void>` atomically enforces global and per-session dispatch limits; classification, extraction and drafting share one global budget. `extractWithOpenAI({pdfBytes, purpose, signal, config, reserve}): Promise<ProviderExtraction>` returns purpose-specific fields and provenance using the GPT-5 Responses adapter. Task5 defines the versioned processing contract; source quotes and deterministic case rules stay conservative. Redis URL and signing material remain server-only.

- [ ] Add/run failing tests for21parallel attempts against global20 from two adapter instances, session limit5, simultaneous windows, Redis outage, and untrusted/reissued session cookies. Cookie signing prevents arbitrary identifiers; new cookies still share the global cap. Do not use untrusted forwarded IPs as a security boundary.

```js
test('two instances share one global dispatch budget', async () => {
  const store = makeAtomicQuotaStoreFixture();
  const attempts = await Promise.allSettled(Array.from({length:21}, (_,i) =>
    reserveProviderDispatch({namespace:'test', sessionHash:`s-${i}`,
      provider:'openai', now:0}, store)));
  assert.equal(attempts.filter(r=>r.status==='fulfilled').length, 20);
});
```

- [ ] Define the fixture's atomic store and test the real Redis adapter against disposable Redis as well. Use a single atomic Lua script with server time: check both counters before incrementing both; scoped namespace+window keys, TTL at window end, no partial reservation on denial. Avoid cross-slot assumptions; document a single logical Redis store for this release. A failed dispatched provider call consumes its unit; denied/invalid/cancelled work does not.
- [ ] Set signed HttpOnly/SameSite cookies, Secure on HTTPS, for anonymous demo session budgets. Session cookies grant no investor/admin permissions. Keep4slot parser admission separate and accurately labelled as local. Remove hardcoded Velug host/WAF rule and process-local production fallback.
- [ ] Extract Responses transport without weakening source-grounding/case rules. Use the requested GPT-5 snapshot after an access/retirement check. GPT-5 is documented as deprecated; if unavailable, leave live AI disabled and report the explicit model decision needed, never auto-substitute. Use model-compatible reasoning/token parameters; do not carry GPT-4.1 temperature=0 into a model that rejects that setting. Preserve structured output, no tools, safe errors, provider response/model metadata, bounded deadline and `store:false`. Mock transport tests assert headers never reach results/logs and a wrong model/refusal/schema/quote does not pass. Origin validation and parsing must occur before quota reservation/dispatch.
- [ ] Run HTTP error/limiter/concurrency tests plus original cancellation/replacement regression suite. Show quota readiness in capabilities without revealing URLs or secrets. Commit `feat: decouple provider calls and shared quotas from Velug`.

## Task 5: Implement Decisions classification and expose the staged GPT-5 workflow

**Files:** create `lib/server/providers/openai-decisions.ts`, `lib/investor-onboarding/processing-contract.ts`, `lib/investor-onboarding/review-drafts.ts`, `tests/{classification,processing-pipeline,review-drafts}-engine.test.mjs`; modify the new repo's live service/types/controller, admin UI, backend diagram, tutorial and evaluation harness.

**Interfaces:** `classifyDocument({pages,signal,config,reserve}): Promise<ClassificationResult>`; `processDocument({pdfBytes,request,dependencies}): Promise<ProcessingResult>`; `draftReview({groundedFields,issues,sourceRefs,signal,config,reserve}): Promise<ReviewDraft>`. Define their complete types in `processing-contract.ts`. Classification includes status, bounded purpose or null, provider confidence, returned model, usage and available request ID. Processing keeps independent classify/extract/check statuses, stage timings and errors. The extraction schema contains fields/page quotes and cannot overwrite classification. Drafts contain text plus source references and cannot mutate review state.

- [ ] Add/run failing tests for all eight supported purposes, unsupported/insufficient_evidence, empty text, overlong text, refusal, invalid enum/distribution, wrong model, endpoint access denied, timeout and uncertain routing. No PDF/file input may be sent to Decisions. Add cross-stage tests: failed/denied extraction retains classification as partial, same-purpose replacement waits for both stages, failed/wrong-purpose v2 retains v1, and reset discards either late stage. Verify no silent Responses classifier fallback.

```js
test('classification alone cannot supersede the current PDF', async () => {
  const state = companyCaseWithCurrentBankV1();
  const outcome = await processReplacementFixture(state, {
    classification: {status:'completed', purpose:'bank'},
    extraction: {status:'failed', error:'provider_unavailable'}
  });
  assert.equal(outcome.currentDocumentId, state.currentDocumentId);
  assert.equal(outcome.bankCheck, 'needs-review');
  assert.equal(outcome.accepted, false);
});
```

- [ ] Implement the fixtures above using the existing seeded case/controller test patterns. Add a versioned extraction contract such as `onboarding-openai-v1` without changing the historical `onboarding-live-v2` fixture records. Derive folder from classifier purpose in code. Unsupported or insufficient evidence stays Unsorted with a precise reason and does not incur an extraction call. A failed extraction exposes a retry action and stage metadata, never fake fields or a complete checklist. A valid cached classification can be reused on an explicit same-file retry only when PDF hash and classification contract/model fingerprints match; extraction retries still consume quota and do not duplicate the record.
- [ ] Build a single typed Choice question over bounded page-labelled text using `POST /v1/decisions`, `OPENAI_CLASSIFICATION_MODEL=gpt-6-luna`, and allowed purposes including unsupported/insufficient_evidence. Validate answer/model/distribution and inspect per-question refusal. Both stages use the same server-only `OPENAI_API_KEY` and their own quota reservations. Empty/scanned or overlong text routes to review before a call; no unimplemented OCR claim. Treat document instructions as untrusted evidence. Current API docs identify Decisions as beta: test actual project access only at the authorized smoke stage and surface unavailable configuration honestly.
- [ ] Use the purpose-specific GPT-5 Responses extraction adapter from Task4 on the original PDF; preserve literal values, quotes/pages and essential-field checks. A returned field inconsistent with the selected purpose remains a review issue. Use one total processing deadline below the hosting timeout, abort both stages on reset/disconnect, and retain safe partial progress if the extraction stage cannot run. Version the public result schema and update existing correction/export logic together.
- [ ] Add Fund admin processing trace: **Classify → Extract → Check → Review**. Show actual endpoint/model, stage result, duration, usage and available provider request ID. Distinguish provider confidence, source grounding and measured accuracy. Update diagrams/tutorial to explain this capability split. Sample replay remains clearly historical GPT-4.1 unless separately re-recorded; never insert invented Decisions traces into old samples.
- [ ] Implement optional **Generate review summary** / **Draft correction request** as explicit actions with `REVIEW_DRAFTS_ENABLED=false` by default. GPT-5 receives only grounded facts, deterministic issues and source references. Draft output must retain cited evidence and be visibly editable/unapproved; unsupported facts are flagged and no email/message is sent. Add mocked tests for invented names/amounts, missing citations, injected evidence, refusal, budget denial and attempted check/status changes; these must leave the actual case unchanged.
- [ ] Evaluate classification, extraction and case results separately and end to end; include ambiguous/multi-purpose inputs, classification/extraction conflicts, omission, injection and same-purpose replacement. Report confusion/false-routing, field recall/precision, quote/page correctness and false clears. Set any uncertainty threshold only after labelled evaluation, never as an assumed accuracy guarantee. Draft grounding/factuality is a separate measured capability. Record each actual model and endpoint in new run fingerprints; historical GPT-4.1 scores remain historical.
- [ ] Run all mocked/provider/schema/controller tests and offline evaluation without network access. Commit `feat: classify with Decisions and extract with GPT-5` only in the new standalone repository. Never apply this commit to the Velug website.

## Task 6: Package Vercel and Docker deployment from the new repo

**Files:** create `Dockerfile`, `.dockerignore`, `compose.yaml`, `app/api/health/route.ts`, `docs/deployment.md`, `scripts/verify-deployment.mjs`, `tests/deployment-engine.test.mjs`; modify Next config/package scripts/README.

**Interfaces:** `/api/health` reports liveness and safe capability booleans; no secret/config dumps or paid checks. Docker listens on3000 and reads runtime env. A deployment verifier consumes an explicit base URL; no hardcoded Velug URLs. Canonical/metadata use the configured public URL.

- [ ] Add/run failing deployment tests for a no-env sample build, hosted missing-live-config behavior, health redaction, configured HTTPS origin behind a proxy and incorrect-origin rejection. An offline build must not need OpenAI/Jev/font/CDN access after dependencies are installed.
- [ ] Implement Next standalone output. Use a supported pinned Node image, committed lockfile, multi-stage build, non-root runtime and explicit copying of `.next/standalone`, `.next/static` and approved `public`. Exclude env files, Git, local evaluations and caches from Docker context. No credentials in image layers or build arguments.
- [ ] Provide a Compose sample using runtime env and port3000; sample mode needs no database. For live mode document connection to a deployer-owned TLS Redis, its global namespace and budget limits. Document reverse-proxy request-size/timeouts/HTTPS/origin handling. Do not imply a process-local counter provides distributed enforcement.
- [ ] Add a Vercel deploy button for the actual new repository URL after the remote exists; allow key-free sample deployment. Document live variables and independent Redis setup, project-specific preview `APP_URL`, supported function timeout and region settings. Never carry a Velug project/org ID or assume its dashboard WAF rule exists. [Deploy button mechanics](https://vercel.com/docs/deploy-button).
- [ ] Build/run the container with no provider keys, then run `npm run verify:deployment -- http://localhost:3000`. Build once with no keys; start the same image with fake runtime secrets and verify no secret appears in image history/static assets/health/errors. GitHub/Vercel import verification follows after the private candidate remote is created in Task8. Commit `build: add independent GitHub deployment paths`.

## Task 7: Add licensing, disclosure, security and contributor gates

**Files:** create `LICENSE`, optional `NOTICE`, `THIRD_PARTY_NOTICES.md`, `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `.github/workflows/ci.yml`, issue templates, `docs/{architecture,evaluations,production-readiness}.md`; finish README and distribution verifier.

**Interfaces:** PR CI requires install, typecheck, lint, unit/workflow tests, reference integrity, offline compatibility, build, distribution/secret/dependency scans and container smoke. It receives no provider/deployment credentials. Manual paid evaluations run only on trusted code, never a fork PR.

- [ ] Confirm copyright ownership and select the license before public release. Proposed Apache-2.0 is permissive and includes an express patent grant; preserve required notices and separate trademark policy. A public GitHub repo alone is not an open-source license. [GitHub guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository), [license summary](https://choosealicense.com/licenses/apache-2.0/).
- [ ] Inventory direct/transitive dependency licenses, icons/fonts and generated fixture/document rights. Include necessary notices; exclude attached source specifications/research, internal client materials and unapproved branding. Check license compatibility before claiming Apache coverage. A future real-data production module must not silently inherit permission for private documents.
- [ ] Run a credential scanner on the allowlisted export, new Git history, built JS and container layers. Scan logs/reports for personal paths, identifiers and private uploaded evidence. Fix leaks before release; rotate any discovered real credential. A clean scan is recorded evidence, not a conclusion from `.gitignore`. Add an allowed synthetic-data manifest rather than ignoring every security finding in fixture directories.
- [ ] Implement CI with read-only repository token permissions, exact reviewed action references, no `pull_request_target` execution of contributor code, no automatic secret-bearing deployments. Add dependency updates and a documented vulnerability reporting route; no forced disclosure to a personal email. Never upload private paid-evaluation runs as artifacts.
- [ ] Rewrite README: what runs today, screenshots, fast sample setup, own-key live setup, Decisions/GPT-5 roles, cost/data flow, ephemeral state, source/guardrail/eval meanings, deployment and customization. Document that `store:false` is a request option, not a promise of zero provider retention. Do not call role tabs authorization or exports a durable audit store.
- [ ] Add a production-readiness checklist as a separate roadmap: auth/RBAC/tenant isolation, private durable storage, malware scanning, retention/deletion, durable audit events, jurisdiction-specific policy, independent identity/screening providers, approvals and monitoring. These are prerequisites for real investor use, not v0.1 completion claims. Commit `docs: prepare open-source release and contribution gates`.

## Task 8: Independently verify the clean-room release

**Files:** create `docs/releases/v0.1-verification.md`; publish only approved synthetic current evaluation artifacts if a current measurement is desired. Tag only after required gates pass.

**Interfaces:** the release record binds Git commit/tag, lockfile, container digest, public deployment URL, test outputs, reference/current evaluation status and known limitations. Do not fabricate counts or copy the old126/90 totals if extraction changes the test catalogue.

- [ ] After Tasks1–7 pass, resolve the owner/name/license decisions and create a **new private candidate GitHub repository**, push only the fresh product history, and set up deployment under its own project. Clone it into a clean directory/CI runner with no inherited env files, caches or Velug project credentials. Confirm its remote/history has no website ancestry. Run documented `npm ci`, test/typecheck/lint, reference/eval offline, build/start, distribution verification and Docker path exactly as a stranger would. Keep it private until the final publication step.
- [ ] Verify no-key sample journey, tutorial, phone/tablet/desktop, live configuration errors, role handoff, original PDF/page/quote, correction/v2 history, safe exports and refresh reset. Compare requests with expected destinations: only the configured deployment, approved provider APIs and chosen Redis; no required Velug traffic or hidden analytics.
- [ ] With explicit paid-run authorization and deployment-owner keys, perform one fresh synthetic live smoke through Vercel and one through Docker. Test missing origin/invalid file/denied quota without provider calls. Verify public upload success, real provider provenance, original evidence, pending acceptance and refresh deletion. Each supported-PDF smoke verifies both actual Decisions and GPT-5 stages, normally two dispatches. Review drafting is separately opt-in and measured only when run.
- [ ] Run a new labelled classification+extraction+case evaluation before advertising current accuracy; the17PDF dataset needs up to34normal dispatches, so use an explicit40dispatch cap, no automatic retries, immutable output and all failures retained. Optional draft quality has a separate explicitly budgeted run; do not include it automatically. Otherwise ship the truthful `not_run`/historical status; do not block useful sample deployment on model access or silently make paid calls.
- [ ] Obtain the final publication decision against the completed, reviewable candidate. Make **only the new product repository** public, verify unauthenticated clone and deploy-button operation, tag `v0.1.0`, publish accurate release notes and record exact verification evidence. Never change an existing Velug repository's visibility. Repository creation/publication is an execution-stage action, not part of this planning turn.

## Definition of done

- [ ] Independent GitHub repository and fresh history; original private repositories/site untouched.
- [ ] Anyone can clone and run sample mode with documented commands and no keys.
- [ ] Vercel import and Docker runtime work using the deployer's own configuration and quota infrastructure.
- [ ] The OpenAI key never enters browser bundles, source, images, reports, CI logs or public exports.
- [ ] Decisions classification and GPT-5 extraction/review are independently observable, evaluated and correctly attributed; partial failures never look complete.
- [ ] Runtime guards, workflow regressions, historical model results and current measured results remain separate.
- [ ] Required tests/scans/rights/license gates pass; production gaps and provider data flow are explicit.

## Execution order and unresolved owner decisions

Tasks1–4 establish the portable core;5 implements Decisions classification plus the GPT-5 pipeline trace and optional drafts;6–7 package distribution;8 verifies and publishes. Sample mode remains available if live API access is unavailable; do not secretly substitute an API/model or claim a successful live run.

Owner decisions before publication: GitHub owner/repository name; confirmed rights holder/license (Apache-2.0 proposed). Verify Decisions endpoint access and requested GPT-5 availability before live execution; a retired/unavailable GPT-5 requires an explicit replacement decision. No further decision is needed to finish this plan. Recommended next implementation approach: native sequential execution with an independent final review, because extraction, environment, provider and evaluation changes share interfaces and must be validated together.

## OpenAI references checked October 15, 2026

- [Decisions API](https://developers.openai.com/api/reference/resources/decisions/methods/create): actual classification/scoring endpoint and documented model/input contracts; account access not yet tested.
- [GPT-5 model](https://developers.openai.com/api/docs/models/gpt-5): requested Responses/structured-output target and snapshot; currently marked deprecated. This plan preserves the requested model and requires availability verification rather than silently changing it.
