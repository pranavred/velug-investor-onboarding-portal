# Independent deployment

## Local sample

Node 24.19.0 is the pinned CI/container version. `npm ci --ignore-scripts`, `npm run dev`, then open http://localhost:3000. No env file, Redis or API key is required. Use the fictional sample folders. Refresh or Reset demo clears documents, fields, correction requests and version history. Only tutorial dismissal is stored locally.

Set `APP_NAME` to change the visible header and browser title. This is a server runtime setting: restart the server/container after changing it; no rebuild is needed. The application name is public. Keep provider and session secrets in their separate server-only settings. Live upload controls stay disabled with setup guidance until live processing is configured; sample uploads remain available.

## Local live processing (optional, paid)

Copy `.env.example` to `.env.local` and edit it yourself. Set `APP_URL=http://localhost:3000`, `LIVE_AI_ENABLED=true`, `ANTHROPIC_API_KEY`, `REDIS_URL=redis://localhost:6379`, and a fresh `APP_SESSION_SECRET` of at least 32 random characters (`openssl rand -hex 32`). Never put secrets in NEXT_PUBLIC_ settings. Start your Redis first, then restart `npm run dev`. Sample mode stays available if live config is incomplete. Redis must be writable and reachable; a failure denies dispatch. Capabilities report configuration, not a paid connectivity check.

Start disposable local Redis with `docker run --rm -p 127.0.0.1:6379:6379 redis:7.4.2-bookworm`. Use persistence for a long-running hosted budget. All instances use one Redis store/namespace. Default quotas are global 20 and signed anonymous session 5 provider reservations per Redis-clock hour. A supported PDF normally needs TWO dispatches. Failures after dispatch consume budget. Cancellation immediately after reservation can conservatively spend a unit without dispatch; counters are never refunded. A browser can get a new anonymous session, but still shares the global cap. These are demo cost controls, not abuse-proof authentication or provider billing limits.

Before trying an upload, confirm your Anthropic account can use the configured models (defaults `claude-opus-5-5` for classification and drafts, `claude-fable-5-1` for extraction) and has credit. Any `claude-*` id can be set through `ANTHROPIC_CLASSIFICATION_MODEL`, `ANTHROPIC_EXTRACTION_MODEL` and `ANTHROPIC_REVIEW_MODEL`. There is no fallback model and no automatic retry. If a model is unavailable, refuses, or the account is exhausted, sample mode still works and the live stage trace shows the HTTP status and error type. Do not infer access from a successful install/build or capabilities response. Upload only one fictional text PDF to test both real calls locally, then inspect the Fund admin stage trace and original PDF quotes. Empty/scanned, ambiguous or overlong material needs manual review. OCR is not implemented.

Enable `REVIEW_DRAFTS_ENABLED=true` only when wanted. Each explicit summary/correction click is another dispatch. The model selects source IDs; the server renders exact source facts. Drafts remain editable/unapproved and cannot mutate case checks or send messages. A signed, session-bound, one-hour receipt binds drafts to the original extraction context. Changing a declaration does not change that receipt; reprocess evidence for a fresh context.

## Docker / Compose

`docker compose up --build` starts sample mode on port 3000. Live: put runtime variables in an untracked `.env` (Compose reads it; do not add it to source), set `REDIS_URL=redis://redis:6379`, then `docker compose --profile live up --build`. The Redis port is not published by Compose. No keys are passed as build arguments. The image runs as the node user. The server reads runtime environment. `npm run verify:deployment -- http://localhost:3000` checks sample HTTP/health and forged-origin rejection without provider calls.

Behind a reverse proxy use HTTPS, `APP_URL=https://your-exact-origin.example`, a body limit near 2.2 MB, and upstream timeout above the 50-second provider deadline plus parsing overhead. Never select the trusted origin from forwarded Host headers. Use a private or TLS authenticated Redis service; prevent eviction/reset of quota keys. This release targets one logical Redis primary, not independent regional counters. Anonymous cookies are HttpOnly, SameSite=Strict and Secure on HTTPS; they grant no user permissions.

## Vercel

[Deploy sample mode](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpranavred%2Fvelug-investor-onboarding-portal) or import this repository. No hosted deployment was requested or performed. No Velug project/account is required. Set your project's runtime env for live mode, exact production or preview APP_URL, and deployer-owned Redis. The processing route requests a 60-second function limit and shares a 50-second provider deadline. Confirm your plan supports this duration. Each preview needs its own exact origin; there is no wildcard CORS or automatic Host trust.
