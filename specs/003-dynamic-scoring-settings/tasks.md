# Tasks: Dynamic Scoring Settings, TTS Controls, and Learner Analytics

**Input**: spec.md, plan.md, quickstart.md

## Phase 1: Setup and safety

- [x] T001 Review current git status and preserve existing local `src/components/HistoryTab.tsx` changes
- [x] T002 Inspect CCI category/card schema and current references in Supabase before any DB write
- [x] T003 Confirm destructive CCI replacement with Lucy before deleting any live DB records

## Phase 2: Settings and scoring UI foundation

- [x] T004 [US1] Update CCI category defaults and form state in `src/components/SettingsTab.tsx` to use M/S/E
- [x] T005 [US1] Add dynamic category input/select behavior in `src/components/SettingsTab.tsx`
- [x] T006 [US2] Remove Chinese realtime formula text in `src/components/SettingsTab.tsx` and `src/components/LearnerTerminalTab.tsx`
- [x] T007 [US2] Add local CPD formula preview settings in `src/components/SettingsTab.tsx`
- [x] T008 [US3] Add learner layout order settings and move controls in `src/components/SettingsTab.tsx`
- [x] T009 [US3] Render Learner Screen Live Preview modules according to configured order in `src/components/SettingsTab.tsx`

## Phase 3: TTS controls

- [x] T010 [US4] Add TTS preference read/write helpers in `src/lib/ttsService.ts`
- [x] T011 [US4] Pass provider/model/voice preferences in `generateResourceAudio()` request body in `src/lib/ttsService.ts`
- [x] T012 [US4] Add TTS settings UI or summary in `src/components/AudioGeneratorTab.tsx`

## Phase 4: Reports learner analytics

- [x] T013 [US5] Add learner sentence chart state and data model in `src/components/HistoryTab.tsx`
- [x] T014 [US5] Render learner-focused sentence timeline chart by round/CVR/CCI in `src/components/HistoryTab.tsx`
- [x] T015 [US5] Add point tooltip/labels showing sentence code, CPD, CVR, CCI, and grade color in `src/components/HistoryTab.tsx`

## Phase 5: Navigation and DB migration

- [x] T016 Rename navigation label `Config Settings` to `Setting` in `src/App.tsx`
- [x] T017 [US1] If Lucy confirms, apply FK-safe Supabase migration to upsert M/S/E categories and update/seed cards
- [x] T018 [US1] Verify Supabase CCI categories/cards after DB change

## Phase 6: Validation and release controls

- [x] T019 Run `npx tsc --noEmit`
- [x] T020 Run `npm run build`
- [x] T021 Validate quickstart scenarios in `specs/003-dynamic-scoring-settings/quickstart.md`
- [ ] T022 Commit changes with Craft Agent co-author trailer
- [ ] T023 If deploying, follow preview/tag/production release controls and update `docs/deployment-log.md`

## Dependencies

- T001-T003 before implementation.
- T004-T009 can proceed without DB writes.
- T017-T018 require explicit destructive/production-impact confirmation if deleting or replacing live DB records.
- T019-T021 before commit/deploy.
