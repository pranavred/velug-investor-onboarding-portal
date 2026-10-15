# Local verification — October 15, 2026

Verified the standalone candidate from `aba72de` locally. The existing Velug website was not edited or deployed. GitHub Actions was not used. No actual OpenAI requests or real credentials were used.

## Fresh checks

- `npm ci --ignore-scripts`: successful from the lockfile.
- `TEST_REDIS_URL=redis://127.0.0.1:6388 npm test`: 143/143 offline tests passed, zero skipped, including the real Redis atomic adapter; production build and the separate rendered-root test passed.
- Lint, TypeScript, 52 immutable reference-artifact checks, distribution/client-bundle scan and dependency-license checks passed. `npm audit --audit-level=moderate`: zero vulnerabilities.
- Production HTTP smoke passed on the host and inside Docker: sample HTML, health and forged-origin rejection. CSS assets loaded and the served original PDF hash matched the fixture. Live AI was disabled and clearly reported as such.
- Docker image built successfully with Node24.19.0. Runtime user is UID1000, health is healthy, and required license/notice texts are present. Runtime fake credential sentinels were absent from HTML/capabilities and image history. Image digest: `sha256:441a782718f8255b6612e816cb2ed8225566dc62affa61f6b51a370be304e112`.
- Compose profile started portal and its own Redis using a temporary test project/port override. Sample HTTP smoke passed. The compiled Docker upload route was invoked with real shared Redis and in-process mocked Decisions/Responses transports: two dispatches, successful classification/extraction and all four expected bank-fixture values grounded to the PDF. No external provider networking occurred.
- The first optional diagnostic tried importing a bare Redis package in the slim runtime; Next bundles this dependency into its server chunks, so that probe was inapplicable. The compiled-route check above exercised the actual packaged Redis path successfully. Its initial field-count assertion also expected five fields from another sample; the selected held-out fixture declares four, which was checked against its original expected labels before the successful rerun. Neither required a production source change.

## Browser verification

Chrome on the production build:

1. Sample package upload, role handoff and correct initial bank-name discrepancy.
2. Original bank PDF rendered alongside the extracted quote and cited page.
3. Correction request appeared in Investor portal; supplied v2 resolved the mismatch while retaining v1. Seven case checks passed, external verification remained pending.
4. JSON export downloaded and independently parsed: nine retained document versions, seven passing case checks, no remaining sample issue, all external provider checks pending.
5. Phone375 and tablet768 widths had no page overflow. The phone evidence dialog fit335px inside375px. All five tutorial steps remained reachable at375x700; closing restored the workspace.
6. Refresh restored the original Sample application; Your live application showed0/8 and no retained files. Without API configuration, the upload control is disabled and setup guidance is visible.

The transient test Docker/Compose containers, test volume/network and disposable Redis are cleaned up. A host preview is left available on localhost3118 in sample mode for the owner. Temporary screenshots are local verification artifacts, not investor data or current model evaluations.

## Deliberate limits

Real Decisions/GPT-5 access, model accuracy and paid drafts remain untested. The owner will supply their own environment variables and test real calls locally. Current model evaluation remains `not_run`; historical GPT-4.1 results are not relabelled. No public visibility/tag change or hosted Vercel deployment was part of this local verification.
