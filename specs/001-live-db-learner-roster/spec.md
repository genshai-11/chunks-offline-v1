# Feature Specification: Live Database and Learner Roster

**Feature Branch**: `001-live-db-learner-roster`

**Created**: 2026-07-06

**Status**: Draft

**Input**: User description: "Set up Spec Kit constitution from the existing code, extract the current Supabase data model, plan and task every page/function to verify live database loading, remove all mock data, and add Settings learner management with learners Lucy, Mason, Annie, Vox, Tailor, Wynnye, Cherry, Jay, Pen. Learner screens should select from the learner list or add a new learner saved to database so progress tracking stays synchronized across live classrooms."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Product pages use live data only (Priority: P1)

As Lucy/admin, I can open each product tab and know that Library, Teacher Console, Learner Terminal, Reports, Audio Jobs, Settings, and Database views are using durable database records instead of mock or sandbox data.

**Why this priority**: This is the prerequisite for trustworthy resource loading, learner tracking, reports, and live classroom operation.

**Independent Test**: With mock/sandbox disabled and browser local storage cleared, each tab loads from the connected database, shows a loading/empty/error state when appropriate, and never silently substitutes seed data.

**Acceptance Scenarios**:

1. **Given** the connected database has curriculum resources, **When** Lucy opens Library, **Then** courses, lessons, sections, resources, CCI cards, and CVR units display from database records only.
2. **Given** the connected database has no rows for a page, **When** Lucy opens that page, **Then** the page shows an empty/setup state instead of sample content.
3. **Given** a page mutation succeeds, **When** Lucy refreshes the browser or opens another session, **Then** the new data remains available from the database.

---

### User Story 2 - Manage learner roster in Settings (Priority: P2)

As Lucy/admin, I can manage a shared learner roster in Settings so classroom participants are selected from durable learner records rather than repeatedly typed as free text.

**Why this priority**: Progress and reports must follow a stable learner id across live classroom sessions.

**Independent Test**: In Settings, Lucy can see the roster, add missing learners, edit display names, and remove learners from active use without losing historical progress records.

**Acceptance Scenarios**:

1. **Given** the roster screen is opened, **When** the learner table loads, **Then** Lucy sees database learners and can identify duplicates or missing requested learners.
2. **Given** Mason is not present, **When** Lucy adds Mason, **Then** Mason is saved to the database and appears in learner selection controls without a page reload.
3. **Given** a learner already has classroom history, **When** Lucy chooses remove, **Then** the system prevents destructive history loss and offers a safe inactive/removal-from-selector state.

---

### User Story 3 - Select or create learners during live classroom flows (Priority: P3)

As a teacher or learner, I can choose an existing learner from the shared roster or add a new learner during classroom join/setup so responses and progress attach to the correct learner id.

**Why this priority**: Live classroom scoring, first-responder capture, and learner progress aggregation depend on a stable learner id.

**Independent Test**: A learner joins a room by selecting an existing roster entry, submits a response, and the response plus progress summary are attributed to the same learner id in Reports.

**Acceptance Scenarios**:

1. **Given** a live room is open, **When** a learner joins, **Then** the learner selection uses database learner records and does not default to a hardcoded name.
2. **Given** a learner is not in the roster, **When** the add-new-learner option is used, **Then** the new learner is saved to the database before room membership is created.
3. **Given** two learners share the same display name, **When** a classroom join occurs, **Then** the user can distinguish records and the selected id is used for membership, response, and progress.

---

### User Story 4 - Validate schema drift and missing tables (Priority: P4)

As an operator, I can see and resolve database schema drift such as page code querying tables that are absent from the connected database.

**Why this priority**: Missing schema silently breaks tabs such as Audio Jobs and undermines trust in the live-data migration.

**Independent Test**: The system identifies schema gaps, blocks affected live actions with clear guidance, and provides a migration/rollback path before enabling the page.

**Acceptance Scenarios**:

1. **Given** a page depends on a missing table, **When** Lucy opens that page, **Then** the UI shows a schema action requirement rather than failing silently.
2. **Given** a schema gap has an approved migration, **When** it is applied and validated, **Then** generated data contracts and page queries agree with the database.

---

### User Story 5 - Rejoin and safely close live sessions (Priority: P2)

As a teacher, I can open `/live-session`, rejoin an active classroom, let the same teacher canvas advance to the next sentence after a response, and safely close the console so learner pads turn off instead of staying answerable.

**Why this priority**: Live classrooms must survive teacher refresh/rejoin and must not leave learner devices active after the teacher exits.

**Independent Test**: Create a room, join from a learner device, capture a response, verify the next sentence opens in the same teacher console, exit/rejoin from `/live-session`, and finish the session; the learner screen never shows answer text/audio and ends/locks when the teacher closes.

**Acceptance Scenarios**:

1. **Given** a teacher has an active or recently finished room, **When** Lucy opens `/live-session`, **Then** she can rejoin active rooms and review recent finished sessions.
2. **Given** first-response mode captures one learner response, **When** auto-advance runs, **Then** the current round closes and the next round opens in the same teacher canvas with learner pads unlocked for the new turn.
3. **Given** the teacher exits the console or ends the classroom session, **When** learner devices receive realtime updates, **Then** response buttons are locked/off and finished rooms show a session-ended message.
4. **Given** a learner is connected, **When** a round opens, **Then** the learner sees only safe metadata and response buttons, not English/Vietnamese answer text or audio controls.

### Edge Cases

- The database has duplicate learner display names from prior anonymous joins.
- The requested learner roster has names already present with different casing or whitespace.
- A learner with responses/progress is removed from active classroom selection.
- A page has partial database load success where some tables load and others fail.
- Browser local storage contains stale sandbox/session ids from earlier mock usage.
- The live database is missing `audio_generation_jobs` while the app still queries it.
- RLS allows reads but blocks inserts/updates for a table mutation path.
- Multiple learners attempt to submit for the same first-responder round at nearly the same time.
- The teacher refreshes, closes the console, or returns later to an active room.
- A learner remains on a room screen after the teacher finishes or exits the classroom.
- Auto-advance changes component state while a close/open-round transition timer is pending.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST remove or isolate all mock, seed, and sandbox fallback data from normal product flows.
- **FR-002**: System MUST load Library data from durable records for courses, lessons, lesson sections, sentence resources, CCI standard cards, and CVR units.
- **FR-003**: System MUST load Teacher Console data from durable records for practice rooms, memberships, rounds, responses, resources, standards, and learners.
- **FR-004**: System MUST load Learner Terminal room state, active rounds, responses, and learner identity from durable records, while allowing only ephemeral local storage for session convenience.
- **FR-005**: System MUST load Reports/History learner names from durable learner records instead of sandbox learner lists.
- **FR-006**: System MUST ensure Audio Jobs either has a validated durable job table or the page is disabled with a clear schema action message.
- **FR-007**: Settings MUST include learner roster management for list, add, edit, and safe remove/deactivate behavior.
- **FR-008**: The initial active roster MUST include or allow creation of Lucy, Mason, Annie, Vox, Tailor, Wynnye, Cherry, Jay, and Pen without creating duplicate records for names already present.
- **FR-009**: Live classroom learner selection MUST use learner ids from the roster and MUST provide an add-new learner path that persists before room membership is created.
- **FR-010**: Progress and reports MUST aggregate by learner id and preserve response history even when display names are edited later.
- **FR-011**: Every product page MUST expose loading, empty, error, and refresh behavior that is testable without mock data.
- **FR-012**: Mutations that can delete or hide learner records MUST require explicit confirmation and MUST prevent loss of historical classroom records.
- **FR-013**: The implementation MUST document a page-by-page live data checklist before coding begins.
- **FR-014**: Database contract drift MUST be caught by generated/verified types or equivalent schema checks before release.
- **FR-015**: `/live-session` MUST route to a live session manager that can rejoin non-finished rooms and review recent finished rooms.
- **FR-016**: Teacher console exit/end-session actions MUST clear the active round pointer, lock learner memberships, and prevent response buttons from staying enabled without a controlling teacher.
- **FR-017**: Auto-advance MUST close the captured round and open the next playable sentence without clearing its own transition timer before the next-turn operation executes.
- **FR-018**: Learner response buttons MUST respect current membership `can_answer` state and room `finished` state in addition to round status.

### Key Entities *(include if feature involves data)*

- **Learner**: Shared student/person record used for Settings roster, classroom membership, responses, and progress. Key attributes include stable id, display name, source, optional auth identity, last seen time, active/removal state, and timestamps.
- **Practice Room**: Live classroom session with room code, host, status, selected course/lesson, resource scope, scoring mode, capture mode, and current round.
- **Room Membership**: Link between a learner and a practice room, including presence and answer eligibility.
- **Room Round**: One classroom response window for one sentence resource, optionally assigned to a learner, with scoring/capture snapshots.
- **Learner Response**: Captured learner response for a round, including performance color, performance value, reflection time, score snapshots, finalization, and submitted time.
- **Learner Progress**: Durable aggregate per learner/course/lesson used to track synchronized progress across live classrooms.
- **Sentence Resource**: Curriculum prompt and bilingual text/audio resource used by Library, Teacher Console, Learner Terminal, and Audio Jobs.
- **Audio Generation Job**: Durable background job record for resource audio generation when the schema supports it.

### Live Data and Mock-Removal Requirements *(mandatory for data features)*

- **Data source of record**: Supabase public schema tables/RPCs extracted on 2026-07-06: `courses`, `lessons`, `lesson_sections`, `sentence_resources`, `cci_categories`, `cci_standard_cards`, `cvr_units`, `learners`, `practice_rooms`, `room_memberships`, `room_rounds`, `learner_responses`, `learner_progress`; RPCs/functions include `calculate_live_room_score`, `open_room_round`, and `submit_room_response`.
- **Mock/sandbox paths affected**: `src/lib/supabaseClient.ts` seed arrays and `SandboxDatabase`, `useSandbox` fallback in `src/App.tsx`, sandbox references in page components, localStorage learner defaults, Settings preview mockup, and migration sandbox sync utilities.
- **Page verification scope**: `src/components/LibraryTab.tsx`, `SimulatorTab.tsx`, `LearnerTerminalTab.tsx`, `HistoryTab.tsx`, `AudioGeneratorTab.tsx`, `SettingsTab.tsx`, and `MigrationsTab.tsx`.
- **Learner continuity impact**: Learner identity must be resolved through `learners.id`; duplicate display names require a disambiguation or merge/deactivate workflow; progress must remain linked after edits.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of product tabs can be validated with browser local storage cleared and no sample data fallback.
- **SC-002**: All page-level live-data checklist items pass for loading, empty, error, mutation, refresh, and no-mock behavior.
- **SC-003**: The requested roster names are available in the shared learner roster with no unintended duplicate records after setup.
- **SC-004**: A learner can join a room, submit a response, close the round, and see the response in Reports under the same learner id.
- **SC-005**: Schema drift checks identify every frontend table/RPC reference that is missing from the connected database before release.
- **SC-006**: Removing or deactivating a learner with history preserves 100% of existing responses and progress summaries.
- **SC-007**: A live room can be rejoined from `/live-session`, can auto-open the next sentence after a captured response, and turns learner pads off when the teacher exits or ends the session.

## Assumptions

- The current connected Supabase project is the intended source of truth for this app.
- Existing anonymous learner records may contain duplicates and should not be destructively merged without a separate confirmation workflow.
- Safe learner removal means removing from active selection, not deleting historical responses/progress.
- Audio Jobs should remain available only after the durable job table/schema is present and verified.
- Realtime subscriptions are desirable for live classroom freshness but can be planned after the live-data baseline is correct.
