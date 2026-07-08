# DevOps Runbook — Chunks Offline

**App**: Chunks Offline  
**Production URL**: <https://chunks-offline.web.app>  
**Firebase project**: `chunks-offline`  
**Hosting site**: `chunks-offline`  
**GitHub repo**: <https://github.com/genshai-11/chunks-offline-v1>  
**Last updated**: 2026-07-07 09:57 GMT+7

## 1. Release-control policy

Every production web release must follow this order:

1. Validate locally: `npm run lint` and `npm run build`.
2. Commit all release changes.
3. Push to `main`.
4. Create and push a release tag before production deploy.
5. Validate a Firebase preview/canary first.
6. Deploy production.
7. Verify production URL and core app shell.
8. Record the release in `docs/deployment-log.md`.
9. Keep rollback instructions tied to the release tag.

## 2. CI/CD workflows

| Workflow | File | Trigger | Purpose |
|---|---|---|---|
| CI | `.github/workflows/ci.yml` | Pull request, push to `main`, manual | Runs `npm ci`, `npm run lint`, `npm run build`, uploads `dist` artifact |
| Firebase Hosting Preview | `.github/workflows/firebase-preview.yml` | Pull request, manual | Builds and deploys a 7-day preview channel |
| Firebase Hosting Production | `.github/workflows/firebase-production.yml` | Tags `firebase-hosting-*` or `release-*`, manual | Builds and deploys live Firebase Hosting |

Production deploys are tag-gated to preserve Lucy's release-control workflow.

## 3. Required GitHub secret

GitHub Actions production and preview deploys require this repository secret:

- `FIREBASE_SERVICE_ACCOUNT_CHUNKS_OFFLINE`

It is a JSON key for service account:

- `github-actions-hosting@chunks-offline.iam.gserviceaccount.com`

Required IAM roles:

- `roles/firebasehosting.admin`
- `roles/viewer`
- `roles/serviceusage.serviceUsageConsumer`

Rotate the key if it is exposed, if an operator leaves, or at regular security intervals.

## 3.1 Supabase Edge Function secrets

Supabase Edge Functions must keep third-party/M2M secrets server-side. For the lesson-generator proxy, configure secrets in Supabase (not in frontend code):

- `CHUNKS_M2M_API_KEY`
- optional `CHUNKS_M2M_BASE_URL`
- optional `CHUNKS_M2M_TIMEOUT_MS`

Before deploying or enabling an Edge Function integration:

1. Confirm no literal API keys appear in `src/`, built output, committed docs, or browser network calls.
2. Deploy the Edge Function only after the implementation is committed.
3. Keep rollback instructions: redeploy the previous function version or disable the UI entry point while preserving Library CRUD.
4. Record function deploys in `docs/deployment-log.md` with validation and rollback notes.

## 4. Local commands

```bash
npm ci
npm run lint
npm run build
```

Preview deploy from local machine:

```bash
npm run deploy:preview
```

Production deploy from local machine:

```bash
npm run deploy:prod
```

Prefer GitHub Actions for shared release history; use local production deploy only for emergency/manual controlled releases.

## 5. Standard production release procedure

```bash
# 1) Confirm clean/current state
git status --short --branch
git pull --ff-only origin main

# 2) Validate
npm run lint
npm run build

# 3) Commit changes
git add -A
git commit -m "Release <summary>" -m "Co-Authored-By: Craft Agent <agents-noreply@craft.do>"
git push origin main

# 4) Tag release
TAG="firebase-hosting-$(date +%Y%m%d-%H%M)"
git tag -a "$TAG" -m "Firebase Hosting production release"
git push origin "$TAG"
```

The tag push triggers `.github/workflows/firebase-production.yml`.

## 6. Preview/canary validation checklist

Before production, validate either a pull-request preview URL or a manual preview channel:

```bash
npm run deploy:preview
```

Checklist:

- [ ] Preview URL returns HTTP 200.
- [ ] App root renders.
- [ ] Firebase rewrites route deep links to `index.html`.
- [ ] Core tabs load without JavaScript crash.
- [ ] Supabase client uses publishable/browser-safe credentials only.
- [ ] No service-role keys or Firebase service account JSON appears in built output.

## 7. Production post-deploy verification

```bash
node -e "fetch('https://chunks-offline.web.app').then(async r=>{console.log(r.status, r.statusText); const t=await r.text(); console.log(t.includes('<div id=\\\"root\\\"></div>') || t.includes('<div id=\\\"root\\\">'))})"
```

Manual checks:

- [ ] <https://chunks-offline.web.app> returns HTTP 200.
- [ ] App loads without blank screen.
- [ ] Settings → Learners loads roster controls.
- [ ] Learner Terminal safe metadata displays short sentence code only.
- [ ] Teacher Console audio launch gating behaves as expected.
- [ ] Reports show short sentence codes with full code in title/tooltip.

## 8. Rollback / restore path

### Preferred: Firebase Console rollback

1. Open Firebase Console → project `chunks-offline` → Hosting.
2. Open release history for site `chunks-offline`.
3. Select the previous known-good release.
4. Click **Rollback**.
5. Verify <https://chunks-offline.web.app>.
6. Record rollback in `docs/deployment-log.md`.

### Git tag redeploy rollback

```bash
git fetch --tags
# Replace with the known-good tag
git checkout firebase-hosting-20260707-0621
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

## 9. Updating code/functions/runbook entries

For any code update, UI update, Firebase Hosting update, Supabase migration, or future Firebase Function update:

1. Create or update the relevant Spec Kit task/checklist if scope changes.
2. Validate locally.
3. Commit and push.
4. Use preview/canary when deploy impact exists.
5. Tag before production deploy.
6. Deploy.
7. Add an entry to `docs/deployment-log.md` with:
   - date/time GMT+7;
   - operator;
   - commit/tag;
   - validation commands;
   - preview URL;
   - production URL/version;
   - rollback path;
   - notes/risks.

## 10. Incident response quick steps

1. Confirm impact: blank app, broken route, auth/config issue, or data issue.
2. Check latest GitHub Actions run and Firebase Hosting release.
3. Roll back Hosting if app shell is broken.
4. If data/schema issue, pause deploys and check Supabase migrations/RLS separately.
5. Record incident timeline in `docs/deployment-log.md`.
