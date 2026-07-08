# Contract: Lesson Generator Server-Side Proxy

**Feature**: `005-library-topic-prep-cci`

## Scope

Chunks Offline must not call the external M2M lesson-generator API directly from browser code. This contract defines the internal proxy behavior expected from a trusted server-side runtime, recommended as a Supabase Edge Function.

## Internal function name

Recommended: `lesson-generator-proxy`

## Secrets

Required server-side secret:

- `CHUNKS_M2M_API_KEY`

Optional server-side config:

- `CHUNKS_M2M_BASE_URL`
- `CHUNKS_M2M_TIMEOUT_MS`

## Request shape from Library to proxy

```json
{
  "requestId": "uuid-or-payload-hash",
  "target": {
    "courseId": "course-id",
    "lessonId": "lesson-id",
    "sectionId": "section-id-or-null"
  },
  "generation": {
    "theme": "Farewell party",
    "topicLevel": 1.2,
    "sentenceLength": "Short",
    "resources": [
      {
        "name": "say goodbye politely",
        "color": "Blue",
        "ohm": 5,
        "enHint": "optional hint"
      }
    ],
    "iValue": 1,
    "uTotal": 5,
    "settings": {}
  }
}
```

## Proxy behavior

1. Validate request target and resources.
2. Add required external headers server-side:
   - `Accept: application/json`
   - `Content-Type: application/json`
   - `X-API-Key: <secret>`
   - `X-Requested-With: XMLHttpRequest`
3. Call the confirmed external generate route.
4. Apply timeout and normalize success/error responses.
5. Return only non-secret data to the browser.

## Normalized success response

```json
{
  "status": "success",
  "candidate": {
    "candidateId": "uuid-or-payload-hash",
    "courseId": "course-id",
    "lessonId": "lesson-id",
    "sectionId": "section-id-or-null",
    "engSentence": "Generated English sentence",
    "vieSentence": "Generated Vietnamese sentence",
    "resourcesUsed": [],
    "rTotal": 14,
    "iValue": 1.2,
    "uTotal": 16.8,
    "totalOhm": 16.8,
    "difficultyLabel": "Beginner",
    "generatedAt": "2026-07-08T09:32:00.000Z"
  }
}
```

## Normalized processing response

```json
{
  "status": "processing",
  "candidateId": "uuid-or-payload-hash",
  "message": "Sentence generation started. Save is disabled until a complete candidate is available."
}
```

## Normalized error response

```json
{
  "status": "error",
  "errorMessage": "Invalid resources or request body",
  "code": "BAD_REQUEST",
  "traceId": "optional-provider-trace-id"
}
```

## Validation rules

- `target.courseId` required
- `target.lessonId` required
- `generation.resources` must contain at least one resource
- each resource requires `name`, `color`, and positive numeric `ohm`
- reject requests if `CHUNKS_M2M_API_KEY` is missing
- never include API key or upstream request headers in response

## MVP exclusions

- Do not implement browser-visible API key entry.
- Do not auto-save generated candidates.
- Do not implement async webhook save until callback authentication is defined.
- Do not implement `/audio/speech` as part of this feature.
