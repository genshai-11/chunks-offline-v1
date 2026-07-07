# Feature Specification: Dynamic Data Explorer & Chart Builder

**Feature Branch**: `002-dynamic-data-explorer`

**Created**: 2026-07-07

**Status**: Draft

**Input**: User description: "Run Option B: add a dynamic data explorer where database rows load into a powerful grid with filter, sort, group, pivot-style summaries, row selection, column menus, right-click chart creation, and charts that update when the grid view changes. Use an open-source controlled stack and create the Spec Kit feature spec before coding."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Explore live classroom data in a grid (Priority: P1)

A teacher opens a Data Explorer from Reports and sees live classroom response data in a configurable grid. The teacher can sort, filter, search, show or hide columns, and select rows to narrow the dataset without leaving the page.

**Why this priority**: The grid is the source interaction surface for all later charting. Without trustworthy filtered rows, charts cannot reflect teacher intent.

**Independent Test**: Can be fully tested by opening Reports, selecting Data Explorer, filtering to a specific room or learner, sorting by CPD, hiding columns, and confirming that the visible row count and selected row count are correct.

**Acceptance Scenarios**:

1. **Given** live response records exist, **When** the teacher opens Data Explorer, **Then** the grid shows normalized rows with learner, room, round, sentence code, grade, CCI, CVR, CPD, reflection time, and timestamp fields.
2. **Given** the grid is loaded, **When** the teacher filters by learner and grade, **Then** the visible rows update and summary counts reflect only matching rows.
3. **Given** many rows are present, **When** the teacher sorts CPD descending, **Then** the highest CPD rows appear first without changing the underlying saved classroom data.
4. **Given** columns are not all relevant, **When** the teacher hides or shows columns, **Then** the preference affects only the current explorer view and does not corrupt report data.

---

### User Story 2 - Create charts directly from grid columns (Priority: P2)

A teacher can choose columns from the grid and create a chart immediately. The teacher can set a category axis, value metric, chart type, and aggregation method to answer questions such as “Which CVR levels produce the highest CPD?” or “How does performance change by learner over rounds?”

**Why this priority**: This turns the reports page from fixed dashboards into an exploratory analysis tool, reducing the need for custom chart requests for every new question.

**Independent Test**: Can be tested by choosing one categorical column and one numeric column, creating a bar chart, switching to a line chart, changing aggregation from average to maximum, and confirming chart values match the grid rows.

**Acceptance Scenarios**:

1. **Given** a teacher has visible grid rows, **When** the teacher selects `learner` as category and `CPD` as value with maximum aggregation, **Then** the chart shows one result per learner using only visible rows.
2. **Given** a chart exists, **When** the teacher changes chart type from bar to line or pie where compatible, **Then** the visualization updates without requiring a page reload.
3. **Given** the teacher right-clicks or opens a column menu for a numeric column, **When** the teacher chooses “Use as chart value,” **Then** the chart builder uses that column as the current value metric.
4. **Given** the teacher right-clicks or opens a column menu for a categorical/date-like column, **When** the teacher chooses “Use as chart category,” **Then** the chart builder uses that column as the current grouping axis.

---

### User Story 3 - Keep charts synchronized with grid state (Priority: P3)

A teacher applies filters, sorting, row selection, or grouping in the grid and expects existing charts to update to the same analysis scope. The teacher can decide whether charts should use all filtered rows or only selected rows.

**Why this priority**: Synchronization is what makes the explorer feel like one coherent BI workspace instead of separate grid and chart widgets.

**Independent Test**: Can be tested by creating a chart, applying a grid filter, selecting several rows, switching between “filtered rows” and “selected rows,” and verifying chart totals change accordingly.

**Acceptance Scenarios**:

1. **Given** a chart is based on filtered rows, **When** the teacher filters the grid to one room, **Then** the chart recalculates using only that room’s visible rows.
2. **Given** several rows are selected, **When** the teacher switches chart scope to selected rows, **Then** the chart recalculates using only selected rows.
3. **Given** a selected-row chart has no selected rows, **When** the teacher views the chart area, **Then** the UI explains that row selection is required and does not show misleading totals.

---

### User Story 4 - Build pivot-style summaries for classroom behavior (Priority: P4)

A teacher can create simple pivot-style summaries by choosing row groups and value aggregations. This helps identify behavior patterns such as grade distribution by learner, CPD by CVR level, or red-rate by CCI standard.

**Why this priority**: Pivot-style summaries answer higher-level behavior questions, but the MVP remains valuable with grid and chart builder alone.

**Independent Test**: Can be tested by grouping rows by learner and grade, aggregating response count and maximum CPD, and verifying totals match the filtered grid.

**Acceptance Scenarios**:

1. **Given** the teacher groups by learner and grade, **When** summaries are shown, **Then** each group displays response count and selected numeric aggregations.
2. **Given** filters are active, **When** pivot-style summaries are shown, **Then** summaries use only the filtered data scope.

### Edge Cases

- If no live response data exists, the explorer shows an empty state with guidance to run a live classroom session first.
- If filters remove all rows, the grid and charts show a clear “no matching rows” state without stale chart values.
- If a selected chart type is incompatible with chosen columns, the UI disables that chart type or explains which column type is required.
- If a numeric field contains missing values, aggregations ignore missing values and indicate when no valid numeric data remains.
- If row selection is active but selected rows are later filtered out, the chart scope and selected count update consistently.
- If the dataset grows large, the grid remains usable through paging or virtualization and avoids freezing the browser.
- If learner, room, or sentence references are missing, rows show safe fallback labels while preserving durable identifiers for troubleshooting.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a Data Explorer entry point within the reporting area for live classroom analytics.
- **FR-002**: System MUST load normalized report rows from live classroom data and include learner, room, round, sentence, grade, CCI, CVR, CPD, reflection time, and timestamp fields.
- **FR-003**: Users MUST be able to sort rows by any visible sortable column.
- **FR-004**: Users MUST be able to filter rows by text, categorical values, numeric ranges, and date/time where field types support those filters.
- **FR-005**: Users MUST be able to show, hide, and reorder columns within the explorer view.
- **FR-006**: Users MUST be able to select individual rows and clear row selection.
- **FR-007**: System MUST display visible-row count, selected-row count, and total-row count for the current explorer scope.
- **FR-008**: Users MUST be able to create a chart by choosing chart type, category field, value field, and aggregation method.
- **FR-009**: System MUST support at least bar, line, area, pie or donut, and scatter-style chart views where compatible with selected fields.
- **FR-010**: System MUST support at least count, sum, average, minimum, maximum, and distinct-count aggregations where compatible with selected fields.
- **FR-011**: Users MUST be able to initiate chart creation from a column menu or right-click context action for eligible columns.
- **FR-012**: System MUST keep chart data synchronized with the current grid filters and selected chart scope.
- **FR-013**: Users MUST be able to switch chart scope between all filtered rows and selected rows.
- **FR-014**: System MUST provide pivot-style summaries by grouping one or more fields and aggregating one or more numeric or count metrics.
- **FR-015**: System MUST protect learner-facing safety rules by keeping this explorer in teacher/reporting surfaces only, not in learner-only screens.
- **FR-016**: System MUST avoid persisting exploratory grid filters, chart definitions, or row selections as classroom scoring data unless a future explicit save feature is added.
- **FR-017**: System MUST provide clear empty, loading, and error states for data loading and chart generation.
- **FR-018**: System MUST retain full identifiers in tooltips or detail views when compact labels are displayed.
- **FR-019**: System MUST recalculate summaries and chart values within two seconds after normal filter, sort, selection, or chart-configuration changes for typical classroom report sizes.
- **FR-020**: System MUST not expose teacher-only answer text or audio controls to learner screens as part of this feature.
- **FR-021**: System MUST include a Progress Insights chart creation guide/module that lists supported progress chart types, required input parameters, and data-processing rules for choosing appropriate visualizations.
- **FR-022**: System MUST provide a live preview for selected Progress Insights chart templates using the current Reports filters and must preserve CPD as Max CPD V where aggregation is required.

### Key Entities *(include if feature involves data)*

- **Explorer Row**: A normalized classroom analytics record representing one learner response joined with its learner, room, round, sentence, score, and timestamp context.
- **Explorer Column**: A field definition describing display label, data type, visibility, filterability, sortability, and chart eligibility.
- **Grid View State**: The current non-authoritative state of filters, sorting, column visibility, grouping, and row selection.
- **Chart Definition**: A temporary analysis configuration containing chart type, category field, value field, aggregation method, and scope.
- **Progress Chart Template**: A teacher-facing chart recipe for learning behavior analytics, including chart type, use case, required inputs, and data-processing rule.
- **Pivot Summary**: A temporary grouped result that aggregates explorer rows by selected fields and metrics.

### Live Data and Mock-Removal Requirements *(mandatory for data features)*

- **Data source of record**: Live Supabase classroom/reporting tables, including `learners`, `practice_rooms`, `room_rounds`, `learner_responses`, `learner_progress`, and `sentence_resources` for labels and score context.
- **Mock/sandbox paths affected**: No mock or sandbox data may appear in the Data Explorer. Existing local-only helper paths must remain isolated from the production report flow.
- **Page verification scope**: Reports & History must prove loading, empty, error, refresh, filter, selection, chart, and summary behavior against live Supabase data.
- **Live session integrity scope**: No live session mutation is introduced. The explorer is read-only for classroom scoring and does not affect teacher round state, learner eligibility, first-response lockout, or auto/manual advance behavior.
- **Learner continuity impact**: All learner analytics must aggregate by durable `learners.id`; display names are labels only and must not become aggregation keys when learner ids are available.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A teacher can answer “Which learner has the highest CPD under the current filters?” in under 30 seconds without leaving Reports.
- **SC-002**: A teacher can create a first chart from live response data in under 60 seconds using grid column controls.
- **SC-003**: Charts reflect grid filter changes within two seconds for classroom report datasets up to 5,000 response rows.
- **SC-004**: At least five chart configurations can be created from the same filtered dataset without a page reload.
- **SC-005**: Row selection chart scope produces values matching the selected rows in 100% of validation cases.
- **SC-006**: Empty and no-match states produce zero misleading chart values during validation.
- **SC-007**: The explorer can display at least 20 fields while allowing users to hide nonessential fields.
- **SC-008**: Teachers can produce at least three behavior insights from existing classroom data: CPD by learner, CPD by CVR, and grade distribution by round or learner.
- **SC-009**: In Progress Insights, teachers can identify at least six supported chart templates and see the required inputs and processing rule for each template without opening developer documentation.

## Assumptions

- The primary users are teachers or operators viewing Reports, not learners.
- The first release is read-only and does not save user-created chart dashboards permanently.
- Existing report data already contains enough joined context to derive learner, room, round, sentence, CCI, CVR, CPD, and grade values.
- Compact sentence identifiers remain acceptable in the grid as long as full identifiers are available on hover or detail inspection.
- Pivot-style behavior in the first release means grouped summaries and aggregated values, not full spreadsheet parity.
- The feature should prioritize correctness and clarity over advanced export, dashboard sharing, or saved report templates.
