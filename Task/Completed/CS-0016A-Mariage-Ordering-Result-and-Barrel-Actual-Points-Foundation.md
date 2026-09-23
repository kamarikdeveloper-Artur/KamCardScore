# CS-0016A — Mariage Ordering Result and Barrel Actual Points Foundation

## Baseline
Use `CardScore_09` after completed CS-0016 as the authoritative baseline.

## Goal
Before Barrel/Бочка, replace the ordering player's ordinary numeric Taken result with an explicit semantic result while preserving a separate optional factual-points field for future Barrel candidate comparison.

Do NOT implement Barrel rules in this task.

## 1. Ordering-player primary result
For a normal round, store an authoritative semantic result equivalent to:

```js
orderingResult: "taken"     // Взято
orderingResult: "bite"      // Байт
orderingResult: "bite_ski"  // Байт + Лижа
```

Use existing naming conventions if appropriate.

The ordering player must no longer normally enter arbitrary numeric Taken.

### Scoring
- `taken` → credit exactly `orderPoints`.
- `bite` → subtract exactly `orderPoints`.
- `bite_ski` → subtract exactly `orderPoints` AND independently apply configured Ski logic.

Excess factual points never increase the successful order score.

## 2. Ordering-player gameplay UI
In the normal `Взято` workflow, when resolving the ordering player, replace/remove the ordinary numeric Taken input and show:
- `Взято`
- `Байт`
- `Байт + Лижа`

Selecting the player alone does not resolve them.

For non-ordering players preserve the current numeric Taken workflow:
- 3 players: 0..500
- 4 players: 0..420
- not required to be a multiple of 5
- positive value adds actual points
- zero produces Ski
- preserve existing `Лижа` quick action.

## 3. Separate factual points for future Barrel logic
The ordering player's physical/factual round points must be representable separately:

```js
orderingActualPoints: 145
```

This is NOT the scoring delta.

Example:
```text
Order = 120
Result = taken
orderingActualPoints = 145

Score delta = +120
Future Barrel comparison value = 145
```

Do not ask for this value in every ordinary round.

It is optional primary data reserved for future situations where Barrel candidate comparison needs the ordering player's factual points.

When present:
- integer >= 0;
- 3 players: <= 500;
- 4 players: <= 420;
- for `taken`, must be >= `orderPoints`;
- must never alter ordinary scoring.

Do not invent factual values automatically for `bite`/`bite_ski`.

## 4. Future Barrel prompt boundary
Prepare a clean helper/domain boundary that CS-0017 can invoke to request factual points, conceptually:

**Фактично взято: <player>**

`Вкажіть фактично взяті бали. Значення використовується для визначення черговості входу на Бочку та не змінює нараховані бали за виконаний заказ.`

A reusable dialog/helper may be implemented if clean.

But CS-0016A must NOT:
- detect 880 candidates;
- decide when this prompt is required;
- select a Barrel entrant;
- execute candidate tie-breaks;
- implement any Barrel state.

## 5. Recalculation
Update the CS-0016 deterministic Mariage recalculation engine so ordering-player scoring is driven by `orderingResult`, not by comparison of arbitrary ordering-player numeric actual.

Required:
- taken → +order, success status;
- bite → -order, Bite status;
- bite_ski → -order + Ski, Bite+Ski status.

`orderingActualPoints` must not alter score totals.

Non-ordering players continue scoring from numeric actuals.

Preserve chronological reconstruction of totals, Bite, Ski cycles, Repaint cycles, statuses and partial rounds.

## 6. Repaint
Repaint remains a whole-round alternate resolution.

For Repaint:
- normal ordering result must not additionally score;
- normal actual values must not additionally score;
- `orderingActualPoints` must not score;
- existing Repaint logic remains authoritative.

## 7. Edit Mode
Adapt CS-0016 Edit Mode.

For the ordering player, edit the semantic result:
- Взято
- Байт
- Байт + Лижа

Do not require arbitrary numeric Taken for normal ordering-player result editing.

If `orderingActualPoints` exists, allow it to be inspected/edited separately and clearly identify it as factual data, not score.

Derived totals/statuses remain non-editable.

Preserve:
- isolated edit draft;
- double-click/double-tap protection;
- confirmations;
- full deterministic recalculation;
- transactional Apply;
- safe Discard.

Changing only `orderingActualPoints` must not change cumulative scores.

## 8. Minimal CS-0016 test-save normalization
The project is still under active testing. Do not spend significant scope on obsolete saves.

Prevent crashes if an immediately preceding CS-0016 round still has numeric ordering-player actual but no semantic `orderingResult`.

If sufficient data exists, minimally normalize:
- actual >= order → `taken`
- 0 < actual < order → `bite`
- actual == 0 → `bite_ski`

After normalization, semantic result is authoritative.

Do not build a broad migration framework.

## 9. Partial rounds
Support:
- order selected, ordering result unresolved;
- ordering player resolved before others;
- non-ordering players resolved before ordering player;
- partial arbitrary resolution order;
- Repaint;
- reload/Continue during partial round.

Only explicit `Взято`, `Байт`, or `Байт + Лижа` resolves the ordering player in normal gameplay.

## 10. Replay and dealer
Preserve CS-0015 `Переграти раунд`.

Replay must revert the new semantic result, optional factual value, actuals, scores, Ski/Repaint counters and statuses to the same round's pre-round state.

Do not duplicate the round or advance dealer.

Dealer rotation must remain unchanged.

## 11. PWA / Pokerochok
Preserve PWA. Increment established CardScore service-worker cache version because runtime assets change. Never cache `Task/`.

Do not change Pokerochok.

## 12. Explicitly out of scope
Do NOT implement:
- Barrel entry at 880;
- clamp to 880;
- Barrel attempts;
- 120+ Barrel win;
- failed-Barrel counter;
- 760 result;
- third-failure reset to 0;
- displacement;
- one-player-on-Barrel rule;
- simultaneous-candidate selection/tie-break execution;
- Barrel winner/end-game UI;
- Git/GitHub/deployment/Builds;
- automatic ZIP;
- cloud sync.

## 13. Required tests
Verify:
1. ordering player has no ordinary numeric Taken input;
2. ordering player has Взято / Байт / Байт + Лижа;
3. taken credits exactly order;
4. factual excess does not increase score;
5. bite subtracts order;
6. bite_ski subtracts order and applies Ski exactly once;
7. non-ordering numeric Taken unchanged;
8. L1/L2/L3 and immediate Ski remain correct;
9. Repaint ignores normal-resolution fields for scoring;
10. Edit Mode edits semantic ordering result;
11. orderingActualPoints can be separately edited when present;
12. changing only orderingActualPoints does not change totals;
13. historical semantic edits correctly recalculate later totals/cycles;
14. minimal old numeric normalization maps >=order / partial / zero correctly;
15. partial rounds survive Continue;
16. replay restores new fields correctly;
17. dealer unchanged;
18. PWA cache updated;
19. Pokerochok smoke test passes.

Run syntax checks for all JS including service worker.

## 14. Acceptance criteria
CS-0016A is complete when:
- semantic ordering result is authoritative;
- normal ordering player resolves only via Взято/Байт/Байт+Лижа;
- optional `orderingActualPoints` exists separately;
- factual value never changes ordinary score calculation;
- recalculation uses semantic result;
- Ski/Repaint reconstruction remains deterministic;
- Edit Mode supports the new model;
- draft/Apply/Discard safety remains intact;
- partial rounds, Replay and Continue work;
- dealer and Pokerochok are unchanged;
- PWA cache version is updated;
- no Barrel rules are implemented;
- all JS syntax checks pass.

## Deliverables
Lifecycle:
`Task/Inbox/CS-0016A-Mariage-Ordering-Result-and-Barrel-Actual-Points-Foundation.md`
→ `Task/In_Progress/CS-0016A-Mariage-Ordering-Result-and-Barrel-Actual-Points-Foundation.md`
→ `Task/Completed/CS-0016A-Mariage-Ordering-Result-and-Barrel-Actual-Points-Foundation.md`

Report:
`Task/Reports/CS-0016A-Mariage-Ordering-Result-and-Barrel-Actual-Points-Foundation-Report.md`

English report must document implementation, files, new semantic model, factual-points field, UI, recalculation, Ski/Repaint behavior, Edit Mode, normalization, partial rounds, Replay, PWA cache change, regressions, syntax checks and known limitations.

Explicitly confirm that Barrel logic was NOT implemented.

Do NOT create a ZIP archive. The user will manually provide the project archive.
