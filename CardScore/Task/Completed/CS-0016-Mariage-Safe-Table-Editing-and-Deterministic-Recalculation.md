# CS-0016 — Mariage Safe Table Editing and Deterministic Recalculation

## Project
CardScore

## Authoritative baseline
Use `CardScore_08` after completed CS-0015 as the authoritative baseline.

CS-0016 introduces a protected table-editing mode and deterministic recalculation foundation required before Barrel/Бочка. Preserve CS-0015 Mariage behavior, Pokerochok, persistence and PWA. Do NOT implement Barrel/Бочка.

## 1. Objective
Implement protected editing for previously entered Mariage round data:
1. explicit `Редагувати таблицю` button;
2. confirmation before Edit Mode;
3. visibly distinct Edit Mode;
4. only in Edit Mode, double-click/double-tap on an editable populated gameplay value can request editing;
5. second confirmation for that value;
6. changes staged in isolated edit session;
7. finishing editing validates and deterministically recalculates the game;
8. only successful recalculation is committed to authoritative state/localStorage.

Normal gameplay must remain protected from accidental edits.

## 2. Edit-table button and temporary SVG
Create `assets/icons/edit-table.svg` and use it for a dedicated Mariage edit-table button.

The SVG is a temporary original placeholder inspired by the supplied concept: table/grid plus pencil. No external assets or copied third-party artwork. It must remain readable at button size and have semantic `title`/`aria-label` such as `Редагувати таблицю`. Do not modify PWA launcher icons.

## 3. Entering Edit Mode
Normal mode: single tap/click and double-click/double-tap must not edit table data.

Pressing edit-table button shows:

**Редагувати таблицю?**

`Перехід у режим редагування дозволить змінювати внесені дані.`

Buttons: `Ні`, `Так`.

`Ні`: close, zero state changes.

`Так`: create isolated edit draft/session, enter Edit Mode, visibly show `Режим редагування`, and mark edit control active where appropriate. Do not mutate authoritative saved game merely by entering Edit Mode.

## 4. Edit Session Architecture
Use:

`authoritative current game → isolated edit draft → validate → deterministic recalculation → commit`

Requirements:
- authoritative game and localStorage unchanged while staging;
- multiple edits can be staged;
- edit-mode rendering may use draft;
- entire session can be discarded;
- do not persist each staged edit individually;
- use safe cloning suitable for current state;
- no framework.

## 5. Double-click / Double-tap Protection
Only while Edit Mode is active and only on explicitly editable gameplay inputs/events.

Desktop: support double-click.

Touch: implement explicit double-tap detection with a reasonable short timing window. Single tap must not edit. Avoid duplicate activation from overlapping pointer/touch/click events.

Do not activate editing on headers, player names, cumulative score cells, empty/decorative cells, dealer indicator, buttons or unrelated UI.

## 6. Per-value Confirmation
After valid double activation show:

**Редагувати дані?**

`Ви дійсно бажаєте змінити внесені дані?`

Buttons: `Ні`, `Так`.

`Ні`: no draft change.

`Так`: open appropriate editor and prefill/preselect current staged value where practical. Do not open editor before confirmation.

## 7. Editable Primary Data
Allow editing, where safely representable:
- ordering player;
- order amount;
- normal `Взято` values;
- zero result that produces Ski;
- normal resolution versus Repaint/`Розпис`.

Do NOT directly edit derived output:
- cumulative totals;
- calculated deltas;
- success/Bite status;
- L1/L2/L3 or L labels;
- Р1/Р2/Р3 or Р labels;
- neutral `--`;
- calculated penalties/statuses.

Derived state must be regenerated. If a primary event cannot safely be exposed, document the limitation rather than mutating derived data.

## 8. Validation
Order:
- 3 players: 100..500;
- 4 players: 100..420;
- multiple of 5;
- exactly one ordering player per round.

Allow correcting ordering player where safely supported.

Taken:
- 3 players: 0..500;
- 4 players: 0..420;
- not required to be multiple of 5.

Changing order/player/actual must be handled by recalculation, not manual total patching.

## 9. Existing Scoring to Reconstruct
Ordering player:
- actual >= order → credit exactly order, success;
- 0 < actual < order → Bite, subtract order;
- actual = 0 → Bite + Ski.

Non-ordering:
- actual > 0 → add actual;
- actual = 0 → Ski.

Ski three-step:
- L1;
- L2;
- L3 and -100;
- then active cycle resets.

Ski immediate:
- every L → -50.

Repaint three-step:
- Р1: ordering player 0, others +60;
- Р2: ordering player 0, others +60;
- Р3: ordering player -120, others +60, then reset.

Repaint immediate:
- Р: ordering player -60, others +60.

Repaint is whole-round resolution. Normal actual values must not score in a Repaint round. Users must not directly select/type derived L/Р sequence numbers.

## 10. Deterministic Recalculation Engine
Implement a dedicated Mariage recalculation boundary, conceptually `recalculateMariageGame(gameDraft)` (exact name may follow project conventions).

Rebuild derived Mariage state chronologically from authoritative primary round inputs/events, starting from initial game scoring/counter state.

Reconstruct at minimum:
- cumulative scores;
- per-round deltas;
- success/Bite;
- Ski effects/counters and L semantics;
- Repaint effects/counters and Р semantics;
- resolved-player/round derived state where appropriate.

Do NOT use `currentTotal - oldValue + newValue` as the general historical-edit strategy. Historical events must be replayed deterministically.

An earlier Ski/Repaint edit must correctly change all later dependent cycle labels, penalties and totals.

## 11. Primary vs Derived Schema
Audit current Mariage round schema. Ensure enough authoritative primary data exists to reconstruct scoring without trusting stored cumulative totals.

Primary data conceptually includes stable round ID/sequence, ordering player ID, order points, resolution type (`normal`/`repaint`), actual values by player for normal resolution, and relevant configured scoring modes.

Derived data includes cumulative totals, deltas, success/Bite presentation, Ski/Repaint sequence labels and calculated statuses.

Normalize minimally if needed and document authoritative fields. No broad unrelated migration.

## 12. Partial / Current Rounds
Recalculation must safely support completed historical rounds, order-only current round, partially resolved `Взято`, and unresolved current round.

Only resolved events affect totals. Partial input must not award unresolved/future points.

## 13. Finish / Apply / Discard
Finishing Edit Mode shows:

**Застосувати зміни?**

`Після підтвердження результати та бали буде перераховано.`

Buttons: `Скасувати`, `Застосувати`.

Here `Скасувати` means remain in Edit Mode without commit.

Also provide explicit discard/exit. If staged changes exist, confirm:

**Скасувати редагування?**

`Усі незбережені зміни буде втрачено.`

Buttons: `Ні`, `Так`.

Discard destroys draft, restores authoritative rendering, exits Edit Mode and does not modify localStorage.

On `Застосувати`:
1. validate draft primary data;
2. run full deterministic recalculation;
3. on failure: do not alter authoritative game/localStorage, remain in Edit Mode, show clear error;
4. on success: replace authoritative Mariage current-game state with recalculated draft, persist once, exit Edit Mode, render final state.

Treat Apply as one logical transaction.

## 14. CS-0015 Compatibility and Conflict Protection
Preserve `Розпис` from `Взято`, dealer indicator/rotation and `Переграти раунд`.

While Edit Mode is active, disable/hide/block gameplay actions that can mutate the same state, including Заказ, Взято, Розпис, Переграти раунд and other conflicting actions as appropriate.

Outside Edit Mode, CS-0015 behavior remains unchanged.

Dealer derives from stable round sequence/player order. Score edits must not change dealer assignment. Do not add/delete/reorder rounds.

## 15. PWA Preservation
Preserve manifest, service worker, offline app shell, standalone display, viewport-fit=cover and safe-area behavior.

Runtime files will change: increment established CardScore service-worker cache version so installed/offline clients do not remain on stale CS-0015 assets. Cache `assets/icons/edit-table.svg` if required offline. Never cache `Task/`. Do not redesign service worker.

## 16. Pokerochok Scope
CS-0016 editing is Mariage-only. Do NOT implement Pokerochok historical editing or change Pokerochok gameplay/scoring/history/persistence.

## 17. Explicitly Out of Scope
Do NOT implement:
- any Barrel/Бочка logic (880, 120 win, attempts, failures, 760, reset to 0, displacement, tie-breaks, winner);
- Pokerochok editing;
- round insertion/deletion/reordering;
- Git/GitHub;
- deployment/Builds;
- automatic ZIP;
- cloud sync;
- third-party frameworks.

## 18. Required Tests
Run syntax checks on all project JS including `service-worker.js`.

Protection:
- normal single/double tap: no edit;
- edit button confirmation `Ні`/`Так`;
- visible Edit Mode;
- Edit Mode single tap: no edit;
- desktop double-click and touch double-tap;
- only allowed inputs respond;
- per-value confirmation before editor.

Draft isolation:
- stage edits; authoritative game/localStorage unchanged before Apply;
- reload with uncommitted draft remains safe. Draft may be discarded on reload if authoritative save remains intact and this is documented.

Recalculation scenarios:
1. edit old non-ordering positive Taken;
2. ordering success → Bite;
3. Bite → success;
4. ordering result → 0 (Bite + Ski);
5. non-ordering result → 0 (Ski);
6. edit earlier Ski and verify later L cycle/penalty/totals;
7. edit earlier Repaint and verify later Р cycle/penalty/totals;
8. edit order amount;
9. edit ordering player where supported;
10. normal → Repaint;
11. Repaint → normal;
12. immediate Ski mode;
13. immediate Repaint mode;
14. partial current round.

Cancel/apply:
- per-value `Ні` changes nothing;
- finish `Скасувати` remains in Edit Mode;
- discard restores authoritative state with no localStorage change;
- successful Apply validates, recalculates, commits once, exits, survives reload/Continue;
- invalid draft cannot corrupt authoritative state.

Regression:
- CS-0015 Розпис, dealer, Переграти раунд;
- PWA cache/version and offline SVG;
- Pokerochok smoke test.

## 19. Acceptance Criteria
CS-0016 is complete when:
1. Mariage has dedicated edit-table button.
2. `assets/icons/edit-table.svg` exists.
3. Entering Edit Mode requires confirmation.
4. Normal table is protected.
5. Edit Mode is visibly identifiable.
6. Specific editing requires double-click/double-tap.
7. Per-value editing requires second confirmation.
8. Edits are staged in isolated draft.
9. localStorage is unchanged during staging.
10. Primary inputs/events can be corrected safely.
11. Derived fields are not directly editable.
12. Deterministic chronological recalculation exists.
13. Earlier Ski edits rebuild later Ski cycles.
14. Earlier Repaint edits rebuild later Repaint cycles.
15. Order/actual edits rebuild Bite/Ski/success/totals.
16. Partial current rounds remain safe.
17. Apply validates/recalculates before commit.
18. Failed Apply cannot corrupt authoritative state.
19. Discard performs no commit.
20. CS-0015 remains correct.
21. Conflicting gameplay controls are blocked in Edit Mode.
22. PWA cache version is updated appropriately.
23. Pokerochok remains unchanged.
24. No Barrel logic is introduced.
25. All JS syntax checks pass.

## Deliverables
Lifecycle:

`Task/Inbox/CS-0016-Mariage-Safe-Table-Editing-and-Deterministic-Recalculation.md`
→ `Task/In_Progress/CS-0016-Mariage-Safe-Table-Editing-and-Deterministic-Recalculation.md`
→ `Task/Completed/CS-0016-Mariage-Safe-Table-Editing-and-Deterministic-Recalculation.md`

Report:

`Task/Reports/CS-0016-Mariage-Safe-Table-Editing-and-Deterministic-Recalculation-Report.md`

The English report must document implementation summary, files created/modified, SVG, protection layers, double-tap approach, edit-session architecture, authoritative primary fields, recalculation architecture, Ski/Repaint reconstruction, partial-round handling, transactional commit/discard behavior, CS-0015 regression, PWA cache change, Mariage test matrix, Pokerochok regression, JS syntax checks and known limitations.

Do NOT create a ZIP archive. The user will manually create and provide it.
