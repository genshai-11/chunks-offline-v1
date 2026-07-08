# Implementation Plan: Learner Sentence Timeline

**Branch**: `004-learner-sentence-timeline` | **Date**: 2026-07-08 | **Spec**: [/specs/004-learner-sentence-timeline/spec.md](file:///C:/Users/tamha/OneDrive/Documents/lucy/chunks-offline-v1/specs/004-learner-sentence-timeline/spec.md)

**Input**: Feature specification from `/specs/004-learner-sentence-timeline/spec.md`

## Summary

The feature introduces a new line-chart visualization: "Learner Sentence Timeline — CPD by sentence point". It replaces or upgrades the existing scatter timeline in `HistoryTab.tsx` with a multi-series line chart. It will plot up to 10 unique learners, each with their own line in a unique color. The container layout is refactored into a `grid grid-cols-1 lg:grid-cols-12 gap-6` with sidebar controls on the left and the chart on the right.

## Technical Context

**Language/Version**: TypeScript 5.8, React 19.0

**Primary Dependencies**: Recharts 3.9, Tailwind CSS 4.1, Lucide React

**Storage**: Supabase PostgreSQL (`learner_responses`, `room_rounds`, `learners`, `sentence_resources`)

**Testing**: Local validation via build and running dev server, linting check

**Target Platform**: Modern browsers (Chrome, Safari, Edge, Firefox), fully responsive

**Project Type**: Single Page Web Application (Vite + React)

**Performance Goals**: Under 100ms render time for 120 timeline data points

**Constraints**: Live database as system of record, no mock data, client-side only aggregation

**Scale/Scope**: Up to 10 lines (learners), up to 120 data points per line (capped at 120 total timeline records to avoid rendering performance bottlenecks)

## Constitution Check

- **Live DB as system of record**: Uses the existing database models loaded by the parent App component (`responses`, `rounds`, `learners`, `resources`).
- **No mock data in product flows**: Verified. Only real response data from Supabase is passed to `HistoryTab`.
- **Typed schema and drift control**: Mapped properties comply with the existing database schema.
- **Page-level verification**: Reports & History tab will be validated with live data, checking the loading, empty, and populated states.
- **Live session orchestration**: Non-intrusive to the Teacher Console active live session flow.
- **Learner continuity**: Progress lines are categorized using `learner_id` to guarantee accurate tracking.
- **Release controls**: Local validation using `npm run lint` and `npm run build`.

## Project Structure

### Documentation (this feature)

```text
specs/004-learner-sentence-timeline/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code

```text
src/
├── components/
│   └── HistoryTab.tsx   # File to be modified
```

**Structure Decision**: Single component modification in `src/components/HistoryTab.tsx`.

## Complexity Tracking

No violations of the Constitution.
