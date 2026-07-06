# Schema Drift Checklist

**Checked**: 2026-07-06

- [x] Generated compact live schema reference in `src/lib/database.types.ts`
- [x] Added `src/lib/schemaHealth.ts`
- [x] App checks for `audio_generation_jobs` availability
- [x] Audio Jobs tab shows schema action state when table is missing
- [x] Audio job completion status aligned to `succeeded`
- [ ] Migration for `audio_generation_jobs` not applied; requires release-control approval before DDL

## Known drift

Live Supabase does not expose `audio_generation_jobs`, while local `src/data/migrations.ts` contains a migration definition for it.

## 2026-07-06 console-noise fix

- [x] Removed client-side REST probe against missing `audio_generation_jobs` to prevent 404 console errors.
- [x] Library audio generation buttons now show a schema-gated message instead of calling the missing table.

## 2026-07-06 TTS service mapping fix

- [x] Confirmed Supabase Edge Functions are active: `generate-resource-audio`, `tts-generate`, `list-tts-models`.
- [x] Confirmed public Storage bucket `resource-audio` exists.
- [x] Removed app-level `audio_generation_jobs` missing-table notice because the live audio module maps to Edge Function service instead.
- [x] Library `+ Generate` now calls `generate-resource-audio` and updates `sentence_resources.audio_en_url` / `audio_vi_url` after success.
- [x] Audio module copy now references Supabase Edge Function + Storage instead of legacy job table.
