# Velug Investor Onboarding Portal

Self-hostable investor onboarding demo with investor/admin views, fictional PDFs, source review and document correction history.

**Development checkpoint — the standalone release is being built.** Sample replay works; the public live API is intentionally disabled until the new Decisions/GPT-5 pipeline is implemented and verified. Do not use real investor documents.

## Local development

Requires Node.js 22.13+.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

No API key is needed for recorded samples. The completed live path will use your own server-side OpenAI key: Decisions for classification and GPT-5 Responses for extraction. Real provider access has not been tested. The owner will supply env variables and test locally after the build.

```sh
npm test
npm run lint
npm run typecheck
```

See [implementation plan](docs/implementation-plan.md), [design](docs/design.md), and [handoff](docs/cloud-handoff.md). The existing Velug website is a separate private project and is unchanged.

License: Apache-2.0 for Velug-authored code; dependency notices and complete release documentation are pending the distribution audit. Historical fictional samples preserve their original attribution.
