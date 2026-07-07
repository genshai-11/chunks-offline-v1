# Quickstart Validation: Dynamic Scoring Settings, TTS Controls, and Learner Analytics

## Local validation commands

```bash
npx tsc --noEmit
npm run build
npm run dev
```

## Scenario 1: CCI category/card settings

1. Open `/settings`.
2. Open CCI & CVR section.
3. Confirm category choices include M, S, E.
4. Confirm a category can be typed/added in the card form.
5. Save a test card only if operating in a safe test scope.

Expected: Settings supports M/S/E and dynamic category entry without crashing.

## Scenario 2: Formula label and preview

1. Open `/settings`.
2. In Learner Frontend UI/UX, confirm only “Real-Time Calculation Logic” appears.
3. Toggle realtime logic off/on.
4. Adjust formula preview controls and response color.

Expected: No Chinese text appears and CPD preview recalculates.

## Scenario 3: Learner preview layout order

1. Open `/settings`.
2. Move Summary, Metadata, Status, Response Buttons, Formula modules.
3. Reload page.

Expected: Layout order updates immediately and persists locally.

## Scenario 4: TTS preferences

1. Open `/tts` or Library TTS flow.
2. Set EN/VI provider/model/voice fields.
3. Trigger a generation in a controlled resource.

Expected: Request remains backward-compatible and includes preferences when configured.

## Scenario 5: Learner-focused chart

1. Open `/reports`.
2. Filter to a learner with many responses.
3. Switch chart order to Round, CVR ascending, and CCI Standard ascending.
4. Hover points.

Expected: Each sentence point shows sentence code, grade color, CPD, CVR, CCI, and learner.

## Scenario 6: Learner safety

1. Open `/learner`.
2. Confirm there is no answer text or audio control exposure.
3. Confirm realtime formula label is English-only if visible.

Expected: Learner safety rules remain intact.

## DB validation if CCI migration is approved

1. Query current CCI categories/cards and referenced rounds.
2. Apply FK-safe migration only after explicit confirmation.
3. Query categories/cards again.
4. Confirm reports still load.
5. Record rollback SQL in deployment log if deployed.
