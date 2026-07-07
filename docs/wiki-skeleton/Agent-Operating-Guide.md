# Agent Operating Guide

> Canonical source: `AGENTS.md` in the repository.

## Mandatory reading before changes

Agents must read:

1. `AGENTS.md`
2. `.specify/memory/constitution.md`
3. `docs/devops-runbook.md`
4. `docs/deployment-log.md`
5. Relevant active `specs/**` artifacts

## Core rules

- Follow Spec Kit provider flow.
- Do not skip checklist gates unless Lucy explicitly approves proceeding anyway.
- Do not stage unrelated user files.
- Do not commit secrets or service account JSON.
- For production deploys: validate, commit, tag, preview, deploy, verify, log.

## Documentation and Wiki sync

Repository files are canonical. The Wiki is a readable handbook/portal only.

When architecture, product logic, DevOps/release flow, data model, troubleshooting behavior, or agent operating rules change:

1. Update canonical repo docs/specs/logs first.
2. Update matching pages under `docs/wiki-skeleton/` when the public handbook should change.
3. Publish refreshed pages to GitHub Wiki after the Wiki is initialized.
4. If Wiki and repo conflict, follow the repo and fix Wiki/skeleton drift.

Do not duplicate full deployment logs or full Spec Kit artifacts in the Wiki; link back to canonical repo files.

## Spec Kit routing summary

- New feature/change: constitution → specify → clarify → plan → tasks → analyze.
- Implementation/deploy: analyze → implement → validate → release controls.
- Drift/partial work: converge or update the smallest upstream artifact and regenerate downstream artifacts.

## Commit convention

Craft Agent commits should include:

```text
Co-Authored-By: Craft Agent <agents-noreply@craft.do>
```
