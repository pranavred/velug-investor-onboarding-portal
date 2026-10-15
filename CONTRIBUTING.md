# Contributing

Use fictional data only. No keys, local env files, private research, client documents, cloud project metadata, or business website pages in commits.

Install Node 24.19.0, then `npm ci --ignore-scripts`. Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run verify:reference`, `npm run verify:distribution`, `npm run verify:licenses`, and `npm audit --audit-level=moderate`. Tests/build/CI never call a provider. `TEST_REDIS_URL` enables the real Redis integration test; otherwise it is explicitly skipped.

Preserve historical PDF/response bytes and integrity hashes. New model/prompt/parser/check/dataset changes do not inherit recorded accuracy. Keep classification, extraction, case outcomes, source matching and draft quality separate. Include regression evidence for changes to replacement, cancellation, quotas or source checks.

Contributions are licensed under Apache-2.0. Only contribute material you have permission to redistribute. Keep trademark rights separate. Releases require independent review, clean-room checks and a truthful verification record. No automatic secret-bearing deployments from pull requests.
