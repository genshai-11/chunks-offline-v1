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
