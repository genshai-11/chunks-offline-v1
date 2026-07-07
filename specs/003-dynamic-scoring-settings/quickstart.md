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
3. Confirm CCI Categories Manager is visible above CCI Standard Cards.
4. Create or edit a category in the category manager only if operating in a safe test scope.
5. Confirm the CCI card category field only lists managed categories and no longer allows free-typing new categories from the card form.
6. Save a test card only if operating in a safe test scope.
7. Open `/library` and confirm Standards/CCI/CVR CRUD is no longer exposed there.

Expected: Settings is the source of truth for CCI categories/cards/CVR units; Library remains sentence-resource only.

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
2. Filter by Session and Learner.
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
