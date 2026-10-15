# Velug Investor Onboarding Portal

A self-hostable, open-source **fictional-data demo/starter** for document intake and evidence review. Investor/admin demo tabs, sample folder drag/drop, original PDF/page/quote inspection, editable declarations, correction requests, explicit v2 replacement history, optional tutorial, backend diagrams and scoped evaluation evidence are included.

**Try samples without keys.** Node 24.19.0:

```bash
git clone https://github.com/pranavred/velug-investor-onboarding-portal.git
cd velug-investor-onboarding-portal
npm ci --ignore-scripts
npm run dev
```

Open http://localhost:3000. Select Sample application, upload the fictional folder, switch to Fund admin and inspect a source. Request a bank correction, upload the requested v2 and compare history. Refresh or Reset demo clears the browser-memory workspace. Tutorial dismissal alone persists locally.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpranavred%2Fvelug-investor-onboarding-portal)

## Optional live AI

Bring your own **server-only** OpenAI key, shared Redis and fresh session-signing secret. Follow [local/runtime setup](docs/deployment.md), including your own model availability check. This build made **zero provider calls**.

1. OpenAI Decisions (`gpt-6-luna`) classifies bounded page-labelled text, never PDF input.
2. A supported PDF normally uses a second dispatch to GPT-5 Responses (`gpt-5-2025-08-07`) to extract fields from the original PDF.
3. Deterministic checks validate schema/purpose, page quotes and declared case comparisons. Missing, unmatched or contradictory evidence remains for review. Classification alone cannot replace v1.
4. Optional explicit summary/correction drafts use a separate dispatch, are disabled by default and render source-grounded facts selected by the model. They never send messages or change checks.

The requested GPT-5 snapshot was documented as **deprecated**. Check your own account before live use. It is never silently substituted. Endpoint/model failure leaves sample replay usable and live work partial/error. The actual endpoint, model, timings, usage and available request IDs appear in the stage trace.

**Current model evaluation: `not_run`.** The 31-call/17-call GPT-4.1 records are historical reference measurements only. Quote matches are source checks, not accuracy, authenticity or external verification. [Evaluation methods and explicit private paid runner](docs/evaluations.md).

## Boundaries

- Fictional documents only. Role tabs are a demo switch, **not authentication**.
- No investor acceptance, identity authenticity, sanctions/PEP/AML, tax approval or bank-control verification.
- Browser-memory data, no durable document store or audit database. Exports are review snapshots.
- OpenAI receives classification text and extraction PDFs. `store:false` is a request option, not a zero-retention guarantee. No data/API proxy goes through Velug.
- Default shared budget: 20 global / 5 anonymous-session reservations per Redis-clock hour. Normally two per supported PDF. Redis failure denies dispatch. Four local parser slots and 12 retained browser PDFs are separate controls. Limits: 2 MiB, 10 pages, 60,000 parsed characters; text PDFs only, no OCR.

## Verify and deploy

```bash
npm test
npm run lint
npm run typecheck
npm run verify:reference
npm run verify:distribution
npm run verify:licenses
npm audit --audit-level=moderate
docker compose up --build
```

CI uses no provider secrets, runs disposable Redis integration and container sample smoke. If TEST_REDIS_URL is absent, that integration check is reported as skipped. Docker/Compose and Vercel import use your own infrastructure; no hosted live deployment is required. [Release verification](docs/releases/v0.1-verification.md) states actual evidence and limitations.

See [architecture](docs/architecture.md), [deployment](docs/deployment.md), [production prerequisites](docs/production-readiness.md), [security](SECURITY.md), [contributing](CONTRIBUTING.md), [Apache-2.0](LICENSE) and [dependency notices](THIRD_PARTY_NOTICES.md). Code and fictional fixtures are independently extracted; the existing Velug business website and its history are not included.
