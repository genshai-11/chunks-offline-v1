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
