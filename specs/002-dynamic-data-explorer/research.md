# Research: Dynamic Data Explorer & Chart Builder

**Feature**: 002-dynamic-data-explorer  
**Date**: 2026-07-07

## Decision: Use a headless grid state engine with project-owned UI

**Decision**: Build the explorer with a headless table/grid state layer and existing project UI styling. Use the grid state as the single source for filters, sorting, visibility, selection, grouping, and chart input rows.

**Rationale**: The product already has a custom Tailwind/Recharts reporting surface. A headless approach keeps the visual design consistent and gives full control over learner-safety constraints, live-data loading states, and chart synchronization.

**Alternatives considered**:

- **Full enterprise grid suite**: Provides pivot and integrated charts quickly, but introduces licensing and product-control concerns for advanced features.
- **Dashboard-only chart kit**: Useful for polished charts/cards but does not provide robust grid state, row selection, column menus, or pivot-style behavior by itself.
- **Continue fixed report charts only**: Lowest implementation cost but fails the user goal of creating charts dynamically from current grid state.

## Decision: Use current reporting data as the initial row source

**Decision**: Start from the same live response, learner, room, round, sentence, and progress data already loaded by Reports & History, then normalize it into explorer rows.

**Rationale**: This satisfies the live-database constitution without introducing new schema or persistence risk. It also lets the first implementation validate behavior against existing seeded/live classroom datasets.

**Alternatives considered**:

- **New database view/RPC first**: Cleaner long-term for large datasets, but unnecessary for the initial read-only explorer and would require migration/release planning.
- **Client-only mock rows**: Rejected because product flows must not use mock data.

## Decision: Charts are derived from filtered or selected grid rows

**Decision**: Chart calculations should consume either the current filtered rows or selected rows, based on an explicit chart scope switch.

**Rationale**: This directly supports the requirement that charts update when grid filters and selections change. It avoids ambiguous chart totals and makes validation straightforward.

**Alternatives considered**:

- **Charts always use all loaded rows**: Easier but violates the user expectation that grid filters drive chart output.
- **Charts only use selected rows**: Too restrictive for quick exploratory summaries.

## Decision: First release uses temporary chart definitions

**Decision**: User-created charts are temporary in the current browser session for the first release; saved dashboards are out of scope.

**Rationale**: The user requested immediate dynamic chart creation, not dashboard persistence. Keeping definitions temporary avoids new schema, permissions, and migration work.

**Alternatives considered**:

- **Persist chart definitions to database**: Useful later, but would require ownership, sharing, permissions, and migration design.
- **Persist only to local storage**: Could create confusing non-authoritative state and conflicts with the live-data governance model if treated as product data.

## Decision: Pivot-style summaries are grouped aggregations, not spreadsheet parity

**Decision**: Implement pivot-style value summaries as grouped aggregate views generated from explorer rows.

**Rationale**: The user needs behavior insights such as CPD by CVR, grade distribution by learner, and red-rate by CCI. Grouped aggregation satisfies that without building a full spreadsheet engine.

**Alternatives considered**:

- **Full pivot table engine**: Powerful but higher complexity and likely dependency/licensing tradeoffs.
- **No pivot capability**: Leaves a major part of the request unmet.

## Decision: Defer production deploy until release controls are explicitly requested

**Decision**: Implement locally with validation first; production deploy requires commit, tag, preview/canary, rollback path, and deployment log update.

**Rationale**: The project runbook and Lucy preferences require release controls for web app production deploys.

**Alternatives considered**:

- **Direct production deploy after coding**: Rejected because it violates release-control policy.
