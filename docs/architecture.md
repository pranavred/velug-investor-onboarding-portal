# Architecture

```mermaid
flowchart LR
  B[Browser: investor and admin demo] -->|PDF + fictional declaration| S[Next.js route: origin check, bounds, signed anonymous session]
  S --> Q[Shared Redis budget: global and per-session reservations]
  Q --> P[Bounded PDF text parser: 2 MiB, 10 pages, 60,000 characters]
  P --> C["Claude Opus 5.5: purpose + model-reported confidence (page text only)"]
  C -->|supported purpose| E["Claude Fable 5.1: fields, pages and quotes from the original PDF (JSON schema)"]
  C -->|unsupported, insufficient, refusal or failure| U[Unsorted: manual review]
  E --> G[Deterministic grounding: quote on cited page, declared application comparison, policy checks]
  G --> B
  U --> B
  B -->|optional explicit click, signed receipt| D["Claude Opus 5.5: select grounded source IDs; server renders the draft"]
```

One server-only `ANTHROPIC_API_KEY` authenticates every call through the official Anthropic SDK with retries disabled, a 50-second shared deadline and the endpoint pinned to `api.anthropic.com`. Models default to `claude-opus-5-5` for classification and drafts and `claude-fable-5-1` for extraction; any `claude-*` id can be configured and none is substituted automatically. Provider error bodies are never surfaced; only the HTTP status and error type reach the trace. Sample replay remains the historical GPT-4.1 run and makes no calls.

Every processed document carries a stage trace (classify, extract, check, review) with endpoint, model, latency, token usage and request id. Case decisions are deterministic code over grounded fields; confirmations are transcription review only. Browser memory holds documents and results; Redis holds only quota counters. See [deployment](deployment.md), [evaluations](evaluations.md) and [production prerequisites](production-readiness.md).
