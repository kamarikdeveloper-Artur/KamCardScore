# CS-0017 — Mariage Barrel Engine

## Baseline
Use `CardScore_10(1)` after completed CS-0016A as the authoritative baseline.

## Goal
Implement deterministic Barrel/Бочка domain logic on top of the CS-0016/CS-0016A recalculation architecture. Preserve Mariage, Edit Mode, Replay, dealer, PWA and Pokerochok.

Do NOT implement the separately planned Game Settings UI changes in this task.

## 1. Barrel state
Use explicit derived state per player, conceptually:
```js
{ onBarrel: false, barrelAttempts: 0, failedBarrels: 0 }
```
Do not infer Barrel only from `score === 880`. Barrel state must be reproducible by `recalculateMariageGame()`.

Only one player may be on Barrel at a time.

## 2. Entry
After a resolved round, a player whose raw post-round score reaches/exceeds 880 becomes a candidate.

Selected entrant:
- score becomes exactly 880 regardless of overshoot;
- `onBarrel = true`;
- active attempt state starts.

Example: 850 + 180 = raw 1030 → Barrel at 880.

## 3. Minimum order and bidding
A player currently on Barrel participates in normal bidding/order competition.

Their minimum order is **120**.

120 is only the minimum bid, not a fixed success target. If bidding raises their final order to 155, they must fulfill 155.

Example:
```text
Barrel → 120
P2 → 125
Barrel → 130
P3 → 150
Barrel → 155
```
Final required order = 155.

Exactly 120 is valid and failure at 120 is a normal failed Barrel order. Do not use the obsolete interpretation “only >120 causes failure”.

Respect existing overall Mariage order maxima.

## 4. Win
CS-0016A semantic ordering result is authoritative.

If the Barrel holder is the ordering player and:
```text
orderingResult === "taken"
```
their final order is fulfilled and they win the Mariage game.

Examples:
- order 120 + taken → WIN;
- order 155 + taken → WIN.

Do not require a separate factual >=120 check. `taken` means the final order was fulfilled.

Persist stable game-completed state, winner player ID and completion time once. Prevent further gameplay mutation after completion. Rich final-result presentation is deferred to CS-0018.

## 5. Failed own order on Barrel
If Barrel holder is ordering player and result is:
- `bite`, or
- `bite_ski`

they immediately leave Barrel and this counts as one failed Barrel.

Score before failed-cycle override:
```text
880 - final orderPoints
```

For `bite_ski`, also apply Ski independently exactly once.

Examples:
- 880, order 120, bite → 760;
- 880, order 155, bite → 725.

Do NOT replace every failed own order with generic 760.

If this exit becomes the player's third failed Barrel, the third-failure rule below overrides the resulting score to 0.

## 6. Attempts
A Barrel holder has at most **3 completed rounds/attempts** to win.

Each completed round while remaining on Barrel consumes one attempt.

If Barrel holder is not ordering player:
- they do not win from that round;
- consume one attempt;
- remain on Barrel if attempts remain and no displacement occurs.

If ordering:
- taken → win immediately;
- bite/bite_ski → immediate failed-Barrel exit.

After the third completed non-winning attempt:
- leave Barrel;
- register one failed Barrel;
- normal exit score = 760 unless third-failed-Barrel reset applies.

Do not accumulate points from several attempts toward a separate 120 target.

## 7. Failed Barrel cycle
Canonical rule:
```text
Entered Barrel → left Barrel without winning = exactly 1 failed Barrel.
```

This includes:
- three-attempt exhaustion;
- failed own order;
- displacement;
- any other rule-defined non-winning exit.

Register failure once on transition out of `onBarrel`, not independently in multiple branches.

Players may enter Barrel unlimited times.

First/second failed Barrel:
- keep the exit score defined by exit reason.
- attempt exhaustion/displacement normally → 760.
- failed own order → `880 - order`, plus Ski if bite_ski.

Third failed Barrel:
- final score = 0;
- reset `failedBarrels = 0`;
- player stays in game;
- new cycle may begin later.

Third-failure reset is final override.

## 8. Only one holder / displacement
If a newly selected candidate enters while another player holds Barrel:
1. determine selected candidate;
2. old holder leaves;
3. register exactly one failed Barrel;
4. old holder normally becomes 760, or 0/reset if this is third failure;
5. new selected entrant becomes sole holder at 880.

Do not double-count displacement and attempt exhaustion.

## 9. Multiple candidates
If several players reach/exceed 880 after one round, select exactly one using this exact deterministic priority:

1. **Higher factual points taken in that round.**
   - non-ordering player: existing numeric Taken is factual value;
   - ordering player: use CS-0016A `orderingActualPoints`.
   - if ordering player is a candidate and this factual value is required but missing, request it via the CS-0016A factual-points boundary before final selection.
   - never invent factual value from orderPoints.
2. If equal: **higher score before this round** wins.
3. If still equal and exactly one tied candidate is ordering player: **ordering player** wins.
4. If still equal: **first tied candidate in cyclic player order immediately after the ordering player** wins.

No randomness and no user choice.

The factual-points prompt must explain that the value determines Barrel-entry priority and does not change successful-order scoring.

## 10. Candidate calculation
Candidate detection uses normal deterministic raw post-round score:
```text
pre-round score + round delta = raw post-round score
```
Raw >=880 → candidate.

Only selected entrant is clamped to 880 and enters Barrel.

Non-selected candidates preserve their normal deterministic score unless another explicit rule applies. Document exact behavior in the report.

## 11. Ski and Repaint
Preserve Ski.

For bite_ski on Barrel:
- subtract final order;
- apply Ski independently;
- exit Barrel;
- register one failed Barrel;
- third-failure reset, if applicable, is final override.

Preserve Repaint as whole-round resolution. Repaint is not a successful Barrel order. A completed Repaint round consumes an active holder attempt unless displacement supersedes that transition. Repaint score changes may create new candidates.

Never double-count failure transitions.

## 12. Deterministic recalculation
Integrate Barrel into the chronological recalculation engine. Do not bolt state onto current totals afterward.

Recalculation must reproduce:
- normal score/Ski/Repaint;
- candidate detection;
- candidate tie-break;
- entry and 880 clamp;
- sole holder;
- attempts;
- win;
- failed own-order exit;
- attempt exhaustion;
- displacement;
- failedBarrels cycle;
- 760 exits;
- third-failure reset;
- completed/winner state.

Historical Edit Mode changes must rebuild later Barrel history.

If recalculation needs missing ordering factual points for candidate comparison, never guess. Return a controlled “factual points required” state, collect/store the primary value, then recalculate.

## 13. Partial rounds
Do not prematurely:
- consume attempts;
- declare winner;
- register failed Barrel;
- finalize candidate selection.

Transitions occur only when sufficient round data is resolved. Reload/Continue must preserve safe partial state.

## 14. Minimal UI
Provide only enough Barrel UI for testing:
- indicate which player is on `Бочка`;
- show attempt `1/3`, `2/3`, `3/3`.

Richer Barrel UI, failed-cycle presentation and final-result presentation are CS-0018.

Do not redesign the table.

## 15. Edit Mode
Preserve CS-0016/CS-0016A.

Barrel fields are derived and NOT directly editable:
- onBarrel;
- barrelAttempts;
- failedBarrels;
- winner;
- clamp result.

Users edit primary round inputs/events; Apply recalculates Barrel history.

## 16. Replay
Preserve `Переграти раунд`.

Replay of latest/current round must safely revert Barrel transitions caused by that round, including entry, displacement, attempt increment, failed-Barrel registration, or winner/completed state.

Same round identity and dealer; no duplicate round.

## 17. Persistence/PWA
Reload/Continue/offline PWA must preserve/reconstruct holder, attempts, failure cycle and completed/winner state.

Increment established service-worker cache version because runtime assets change. Never cache `Task/`.

## 18. Pokerochok and Settings
Do not change Pokerochok.

Do NOT implement yet:
- shared Game Settings window/icon;
- Pokerochok first-player selection;
- moving Mariage Edit Mode entry into settings.

Those are separate later UI work.

## 19. Required tests
Test at minimum:

### Entry
- 850 + successful 180 → selected entrant at 880.

### Minimum order
- Barrel holder cannot order below 120;
- 120 allowed;
- higher bid allowed within existing maximum.

### Win
- order 120 + taken → win;
- order 155 + taken → win.

### Failed order
- 880/order120/bite → 760 before cycle override;
- 880/order155/bite → 725 before cycle override;
- bite_ski applies Ski once and exits.

### Attempts
- non-ordering completed attempt 1 → 1/3 remains;
- attempt 2 → 2/3 remains;
- third non-winning attempt → exit/failure/760 unless third-failure reset.

### Failure cycle
- failure 1 → counter 1;
- failure 2 → counter 2;
- failure 3 → score 0, counter reset;
- later re-entry possible.

### Displacement
- new entrant displaces old holder;
- old holder gets exactly one failure;
- normally 760;
- third failure → 0/reset;
- never two holders.

### Candidate priority
- higher factual wins;
- equal factual → higher pre-round score;
- still equal → ordering player if uniquely applicable;
- still equal → first tied candidate after ordering player;
- missing ordering factual value is requested, never guessed;
- factual value never changes successful-order score.

### Repaint/Ski
- Repaint may create candidates;
- Repaint consumes holder attempt when appropriate;
- Ski cycles remain correct;
- no duplicate failure.

### Editing
- edit old Barrel-entry round and rebuild later history;
- remove historical entry via edit;
- edit factual candidate value and deterministically change selection;
- derived Barrel fields not editable.

### Replay
- replay entry;
- replay displacement;
- replay failure;
- replay winning round.

### Persistence
- reload active 1/3, 2/3, 3/3;
- Continue preserves failure cycle;
- winner state survives reload;
- offline reload works.

### Regression
- normal Mariage unchanged;
- Взято/Байт/Байт+Лижа unchanged;
- Repaint/Ski/Edit Mode/dealer unchanged;
- Pokerochok smoke test.

Run syntax checks for every JS file including service worker.

## 20. Acceptance criteria
Complete when:
1. explicit derived Barrel state exists;
2. entry threshold 880 and selected entrant fixed at 880;
3. only one holder;
4. minimum Barrel order 120;
5. final bid/order must be fulfilled;
6. taken by ordering holder wins;
7. bite/bite_ski exits immediately;
8. failed own order subtracts actual final order;
9. Ski applies exactly once;
10. max three non-winning attempts;
11. exhaustion/displacement normally produces 760;
12. every non-winning exit counts exactly one failed Barrel;
13. third failed Barrel → 0/reset;
14. unlimited future cycles possible;
15. exact four-level candidate priority implemented;
16. missing ordering factual points requested, never invented;
17. factual points do not alter normal score;
18. Barrel reconstructed chronologically;
19. historical edits rebuild Barrel history;
20. partial rounds do not transition prematurely;
21. Replay safely reverts latest Barrel transitions;
22. Continue/PWA preserve state;
23. stable winner/completed state exists;
24. Pokerochok unchanged;
25. Game Settings work not introduced;
26. PWA cache version updated;
27. tests and syntax checks pass.

## Deliverables
Lifecycle:
`Task/Inbox/CS-0017-Mariage-Barrel-Engine.md`
→ `Task/In_Progress/CS-0017-Mariage-Barrel-Engine.md`
→ `Task/Completed/CS-0017-Mariage-Barrel-Engine.md`

Report:
`Task/Reports/CS-0017-Mariage-Barrel-Engine-Report.md`

English report must document state model, entry/clamp, bidding minimum, win, failed order, attempts, failure cycles, displacement, candidate algorithm, factual-points integration, Ski/Repaint, recalculation, partial rounds, Edit Mode, Replay, persistence, PWA cache change, tests, Pokerochok regression and known limitations/deferred CS-0018 items.

Do NOT create a ZIP archive. The user will manually provide the archive.
