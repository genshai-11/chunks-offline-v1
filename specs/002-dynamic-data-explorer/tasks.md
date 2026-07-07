# Tasks: Dynamic Data Explorer & Chart Builder

**Input**: Design documents from `specs/002-dynamic-data-explorer/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/data-explorer-ui-contract.md, quickstart.md

**Tests**: No separate automated test framework is requested in the spec. Validation uses TypeScript/build checks plus manual quickstart scenarios.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1, US2, US3, US4)
- Every task includes an exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add required dependencies and preserve release-control context.

- [x] T001 Install explorer dependencies in `package.json` and `package-lock.json`: `@tanstack/react-table`, `@tanstack/react-virtual`, and evaluate/install `@tremor/react` only if compatible with current React/Vite/Tailwind setup
- [x] T002 [P] Review current Reports integration in `src/components/HistoryTab.tsx` and confirm where the new Data Explorer tab will be mounted
- [x] T003 [P] Review existing chart usage in `src/components/HistoryTab.tsx` to reuse chart styling and formatter patterns
- [x] T004 [P] Review live data fields in `src/types.ts` for `LearnerResponse`, `RoomRound`, `PracticeRoom`, `Learner`, and `SentenceResource`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core explorer model and aggregation helpers that all user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 Define explorer row, column, chart, aggregation, and pivot summary types in `src/lib/dataExplorer.ts`
- [x] T006 Implement `buildExplorerRows()` in `src/lib/dataExplorer.ts` to normalize live Reports data into read-only explorer rows keyed by durable learner id
- [x] T007 Implement type-aware column metadata in `src/lib/dataExplorer.ts` for text, number, categorical, date, and identifier fields
- [x] T008 Implement aggregation helpers in `src/lib/dataExplorer.ts` for count, sum, average, min, max, and distinct count
- [x] T009 Implement chart-data builder helpers in `src/lib/dataExplorer.ts` for category charts and scatter charts
- [x] T010 Implement pivot/group summary helpers in `src/lib/dataExplorer.ts`
- [x] T011 Ensure compact sentence code display uses `getShortSentenceCode()` from `src/lib/resourceCode.ts` while preserving full sentence codes in explorer rows

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Explore live classroom data in a grid (Priority: P1) 🎯 MVP

**Goal**: Teacher can open Data Explorer, view live response rows, filter/sort/search, show/hide columns, and select rows.

**Independent Test**: Open Reports → Data Explorer, filter to one room/learner, sort CPD descending, hide a column, select rows, and confirm row counts are correct.

### Implementation for User Story 1

- [x] T012 [US1] Create `src/components/DataExplorerTab.tsx` with a Data Explorer shell, header, empty/loading messaging, and row count summary
- [x] T013 [US1] Configure TanStack table state in `src/components/DataExplorerTab.tsx` for sorting, filters, column visibility, column order, and row selection
- [x] T014 [US1] Render the explorer grid in `src/components/DataExplorerTab.tsx` using normalized rows and type-aware columns from `src/lib/dataExplorer.ts`
- [x] T015 [US1] Add global search and per-column filter controls in `src/components/DataExplorerTab.tsx`
- [x] T016 [US1] Add column visibility controls in `src/components/DataExplorerTab.tsx`
- [x] T017 [US1] Add row selection controls and selected-row count in `src/components/DataExplorerTab.tsx`
- [x] T018 [US1] Add the Data Explorer sub-tab to `src/components/HistoryTab.tsx` and pass live rooms, rounds, responses, learners, resources, and active filters into `DataExplorerTab`
- [x] T019 [US1] Validate US1 via `specs/002-dynamic-data-explorer/quickstart.md` Scenario 1 and Scenario 2

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Create charts directly from grid columns (Priority: P2)

**Goal**: Teacher can create dynamic charts by choosing chart type, category field, value field, and aggregation.

**Independent Test**: Choose learner as category and CPD as value, create a max CPD bar chart, switch chart type, and confirm values match the grid rows.

### Implementation for User Story 2

- [x] T020 [US2] Add chart definition state and default chart builder controls to `src/components/DataExplorerTab.tsx`
- [x] T021 [US2] Add chart type selector in `src/components/DataExplorerTab.tsx` for bar, line, area, pie/donut, and scatter-compatible views
- [x] T022 [US2] Add category field, value field, secondary value field, and aggregation selectors in `src/components/DataExplorerTab.tsx`
- [x] T023 [US2] Render category charts from `buildCategoryChartData()` in `src/components/DataExplorerTab.tsx` using existing Recharts patterns
- [x] T024 [US2] Render scatter charts from `buildScatterChartData()` in `src/components/DataExplorerTab.tsx`
- [x] T025 [US2] Add chart compatibility empty/error states in `src/components/DataExplorerTab.tsx`
- [x] T026 [US2] Add column menu actions in `src/components/DataExplorerTab.tsx` for “Use as chart category” and “Use as chart value”
- [x] T027 [US2] Validate US2 via `specs/002-dynamic-data-explorer/quickstart.md` Scenario 3

**Checkpoint**: User Stories 1 and 2 work independently.

---

## Phase 5: User Story 3 - Keep charts synchronized with grid state (Priority: P3)

**Goal**: Existing charts update when grid filters or row selection change, with explicit scope between filtered rows and selected rows.

**Independent Test**: Create a chart, filter rows, select rows, switch chart scope, and verify chart values update correctly.

### Implementation for User Story 3

- [x] T028 [US3] Derive filtered rows from the TanStack row model in `src/components/DataExplorerTab.tsx`
- [x] T029 [US3] Derive selected rows from row selection state in `src/components/DataExplorerTab.tsx`
- [x] T030 [US3] Add chart scope control for filtered rows vs selected rows in `src/components/DataExplorerTab.tsx`
- [x] T031 [US3] Recalculate chart datasets from the selected scope in `src/components/DataExplorerTab.tsx`
- [x] T032 [US3] Add selected-scope empty state in `src/components/DataExplorerTab.tsx`
- [x] T033 [US3] Validate US3 via `specs/002-dynamic-data-explorer/quickstart.md` Scenario 4 and Scenario 5

**Checkpoint**: Charts synchronize with grid state.

---

## Phase 6: User Story 4 - Build pivot-style summaries for classroom behavior (Priority: P4)

**Goal**: Teacher can group rows and view pivot-style aggregated summaries.

**Independent Test**: Group by learner and grade, show count and max CPD, filter to one room, and confirm summaries match visible rows.

### Implementation for User Story 4

- [x] T034 [US4] Add grouping field selector to `src/components/DataExplorerTab.tsx`
- [x] T035 [US4] Add metric and aggregation selector for pivot summaries in `src/components/DataExplorerTab.tsx`
- [x] T036 [US4] Render pivot summary rows in `src/components/DataExplorerTab.tsx` from `buildPivotSummary()` in `src/lib/dataExplorer.ts`
- [x] T037 [US4] Add column menu action “Group by this column” in `src/components/DataExplorerTab.tsx`
- [x] T038 [US4] Validate US4 via `specs/002-dynamic-data-explorer/quickstart.md` Scenario 6

**Checkpoint**: Pivot-style summaries are functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, safety, performance, and release-control readiness.

- [x] T039 [P] Add learner-route safety check by confirming `src/App.tsx` does not render Data Explorer when `activeTab === 'learner'`
- [x] T040 [P] Add responsive layout and overflow handling for dense grids in `src/components/DataExplorerTab.tsx`
- [x] T041 [P] Add friendly empty states for no data, no filtered rows, incompatible charts, and no selected rows in `src/components/DataExplorerTab.tsx`
- [x] T046 Add Progress Insights chart template catalog in `src/components/HistoryTab.tsx` listing supported chart types, input parameters, and data-processing rules
- [x] T047 Add Progress Insights chart-studio live preview in `src/components/HistoryTab.tsx` using current Reports filters
- [x] T042 Run `npx tsc --noEmit` and fix any TypeScript errors
- [x] T043 Run `npm run build` and fix any build errors
- [x] T044 Validate all quickstart scenarios in `specs/002-dynamic-data-explorer/quickstart.md`
- [ ] T045 If deploying, follow release controls in `docs/devops-runbook.md` and update `docs/deployment-log.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories
- **US1 (Phase 3)**: Depends on Foundational; MVP scope
- **US2 (Phase 4)**: Depends on Foundational and integrates best after US1 grid exists
- **US3 (Phase 5)**: Depends on US1 and US2 chart state
- **US4 (Phase 6)**: Depends on Foundational and is easiest after US1 grid exists
- **Polish (Phase 7)**: Depends on implemented desired user stories

### User Story Dependencies

- **US1**: No dependency on other stories after foundation
- **US2**: Requires US1 grid shell for column menus and chart builder placement
- **US3**: Requires US2 charts and US1 grid state
- **US4**: Requires US1 grid state and foundational pivot helpers

### Parallel Opportunities

- T002, T003, and T004 can run in parallel.
- T008, T009, and T010 can be implemented in parallel after T005-T007.
- T039, T040, and T041 can run in parallel during polish.

## Parallel Example: Foundation

```bash
Task: "Implement aggregation helpers in src/lib/dataExplorer.ts"
Task: "Implement chart-data builder helpers in src/lib/dataExplorer.ts"
Task: "Implement pivot/group summary helpers in src/lib/dataExplorer.ts"
```

## Parallel Example: Polish

```bash
Task: "Confirm learner-route safety in src/App.tsx"
Task: "Add responsive dense-grid layout in src/components/DataExplorerTab.tsx"
Task: "Add friendly empty states in src/components/DataExplorerTab.tsx"
```

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Setup and Foundational tasks.
2. Implement US1 grid explorer.
3. Validate live row loading, filtering, sorting, visibility, selection.
4. Stop for review if only MVP is desired.

### Incremental Delivery

1. US1: live grid explorer.
2. US2: chart builder from columns.
3. US3: chart synchronization with filters/selection.
4. US4: pivot-style summaries.
5. Polish and release-control validation.

### Current User Request Strategy

Lucy asked to run Option B, so implementation should proceed through US1-US4 locally, then validate. Production deploy is not included unless explicitly requested after validation.
