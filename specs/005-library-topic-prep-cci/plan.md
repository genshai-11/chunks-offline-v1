# Implementation Plan: Library Topic Prep and Section CCI Assignment

**Branch**: `005-library-topic-prep-cci` | **Date**: 2026-07-08 16:43 GMT+7 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-library-topic-prep-cci/spec.md`

**Note**: This plan covers review, design, and tasks only. No implementation, Supabase migration, Edge Function deployment, or production deploy is executed in this phase.

## Summary

Extend Library so Lucy can manage curriculum hierarchy records (courses, lessons/topics, sections/parts), prepare a full topic with readiness metrics, generate/review lesson content through the external M2M lesson-generator using a server-side proxy, and assign default CCI Standard Cards by section/topic part so live-room rounds snapshot the correct CCI value per sentence section.

## Technical Context

**Language/Version**: TypeScript 5.8, React 19, Vite 6

**Primary Dependencies**: `@supabase/supabase-js` v2, React DOM, lucide-react, Recharts/Tailwind already present; planned Supabase Edge Function for external M2M generation proxy

**Storage**: Supabase Postgres public schema for courses, lessons, lesson_sections, sentence_resources, cci_standard_cards, practice_rooms, room_rounds; Supabase secrets for M2M API key if proxy is implemented

**Testing**: `npx tsc --noEmit`, `npm run build`, `npm run lint` when local wrapper is healthy, manual quickstart validation, Supabase pre/post migration verification, two-browser live-room verification

**Target Platform**: Browser-based Firebase Hosting web app with Supabase backend

**Project Type**: Single Vite React frontend backed by hosted Supabase and optional Supabase Edge Function

**Performance Goals**: Topic Prep summary renders within 2 seconds after data load for current dataset scale; Library hierarchy mutations refresh without full app reload; generation flow handles 5-30 second upstream latency with visible status

**Constraints**: No service keys or M2M API keys in browser code; no destructive deletes without confirmation and dependency checks; learner screens remain answer-safe; production release requires commit/tag/preview/rollback/deployment log

**Scale/Scope**: Current live DB has thousands of sentence resources and dozens of lessons/sections; Library must remain paginated/filterable and not render all generated candidates as saved resources without review

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Live DB as system of record**: PASS. Feature targets live `courses`, `lessons`, `lesson_sections`, `sentence_resources`, `cci_standard_cards`, `practice_rooms`, and `room_rounds`.
- **No mock data in product flows**: PASS WITH TASKS. Existing `useSandbox`/`sandboxDb` branches in Library must be removed or dev-guarded for hierarchy/resource mutations.
- **Typed schema and drift control**: PASS WITH TASKS. Section CCI default requires generated DB type update and a migration choice before implementation.
- **Page-level verification**: PASS. Library and Teacher Console/live-room have explicit loading, empty, error, mutation, refresh, and live-room validation tasks.
- **Live session orchestration**: PASS WITH TASKS. Round opening must preserve teacher-only text/audio, learner-safe metadata, first-response lockout, manual/auto advance, and CCI snapshot behavior.
- **Learner continuity**: PASS. No new learner identity behavior; existing learner id continuity must remain unaffected.
- **Release controls**: PASS WITH TASKS. Supabase migration/Edge Function/Hosting work requires commit, preview/canary, rollback, restore path, tag-gated production deploy, and deployment-log update.

## Phase 0: Research

See [research.md](./research.md) and [api-docs-review.md](./api-docs-review.md).

### Key decisions

1. Library hierarchy remains Course → Lesson/Topic → Section/Part → Sentence Resource.
2. Deletion is archive-first; hard delete only for dependency-free records after explicit confirmation.
3. Topic Prep is a computed readiness dashboard from live data, not a denormalized table for MVP.
4. Section CCI default is persisted and resolved at round-open time, while `room_rounds` keeps historical CCI snapshots.
5. M2M generation is server-side only via Supabase Edge Function/proxy; frontend never sees the API key.
6. MVP supports `POST /api/generate-sentence` only; Ohm analysis/audio endpoints are deferred until endpoint mismatch is resolved.

## Phase 1: Design

### Data model

See [data-model.md](./data-model.md).

Recommended migration for MVP:

```sql
alter table public.lesson_sections
  add column if not exists default_cci_standard_card_id uuid null references public.cci_standard_cards(id);

create index if not exists lesson_sections_default_cci_standard_card_id_idx
  on public.lesson_sections(default_cci_standard_card_id);
```

If direct alteration of `lesson_sections` is not desired, use the mapping-table fallback in [data-model.md](./data-model.md).

### Contracts

- [contracts/library-topic-prep-contract.md](./contracts/library-topic-prep-contract.md)
- [contracts/lesson-generator-proxy-contract.md](./contracts/lesson-generator-proxy-contract.md)
- [contracts/live-room-section-cci-contract.md](./contracts/live-room-section-cci-contract.md)

### API documentation review

The M2M docs are useful but require safeguards:

- Literal API key in markdown must be treated as secret and kept out of frontend code.
- Markdown base URL and OpenAPI servers disagree.
- Markdown health endpoint (`/api/ping`) and OpenAPI health endpoint (`/health`) disagree.
- Markdown analysis endpoint (`/api/analyze-ohm`) and OpenAPI analysis endpoint (`/analysis/linguistic`) disagree.
- OpenAPI includes Bearer auth/audio endpoint not required for this feature.
- Async webhook lacks callback authentication details; defer auto-save webhook in MVP.

### Page/function audit

| Page/function | Current behavior | Required changes |
|---|---|---|
| `src/components/LibraryTab.tsx` | Selects course/lesson/section and edits sentence resources; no course/lesson/section CRUD; still imports `sandboxDb` for mutation branches | Add hierarchy CRUD; archive-first removal; Topic Prep summary; section CCI default UI; generation candidate review; remove/dev-guard sandbox branches |
| `src/App.tsx` | Loads courses, lessons, sections, resources, CCI cards | Load any new section default CCI field/types; pass needed CCI cards into Library if not already; preserve refresh/error handling |
| `src/types.ts` | `LessonSection` lacks default CCI field | Add optional default CCI property or mapping entity after migration choice |
| `src/components/SimulatorTab.tsx` | Has room-level `setupCciCardId`; round open snapshots selected card value | Resolve CCI per sentence via manual override → section default → room default → fallback; show source label/warnings |
| `src/components/LearnerTerminalTab.tsx` | Learner-safe metadata already includes scoring values | Confirm no generated text/audio is exposed; preserve response gating |
| `src/lib/ttsService.ts` / new service | No lesson-generator proxy helper | Add client helper for Supabase Edge Function call after proxy exists |
| Supabase Edge Function | Not present for M2M generation | Add `lesson-generator-proxy` with secret-based M2M call, timeout/error normalization, no frontend key exposure |
| Docs/Wiki skeleton | Must reflect architecture/product logic changes | Update canonical spec/docs first, wiki skeleton second if implementation changes behavior |

## Project Structure

### Documentation (this feature)

```text
specs/005-library-topic-prep-cci/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── api-docs-review.md
├── quickstart.md
├── contracts/
│   ├── library-topic-prep-contract.md
│   ├── lesson-generator-proxy-contract.md
│   └── live-room-section-cci-contract.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── App.tsx                         # Load/pass courses, lessons, sections, resources, CCI cards
├── types.ts                        # Align LessonSection/CCI default types with DB schema
├── components/
│   ├── LibraryTab.tsx              # Hierarchy CRUD, Topic Prep, section CCI assignment, generation review
│   ├── SimulatorTab.tsx            # Live-room section CCI resolution and teacher source display
│   └── LearnerTerminalTab.tsx      # Safety verification only; no generated answer exposure
├── lib/
│   ├── database.types.ts           # Regenerated/verified Supabase schema types
│   ├── lessonGeneratorClient.ts    # Browser-safe wrapper for Edge Function result only
│   └── liveData.ts                 # Shared helpers if useful for dependency/delete checks
└── data/
    └── migrations.ts               # If project tracks migration guidance locally

supabase/
└── functions/
    └── lesson-generator-proxy/      # Optional Edge Function if repository contains Supabase function layout
```

**Structure Decision**: Keep the app as a single Vite React project. Add a small browser-safe client helper only after the server-side proxy exists. Prefer direct Supabase table operations from the current frontend pattern for Library hierarchy CRUD, but keep secret-owning M2M calls server-side.

## Phase 1 Post-Design Constitution Check

- **Live DB as system of record**: PASS. All curriculum/CCI/round behavior uses live Supabase tables; generated candidates are not product data until saved.
- **No mock data in product flows**: PASS WITH TASKS. Library sandbox branches must be removed/dev-guarded.
- **Typed schema and drift control**: PASS WITH TASKS. Migration and type regeneration are explicit tasks.
- **Page-level verification**: PASS. Quickstart covers Library, Topic Prep, generation proxy, live-room CCI, and reports snapshot stability.
- **Live session orchestration**: PASS. CCI resolution does not alter first-response/auto-advance safety and requires teacher-visible source labels.
- **Learner continuity**: PASS. No learner data changes.
- **Release controls**: PASS. Migration/function/hosting deployment tasks include rollback and deployment-log requirements.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Supabase schema change for section default CCI | Section/topic CCI assignment must persist and be available when rounds open | Room-level CCI only is too coarse for multi-part topics |
| Server-side proxy for M2M generation | M2M API requires a secret API key and has slow/async behavior | Direct frontend call exposes the key and violates secret hygiene |
