# Product PRD and Scope

> Canonical sources: `.specify/memory/constitution.md` and `specs/**` in the repository.

## Product summary

Chunks Offline is a live classroom app for teacher-controlled oral response practice, learner roster tracking, response capture, scoring, reporting, and course/material management.

## Current core scope

- Live Supabase data as the source of record
- Teacher Console live-room orchestration
- Learner Terminal response flow
- Durable learner roster and progress tracking by `learners.id`
- Library course/lesson/topic/section CRUD and sentence resources
- Full Topic Prep readiness by part/section, including resource counts, audio gaps, CVR range, and section default CCI status
- Settings-owned CCI categories, CCI Standard Cards, and CVR standards management
- Live-room section/topic CCI assignment with historical round snapshots
- Reports/history by session, learner, and live-room data
- Audio/TTS workflow and schema health visibility

## Current active product principles

- No mock data in product flows
- Learner-facing screens reveal only safe metadata
- First-response behavior must be race-safe and database/RPC-owned where correctness depends on concurrency
- Destructive data actions require explicit confirmation and rollback path
- External lesson generation must use a server-side proxy; M2M API keys must not appear in browser code

## Current material/course naming

- `ERES-level-A`
- `ERES-level-B`
- `EREL-level-B`
