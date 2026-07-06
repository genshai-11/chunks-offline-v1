# Quickstart Validation: Live Database and Learner Roster

## Prerequisites

- `.env.local` points to the intended Supabase project.
- Local dependencies installed with `npm install`.
- Browser local storage can be cleared before validation.
- No production deploy is performed during this validation.

## Commands

```bash
npm run lint
npm run dev
```

Open the app at the Vite dev URL.

## Scenario 1: Mock-free page loading

1. Clear browser local storage for the app origin.
2. Open the app with sandbox/mock disabled or removed.
3. Visit each tab: Library, Teacher Console, Learner Terminal, Reports, Audio Jobs, Settings, Database.
4. Confirm each tab shows loading, live data, empty state, or clear error/action state.
5. Confirm no tab shows seed courses, seed learners, `Emily`, preview-only mock data, or local sandbox content as product data.

Expected result: every product tab is explainable from live database records or explicit schema/empty states.

## Scenario 2: Learner roster setup

1. Open Settings → Learners.
2. Verify the roster lists live database learner records.
3. Add missing requested learners: Lucy, Mason, Annie, Vox, Tailor, Wynnye, Cherry, Jay, Pen.
4. Attempt to add the same name again with different casing/spacing.

Expected result: duplicate creation is prevented or flagged for review; requested learners are available exactly as active roster choices unless duplicates already existed.

## Scenario 3: Classroom learner selection and progress

1. Create or open a live classroom room from Teacher Console.
2. Join from Learner Terminal by selecting an existing learner from the roster.
3. Open a round, submit one response, and close the round.
4. Open Reports and filter/find the selected learner.

Expected result: membership, response, and progress/history all reference the same learner id.

## Scenario 4: Safe learner removal

1. Choose a learner with existing classroom history.
2. Try removing the learner from Settings.
3. Confirm the UI prevents history loss and offers inactive/hide behavior.
4. Verify Reports still show historical responses for that learner id.

Expected result: history remains intact and inactive learners are not offered for future classroom selection unless explicitly included.

## Scenario 5: Audio Jobs schema drift

1. Open Audio Jobs.
2. If `audio_generation_jobs` is not present in the live schema, confirm the page shows a schema action message instead of querying indefinitely or failing silently.
3. If a migration is later approved/applied, regenerate/verify DB types and repeat Audio Jobs queue validation.

Expected result: schema drift is visible and gated; no silent failure.

## Release-Control Reminder

Before any migration, hosting deploy, or function deployment:

1. Commit current changes.
2. Tag production release when applicable.
3. Validate in preview/canary first.
4. Document rollback SQL or restore path.
5. Verify hosting/functions restore path.
6. Run post-deploy page checklist.
