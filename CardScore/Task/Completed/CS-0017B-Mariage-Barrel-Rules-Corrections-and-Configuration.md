# CS-0017B — Mariage Barrel Rules Corrections, Configuration and Rules Specification

## Authoritative baseline
Use `CardScore_11(1)` after completed CS-0017 as the authoritative baseline.

## Goal
Correct and harden Mariage rules before CS-0018 UI work.

This task must:
1. correct the 3-player maximum round points to 420;
2. centralize editable/default Mariage rule values in a dedicated configuration file;
3. replace the current “single selected Barrel candidate” model with deterministic sequential Barrel entries;
4. give an already-on-Barrel player's successful order priority over new Barrel entries from the same round;
5. make final round outcome independent of the order in which player results are entered in the UI;
6. create an authoritative human-readable Mariage rules document.

Do not implement the planned Game Settings redesign yet.

---

# 1. Correct maximum round points

The current baseline contains:

```js
const MAXIMUM_POINTS_BY_PLAYER_COUNT = Object.freeze({ 3: 500, 4: 420 });
```

This is incorrect.

Authoritative rule:

```text
3 players → maximum factual/round points = 420
4 players → maximum factual/round points = 420
```

Update every semantically relevant validation and workflow:
- non-ordering `Taken`;
- ordering `orderingActualPoints`;
- Edit Mode validation;
- recalculation validation;
- factual-points prompt;
- tests.

Do not globally replace every literal `500`; change only rule-related values.

---

# 2. Dedicated Mariage rules configuration

Create a dedicated file, preferably:

```text
js/games/mariage-config.js
```

The exact module exposure may follow the current vanilla-JS architecture, but it must be loaded before `mariage.js`.

Move developer-editable/default rule values out of scattered logic and into this file.

At minimum centralize semantic values equivalent to:
- supported player counts;
- minimum order;
- maximum order / maximum round factual points per player count;
- order step;
- Ski mode penalties and cycle length;
- Repaint penalties/awards and cycle length;
- Barrel entry score;
- Barrel minimum order;
- Barrel maximum attempts;
- ordinary Barrel displacement/exhaustion score;
- number of failed Barrels before reset;
- failed-Barrel reset score.

Example only:

```js
const MARIAGE_CONFIG = Object.freeze({
  players: {
    3: {
      minOrder: 100,
      maxOrder: 420,
      maxRoundPoints: 420
    },
    4: {
      minOrder: 100,
      maxOrder: 420,
      maxRoundPoints: 420
    }
  },

  orderStep: 5,

  ski: {
    immediatePenalty: 50,
    cyclePenalty: 100,
    cycleLength: 3
  },

  repaint: {
    immediatePenalty: 60,
    cyclePenalty: 120,
    otherPlayerPoints: 60,
    cycleLength: 3
  },

  barrel: {
    entryScore: 880,
    minimumOrder: 120,
    maxAttempts: 3,
    ordinaryExitScore: 760,
    failuresBeforeReset: 3,
    resetScore: 0
  }
});
```

This is a structural example, not permission to overwrite existing rules incorrectly. Inspect current implementation and move the actual authoritative numeric rule constants.

Requirements:
- no duplicated semantic magic numbers where the config should be authoritative;
- do not move unrelated UI numbers, timeouts, CSS values, DOM details, etc.;
- do not perform blind/global numeric replacement;
- existing game saves must continue to load during current development where practical, but do not add broad legacy migration.

---

# 3. New Barrel concept: all qualifying players enter sequentially

CS-0017 currently selects one candidate through `selectBarrelCandidate()`.

That model is no longer authoritative.

New rule:

> Every player whose resolved raw post-round score reaches/exceeds 880 qualifies to enter Barrel. If multiple players qualify in the same round, determine a deterministic Barrel entry order and process every qualifying player sequentially.

Crossing 880 determines **entry**, not exclusive ownership.

For every entrant:
- entrant score is clamped to exactly 880 when they enter;
- entrant becomes `onBarrel = true`;
- if another player is currently on Barrel, the new entrant displaces that holder;
- displaced holder receives exactly one failed Barrel;
- displacement normally produces 760, unless third-failure reset produces 0.

After all entrants are processed, the **last entrant in the deterministic entry sequence** remains on Barrel.

Example:

```text
Entry order: P1 → P2 → P3

P1 enters at 880.
P2 enters, displaces P1.
P3 enters, displaces P2.

Final:
P1 → 760 + failed Barrel
P2 → 760 + failed Barrel
P3 → 880, on Barrel
```

Do not leave a qualifying non-selected player above 880 merely because another candidate entered first.

---

# 4. Deterministic Barrel entry order

Reuse the comparison criteria introduced in CS-0017, but reinterpret them as **ordering criteria for all entrants**, not as a winner-selection algorithm.

The deterministic entry sequence must be built from all qualifying players using:

1. factual points taken in the resolved round;
2. pre-round score;
3. ordering-player priority where required to break equality;
4. cyclic player order after the ordering player for any remaining equality.

The implementation must explicitly define sort direction and make it consistent with the sequential-entry rule.

Important invariant:

> The engine must produce one deterministic `barrelEntryOrder` (or equivalent) containing every qualifying entrant exactly once.

The final holder is the final processed entrant.

Do not use randomness or user choice.

If ordering-player factual points are required to establish the deterministic order and `orderingActualPoints` is missing:
- enter the controlled factual-points collection phase;
- do not guess from `orderPoints`;
- after the value is supplied, resolve the complete round deterministically.

Refactor names such as `selectBarrelCandidate()` if necessary so the code reflects the new semantics rather than preserving misleading “single winner” terminology.

---

# 5. Existing Barrel holder has win priority

This rule resolves an important same-round collision.

Scenario:

```text
Start of round:
P1 = 880 and already on Barrel
P2 = 850

Round:
P1 is ordering player, final order >= 120, result = taken
P2 gains enough factual/scoring points to reach/exceed 880
```

Authoritative result:

```text
P1 wins the game.
GAME OVER.
P2 does not enter Barrel after that win.
```

Rule:

> If the player who was already on Barrel at the START of the round is the ordering player and fulfills their final order (`orderingResult === "taken"`), this successful Barrel completion has priority over all new Barrel entries generated by the same round.

Processing order must therefore begin from a pre-round snapshot:

1. identify Barrel holder at round start;
2. resolve primary round results;
3. if the start-of-round holder was ordering player and fulfilled the final order:
   - mark winner;
   - mark game completed;
   - stop Barrel-entry processing for that round;
4. otherwise continue normal failed-holder/attempt/new-entry logic.

A player who was NOT on Barrel at the start of the round cannot enter Barrel and win from that same round. Entry makes them eligible for Barrel play in subsequent rounds.

If the start-of-round holder is not ordering player, merely taking 120+ factual points does NOT win the game.

---

# 6. Result-entry order must not affect game logic

Do NOT force the user to enter Taken/results in player order.

Keep the current UX where unresolved players may be resolved in any order.

However:

> UI entry order must never affect scoring, Barrel transitions, Barrel entry order, failed-Barrel state, attempt state, or winner determination.

Use a two-stage model:

### Stage A — collect primary facts
Entering a player's result stores only authoritative primary round data:
- numeric Taken for non-ordering player;
- ordering semantic result;
- ordering factual points when required;
- Repaint/Ski-relevant primary events.

Do not finalize cross-player Barrel decisions from whichever player happened to be entered first.

### Stage B — finalize resolved round
When all required primary data for the round exists:
- use the pre-round snapshot;
- calculate all player outcomes;
- evaluate start-of-round Barrel-holder win priority;
- detect every new Barrel entrant;
- construct deterministic Barrel entry order;
- process sequential entries/displacements;
- commit final derived state.

The final state must be permutation-invariant.

Required invariant test:

For identical primary results, all of these input sequences must produce identical final game state:

```text
P1 → P2 → P3
P3 → P1 → P2
P2 → P3 → P1
```

For four players, test multiple permutations as well.

Compare at least:
- scores;
- Ski/Repaint counters;
- `onBarrel`;
- `barrelAttempts`;
- `failedBarrels`;
- Barrel entry sequence;
- winner/completed state.

If input order changes final state, treat it as an engine defect.

---

# 7. Interaction with existing Barrel failures

Preserve CS-0017 rules unless explicitly changed here.

### Failed own order
Start-of-round Barrel holder who orders and gets:
- `bite`;
- `bite_ski`

leaves Barrel immediately.

Base score:
```text
880 - finalOrder
```

`bite_ski` also applies Ski exactly once.

Register exactly one failed Barrel.

Third failed Barrel overrides final score to 0 and resets failure cycle.

### Attempts
A completed non-winning round on Barrel consumes an attempt according to existing CS-0017 rules.

Do not count both:
- attempt exhaustion; and
- displacement

as two failed Barrels in the same transition.

### Displacement
Every later sequential entrant may displace the current holder.

A player who entered earlier in the SAME round can therefore be displaced later in that same round and receives a failed Barrel.

This is intentional.

---

# 8. Recalculation architecture

Integrate these changes into `recalculateMariageGame()`.

The recalculation engine, not UI click order, is authoritative.

Historical recalculation must reproduce:
- raw round scores;
- factual points;
- start-of-round Barrel holder;
- holder win priority;
- all qualifying entrants;
- deterministic entry order;
- sequential displacement;
- failed-Barrel cycles;
- attempts;
- winner/completion.

Edit Mode changes to old rounds must rebuild later Barrel history under these new rules.

Do not add incremental score patches that bypass chronological recalculation.

---

# 9. Replay

Preserve `Переграти раунд`.

Replay must restore the pre-round state even if the round contained:
- successful Barrel win;
- multiple simultaneous entrants;
- one or more same-round displacements;
- failed Barrel increments;
- third-failure reset.

Replaying and then re-entering identical primary facts in a different UI order must still produce the same final state.

---

# 10. Human-readable authoritative rules document

Create:

```text
docs/MARIAGE_RULES.md
```

This document becomes the project-level authoritative rules specification for Mariage.

Write it in Ukrainian because it describes the actual game rules for the project/user.

It must explain, in clear human language:

## General
- supported player counts;
- round/order limits;
- ordering player;
- Taken/result recording;
- scoring fundamentals.

## Ski
- three-cycle mode;
- immediate mode;
- Bite + Ski interaction.

## Repaint
- three-cycle mode;
- immediate mode;
- points for other players.

## Barrel
- threshold 880;
- clamp to 880;
- only one current holder;
- minimum Barrel order 120;
- normal bidding may raise final order;
- final order must be fulfilled;
- maximum three attempts;
- successful order while already on Barrel = win;
- failed own order;
- displacement;
- failed-Barrel counter;
- third failed Barrel → score 0/reset;
- unlimited future Barrel cycles.

## Multiple players reaching Barrel
Document the new sequential-entry model:
- all qualifying players enter;
- deterministic entry order;
- each next entrant displaces current holder;
- final entrant remains;
- earlier same-round entrant may immediately receive a failed Barrel.

## Same-round win priority
Document:
- player already on Barrel at start of round;
- if they are ordering player and fulfill final order, game ends immediately;
- new entrants from that round are not processed after the win.

## Input-order independence
Document:
- users may enter player results in any order;
- this UI order has no gameplay meaning;
- the engine resolves the completed round deterministically from the full primary data.

Keep implementation details out where possible. This file describes game rules, not JavaScript internals.

---

# 11. Tests

Extend/add regression tests.

Required cases:

## Max points
1. 3-player max factual round points = 420.
2. 421 rejected.
3. 4-player max remains 420.
4. orderingActualPoints follows same max.

## Config
5. rule values used by runtime come from central config.
6. no old semantic 3-player 500 rule remains.

## Sequential entry
7. two players qualify → both enter sequentially.
8. first entrant is displaced by second and receives one failed Barrel.
9. last entrant remains at 880.
10. three simultaneous entrants → first two displaced, third remains.
11. each displaced entrant receives exactly one failed Barrel.
12. third-failure reset works during same-round sequential displacement.

## Existing holder
13. existing holder + one new entrant → new entrant displaces holder if holder did not win.
14. existing holder fulfills 120 → win, no new entries processed.
15. existing holder fulfills 155 → win, no new entries processed.
16. existing holder not ordering + factual 120+ → no win.
17. existing holder bite → failed Barrel, then new entrants may be processed.
18. existing holder bite_ski → order failure + Ski once, then new entrants may be processed.

## Deterministic ordering
19. factual points criterion.
20. pre-round score tie-break.
21. ordering-player tie-break.
22. cyclic-order final tie-break.
23. every qualifying player appears exactly once in entry order.
24. missing required ordering factual points triggers factual collection rather than guessing.

## Input permutation invariance
25. identical 3-player results entered P1/P2/P3.
26. same results entered P3/P1/P2.
27. same results entered P2/P3/P1.
28. assert identical final derived state.
29. repeat with a Barrel holder and new entrant.
30. repeat with multiple simultaneous entrants.
31. add representative 4-player permutations.

## Edit/Recalculation
32. historical edit changes qualifying entrants and rebuilds sequence.
33. historical edit changes start-of-round holder win path.
34. factual edit may change entry order deterministically.

## Replay
35. replay multiple-entry round.
36. replay winning round.
37. replay then re-enter same facts in different order → same result.

## Regression
38. normal Mariage scoring.
39. Ski.
40. Repaint.
41. semantic ordering results.
42. dealer.
43. Edit Mode.
44. Continue/reload.
45. PWA offline behavior.
46. Pokerochok smoke test.

Run JavaScript syntax checks for every JS file including new config and service worker.

---

# 12. PWA

If runtime assets/file list changes:
- update service-worker runtime asset list as required;
- bump the established `cardscore-*` cache version;
- include `js/games/mariage-config.js` if needed for offline startup;
- never cache `Task/`.

---

# 13. Out of scope

Do NOT implement yet:
- shared ⚙️ Game Settings window;
- moving Mariage Edit Mode button into settings;
- Pokerochok first-player selection;
- broad Mariage/Barrel visual redesign;
- unrelated History/Statistics work;
- Git/GitHub;
- deployment;
- automatic ZIP.

These remain later work.

---

# Acceptance criteria

Complete when:
1. 3-player maximum round/factual points is 420 everywhere.
2. Mariage developer-editable rule constants are centralized in `mariage-config.js` or equivalent.
3. Runtime rule logic consumes the central config.
4. all 880+ qualifying players enter Barrel sequentially.
5. deterministic entry order includes every qualifier exactly once.
6. each later entrant displaces the current holder.
7. final entrant remains on Barrel.
8. same-round displaced entrants receive exactly one failed Barrel.
9. a player already on Barrel at round start who fulfills their final order wins before new entries are processed.
10. a newly qualifying player cannot enter and win in the same round.
11. UI result-entry order does not affect final game state.
12. users may still enter unresolved players in arbitrary order.
13. missing factual data is requested only when deterministic Barrel ordering requires it.
14. deterministic recalculation reproduces the complete Barrel sequence.
15. Edit Mode rebuilds later Barrel history.
16. Replay safely reverts multiple-entry and winning rounds.
17. `docs/MARIAGE_RULES.md` exists in Ukrainian and reflects the authoritative rules.
18. PWA remains functional offline.
19. Pokerochok remains unchanged.
20. all regression and syntax tests pass.

---

# Deliverables

Task lifecycle:

`Task/Inbox/CS-0017B-Mariage-Barrel-Rules-Corrections-and-Configuration.md`

→ `Task/In_Progress/CS-0017B-Mariage-Barrel-Rules-Corrections-and-Configuration.md`

→ `Task/Completed/CS-0017B-Mariage-Barrel-Rules-Corrections-and-Configuration.md`

Create English report:

`Task/Reports/CS-0017B-Mariage-Barrel-Rules-Corrections-and-Configuration-Report.md`

Report must document:
- max-points correction;
- config structure and migrated constants;
- removal/refactor of single-candidate semantics;
- deterministic sequential entry algorithm;
- same-round existing-holder win priority;
- input permutation invariance architecture;
- recalculation/Edit/Replay integration;
- rules document creation;
- PWA cache/assets change;
- test results;
- known limitations/deferred CS-0018 work.

Do NOT create a ZIP archive.
