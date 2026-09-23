# CS-0010 — Mariage Foundation and Core Round Flow

## Baseline
Use the current project after completed CS-0009 as the authoritative baseline. Preserve the CardScore Game Hub and the complete Pokerochok implementation. Do not redesign or change Pokerochok rules.

## Objective
Implement the first functional Mariage module. This task establishes the extensible foundation and core flow; do not invent unspecified Mariage rules.

## 1. Game Hub and module
Make `mariage` available in the Game Hub and open its own menu:

```text
Нова гра
Продовжити
Історія
Статистика
Назад
```

New Game and Continue are functional. History/Statistics may remain placeholders. Back is non-destructive.

Create:

```text
js/games/mariage.js
```

Keep Mariage rules out of `pokerochok.js`.

## 2. Setup
Support 2–4 players and player names.

Add two independent persisted game settings.

### Ski / Лижа
Mode `three`:
```text
L1 → no Ski penalty
L2 → no Ski penalty
L3 → −100, then reset active Ski cycle
next Ski → L1
```

Mode `immediate`:
```text
every L → −50
```

### Repaint / Розпис
Mode `three`:
```text
Р1 → ordering player 0 delta; every other player +60
Р2 → ordering player 0 delta; every other player +60
Р3 → ordering player −120; every other player +60
then reset active Repaint cycle
next Repaint → Р1
```

Mode `immediate`:
```text
Р → ordering player −60; every other player +60
```

Ski and Repaint counters are individual per player and independent.

## 3. Table
Base the visual structure on Pokerochok, but Mariage has NO round-name column.

Each player has:
```text
[result/event] [cumulative score]
```

Rounds are open-ended and do not have named round types.

## 4. Round data model
Each round needs a stable ID/sequence and enough authoritative data to reconstruct:
- ordering player;
- order amount;
- phase/status;
- whether Repaint occurred;
- actual points where applicable;
- score delta and cumulative score for each player;
- Bite;
- Ski and Ski cycle number;
- Repaint and Repaint cycle number;
- semantic result/display state.

Never use rendered text such as `🚫`, `Б`, `L1`, or `Р1` as the source of truth.

## 5. Ordering player and Order
Exactly ONE player makes the order in a normal round.

Do NOT invent automatic rotation. The ordering player must be selectable because the physical game determines who earned the right to order.

Flow:
```text
Заказ
→ select/identify ordering player
→ show that player's name
→ enter order points
```

Store `orderingPlayerId` and `orderPoints` separately from cumulative score.

While unresolved, temporarily show the order amount in the ordering player's score field. This is presentation only and must not mutate the authoritative cumulative score.

Persist unresolved order state across reload.

Do not invent minimum, maximum, increment, or fixed total-pool rules for order points.

## 6. Result-entry phase
After physical play, start result entry for ALL configured players sequentially.

Clearly show the current player.

For normal entry, enter actual points. Resolve each player's score immediately after confirmation rather than waiting for every player.

Actual points must be numeric and non-negative. Do not invent a maximum.

## 7. Non-ordering player
A non-ordering player has no order requirement.

If `actual > 0`:
```text
score delta = actual
```

They cannot receive Bite or Repaint.

They CAN receive Ski when `actual == 0`.

## 8. Successful ordering player
If:
```text
actual >= order
```

then:
```text
score delta = +order
result = success
fallback display = ✅
```

Extra actual points above the order do not add extra score.

Example:
```text
previous 300
order 120
actual 130
new total 420
```

## 9. Bite / Байт
Bite is ONLY for the ordering player and is always:
```text
−order
```

No counter, cycle, or alternate Bite rule.

If ordering player's actual points are below the order, the system must be able to derive/apply Bite.

Also provide a quick result-entry action:
```text
Байт
```

Fallback display:
```text
Б
```

## 10. Ski / Лижа
Any player can receive Ski, including the ordering player.

Ski occurs when that player's actual result in a normally played round is:
```text
0
```

In `three` mode:
```text
first Ski  → L1
second Ski → L2
third Ski  → L3 and −100
then reset; next Ski → L1
```

In `immediate` mode:
```text
every Ski → L and −50
```

Preserve historical Ski entries. When a three-Ski cycle completes, visually de-emphasize its completed L1/L2/L3 entries (reduced opacity, strike-through, or both) without deleting historical data. Immediate-mode `L` entries are not cycle-de-emphasized.

## 11. Bite + Ski
The ordering player may receive Bite AND Ski in the same round.

Example:
```text
previous 500
order 120
actual 0
this is third Ski

Bite −120
L3   −100
new total 280
```

Internally preserve both semantic facts:
```javascript
bite: true
ski: true
```

Do not collapse them into one logical event.

Provide/allow a quick action:
```text
Байт + Лижа
```

Initial combined fallback display:
```text
🚫
```

Both consequences must be applied according to the selected Ski rule.

## 12. Repaint / Розпис
Repaint is ONLY available to the ordering player.

It is a separate round-resolution path. When selected:
- do not require normal actual-point entry for all players;
- do not generate Bite or Ski merely because actual points were not entered;
- resolve the whole round according to Repaint rules.

### `three`
```text
Р1: ordering player 0; others +60
Р2: ordering player 0; others +60
Р3: ordering player −120; others +60
then reset; next Repaint → Р1
```

### `immediate`
```text
Р: ordering player −60; others +60
```

For non-ordering players during Repaint, use a neutral UI representation such as `--` or a grey/inactive result cell. Do NOT store `"--"` as the logical event. Their data must indicate that +60 came from another player's Repaint.

Preserve historical Repaint entries. Completed three-Repaint cycles should be visually de-emphasized without deleting their data. Immediate-mode `Р` entries remain normally visible.

## 13. Result presentation and SVG foundation
Separate semantic scoring/state from presentation.

Centralize mapping for initial fallbacks:
```text
success             → ✅
bite                → Б
ski cycle 1         → L1
ski cycle 2         → L2
ski cycle 3         → L3
immediate ski       → L
repaint cycle 1     → Р1
repaint cycle 2     → Р2
repaint cycle 3     → Р3
immediate repaint   → Р
bite + ski          → 🚫
repaint beneficiary → -- / neutral grey state
```

Prepare:
```text
assets/mariage/results/
```

The presentation layer must be ready to later map semantic states to optional SVG assets such as `success.svg`, `bite.svg`, `ski.svg`, `repaint.svg`, `bite-ski.svg`.

Do NOT fabricate final artwork. Missing SVGs must gracefully use fallback text/emoji. Never store an SVG filename as the authoritative result.

## 14. Persistence and multi-game separation
Mariage and Pokerochok must not overwrite each other's current games. A user may have one unfinished Pokerochok game AND one unfinished Mariage game simultaneously.

Use stable:
```text
gameType: "mariage"
```

Persist at least:
- stable game ID;
- startedAt;
- players;
- selected Ski/Repaint rules;
- cumulative scores;
- current/open round;
- ordering player;
- order;
- phase;
- already entered results;
- Ski cycle state per player;
- Repaint cycle state per player;
- historical rounds.

Reload during an unfinished round must restore the exact phase.

Preserve compatibility with existing Pokerochok saves from CS-0009. Do not destroy existing Pokerochok current-game or History data.

Do not archive unfinished Mariage games as completed History.

## 15. Open-ended game
No Mariage end condition has been specified.

Do NOT invent:
- target score;
- fixed round count;
- winner;
- automatic final results.

For CS-0010 Mariage is an open-ended score notebook. Provide safe navigation back to its menu/Game Hub without deleting the active game.

## 16. Phase safety
Conceptual flow:
```text
no active round
→ Заказ
→ physical play
→ Взято / result entry
→ sequential player results
→ round resolved
→ next round
```

Prevent incompatible actions:
- one ordering player only;
- Bite only for ordering player;
- Repaint only for ordering player;
- any player may Ski through a zero result.

## 17. UI/UX
Follow existing CardScore visual language. No major redesign.

Must be:
- touch-friendly;
- Android-tablet first;
- phone/desktop usable;
- responsive;
- clear current player;
- clear ordering player and order;
- large numeric/special-action controls;
- clear disabled states;
- no hover-only interaction.

Do not revert existing manual CSS refinements.

## 18. Pokerochok regression
Do not change Pokerochok gameplay.

Verify Game Hub → Pokerochok → New Game/Continue still works. Existing Pokerochok saves, scoring, final results, and History foundation must remain compatible after storage changes.

## 19. Explicitly unresolved — DO NOT invent
Do not invent:
- physical rule deciding who earns the order;
- automatic ordering-player rotation;
- order minimum/maximum/increments;
- fixed points available in a deal;
- target score;
- number of rounds;
- winner/end-game rules;
- Mariage History UI;
- Statistics;
- additional bonuses/penalties.

Use extensible neutral behavior where needed and document unresolved items.

## 20. Required tests
Test:
- Game Hub → Mariage;
- 2, 3, 4 players;
- both Ski modes;
- both Repaint modes;
- exactly one ordering player;
- temporary order display does not mutate cumulative score;
- successful order (`300 + order 120, actual 130 = 420, ✅`);
- Bite (`−order`, `Б`);
- non-ordering positive actual adds actual;
- L1 → L2 → L3 −100 → next L1;
- immediate L always −50;
- Bite + third Ski: `500 −120 −100 = 280`, semantic dual event, `🚫`;
- Р1/Р2: ordering delta 0, others +60;
- Р3: ordering −120, others +60, next Repaint Р1;
- immediate Р: ordering −60, others +60;
- Repaint does not accidentally trigger Bite/Ski;
- completed cycles visually de-emphasize without deleting history;
- fallback result presentation works without SVG files;
- reload after order, midway through results, and after resolved round;
- simultaneous independent Pokerochok and Mariage current games;
- existing Pokerochok save compatibility;
- JavaScript syntax checks for every JS file.

## 21. Scope restrictions
Do NOT add:
- Git/GitHub;
- deployment;
- Builds/;
- automatic ZIP;
- PWA;
- backend/cloud/authentication;
- full Mariage History;
- Statistics;
- invented Mariage rules;
- unrelated redesign.

## Acceptance Criteria
Complete when all defined foundation, setup, order/result flow, scoring/event rules, cycle handling, SVG-ready presentation, persistence, multi-game separation, Pokerochok compatibility, and required tests above are implemented without inventing unspecified rules.

## Deliverables

Task lifecycle:
```text
Task/Inbox/CS-0010-Mariage-Foundation-and-Core-Round-Flow.md
→ Task/In_Progress/CS-0010-Mariage-Foundation-and-Core-Round-Flow.md
→ Task/Completed/CS-0010-Mariage-Foundation-and-Core-Round-Flow.md
```

Create:
```text
Task/Reports/CS-0010-Mariage-Foundation-and-Core-Round-Flow-Report.md
```

Expected additions include:
```text
js/games/mariage.js
assets/mariage/results/
```

The English report must document implementation, files changed/created, data model, setup, order/result flow, Bite, Ski, Bite+Ski, Repaint, SVG-ready presentation, persistence/storage separation, Pokerochok compatibility, tests, syntax checks, and unresolved rules intentionally left unspecified.

Do NOT create a ZIP. The user will manually create and provide the project archive after Codex completes the task.
