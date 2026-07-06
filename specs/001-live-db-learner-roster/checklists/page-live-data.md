# Page Live-Data Checklist

**Checked**: 2026-07-06

## Automated validation

- [x] Local dependencies installed with `npm install`
- [x] TypeScript compiler passed via `./node_modules/.bin/tsc --noEmit --pretty false`
- [x] Production build passed via `npm run build`
- [x] App shell is locked to live Supabase mode (`useSandbox = false` in `src/App.tsx`)
- [x] App loads live `learners` from Supabase and passes learners to Settings, Learner Terminal, Teacher Console, and Reports
- [x] Audio Jobs is gated when `audio_generation_jobs` is missing from the live schema
- [ ] Full browser click-through validation for each page after dev server launch

## Notes

`npm run lint` is currently intercepted by an rtk/ESLint JSON wrapper and exits with `ESLint output (JSON parse failed...)`; direct TypeScript validation passes.

## 2026-07-06 Library bulk CVR/TTS pass

- [x] Supabase TTS service checked before UI wiring: Edge Function `generate-resource-audio` is reachable, CORS preflight returns 204, and unauthenticated POST returns 401 as expected because TTS admin PIN is required.
- [x] Confirmed active Supabase Edge Functions: `generate-resource-audio`, `tts-generate`, `list-tts-models`.
- [x] Confirmed public Storage bucket `resource-audio` exists.
- [x] Library resources can now be selected in list and card view.
- [x] Library bulk toolbar supports Select Page, Select All Filtered, Clear.
- [x] Bulk CVR update uses an input number and updates both `cvr_value` and `default_cvr_value` for selected live resources after confirmation.
- [x] Bulk missing TTS generation supports EN, VI, or Both for selected resources and uses `generate-resource-audio` with runtime admin PIN prompt/cache.

## 2026-07-06 client route pass

- [x] Added client-side URL routing for module tabs without adding a router dependency.
- [x] Routes: `/teacher`, `/learner`, `/library`, `/reports`, `/tts`, `/settings`, `/database`.
- [x] Legacy aliases still resolve: `/`, `/simulator`, `/history`, `/audio`, `/migrations`, `/join`.
- [x] Room join links now copy as `/learner?room_code=CH-xxxx`.
- [x] Browser back/forward updates active tab via `popstate`.
- [x] Direct route refreshes validated through local Vite fallback.
