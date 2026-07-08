# UI/Data Contract: Library Topic Prep

**Feature**: `005-library-topic-prep-cci`

## Scope

This contract defines the Library page behavior for curriculum hierarchy CRUD, topic readiness, generated candidate review, and section default CCI assignment.

## Inputs

The Library page receives live data from the app shell or page loader:

- `courses[]`
- `lessons[]`
- `sections[]`
- `resources[]`
- `cciCards[]`
- schema health/error state
- refresh callback

## Course workflow

### Create course

Required fields:
- `title`
- `status` default `draft`

Expected behavior:
- Creates live `courses` row
- Refreshes list after success
- Shows mutation loading state and error state

### Edit course

Editable fields:
- `title`
- `status`

Expected behavior:
- Updates live row by id
- Does not rewrite child lesson/resource rows unless separately requested

### Remove course

Expected behavior:
- If child lessons/resources/rooms exist: archive only or block hard delete
- If no dependencies exist: allow hard delete after explicit confirmation

## Lesson/topic workflow

### Create lesson/topic

Required fields:
- `course_id`
- `title`
- `order_index`
- `status` default `draft`

Expected behavior:
- Creates row under selected course
- Appears in ordered lesson selector after refresh

### Edit lesson/topic

Editable fields:
- `title`
- `order_index`
- `status`

### Remove lesson/topic

Expected behavior:
- Archive first when sections/resources/rooms exist
- Hard delete only when dependency-free and explicitly confirmed

## Section/part workflow

### Create section/part

Required fields:
- `lesson_id`
- `title`
- `order_index`
- `status` default `draft`
- optional `default_cci_standard_card_id` or mapping equivalent

Expected behavior:
- Creates section under selected lesson/topic
- Section is immediately assignable for sentence resources

### Edit section/part

Editable fields:
- `title`
- `order_index`
- `status`
- `default_cci_standard_card_id`

### Remove section/part

Expected behavior:
- Archive first when resources/rooms exist
- Hard delete only when dependency-free and explicitly confirmed

## Topic Prep summary contract

For selected lesson/topic, compute:

- total sections/parts
- total resources
- approved/draft/archived resource counts
- missing EN audio count
- missing VI audio count
- section-level CVR min/max
- default CCI assignment status
- ready/not-ready state
- blocking/warning reasons

Readiness indicators:
- `ready`: enough approved resources and required CCI assignment present
- `warning`: audio gaps or draft/archived imbalance
- `blocked`: no sections, no approved resources, invalid CCI default, or load error

## Generated candidate review contract

A generated candidate is not saved automatically.

Required displayed fields:
- English sentence
- Vietnamese sentence
- total Ohm/uTotal
- resources used
- difficulty label if provided
- target course/lesson/section
- save status: draft or approved

Save behavior:
- Validate target course and lesson
- Save into `sentence_resources` only after explicit action
- Default approval status should be `draft` unless Lucy chooses `approved`
- Duplicate prevention should use candidate id or payload hash

## Error and loading states

Every mutation and generation flow must display:

- loading/busy state
- success confirmation
- actionable error message
- refresh/retry path
- empty state when no courses/lessons/sections/resources exist
