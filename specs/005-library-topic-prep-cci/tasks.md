# Tasks: Library Topic Prep and Section CCI Assignment

**Input**: Design documents from `/specs/005-library-topic-prep-cci/`

**Prerequisites**: plan.md, spec.md, research.md, api-docs-review.md, data-model.md, contracts/, quickstart.md

**Tests**: This task list uses TypeScript/build validation plus manual quickstart/live-room checks because no dedicated automated UI test runner is currently configured.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify current state, preserve release controls, and prepare schema/API decisions before implementation.

- [x] T001 Review `git status --short --branch` and preserve unrelated local work before edits
- [x] T002 [P] Verify live Supabase schema for `courses`, `lessons`, `lesson_sections`, `sentence_resources`, `cci_standard_cards`, `practice_rooms`, and `room_rounds`; record findings in `specs/005-library-topic-prep-cci/data-model.md`
- [x] T003 [P] Verify M2M API canonical base URL and generate-sentence route against `specs/005-library-topic-prep-cci/api-docs-review.md`
- [x] T004 [P] Confirm no M2M API key is present in tracked frontend files by searching `src/`, `docs/`, and `.env*` patterns; record result in `specs/005-library-topic-prep-cci/api-docs-review.md`
- [x] T005 Choose section CCI schema option (nullable `lesson_sections.default_cci_standard_card_id` vs mapping table) and update `specs/005-library-topic-prep-cci/data-model.md`
- [x] T006 Add release-control notes for this feature to `specs/005-library-topic-prep-cci/quickstart.md` if schema/function deploy steps change

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add shared data contracts and schema alignment needed by all user stories.

**⚠️ CRITICAL**: No user story work should begin until schema/type decisions are complete.

- [x] T007 Add a Supabase migration for the chosen section CCI default schema in `src/data/migrations.ts` or the project’s Supabase migration location
- [x] T008 Regenerate or update Supabase database types in `src/lib/database.types.ts` after the section CCI schema change
- [x] T009 Update domain types for `LessonSection` and related CCI default data in `src/types.ts`
- [x] T010 [P] Add shared dependency-check helpers for course/lesson/section/resource delete/archive decisions in `src/lib/liveData.ts`
- [x] T011 [P] Add a browser-safe lesson generator client wrapper for trusted proxy calls in `src/lib/lessonGeneratorClient.ts`
- [x] T012 Remove or dev-guard remaining Library `sandboxDb` mutation branches in `src/components/LibraryTab.tsx`
- [x] T013 Update `src/App.tsx` to pass any required CCI card/default data into `src/components/LibraryTab.tsx`

**Checkpoint**: Types, schema, and shared helpers are ready for independently testable user story work.

---

## Phase 3: User Story 1 - Manage Library course and lesson hierarchy (Priority: P1) 🎯 MVP

**Goal**: Library supports live CRUD for courses, lessons/topics, and sections/parts with archive-first safety.

**Independent Test**: Create a QA course, lesson/topic, and two sections/parts; edit, refresh, archive/remove safely, and verify live persistence.

### Implementation for User Story 1

- [x] T014 [US1] Add course create/edit/archive UI state and form controls in `src/components/LibraryTab.tsx`
- [x] T015 [US1] Implement live course create/update/archive mutations using `courses` in `src/components/LibraryTab.tsx`
- [x] T016 [US1] Add course hard-delete guard using dependency checks in `src/components/LibraryTab.tsx`
- [x] T017 [US1] Add lesson/topic create/edit/archive UI state and form controls in `src/components/LibraryTab.tsx`
- [x] T018 [US1] Implement live lesson/topic create/update/archive mutations using `lessons` in `src/components/LibraryTab.tsx`
- [x] T019 [US1] Add lesson/topic hard-delete guard using dependency checks in `src/components/LibraryTab.tsx`
- [x] T020 [US1] Add section/part create/edit/archive UI state and form controls in `src/components/LibraryTab.tsx`
- [x] T021 [US1] Implement live section/part create/update/archive mutations using `lesson_sections` in `src/components/LibraryTab.tsx`
- [x] T022 [US1] Add section/part hard-delete guard using dependency checks in `src/components/LibraryTab.tsx`
- [x] T023 [US1] Preserve existing sentence resource create/edit behavior while ensuring selected course/lesson/section targeting remains correct in `src/components/LibraryTab.tsx`
- [ ] T024 [US1] Validate Scenario 1 and Scenario 2 in `specs/005-library-topic-prep-cci/quickstart.md`

**Checkpoint**: Library hierarchy management works from live data without database tools.

---

## Phase 4: User Story 2 - Prepare a full topic lesson package (Priority: P1)

**Goal**: Topic Prep shows per-topic and per-section readiness for resources, audio, CVR, and CCI assignment.

**Independent Test**: Select an existing EREL topic and confirm each part/section shows resource counts, audio gaps, CVR range, CCI status, and ready/not-ready state.

### Implementation for User Story 2

- [x] T025 [P] [US2] Add Topic Prep summary computation helpers in `src/components/LibraryTab.tsx` or `src/lib/liveData.ts`
- [x] T026 [US2] Add Topic Prep panel layout in `src/components/LibraryTab.tsx`
- [x] T027 [US2] Render lesson-level readiness metrics in `src/components/LibraryTab.tsx`
- [x] T028 [US2] Render section/part readiness rows with resource/audio/CVR/CCI metrics in `src/components/LibraryTab.tsx`
- [x] T029 [US2] Add empty/setup guidance for topics with no sections or no approved resources in `src/components/LibraryTab.tsx`
- [x] T030 [US2] Ensure duplicate section titles across lessons are displayed with distinct underlying ids in `src/components/LibraryTab.tsx`
- [ ] T031 [US2] Validate Scenario 3 in `specs/005-library-topic-prep-cci/quickstart.md`

**Checkpoint**: Teachers can decide whether a full topic is ready before live-room launch.

---

## Phase 5: User Story 4 - Assign default CCI Standard by Section Topic for live rooms (Priority: P1)

**Goal**: Section/topic part default CCI assignment controls live-room round CCI snapshots unless manually overridden.

**Independent Test**: Assign two sections different CCI defaults, launch a room, open sentences from each section, and verify `room_rounds` snapshots the correct CCI card/value.

### Implementation for User Story 4

- [x] T032 [US4] Add default CCI selector to section/part edit controls in `src/components/LibraryTab.tsx`
- [x] T033 [US4] Persist section default CCI assignment through the chosen schema in `src/components/LibraryTab.tsx`
- [x] T034 [US4] Add invalid/inactive CCI assignment warning in Topic Prep in `src/components/LibraryTab.tsx`
- [x] T035 [P] [US4] Add CCI resolution helper for manual override → section default → room default → active fallback in `src/lib/liveData.ts`
- [x] T036 [US4] Update `src/components/SimulatorTab.tsx` to load section default CCI data for the selected sentence resource
- [x] T037 [US4] Update `handleOpenRound` in `src/components/SimulatorTab.tsx` to snapshot resolved `cci_standard_card_id` and `cci_standard_x`
- [x] T038 [US4] Add teacher-visible CCI source label/warning to active and next-preview live-room canvases in `src/components/SimulatorTab.tsx`
- [x] T039 [US4] Verify `src/components/LearnerTerminalTab.tsx` remains learner-safe and does not reveal generated text/audio while displaying allowed CCI/CVR metadata
- [ ] T040 [US4] Validate Scenario 4, Scenario 5, and Scenario 8 in `specs/005-library-topic-prep-cci/quickstart.md`

**Checkpoint**: Live-room CCI assignment works by section topic without breaking historical round snapshots or learner safety.

---

## Phase 6: User Story 3 - Generate/add lesson content from the lesson-generator M2M API safely (Priority: P2)

**Goal**: Library can request generated bilingual sentence candidates through a trusted proxy, review them, and save approved/draft resources.

**Independent Test**: Request a generated candidate from a selected lesson section, review EN/VI/Ohm metadata, save as draft, and verify no API key appears in browser code or network calls.

### Implementation for User Story 3

- [x] T041 [US3] Add Supabase Edge Function `lesson-generator-proxy` in `supabase/functions/lesson-generator-proxy/index.ts` or the repository’s function location
- [x] T042 [US3] Configure server-side secret references for `CHUNKS_M2M_API_KEY` and optional M2M base URL in deployment docs without exposing secret values
- [x] T043 [US3] Implement request validation, required headers, timeout, and normalized responses in `supabase/functions/lesson-generator-proxy/index.ts`
- [x] T044 [US3] Implement duplicate/idempotency handling using request ids or payload hashes in `supabase/functions/lesson-generator-proxy/index.ts` or `src/lib/lessonGeneratorClient.ts`
- [x] T045 [US3] Add Generate Candidate UI state/form in `src/components/LibraryTab.tsx`
- [x] T046 [US3] Display generated candidate review fields in `src/components/LibraryTab.tsx`
- [x] T047 [US3] Save reviewed candidates into `sentence_resources` as draft/approved rows in `src/components/LibraryTab.tsx`
- [x] T048 [US3] Handle `processing`, timeout, retry, and error states without creating incomplete resources in `src/components/LibraryTab.tsx`
- [ ] T049 [US3] Validate Scenario 6 and Scenario 7 in `specs/005-library-topic-prep-cci/quickstart.md`

**Checkpoint**: Generated lesson content can be reviewed and saved safely without browser secret exposure.

---

## Phase 7: User Story 5 - Validate API documentation and operational readiness (Priority: P2)

**Goal**: Keep docs, wiki skeleton, deployment guidance, and API review aligned before implementation/deploy.

**Independent Test**: Review feature artifacts and confirm contract/security mismatches plus release controls are documented.

### Implementation for User Story 5

- [x] T050 [US5] Update `specs/005-library-topic-prep-cci/api-docs-review.md` with results from live endpoint verification
- [x] T051 [US5] Update `docs/wiki-skeleton/Architecture.md` with Library hierarchy/topic prep and Edge Function proxy responsibilities after implementation
- [x] T052 [US5] Update `docs/wiki-skeleton/Product-PRD-and-Scope.md` with topic prep and section CCI assignment scope after implementation
- [x] T053 [US5] Update `docs/devops-runbook.md` if Edge Function deployment steps or secret configuration differ from current runbook
- [x] T054 [US5] Add implementation/release evidence to `docs/deployment-log.md` only after an actual deploy or migration occurs

**Checkpoint**: Canonical docs and handbook summaries reflect the implemented behavior.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, release-control readiness, and cleanup.

- [x] T055 Run `npx tsc --noEmit` and record result in implementation summary
- [x] T056 Run `npm run build` and record result in implementation summary
- [x] T057 Run `npm run lint`; if local wrapper JSON parse issue occurs, document it and verify GitHub CI after push
- [x] T058 Search built/source output for M2M key strings and confirm no secret exposure
- [x] T059 Verify no normal Library product flow depends on `sandboxDb` by searching `src/components/LibraryTab.tsx` and `src/lib/supabaseClient.ts`
- [ ] T060 Run full quickstart scenarios in `specs/005-library-topic-prep-cci/quickstart.md`
- [x] T061 Review git diff and ensure unrelated local work is not included
- [x] T062 Commit implementation changes with Craft Agent co-author trailer if Craft Agent commits
- [ ] T063 If deploying web app changes, follow preview/canary → tag-gated production → production verification → `docs/deployment-log.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies.
- **Phase 2 Foundational**: Depends on setup decisions and blocks all stories.
- **US1 and US2**: Can proceed after foundational; US1 is MVP for hierarchy CRUD, US2 adds topic readiness.
- **US4**: Depends on section CCI schema/type work and can run alongside US2 after foundational.
- **US3**: Depends on proxy/API route verification and can run after foundational; does not block hierarchy CRUD.
- **US5**: Runs throughout, finalized after implementation/deploy.
- **Polish**: Runs after selected stories are complete.

### User Story Dependencies

- **US1 (P1)**: Requires foundational schema/type/helper setup only.
- **US2 (P1)**: Requires hierarchy data and CCI card props; can be tested without generation proxy.
- **US4 (P1)**: Requires section CCI default schema and live-room round-opening updates.
- **US3 (P2)**: Requires server-side proxy and M2M endpoint verification.
- **US5 (P2)**: Documentation and operational readiness; depends on final implementation choices.

### Parallel Opportunities

- T002, T003, and T004 can run in parallel.
- T010 and T011 can run in parallel after schema choice.
- US1 UI forms and dependency-check helpers can be split once Library state shape is agreed.
- US2 summary computation and UI rendering can be split after data shape is stable.
- US4 CCI helper and Simulator UI updates can be split with careful integration.
- US3 Edge Function implementation and Library candidate UI can be split after proxy contract is fixed.
- Wiki skeleton/docs tasks can run after behavior is implemented.

---

## Parallel Example: User Story 4

```bash
Task: "Add CCI resolution helper in src/lib/liveData.ts"
Task: "Add default CCI selector to section/part edit controls in src/components/LibraryTab.tsx"
Task: "Add teacher-visible CCI source labels in src/components/SimulatorTab.tsx"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1 hierarchy CRUD.
3. Complete US2 Topic Prep read-only readiness metrics.
4. Stop and validate Library without generation proxy or live-room changes.

### Classroom Scoring Increment

1. Complete US4 section default CCI schema/UI.
2. Validate live-room CCI snapshot behavior in two-browser teacher/learner flow.
3. Confirm historical reports remain unchanged after default changes.

### Generation Increment

1. Complete US3 server-side proxy.
2. Validate no API key exposure.
3. Add candidate review/save UI.
4. Save generated resources only after review.

### Release Controls

Before migrations/functions/deployments:

1. Validate locally.
2. Commit before deploy.
3. Push to `main`.
4. Preview/canary web changes.
5. Tag production Hosting release when applicable.
6. Deploy production.
7. Verify production URL and critical flows.
8. Update `docs/deployment-log.md`.

## Notes

- Current task count: 63.
- Suggested MVP scope: T001-T031.
- Destructive hard deletes require explicit Lucy confirmation and dependency-free records.
- M2M API key handling is the primary security risk; do not implement direct frontend calls.
