# CS-0016 Mariage Safe Table Editing and Deterministic Recalculation Completion Report

## Implementation Summary

Added protected, Mariage-only table editing with an isolated draft and deterministic chronological recalculation. Normal gameplay remains read-only at the table. Changes are staged until a validated, single logical Apply commit; Discard and failed Apply leave the authoritative game and localStorage untouched. No Barrel logic or Poker editing was added.

## Files Created And Modified

- Created `assets/icons/edit-table.svg`, an original grid-and-pencil placeholder with an embedded title.
- Modified `index.html` for the dedicated edit button, Edit Mode controls, confirmations, and contextual value editor.
- Modified `css/style.css` for compact edit-only table controls, dialogs, and responsive Edit Mode layout.
- Modified `js/games/mariage.js` for primary round inputs, protected edit sessions, and recalculation.
- Modified `service-worker.js` to use `cardscore-v3` and precache the new SVG.
- Created this report and moved the task through `Task/In_Progress` to `Task/Completed`.

## Protection Layers

The dedicated Mariage edit-table icon button has `title` and `aria-label` set to `Редагувати таблицю`. It does not exist in Poker. Entering Edit Mode requires the specified `Редагувати таблицю?` confirmation. The mode is visibly marked `Режим редагування` and the icon control becomes active.

Normal table cells, scores, headers, player names, and semantic status symbols have no edit handlers. In Edit Mode, only explicitly marked primary-value buttons in edit-only rows respond. A single click or tap does nothing. Desktop `dblclick` and a same-target second touch `pointerup` within 400 ms request editing; synthetic duplicate `dblclick` events following touch are suppressed. Each valid double activation opens the separate `Редагувати дані?` confirmation. Only its `Так` action opens the prefilled contextual editor.

The gameplay action panel and Replay control are hidden in Edit Mode, Menu/New Game are disabled, and mutation handlers independently guard against edits to authoritative state. The unsupported read-only two-player Mariage save does not expose the edit button.

## Edit Session And Primary Schema

Entering Edit Mode deep-clones the authoritative current game into an in-memory draft. Existing rounds without the new `primary` property are read into draft primary form from their recorded actual values and Bite/Repaint event flags; the authoritative save is not migrated on entry. A round's authoritative primary inputs are its stable ID/sequence, ordering player ID, Order amount, `primary.resolution` (`normal` or `repaint`), and `primary.actuals` entries for resolved normal results. An entry is either a numeric actual value or the existing standalone ordering-player Bite action. Configured Ski/Repaint modes remain primary game settings.

Derived deltas, cumulative scores, success/Bite/Ski/Repaint semantic flags, L/R cycle numbers, cycle penalties, `--` presentation fallbacks, and round-start snapshots are never directly editable. Edit-only rows expose the ordering player, Order, resolution type for completed rounds, and populated actual/Bite inputs. Converting Repaint to normal requests actual values for every player; normal to Repaint clears normal actuals in the draft.

Multiple edits can be staged. A valid staged change is recalculated for draft preview. An invalid intermediate draft remains isolated with a visible error and cannot be applied. Reload discards the unsaved draft; localStorage remains unchanged.

## Deterministic Recalculation

`recalculateMariageGame` deep-clones its input, resets all player scores and Ski/Repaint counters to game-start values, and walks completed rounds plus an optional active round in strict sequence order. Each round receives a new pre-round snapshot. The engine validates player IDs, Order range and divisibility, resolution type, actual range, completeness of resolved rounds, and partial-round phase consistency.

For normal resolution, it replays each primary actual/Bite entry through the existing `resolvePlayerResult` scoring path. For Repaint, it replays the existing whole-round `resolveRepaint` path. Derived per-player results, cumulative totals, semantic statuses, Ski/Repaint cycles, completed rounds, and partial active results are rebuilt from those primary events. No historical correction uses `currentTotal - oldValue + newValue` or trusts stored cumulative totals.

An earlier Ski or Repaint correction therefore changes all later dependent L/R cycle numbers, penalties, and cumulative scores. Order and ordering-player corrections similarly regenerate success/Bite outcomes. Unresolved players in an active partial round receive no points. Dealer assignment remains derived from stable round sequence and player order.

## Apply And Discard

`Завершити` opens the specified `Застосувати зміни?` confirmation. `Скасувати` closes it and remains in Edit Mode. On `Застосувати`, the entire draft is validated and recalculated first. Only then is the recalculated state written once through the existing Mariage localStorage key and made authoritative. A validation or storage error leaves the old authoritative in-memory state and persisted JSON unchanged while Edit Mode stays open with an error.

`Скасувати редагування` discards a clean draft immediately. If changes were staged, it opens the required `Скасувати редагування?` confirmation. `Ні` keeps the draft; `Так` destroys it, restores authoritative rendering, and does not save.

## CS-0015 And PWA Compatibility

CS-0015 `Розпис` from `Взято`, dealer rotation, and `Переграти раунд` remain on their original gameplay paths outside Edit Mode. Recalculation rebuilds round-start snapshots, so Replay after an applied historical edit restores the newly correct pre-round totals/counters. Poker files and localStorage keys were not modified.

The service-worker cache version was incremented from `cardscore-v2` to `cardscore-v3` because HTML, CSS, and Mariage JavaScript changed. The new local edit-table SVG is added to the existing shell allowlist. Manifest, launcher icons, standalone display, viewport-fit and safe-area styling remain unchanged. The established activation cleanup removes obsolete CardScore caches only; `Task/` remains uncached.

## Test Matrix

Automated module tests passed for positive non-ordering Taken correction; ordering success to Bite and back; ordering zero to Bite plus Ski; non-ordering zero to Ski; earlier Ski edit shifting later L cycles and removing the third-Ski penalty; earlier Repaint edit shifting later R cycles and removing the third-Repaint penalty; Order amount and ordering-player changes; normal to Repaint and Repaint to normal; immediate Ski and Repaint; order-only and partially resolved current rounds; invalid input rejection; draft/source isolation; Replay and dealer after historical recalculation; and Poker normal/Mines/Golden scoring smoke checks.

A targeted regression also confirmed that entering another result in a pre-primary partial round preserves its already recorded primary events before the new result is added.

Headless Chrome on localhost passed for normal-mode protection, Edit Mode entry `Ні`/`Так`, visible mode and blocked gameplay controls, single-click protection, desktop double-click, touch double-tap, per-value `Ні`/`Так`, prefilled editor, staged localStorage isolation, Apply cancellation, successful Apply and reload/Continue, failed Apply without corruption, Discard `Ні`/`Так`, reload with an uncommitted draft, UI normal-to-Repaint and Repaint-to-normal conversion, ordering-player and Order correction, and unchanged dealer rotation.

Desktop 1280-pixel and mobile 390-pixel Edit Mode screenshots were inspected. The controls and edit-only rows remain readable without overlapping the table. A fresh localhost PWA test found `cardscore-v3` with 16 runtime resources, including the SVG and no `Task/` path. Offline reload retained CSS, the SVG, service-worker control, and saved Mariage data.

All project JavaScript files, including `service-worker.js`, passed `node --check`.

## Known Limitations

The edit-only primary row is intentionally separate from the derived result/score cells; direct editing of calculated cells is prohibited. An invalid staged draft may temporarily display the last valid derived preview alongside an error until corrected or discarded, but it cannot be committed. Older results are interpreted into primary form only inside the edit draft and validated by the full recalculation before Apply; no broad migration or Barrel rules were added.

No Git, GitHub, deployment, Builds, cloud sync, automatic ZIP, or archive was created.
