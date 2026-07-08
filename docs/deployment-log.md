# Deployment Log — Chunks Offline

Use this log for every Hosting, CI/CD, Supabase migration, or future Function update.

## 2026-07-07 09:57 GMT+7 — CI/CD setup and newest-code Firebase deploy

**Operator**: Lucy with Craft Agent  
**Repository**: <https://github.com/genshai-11/chunks-offline-v1>  
**Firebase project**: `chunks-offline`  
**Production URL**: <https://chunks-offline.web.app>

### Scope

- Add GitHub Actions CI/CD:
  - CI validation on PR/push/manual.
  - Firebase Hosting preview on PR/manual.
  - Firebase Hosting production deploy on release tags/manual.
- Add local npm deploy scripts.
- Add DevOps runbook.
- Deploy newest codebase containing:
  - short sentence code display helper;
  - Teacher Console audio launch gating for resources with no audio at all;
  - learner UI option to show/hide real-time calculation logic;
  - Reports/Learner/Teacher UI short-code display with full code retained in tooltip/title.

### Release-control checklist

- [x] Spec Kit gate reviewed.
- [x] User explicitly confirmed proceeding despite incomplete active feature checklists.
- [x] Local validation required before deploy.
- [x] Commit before deploy required.
- [x] Tag before production deploy required.
- [x] Firebase preview/canary required before production.
- [x] Production post-deploy verification required.
- [x] Rollback path documented in `docs/devops-runbook.md`.

### CI/CD service account

GitHub secret configured:

- `FIREBASE_SERVICE_ACCOUNT_CHUNKS_OFFLINE`

Service account:

- `github-actions-hosting@chunks-offline.iam.gserviceaccount.com`

IAM roles:

- `roles/firebasehosting.admin`
- `roles/viewer`
- `roles/serviceusage.serviceUsageConsumer`

### Commands run / expected validation

```bash
npm run lint
npm run build
npm run deploy:preview
npm run deploy:prod
```

### Rollback path

Preferred rollback: Firebase Console → Hosting → site `chunks-offline` → Release history → rollback to previous release.

Git rollback example:

```bash
git fetch --tags
git checkout <known-good-tag>
npm ci
npm run lint
npm run build
npx firebase-tools deploy --only hosting --project chunks-offline
```

### Notes / risks

- Active Spec Kit checklists still have incomplete live-data validation items. This release is allowed by Lucy's explicit confirmation.
- Production deploy is web Hosting only; no Supabase migration or Firebase Function deploy is included.
- GitHub production workflow is tag-gated to preserve release controls.

---

## 2026-07-07 09:57 GMT+7 — Follow-up newest-code playable-resource release

**Operator**: Lucy with Craft Agent  
**Release tag**: `firebase-hosting-20260707-0957-latest`  
**Production URL**: <https://chunks-offline.web.app>  
**Production workflow**: <https://github.com/genshai-11/chunks-offline-v1/actions/runs/28838753125>  
**Commit**: `9ee0502`

### Scope

- Teacher Console now uses playable resources only when opening/auto-advancing rounds.
- Live room creation can skip approved sentence resources that have no EN/VI audio at all instead of blocking the entire session when at least one playable resource exists.
- Session totals and next-round selection count playable resources only.

### Validation

- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [x] Firebase preview verified: https://chunks-offline--latest-20260707-0957-g0abvl0n.web.app
- [x] Production verified: https://chunks-offline.web.app served `assets/index-CRY8kEuy.js`

### Rollback

Use Firebase Console Hosting release rollback, or redeploy the previous tag `firebase-hosting-20260707-0957`.

### Notes / risks

- This is a Hosting-only release. No Supabase migration or Firebase Function deploy is included.

---

## 2026-07-07 10:31 GMT+7 — Learner join cache fix, roster-only join, EREL import

**Operator**: Lucy with Craft Agent  
**Production URL**: <https://chunks-offline.web.app>  
**Preview URL**: <https://chunks-offline--learner-erel-20260707-1031-e26j7bho.web.app>  
**Production workflow**: <https://github.com/genshai-11/chunks-offline-v1/actions/runs/28839872129>  
**Commit**: `ec70ea1`  
**Tag**: `firebase-hosting-20260707-1031-learner-erel`

### Scope

- Fix learner deep-link room cache for `/learner?room_code=CH-7175` and other room-code links.
- Keep learner identity but clear stale joined-room state when URL room code changes.
- Add required learner roster selection on Join Room so progress tracks by durable `learners.id` across live rooms.
- Add Settings toggle: allow/disallow learner-created profiles from Join Room. Default is off for strict roster tracking.
- Add EREL multi-topic lesson selection in Teacher Console.
- Import `docs/chunks-19topics.csv` into Supabase as course `EREL` with 19 topic lessons, 125 part sections, and 1,755 sentence resources.

### Supabase migration/import evidence

- Course id: `21d20930-fcac-54a2-a148-bfd31940cb5a`
- Course title: `EREL`
- Lessons/topics: 19
- Sections: 125
- Sentence resources: 1,755
- Import is deterministic/idempotent by stable UUIDs generated from course/topic/part/resource keys.

### Validation

- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [x] Supabase import counts verified
- [x] Firebase preview verified: `/learner?room_code=CH-7175` returned HTTP 200 and app shell
- [x] Production verified: <https://chunks-offline.web.app/learner?room_code=CH-7175> returned HTTP 200 and served `assets/index-Cml1KnwZ.js`

### Rollback

Hosting rollback: Firebase Console → Hosting → site `chunks-offline` → rollback to previous release.

Data rollback for EREL import only, if required and no live-room history depends on it:

```sql
delete from public.sentence_resources where course_id = '21d20930-fcac-54a2-a148-bfd31940cb5a';
delete from public.lesson_sections where lesson_id in (select id from public.lessons where course_id = '21d20930-fcac-54a2-a148-bfd31940cb5a');
delete from public.lessons where course_id = '21d20930-fcac-54a2-a148-bfd31940cb5a';
delete from public.courses where id = '21d20930-fcac-54a2-a148-bfd31940cb5a';
```

### Notes / risks

- Active Spec Kit checklists still had incomplete items; Lucy explicitly approved proceeding anyway.
- EREL import was applied before Hosting deploy so preview/production can load course data immediately.
- No Firebase Function deploy is included.

---

## 2026-07-07 10:52 GMT+7 — Planned Supabase course rename

**Operator**: Lucy with Craft Agent  
**Supabase project**: `ftfxekdxeoxizoyxuqoz`

### Scope

Rename course titles only; no table schema change, no Hosting deploy, no Firebase Function deploy.

Requested mapping:

- `Chunks-Material-Level-A` → `ERES-level-A`
- `Chunks-Material-Level-B` → `ERES-level-B`
- `EREL` → `EREL-level-B`

### Planned validation

- [x] List courses before rename
- [x] Apply idempotent title updates by stable course id
- [x] Verify course names and resource counts after rename

### Rollback SQL

```sql
update public.courses set title = 'Chunks-Material-Level-A', updated_at = now() where id = '20f87d29-56ce-52b9-8a15-708f2c14e5f5';
update public.courses set title = 'Chunks-Material-Level-B', updated_at = now() where id = '0b57d4a9-2063-57d8-874c-233de4a2eae0';
update public.courses set title = 'EREL', updated_at = now() where id = '21d20930-fcac-54a2-a148-bfd31940cb5a';
```

### Result

- [x] Completed successfully
- `ERES-level-A`: 15 lessons, 3,488 resources
- `ERES-level-B`: 15 lessons, 3,580 resources
- `EREL-level-B`: 19 lessons, 1,755 resources
- Production app shell verified: <https://chunks-offline.web.app> returned HTTP 200

---

## 2026-07-07 12:01 GMT+7 — Dynamic Data Explorer and Progress Chart Studio release

**Operator**: Lucy with Craft Agent  
**Commit**: `f3625fe`  
**Tag**: `firebase-hosting-20260707-1201-data-explorer`  
**Preview URL**: <https://chunks-offline--pr-1-knz0dt1n.web.app>  
**Production URL/version**: <https://chunks-offline.web.app> served `assets/index-UMagjzvc.js`  
**CI workflow**: <https://github.com/genshai-11/chunks-offline-v1/actions/runs/28842934634>  
**Preview workflow**: <https://github.com/genshai-11/chunks-offline-v1/actions/runs/28842942581>  
**Production workflow**: <https://github.com/genshai-11/chunks-offline-v1/actions/runs/28843012417>

### Scope

- Add Spec Kit feature artifacts for Dynamic Data Explorer & Chart Builder.
- Add Reports → Data Explorer with live response grid, filters, sorting, column visibility, row selection, chart builder, selected/filtered chart scope, and pivot-style summaries.
- Add Reports → Progress Chart Studio with supported chart templates, required input parameters, data-processing rules, and live preview from current report filters.
- Add TanStack table/virtual dependencies.
- Include related learner UI/teacher launch flow fixes already validated in the release tree.

### Validation

- [x] `npx tsc --noEmit` passed locally.
- [x] `npm run build` passed locally.
- [x] `npm run lint` hit a local wrapper parse issue; direct TypeScript validation passed and GitHub CI `npm run lint` passed.
- [x] GitHub CI passed for commit `f3625fe`.
- [x] Data Explorer quickstart scenarios validated locally against live report data.
- [x] Progress Chart Studio validated locally with template switching and live preview.
- [x] Firebase preview verified: `/`, `/reports`, and `/learner` returned HTTP 200 and app shell.
- [x] Production verified: `/`, `/reports`, and `/learner` returned HTTP 200 and served `assets/index-UMagjzvc.js`.

### Rollback

Preferred Hosting rollback: Firebase Console → project `chunks-offline` → Hosting → site `chunks-offline` → Release history → rollback to previous known-good release.

Git tag redeploy rollback:

```bash
git fetch --tags
git checkout firebase-hosting-20260707-1031-learner-erel
npm ci
npm run lint
npm run build
npx firebase-tools deploy --only hosting --project chunks-offline
```

After rollback, return to main:

```bash
git checkout main
git pull --ff-only origin main
```

### Notes / risks

- Hosting-only release; no Supabase migration or Firebase Function deploy included.
- GitHub Actions emitted a Node.js 20 deprecation annotation for upstream actions, but workflows completed successfully.
- Bundle size warning remains non-blocking and should be handled later with route/code splitting.

---

## 2026-07-07 12:34 GMT+7 — Reports audit table and RFC/RAC custom fields release

**Operator**: Lucy with Craft Agent  
**Commit**: `e519587`  
**Tag**: `firebase-hosting-20260707-1234-reports-audit`  
**Preview URL**: <https://chunks-offline--pr-2-j09hkaap.web.app>  
**Production URL/version**: <https://chunks-offline.web.app> served `assets/index-DBn0vAMH.js`  
**CI workflow**: <https://github.com/genshai-11/chunks-offline-v1/actions/runs/28844235280>  
**Preview workflow**: <https://github.com/genshai-11/chunks-offline-v1/actions/runs/28844269310>  
**Production workflow**: <https://github.com/genshai-11/chunks-offline-v1/actions/runs/28844345469>

### Scope

- Compact Reports audit table columns so `CCI` and `CPD (V)` fit better in one screen.
- Add audit table sorting by time, learner A-Z, grade, CCI result, and CPD result.
- Add collapsible formula guide for CCI/CPD/RFC/RAC formulas.
- Add one-click custom fields for:
  - `RFC = red_count / total_responses`
  - `RAC = 1 - RFC`
- Allow custom fields such as RFC/RAC to be selected as chart Y-axis metrics.

### Validation

- [x] `npm run --silent lint` passed locally.
- [x] `npm run build` passed locally.
- [x] GitHub CI passed for commit `e519587`.
- [x] Firebase preview verified: `/`, `/reports`, and `/learner` returned HTTP 200 and app shell.
- [x] Production verified: `/`, `/reports`, and `/learner` returned HTTP 200 and served `assets/index-DBn0vAMH.js`.

### Rollback

Preferred Hosting rollback: Firebase Console → project `chunks-offline` → Hosting → site `chunks-offline` → Release history → rollback to previous known-good release.

Git tag redeploy rollback:

```bash
git fetch --tags
git checkout firebase-hosting-20260707-1201-data-explorer
npm ci
npm run lint
npm run build
npx firebase-tools deploy --only hosting --project chunks-offline
```

After rollback, return to main:

```bash
git checkout main
git pull --ff-only origin main
```

### Notes / risks

- Hosting-only release; no Supabase migration or Firebase Function deploy included.
- Active Spec Kit live-data checklists still have incomplete items; Lucy explicitly requested CI/CD deployment for this UI-only release.
- GitHub Actions emitted the existing Node.js 20 deprecation annotation for upstream actions, but workflows completed successfully.
- Bundle size warning remains non-blocking and should be handled later with route/code splitting.

---

## 2026-07-07 12:49 GMT+7 — Live room next-turn response flow release

**Operator**: Lucy with Craft Agent  
**Commit**: `dc84fa9`  
**Tag**: `firebase-hosting-20260707-1249-live-next-turn`  
**Preview URL**: <https://chunks-offline--pr-3-7rmq1cqz.web.app>  
**Production URL/version**: <https://chunks-offline.web.app> served `assets/index-DBe6dyW6.js`  
**CI workflow**: <https://github.com/genshai-11/chunks-offline-v1/actions/runs/28844609515>  
**Preview workflow**: <https://github.com/genshai-11/chunks-offline-v1/actions/runs/28844694493>  
**Production workflow**: <https://github.com/genshai-11/chunks-offline-v1/actions/runs/28844773848>

### Scope

- Fix Teacher Console live-room state after the first learner response is captured.
- When CCI Performance increments, the console no longer continues to show “Waiting for first response / auto-opening next turn”.
- Between turns, show the next sentence preview, speaker/play control, and **Open Next Turn Speaker Prompt** fallback button.
- In focus mode, give the main prompt canvas more width than the roster panel.
- Add roster-side user response totals and unique responder counts.
- Sync Wiki skeleton troubleshooting docs for the expected live-room next-turn behavior.

### Validation

- [x] `npx tsc --noEmit` passed locally.
- [x] `npm run build` passed locally.
- [x] `npm run lint` hit the known local wrapper JSON parse issue; GitHub CI validation passed.
- [x] GitHub CI passed for commit `dc84fa9`.
- [x] Firebase preview verified: `/`, `/reports`, and `/learner` returned HTTP 200 and app shell.
- [x] Production verified: `/`, `/reports`, and `/learner` returned HTTP 200 and served `assets/index-DBe6dyW6.js`.

### Rollback

Preferred Hosting rollback: Firebase Console → project `chunks-offline` → Hosting → site `chunks-offline` → Release history → rollback to previous known-good release.

Git tag redeploy rollback:

```bash
git fetch --tags
git checkout firebase-hosting-20260707-1234-reports-audit
npm ci
npm run lint
npm run build
npx firebase-tools deploy --only hosting --project chunks-offline
```

After rollback, return to main:

```bash
git checkout main
git pull --ff-only origin main
```

### Notes / risks

- Hosting-only release; no Supabase migration or Firebase Function deploy included.
- Release was deployed from the clean GitHub Actions checkout at tag `firebase-hosting-20260707-1249-live-next-turn`; local workspace had unrelated in-progress files and was not used for the build.
- GitHub Actions emitted the existing Node.js 20 deprecation annotation for upstream actions, but workflows completed successfully.
- Bundle size warning remains non-blocking and should be handled later with route/code splitting.

---

## 2026-07-07 12:56 GMT+7 — Supabase CCI categories M/S/E migration

**Operator**: Lucy with Craft Agent  
**Supabase project**: `ftfxekdxeoxizoyxuqoz`  
**Hosting deploy**: Not included  
**Firebase Functions deploy**: Not included

### Scope

- Replace legacy CCI category `standard` with simplified categories:
  - `M`
  - `S`
  - `E`
- Preserve existing `cci_standard_cards` rows to avoid breaking `room_rounds` foreign-key history.
- Reassign existing cards:
  - `1-ON-1` / X=10 → `M`
  - `RPD FREE` / X=15 → `S`
  - `n chunks` / X=30 → `E`
- Delete old category row `standard` only after no cards referenced it.

### Validation

- [x] Lucy explicitly confirmed: “Apply safe CCI MSE migration”.
- [x] Verified pre-migration card references: all 3 cards had existing `room_rounds` references.
- [x] Applied FK-safe transaction; no CCI card rows were deleted.
- [x] Verified categories after migration: `E`, `M`, `S`.
- [x] Verified CCI cards after migration:
  - `1-ON-1`: category `M`, referenced rounds `42`
  - `RPD FREE`: category `S`, referenced rounds `40`
  - `n chunks`: category `E`, referenced rounds `40`
- [x] Verified legacy `standard` card references count is `0`.

### Rollback SQL

```sql
begin;

insert into public.cci_categories (id, label, active, created_at, updated_at)
values ('standard', 'CCI Standard', true, now(), now())
on conflict (id) do update set
  label = excluded.label,
  active = true,
  updated_at = now();

update public.cci_standard_cards
set category_id = 'standard', updated_at = now()
where id in (
  'd3e9d39d-2b29-435d-9648-5b03e63f5e1a',
  '288d85a3-399c-4024-bfef-9810c7ad1af5',
  'a4793913-0ae0-4b13-ba48-3b1b173c805e'
);

delete from public.cci_categories
where id in ('M', 'S', 'E')
  and not exists (
    select 1 from public.cci_standard_cards where category_id in ('M', 'S', 'E')
  );

commit;
```

### Notes / risks

- This is a live Supabase data update only; no schema migration, Hosting deploy, or Function deploy included.
- Historical room/report references are preserved because card IDs were not changed or deleted.
- Current production Hosting may still have older Settings UI until the pending frontend changes are committed/deployed.

---

## 2026-07-07 13:17 GMT+7 — Live auto-advance controls and dynamic scoring settings release

**Operator**: Lucy with Craft Agent  
**Commit**: `06bc597`  
**Tag**: `firebase-hosting-20260707-1317-live-auto-advance`  
**Preview URL**: <https://chunks-offline--pr-4-1m3px3jc.web.app>  
**Production URL/version**: <https://chunks-offline.web.app> served `assets/index-NrUGWek4.js`  
**CI workflow**: <https://github.com/genshai-11/chunks-offline-v1/actions/runs/28845660746>  
**Preview workflow**: <https://github.com/genshai-11/chunks-offline-v1/actions/runs/28845840982>  
**Production workflow**: <https://github.com/genshai-11/chunks-offline-v1/actions/runs/28845907968>

### Scope

- Deploy dynamic scoring settings controls from `a02450b`, including M/S/E CCI settings UI, formula/layout/TTS controls, learner analytics updates, and related Wiki skeleton sync.
- Deploy live room auto-advance improvements from `06bc597`:
  - after first-response capture, close the captured round and auto-open the next turn in sequence;
  - auto-play the next open turn when **Auto-play on launch** is enabled;
  - add Space replay and ArrowRight next-turn keyboard shortcuts;
  - show EN/VI teacher prompt text below next-turn speaker preview;
  - show per-roster learner response counts.
- Include the previously logged FK-safe Supabase CCI M/S/E migration in the release context; no new Supabase write was performed during this Hosting release.

### Validation

- [x] `npx tsc --noEmit` passed locally before commit `06bc597`.
- [x] `npm run build` passed locally before commit `06bc597`.
- [x] `npm run lint` hit the known local wrapper JSON parse issue; GitHub CI validation passed.
- [x] GitHub CI passed for commit `06bc597`.
- [x] Firebase preview verified: `/`, `/settings`, `/reports`, and `/learner` returned HTTP 200 and app shell.
- [x] Production verified: `/`, `/settings`, `/reports`, and `/learner` returned HTTP 200 and served `assets/index-NrUGWek4.js`.

### Rollback

Preferred Hosting rollback: Firebase Console → project `chunks-offline` → Hosting → site `chunks-offline` → Release history → rollback to previous known-good release.

Git tag redeploy rollback:

```bash
git fetch --tags
git checkout firebase-hosting-20260707-1249-live-next-turn
npm ci
npm run lint
npm run build
npx firebase-tools deploy --only hosting --project chunks-offline
```

After rollback, return to main:

```bash
git checkout main
git pull --ff-only origin main
```

If CCI M/S/E data must also be rolled back, use the rollback SQL recorded in the 2026-07-07 12:56 GMT+7 Supabase CCI categories M/S/E migration entry.

### Notes / risks

- Hosting-only release; no Supabase migration or Firebase Function deploy was executed in this release.
- Production release was tag-gated and deployed from GitHub Actions clean checkout.
- GitHub Actions emitted the existing Node.js 20 deprecation annotation for upstream actions, but workflows completed successfully.
- Bundle size warning remains non-blocking and should be handled later with route/code splitting.

---

## 2026-07-07 13:20 GMT+7 — Supabase topic 19 Farewell party English phrase cleanup

**Operator**: Lucy with Craft Agent  
**Supabase project**: `ftfxekdxeoxizoyxuqoz`  
**Course**: `EREL-level-B`  
**Lesson**: `19. Farewell party` (`57196c7b-4a77-50d9-aca3-c2d7005da29d`)  
**Hosting deploy**: Not applicable; data-only update.

### Scope

- Cleaned 22 `public.sentence_resources.text_en` values in topic 19 that contained slash-separated alternative phrases.
- Rule applied: keep only the first phrase before `/`.
- Examples:
  - `Throw a party / Have a party / ...` → `Throw a party`
  - `Here's to someone or something... / Let's drink... / ...` → `Here's to someone or something...`

### Validation

- [x] Found topic 19 lesson and confirmed 70 resources.
- [x] Updated exactly 22 resources with `text_en like '%/%'` in lesson 19.
- [x] Verified remaining slash-separated `text_en` count for lesson 19 is `0`.
- [x] Verified sample rows:
  - `EREL-T19-VOCAB-002` → `Throw a party`
  - `EREL-T19-SLANG-003` → `Here's to someone or something...`

### Rollback

Run this SQL to restore the previous slash-separated English values:

```sql
update public.sentence_resources as sr
set text_en = rollback.old_text_en,
    updated_at = now()
from (values
  ('4628be62-4866-5426-95a7-789150e6d66f', $$Apart from that / Other than that / aside from that / besides that / except (for) that / excluding that$$),
  ('8f27a42c-2d13-5c89-8f21-884e59f8f32a', $$Here's to someone or something... / Let's drink to someone or something... / let's propose a toast to someone or something... / let's drink a toast to someone or something... / let's raise our glasses to someone or something... /$$),
  ('913230f9-e611-5ef0-95f1-4fa7102d1e1f', $$Throw a party / Have a party / give a party / hold a party / arrange a party / host a party / make a party$$),
  ('50559ec5-5fa1-568d-b576-3c87f50c126e', $$Bid farewell / Say farewell / say goodbye$$),
  ('6068fb2e-3c8d-5888-b2bc-330aac57ab82', $$Frankly speaking / Honestly speaking / genuinely speaking / to put it bluntly / lemme get this straight$$),
  ('69e5a9b3-5c08-5f8e-9a2d-cc7faa9deca8', $$Famous quote / Famous saying / famous quotation / famous citation$$),
  ('c3b46232-44a0-5e00-ad98-89432bbd897d', $$Just kidding / Just joking / just messing (around) / just for a laugh / just playing / don't take it seriously$$),
  ('a7d3b687-f4f1-5f36-9c0f-2e0de90078c6', $$Fellow worker / Office buddy / work buddy / workmate / coworker$$),
  ('fc363432-9da3-5534-89de-dfd9b45b6ffe', $$Shortcomings / Flaws / defects / deficiencies / imperfections$$),
  ('59225b8d-d9eb-516d-81db-09e3e1d93a32', $$Approve / Ratify / endorse / validate / sanction$$),
  ('4a1b8e37-b8f2-570d-bfc9-d8659ffba563', $$Catch a flight / Board a flight / get on a flight$$),
  ('bf67b747-0170-5149-b8c0-cc22c4e55f07', $$Guys / Folks / everybody / everyone / people$$),
  ('6f942c01-5191-5f47-af22-2115d5e1e89c', $$Resignation letter / Letter of resignation$$),
  ('064767f0-61ff-5295-a358-e180ca9a6b7a', $$Completely understand / Fully understand / entirely understand / totally understand$$),
  ('d8531a0b-d9c9-5b77-b37f-45340b4455d3', $$Consistency / Constancy / steadiness$$),
  ('44f443c1-d2aa-5830-9a3b-98560e80d23e', $$Persistence / Tenacity / stubbornness / obstinacy / determination / perseverance$$),
  ('e241ad63-0ccf-5ecc-8a7f-291ae7490ee3', $$There's a thin line / There's a fine line / there's a slim line$$),
  ('f396a238-8e92-5d3e-a8e3-a88a80d92f9e', $$Those two / Those two things$$),
  ('510105a9-6184-5222-9678-92e9960e5cdb', $$Think it through / Think it over$$),
  ('8216d55b-4d73-5730-bed2-55ddc78eb6e2', $$Bad mouth / Defame / speak ill$$),
  ('f9040d78-5bf5-5f88-a752-c8589f11762b', $$In front of boss / Before boss / ahead of boss / in the presence of boss$$),
  ('9b5eb66c-f578-5406-b5a8-381006797189', $$Officially / Formally$$)
) as rollback(id, old_text_en)
where sr.id = rollback.id::uuid;
```

### Notes / risks

- Data-only Supabase update; no Firebase Hosting, Supabase schema migration, or Firebase Function deploy included.
- Existing generated audio URLs, if any, were not regenerated in this update.
- The update intentionally affects only topic 19 rows whose English text contained `/`.

---

## 2026-07-07 13:42 GMT+7 — Supabase session data reset and tuned Test Session 01 reseed

**Operator**: Lucy with Craft Agent  
**Supabase project**: `ftfxekdxeoxizoyxuqoz`  
**Course**: `EREL-level-B`  
**Lesson**: `19. Farewell party` (`57196c7b-4a77-50d9-aca3-c2d7005da29d`)  
**Hosting deploy**: Not applicable; data-only update.

### Scope

- Deleted existing live session/round data from:
  - `public.learner_progress`
  - `public.learner_responses`
  - `public.room_rounds`
  - `public.room_memberships`
  - `public.practice_rooms`
- Recreated a single seeded room: `TEST SESSION 01` / `CH-9001`.
- Added all 10 active learners to the room.
- Seeded 380 closed rounds and 380 finalized learner responses with uneven per-learner counts:
  - Annie 30
  - Cherry 32
  - Cy 34
  - Jay 36
  - Lucy 38
  - Mason 40
  - Pen 42
  - Tailor 44
  - Vox 45
  - Wynnye 39
- Tuned the seed so several learners show a much clearer learner-level pattern of higher CVR + higher CCI difficulty causing higher red-grade probability over time.

### Validation

- [x] Confirmed 10 active learners before reseed.
- [x] Deleted prior session data successfully.
- [x] Seeded 10 room memberships, 380 room rounds, and 380 learner responses.
- [x] Finalized all rounds to `closed` and rebuilt 10 `learner_progress` rows.
- [x] Verified grade mix after tuned seed:
  - Red: 211
  - Yellow: 59
  - Green: 110
- [x] Verified learner-level summaries showed steeper high-CVR/high-CCI profiles for several learners:
  - Wynnye → 39 responses, 82.1% red, avg CVR 9.23, avg CCI X 13.08
  - Vox → 45 responses, 77.8% red, avg CVR 9.20, avg CCI X 13.11
  - Tailor → 44 responses, 68.2% red, avg CVR 9.14, avg CCI X 12.95
  - Jay → 36 responses, 22.2% red, avg CVR 5.97, avg CCI X 7.64
  - Cherry → 32 responses, 28.1% red, avg CVR 5.97, avg CCI X 7.66
- [x] Verified all seeded room rounds are now `closed`.

### Rollback

This change intentionally destroyed prior live session history. Exact pre-reset room/round/response data cannot be restored from application tables after the delete.

If previous live history must be recovered, restore the Supabase database from backup/PITR to a point before **2026-07-07 13:42 GMT+7**.

If only the seeded test room must be removed, delete the current seeded session data with:

```sql
delete from public.learner_progress;
delete from public.learner_responses;
delete from public.room_rounds;
delete from public.room_memberships;
delete from public.practice_rooms where title = 'TEST SESSION 01';
```

### Notes / risks

- Data-only Supabase update; no Firebase Hosting deploy, Supabase schema migration, or Firebase Function deploy included.
- The seeded response model uses only `red`, `yellow`, and `green` because the current database submission workflow does not accept `purple` through `submit_room_response`.
- This entry supersedes the earlier same-session 380-response seed with a stronger learner-level CVR→red relationship.

---

## 2026-07-07 13:43 GMT+7 — Supabase topic 19 Farewell party English audio URL cleanup

**Operator**: Lucy with Craft Agent  
**Supabase project**: `ftfxekdxeoxizoyxuqoz`  
**Course**: `EREL-level-B`  
**Lesson**: `19. Farewell party` (`57196c7b-4a77-50d9-aca3-c2d7005da29d`)  
**Hosting deploy**: Not applicable; data-only update.

### Scope

- Cleared `public.sentence_resources.audio_en_url` for all 70 topic-19 resources.
- Preserved `audio_vi_url` and `audio_url` values.
- Did not delete storage objects; only the DB URL field was nulled.

### Validation

- [x] Confirmed topic 19 contains 70 resources before update.
- [x] Confirmed topic 19 had 70 non-null `audio_en_url` values before update.
- [x] Cleared exactly 70 `audio_en_url` values.
- [x] Verified topic 19 post-update counts:
  - `audio_en_url`: 0
  - `audio_vi_url`: 70
  - `audio_url`: 70

### Rollback

Restore the prior deterministic English audio URLs with:

```sql
update public.sentence_resources
set audio_en_url = 'https://ftfxekdxeoxizoyxuqoz.supabase.co/storage/v1/object/public/resource-audio/audio/generated/' || replace(sentence_code, '-', '_') || '.en.mp3',
    updated_at = now()
where lesson_id = '57196c7b-4a77-50d9-aca3-c2d7005da29d';
```

### Notes / risks

- Data-only Supabase update; no Firebase Hosting deploy, Supabase schema migration, or Firebase Function deploy included.
- This update removes English-audio URLs from topic 19 resources at the database level but does not remove the underlying storage files.

---

## 2026-07-07 14:25 GMT+7 — Live session rejoin and safe close Hosting release

**Operator**: Lucy with Craft Agent  
**Commit**: `9bb6d52`  
**Tag**: `firebase-hosting-20260707-1425-live-session-safe-close`  
**Preview URL**: https://chunks-offline--pr-5-868482z3.web.app  
**Production URL/version**: https://chunks-offline.web.app served `assets/index-CUalHq_9.js`  
**Preview workflow**: https://github.com/genshai-11/chunks-offline-v1/actions/runs/28849250937  
**Production workflow**: https://github.com/genshai-11/chunks-offline-v1/actions/runs/28849325195

### Scope

- Added `/live-session` route and navigation entry for live classroom session management.
- Added teacher live-session manager for active room rejoin and recent finished-room review.
- Fixed auto-advance so captured rounds close and the next playable sentence opens in the same teacher canvas.
- Updated teacher exit/end-session flow to clear active round pointers and turn learner answer pads off.
- Updated learner terminal response gating to respect `room_memberships.can_answer` and finished-room state.
- Updated Spec Kit spec/tasks/quickstart for live-session rejoin, auto-advance, learner-safe UI, and safe close validation.

### Validation

- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [x] Local `npm run lint` attempted; blocked by known RTK/ESLint JSON wrapper issue: `ESLint output (JSON parse failed: EOF while parsing a value at line 1 column 0)`.
- [x] GitHub preview workflow passed, including CI `npm run lint` and `npm run build`.
- [x] Preview verified:
  - `/` → 200, `assets/index-CUalHq_9.js`
  - `/live-session` → 200, `assets/index-CUalHq_9.js`
  - `/teacher` → 200, `assets/index-CUalHq_9.js`
  - `/learner` → 200, `assets/index-CUalHq_9.js`
  - `/settings` → 200, `assets/index-CUalHq_9.js`
  - `/reports` → 200, `assets/index-CUalHq_9.js`
- [x] Production workflow passed, including CI `npm run lint` and `npm run build`.
- [x] Production verified:
  - `/` → 200, `assets/index-CUalHq_9.js`
  - `/live-session` → 200, `assets/index-CUalHq_9.js`
  - `/teacher` → 200, `assets/index-CUalHq_9.js`
  - `/learner` → 200, `assets/index-CUalHq_9.js`
  - `/settings` → 200, `assets/index-CUalHq_9.js`
  - `/reports` → 200, `assets/index-CUalHq_9.js`

### Rollback

Preferred rollback: Firebase Console → Hosting → site `chunks-offline` → Release history → roll back to previous known-good release.

Git tag rollback example:

```bash
git fetch --tags
git checkout firebase-hosting-20260707-1317-live-auto-advance
npm ci
npm run lint
npm run build
npx firebase-tools deploy --only hosting --project chunks-offline
```

After rollback, verify https://chunks-offline.web.app and record the rollback in this log.

### Notes / risks

- Hosting-only release. No Supabase schema migration, data mutation, Storage change, or Firebase Function deploy included.
- GitHub Actions emitted a Node.js 20 deprecation warning for `actions/checkout@v4` and `actions/setup-node@v4` being forced to Node.js 24 by the runner; deployment still passed.
- Full two-browser teacher/learner manual validation remains tracked as Spec Kit task `T053`.

---

## 2026-07-07 14:43 GMT+7 — Live auto-advance no-skip Hosting release

**Operator**: Lucy with Craft Agent  
**Commit**: `17bf2a1`  
**Tag**: `firebase-hosting-20260707-1443-live-auto-noskip`  
**Preview URL**: https://chunks-offline--pr-6-supreovo.web.app  
**Production URL/version**: https://chunks-offline.web.app served `assets/index-37Qcpce3.js`  
**Preview workflow**: https://github.com/genshai-11/chunks-offline-v1/actions/runs/28850283335  
**Production workflow**: https://github.com/genshai-11/chunks-offline-v1/actions/runs/28850364996

### Scope

- Fixed live auto-advance skipping every other turn by filtering captured responses to the current open round before starting the auto-countdown.
- Cleared stale previous-round responses when opening a new round so realtime lag cannot auto-close the next sentence.
- Removed the cancellable extra handoff timer after the 1-second countdown so the close/open-next operation runs immediately after countdown completion.
- Added active red-canvas controls while a round is open:
  - Audio language EN/VI
  - Next CCI selector
  - Auto-play on launch
  - Replay Prompt
  - Speech Settings for volume/rate/pitch
- Updated Spec Kit quickstart/tasks to validate consecutive 001 → 002 → 003 progression and active-canvas settings.

### Validation

- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [x] Local `npm run lint` attempted; blocked by known RTK/ESLint JSON wrapper issue: `ESLint output (JSON parse failed: EOF while parsing a value at line 1 column 0)`.
- [x] GitHub preview workflow passed, including CI `npm run lint` and `npm run build`.
- [x] Preview verified:
  - `/` → 200, `assets/index-37Qcpce3.js`
  - `/live-session` → 200, `assets/index-37Qcpce3.js`
  - `/teacher` → 200, `assets/index-37Qcpce3.js`
  - `/learner` → 200, `assets/index-37Qcpce3.js`
  - `/settings` → 200, `assets/index-37Qcpce3.js`
  - `/reports` → 200, `assets/index-37Qcpce3.js`
- [x] Production workflow passed, including CI `npm run lint` and `npm run build`.
- [x] Production verified:
  - `/` → 200, `assets/index-37Qcpce3.js`
  - `/live-session` → 200, `assets/index-37Qcpce3.js`
  - `/teacher` → 200, `assets/index-37Qcpce3.js`
  - `/learner` → 200, `assets/index-37Qcpce3.js`
  - `/settings` → 200, `assets/index-37Qcpce3.js`
  - `/reports` → 200, `assets/index-37Qcpce3.js`

### Rollback

Preferred rollback: Firebase Console → Hosting → site `chunks-offline` → Release history → roll back to previous known-good release.

Git tag rollback example:

```bash
git fetch --tags
git checkout firebase-hosting-20260707-1425-live-session-safe-close
npm ci
npm run lint
npm run build
npx firebase-tools deploy --only hosting --project chunks-offline
```

After rollback, verify https://chunks-offline.web.app and record the rollback in this log.

### Notes / risks

- Hosting-only release. No Supabase schema migration, data mutation, Storage change, or Firebase Function deploy included.
- GitHub Actions emitted a Node.js 20 deprecation warning for `actions/checkout@v4` and `actions/setup-node@v4` being forced to Node.js 24 by the runner; deployment still passed.
- Browser-level manual validation should confirm the teacher flow advances 001 → 002 → 003 with real learner submissions.

---

## 2026-07-07 14:58 GMT+7 — Live audio autoplay controls Hosting release

**Operator**: Lucy with Craft Agent  
**Commit**: `43884e5`  
**Tag**: `firebase-hosting-20260707-1458-live-audio-controls`  
**Preview URL**: https://chunks-offline--pr-7-8baie2t2.web.app  
**Production URL/version**: https://chunks-offline.web.app served `assets/index-B-fkWJjc.js`  
**Preview workflow**: https://github.com/genshai-11/chunks-offline-v1/actions/runs/28851038330  
**Production workflow**: https://github.com/genshai-11/chunks-offline-v1/actions/runs/28851183241

### Scope

- Added separate teacher audio mode controls:
  - **Auto-play open turn**: automatically plays audio when the real learner-answer round opens.
  - **Auto-preview next**: automatically plays audio when the next-sentence preview screen is visible between turns.
- Kept manual controls available when either auto mode is off:
  - Replay Prompt in the active red canvas.
  - Play Prompt in the next-preview canvas.
- Added the same auto/manual controls to the red active canvas and idle/next-preview settings area.
- Updated Spec Kit quickstart/tasks to validate teacher-controlled auto/manual audio for open turns and next-preview screens.

### Validation

- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [x] Local `npm run lint` attempted; blocked by known RTK/ESLint JSON wrapper issue: `ESLint output (JSON parse failed: EOF while parsing a value at line 1 column 0)`.
- [x] GitHub preview workflow passed, including CI `npm run lint` and `npm run build`.
- [x] Preview verified:
  - `/` → 200, `assets/index-B-fkWJjc.js`
  - `/live-session` → 200, `assets/index-B-fkWJjc.js`
  - `/teacher` → 200, `assets/index-B-fkWJjc.js`
  - `/learner` → 200, `assets/index-B-fkWJjc.js`
  - `/settings` → 200, `assets/index-B-fkWJjc.js`
  - `/reports` → 200, `assets/index-B-fkWJjc.js`
- [x] Production workflow passed, including CI `npm run lint` and `npm run build`.
- [x] Production verified:
  - `/` → 200, `assets/index-B-fkWJjc.js`
  - `/live-session` → 200, `assets/index-B-fkWJjc.js`
  - `/teacher` → 200, `assets/index-B-fkWJjc.js`
  - `/learner` → 200, `assets/index-B-fkWJjc.js`
  - `/settings` → 200, `assets/index-B-fkWJjc.js`
  - `/reports` → 200, `assets/index-B-fkWJjc.js`

### Rollback

Preferred rollback: Firebase Console → Hosting → site `chunks-offline` → Release history → roll back to previous known-good release.

Git tag rollback example:

```bash
git fetch --tags
git checkout firebase-hosting-20260707-1443-live-auto-noskip
npm ci
npm run lint
npm run build
npx firebase-tools deploy --only hosting --project chunks-offline
```

After rollback, verify https://chunks-offline.web.app and record the rollback in this log.

### Notes / risks

- Hosting-only release. No Supabase schema migration, data mutation, Storage change, or Firebase Function deploy included.
- GitHub Actions emitted a Node.js 20 deprecation warning for `actions/checkout@v4` and `actions/setup-node@v4` being forced to Node.js 24 by the runner; deployment still passed.
- Browser-level manual validation should confirm teacher preference behavior for both toggles: auto on and manual-only off.

---

## 2026-07-07 15:40 GMT+7 — Moved standards to Settings and Library tab cleanup

**Operator**: Lucy with Craft Agent  
**Commit**: `56e9ae3`  
**Tag**: `firebase-hosting-20260707-1540-settings-standards`  
**Preview URL**: https://chunks-offline--preview-local-mpqkh436.web.app  
**Production URL/version**: https://chunks-offline.web.app  

### Scope

- Moved CCI categories, CCI standard cards, and CVR standard cards fully to Settings.
- Added CCI Categories Manager in Settings supporting full CRUD (create, edit, delete) of `cci_categories`.
- Restricted CCI standard cards to assignable managed categories only (removed old free-typed category behavior).
- Cleaned up Library tab, removing CCI/CVR sub-tabs and handlers, leaving it sentence/resource-only.
- Updated Navigation label to 'Library' (previously 'Library & Standards').
- Refactored `App.tsx` to load `cci_categories` from Supabase and pass them into `SettingsTab.tsx`.
- Updated Progress Report in History tab: changed filters to use "Session" and "Learner" wording, added Grade subfilter buttons, and hid the irrelevant custom chart builder/custom-field canvas.

### Validation

- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [x] Local `npm run lint` checked.
- [x] Local `npm run deploy:preview` channel deployed and verified: https://chunks-offline--preview-local-mpqkh436.web.app
  - Nav label is "Library"
  - Settings shows "CCI Categories Manager" with CRUD and CCI standard cards using managed categories.
  - History shows "Session" + "Learner" and hides custom chart builder.

### Rollback

Preferred rollback: Firebase Console → Hosting → site `chunks-offline` → Release history → roll back to previous known-good release.

Git tag rollback example:

```bash
git fetch --tags
git checkout firebase-hosting-20260707-1458-live-audio-controls
npm ci
npm run lint
npm run build
npx firebase-tools deploy --only hosting --project chunks-offline
```

### Notes / risks

- Hosting-only release. No database schema migration or function update required since `cci_categories` table is already in place.
- Ensure that active CCI cards are properly mapped to existing categories or new categories are created for them.

---

## 2026-07-07 16:25 GMT+7 — Audio cache buster implementation

**Operator**: Lucy with Craft Agent  
**Commit**: `e37bf47`  
**Tag**: `firebase-hosting-20260707-1625-audio-cachebuster`  
**Preview URL**: https://chunks-offline--preview-local-mpqkh436.web.app  
**Production URL/version**: https://chunks-offline.web.app  

### Scope

- Updated `resolveResourceAudioUrl` in [src/lib/audioUrl.ts](file:///C:/Users/gensh/OneDrive/M%C3%A1y%20t%C3%ADnh/LUCY/PROJECT-WORKPLACE/chunks-offline-v1/src/lib/audioUrl.ts) to accept an optional `updatedAt` parameter. When provided, it appends a query parameter `?t={timestamp}` as a cache-buster to bypass browser and CDN caching of overwritten audio files in Supabase Storage.
- Modified `playSentenceAudio` in [src/components/SimulatorTab.tsx](file:///C:/Users/gensh/OneDrive/M%C3%A1y%20t%C3%ADnh/LUCY/PROJECT-WORKPLACE/chunks-offline-v1/src/components/SimulatorTab.tsx) to pass `res.updated_at` when calling `resolveResourceAudioUrl`.
- Modified `playAudio` in [src/components/LibraryTab.tsx](file:///C:/Users/gensh/OneDrive/M%C3%A1y%20t%C3%ADnh/LUCY/PROJECT-WORKPLACE/chunks-offline-v1/src/components/LibraryTab.tsx) to accept and pass the resource's `updated_at` timestamp.

### Validation

- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [x] Local `npm run deploy:preview` channel deployed and verified: https://chunks-offline--preview-local-mpqkh436.web.app
  - Verified audio playback URLs correctly append the `?t={timestamp}` query parameter when playing.

### Rollback

Preferred rollback: Firebase Console → Hosting → site `chunks-offline` → Release history → roll back to previous known-good release.

Git tag rollback example:

```bash
git fetch --tags
git checkout firebase-hosting-20260707-1540-settings-standards
npm ci
npm run lint
npm run build
npx firebase-tools deploy --only hosting --project chunks-offline
```

### Notes / risks

- Low-risk UI-only change. Does not mutate database schema or storage paths.

---

## 2026-07-07 16:30 GMT+7 — Auto-play open turn logic fix

**Operator**: Lucy with Craft Agent  
**Commit**: `d0ce32c`  
**Tag**: `firebase-hosting-20260707-1630-autoplay-fix`  
**Preview URL**: https://chunks-offline--preview-local-mpqkh436.web.app  
**Production URL/version**: https://chunks-offline.web.app  

### Scope

- Fixed the `autoPlayAudio` feature in [src/components/SimulatorTab.tsx](file:///C:/Users/gensh/OneDrive/M%C3%A1y%20t%C3%ADnh/LUCY/PROJECT-WORKPLACE/chunks-offline-v1/src/components/SimulatorTab.tsx).
- Modified the `useEffect` auto-play hook to only call `setLastPlayedRoundId(activeRound.id)` when `autoPlayAudio` is actually `true` and the audio playback is successfully triggered. This ensures that opening a round with `autoPlayAudio` checked as `false` and then checking it later will correctly trigger the audio playback.
- Added direct call to `playSentenceAudio` and `setLastPlayedRoundId` inside `handleOpenRound` (in both sandbox and live database branches). Since this is executed directly within the context of the user click gesture (clicking "Launch Round"), it bypasses modern browser autoplay blocking that typically occurs when the app relies on async WebSocket realtime database synchronization state updates.

### Validation

- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [x] Local `npm run deploy:preview` channel deployed and verified: https://chunks-offline--preview-local-mpqkh436.web.app
  - Verified audio play trigger immediately fires upon clicking "Launch Round" and respects the `autoPlayAudio` toggle correctly.

### Rollback

Preferred rollback: Firebase Console → Hosting → site `chunks-offline` → Release history → roll back to previous known-good release.

Git tag rollback example:

```bash
git fetch --tags
git checkout firebase-hosting-20260707-1625-audio-cachebuster
npm ci
npm run lint
npm run build
npx firebase-tools deploy --only hosting --project chunks-offline
```

### Notes / risks

- Low-risk UI event thread and state check adjustment.

---

## 2026-07-07 16:33 GMT+7 — Audio speed control & Next turn preview component

**Operator**: Lucy with Craft Agent  
**Commit**: `b248caf`  
**Tag**: `firebase-hosting-20260707-1633-speed-preview`  
**Preview URL**: https://chunks-offline--preview-local-mpqkh436.web.app  
**Production URL/version**: https://chunks-offline.web.app  

### Scope

- Applied the `audioRate` (speed/playback rate setting) to the `HTMLAudioElement` playing the storage file inside `playSentenceAudio` in [src/components/SimulatorTab.tsx](file:///C:/Users/gensh/OneDrive/M%C3%A1y%20t%C3%ADnh/LUCY/PROJECT-WORKPLACE/chunks-offline-v1/src/components/SimulatorTab.tsx). Previously, the speed control was only applied to the browser's speech synthesis engine.
- Implemented a new Next Turn Preview card component inside the active open round view in [src/components/SimulatorTab.tsx](file:///C:/Users/gensh/OneDrive/M%C3%A1y%20t%C3%ADnh/LUCY/PROJECT-WORKPLACE/chunks-offline-v1/src/components/SimulatorTab.tsx), styled with the exact CSS classes `"bg-white border border-red-100 rounded-2xl p-6 md:p-8 text-center space-y-5"`. It displays a read-only preview (Vietnamese & English) of the next sentence scheduled to play in the queue.

### Validation

- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [x] Local `npm run deploy:preview` channel deployed and verified: https://chunks-offline--preview-local-mpqkh436.web.app
  - Verified audio file plays faster/slower based on speed slider.
  - Verified Next Turn Preview card shows up correct next sentence and states "NO MORE SENTENCES" at final turn.

### Rollback

Preferred rollback: Firebase Console → Hosting → site `chunks-offline` → Release history → roll back to previous known-good release.

Git tag rollback example:

```bash
git fetch --tags
git checkout firebase-hosting-20260707-1630-autoplay-fix
npm ci
npm run lint
npm run build
npx firebase-tools deploy --only hosting --project chunks-offline
```

### Notes / risks

- Purely UI adjustment. No database side-effects.

---

## 2026-07-07 18:23 GMT+7 — Add Learner button click handler fix

**Operator**: Lucy with Craft Agent  
**Commit**: `1ea03b1`  
**Tag**: `firebase-hosting-20260707-1823-add-learner-button-fix`  
**Preview URL**: https://chunks-offline.web.app  
**Production URL/version**: https://chunks-offline.web.app  

### Scope

- Fixed the Add Learner button in SettingsTab by explicitly attaching an `onClick` event handler calling `handleAddLearner` with `e.preventDefault()`.
- Added hover feedback and smooth transition styles (`hover:bg-slate-800 transition-colors`) to the button.

### Validation

- [x] `npx tsc --noEmit`
- [x] Pushed to GitHub `main` branch to trigger CI build.
- [x] Created tag `firebase-hosting-20260707-1823-add-learner-button-fix` to trigger production deploy.

### Rollback

Preferred rollback: Firebase Console → Hosting → site `chunks-offline` → Release history → roll back to previous known-good release.

Git tag rollback example:

```bash
git fetch --tags
git checkout firebase-hosting-20260707-1630-autoplay-fix
npm ci
npm run lint
npm run build
npx firebase-tools deploy --only hosting --project chunks-offline
```

### Notes / risks

- Zero database schema impact. Extremely low risk UI-only fix.

## 2026-07-08 07:33 GMT+7 — Add Learner Sentence Timeline line chart component

**Operator**: tamha with Craft Agent  
**Commit**: `53c3620`  
**Tag**: `firebase-hosting-20260708-0752-learner-sentence-timeline`  
**Preview URL**: N/A (Production-only release workflow)  
**Production URL**: <https://chunks-offline.web.app>  

### Scope

- Implement the "Learner Sentence Timeline — CPD by sentence point" as a Recharts `LineChart` replacing the old scatter timeline in `HistoryTab.tsx`.
- Reshape the response history to support up to 10 lines of different colors, mapping each line to a student.
- Add an interactive "Sort X" selector supporting round chronological sequence, CVR Ω value ascending, and CCI Standard X ascending.
- Embed the controls and chart in a responsive grid layout wrapper (`bg-white border border-slate-200 rounded-2xl p-5 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-6`).
- Create a rich interactive `<Tooltip>` containing sentence metadata (round, CVR, CCI card) and student list showing their color and CPD values.

### Validation

- [x] `npm run lint` (passed cleanly)
- [x] `npm run build` (passed cleanly)

### Rollback

Preferred rollback: Firebase Console → Hosting → site `chunks-offline` → Release history → roll back to previous known-good release.

### Notes / risks

- Zero database schema impact. UI-only enhancement to the Reports & History tab.

## 2026-07-08 08:04 GMT+7 — Add smart multi-select learner filtering and comparison report table

**Operator**: tamha with Craft Agent  
**Commit**: `1ff2fb0`  
**Tag**: `firebase-hosting-20260708-0804-multi-learner-filter`  
**Preview URL**: N/A (Production-only release workflow)  
**Production URL**: <https://chunks-offline.web.app>  

### Scope

- Replace simple learner dropdown with custom multi-select checklist overlay dropdown.
- Constrain learner selection list to participants of the selected room session to avoid cross-room noise.
- Compute and display live response counts and average CPD statistics within checkbox selection options.
- Add a new "So Sánh Chi Tiết Học Viên" table card below the chart when 2+ learners are selected for comparison.

### Validation

- [x] `npm run lint` (passed cleanly)
- [x] `npm run build` (passed cleanly)

### Rollback

Preferred rollback: Firebase Console → Hosting → site `chunks-offline` → Release history → roll back to previous known-good release.

### Notes / risks

- Zero database schema impact. UI-only enhancement to the Reports & History tab.

---

## 2026-07-08 10:15 GMT+7 — Separate Live Sessions View and Integrate Quick Charts

**Operator**: tamha with Craft Agent  
**Commit**: `a8a210e` and subsequent updates  
**Tag**: `firebase-hosting-20260708-1015-live-session-charts`  
**Preview URL**: N/A (Production-only release workflow)  
**Production URL**: <https://chunks-offline.web.app>  

### Scope

- Remove duplicate Live Session Manager from Teacher Console setup view to prevent data redundancy.
- Implement expandable quick charts within the Live Sessions panel (Grade Distribution % Bar Chart + Top Learner Max CPD Bar Chart).
- Recheck and pass TypeScript validation cleanly.

### Validation

- [x] `npm run lint` (passed cleanly)
- [x] `npm run build` (passed cleanly)

### Rollback

Preferred rollback: Firebase Console → Hosting → site `chunks-offline` → Release history → roll back to previous known-good release.

### Notes / risks

- UI-only refactoring. Zero database schema or data ingestion impacts.

---

## Template for future entries

## YYYY-MM-DD HH:mm GMT+7 — <release/update title>

**Operator**:  
**Commit**:  
**Tag**:  
**Preview URL**:  
**Production URL/version**:  

### Scope

-

### Validation

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Preview/canary checked
- [ ] Production checked

### Rollback

-

### Notes / risks

-
