# API Docs Review: Lesson Generator M2M Integration

**Reviewed**: 2026-07-08 16:43 GMT+7  
**Markdown source**: `C:\Users\gensh\OneDrive\Máy tính\LUCY\PROJECT-WORKPLACE\CHUNKS\lesson-generator-v2\API_DOCS_M2M.md`  
**OpenAPI source**: `C:\Users\gensh\OneDrive\Máy tính\LUCY\PROJECT-WORKPLACE\CHUNKS\lesson-generator-v2\docs\openapi.yaml`

## Executive assessment

The docs are useful enough for a controlled integration, but they are not production-ready as-is. The main implementation risks are: secret exposure in markdown examples, endpoint/server mismatch between the Markdown and OpenAPI, inconsistent auth expectations, and incomplete async/idempotency contract details. Chunks Offline should integrate through a server-side trusted runtime, preferably a Supabase Edge Function, and should verify the concrete deployed endpoint before building UI around it.

## What is clear and usable

- `POST /api/generate-sentence` accepts `resources[]`, optional `theme`, `topicLevel`, `sentenceLength`, `rTotal`, `iValue`, `uTotal`, optional `settings`, and optional `webhookUrl`.
- Successful generation returns `engSentence`, `vieSentence`, `resourcesUsed`, `rTotal`, `iValue`, `uTotal`, `totalOhm`, `difficultyLabel`, and `generatedAt`.
- Async generation can return `status: processing` and later post a webhook payload.
- `POST /api/analyze-ohm` in Markdown analyzes an existing transcript and returns semantic chunks plus `totalOhm`.
- Required browser-bypass headers in Markdown are explicit: `Accept: application/json`, `Content-Type: application/json`, `X-API-Key`, and `X-Requested-With: XMLHttpRequest`.
- Timeout expectations are documented: AI generation/analysis may take 5-30 seconds.

## Blocking issues to resolve before implementation

| Area | Finding | Impact | Required action |
|---|---|---|---|
| Secret hygiene | Markdown includes a literal `X-API-Key` value. | Must not be committed or shipped in browser code; likely needs rotation if real. | Store key only in server-side secret config; consider rotating before production. |
| Server URL | Markdown uses Shared App URL `https://ais-pre-...run.app`; OpenAPI lists `https://api.chunks-app.ai/v1` and staging. | Wrong base URL can cause 404/302 or cookie challenge. | Confirm authoritative runtime URL and environment before coding. |
| Health endpoint | Markdown says `GET /api/ping`; OpenAPI says `GET /health`. | Health check task can validate wrong path. | Contract-check both, then choose canonical. |
| Analysis endpoint | Markdown says `POST /api/analyze-ohm`; OpenAPI says `POST /analysis/linguistic`. | Integration can wire the wrong route. | Confirm which route is actually deployed; document a compatibility adapter if both exist. |
| Auth model | Markdown only uses `X-API-Key`; OpenAPI includes Bearer JWT and fallback API key for some endpoints. | Inconsistent security expectations. | Use API key for generate-sentence unless provider confirms Bearer requirement. |
| Idempotency | OpenAPI defines `IdempotencyKey`, but generate-sentence path does not require or document it; Markdown tells clients to manage idempotency themselves. | Retry after timeout can duplicate generated resources. | Chunks Offline should generate client-side request IDs and server-side dedupe saved candidates/resources. |
| Async callback | Markdown supports `webhookUrl`, but callback auth/signature is not specified. | Webhook spoofing risk if used. | Prefer synchronous/polling for MVP, or require signed webhook secret before async save. |
| Response schemas | Error response examples differ (`error` only vs `code/message/trace_id`). | UI error handling may miss fields. | Normalize errors in server-side proxy. |
| OpenAPI coverage | OpenAPI includes `/audio/speech` not documented in Markdown. | Out of scope for Library topic prep unless future TTS integration uses it. | Do not implement audio endpoint in this feature unless separately requested. |

## Recommended Chunks Offline integration path

1. **Do not call M2M API from frontend**. Implement a Supabase Edge Function such as `lesson-generator-proxy`.
2. **Store API key in Supabase secrets**; never put it in `src/`, `.env.local` committed files, or browser-visible config.
3. **Add a contract verification task** that checks live availability of:
   - `GET /api/ping` and/or `GET /health`
   - `POST /api/generate-sentence`
   - optionally `POST /api/analyze-ohm` and/or `POST /analysis/linguistic`
4. **Normalize all responses** from the proxy into one internal shape:
   - `status: success | processing | error`
   - `candidateId`
   - `engSentence`, `vieSentence`, `totalOhm`, `resourcesUsed`, `difficultyLabel`
   - `errorMessage`, `traceId` when failures occur
5. **Keep generated output as a review candidate first**. Only write to `sentence_resources` after Lucy/admin explicitly saves as draft/approved.
6. **Use deterministic idempotency keys** for retries based on selected course/lesson/section + payload hash.
7. **Set a 35-45 second timeout** for synchronous generation and show retry/processing state when exceeded.
8. **Record rollback path** for any Edge Function deployment and any generated-resource data migration.

## MVP recommendation

For first implementation, support only `POST /api/generate-sentence` through a server-side proxy and synchronous `success` responses. Defer async webhook save, Ohm transcript analysis, and audio/speech endpoints until the API provider confirms canonical routes and webhook authentication.

## Implementation notes — 2026-07-08 17:00 GMT+7

- Added a browser-safe client helper at `src/lib/lessonGeneratorClient.ts` that invokes only Supabase Edge Function `lesson-generator-proxy`.
- Added Edge Function scaffold at `supabase/functions/lesson-generator-proxy/index.ts`; it reads `CHUNKS_M2M_API_KEY` from server-side secrets and never returns upstream headers or the key to the browser.
- Searched implementation source/docs for the literal external M2M key string and found no matches.
- Lucy confirmed the canonical API base on 2026-07-08 17:13 GMT+7: `https://chunks-generator-gu5ft5gagq-uw.a.run.app`.
- Lucy confirmed generate endpoint: `https://chunks-generator-gu5ft5gagq-uw.a.run.app/api/generate-sentence`.
- Smoke test on 2026-07-08 17:15 GMT+7: `GET /api/ping` returned `200` with JSON `{status: "ok"...}`.
- Smoke test on 2026-07-08 17:16 GMT+7: `POST /api/generate-sentence` to the confirmed endpoint returned `200` with `status: "success"`, `engSentence`, `vieSentence`, `resourcesUsed`, `rTotal`, `uTotal`, and `totalOhm`.
- `GET /health` returned the web app shell HTML, so `/api/ping` is the canonical health endpoint for this Cloud Run service.
- The proxy now treats `CHUNKS_M2M_API_KEY` as optional because the confirmed Cloud Run endpoint currently accepts the tested M2M request without a key; if a key is configured server-side, the proxy will include `X-API-Key`.
