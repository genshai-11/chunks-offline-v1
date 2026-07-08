# Quickstart Validation: Library Topic Prep and Section CCI Assignment

**Feature**: `005-library-topic-prep-cci`  
**Date**: 2026-07-08 16:43 GMT+7

## Local validation commands

```bash
npx tsc --noEmit
npm run build
npm run lint
```

If local lint hits the known wrapper issue (`ESLint output (JSON parse failed: EOF while parsing a value at line 1 column 0)`), document it and rely on TypeScript/build locally plus GitHub CI for lint.

## Prerequisites

- Live Supabase project `ftfxekdxeoxizoyxuqoz` is configured with browser-safe publishable credentials.
- Operator is using a non-production test course/topic or a safe test scope.
- If generation proxy is implemented, server-side secret `CHUNKS_M2M_API_KEY` is configured in the trusted runtime, not in frontend code.
- If section CCI migration is implemented, generated DB/domain types are updated before validation.

## Scenario 1: Course / lesson / section CRUD in Library

1. Open `/library`.
2. Create a draft course named `QA Course YYYYMMDD-HHMM`.
3. Select the course and create a lesson/topic named `QA Topic 01`.
4. Add two sections/parts named `Part 1` and `Part 2` with distinct order indexes.
5. Edit the lesson/topic title and one section title.
6. Refresh the browser.
7. Confirm the course, lesson/topic, and sections persist from live data.
8. Archive the QA records or delete only if dependency-free and explicitly confirmed.

Expected: Curriculum hierarchy CRUD works from Library with live records and no mock/sandbox fallback.

## Scenario 2: Add lesson content into selected lesson/section

1. Open `/library` and select a test course/topic/section.
2. Click Create Sentence.
3. Enter sentence code, prompt, EN text, VI text, CVR value, approval status, and target section.
4. Save the resource.
5. Refresh and confirm the resource remains assigned to the selected lesson/section.

Expected: Sentence resource creation remains functional and uses the selected hierarchy target.

## Scenario 3: Full Topic Prep readiness

1. Select an existing EREL topic/lesson with multiple sections/parts.
2. Open Topic Prep.
3. Confirm the lesson-level summary shows:
   - number of sections/parts
   - total resources
   - approved/draft/archived resource counts
   - missing EN audio count
   - missing VI audio count
   - ready/not-ready status
4. Review each section/part row for:
   - resource counts
   - CVR min/max
   - default CCI status
   - blocking/warning reasons
5. Change a section/resource status in a safe test scope and confirm readiness recalculates after refresh.

Expected: Teachers can identify whether a full topic is ready before launching class.

## Scenario 4: Section Topic default CCI assignment

1. In Library Topic Prep, assign CCI Card A to `Part 1` and CCI Card B to `Part 2`.
2. Launch a live room scoped to the test lesson/topic.
3. Open a sentence from `Part 1`.
4. Confirm the teacher UI shows resolved CCI source `Section default` and CCI Card A.
5. Submit/close the round.
6. Open a sentence from `Part 2`.
7. Confirm `room_rounds.cci_standard_card_id` and `cci_standard_x` snapshot CCI Card B.
8. Change `Part 2` default CCI after the round exists.
9. Confirm historical reports/round rows still show the original snapshot.

Expected: Live-room CCI resolves by section default and historical snapshots remain stable.

## Scenario 5: Manual teacher CCI override

1. Select a resource whose section has default CCI Card A.
2. In teacher live-room controls, choose manual override CCI Card C for the next round.
3. Open the round.
4. Confirm the round snapshots CCI Card C and teacher UI labels source as `Manual override`.
5. Open the next round without manual override.
6. Confirm the section default is used again.

Expected: Manual override applies only to the intended round.

## Scenario 6: Lesson-generator proxy generation

1. Confirm browser source and built files do not contain `CHUNKS_M2M_API_KEY` or a literal M2M key.
2. Open Library and select a safe test course/topic/section.
3. Open Generate Candidate.
4. Enter generation resources, theme, topic level, and sentence length.
5. Submit the request.
6. Confirm browser network calls only hit the trusted proxy/Edge Function, not the external M2M endpoint directly.
7. Review generated EN/VI/Ohm/resource metadata.
8. Save as draft.
9. Refresh Library and confirm the sentence resource exists with draft status.

Expected: Generated content is reviewed before save and secret material is never exposed to browser code.

## Scenario 7: API contract mismatch validation

Before wiring production generation, verify the concrete endpoints:

- `GET /api/ping` vs `GET /health`
- `POST /api/generate-sentence`
- `POST /api/analyze-ohm` vs `POST /analysis/linguistic` if analysis is later requested

Expected: Implementation documents the canonical base URL and route before release. MVP may proceed with generate-sentence only after route verification.

## Scenario 8: Learner safety regression check

1. Launch a live room from a prepared topic.
2. Join from a separate learner browser/session.
3. Open a round.
4. Confirm learner screen shows only safe metadata, response buttons, CCI/CVR values, and eligibility.
5. Confirm learner screen does not show English answer text, Vietnamese answer text, generated candidates, or audio controls.

Expected: Topic prep and CCI defaults do not violate learner-facing safety.

## Release-control checklist for implementation/deploy

Before any production-impacting migration, function deploy, or Hosting deploy:

1. `git status --short --branch` and preserve unrelated work.
2. Validate locally.
3. Commit with Craft Agent co-author trailer if Craft Agent commits.
4. Push to `main`.
5. Validate preview/canary when web app changes are included.
6. Tag production release for Hosting deploy.
7. Apply Supabase migration/function deploy only with rollback instructions.
8. Verify production routes and core flows.
9. Update `docs/deployment-log.md` with date/time GMT+7, commit/tag, validation, rollback, risks, and notes.

## Rollback notes

- **Hosting rollback**: Firebase Console → Hosting → `chunks-offline` release history → rollback to previous known-good release.
- **Section CCI column rollback**: Drop `default_cci_standard_card_id` only after confirming implementation no longer reads it.
- **Generated resources rollback**: Delete or archive only generated QA/test resources by explicit id list; do not broad-delete production lessons.
- **Edge Function rollback**: Redeploy previous known-good function version or remove UI access to generation while keeping Library CRUD available.
