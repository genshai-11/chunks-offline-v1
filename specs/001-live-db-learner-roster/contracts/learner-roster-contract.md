# Contract: Learner Roster and Classroom Selection

## Settings Roster

Settings must provide a learner roster backed by durable learner records.

### List

- Shows learner id, display name, source, last seen time, and active/removal state when available.
- Highlights duplicate display names so Lucy can review them.
- Includes the requested roster names: Lucy, Mason, Annie, Vox, Tailor, Wynnye, Cherry, Jay, Pen, creating missing names only once.

### Add

- Requires a non-empty display name.
- Normalizes whitespace for duplicate checks.
- Saves to durable learner records before the learner appears in selectors.

### Edit

- Updates display name without changing learner id.
- Historical responses/progress remain attributed to the same learner id.

### Safe Remove

- If a learner has no dependent history, hard delete may be offered after confirmation.
- If a learner has memberships, responses, or progress, remove/deactivate means hidden from future selectors while preserving history.
- The UI must explain the consequence before any destructive action.

## Classroom Join/Selection

- Teacher/learner flows must use `learners.id`, not display name alone.
- Joining a room with an existing learner creates or updates `room_memberships` for that learner id.
- Adding a new learner during join must create the learner first, then create membership.
- Duplicate display names require disambiguation using metadata such as last seen/source/id suffix.

## Progress Contract

- Responses link to `learner_responses.learner_id`.
- Progress links to `learner_progress.learner_id`.
- Reports display current learner name but aggregate by learner id.
