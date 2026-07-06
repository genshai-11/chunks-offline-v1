# Tasks: Live Database and Learner Roster

**Input**: Design documents from `/specs/001-live-db-learner-roster/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: This task list uses TypeScript validation plus manual quickstart/page checklist tasks because no automated test runner is currently configured.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish live database contracts before touching page behavior

- [x] T001 Generate current Supabase TypeScript database types into `src/lib/database.types.ts`
- [ ] T002 [P] Compare generated database types against app domain interfaces in `src/types.ts`
- [ ] T003 [P] Record current schema drift findings in `specs/001-live-db-learner-roster/data-model.md`
- [x] T004 Add a shared live-data result/error helper module in `src/lib/liveData.ts`
- [x] T005 Add a schema health helper for required tables/RPCs in `src/lib/schemaHealth.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Remove product-level mock routing and align top-level data loading

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Remove product data fallback through `useSandbox` in `src/App.tsx`
- [ ] T007 Remove or dev-guard `SandboxDatabase` product exports and seed arrays in `src/lib/supabaseClient.ts`
- [x] T008 Add live `learners` loading state and refresh handling in `src/App.tsx`
- [x] T009 Replace silent partial-load behavior with per-table error capture in `src/App.tsx`
- [x] T010 Update component prop types to receive live learners where needed in `src/types.ts`
- [ ] T011 Reconcile local migration checklist with actual schema gaps in `src/data/migrations.ts`
- [ ] T012 Add release-control notes for future DB migrations in `specs/001-live-db-learner-roster/quickstart.md`

**Checkpoint**: App shell can load live database state with mock fallback removed or isolated.

---

## Phase 3: User Story 1 - Product pages use live data only (Priority: P1) 🎯 MVP

**Goal**: Every product page loads live data or explicit empty/error/schema states, never mock fallback.

**Independent Test**: Clear browser localStorage, run the app, visit every tab, and verify no product tab displays seed/mock data.

### Implementation for User Story 1

- [ ] T013 [US1] Remove sandbox mutation branches from `src/components/LibraryTab.tsx`
- [ ] T014 [US1] Add live loading/empty/error display for Library data in `src/components/LibraryTab.tsx`
- [ ] T015 [US1] Replace sandbox active-room sync with live room query/polling baseline in `src/components/SimulatorTab.tsx`
- [ ] T016 [US1] Replace sandbox active-room sync with live room query/polling baseline in `src/components/LearnerTerminalTab.tsx`
- [ ] T017 [US1] Remove `sandboxDb.learners` dependency and use live learner props in `src/components/HistoryTab.tsx`
- [x] T018 [US1] Gate Audio Jobs rendering on schema health in `src/components/AudioGeneratorTab.tsx`
- [ ] T019 [US1] Remove sandbox-only performance parameter behavior from product Settings flows in `src/components/SettingsTab.tsx`
- [ ] T020 [US1] Replace sandbox-to-live seed sync card with schema health/drift status in `src/components/MigrationsTab.tsx`
- [ ] T021 [US1] Remove mock/sandbox wording from product navigation labels in `src/App.tsx`
- [x] T022 [US1] Run mock-free page checklist and record results in `specs/001-live-db-learner-roster/checklists/page-live-data.md`

**Checkpoint**: User Story 1 is functional when every tab is explainable from live DB, empty states, or schema-health messages.

---

## Phase 4: User Story 2 - Manage learner roster in Settings (Priority: P2)

**Goal**: Settings has durable learner roster list/add/edit/safe-remove behavior.

**Independent Test**: Add Mason from Settings, refresh the app, and confirm Mason remains in the database-backed roster without duplicate creation.

### Implementation for User Story 2

- [x] T023 [US2] Add Learners subtab state and navigation in `src/components/SettingsTab.tsx`
- [x] T024 [US2] Render live learner roster table with duplicate-name indicators in `src/components/SettingsTab.tsx`
- [x] T025 [US2] Implement add learner form writing to `learners` in `src/components/SettingsTab.tsx`
- [x] T026 [US2] Implement edit learner display name without changing id in `src/components/SettingsTab.tsx`
- [x] T027 [US2] Implement safe remove/deactivate UI with history checks in `src/components/SettingsTab.tsx`
- [ ] T028 [US2] Add or document learner active/deactivated schema migration in `src/data/migrations.ts`
- [x] T029 [US2] Add requested-roster setup action for Lucy, Mason, Annie, Vox, Tailor, Wynnye, Cherry, Jay, and Pen in `src/components/SettingsTab.tsx`
- [x] T030 [US2] Add learner duplicate normalization helper in `src/lib/liveData.ts`
- [x] T031 [US2] Refresh top-level learners after roster mutations in `src/App.tsx`
- [ ] T032 [US2] Document roster validation evidence in `specs/001-live-db-learner-roster/checklists/learner-roster.md`

**Checkpoint**: Learner roster can be managed from Settings and persists after refresh.

---

## Phase 5: User Story 3 - Select or create learners during live classroom flows (Priority: P3)

**Goal**: Teacher/Learner flows resolve participants by `learners.id`, not free-text names.

**Independent Test**: Select Jay from the roster, join a room, submit a response, close the round, and verify Reports attributes the response to Jay's learner id.

### Implementation for User Story 3

- [ ] T033 [US3] Pass live learners from `src/App.tsx` into `src/components/SimulatorTab.tsx`
- [ ] T034 [US3] Replace Teacher Console manual learner-name join with roster select/add-new flow in `src/components/SimulatorTab.tsx`
- [ ] T035 [US3] Ensure room membership upsert uses selected learner id in `src/components/SimulatorTab.tsx`
- [x] T036 [US3] Pass live learners from `src/App.tsx` into `src/components/LearnerTerminalTab.tsx`
- [x] T037 [US3] Replace hardcoded Learner Terminal default name with roster select/add-new flow in `src/components/LearnerTerminalTab.tsx`
- [x] T038 [US3] Replace Learner Terminal sandbox room/round/response loading with live Supabase queries in `src/components/LearnerTerminalTab.tsx`
- [ ] T039 [US3] Align response submission formula/RPC usage with database-owned scoring in `src/components/LearnerTerminalTab.tsx`
- [x] T040 [US3] Verify learner progress aggregation updates and Reports display by learner id in `src/components/HistoryTab.tsx`
- [x] T041 [US3] Document classroom learner-flow validation in `specs/001-live-db-learner-roster/checklists/classroom-learner-flow.md`

**Checkpoint**: Classroom join, response, close-round, and reports all preserve learner identity by id.

---

## Phase 6: User Story 4 - Validate schema drift and missing tables (Priority: P4)

**Goal**: Missing live schema objects are visible, gated, and resolved through release-controlled migration work.

**Independent Test**: With `audio_generation_jobs` absent, Audio Jobs shows a schema action state; after an approved migration/types refresh, the page can queue/process jobs using the live table.

### Implementation for User Story 4

- [x] T042 [US4] Add required table/RPC checks for `audio_generation_jobs` and classroom RPCs in `src/lib/schemaHealth.ts`
- [x] T043 [US4] Show schema gap callout for missing `audio_generation_jobs` in `src/components/AudioGeneratorTab.tsx`
- [x] T044 [US4] Align Audio Jobs status values with live schema enum in `src/components/AudioGeneratorTab.tsx`
- [ ] T045 [US4] Add or reconcile `audio_generation_jobs` migration SQL in `src/data/migrations.ts`
- [x] T046 [US4] Update generated DB type validation after schema reconciliation in `src/lib/database.types.ts`
- [x] T047 [US4] Document schema drift validation in `specs/001-live-db-learner-roster/checklists/schema-drift.md`

**Checkpoint**: Schema drift is visible and cannot silently break product pages.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation, and release-control readiness

- [x] T048 Run TypeScript validation with `npm run lint` and fix errors in `src/`
- [ ] T049 Run full quickstart validation and update `specs/001-live-db-learner-roster/quickstart.md`
- [ ] T050 [P] Update project README setup notes for live database/no-mock behavior in `README.md`
- [ ] T051 [P] Review `.env.example` for Supabase variable naming and client-safe key guidance in `.env.example`
- [ ] T052 Verify no product code imports `sandboxDb` by searching `src/` and record result in `specs/001-live-db-learner-roster/checklists/page-live-data.md`
- [ ] T053 Review git diff and create a release-control commit plan in `specs/001-live-db-learner-roster/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories.
- **US1 (Phase 3)**: First MVP after Foundational; removes mock product flows and verifies pages.
- **US2 (Phase 4)**: Depends on live learners loaded in Foundational; can run after US1 baseline.
- **US3 (Phase 5)**: Depends on US2 roster behavior and live learners props.
- **US4 (Phase 6)**: Can start after Foundational; should finish before enabling Audio Jobs in production.
- **Polish (Phase 7)**: Depends on selected user stories.

### User Story Dependencies

- **US1**: No dependency beyond Foundational.
- **US2**: Needs live `learners` state from Foundational.
- **US3**: Needs US2 learner roster CRUD/selection patterns.
- **US4**: Independent from US2/US3 except shared schema helper.

### Parallel Opportunities

- T002 and T003 can run in parallel.
- T013-T020 can be split by page after Foundational is complete.
- T023-T030 can be split across Settings UI, helper, and migration documentation.
- T042-T045 can run in parallel with US2 if schema helper interfaces are stable.
- T050-T051 can run in parallel during Polish.

---

## Parallel Example: User Story 1

```bash
# Parallel page audit/implementation after foundational work:
Task: "Remove sandbox mutation branches from src/components/LibraryTab.tsx"
Task: "Replace sandbox active-room sync with live room query/polling baseline in src/components/SimulatorTab.tsx"
Task: "Remove sandboxDb.learners dependency and use live learner props in src/components/HistoryTab.tsx"
Task: "Gate Audio Jobs rendering on schema health in src/components/AudioGeneratorTab.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 Setup.
2. Complete Phase 2 Foundational.
3. Complete Phase 3 US1.
4. Stop and validate all tabs with localStorage cleared and no mock data.

### Incremental Delivery

1. US1: live-only product pages.
2. US2: Settings learner roster.
3. US3: learner selection/add-new in classroom flows.
4. US4: schema drift/audio jobs gating and migration readiness.

### Release Controls

Before applying migrations or deploying:

1. Commit current changes.
2. Tag production release when applicable.
3. Validate preview/canary first.
4. Keep rollback SQL or restore instructions.
5. Verify hosting/functions restore path.
6. Run post-deploy quickstart checklist.

## Notes

- Current task count: 53.
- Suggested MVP scope: T001-T022.
- DDL/migrations are planned but not applied in this task generation step.
- Destructive learner deletion must be explicitly confirmed and should be blocked when dependent history exists.
