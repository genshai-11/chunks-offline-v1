# Data Model: Library Topic Prep and Section CCI Assignment

**Feature**: `005-library-topic-prep-cci`  
**Date**: 2026-07-08 16:43 GMT+7

## Existing entities

### Course

Source: `courses`

- `id`: stable course id
- `title`: display title
- `status`: `draft | active | archived`
- `created_at`, `updated_at`

Relationships:
- Has many `lessons`
- Has many `sentence_resources` through course id
- Referenced by `practice_rooms` and `learner_progress`

Validation:
- Title required and trimmed
- Archive preferred over hard delete when lessons/resources/rooms exist

### Lesson / Topic

Source: `lessons`

- `id`: stable lesson/topic id
- `course_id`: parent course id
- `title`: display title
- `order_index`: order within course
- `status`: `draft | active | archived`
- `created_at`, `updated_at`

Relationships:
- Belongs to `courses`
- Has many `lesson_sections`
- Has many `sentence_resources`
- Referenced by `practice_rooms`, `resource_scope_filter.lessonIds`, and `learner_progress`

Validation:
- Course id required
- Title required and trimmed
- Order index should be non-negative and stable after reorder
- Archive preferred over hard delete when sections/resources/rooms exist

### Lesson Section / Part

Source: `lesson_sections`

Current fields:
- `id`: stable section id
- `lesson_id`: parent lesson/topic id
- `title`: part/chunk title
- `order_index`: order within lesson
- `status`: `draft | active | archived`
- `created_at`, `updated_at`

Planned field option A:
- `default_cci_standard_card_id`: nullable FK to `cci_standard_cards.id`

Planned mapping option B:
- Separate `lesson_section_cci_defaults` row with `section_id`, `cci_standard_card_id`, `active`, timestamps

Relationships:
- Belongs to `lessons`
- Has many `sentence_resources`
- Optional default CCI Standard Card

Validation:
- Lesson id required
- Title required and trimmed
- Section identity must use `id`, not only title, because same title may appear across topics
- If assigned CCI card becomes inactive/archived, Topic Prep should flag the section as needing review

### Sentence Resource

Source: `sentence_resources`

- `id`
- `course_id`
- `lesson_id`
- `section_id`: nullable
- `sentence_code`
- `text_prompt`
- `text_en`
- `text_vi`
- `audio_en_url`, `audio_vi_url`, `audio_variants`
- `default_cvr_unit_id`, `default_cvr_value`, `cvr_value`
- `order_index`
- `approval_status`: `draft | approved | archived`
- `created_at`, `updated_at`

Relationships:
- Belongs to course/lesson and optionally section
- Referenced by `room_rounds.sentence_resource_id`
- Used for live-room snapshots and reports

Validation:
- Course id and lesson id required
- Section id optional; missing section means CCI fallback should skip section default
- `sentence_code` required and unique enough within lesson/topic workflow
- Generated candidates must be reviewed before becoming rows

### CCI Standard Card

Source: `cci_standard_cards`

- `id`
- `category_id`
- `label`
- `standard_value`
- `active`
- timestamps

Relationships:
- Optional section default assignment
- Snapshotted into `room_rounds`

Validation:
- Only active cards should be assignable as section defaults
- Historical rounds should not be rewritten if card/default changes later

### Room Round CCI Snapshot

Source: `room_rounds`

Relevant fields:
- `sentence_resource_id`
- `cci_standard_card_id`
- `cci_standard_x`
- `cvr_value`
- `round_index`
- `status`

Behavior:
- Resolved at round-open time
- Snapshot remains immutable for historical reporting except existing close/finalize state updates

## Computed entities

### Topic Prep Summary

Computed from `lessons`, `lesson_sections`, `sentence_resources`, and CCI defaults.

Lesson-level fields:
- `lessonId`
- `lessonTitle`
- `sectionCount`
- `resourceCount`
- `approvedResourceCount`
- `draftResourceCount`
- `archivedResourceCount`
- `missingEnAudioCount`
- `missingViAudioCount`
- `ready`: boolean
- `blockingReasons`: string[]

Section-level fields:
- `sectionId`
- `sectionTitle`
- `lessonId`
- `orderIndex`
- `resourceCount`
- `approvedResourceCount`
- `draftResourceCount`
- `archivedResourceCount`
- `missingEnAudioCount`
- `missingViAudioCount`
- `minCvr`
- `maxCvr`
- `defaultCciCardId`
- `defaultCciLabel`
- `defaultCciStandardValue`
- `ready`: boolean
- `blockingReasons`: string[]

Readiness rules for MVP:
- Lesson ready requires at least one active section and at least one approved sentence resource.
- Section ready requires at least one approved sentence resource and an active default CCI assignment.
- Audio gaps are warnings unless teacher marks audio-required mode in future settings.

### Generated Sentence Candidate

Transient UI/proxy response before saving.

Fields:
- `candidateId`: deterministic request id or server-generated id
- `courseId`
- `lessonId`
- `sectionId`: nullable
- `engSentence`
- `vieSentence`
- `textPrompt` or generation prompt
- `resourcesUsed`
- `rTotal`
- `iValue`
- `uTotal`
- `totalOhm`
- `difficultyLabel`
- `status`: `draft_candidate | saving | saved | failed`
- `errorMessage`: nullable
- `createdAt`

Validation:
- Cannot save without target course and lesson
- Must have English and Vietnamese text
- Must have numeric Ohm/total value
- Must not auto-approve unless Lucy selects approved status

## Planned migrations

### Option A: add nullable section default CCI column

```sql
alter table public.lesson_sections
  add column if not exists default_cci_standard_card_id uuid null references public.cci_standard_cards(id);

create index if not exists lesson_sections_default_cci_standard_card_id_idx
  on public.lesson_sections(default_cci_standard_card_id);
```

Rollback:

```sql
alter table public.lesson_sections
  drop column if exists default_cci_standard_card_id;
```

### Option B: mapping table alternative

```sql
create table if not exists public.lesson_section_cci_defaults (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.lesson_sections(id) on delete cascade,
  cci_standard_card_id uuid not null references public.cci_standard_cards(id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(section_id)
);
```

Rollback:

```sql
drop table if exists public.lesson_section_cci_defaults;
```

## Migration choice guidance

Prefer Option A if `lesson_sections` is the stable section metadata table and a single default CCI per section is sufficient. Prefer Option B if future history/auditing of section default changes is needed or direct table alteration is undesirable.

## Implementation decision

Selected Option A for the first implementation slice: nullable `lesson_sections.default_cci_standard_card_id` referencing `cci_standard_cards(id)`. Local migration guidance was added to `src/data/migrations.ts`, and frontend/domain types were updated.

## Live schema verification — 2026-07-08 17:13 GMT+7

Supabase project `ftfxekdxeoxizoyxuqoz` was inspected before deployment:

- `courses`: present, 3 rows
- `lessons`: present, 49 rows
- `lesson_sections`: present, 256 rows
- `sentence_resources`: present, 8,823 rows
- `cci_standard_cards`: present, 3 rows
- `practice_rooms`: present, 7 rows
- `room_rounds`: present, 488 rows
- `lesson_sections.default_cci_standard_card_id`: **missing before migration**

The live Supabase migration must add `lesson_sections.default_cci_standard_card_id` before section default CCI assignment can persist in production.
