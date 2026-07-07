# Data Model: Dynamic Data Explorer & Chart Builder

**Feature**: 002-dynamic-data-explorer  
**Date**: 2026-07-07

## Explorer Row

Represents one live classroom response enriched with classroom, learner, round, sentence, and score context.

### Fields

- `id`: durable response identifier
- `learnerId`: durable learner identifier
- `learnerName`: learner display label
- `roomId`: durable room identifier
- `roomCode`: classroom room code
- `roomTitle`: classroom room title
- `roundId`: durable round identifier
- `roundIndex`: round sequence number
- `sentenceResourceId`: durable sentence resource identifier
- `sentenceCode`: compact sentence label for display
- `sentenceCodeFull`: full sentence code for tooltips/details
- `grade`: response color/grade label
- `cciPerformanceY`: numeric CCI performance result for the grade
- `cciStandardX`: numeric CCI standard for the round
- `cciResult`: computed CCI result stored with response
- `cvrValue`: CVR multiplier used for the round
- `cpdResult`: CPD score stored with response
- `reflectionSeconds`: response reflection time in seconds
- `submittedAt`: response submission timestamp
- `status`: response finalization/capture status when available

### Relationships

- Many Explorer Rows belong to one learner.
- Many Explorer Rows belong to one practice room.
- One Explorer Row belongs to one round and one sentence resource.
- Explorer Rows are read-only projections and do not own source data.

### Validation Rules

- `learnerId` is the aggregation key when available; `learnerName` is a label only.
- Numeric fields must be normalized to numbers or `null` before aggregation.
- Missing joins must produce safe fallback labels without hiding the row.
- Compact sentence labels must retain access to the full sentence code.

## Explorer Column

Represents a configurable field in the explorer grid.

### Fields

- `key`: stable column key
- `label`: display label
- `type`: one of text, number, date, categorical, boolean, or identifier
- `visible`: whether the column is currently shown
- `sortable`: whether sorting is allowed
- `filterable`: whether filtering is allowed
- `chartRole`: supported chart role: category, value, both, or none
- `aggregationDefaults`: suitable default aggregations for the field

### Validation Rules

- Identifier columns may be hidden by default but must remain available for troubleshooting.
- Numeric value columns must support count and compatible numeric aggregations.
- Text/categorical columns must support category grouping and counting.

## Grid View State

Represents the current user-controlled grid interaction state.

### Fields

- `sorting`: ordered sort rules
- `filters`: active column/global filters
- `columnVisibility`: visible/hidden column map
- `columnOrder`: current display order
- `rowSelection`: selected row identifiers
- `grouping`: selected grouping fields for summaries
- `scope`: currently loaded report scope inherited from Reports filters

### State Rules

- Grid View State is non-authoritative and must not mutate classroom scoring data.
- Clearing filters restores all loaded rows to the explorer view.
- Selected-row chart scope must become empty if no selected rows are visible.

## Chart Definition

Represents one user-created chart configuration.

### Fields

- `id`: local chart identifier
- `title`: user-visible chart title
- `chartType`: bar, line, area, pie/donut, or scatter-style
- `categoryField`: field used for grouping or x-axis
- `valueField`: numeric field used for aggregation or y-axis
- `secondaryValueField`: optional second numeric field for scatter or comparison
- `aggregation`: count, sum, average, min, max, or distinct count
- `scope`: filtered rows or selected rows
- `sortMode`: optional chart ordering behavior

### Validation Rules

- Bar, line, area, and pie/donut charts require a category field and an aggregation.
- Scatter charts require two numeric-compatible fields.
- Incompatible chart types must be disabled or explained.
- Chart data must be recalculated from the current grid-derived row set.

## Pivot Summary

Represents grouped aggregate rows derived from the explorer row set.

### Fields

- `groupFields`: fields used to form groups
- `metricFields`: fields aggregated per group
- `aggregations`: aggregation rules per metric
- `rows`: calculated grouped results

### Validation Rules

- Summaries use filtered rows, not all source rows, unless filters are cleared.
- Missing numeric values are ignored for numeric aggregations.
- Count aggregation includes rows even when a specific numeric value is missing.
