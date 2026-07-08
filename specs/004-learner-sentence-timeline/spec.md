# Feature Specification: Learner Sentence Timeline

**Feature Branch**: `004-learner-sentence-timeline`

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Learner Sentence Timeline — CPD by sentence point (help me add this chart into this: bg-white border border-slate-200 rounded-2xl p-5 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-6 - dạng biểu đồ đường 10 người chơi có 10 đường line màu khách nhau - và có laber tên leaner - đọc @[AGENTS.md] và run skills trong @[.agents])"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Multi-Learner CPD Line Chart (Priority: P1)

Teachers need a clear, visual way to monitor and compare the oral fluency (CPD) of multiple learners side-by-side across a sequence of sentences during a lesson. The chart must plot up to 10 active learners, each represented by a distinct colored line, with clear labels/legend identifying the learners.

**Why this priority**: Core requirement for visualizing classroom-wide fluency patterns and progress trends.

**Independent Test**: Filter historical room data and check if the Line chart is rendered with up to 10 distinct lines corresponding to the 10 most active learners. Verify that each line has a unique, high-contrast color and that the legend matches the display names of the learners.

**Acceptance Scenarios**:

1. **Given** a live room session with multiple learners who have submitted responses, **When** the teacher views the Reports & History tab, **Then** the "Learner Sentence Timeline" is displayed as a LineChart with distinct lines for each learner.
2. **Given** a room session with more than 10 learners, **When** the timeline is rendered, **Then** the chart automatically filters and displays only the top 10 learners (sorted by total number of responses) to maintain readability, while displaying a note indicating the subset shown.

---

### User Story 2 - Timeline Sorting & Difficulty Analysis (Priority: P2)

Teachers need to analyze CPD trends against different dimensions. They must be able to change the sorting of the X-axis between chronological order (round-by-round), sentence difficulty (CVR Ω ascending), and target standards (CCI Standard X ascending).

**Why this priority**: Essential for diagnosing whether learners are struggling due to lesson progression, sentence difficulty, or specific grammar/vocabulary standards.

**Independent Test**: Toggle the "Sort X" dropdown options and verify that the line nodes rearrange correctly and the X-axis labels update according to the selected dimension.

**Acceptance Scenarios**:

1. **Given** the line chart, **When** the teacher selects "Round / time order", **Then** the points on the X-axis are sorted chronologically by round index.
2. **Given** the line chart, **When** the teacher selects "CVR Ω ascending", **Then** the points on the X-axis are sorted from lowest to highest sentence CVR value.
3. **Given** the line chart, **When** the teacher selects "CCI Standard X ascending", **Then** the points on the X-axis are sorted from lowest to highest CCI Standard card value.

---

### User Story 3 - Responsive Grid Dashboard with Detailed Tooltips (Priority: P3)

The chart needs to look premium and fit seamlessly into the existing dashboard. It must be wrapped in a responsive Tailwind grid layout (`grid grid-cols-1 lg:grid-cols-12 gap-6`). Hovering over any point on a line should display a detailed popover tooltip with complete round telemetry.

**Why this priority**: Guarantees premium design aesthetics, readability on both desktop and mobile, and quick access to precise numerical data.

**Independent Test**: Resize the window to verify the layout shifts cleanly from 1 column on mobile to 12 columns on desktop. Hover over any node in the line chart to verify all details (learner name, sentence, round, CPD, CVR, CCI standard info, and grade color) are rendered in the custom tooltip.

**Acceptance Scenarios**:

1. **Given** a large screen (desktop), **When** viewing the page, **Then** the layout splits into a controls/stats sidebar (`lg:col-span-4`) and the main line chart (`lg:col-span-8`).
2. **Given** a line node on the chart, **When** hovered by the user, **Then** a clean, custom tooltip card shows detailed metadata for that response.

---

### Edge Cases

- **Missing Responses**: If a learner is absent or skips certain rounds, their line should connect through the missing data points smoothly (`connectNulls={true}`) rather than breaking the line, but still preserve distinct markers on rounds where they did respond.
- **Zero Responses**: When no response telemetry is available under the active filters, the chart area must show a clear placeholder message: "Không có bản ghi điểm số nào khớp với bộ lọc ngày để dựng đồ thị." instead of rendering empty axes.
- **Learners with Identical Names**: If two distinct learners share the same display name, they must be plotted as separate lines with unique color assignments, distinguished internally by `learner_id` to prevent data merging.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The "Learner Sentence Timeline — CPD by sentence point" MUST be rendered as a Recharts `LineChart` component.
- **FR-002**: The chart MUST display lines for up to 10 unique learners.
- **FR-003**: The chart MUST assign a distinct color to each learner's line using a curated, high-contrast palette of 10 colors.
- **FR-004**: The chart MUST include a legend mapping each line's color to the learner's display name.
- **FR-005**: The container for this section MUST be styled exactly as: `bg-white border border-slate-200 rounded-2xl p-5 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-6`.
- **FR-006**: The controls/explanation section MUST be placed in the sidebar (`lg:col-span-4`), and the interactive LineChart MUST occupy the main panel (`lg:col-span-8`).
- **FR-007**: The controls sidebar MUST include a "Sort X" dropdown selector allowing the user to select:
  - "Round / time order"
  - "CVR Ω ascending"
  - "CCI Standard X ascending"
- **FR-008**: The line chart MUST support interactive tooltips showing the learner name, sentence code, round number, CPD (V), CVR Ω, CCI Standard X & Y, and the response grade color.
- **FR-009**: The chart lines MUST use `connectNulls={true}` to ensure lines are continuous even if a learner missed certain rounds.
- **FR-010**: All data displayed in the chart MUST be sourced dynamically from the live Supabase tables (`learner_responses` joined with `room_rounds` and `learners`), adhering to the project's live system of record principle.

### Key Entities

- **LearnerResponse**: Represents a student's submission. Attributes: `learner_id`, `round_id`, `cpd_result`, `response_color`, `submitted_at`.
- **Learner**: Represents the student. Attributes: `id`, `display_name`.
- **RoomRound**: Represents a session round. Attributes: `id`, `round_index`, `sentence_resource_id`.
- **SentenceResource**: Represents the sentence prompt. Attributes: `id`, `sentence_code`, `cvr_value`, `cci_standard_x`.

### Live Data and Mock-Removal Requirements

- **Data source of record**: Live database tables: `learner_responses`, `room_rounds`, `learners`, and `sentence_resources`.
- **Mock/sandbox paths affected**: None. The history reporting system already reads exclusively from live Supabase collections.
- **Page verification scope**: Reports & History tab (`HistoryTab`). Must verify rendering with 1-10 learners, multi-learner filter responsiveness, and sorting behavior.
- **Live session integrity scope**: No live session impact.
- **Learner continuity impact**: Aggregations are calculated using unique `learner_id` keys, ensuring progress is tracked by durable learner identity.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Teachers can load the history tab and visualize the CPD timeline for up to 10 learners in under 1.5 seconds under standard network conditions.
- **SC-002**: The line chart renders up to 10 distinct, colored lines representing 10 different learners without line overlapping, color collisions, or performance degradation.
- **SC-003**: 100% of telemetry data points on the lines correspond to actual live database records in `learner_responses`.

## Assumptions

- **Stable Workspace**: The required charting library (`recharts`) is already installed and fully integrated.
- **Filtered Scope**: The visual chart only displays responses from the currently filtered room/session and period.
- **Legend Wrap**: If learner names are long, the Recharts legend will wrap cleanly to avoid cutting off labels.
