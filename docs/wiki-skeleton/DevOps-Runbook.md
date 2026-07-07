# DevOps Runbook

> Canonical source: `docs/devops-runbook.md` in the repository.

## Production identity

- Production URL: https://chunks-offline.web.app
- Firebase project: `chunks-offline`
- Firebase site: `chunks-offline`
- GitHub repo: https://github.com/genshai-11/chunks-offline-v1

## Release-control checklist

1. Validate locally: `npm run lint` and `npm run build`.
2. Commit all release changes.
3. Push to `main`.
4. Create and push a production release tag.
5. Validate Firebase preview/canary.
6. Deploy production via tag-gated workflow.
7. Verify production URL/app shell.
8. Record the release in `docs/deployment-log.md`.

## CI/CD workflows

- CI: `.github/workflows/ci.yml`
- Firebase preview: `.github/workflows/firebase-preview.yml`
- Firebase production: `.github/workflows/firebase-production.yml`

## GitHub secret

Required secret:

- `FIREBASE_SERVICE_ACCOUNT_CHUNKS_OFFLINE`

Never print or commit this secret.

## Local commands

```bash
npm ci
npm run lint
npm run build
npm run deploy:preview
npm run deploy:prod
```

Prefer GitHub Actions for production releases.
