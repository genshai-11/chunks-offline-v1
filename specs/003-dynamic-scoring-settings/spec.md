# Feature Specification: Dynamic Scoring Settings, TTS Controls, and Learner Analytics

**Feature Branch**: `003-dynamic-scoring-settings`  
**Created**: 2026-07-07 12:33 GMT+7  
**Status**: Draft  
**Input**: Lucy requested Settings/database cleanup for CCI category/cards, dynamic CPD formula settings, learner preview layout ordering, TTS provider/model controls, removal of Chinese realtime formula label text, and learner-focused dynamic charts by sentence/time/CVR/CCI.

## User Scenarios & Testing

### User Story 1 - Manage CCI standard categories and cards safely (Priority: P1)

An operator can use Settings to manage CCI Standard Cards under the simplified categories M, S, and E, and can add or edit the category field directly rather than being forced into a fixed select-only list.

**Why this priority**: CCI Standard X is core scoring input. Incorrect category/card management can break teacher launch and historical reports.

**Independent Test**: Open Settings, view CCI/CVR matrices, confirm category options include M, S, E, add or edit a standard card category, and confirm live data refreshes without exposing learner screens.

**Acceptance Scenarios**:

1. **Given** Settings is open, **When** the operator creates or edits a CCI card, **Then** the category can be selected from M/S/E or typed as a new safe category value.
2. **Given** existing cards are referenced by classroom rounds, **When** the system replaces categories/cards, **Then** rollback instructions and FK-safe behavior preserve report history.
3. **Given** CCI categories are simplified, **When** the operator views the card list, **Then** category labels are readable and no legacy category-only workflow is required.

### User Story 2 - Configure scoring display and CPD formula behavior (Priority: P1)

An operator can see and tune how CPD is calculated, including a dynamic formula UI, while learner-facing copy uses English-only labels.

**Why this priority**: Teachers need to understand formula outputs; learners should not see confusing multilingual/Chinese labels.

**Independent Test**: Open Settings and Learner Terminal preview, confirm “Real-Time Calculation Logic” appears without Chinese text, and verify dynamic formula controls update preview results.

**Acceptance Scenarios**:

1. **Given** Settings is open, **When** the operator reviews formula settings, **Then** CPD calculation inputs are shown clearly and can be adjusted for preview.
2. **Given** learner UI setting is toggled, **When** the learner preview renders, **Then** the realtime formula block appears or hides using English-only label text.
3. **Given** scoring values change in preview, **When** a learner score button is selected, **Then** the preview recalculates CPD immediately.

### User Story 3 - Reorder learner screen live preview modules (Priority: P2)

An operator can customize the display order of learner preview modules through simple move controls and see the order reflected in the live preview.

**Why this priority**: Classroom operators need to tune learner UX density and priority without code changes.

**Independent Test**: Open Settings → Learner Frontend UI/UX, move Summary/Metadata/Status/Buttons/Formula modules up or down, and confirm the preview changes order.

**Acceptance Scenarios**:

1. **Given** the Learner Screen Live Preview exists, **When** the operator moves a module up or down, **Then** the preview order updates immediately.
2. **Given** layout settings are changed, **When** the page reloads, **Then** layout order persists locally with other learner UI settings.

### User Story 4 - Configure TTS provider/model settings (Priority: P2)

An operator can select TTS provider/model settings for EN and VI generation and pass those choices to the Supabase audio generation function.

**Why this priority**: Audio generation quality depends on model/voice selection and may need different models for English and Vietnamese.

**Independent Test**: Open Audio TTS Jobs or Library TTS flow, set provider/model/voice values, generate audio, and confirm the request records intended provider/model settings.

**Acceptance Scenarios**:

1. **Given** TTS settings are configured, **When** audio generation is triggered, **Then** provider/model/voice preferences are included in the generation request.
2. **Given** no custom settings exist, **When** audio is generated, **Then** safe defaults are used.
3. **Given** settings are changed, **When** the page reloads, **Then** TTS preferences persist locally.

### User Story 5 - Explore learner-focused sentence timeline charts (Priority: P2)

A teacher can view per-learner sentence/round progress over time and sort the chart by round order, CVR ascending, or CCI Standard ascending to see CPD movement and each point’s CCI performance color.

**Why this priority**: The current learner summary chart is too high-level; teachers need to diagnose exactly which of the 24+ sentences caused CPD movement.

**Independent Test**: Open Reports, filter to a learner or room, switch learner chart X-axis to Round, CVR, and CCI, and confirm points show sentence code, CPD, CVR, CCI, and grade color.

**Acceptance Scenarios**:

1. **Given** a learner has sentence responses, **When** the chart is set to Round, **Then** each sentence point appears in time/round order.
2. **Given** the chart is set to CVR ascending, **When** responses render, **Then** CPD movement is shown by increasing CVR while preserving sentence labels.
3. **Given** the chart is set to CCI ascending, **When** responses render, **Then** CPD movement is shown by increasing CCI Standard X and each point is colored by CCI Performance grade.

## Edge Cases

- Existing CCI cards may be referenced by `room_rounds`; hard deletes must not run without explicit confirmation and rollback.
- If no learner responses match filters, charts show empty states rather than stale data.
- If TTS settings are unsupported by the current Edge Function, requests should remain backward-compatible with defaults.
- Layout order settings must tolerate older localStorage values by merging defaults.
- Learner-facing UI must not reveal teacher-only answer text or audio controls.

## Requirements

### Functional Requirements

- **FR-001**: System MUST support CCI Standard Card categories M, S, and E in Settings.
- **FR-002**: System MUST allow operators to add or edit CCI card category values from the Settings form, not only choose a fixed legacy value.
- **FR-003**: System MUST protect historical round/report references before replacing existing CCI card records.
- **FR-004**: System MUST remove Chinese text from realtime formula labels and use “Real-Time Calculation Logic”.
- **FR-005**: System MUST provide configurable CPD formula preview controls in Settings.
- **FR-006**: System MUST keep formula preview behavior separate from persisted historical response rows unless an explicit migration or scoring engine change is approved.
- **FR-007**: System MUST allow local reordering of learner preview layout modules.
- **FR-008**: System MUST persist learner layout settings locally and merge with default layout on app updates.
- **FR-009**: System MUST provide TTS provider/model/voice settings for English and Vietnamese generation.
- **FR-010**: System MUST pass TTS preferences to audio generation requests while preserving safe defaults.
- **FR-011**: System MUST add learner-focused chart views by sentence/round, CVR ascending, and CCI Standard ascending.
- **FR-012**: System MUST show CPD movement and CCI performance grade/color per sentence point.
- **FR-013**: System MUST keep learner-facing safety rules intact: no answer text/audio controls exposed on learner screens.
- **FR-014**: System MUST document rollback for any database category/card replacement.

### Key Entities

- **CCI Category**: A rubric group label such as M, S, or E.
- **CCI Standard Card**: A standard X value used when
 rounds are opened and responses are scored.
- **CPD Formula Settings**: Local configuration for previewing the CPD equation.
- **Learner Layout Module**: A named block in the learner preview/screen order.
- **TTS Preferences**: Local provider/model/voice configuration for EN and VI generation.
- **Learner Sentence Chart Point**: A response-level chart point with learner, sentence code, round, CVR, CCI X, CPD V, and grade color.

## Success Criteria

- **SC-001**: Operators can create or edit a CCI card using M/S/E category in under 30 seconds.
- **SC-002**: Realtime formula labels contain zero Chinese text in Settings and learner preview.
- **SC-003**: Operators can reorder at least five learner preview modules and see the new order immediately.
- **SC-004**: TTS generation requests include provider/model/voice preferences when configured.
- **SC-005**: Teachers can view 24 learner sentence points by round, CVR, or CCI order without leaving Reports.
- **SC-006**: No production-impacting DB delete occurs without explicit confirmation and rollback documentation.

## Assumptions

- The first release stores formula, layout, and TTS preferences in browser localStorage unless a later DB-backed admin settings table is approved.
- Existing response formulas remain historical records; formula settings initially affect preview/request behavior only.
- CCI category replacement should prefer FK-safe update/seed behavior over hard deletion of referenced cards unless Lucy explicitly confirms hard delete with history impact.
