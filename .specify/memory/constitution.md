<!--
Sync Impact Report
Version change: 1.0.0 → 1.1.0
Modified principles:
- I. Live Database as System of Record → expanded to cover live room realtime state
- IV. Page-Level Data Verification → expanded to cover live session response locking and teacher/learner screens
Added sections:
- VI. Live Session Orchestration and First-Response Integrity
Removed sections:
- none
Templates requiring updates:
- ✅ .specify/templates/plan-template.md
- ✅ .specify/templates/spec-template.md
- ✅ .specify/templates/tasks-template.md
- ✅ .specify/templates/checklist-template.md previously reviewed; no project-specific change required
Follow-up TODOs: none
-->

# Chunks Offline Live Classroom Constitution

## Core Principles

### I. Live Database as System of Record
All user-visible curriculum, resources, standards, learners, live rooms, room
memberships, rounds, responses, and progress MUST be loaded from the connected
Supabase database. Local browser storage MAY persist ephemeral UI session state
such as the current room code or selected learner id, but it MUST NOT become the
authoritative source for product data. Any feature that changes data MUST define
the Supabase table, RPC, Edge Function, Storage bucket, or migration path that
owns that data.

Rationale: learner progress must be synchronized across live classrooms and
across devices; local-only data breaks reporting, continuity, and classroom
coordination.

### II. No Mock Data in Product Flows
Mock, seed, sandbox, preview, or hardcoded sample data MUST NOT appear in normal
product pages or production-like validation. Development fixtures MAY exist only
behind explicit developer-only utilities and MUST be excluded from live classroom,
learner, library, reports, audio, and settings flows. If live data is missing,
the UI MUST show an empty, loading, or actionable setup state rather than falling
back to mock data.

Rationale: mock fallback can hide schema drift, corrupt scoring expectations,
and make reports look valid when no durable database records exist.

### III. Typed Schema and Drift Control
The application MUST keep frontend data contracts aligned with the Supabase
schema. Generated database types, local domain types, migrations, and page
queries MUST be checked together whenever tables, columns, constraints, RPC
functions, Edge Functions, or Storage buckets change. Schema drift such as
querying a table that does not exist is a blocking issue for the affected page
until resolved or explicitly removed from scope.

Rationale: this project depends on relational joins and classroom scoring
snapshots; silent type drift creates runtime failures and incorrect progress
tracking.

### IV. Page-Level Data Verification
Every page or tab MUST have a documented data-loading checklist that identifies
its tables/RPCs/functions, loading state, empty state, error state, mutation
paths, and refresh/realtime behavior. Before implementation is considered
complete, each page MUST be validated against live Supabase data with mock data
disabled. Live classroom validation MUST include separate teacher and learner
browser sessions, joined roster visibility, round launch, first-response capture,
response lockout, and reports/progress continuity.

Rationale: the product is organized as distinct tabs, and each tab can appear
healthy while another is still reading sandbox/local data or stale room state.

### V. Learner Identity and Progress Continuity
Learners MUST be selected, created, edited, and deactivated through durable
Supabase records. Live classroom joins MUST resolve to a learner id from the
shared roster or create a new learner record when allowed. Reports and progress
MUST aggregate by learner id, not by free-text display name alone. Duplicate
names MUST be handled explicitly so Lucy, Mason, Annie, Vox, Tailor, Wynnye,
Cherry, Jay, Pen, and future learners can be tracked consistently across rooms.

Rationale: learner progress is the core value of the classroom engine; free-text
names and anonymous duplicates make progress unreliable.

### VI. Live Session Orchestration and First-Response Integrity
A live classroom session MUST be controlled from the Teacher Console. Launching a
room creates a complete approved sentence snapshot; teachers MUST start and
advance rounds from that session without exposing a learner-facing sentence list.
Teacher screens MAY show sentence text, playback controls, language switches,
speed/volume controls, CCI reassignment for the next round, and expanded/focus
view. Learner screens MUST show only safe metadata needed to respond: sentence
ID/category, assigned CCI card value, CVR value, eligibility state, and response
buttons. Learner screens MUST NOT reveal English/Vietnamese answer text or audio
playback controls.

First-response mode MUST be database-enforced with a single accepted response per
round. When the first response is recorded, all learner response interfaces MUST
lock for that round, teacher screens MUST display a quick capture notification,
and the room MUST support either manual next-round playback or teacher-enabled
auto-advance. New rounds MUST unlock eligible learners again.

Rationale: the drill depends on teacher-owned audio prompts and race-safe first
response scoring; showing answers or allowing multiple accepted responses breaks
classroom integrity.

## Supabase Data Model and Runtime Constraints

The active Supabase project is `ftfxekdxeoxizoyxuqoz`. As of 2026-07-06, the
public schema contains these product tables: `courses`, `lessons`,
`lesson_sections`, `sentence_resources`, `cci_categories`, `cci_standard_cards`,
`cvr_units`, `learners`, `practice_rooms`, `room_memberships`, `room_rounds`,
`learner_responses`, and `learner_progress`.

The public RPC/function surface includes `calculate_live_room_score`,
`open_room_round`, `submit_room_response`, `finalize_round_responses`,
`prepare_learner_response`, `set_sentence_resource_course_id`, and
`touch_updated_at`. Live audio generation is backed by Supabase Edge Functions
such as `generate-resource-audio`, `tts-generate`, and `list-tts-models`, plus
the `resource-audio` Storage bucket. New classroom scoring behavior SHOULD
prefer database-owned RPCs or constraints when correctness depends on
concurrency, uniqueness, or snapshot consistency.

The app MUST treat Row Level Security as enabled for product tables and MUST NOT
ship service-role secrets to the browser. Client-side code MUST use publishable
keys only. Destructive data actions require explicit user confirmation and a
rollback/restore path before production use.

## Development Workflow and Release Controls

Specification work MUST start from the constitution, then produce spec, plan,
data model, contracts, quickstart validation, and tasks before implementation.
Plans MUST include:

- a page-by-page live-data audit;
- removal or isolation of mock/sandbox paths;
- generated or verified database types;
- migration/backfill tasks for schema gaps;
- learner roster CRUD and selection behavior;
- live room teacher/learner realtime validation, including roster join sync,
  first-response lockout, teacher audio-only playback, and manual/auto advance;
- validation scenarios using live Supabase data;
- rollback instructions for migrations, hosting, and functions when deployment
  is involved.

For any web app release or production deploy, the project MUST commit before
deploy, tag production releases when applicable, validate through preview or
canary first, document rollback steps, verify restore paths for hosting/functions,
and run a post-deploy checklist.

## Governance

This constitution supersedes conflicting project practices, generated templates,
and ad-hoc implementation shortcuts. Amendments require updating this file,
recording a version bump, and synchronizing affected Spec Kit templates and
runtime guidance.

Versioning follows semantic versioning:

- MAJOR: removes or redefines a core principle in a backward-incompatible way.
- MINOR: adds a new principle, governance section, or materially expands scope.
- PATCH: clarifies wording without changing obligations.

Every spec/plan/tasks review MUST verify compliance with all MUST statements in
this constitution. Any violation must be resolved before implementation unless a
plan explicitly documents the violation, why it is unavoidable, and when it will
be removed.

**Version**: 1.1.0 | **Ratified**: 2026-07-06 | **Last Amended**: 2026-07-06
