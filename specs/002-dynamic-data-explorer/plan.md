# Implementation Plan: Dynamic Data Explorer & Chart Builder

**Branch**: `002-dynamic-data-explorer` | **Date**: 2026-07-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-dynamic-data-explorer/spec.md`

**Note**: This plan follows the Spec Kit workflow for the user-approved Option B: open-source controlled grid state + project-owned chart rendering.

## Summary

Add a read-only Data Explorer inside Reports & History that normalizes live classroom response data into a powerful grid and lets teachers create dynamic charts from the current grid state. The implementation will also add a Progress Insights Chart Studio that documents supported progress chart templates, required inputs, and data-processing rules with a live preview from current filters. The implementation will use a headless table/grid engine for filtering, sorting, column visibility, row selection, and grouping; existing chart rendering patterns will derive chart data from filtered or selected rows. The first release keeps chart definitions temporary and avoids database mutations.

## Technical Context

**Language/Version**: TypeScript 5.8, React 19, Vite 6

**Primary Dependencies**: Existing React, Recharts, Tailwind CSS, Supabase client; add `@tanstack/react-table`, `@tanstack/react-virtual`, and optionally `@tremor/react` for dashboard UI polish if compatible with current React/Tailwind setup

**Storage**: Live Supabase project `ftfxekdxeoxizoyxuqoz` as source of record; browser state only for temporary explorer UI interactions

**Testing**: `npm run lint` (`tsc --noEmit`), `npm run build`, local browser validation against live Supabase data

**Target Platform**: Browser web app hosted on Firebase Hosting

**Project Type**: Single React web application

**Performance Goals**: Explorer interactions recalculate visible rows and chart data within two seconds for up to 5,000 response rows; grid remains responsive through pagination or virtualization

**Constraints**: Read-only for classroom scoring data; no learner-screen exposure; no mock fallback in product flow; no production deploy without release controls

**Scale/Scope**: Initial release targets Reports & History analytics for classroom response datasets up to 5,000 rows and at least 20 displayable fields

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Live DB as system of record**: PASS. Feature reads from live `learners`, `practice_rooms`, `room_rounds`, `learner_responses`, `learner_progress`, and `sentence_resources` already loaded by Reports.
- **No mock data in product flows**: PASS. Explorer must not use sandbox/mock rows; empty states are required when live data is absent.
- **Typed schema and drift control**: PASS WITH TASK. Implementation must keep domain row types aligned with existing `types.ts` and current Supabase result shapes; no migration planned for v1.
- **Page-level verification**: PASS WITH TASK. Reports & History must validate loading, empty, error, filter, sort, selection, chart, refresh behavior.
- **Live session orchestration**: PASS. Feature is read-only and does not mutate rooms, rounds, responses, roster sync, lockout, or advance behavior.
- **Learner continuity**: PASS. Explorer row aggregation uses durable `learnerId`; display names are labels.
- **Release controls**: PASS WITH TASK. Production deploy requires commit, tag, preview/canary, rollback, restore-path, and deployment log.

## Project Structure

### Documentation (this feature)

```text
specs/002-dynamic-data-explorer/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── data-explorer-ui-contract.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── HistoryTab.tsx                  # Integrate Data Explorer tab and Progress Chart Studio
│   └── DataExplorerTab.tsx             # New explorer UI surface
├── lib/
│   ├── dataExplorer.ts                 # Normalize report rows and aggregate chart data
│   └── resourceCode.ts                 # Existing compact sentence-code helper
└── types.ts                            # Add explorer row/chart types if needed
```

**Structure Decision**: Add a focused `DataExplorerTab.tsx` component and `dataExplorer.ts` helper module rather than expanding `HistoryTab.tsx` further. `HistoryTab.tsx` should only pass live report datasets and active filters into the explorer.

## Phase 0: Research Summary

See [research.md](./research.md).

Key decisions:

- Use a headless grid state layer with project-owned UI.
- Use current live Reports data as the initial row source.
- Derive charts from filtered or selected grid rows.
- Keep chart definitions temporary for v1.
- Implement pivot-style summaries as grouped aggregations, not full spreadsheet parity.
- Defer production deploy until release controls are explicitly requested.

## Phase 1: Design Summary

See [data-model.md](./data-model.md) and [contracts/data-explorer-ui-contract.md](./contracts/data-explorer-ui-contract.md).

Design outputs:

- Explorer Row: normalized read-only response record.
- Explorer Column: type-aware grid/chart metadata.
- Grid View State: temporary UI state for filters, sorting, visibility, grouping, selection.
- Chart Definition: temporary chart configuration.
- Pivot Summary: grouped aggregate results derived from explorer rows.

## Validation Plan

See [quickstart.md](./quickstart.md).

Required local validation:

```bash
npm run lint
npm run build
npm run dev
```

Manual validation must cover:

- live row loading;
- filter/sort/column visibility;
- row selection;
- chart creation from column controls;
- chart recalculation after filters/selections;
- Progress Insights chart template catalog and live preview;
- pivot-style summaries;
- empty and incompatible chart states;
- learner-only route remains safe.

## Post-Design Constitution Check

- **Live DB as system of record**: PASS. All explorer rows are read-only projections of live data.
- **No mock data in product flows**: PASS. Quickstart requires live-data validation and empty states.
- **Typed schema and drift control**: PASS WITH TASK. Add explicit explorer types and run TypeScript validation.
- **Page-level verification**: PASS WITH TASK. Quickstart defines Reports validation scenarios.
- **Live session orchestration**: PASS. No live session mutation introduced.
- **Learner continuity**: PASS. Learner id remains aggregation key.
- **Release controls**: PASS WITH TASK. Production release steps documented in quickstart.

## Complexity Tracking

No constitution violations requiring complexity justification.

## Agent Context Update

No `.specify/scripts/powershell/update-agent-context.ps1` script exists in this initialized Spec Kit preset. Existing project context remains governed by `AGENTS.md`, `.specify/memory/constitution.md`, and this feature plan.
