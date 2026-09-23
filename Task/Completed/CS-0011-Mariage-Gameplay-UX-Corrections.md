# CS-0011 — Mariage Gameplay UX Corrections

## Project

CardScore

## Baseline

Use the current project version after completed CS-0010 as the authoritative baseline.

This is a focused correction task for the existing Mariage implementation.

Do not redesign or rewrite Pokerochok.
Do not introduce unrelated Mariage rules.
Do not add Git, GitHub, deployment, Builds, or automatic ZIP generation.

---

# Objective

Apply the first gameplay/UX corrections discovered during practical testing of Mariage.

Required changes:

1. make each player's table header and column proportions match the Pokerochok pattern;
2. add a safe Close/Cancel action to the Order dialog;
3. improve temporary Order display in the score column;
4. replace forced sequential result entry with selectable unresolved players;
5. enforce the defined 3-player Order range and step;
6. add a one-tap Ski action for non-ordering players.

Preserve all CS-0010 scoring and persistence rules unless explicitly changed below.

---

# 1. Player Header

Mariage must use the same player-header concept as Pokerochok.

For each player, use ONE merged header containing only the player's name and spanning that player's two columns.

Conceptually:

```text
┌────────────────────────────┐
│           Камар            │
├─────────┬──────────────────┤
│ status  │      score       │
└─────────┴──────────────────┘
```

Do not render separate top-level `Гравець` and `Бали` headers for each player.

Reuse the Pokerochok table/header proportions and responsive behavior where practical instead of inventing a different Mariage layout.

---

# 2. Player Column Proportions

Each Mariage player keeps two columns with the same general proportions as Pokerochok:

```text
narrow result/status column
+
wide cumulative-score column
```

Target the existing Pokerochok proportions (approximately 35% / 65% within a player's pair, subject to the existing responsive CSS).

Do not make the status and score columns equal width.

The narrow column is for round status/event presentation.

Possible values include:

```text
✅
Б
L1
L2
L3
L
Р1
Р2
Р3
Р
🚫
```

For a non-ordering player who took positive points normally, the status cell remains empty.

During Repaint, beneficiary players may retain the existing neutral/grey status presentation.

---

# 3. Score Column Behavior

The wide column is the player's score column.

Normally it displays the cumulative score after resolved rounds.

During an unresolved Order, the ordering player's current Order amount is temporarily displayed in this wide score cell.

The temporary Order must:

- be visually grey/muted;
- be clearly distinguishable from finalized cumulative score;
- remain presentation-only;
- NOT overwrite or mutate the authoritative cumulative score.

After the player's result/round is resolved, replace the temporary Order display with the resulting cumulative score.

Persistence must continue to distinguish:

```text
authoritative cumulative score
current Order amount
temporary rendered Order
```

---

# 4. Successful Order Status

Keep the successful-order marker.

For the ordering player:

```text
actual >= order
```

means:

```text
score delta = +order
status = ✅
```

Example:

```text
order = 120
actual = 130
→ +120
→ ✅
```

The status `✅` belongs in the narrow status column.

Do not show `✅` for a non-ordering player merely because they took positive points.

---

# 5. Order Dialog — Close / Cancel

Add a visible button:

```text
Закрити
```

to the Order dialog.

Its purpose is to allow the user to cancel the current Order selection if they accidentally selected the wrong ordering player.

`Закрити` must behave as a true Cancel action.

If the user:

```text
opens Order
→ selects Player 2
→ realizes Player 2 is wrong
→ presses Закрити
```

then:

- close the dialog;
- do not create an Order;
- do not advance the round phase;
- do not change cumulative scores;
- do not leave a temporary Order value in the table;
- do not leave a committed `orderingPlayerId`;
- do not leave committed `orderPoints`.

The user must then be able to reopen `Заказ` and select the correct ordering player.

Do not destroy a previously valid persisted round merely because an uncommitted dialog was cancelled.

---

# 6. Result Entry — Remove Forced Player Sequence

CS-0010 used sequential player entry.

Change this behavior.

After the user starts result entry (`Взято` / result recording), display ALL players whose result for the current round has NOT yet been confirmed.

Example with four unresolved players:

```text
Запис балів

[ Гравець 1 ]
[ Гравець 2 ]
[ Гравець 3 ]
[ Гравець 4 ]
```

The user may choose ANY unresolved player.

Do not force:

```text
Player 1 → Player 2 → Player 3 → Player 4
```

The ordering player may be selected at any point in this result-entry process.

---

# 7. Remove Player After Result Confirmation

After a player's result is successfully confirmed:

1. calculate/apply that player's round result immediately;
2. persist it;
3. update the table;
4. remove/disable that player from the unresolved-player selection list.

Preferred UX: remove the player's button from the list.

Example:

Initial:

```text
[ Player 1 ]
[ Player 2 ]
[ Player 3 ]
[ Player 4 ]
```

User selects Player 3 and confirms the result.

Then:

```text
[ Player 1 ]
[ Player 2 ]
[ Player 4 ]
```

User selects Player 2 and confirms.

Then:

```text
[ Player 1 ]
[ Player 4 ]
```

Continue until no unresolved players remain.

After the last unresolved player is confirmed, resolve/complete the round automatically according to the existing round lifecycle.

---

# 8. Persist Unresolved Players

Do not use a single `currentPlayerIndex` as the authoritative result-entry state.

The round must be able to determine which players are already resolved and which are still unresolved.

Conceptually:

```javascript
resolvedPlayerIds: ["player-3", "player-2"]
```

or equivalent derivation from per-player result state.

The exact data structure is implementation-defined.

Important behavior:

```text
4 players
→ Player 3 result confirmed
→ Player 2 result confirmed
→ close dialog / navigate away / reload
→ Continue
```

The result-entry UI must offer only:

```text
Player 1
Player 4
```

Previously confirmed results must not be requested again and must not be scored twice.

Preserve compatibility with unfinished Mariage games created by CS-0010 where reasonably possible.

---

# 9. Result Entry Player Selection

When an unresolved player button is selected, open/show the appropriate result controls for that player.

Clearly show:

- selected player's name;
- whether this player is the ordering player where useful;
- numeric points input;
- applicable quick actions.

The user must be able to return from the selected player's entry form to the unresolved-player list without accidentally committing a result.

Do not automatically mark a player resolved merely by selecting them.

---

# 10. Non-Ordering Player — Quick Ski Button

For a player who did NOT make the Order, add a quick action:

```text
Лижа
```

This removes the need to manually enter `0`.

When pressed:

```text
actual = 0
```

and apply the currently configured Ski rule exactly as defined in CS-0010.

Three-Ski mode:

```text
L1
L2
L3 → −100
then reset
```

Immediate mode:

```text
L → −50
```

After successfully applying the Ski:

- update the status cell;
- update cumulative score if a Ski penalty applies;
- persist the result;
- mark that player resolved;
- remove that player from the unresolved-player list.

This quick action is only a faster way to record a zero result. It must use the same underlying Ski scoring logic as numeric `0`.

---

# 11. Ordering Player and Ski

Do NOT show the standalone `Лижа` quick button for the ordering player.

For the ordering player, zero means the existing combined event:

```text
Bite + Ski
```

Continue using the existing ordering-player behavior/quick action:

```text
Байт + Лижа
```

with semantic:

```javascript
bite: true
ski: true
```

and current fallback display:

```text
🚫
```

Do not accidentally allow the ordering player to receive only Ski while bypassing Bite.

---

# 12. Three-Player Order Limits

A new confirmed game rule applies when Mariage has exactly 3 players.

Order values must satisfy ALL of:

```text
minimum = 100
maximum = 420
multiple of 5
```

Valid examples:

```text
100
105
110
115
...
410
415
420
```

Invalid examples:

```text
95
99
101
117
421
425
```

The UI should make valid entry easy, preferably using a control that naturally moves in increments of 5.

Still validate in JavaScript before committing the Order; do not rely only on HTML input attributes.

For a 3-player game, an invalid Order must not be committed.

Provide a concise validation message.

---

# 13. Two- and Four-Player Order Limits

Order limits for 2-player and 4-player Mariage have NOT yet been specified.

Do not apply the 3-player `100–420` range to them.

Do not invent alternative minimum/maximum values.

Preserve the existing neutral numeric behavior for 2 and 4 players until those rules are defined later.

Do not block those game modes because their final limits are still unspecified.

---

# 14. Existing Special Events

Preserve the CS-0010 rules:

### Ordering player

```text
actual >= order → +order, ✅
actual < order and actual > 0 → −order, Б
actual = 0 → −order plus Ski consequence, 🚫
Repaint → Р1/Р2/Р3 or Р according to configured rule
```

### Non-ordering player

```text
actual > 0 → +actual, empty status
actual = 0 → Ski
```

Only the ordering player may receive:

```text
Байт
Розпис
```

Any player may receive:

```text
Лижа
```

---

# 15. Repaint

Do not change Repaint scoring in this task.

Three-Repaint mode:

```text
Р1 → ordering player 0; others +60
Р2 → ordering player 0; others +60
Р3 → ordering player −120; others +60
then reset
```

Immediate mode:

```text
Р → ordering player −60; others +60
```

A Repaint remains a whole-round resolution path and does not use the unresolved-player result-entry workflow.

---

# 16. Presentation Layer / SVG Foundation

Preserve the semantic presentation architecture from CS-0010.

Do not replace semantic events with hard-coded table strings.

Continue supporting the future SVG result-icon mapping.

This correction task does not require creation of final SVG artwork.

---

# 17. UI / UX

Preserve the existing CardScore visual language and manual CSS refinements.

Primary target remains Android tablet, with phone and desktop support.

Ensure:

- merged player headers remain readable;
- narrow/wide player columns remain usable responsively;
- unresolved-player buttons are touch-friendly;
- the selected player is obvious;
- `Закрити` is clearly distinguishable from committing an Order;
- `Лижа` is easy to tap but cannot be confused with numeric confirmation;
- no essential action depends on hover.

Do not perform unrelated redesign.

---

# 18. Persistence / Regression

Verify all new intermediate UI states work with the existing Mariage persistence model.

Critical case:

```text
Order committed
→ results started
→ some arbitrary players resolved
→ page reload
→ Continue
→ only unresolved players remain available
```

Do not double-score resolved players.

Pokerochok must remain unchanged.

Preserve independent current-game storage for Pokerochok and Mariage.

---

# 19. Required Tests

## Header/layout

Verify each player's name is one merged header over the two player columns.

Verify status column is narrow and score column is wide, matching the Pokerochok concept.

## Temporary Order

Verify committed Order appears muted/grey in ordering player's score cell while unresolved.

Verify authoritative cumulative score is unchanged until scoring.

## Cancel Order dialog

```text
open Заказ
select wrong player
press Закрити
```

Verify no Order/player/phase mutation remains.

Reopen and successfully select another player.

## Arbitrary result order

With four players:

```text
select Player 3 → confirm
select Player 2 → confirm
select Player 4 → confirm
select Player 1 → confirm
```

Verify each disappears after confirmation and each is scored exactly once.

## Partial results + reload

Resolve Player 3 and Player 2.

Reload/Continue.

Verify only Player 1 and Player 4 are offered.

## Non-ordering Ski button

Select a non-ordering player.

Press `Лижа`.

Verify it is equivalent to `actual = 0`, correct Ski rule is applied, and player disappears from unresolved list.

## Ordering player

Verify standalone `Лижа` is not available.

Verify `Байт + Лижа` remains available/functional.

## 3-player Order validation

Accept:

```text
100
105
200
415
420
```

Reject:

```text
95
99
101
117
421
425
```

Verify invalid values do not change round state.

## 2/4 players

Verify the new 3-player bounds are NOT incorrectly imposed on 2- or 4-player games.

## Existing scoring

Regression-test:

- successful Order;
- Bite;
- Bite + Ski;
- L1/L2/L3;
- immediate Ski;
- Р1/Р2/Р3;
- immediate Repaint.

## Pokerochok

Run critical Pokerochok regression flow and verify its layout/scoring/storage remains unchanged.

## Syntax

Run JavaScript syntax checks on every JS file.

---

# 20. Acceptance Criteria

CS-0011 is complete when:

1. Mariage player headers are merged like Pokerochok.
2. Player column proportions follow the Pokerochok narrow-status/wide-score pattern.
3. the status column displays semantic statuses including `✅`.
4. the score column displays a muted temporary Order and finalized cumulative score.
5. Order dialog has a safe `Закрити` Cancel action.
6. cancelling an uncommitted Order leaves no ordering-player/order/phase residue.
7. result entry is no longer forced into player-number sequence.
8. all unresolved players can be selected in any order.
9. confirmed players disappear from the unresolved list.
10. partially resolved arbitrary order survives reload/Continue.
11. already resolved players cannot be scored twice.
12. non-ordering players have a one-tap `Лижа` action.
13. the `Лижа` action uses the same underlying zero/Ski logic as numeric zero.
14. ordering player does not receive a standalone Ski action.
15. existing `Байт + Лижа` behavior remains correct.
16. 3-player Order is restricted to `100–420`, multiple of `5`.
17. 2/4-player limits are not invented.
18. existing Bite/Ski/Repaint scoring remains correct.
19. SVG-ready semantic presentation architecture remains intact.
20. Pokerochok remains unchanged.
21. JavaScript syntax checks and required regression tests pass.

---

# Deliverables

Task lifecycle:

```text
Task/Inbox/CS-0011-Mariage-Gameplay-UX-Corrections.md
→ Task/In_Progress/CS-0011-Mariage-Gameplay-UX-Corrections.md
→ Task/Completed/CS-0011-Mariage-Gameplay-UX-Corrections.md
```

Create:

```text
Task/Reports/CS-0011-Mariage-Gameplay-UX-Corrections-Report.md
```

The English report must include:

- implementation summary;
- files modified;
- merged-header/table-layout changes;
- Order Cancel behavior;
- temporary Order rendering;
- arbitrary unresolved-player result workflow;
- persistence changes for partial result entry;
- non-ordering-player Ski quick action;
- 3-player Order validation;
- regression results for existing Mariage scoring;
- Pokerochok regression results;
- JavaScript syntax-check results;
- any intentionally unresolved 2/4-player Order constraints.

Do NOT create a ZIP archive.

The user will manually create and provide the project archive after Codex completes the task.
