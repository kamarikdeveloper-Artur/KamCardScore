# CS-0015 Mariage Round UX Improvements Completion Report

## Implementation Summary

Added a Repaint action to Mariage's `Взято` workflow, a read-only rotating dealer indicator, and confirmed replay of the current or most recently completed round. Poker gameplay and persistence remain unchanged. No table editing, historical recalculation, or Barrel logic was added.

## Files Modified

- `index.html`
- `css/style.css`
- `js/games/mariage.js`
- `service-worker.js`

The task file was moved through `Task/In_Progress` to `Task/Completed`. This report was created in `Task/Reports`.

## Repaint From Taken

The new `Розпис` button is visible in the Mariage results (`Взято`) step, alongside the existing Repaint action in the physical-play step. Both call the same `resolveRepaint` function. When results have already been entered, the function restores the round-start scores and Ski/Repaint counters, clears those partial results, then applies the existing whole-round Repaint logic once. The round completes without requesting more actual values or carrying Bite/Ski events into the Repaint result.

Three-step Repaint remains Р1/Р2 at zero for the ordering player, then Р3 at -120 with cycle reset. Immediate Repaint remains -60. Every other player receives +60, and the beneficiary's `--` remains a display fallback rather than authoritative state.

## Dealer Derivation

`Роздає: <player>` appears in a compact, read-only toolbar directly above the Mariage table. The dealer is derived from stable player order and the active round's sequence, or the next sequence after the latest completed round. The first configured player deals round one. The sequence wraps after three or four players; no dealer field, selector, or gameplay dependency was added. Reload, Continue, and offline use derive the same dealer from persisted round state. Replaying the latest round returns the dealer to that round's player.

## Replay Restoration

Each newly created Mariage round stores a minimal `startState` snapshot of player scores and Ski/Repaint cycle counters. `Переграти раунд` opens a dedicated confirmation dialog with the required text and `Ні`/`Так` actions. `Ні` closes the dialog without changing game state or persisted JSON.

`Так` restores the snapshot, removes all Order, actual, result, semantic-status, and cycle effects, and creates the fresh ordering state for the same round ID and sequence. For an active round, the active round is replaced. For a just-completed round, only the most recent resolved round is popped before the same round is reopened; it is not duplicated and the next dealer is not advanced. Older historical rounds cannot be selected or replayed.

Mariage does not automatically create an empty next round after resolution, so the completed-round action unambiguously targets the most recently resolved round. Once the user starts a later round, replay targets that active round instead.

## Persistence And Scope

The round-start snapshot is persisted with the current Mariage game under its existing localStorage key. Reload/Continue preserved the dealer and current round after Order entry, partial `Взято`, Repaint, and replay. Existing Poker and Mariage storage keys were not renamed. Old Mariage rounds without a round-start snapshot remain readable and playable, but replay is hidden for those rounds because a trustworthy rollback cannot be guaranteed; no old game data is silently deleted or converted.

No table-edit button, edit mode, double-tap editing, `recalculateGame()`, Barrel/Бочка rule, or unrelated feature was introduced.

## PWA Cache Handling

Because precached `index.html`, CSS, and Mariage JavaScript changed, the explicit cache version was incremented from `cardscore-v1` to `cardscore-v2`. The existing service-worker activation logic removes obsolete CardScore caches and retains unrelated origin caches. The manifest, icons, standalone mode, `viewport-fit=cover`, safe-area behavior, and the 15-resource application-shell allowlist were preserved.

A fresh localhost headless-Chrome run confirmed an active `cardscore-v2` cache with 15 runtime resources and no `Task/` documentation. The browser was switched offline and reloaded; both game modules, saved Mariage state, and the game background remained available.

## Regression Results

Module tests passed for three- and four-player dealer rotation; Р1/Р2/Р3 and immediate Р scoring and presentation; cycle reset; Repaint beneficiaries; no Bite/Ski during Repaint; partial-result rollback; replay after Order; replay after a completed normal round with Bite/Ski; replay after completed Repaint; same round ID/sequence; restored scores and cycle counters; and unchanged Poker normal, Mines, and Golden scoring.

Browser tests passed for Order entry, reload/Continue, partial Ski result, `Ні` leaving persisted JSON unchanged, `Так` restoring the same round, `Розпис` from partial `Взято`, whole-round completion, dealer advancement, reload after Repaint, completed-round replay, offline reload, and offline Continue. Desktop and 390-pixel mobile screenshots were inspected. A minimal light toolbar background was added after visual inspection to keep the dealer label readable over the existing patterned game background.

All five runtime JavaScript files (`service-worker.js`, `js/app.js`, `js/storage.js`, `js/games/poker.js`, and `js/games/mariage.js`) passed `node --check`.

No Git, GitHub, deployment, Builds directory, cloud sync, automatic ZIP generation, or archive was added.
