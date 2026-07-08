# Contract: Live-Room Section CCI Resolution

**Feature**: `005-library-topic-prep-cci`

## Scope

Defines how Teacher Console/live-room round opening resolves CCI Standard Card when a sentence belongs to a lesson section with a default CCI assignment.

## Inputs

- `sentenceResource`: selected resource for the next/open round
- `sentenceResource.section_id`: optional section id
- `manualNextRoundCciCardId`: optional teacher override for the next round
- `sectionDefaultCciCardId`: optional default from selected resource section
- `roomDefaultCciCardId`: existing room-level selected CCI card
- `cciCards[]`: active cards loaded from live database

## Resolution priority

1. Manual teacher override for the round
2. Section default CCI card for `sentenceResource.section_id`
3. Room-level default selected CCI card
4. First safe active CCI card fallback

## Output persisted to `room_rounds`

- `cci_standard_card_id`: resolved card id
- `cci_standard_x`: resolved card standard value
- existing `cvr_value`: from resource CVR/default CVR

## Teacher UI requirements

Before opening a round, the teacher UI should show:

- resolved CCI card label
- resolved CCI Standard X
- source label: `Manual override`, `Section default`, `Room default`, or `Fallback`
- warning if section default references an inactive/deleted card

## Learner UI requirements

Learner UI may show safe metadata already allowed by the constitution:

- sentence id/category/code
- assigned CCI card/value
- CVR value
- answer eligibility state

Learner UI must not show answer text, translations, generated candidate details, or playback controls.

## Historical integrity

Changing a section default after rounds exist must not update old `room_rounds` rows. Reports continue to read round snapshots.

## Error behavior

- If manual override card is invalid, block round opening or fall back only after teacher-visible warning.
- If section default is invalid, show warning and use room default.
- If no active CCI card exists, block round opening with setup guidance to Settings → CCI & CVR.
