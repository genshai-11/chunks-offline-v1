# Learner Roster Checklist

**Checked**: 2026-07-06

- [x] Settings has a Learners subtab
- [x] Settings lists live learners passed from App
- [x] Duplicate learner display names are flagged
- [x] Add learner writes to Supabase `learners`
- [x] Edit learner updates display name without changing id
- [x] Remove blocks hard delete when memberships/responses/progress exist
- [x] Requested roster setup action creates missing Lucy, Mason, Annie, Vox, Tailor, Wynnye, Cherry, Jay, Pen
- [ ] Browser validation: add Mason or another missing learner in UI and refresh

## Notes

Live schema has no `active/deactivated` learner field yet, so safe remove currently blocks historical learners instead of hiding them from selectors. A migration is still needed for true deactivate behavior.

## 2026-07-06 Settings learner CRUD pass

- [x] Confirmed `learners` table allows public CRUD through current RLS policy `learners_dev_all`.
- [x] Settings learner form now submits on Enter and shows inline status messages for add/edit/remove.
- [x] Add/edit now prevent visible duplicate display names before writing live Supabase.
- [x] Remove now hard-deletes only learners with no classroom history.
- [x] Remove now archives learners with classroom history by renaming with `[archived] ...` instead of deleting progress/report history.
- [x] Archived learners are hidden from Settings duplicate checks and counted separately.
- [x] Added duplicate cleanup action in Settings to safely append ID suffixes while preserving learner IDs.
- [x] Resolved current live duplicate display names: `Genshai` → `Genshai (74f9)` for duplicate row, `Lucy` → `Lucy (846f)` for duplicate row.
