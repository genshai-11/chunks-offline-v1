# Classroom Learner Flow Checklist

**Checked**: 2026-07-06

- [x] Learner Terminal receives live learners from App
- [x] Learner Terminal join form allows selecting an existing learner id
- [x] Learner Terminal join form allows typing a new learner name and persists it before membership
- [x] Learner Terminal syncs active room, active round, current responses, and my past responses from Supabase in live mode
- [x] Reports receives live learners and no longer reads `sandboxDb.learners`
- [ ] Teacher Console roster select/add-new flow is still pending; current task pass primarily covers Learner Terminal live classroom join
- [ ] Browser E2E: create/open room, join with selected learner, submit response, close round, verify Reports by learner id

## E2E status

No automated Playwright/Cypress E2E runner exists in this repo yet. Live classroom E2E is currently a manual quickstart validation path.

## 2026-07-06 fix pass

- [x] Teacher Console approved-resource count now uses a shared scope helper.
- [x] Scope helper falls back to lesson/section match if imported course_id drift causes exact course+lesson matching to return 0.
- [x] App now loads all `sentence_resources` via Supabase range pagination instead of the default first 1000 rows.
- [x] Teacher Console active room state now syncs from live Supabase tables instead of sandbox state after room creation.
- [x] Live round index now counts `room_rounds` in Supabase instead of sandbox rounds.

## 2026-07-06 room_code reload loop fix

- [x] Removed live-mode dispatch of `chunks_sandbox_db_change` from Learner Terminal.
- [x] Learner Terminal now polls live room state every 2.5s without forcing App to reload all Supabase tables.
- [x] Room-code deep links no longer cause continuous `learners?select=*` reload loops.

## 2026-07-06 realtime/start/privacy pass

- [x] Supabase Realtime publication verified for `practice_rooms`, `room_memberships`, `room_rounds`, and `learner_responses`.
- [x] Teacher Console subscribes to live room changes over Supabase Realtime WebSocket and falls back to 5s polling.
- [x] Learner Terminal subscribes to live room/round/response changes over Supabase Realtime WebSocket and falls back to 5s polling.
- [x] Teacher Console shows Start Session / Next Sentence and progress `current/total`.
- [x] Learner screen hides prompt text, English, Vietnamese, and learner-side audio; it only shows category/id, CCI X, CVR Ω, and response buttons.

## 2026-07-06 live room orchestration pass

- [x] Teacher roster now resolves live learner records from `room_memberships` instead of relying on stale top-level learner props, so newly joined learners display immediately.
- [x] Teacher Console running view has focus/expand toggle in the status header.
- [x] Teacher Console shows current Now Playing sentence with teacher-only playback, EN/VI switch, and speed/volume controls.
- [x] Teacher can select a different CCI standard before opening the next round.
- [x] Running view no longer shows a per-sentence Launch Round list; the session snapshot is advanced via Start Session / Open Next Sentence.
- [x] First-response capture locks all learner pads for the current round using live `room_memberships.can_answer=false` and database unique response enforcement.
- [x] New rounds unlock eligible learners again with `can_answer=true`.
- [x] Teacher receives a quick capture notification when the first response is recorded.
- [x] Constitution amended to v1.1.0 for live session orchestration and first-response integrity.

## 2026-07-06 session-turn auto-flow pass

- [x] Teacher UI now treats one live classroom as one session with many sentence turns.
- [x] Auto next-turn flow is enabled by default after the first accepted response.
- [x] Manual Close/Finalize button removed from the active turn card.
- [x] Manual/Auto toggle removed so the session cannot get stuck with no close control.
- [x] Active turn card now centers a large speaker button and shows teacher-only Vietnamese/English text below it.
- [x] Active turn header shows sequence as `TURN 001 / total` instead of sentence code/challenge header.
- [x] Learner response confirmation is now an in-page toast instead of browser alert.
- [x] Teacher Console now shows quick overview: captured turns / total turns, online learners, current turn, and CCI performance counts.

## 2026-07-06 teacher live controls cleanup

- [x] Removed duplicate standalone Now Playing/control card from Teacher Console.
- [x] Moved audio language, CCI reassignment, auto-next status, speech settings, and expand icon inside the Live Session Controls panel.
- [x] Removed manual `Open Next Sentence` / `Next Sentence` actions after session start.
- [x] Live session now exposes only `Start Session`; subsequent turns are auto-opened after the first response.
- [x] Auto-next countdown is immediate after the first captured response.
- [x] Added pre-launch and pre-start audio completeness checks requiring every approved snapshot resource to have both EN and VI audio before live classroom starts.

## 2026-07-06 audio preparation flow

- [x] Missing EN/VI audio no longer only blocks with an alert.
- [x] Teacher Console now shows an Audio Preparation panel listing missing audio resources.
- [x] Added `Prepare TTS & Launch` for room creation when approved scope audio is incomplete.
- [x] Added `Prepare TTS & Start` for existing session start when snapshot audio is incomplete.
- [x] Prepare action calls Supabase Edge Function `generate-resource-audio` for missing EN/VI tracks, then continues the launch/start flow automatically when all tracks succeed.
- [x] Failed TTS tracks remain visible and block start until fixed.

## 2026-07-06 learner UI/UX settings pass

- [x] Settings `Learner Screen Live Preview` now mirrors the real Learner Terminal privacy rules: no English/Vietnamese answer text in learner preview.
- [x] Added Settings controls for learner frontend UI/UX summary card: show/hide summary, title, color counts, and highest CPD.
- [x] Learner UI settings persist in localStorage under `chunks_learner_ui_settings` and update live via `chunks_learner_ui_settings_change` event.
- [x] Learner Terminal now tracks all responses by current learner in the current session.
- [x] Learner Terminal summary card can show total answered, result counts by response color/CCI performance button, and highest CPD.
