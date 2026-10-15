# Independent deployment

## Local sample

Node 24.19.0 is the pinned CI/container version. `npm ci --ignore-scripts`, `npm run dev`, then open http://localhost:3000. No env file, Redis or API key is required. Use the fictional sample folders. Refresh or Reset demo clears documents, fields, correction requests and version history. Only tutorial dismissal is stored locally.

## Local live processing (optional, paid)

Copy `.env.example` to `.env.local` and edit it yourself. Set `APP_URL=http://localhost:3000`, `LIVE_AI_ENABLED=true`, `OPENAI_API_KEY`, `REDIS_URL=redis://localhost:6379`, and a fresh `APP_SESSION_SECRET` of at least 32 random characters (`openssl rand -hex 32`). Never put secrets in NEXT_PUBLIC_ settings. Start your Redis first, then restart `npm run dev`. Sample mode stays available if live config is incomplete. Redis must be writable and reachable; a failure denies dispatch. Capabilities report configuration, not a paid connectivity check.

Start disposable local Redis with `docker run --rm -p 127.0.0.1:6379:6379 redis:7.4.2-bookworm`. Use persistence for a long-running hosted budget. All instances use one Redis store/namespace. Default quotas are global 20 and signed anonymous session 5 provider reservations per Redis-clock hour. A supported PDF normally needs TWO dispatches. Failures after dispatch consume budget. Cancellation immediately after reservation can conservatively spend a unit without dispatch; counters are never refunded. A browser can get a new anonymous session, but still shares the global cap. These are demo cost controls, not abuse-proof authentication or provider billing limits.

Before trying an upload, check your OpenAI project's access to both Decisions `gpt-6-luna` and Responses `gpt-5-2025-08-07` in your own account. The GPT-5 snapshot was documented as deprecated on October 15, 2026. This build did not test availability or spend credits. There is no fallback. If the requested snapshot/endpoint is unavailable, sample mode still works and live stages show an error. Do not infer access from a successful install/build or capabilities response. Upload only one fictional text PDF to test both real calls locally, then inspect the Fund admin stage trace and original PDF quotes. Empty/scanned, ambiguous or overlong material needs manual review. OCR is not implemented.

Enable `REVIEW_DRAFTS_ENABLED=true` only when wanted. Each explicit summary/correction click is another dispatch. The model selects source IDs; the server renders exact source facts. Drafts remain editable/unapproved and cannot mutate case checks or send messages. A signed, session-bound, one-hour receipt binds drafts to the original extraction context. Changing a declaration does not change that receipt; reprocess evidence for a fresh context.

## Docker / Compose

`docker compose up --build` starts sample mode on port 3000. Live: put runtime variables in an untracked `.env` (Compose reads it; do not add it to source), set `REDIS_URL=redis://redis:6379`, then `docker compose --profile live up --build`. The Redis port is not published by Compose. No keys are passed as build arguments. The image runs as the node user. The server reads runtime environment. `npm run verify:deployment -- http://localhost:3000` checks sample HTTP/health and forged-origin rejection without provider calls.

Behind a reverse proxy use HTTPS, `APP_URL=https://your-exact-origin.example`, a body limit near 2.2 MB, and upstream timeout above the 50-second provider deadline plus parsing overhead. Never select the trusted origin from forwarded Host headers. Use a private or TLS authenticated Redis service; prevent eviction/reset of quota keys. This release targets one logical Redis primary, not independent regional counters. Anonymous cookies are HttpOnly, SameSite=Strict and Secure on HTTPS; they grant no user permissions.

## Vercel

[Deploy sample mode](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpranavred%2Fvelug-investor-onboarding-portal) or import this repository. No hosted deployment was requested or performed. No Velug project/account is required. Set your project's runtime env for live mode, exact production or preview APP_URL, and deployer-owned Redis. The processing route requests a 60-second function limit and shares a 50-second provider deadline. Confirm your plan supports this duration. Each preview needs its own exact origin; there is no wildcard CORS or automatic Host trust.
