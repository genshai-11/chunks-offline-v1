# UI Contract: Dynamic Data Explorer & Chart Builder

**Feature**: 002-dynamic-data-explorer  
**Date**: 2026-07-07

## Surface

The Data Explorer appears inside Reports & History as a teacher/reporting-only surface.

## Inputs

- Live report scope from the Reports page:
  - selected room
  - selected learner
  - date preset or date range
- Live response-related rows loaded from the current application state.
- User grid interactions:
  - filters
  - sorting
  - column visibility/order
  - row selection
  - grouping fields
- User chart interactions:
  - chart type
  - category field
  - value field
  - aggregation
  - chart scope

## Outputs

- A grid of normalized explorer rows.
- Visible/selected/total row counts.
- One or more chart views derived from the current chart definitions.
- Pivot-style summary rows derived from current filtered rows.
- Empty/loading/error states when data is unavailable or selections are incompatible.

## Required User Actions

### Grid Actions

- Sort by a column.
- Filter by column values or global text search.
- Hide/show columns.
- Select/clear rows.
- Group by one or more eligible fields.

### Column Menu / Context Actions

For eligible fields, the column menu must expose:

- Use as chart category.
- Use as chart value.
- Group by this column.
- Hide column.
- Clear filter for this column.

### Chart Builder Actions

- Create chart.
- Change chart type.
- Change category field.
- Change value field.
- Change aggregation.
- Switch scope between filtered rows and selected rows.
- Remove chart from the temporary workspace.

## Chart Compatibility Rules

- Category charts require a category-compatible field and an aggregation.
- Pie/donut charts require a category-compatible field and one aggregate value.
- Scatter charts require two numeric-compatible fields.
- Line/area charts should prefer ordered category or date/round fields.
- Incompatible combinations must show a friendly explanation and avoid stale chart data.

## State Synchronization Rules

- Chart data recalculates when filters change.
- Chart data recalculates when row selection changes and chart scope is selected rows.
- Chart data recalculates when chart configuration changes.
- Sorting affects grid display order and may affect chart ordering only when the chart definition asks to follow grid order.
- Clearing filters restores chart data to all loaded rows for filtered-row charts.

## Safety Rules

- This surface must not render inside learner-only routes.
- This surface must not expose teacher-only answer text or learner audio controls.
- This surface must not mutate classroom scoring, live room status, rounds, responses, or learner progress.
