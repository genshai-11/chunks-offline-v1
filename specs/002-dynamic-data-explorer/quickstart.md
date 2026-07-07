# Quickstart Validation: Dynamic Data Explorer & Chart Builder

**Feature**: 002-dynamic-data-explorer  
**Date**: 2026-07-07

## Prerequisites

- Live Supabase data is available.
- Reports & History can load rooms, rounds, learners, responses, and sentence resources.
- At least one room has learner responses for chart validation.

## Local Validation Commands

```bash
npm run lint
npm run build
npm run dev
```

Open:

```text
http://localhost:3000/reports
```

## Scenario 1: Data Explorer loads live rows

1. Open Reports & History.
2. Select the Data Explorer tab or section.
3. Confirm a loading state appears before data is shown when data is still loading.
4. Confirm the grid shows response rows with learner, room, round, compact sentence code, grade, CCI, CVR, CPD, reflection time, and timestamp fields.
5. Confirm total row count matches the loaded response scope.

**Expected**: Grid rows are live-data derived and no mock rows appear.

## Scenario 2: Filter and sort rows

1. Filter to room `CH-TEST` or another known room.
2. Filter to one learner.
3. Sort CPD descending.
4. Hide a nonessential column.

**Expected**: Visible row count changes after filters, sorted rows put highest CPD first, and hidden columns disappear without changing source data.

## Scenario 3: Create chart from columns

1. Open a column menu for learner.
2. Choose use as chart category.
3. Open a column menu for CPD.
4. Choose use as chart value.
5. Set aggregation to maximum.
6. Create a bar chart.

**Expected**: Chart shows max CPD per learner using the current filtered rows.

## Scenario 4: Chart updates with filters

1. Create a CPD by learner chart.
2. Apply a grade filter such as Red or Green.
3. Clear the grade filter.

**Expected**: Chart values change when the filter is applied and return when the filter is cleared.

## Scenario 5: Selected-row chart scope

1. Select several rows in the grid.
2. Switch chart scope to selected rows.
3. Clear selection.

**Expected**: Chart uses only selected rows, then shows a clear selected-row empty state after selection is cleared.

## Scenario 6: Pivot-style summary

1. Group rows by learner and grade.
2. Add count and max CPD summaries.
3. Apply a room or learner filter.

**Expected**: Summary rows recalculate using the filtered scope and match visible grid data.

## Scenario 7: Empty and incompatible states

1. Apply a filter that returns no rows.
2. Try creating a scatter chart using non-numeric fields.

**Expected**: Empty state appears with no stale chart values; incompatible chart selection is disabled or explained.

## Production Release Checklist

Only if deploying:

- Commit changes before deploy.
- Push to main.
- Create/push release tag.
- Validate Firebase preview/canary.
- Deploy production through release controls.
- Verify production Reports route.
- Record release in `docs/deployment-log.md`.
- Keep rollback path tied to release tag.
