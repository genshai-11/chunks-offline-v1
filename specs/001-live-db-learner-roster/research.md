# Research: Live Database and Learner Roster

**Date**: 2026-07-06

## Decision: Use the extracted Supabase schema as source of truth

**Rationale**: Supabase MCP read the active hosted project schema. This is more reliable than local migration constants because the local code references `audio_generation_jobs`, but the live schema does not currently contain that table.

**Alternatives considered**:
- Local migrations as source of truth: rejected due drift.
- Local TypeScript interfaces as source of truth: rejected because they can include non-existent tables.

## Decision: Remove product reliance on `SandboxDatabase`

**Rationale**: The app currently has `useSandbox`, local seed arrays, localStorage collections, and sandbox business logic. These are useful for demos but violate the requirement that product data load only from the database.

**Alternatives considered**:
- Keep sandbox fallback as hidden backup: rejected because it can mask live DB failures.
- Keep sandbox only in a developer-only diagnostic route/card: acceptable if excluded from product validation.

## Decision: Learner roster must use stable learner ids

**Rationale**: Live classroom membership, responses, and progress all reference `learners.id`. Free-text display names create duplicates and unreliable history.

**Alternatives considered**:
- Continue display-name lookup: rejected because existing live data already has duplicate names.
- Force auth accounts for every learner immediately: deferred; current schema supports optional `auth_user_id` but manual roster is sufficient for this feature.

## Decision: Safe remove/deactivate before hard delete

**Rationale**: Learners may have memberships, responses, and progress. Removing from active selection preserves reporting while meeting the need to manage visible learner lists.

**Alternatives considered**:
- Hard delete always: rejected due history loss.
- No remove option: rejected because user requested add/delete/edit learner management.

## Decision: Audio Jobs need explicit schema reconciliation

**Rationale**: Live DB lacks `audio_generation_jobs`, while app code queries/mutates it. The Audio page must be disabled or schema migration must be applied through release controls before live use.

**Alternatives considered**:
- Ignore missing table: rejected.
- Apply migration during planning: rejected; production-impacting DDL requires explicit release controls and approval.
