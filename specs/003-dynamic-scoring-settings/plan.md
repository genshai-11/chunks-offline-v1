# Implementation Plan: Dynamic Scoring Settings, TTS Controls, and Learner Analytics

**Branch**: `003-dynamic-scoring-settings` | **Date**: 2026-07-07 12:33 GMT+7 | **Spec**: [spec.md](./spec.md)

## Summary

Implement Settings, TTS, and Reports improvements requested by Lucy: simplified CCI category/card management for M/S/E with safe DB migration path, English-only realtime formula labels, local dynamic formula preview controls, learner preview layout ordering, TTS provider/model/voice settings, and learner-focused sentence charts by round/time, CVR, and CCI Standard.

## Technical Context

**Language/Version**: TypeScript 5.8, React 19, Vite 6  
**Primary Dependencies**: Existing React, Supabase client, Recharts, localStorage settings  
**Storage**: Live Supabase for CCI category/cards; browser localStorage for first-release formula/layout/TTS preferences  
**Testing**: `npx tsc --noEmit`, `npm run build`, local browser validation, Supabase pre/post SQL verification for DB changes  
**Constraints**: No hard DB delete without explicit confirmation; preserve learner safety; production deploy requires release controls  
**Scope**: Settings, Audio TTS Jobs/Library TTS request payloads, Learner Terminal settings compatibility, Reports learner chart.

## Constitution Check

- **Live DB as system of record**: PASS WITH TASK. CCI category/card changes require live Supabase verification and rollback.
- **No mock data in product flows**: PASS. Preview/local controls remain UI configuration only and do not seed product data.
- **Typed schema and drift control**: PASS WITH TASK. Validate CCI schema and TypeScript after changes.
- **Page-level verification**: PASS WITH TASK. Settings, TTS, learner preview, Reports validation required.
- **Live session orchestration**: PASS. No change to first-response submission logic.
- **Learner safety**: PASS. English-only formula label; no answer/audio exposure.
- **Release controls**: PASS WITH TASK. Commit/tag/preview/prod only if deployment requested.

## Project Structure

```text
src/
├── App.tsx                         # Rename Config Settings → Setting
├── components/
│   ├── SettingsTab.tsx             # CCI category input, formula/layout/TTS settings, English labels
│   ├── LearnerTerminalTab.tsx      # Merge new learner UI settings and layout order if needed
│   ├── LibraryTab.tsx              # TTS requests include local preferences
│   ├── AudioGeneratorTab.tsx       # TTS settings visibility/summary
│   └── HistoryTab.tsx              # Learner-focused sentence chart by round/CVR/CCI
├── lib/
│   └── ttsService.ts               # Read/persist TTS settings and pass to edge function
└── types.ts                        # Extend local UI setting types if needed
```

## Data/DB Plan

- Inspect current `cci_categories`, `cci_standard_cards`, and `room_rounds` references.
- Preferred FK-safe SQL:
  - Upsert categories `M`, `S`, `E` into `public.cci_categories`.
  - Update existing cards to one of M/S/E or insert new cards as needed.
  - Avoid hard delete of cards referenced by rounds unless Lucy explicitly confirms and rollback path is documented.
- Rollback SQL must restore prior category/card labels or previous tag/backup.

## Validation Plan

1. `npx tsc --noEmit`
2. `npm run build`
3. Browser check:
   - `/settings`: label says Setting in navigation; CCI category can select/type M/S/E; realtime formula has no Chinese text; layout modules can move.
   - `/tts`: TTS settings visible or summary available; generation request remains backward-compatible.
   - `/reports`: learner chart can sort by round, CVR, CCI and shows sentence/grade color/CPD.
   - `/learner`: learner screen remains safe.
4. Supabase verification before/after any DB write.

## Release Plan

No production deploy until validation passes. If deploying: commit, push main, run preview, tag production, verify, update `docs/deployment-log.md`.
