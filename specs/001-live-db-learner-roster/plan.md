# Implementation Plan: Live Database and Learner Roster

**Branch**: `001-live-db-learner-roster` | **Date**: 2026-07-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-live-db-learner-roster/spec.md`

**Note**: This plan covers planning/tasks only; no production deployment or database migration is executed in this phase.

## Summary

Convert Chunks Offline from mixed live/sandbox behavior into a live database-only classroom app, verify every page/tab loads and mutates durable Supabase data, remove mock fallback paths from product flows, and add learner roster management in Settings so live classroom membership, responses, and progress track by stable learner ids.

## Technical Context

**Language/Version**: TypeScript 5.8, React 19, Vite 6

**Primary Dependencies**: `@supabase/supabase-js` v2, React DOM, lucide-react, recharts, Tailwind CSS v4

**Storage**: Supabase Postgres public schema for product data; browser localStorage only for ephemeral UI/session convenience

**Testing**: Current repo has `npm run lint` using `tsc --noEmit`; add manual quickstart validation and implementation tasks for page-level live-data checks

**Target Platform**: Browser-based Vite web app

**Project Type**: Single frontend web application backed by hosted Supabase

**Performance Goals**: Product tabs should render usable live-data or empty/error states within normal interactive web expectations; large resource lists must remain paginated/filterable

**Constraints**: No product flow may use mock/sandbox fallback; RLS-enabled Supabase tables must remain accessible only through publishable client-safe credentials; destructive learner actions require confirmation and history protection

**Scale/Scope**: Current live DB snapshot has 2 courses, 30 lessons, 131 lesson sections, 7,068 sentence resources, 11 learners, 26 practice rooms, 13 room rounds, 8 responses, and 0 learner progress rows

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Live DB as system of record**: PASS. The feature explicitly targets live Supabase tables/RPCs as the source of record.
- **No mock data in product flows**: PASS with implementation tasks required. Existing mock/sandbox paths are identified and will be removed or isolated.
- **Typed schema and drift control**: PASS with blocking schema gap. Generated Supabase types do not include `audio_generation_jobs`, while the app currently queries it.
- **Page-level verification**: PASS. This plan includes a tab-by-tab live-data audit matrix.
- **Learner continuity**: PASS. Learner identity must resolve through `learners.id`; duplicate names require disambiguation and safe remove/deactivate.
- **Release controls**: PASS for planning. Any later deployment/migration requires commit/tag, preview/canary, rollback, restore-path, and post-deploy checks.

## Phase 0: Research

### Decision: Current live database schema is the source of truth

**Rationale**: Supabase MCP extracted the actual hosted schema on 2026-07-06. The public tables present are `courses`, `lessons`, `lesson_sections`, `sentence_resources`, `cci_categories`, `cci_standard_cards`, `cvr_units`, `learners`, `practice_rooms`, `room_memberships`, `room_rounds`, `learner_responses`, and `learner_progress`.

**Alternatives considered**:
- Trust local migration constants: rejected because app migrations include `audio_generation_jobs` but live DB does not currently have that table.
- Trust local TypeScript interfaces only: rejected because local types include entities not guaranteed by the live DB.

### Decision: Product pages must not fall back to `SandboxDatabase`

**Rationale**: `src/lib/supabaseClient.ts` contains seed arrays, localStorage-backed sandbox collections, and business logic that can mask live DB failures. Constitution requires live DB as source of record.

**Alternatives considered**:
- Keep sandbox toggle for production pages: rejected because it violates no-mock product-flow rule.
- Move sandbox to a developer-only diagnostics utility: acceptable if it is clearly excluded from normal tabs and build/release validation.

### Decision: Learner removal should preserve history

**Rationale**: Live DB already has learner-linked responses/memberships/progress relationships. Destructive deletes can break historical reports. Settings should provide safe remove/deactivate behavior for active selection and reserve hard delete for records with no dependent history.

**Alternatives considered**:
- Always delete learner rows: rejected due history loss.
- Only edit display names, no removal: rejected because user asked for add/edit/remove learner management.

### Decision: Audio Jobs schema gap is blocking for live Audio tab

**Rationale**: `App.tsx`, `LibraryTab.tsx`, and `AudioGeneratorTab.tsx` refer to `audio_generation_jobs`, but the current live public schema and generated types do not include it. The migration list also does not show the local migration `003_audio_generation_jobs.sql` as applied.

**Alternatives considered**:
- Leave query as-is: rejected because the page can fail silently.
- Disable Audio Jobs until migration is applied: acceptable interim action.
- Apply migration now: deferred to implementation/release-controlled migration step.

## Phase 1: Design

### Current Supabase Data Model Snapshot

See [data-model.md](./data-model.md) for entity fields, relationships, functions, and known drift.

### Page/Function Live-Data Audit Matrix

| Page/Tab | Current live sources | Current mock/local risks | Required plan action |
|---|---|---|---|
| `App.tsx` shell | Loads many tables through Supabase when `useSandbox=false` | `useSandbox` state can route every product collection to `sandboxDb`; queries missing `audio_generation_jobs` | Remove product fallback toggle; centralize live loading errors; handle missing audio table explicitly |
| `LibraryTab.tsx` | Supabase CRUD for `sentence_resources`, `cci_standard_cards`, `cvr_units`; queues audio jobs | Sandbox mutations and generated local IDs; audio queue writes to missing table | Keep live CRUD; remove sandbox branch from product path; gate audio queue until schema exists |
| `SimulatorTab.tsx` Teacher Console | Live inserts/updates for `practice_rooms`, `learners`, `room_memberships`, `room_rounds`, `learner_responses`, `learner_progress` | Active room sync reads sandbox state; performance params from sandbox; manual display-name join can create duplicates | Move room sync to Supabase/realtime or polling; load learners table; use roster selector; use RPCs where possible |
| `LearnerTerminalTab.tsx` | Live join and response insert path exists | `syncLocalState()` reads only sandbox; default learner name `Emily`; performance params from sandbox | Replace with Supabase room/round/response loading; learner selector/add-new flow; remove hardcoded default |
| `HistoryTab.tsx` Reports | Receives rooms/rounds/responses/progress props from `App.tsx` | Builds learner list from `sandboxDb.learners`; ignores live learner table prop | Load/pass learners from App; join reports by learner id; handle duplicates and renamed learners |
| `AudioGeneratorTab.tsx` | Updates `audio_generation_jobs` and `sentence_resources` | Table absent in live DB; status update uses `completed` while schema uses `succeeded` | Add/validate migration or disable page; align status enum; use durable job table only |
| `SettingsTab.tsx` | Supabase CRUD for CCI cards and CVR units | Performance buttons sandbox-only; preview mock learner; no learner CRUD | Add Learners subtab; live CRUD/safe deactivate; isolate preview mock as design-only or remove from product flow |
| `MigrationsTab.tsx` | Connection health query to `courses` | Sandbox sync uploads local seed data to live DB; migration checklist may drift from actual migrations | Remove/lock sandbox-to-live sync from product build; show schema health/drift instead |

### Data Contracts

- [contracts/page-data-contract.md](./contracts/page-data-contract.md): Required loading/mutation/error contract for each product page.
- [contracts/learner-roster-contract.md](./contracts/learner-roster-contract.md): Settings roster and classroom learner selection behavior.

### Quickstart Validation

See [quickstart.md](./quickstart.md) for end-to-end validation scenarios.

## Project Structure

### Documentation (this feature)

```text
specs/001-live-db-learner-roster/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── learner-roster-contract.md
│   └── page-data-contract.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── App.tsx                         # product data loader and tab shell
├── components/
│   ├── LibraryTab.tsx              # curriculum/resources/standards
│   ├── SimulatorTab.tsx            # teacher console/live room host
│   ├── LearnerTerminalTab.tsx      # learner join/response console
│   ├── HistoryTab.tsx              # reports/history
│   ├── AudioGeneratorTab.tsx       # audio job queue
│   ├── SettingsTab.tsx             # add learner roster management here
│   └── MigrationsTab.tsx           # schema health/dev-only migration guidance
├── lib/
│   ├── supabaseClient.ts           # keep live client; remove product sandbox data paths
│   └── database.types.ts           # generated/verified DB types to add during implementation
├── types.ts                        # align with generated DB/domain contracts
└── data/
    └── migrations.ts               # reconcile with actual Supabase migrations or mark dev-only
```

**Structure Decision**: Continue as a single Vite React project. Add shared live data helpers/types under `src/lib/` only if needed to avoid duplicating Supabase query logic across tabs.

## Phase 1 Post-Design Constitution Check

- **Live DB as system of record**: PASS. Design maps each page to live tables/RPCs.
- **No mock data in product flows**: PASS with tasks. Specific mock/sandbox branches are identified.
- **Typed schema and drift control**: PASS with required generated type task and audio table drift task.
- **Page-level verification**: PASS. Quickstart and tasks include page checks.
- **Learner continuity**: PASS. Learner roster/data model centers stable ids and safe removal.
- **Release controls**: PASS. Migration/deploy tasks include commit/rollback/validation requirements.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Safe learner remove may require an `active/status` schema addition | Current `learners` table has no active flag, but user needs remove-from-selector without history loss | Hard delete would break historical memberships/responses/progress |
| Audio Jobs may require migration before enabling page | Current app references a table absent from live DB | Leaving the query creates runtime failures and hides schema drift |
