# CS-0015 — Mariage Round UX Improvements

## Baseline
Use `CardScore_07(1)` after completed CS-0014 as the authoritative baseline.

This task is limited to low-risk Mariage round UX changes. Preserve the completed PWA foundation and all existing Pokerochok/Mariage gameplay unless explicitly changed below.

Do NOT implement table editing/recalculation or Barrel/Бочка logic in this task.

## 1. Add `Розпис` to `Взято`

Add a clearly visible `Розпис` action to the Mariage `Взято` workflow.

It is a whole-round alternate resolution path. Reuse the existing Repaint logic rather than creating a second scoring implementation.

When activated:
- apply the existing Repaint rules;
- resolve the entire current round;
- do not request individual `Взято` values afterward;
- do not trigger Bite or Ski because actual values were not entered;
- persist normally.

Preserve existing rules:

Three-step mode:
- Р1: ordering player 0; every other player +60.
- Р2: ordering player 0; every other player +60.
- Р3: ordering player -120; every other player +60; reset active Repaint cycle.

Immediate mode:
- Р: ordering player -60; every other player +60.

Preserve semantic statuses Р1/Р2/Р3 or Р. Repaint beneficiaries remain neutral (`--` only as presentation fallback; never authoritative state).

## 2. Dealer indicator

Show a compact read-only Mariage indicator:

`Роздає: <player name>`

Preferred placement: directly above the Mariage table, toward the right where practical, visually secondary to gameplay controls.

Dealer information must NOT affect ordering-player selection, scoring, Bite, Ski, Repaint, turn resolution, or player order.

Do not recreate the removed `Фаза` UI or add a large status panel.

## 3. Dealer rotation

Rotate dealer using the configured stable player order.

3 players:
`P1 → P2 → P3 → P1 → ...`

4 players:
`P1 → P2 → P3 → P4 → P1 → ...`

The first configured player deals the first Mariage round.

Prefer stable player IDs. Dealer must be derivable from stable game/round state so reload, Continue and offline/PWA use restore the same dealer.

Replaying the same round must NOT advance the dealer.

Do not add a manual dealer selector.

## 4. Add `Переграти раунд`

Add a Mariage action/button `Переграти раунд`.

Meaning: discard the current/latest round's gameplay effects and restart that SAME round.

It does not create the next round and does not restart the game.

Before execution show confirmation:

**Переграти раунд?**

`Усі дані поточного раунду буде скасовано.`

Buttons:
- `Ні`
- `Так`

`Ні`: close with zero state changes.

`Так`: safely restore the same round to its initial state.

## 5. Replay semantics

Replay must revert/clear all effects created by that round as applicable:
- ordering player;
- order amount;
- temporary order display;
- entered `Взято`;
- resolved-player state;
- success/Bite/Ski/Repaint result;
- score deltas;
- Ski counter changes;
- Repaint counter changes;
- semantic statuses/events.

Return the same round to the state where a new `Заказ` can be entered.

Keep the same round identity/number and same dealer. Do not append a duplicate completed round and do not advance to the next round.

## 6. Safe replay implementation

Do not implement replay as UI-only cleanup.

Restore authoritative state correctly.

Inspect the current Mariage architecture and use the smallest safe strategy. If necessary, add only the minimal round-start/pre-round snapshot required to restore:
- scores;
- Ski counters;
- Repaint counters;
- phase/state;
- resolved players.

Do NOT build the full historical recalculation engine planned for CS-0016.

Replay must be usable:
- after order entry;
- during partially resolved `Взято`;
- immediately after the latest round has been resolved.

Do not allow arbitrary replay/editing of older historical rounds.

If the current architecture immediately creates a new empty round after resolution, carefully target the most recently resolved round rather than an unrelated empty row. Document the chosen behavior.

## 7. Persistence

Verify:
- reload preserves dealer;
- reload during partial `Взято` preserves the round;
- reload after Repaint preserves result;
- replay persists correctly;
- Continue restores dealer/current round;
- no Pokerochok storage keys change;
- no Mariage current-game data is silently discarded.

Do not rename localStorage keys solely for this task.

## 8. Preserve CS-0014 PWA

Do not break:
- `manifest.webmanifest`;
- `service-worker.js`;
- PWA icons;
- offline app shell;
- standalone display;
- `viewport-fit=cover`;
- safe-area handling.

If runtime precached files change, handle the existing service-worker cache/version strategy so testing does not keep serving stale files. Do not redesign the service worker or add deployment.

## 9. Pokerochok isolation

Do not change Pokerochok gameplay, chronology, ORDER/ACTUAL, Pass, scoring, special rounds, fixed `roundOrderStatus`, results/history, or persistence.

Shared CSS/UI changes are allowed only when necessary and must not regress Pokerochok.

## 10. Explicitly out of scope

Do NOT implement in CS-0015:
- `Редагувати таблицю`;
- edit mode;
- double-tap editing;
- historical editing;
- edit sessions;
- `recalculateGame()`;
- edit-table SVG/button;
- any Barrel/Бочка rules;
- 880 threshold;
- Barrel attempts/failures;
- Barrel displacement/tie-breaking;
- Barrel winner logic;
- Git/GitHub;
- deployment;
- Builds;
- automatic ZIP;
- cloud sync;
- unrelated redesign.

These belong to later tasks.

## 11. Required tests

Run syntax checks on all JavaScript files including `service-worker.js`, `js/app.js`, `js/storage.js`, `js/games/poker.js`, `js/games/mariage.js`, and any additional project JS.

### Repaint from `Взято`
Test Р1/Р2/Р3 and immediate Р. Verify correct deltas/statuses/counter reset, whole-round resolution, no Bite/Ski, and no remaining `Взято` requirement.

### Dealer
Test 3-player rotation P1→P2→P3→P1 and 4-player rotation P1→P2→P3→P4→P1. Verify reload stability and unchanged dealer after replay.

### Replay partial round
Enter Заказ, resolve some players, choose `Переграти раунд`, test `Ні` (nothing changes), then `Так`. Verify same round returns to initial order-entry state and all partial effects are removed.

### Replay completed normal round
Complete a round involving normal scoring/Bite/Ski as applicable, replay it, and verify pre-round scores/counters are restored, statuses/results cleared, same dealer remains, same round is ready for new order.

### Replay Repaint round
Complete with `Розпис`, replay, and verify all beneficiary +60 changes, ordering-player penalty and Repaint counter changes are reverted.

### Persistence/regression
Test reload/Continue before order, after order, during partial `Взято`, after Repaint and after replay. Smoke-test Pokerochok. Verify PWA files remain valid and offline app-shell behavior is not regressed.

## 12. Acceptance criteria

CS-0015 is complete when:
1. `Розпис` is available from Mariage `Взято`.
2. Existing Repaint rules are preserved/reused.
3. Repaint resolves the whole round without Bite/Ski.
4. `Роздає: <player>` is displayed.
5. Dealer rotates by configured player order and is informational only.
6. Dealer survives reload/Continue.
7. `Переграти раунд` exists for the current/latest round.
8. Replay requires `Ні`/`Так` confirmation.
9. `Ні` changes nothing.
10. `Так` restores the same round safely.
11. Scores and Ski/Repaint counters are correctly reverted.
12. Round statuses/results are cleared.
13. Replay does not advance dealer or duplicate a round.
14. Pokerochok remains unchanged.
15. PWA foundation remains intact.
16. No table-editing system is added.
17. No Barrel logic is added.
18. All JavaScript syntax checks pass.

## Deliverables

Task lifecycle:

`Task/Inbox/CS-0015-Mariage-Round-UX-Improvements.md`
→ `Task/In_Progress/CS-0015-Mariage-Round-UX-Improvements.md`
→ `Task/Completed/CS-0015-Mariage-Round-UX-Improvements.md`

Create:
`Task/Reports/CS-0015-Mariage-Round-UX-Improvements-Report.md`

The English report must document:
- implementation summary;
- files modified;
- `Розпис` integration and reuse/refactor of existing Repaint logic;
- dealer derivation/rotation;
- replay state-restoration strategy;
- behavior for replaying a just-completed round;
- persistence behavior;
- PWA cache/version handling if runtime precached files changed;
- Mariage tests;
- Pokerochok regression;
- PWA regression;
- JavaScript syntax checks;
- limitations discovered.

Do NOT create a ZIP archive. The user will manually create and provide the project archive after Codex completes the task.
