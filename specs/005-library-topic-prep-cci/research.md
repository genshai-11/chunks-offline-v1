# Research: Library Topic Prep and Section CCI Assignment

**Feature**: `005-library-topic-prep-cci`  
**Date**: 2026-07-08 16:43 GMT+7

## Decision: Treat Library curriculum hierarchy as Course → Lesson/Topic → Section/Part → Sentence Resource

**Rationale**: Current domain types and Supabase tables already model `courses`, `lessons`, `lesson_sections`, and `sentence_resources`. Existing Library filters and live-room setup use this hierarchy. EREL topic selection in the Teacher Console maps topics to lessons, and part/chunk selection maps to lesson sections.

**Alternatives considered**:
- Add a new `topics` table: rejected for MVP because current data and UI already treat lessons as topics.
- Add nested lessons under lessons: rejected because it would introduce a new hierarchy not reflected in existing types or data.

## Decision: Use archive-first deletion for curriculum hierarchy

**Rationale**: Courses, lessons, sections, and resources may be referenced by live rooms, historical rounds, reports, and audio storage. Hard deletion can damage reports and replayability. Existing status fields (`draft`, `active`, `archived`) support non-destructive removal from active workflows.

**Alternatives considered**:
- Allow hard delete for all selected records: rejected because it violates destructive-action safeguards.
- Disable all removal: rejected because Lucy explicitly requested add/delete/edit.

## Decision: Add Topic Prep as a computed readiness dashboard in Library

**Rationale**: The desired question, “each topic has how many parts,” can be answered by aggregating live sections and sentence resources. Topic Prep can show readiness without immediately changing database schema. Metrics should include parts, approved/draft/archived resources, audio gaps, CVR range, and CCI assignment state.

**Alternatives considered**:
- Store denormalized readiness rows: rejected for MVP because counts can drift and are easy to compute from loaded data.
- Build only a static count: rejected because teachers need actionable readiness (audio, approved status, CVR, CCI).

## Decision: Section-level default CCI should be persisted and snapshotted into rounds

**Rationale**: Existing `room_rounds` already snapshot `cci_standard_card_id` and `cci_standard_x`, protecting historical reports. A section default can resolve the CCI card at round-open time while preserving history.

**Preferred schema option**: Add nullable `default_cci_standard_card_id` to `lesson_sections`, referencing `cci_standard_cards(id)`.

**Fallback schema option**: Create `lesson_section_cci_defaults(section_id, cci_standard_card_id, active, created_at, updated_at)` if altering `lesson_sections` is not desirable.

**Resolution order**:
1. Manual teacher override for the next/open round
2. Section default CCI card
3. Room-level default CCI card
4. Safe active fallback CCI card

**Alternatives considered**:
- Assign CCI only at room level: rejected as too coarse for multi-part topics.
- Assign CCI per sentence resource only: useful later, but higher maintenance for full topics and not requested.
- Change historical rounds when section defaults change: rejected because reports must preserve round snapshots.

## Decision: M2M lesson-generator integration must be server-side only

**Rationale**: The markdown docs require `X-API-Key` and include a literal example key. Exposing that key from the Vite frontend would violate secret hygiene. A Supabase Edge Function can hold the secret, normalize responses, implement timeout/retry/idempotency, and protect the browser.

**Alternatives considered**:
- Call the API directly from Library: rejected because it exposes the API key in browser network calls.
- Require manual copy/paste from external tool: safe but loses workflow value; acceptable fallback if Edge Function is deferred.

## Decision: MVP should integrate only generate-sentence, not all API endpoints

**Rationale**: The docs/OpenAPI disagree on analysis route names and health endpoints. `POST /api/generate-sentence` is the endpoint directly needed for adding lesson content. Ohm transcript analysis and audio endpoints can be future work after route confirmation.

**Alternatives considered**:
- Implement both generate and analyze in one release: rejected due contract mismatch risk.
- Implement OpenAPI `/audio/speech`: rejected because current app already has Supabase audio generation workflows and this request is about topic lesson prep.

## Decision: Generated output stays as review candidate before saving

**Rationale**: AI-generated text should not silently enter approved classroom resources. A review step lets Lucy verify English, Vietnamese, Ohm value, section target, CVR value, and approval status.

**Alternatives considered**:
- Auto-save generated candidates as approved resources: rejected because quality and duplication control are not guaranteed.
- Store all candidates permanently in a new table for MVP: optional but not required; can start with transient candidate state if no async webhook is used.

## Decision: Release controls are mandatory for schema/function deploys

**Rationale**: This feature likely requires a Supabase migration and an Edge Function. Per AGENTS.md and the constitution, implementation must validate locally, commit before deploy, use preview/canary where applicable, tag production releases, and document rollback.

**Alternatives considered**:
- Manual uncommitted deployment: rejected by project release policy.
