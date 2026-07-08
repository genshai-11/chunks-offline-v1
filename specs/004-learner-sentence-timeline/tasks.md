# Tasks: Learner Sentence Timeline

**Input**: Design documents from `/specs/004-learner-sentence-timeline/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Verify and check imports for `recharts` and lucide icons in `src/components/HistoryTab.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [x] T002 Verify types `Course`, `Lesson`, `SentenceResource`, `PracticeRoom`, `RoomRound`, `LearnerResponse`, `Learner` are loaded and aligned in `src/components/HistoryTab.tsx`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Multi-Learner CPD Line Chart (Priority: P1) 🎯 MVP

**Goal**: Render a line chart displaying CPD metrics for up to 10 unique learners with distinct colored lines.

**Independent Test**: Load the Reports tab, select a session, and check if the Line chart renders lines for up to 10 learners, each color-coded with a legend mapping names.

### Implementation for User Story 1

- [x] T003 [US1] Create the dynamic learner grouping and data reshaping logic for `learnerSentenceChartData` in `src/components/HistoryTab.tsx`
- [x] T004 [US1] Refactor the chart rendering layout in `src/components/HistoryTab.tsx` to use Recharts `<LineChart>` and render dynamic `<Line>` series for active learners
- [x] T005 [US1] Add a palette of 10 distinct, high-contrast colors and map them to the lines and the chart legend in `src/components/HistoryTab.tsx`

**Checkpoint**: User Story 1 is functional (multi-line CPD chart displays).

---

## Phase 4: User Story 2 - Timeline Sorting & Difficulty Analysis (Priority: P2)

**Goal**: Support X-axis sorting by round chronological sequence, CVR value, or CCI Standard X value.

**Independent Test**: Use the "Sort X" dropdown and verify that chart data and labels rearrange according to the selected sorting option.

### Implementation for User Story 2

- [x] T006 [US2] Update the X-axis key sorting and formatting logic in `learnerSentenceChartData` to support `round`, `cvr`, and `cci` values in `src/components/HistoryTab.tsx`

**Checkpoint**: User Story 2 is functional (interactive sorting works).

---

## Phase 5: User Story 3 - Responsive Grid Dashboard with Detailed Tooltips (Priority: P3)

**Goal**: Place controls and chart in a responsive 12-column grid layout and add a rich metadata tooltip.

**Independent Test**: Resize browser window to check layout responsiveness. Hover over points to view detailed student response telemetry.

### Implementation for User Story 3

- [x] T007 [US3] Refactor the container elements in `src/components/HistoryTab.tsx` to use the layout class `bg-white border border-slate-200 rounded-2xl p-5 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-6`
- [x] T008 [US3] Layout the controls and descriptions in `lg:col-span-4` (sidebar) and the chart container in `lg:col-span-8` inside `src/components/HistoryTab.tsx`
- [x] T009 [US3] Implement custom `<Tooltip>` content in `src/components/HistoryTab.tsx` showing the learner's name, sentence details, round index, CPD value, CVR, CCI standard, and grade color

**Checkpoint**: All user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, codebase hygiene, and optimizations

- [x] T010 Run direct TypeScript validation using `npx tsc --noEmit` and check build using `npm run build`
- [x] T011 Run all manual validation scenarios in `specs/004-learner-sentence-timeline/quickstart.md`
- [ ] T012 Commit changes with clean hygiene and the Craft Agent co-author trailer
