# Feature Specification: Library Topic Prep and Section CCI Assignment

**Feature Branch**: `005-library-topic-prep-cci`

**Created**: 2026-07-08 16:43 GMT+7

**Status**: Draft

**Input**: User description: "Trong trang library - thêm tính năng - thêm xóa sửa course / lesson /Thêm bài học vào lesson.. Thêm tính năng chuẩn bị bài học full topic - ví dụ mỗi topic có bao nhiêu part ... Update thêm live-room có thể assign CCI standard theo Section Topic được không? Đánh giá review docs này - sau đó tạo plan task để triển khai. Docs API path: lesson-generator-v2/API_DOCS_M2M.md. OpenAPI path: lesson-generator-v2/docs/openapi.yaml."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage Library course and lesson hierarchy (Priority: P1)

As Lucy/admin, I can create, edit, archive, and safely delete eligible courses, lessons/topics, and lesson parts/sections directly from the Library page so the curriculum hierarchy can be maintained without database tools.

**Why this priority**: Library is now sentence-resource focused, but curriculum structure still needs safe CRUD. Teachers cannot prepare topics if course, lesson, and section records are stale or incomplete.

**Independent Test**: Open Library, create a draft course, add a lesson/topic, add two sections/parts, edit their titles/order/status, archive them, and verify refresh reloads the same live records without mock fallback.

**Acceptance Scenarios**:

1. **Given** Library is open with live Supabase data, **When** Lucy creates a course, **Then** the course is saved durably and appears in course selection after refresh.
2. **Given** a course is selected, **When** Lucy adds or edits a lesson/topic, **Then** the lesson is linked to the selected course and appears in ordered lesson selection.
3. **Given** a lesson/topic is selected, **When** Lucy adds or edits lesson parts/sections, **Then** the sections appear in order and sentence resources can be assigned to them.
4. **Given** a course, lesson, or section has child records or historical room usage, **When** Lucy chooses remove, **Then** the system offers archive/deactivate first and blocks destructive deletion unless the record is dependency-free and explicitly confirmed.

---

### User Story 2 - Prepare a full topic lesson package (Priority: P1)

As a teacher, I can inspect and prepare a full topic before live class by seeing how many parts/sections it has, how many approved sentence prompts are ready per part, whether EN/VI audio is complete, and whether CVR/CCI defaults are assigned.

**Why this priority**: Teachers need a readiness dashboard before launching a live room. A topic with missing parts, missing approved sentences, missing audio, or no CCI assignment causes classroom friction.

**Independent Test**: Select an existing EREL topic/lesson in Library and open Topic Prep. Confirm each section/part shows resource count, approved count, audio coverage, CVR range, default CCI status, and a clear ready/not-ready state.

**Acceptance Scenarios**:

1. **Given** a lesson/topic has sections and resources, **When** Lucy opens Topic Prep, **Then** each part/section shows counts for total resources, approved resources, draft resources, archived resources, missing EN audio, missing VI audio, CVR range, and default CCI assignment.
2. **Given** a topic is missing sections or approved resources, **When** Topic Prep renders, **Then** the UI shows actionable setup guidance instead of claiming the topic is ready.
3. **Given** multiple EREL topics share section titles, **When** Topic Prep groups section titles, **Then** the UI still preserves each underlying section id and lesson id so updates do not accidentally cross-write unrelated topics.
4. **Given** Lucy updates part order/status or adds a resource to a section, **When** the page refreshes, **Then** readiness metrics are recalculated from live records.

---

### User Story 3 - Generate/add lesson content from the lesson-generator M2M API safely (Priority: P2)

As Lucy/admin, I can use the documented lesson-generator service to create bilingual sentence candidates for a selected lesson/section, review them, and save approved candidates into the Library without exposing the M2M API key in browser code.

**Why this priority**: The external API can accelerate full-topic lesson preparation, but the API docs explicitly require server-to-server authentication and contain contract inconsistencies that must be handled safely.

**Independent Test**: From a selected lesson section, submit generation resources/theme/settings, receive a bilingual sentence candidate, review the generated EN/VI/OHM fields, save it as a draft or approved sentence resource, and verify no API key appears in browser source or network calls.

**Acceptance Scenarios**:

1. **Given** Lucy opens a selected lesson section, **When** she requests generated content, **Then** the request is routed through a server-side proxy/Edge Function that owns the API key.
2. **Given** a generation response succeeds, **When** Lucy reviews it, **Then** the generated English, Vietnamese, Ohm/total, resources-used, and difficulty metadata are visible before saving.
3. **Given** the API returns `processing` for async generation, **When** a webhook/poll result is not yet available, **Then** Library shows an in-progress state and does not create incomplete sentence resources.
4. **Given** the API returns an error or times out, **When** Lucy retries, **Then** the UI avoids duplicate saved resources and shows the failure reason.

---

### User Story 4 - Assign default CCI Standard by Section Topic for live rooms (Priority: P1)

As a teacher, I can assign a default CCI Standard Card to each lesson section/topic part so live-room rounds opened from that section automatically use the section-specific CCI unless the teacher deliberately overrides it.

**Why this priority**: Different parts within a topic can target different standards. A single room-level CCI selection is too coarse for full-topic practice and can produce inaccurate CPD scoring.

**Independent Test**: Assign different CCI cards to two sections in the same lesson, launch a live room scoped to those sections, open a sentence from each section, and confirm each round snapshots the correct CCI card id and CCI Standard X.

**Acceptance Scenarios**:

1. **Given** a section has a default CCI Standard Card, **When** a live-room round opens a sentence from that section, **Then** the round stores that section's CCI card id and standard value.
2. **Given** a section has no default CCI assignment, **When** a live-room round opens, **Then** the room-level teacher-selected CCI card remains the fallback.
3. **Given** the teacher manually changes CCI for the next round in the live-room canvas, **When** the round opens, **Then** the manual selection overrides the section default for that round only.
4. **Given** historical rounds already have CCI snapshots, **When** section defaults are changed later, **Then** historical round/report values remain unchanged.

---

### User Story 5 - Validate API documentation and operational readiness (Priority: P2)

As an operator, I can see a clear review of the M2M API documentation and OpenAPI contract before implementation, including security risks, endpoint mismatches, timeout/idempotency concerns, and the recommended integration path.

**Why this priority**: The provided API docs and OpenAPI file are not fully aligned. Planning must prevent insecure frontend key usage and incorrect endpoint wiring.

**Independent Test**: Read the feature docs review and confirm it identifies auth/header requirements, endpoint mismatches, response shape expectations, async behavior, secret-handling requirements, and implementation blockers.

**Acceptance Scenarios**:

1. **Given** the API docs include a literal API key, **When** the integration plan is reviewed, **Then** it marks the key as secret material that must not be committed into frontend/browser code.
2. **Given** API docs and OpenAPI disagree on base URL and analysis endpoint names, **When** tasks are generated, **Then** implementation includes contract verification before wiring production calls.
3. **Given** generation can take 5-30 seconds, **When** the integration is planned, **Then** tasks include timeout, retry, idempotency, and async `processing` handling.

### Edge Cases

- A course/lesson/section has child resources or room history and cannot be hard-deleted safely.
- A section title is duplicated across multiple lessons; UI grouping must not hide distinct section ids.
- An EREL multi-topic room includes resources from several lessons and shared section titles.
- A section default CCI card is archived or deleted after assignment.
- A sentence resource has no section id and must fall back to room-level CCI.
- Topic Prep counts include archived resources unless filters correctly separate active/draft/archived states.
- M2M generation succeeds but returns missing `engSentence`, `vieSentence`, or `totalOhm` fields.
- API docs and OpenAPI use different endpoints (`/api/analyze-ohm` vs `/analysis/linguistic`, `/api/ping` vs `/health`).
- Network timeout occurs after the generation service has started processing, making duplicate prevention important.
- Learner-facing live screens must never reveal generated answer text or teacher-only audio controls.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Library MUST support live create/edit/archive/safe-delete workflows for courses.
- **FR-002**: Library MUST support live create/edit/archive/safe-delete workflows for lessons/topics under a selected course.
- **FR-003**: Library MUST support live create/edit/archive/safe-delete workflows for lesson sections/parts under a selected lesson/topic.
- **FR-004**: Destructive hard delete for courses, lessons, sections, and sentence resources MUST require explicit confirmation and MUST be blocked when child records or historical live-room records exist.
- **FR-005**: Topic Prep MUST show per-section readiness metrics: total resources, approved resources, draft resources, archived resources, missing EN audio, missing VI audio, CVR range, and default CCI status.
- **FR-006**: Topic Prep MUST show lesson-level summary metrics for total sections/parts, approved sentence count, audio completion, and ready/not-ready state.
- **FR-007**: Topic Prep MUST preserve section identity by `lesson_sections.id` even when display grouping uses title/order.
- **FR-008**: Library MUST allow adding sentence resources into a selected lesson and optional section/part while preserving existing resource edit/create behavior.
- **FR-009**: The lesson-generator integration MUST call the M2M API only from a server-side trusted runtime such as a Supabase Edge Function; browser/frontend code MUST NOT contain or send the M2M API key directly.
- **FR-010**: The integration MUST support synchronous `success` responses and asynchronous `processing` responses without creating incomplete resources.
- **FR-011**: Generated sentence candidates MUST be reviewable before saving and MUST support saving as draft or approved sentence resources.
- **FR-012**: The integration MUST validate required generated fields before saving: English sentence, Vietnamese sentence, Ohm/total value, and selected target course/lesson.
- **FR-013**: The implementation MUST include timeout, retry, idempotency, and duplicate-prevention behavior for generation requests.
- **FR-014**: Lesson sections MUST support an optional default CCI Standard Card assignment for live-room scoring.
- **FR-015**: Live-room round opening MUST resolve CCI in this priority order: manual teacher override for the round, section default CCI, room-level default CCI, then safe active fallback.
- **FR-016**: Room rounds MUST continue snapshotting `cci_standard_card_id` and `cci_standard_x` so later section/default changes do not rewrite history.
- **FR-017**: Teacher live-room UI MUST make the resolved CCI source visible before opening a round when section defaults are involved.
- **FR-018**: Learner-facing UI MUST remain safe and MUST NOT reveal sentence answer text, translations, generated candidate content, or audio playback controls.
- **FR-019**: Plans/tasks MUST include database type alignment and rollback instructions for any schema change.
- **FR-020**: API documentation review MUST be captured before implementation and must flag contract mismatches between the markdown docs and OpenAPI file.

### Key Entities *(include if feature involves data)*

- **Course**: Top-level curriculum collection with title, status, and timestamps.
- **Lesson / Topic**: Learning unit under a course; in EREL flows each lesson is treated as a topic.
- **Lesson Section / Part**: Topic part/chunk under a lesson, optionally carrying default readiness and CCI assignment metadata.
- **Sentence Resource**: Bilingual prompt attached to a course, lesson, and optional section, with CVR, approval status, and audio state.
- **Topic Prep Summary**: Computed readiness view for a lesson/topic and its sections/parts.
- **Generated Sentence Candidate**: Unsaved M2M API output awaiting teacher/admin review.
- **Section CCI Default**: Optional mapping from section id to CCI Standard Card used to resolve live-room round scoring.
- **Room Round CCI Snapshot**: Existing persisted round fields capturing chosen CCI card/value at round-open time.

### Live Data and Mock-Removal Requirements *(mandatory for data features)*

- **Data source of record**: Supabase tables `courses`, `lessons`, `lesson_sections`, `sentence_resources`, `cci_standard_cards`, `practice_rooms`, and `room_rounds`; planned server-side function for M2M lesson generation; existing `open_room_round`/round-opening logic where applicable.
- **Mock/sandbox paths affected**: Existing `useSandbox` branches and `sandboxDb` course/lesson/section/resource mutation paths in `src/components/LibraryTab.tsx` must be removed, isolated, or explicitly developer-only before product validation.
- **Page verification scope**: Library page for hierarchy CRUD/topic prep/generation review; Teacher Console/live-room for section default CCI resolution; Reports for historical CCI snapshots remaining stable.
- **Live session integrity scope**: Teacher screens may show section default CCI source and generated text; learner screens must remain answer-safe. Round opening must preserve first-response lockout, manual/auto advance, teacher-only audio/text, and CCI snapshot correctness.
- **Learner continuity impact**: No new learner identity behavior; existing learner id/progress continuity must remain unaffected by curriculum edits or CCI default changes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Lucy can create a course, lesson/topic, and two sections/parts in Library and see them persist after refresh in under 3 minutes.
- **SC-002**: For any selected topic with data, Topic Prep displays section count, approved sentence count, missing audio counts, CVR range, and CCI assignment status within 2 seconds after data load.
- **SC-003**: A generated sentence candidate can be requested, reviewed, and saved to the selected lesson/section without exposing the API key in browser code or network requests.
- **SC-004**: In a live-room test with at least two sections using different CCI defaults, 100% of opened rounds snapshot the expected CCI card/value based on the priority order.
- **SC-005**: 100% of historical rounds keep their original CCI snapshot after changing a section default CCI assignment.
- **SC-006**: The API docs review identifies all blocking contract/security mismatches before implementation begins.
- **SC-007**: No production-impacting schema migration or deploy occurs without commit, preview/canary validation, rollback instructions, and deployment-log update.

## Assumptions

- In current app terminology, a course contains lessons/topics, and each lesson/topic contains sections/parts.
- "Thêm bài học vào lesson" means adding lesson content/sentence resources into a selected lesson and optional section, not creating a nested lesson table.
- Section default CCI can be implemented with either a nullable column on `lesson_sections` or a separate mapping table; the plan will decide after schema verification.
- The lesson-generator M2M API should be treated as external and potentially slow; generated content is never saved without review.
- The literal API key shown in the markdown docs is considered secret material for planning purposes and must be rotated or stored only in server-side secrets before production use.
