# AGENTS.md — Chunks Offline Agent Guidelines

This file is the first-stop operating guide for AI/code agents working in this repository.

## Project identity

- App: **Chunks Offline** live classroom web app
- Production URL: <https://chunks-offline.web.app>
- Firebase project/site: `chunks-offline`
- GitHub repository: <https://github.com/genshai-11/chunks-offline-v1>
- Primary data source of record: Supabase project `ftfxekdxeoxizoyxuqoz`

## Mandatory reading before changes

Before making product, DevOps, database, or deployment changes, read:

1. `.specify/memory/constitution.md`
2. `docs/devops-runbook.md`
3. `docs/deployment-log.md`
4. Active feature artifacts under `specs/`, especially:
   - `specs/001-live-db-learner-roster/spec.md`
   - `specs/001-live-db-learner-roster/plan.md`
   - `specs/001-live-db-learner-roster/tasks.md`
   - relevant checklists in `specs/001-live-db-learner-roster/checklists/`

## Documentation and Wiki sync rules

Repository files are the canonical source of truth. The GitHub Wiki is a readable handbook/portal and MUST NOT replace repo-controlled docs, specs, logs, or agent rules.

When changing architecture, product logic, DevOps/release flow, data model, troubleshooting behavior, or agent operating rules:

1. Update the canonical repo file first, such as `AGENTS.md`, `.specify/memory/constitution.md`, `docs/devops-runbook.md`, `docs/deployment-log.md`, or relevant `specs/**` artifacts.
2. Update the matching Wiki summary source under `docs/wiki-skeleton/` in the same commit when the public handbook should change.
3. After the GitHub Wiki is initialized, publish the refreshed summary pages to the Wiki as a follow-up docs-only sync.
4. If the Wiki and repo conflict, follow the repo and fix the Wiki/skeleton drift.

Do not duplicate detailed deployment logs or full Spec Kit artifacts in the Wiki; link back to the repo canonical files instead.

## Spec Kit workflow rules

This repo uses GitHub Spec Kit. Agents MUST follow the local Spec Kit provider flow.

### Before starting work

1. Check whether `.specify/` exists.
2. Check whether `.agents/skills/speckit-*` exists.
3. Check whether `.specify/memory/constitution.md` exists and is not templated.
4. Identify the active/current feature folder under `specs/`.

### Routing

- New feature/change request:
  1. `speckit-constitution` if constitution is missing/stale/templated
  2. `speckit-specify`
  3. `speckit-clarify` unless explicitly skipped
  4. `speckit-plan`
  5. `speckit-tasks`
  6. `speckit-analyze`
  7. Stop before implementation unless the user explicitly asked to implement

- Implementation/deploy request:
  1. Ensure `tasks.md` exists
  2. Run/read `speckit-analyze` guidance
  3. Run/read `speckit-implement` guidance
  4. Check feature checklists; if incomplete, ask for explicit user approval before proceeding
  5. Mark completed tasks/checklists only when actually validated

- Drift/partial implementation:
  - Use `speckit-converge` or update the smallest upstream artifact, then regenerate downstream artifacts.

## Product constitution rules

Agents MUST preserve these project invariants:

1. Live Supabase database is the system of record.
2. No mock/seed/sandbox fallback in normal product flows.
3. Keep generated DB types, domain types, page queries, and migrations aligned.
4. Every page/tab needs loading, empty, error, mutation, refresh/realtime behavior documented and validated.
5. Learner identity and reports/progress MUST use durable `learners.id`, not free-text names.
6. Learner-facing screens MUST NOT reveal English/Vietnamese answer text or audio playback controls.
7. First-response behavior should be database/RPC enforced when correctness depends on race-safety.
8. Destructive actions require explicit confirmation and a rollback/restore path.

## DevOps and release-control rules

For any production deploy, hosting update, Firebase Function update, Supabase migration, or web app release, follow Lucy's release-control policy:

1. Validate locally.
2. Commit changes before deploy.
3. Push to `main`.
4. Tag production releases when applicable.
5. Validate preview/canary before production.
6. Deploy production only after preview passes.
7. Verify production URL and app shell.
8. Record the release in `docs/deployment-log.md`.
9. Keep rollback instructions tied to the release tag.

Never deploy production directly from an uncommitted working tree.

## Standard validation commands

```bash
npm run lint
npm run build
```

If `npm run lint` is affected by a local wrapper/tooling issue, run direct TypeScript validation and document it:

```bash
npx tsc --noEmit
npm run build
```

## Firebase Hosting CI/CD

- GitHub CI: `.github/workflows/ci.yml`
- Preview deploy: `.github/workflows/firebase-preview.yml`
- Production deploy: `.github/workflows/firebase-production.yml`
- Production URL: <https://chunks-offline.web.app>
- Firebase project: `chunks-offline`
- Firebase site: `chunks-offline`

Production deploy is tag-gated. Valid production tag patterns:

- `firebase-hosting-*`
- `release-*`

Local commands:

```bash
npm run deploy:preview
npm run deploy:prod
```

Prefer GitHub Actions over local production deploys except for controlled/emergency releases.

## GitHub secret and secret hygiene

Required GitHub Actions secret:

- `FIREBASE_SERVICE_ACCOUNT_CHUNKS_OFFLINE`

Agents MUST NOT:

- print service account JSON keys;
- commit `.env.local`, `.env*`, Firebase service account JSON, tokens, or API secrets;
- expose Supabase service-role keys to browser code;
- commit temporary key files such as `.tmp-firebase-*.json`.

Use publishable/browser-safe Supabase keys only in frontend code.

## Deployment log requirements

After any deploy/update/function/migration work, update `docs/deployment-log.md` with:

- date/time in GMT+7;
- operator;
- commit and tag;
- preview URL;
- production URL/version or workflow URL;
- validation commands/results;
- rollback path;
- risks and notes.

## Rollback guidance

Preferred Hosting rollback:

1. Firebase Console → project `chunks-offline` → Hosting.
2. Open release history for site `chunks-offline`.
3. Roll back to the previous known-good release.
4. Verify <https://chunks-offline.web.app>.
5. Record rollback in `docs/deployment-log.md`.

Git tag redeploy rollback:

```bash
git fetch --tags
git checkout <known-good-tag>
npm ci
npm run lint
npm run build
npx firebase-tools deploy --only hosting --project chunks-offline
```

## Working tree hygiene

- Do not stage unrelated user files.
- Review `git status --short --branch` before commits.
- Review diffs before committing.
- Keep Spec Kit tooling updates separate from feature/product changes when practical.
- Include Craft Agent co-author trailer in commits made by Craft Agent:

```text
Co-Authored-By: Craft Agent <agents-noreply@craft.do>
```
