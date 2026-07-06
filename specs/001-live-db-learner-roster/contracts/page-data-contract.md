# Contract: Page Live-Data Verification

Every product page/tab must satisfy this contract before implementation is accepted.

## Required States

For each page/tab:

1. **Loading**: visible while live data queries are pending.
2. **Loaded with data**: renders rows/cards from durable database records.
3. **Loaded empty**: shows an actionable empty/setup message; no sample data fallback.
4. **Error**: shows a non-silent error path with table/action context.
5. **Mutation success**: writes to durable database and refreshes from database.
6. **Mutation failure**: keeps prior UI state safe and shows the failure.
7. **Refresh/reload**: browser refresh still shows persisted data.
8. **Mock-free validation**: passes with localStorage cleared and sandbox disabled/removed.

## Page Matrix

- `App.tsx`: top-level database loading for all product collections; no `useSandbox` product fallback.
- `LibraryTab.tsx`: curriculum/resources/CCI/CVR CRUD and audio queue gating.
- `SimulatorTab.tsx`: room create/join/open/close/finish/response/progress with live learners.
- `LearnerTerminalTab.tsx`: roster selection/add-new, room state, active round, response submission.
- `HistoryTab.tsx`: joins reports to live learners by id.
- `AudioGeneratorTab.tsx`: enabled only when durable job schema exists.
- `SettingsTab.tsx`: live CCI/CVR plus learner roster management.
- `MigrationsTab.tsx`: schema health/drift visibility; no sandbox-to-live seed sync in product validation.

## Acceptance Evidence

Each page task should capture:

- Tables/RPCs used.
- Screenshots or notes for loading/empty/error states.
- Mutation path and persisted result.
- Any schema drift found and resolution.
