# Data Model: Live Database and Learner Roster

**Source**: Supabase project `ftfxekdxeoxizoyxuqoz`, public schema extracted 2026-07-06.

## Current Tables

### courses
- **Rows**: 2
- **Primary key**: `id uuid`
- **Fields**: `title`, `status`, `created_at`, `updated_at`
- **Relationships**: parent of `lessons`, `sentence_resources`, `practice_rooms`, `learner_progress`

### lessons
- **Rows**: 30
- **Primary key**: `id uuid`
- **Fields**: `course_id`, `title`, `order_index`, `status`, timestamps
- **Relationships**: belongs to `courses`; parent of `lesson_sections`, `sentence_resources`, `practice_rooms`, `learner_progress`

### lesson_sections
- **Rows**: 131
- **Primary key**: `id uuid`
- **Fields**: `lesson_id`, `title`, `order_index`, `status`, timestamps
- **Relationships**: belongs to `lessons`; parent/optional scope for `sentence_resources`

### sentence_resources
- **Rows**: 7,068
- **Primary key**: `id uuid`
- **Fields**: `course_id`, `lesson_id`, `section_id`, `sentence_code`, `text_prompt`, `text_en`, `text_vi`, `audio_url`, `audio_en_url`, `audio_vi_url`, `audio_variants`, `default_cvr_unit_id`, `default_cvr_value`, `cvr_value`, `order_index`, `approval_status`, timestamps
- **Relationships**: belongs to course/lesson/section/CVR unit; used by `room_rounds`
- **Validation**: `approval_status` in `draft|approved|archived`; CVR values non-negative

### cci_categories
- **Rows**: 1
- **Primary key**: `id text`
- **Fields**: `label`, `active`, timestamps
- **Relationships**: parent of `cci_standard_cards`

### cci_standard_cards
- **Rows**: 3
- **Primary key**: `id uuid`
- **Fields**: `category_id`, `label`, `standard_value`, `active`, timestamps
- **Relationships**: belongs to `cci_categories`; used by `room_rounds`
- **Validation**: `standard_value >= 0`

### cvr_units
- **Rows**: 9
- **Primary key**: `id uuid`
- **Fields**: `label`, `unit_symbol`, `value`, `active`, timestamps
- **Relationships**: optional default for `sentence_resources`
- **Validation**: `value >= 0`

### learners
- **Rows**: 11
- **Primary key**: `id uuid`
- **Fields**: `display_name`, `source`, `auth_user_id`, `last_seen_at`, timestamps
- **Relationships**: parent of `room_memberships`, assigned/captured learners in `room_rounds`, `learner_responses`, `learner_progress`
- **Validation**: `source` in `manual|imported|anonymous`; `auth_user_id` unique when present
- **Known data issue**: duplicate display names exist, including duplicate `Lucy` and duplicate `Genshai`
- **Feature need**: add safe active/removal state or equivalent so Settings can hide inactive learners without deleting history

### practice_rooms
- **Rows**: 26
- **Primary key**: `id uuid`
- **Fields**: `room_code`, `title`, `status`, `current_round_id`, `course_id`, `lesson_id`, `host_name`, `resource_scope_filter`, `snapshot_sentence_resource_ids`, `scope_refreshed_at`, `scoring_mode`, `default_response_capture_mode`, `teacher_pin_hash`, timestamps
- **Relationships**: parent of memberships and rounds; optional current round
- **Validation**: `room_code` unique; status in `lobby|round_open|round_closed|finished`; scoring/capture modes constrained

### room_memberships
- **Rows**: 11
- **Primary key**: `id uuid`
- **Fields**: `room_id`, `learner_id`, `presence_status`, `can_answer`, `joined_at`, `updated_at`
- **Relationships**: joins `practice_rooms` to `learners`
- **Validation**: presence in `online|offline|left`
- **Feature need**: ensure unique room/learner conflict target exists before relying on upsert behavior

### room_rounds
- **Rows**: 13
- **Primary key**: `id uuid`
- **Fields**: `room_id`, `sentence_resource_id`, `assigned_learner_id`, `captured_learner_id`, `cci_standard_card_id`, `cci_standard_x`, `cvr_value`, `round_index`, `status`, `opened_at`, `closed_at`, timestamps, response/scoring snapshots, `opened_by`, `sequence_key`
- **Relationships**: belongs to room/resource/learners/CCI card; parent of `learner_responses`
- **Validation**: status in `draft|open|closed`; non-negative score parameters

### learner_responses
- **Rows**: 8
- **Primary key**: `id uuid`
- **Fields**: `round_id`, `learner_id`, `performance_y`, `response_color`, `cci_standard_x`, `cvr_value`, `cci_result`, `cpd_result`, `finalized`, `submitted_at`, `updated_at`, reflection fields, scoring/capture snapshots, `formula_version_snapshot`
- **Relationships**: belongs to round and learner
- **Validation**: performance/color constrained to red/yellow/green/purple scale; one accepted response per round expected

### learner_progress
- **Rows**: 0
- **Primary key**: `id uuid`
- **Fields**: `learner_id`, `course_id`, `lesson_id`, `total_cpd`, `finalized_rounds`, `updated_at`
- **Relationships**: aggregate by learner/course/lesson
- **Feature need**: verify updates are generated from closed/finalized responses and displayed in Reports by learner id

## Current Public Functions/RPCs

- `calculate_live_room_score`: computes CCI/CPD values from scoring mode, CCI standard, performance, CVR, and reflection time.
- `open_room_round`: opens a round with sentence/resource/learner/card snapshots.
- `submit_room_response`: submits one learner response and returns calculated response data.
- `finalize_round_responses`, `prepare_learner_response`, `set_sentence_resource_course_id`, `touch_updated_at`: support trigger or data consistency behavior.

## Known Drift and Gaps

- `audio_generation_jobs` is referenced by app code and local migrations but is absent from current live public schema and generated TypeScript types.
- `learners` has no active/deactivated field for safe removal from selection without history deletion.
- Local `CCIPerformanceParameter` exists only in sandbox/local code, not in the extracted live schema.
- Reports currently need live learner records passed in; `HistoryTab` still references `sandboxDb.learners`.

## State Transitions

### PracticeRoom
`lobby` → `round_open` → `round_closed` → `round_open` ... → `finished`

### RoomRound
`draft` → `open` → `closed`

### LearnerResponse
`submitted/finalized=false` → `finalized=true` when the round closes

### Learner
`active/selectable` → `inactive/hidden from selector` for safe removal; hard delete only when no dependent history exists

## Requested Initial Roster

The Settings learner roster should ensure these names are available without unintended duplicates:

- Lucy
- Mason
- Annie
- Vox
- Tailor
- Wynnye
- Cherry
- Jay
- Pen

Duplicate display-name records must be surfaced for review instead of silently merged.
