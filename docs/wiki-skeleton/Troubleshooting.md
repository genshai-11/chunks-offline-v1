# Troubleshooting

> For exact fixes and release history, use `docs/deployment-log.md` and GitHub Actions runs.

## Learner opens a new room link but sees an old room

Expected behavior after the cache fix:

- `/learner?room_code=CH-7175` updates the room code from URL.
- If the room code changed, stale `chunks_joined_room_id` is cleared.
- Learner identity can remain, but learner must join the new room.

Browser-side workaround:

1. Click Log Out in Learner Terminal.
2. Reopen the room link.
3. Select existing learner profile.
4. Join Room.

## Learner profile missing from Join Room

1. Go to Settings → Learners.
2. Add learner to roster.
3. Refresh app.
4. Reopen learner room link.

If Settings toggle **Allow learners to create a new profile from Join Room** is off, learners must select an existing roster profile.

## Firebase deploy issue

1. Check GitHub Actions.
2. Verify secret `FIREBASE_SERVICE_ACCOUNT_CHUNKS_OFFLINE` exists.
3. Confirm project/site is `chunks-offline`.
4. Prefer rollback from Firebase Console Hosting release history.

## Supabase schema/data issue

1. Check `docs/deployment-log.md` for recent migration/data updates.
2. Verify table counts with Supabase MCP or Dashboard.
3. Do not run destructive SQL without rollback plan and Lucy confirmation.

## Course names wrong

Expected names:

- `ERES-level-A`
- `ERES-level-B`
- `EREL-level-B`

Rollback SQL is recorded in `docs/deployment-log.md`.
