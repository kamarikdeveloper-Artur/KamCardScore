# CS-0017B Completion Report

## Summary

Corrected the Mariage 3-player maximum Order and factual/round value from 500 to 420, centralized semantic game-rule values, replaced the single selected Barrel candidate with deterministic sequential entry for every qualifier, and made result collection and round finalization invariant to UI entry order. Added the authoritative Ukrainian rules document at `docs/MARIAGE_RULES.md`.

## Central Rules Configuration

Created `js/games/mariage-config.js`, loaded before `mariage.js`. Its frozen `MARIAGE_CONFIG` structure is now authoritative for:

- supported player counts and modes;
- per-player-count minimum Order, maximum Order and maximum round/factual points;
- Order step;
- Ski immediate penalty, cycle penalty and cycle length;
- Repaint immediate penalty, cycle penalty, other-player award and cycle length;
- Barrel entry score, minimum Order, maximum attempts, ordinary exit score, failed-Barrel cycle length and reset score.

Runtime validation, scoring, cycle completion, Barrel transitions and relevant UI limits consume this configuration. Unrelated timing, DOM and presentation values were not migrated. Compatibility exports retained by `Mariage` are derived from the central configuration rather than independent rule definitions.

For both 3 and 4 players, maximum Order and maximum round/factual points are now 420. Non-ordering Taken, `orderingActualPoints`, the factual prompt, Edit Mode and deterministic recalculation all use that limit; 421 is rejected.

## Sequential Barrel Entry

The old `selectBarrelCandidate()` single-winner model was removed. `buildBarrelEntryOrder()` now returns every qualifying non-holder exactly once. The sequence is sorted from weaker to stronger priority so the strongest candidate enters last and remains the sole holder:

1. lower factual round points first;
2. lower pre-round score first;
3. a tied non-ordering player before the ordering player;
4. reverse cyclic priority for complete ties, making the first tied candidate after the ordering player enter last.

Each entrant is clamped to 880. Every subsequent entrant displaces the current holder through the same single exit path, including an entrant from earlier in the same round. Such a displaced entrant receives exactly one failed Barrel and normally exits at 760; the third failed Barrel overrides the score to zero and resets the failure cycle. The final entrant remains on Barrel. No qualifying non-selected player is left above 880.

If multiple qualifiers include the ordering player and their factual value is required, the round pauses in `ordering-factual`. The value is requested and stored as primary data; Order is never substituted. A sole ordering qualifier does not require an unnecessary comparison value.

## Holder Win Priority

Barrel ownership is read from the round's pre-round snapshot. If that start-of-round holder is the ordering player and has semantic result `taken`, the game is completed immediately with the stable winner and completion timestamp. New qualifiers from that round are not processed. Therefore a newly qualifying player cannot enter and win in the same round.

If the holder does not win, existing rules continue: Bite/Bite+Ski exits immediately using `880 - final Order`, Bite+Ski applies Ski once, a non-ordering holder consumes one attempt, and displacement supersedes exhaustion without double-counting a failure.

## Input-Order Independence

Normal result handling now has two explicit stages. A user action first stores only primary facts: the ordering semantic result or a non-ordering numeric value. The active round's derived scores, result symbols and Ski state are then rebuilt from its `startState` in stable player order. Cross-player Barrel logic runs only after every player's primary result is present.

Completed `results` and `resolvedPlayerIds` are canonicalized to player order. Candidate detection, factual comparison, holder win priority, attempts, sequential entries, exits and winner determination therefore use the complete round data and pre-round state rather than click order. The arbitrary unresolved-player selection UX remains unchanged.

Deterministic recalculation uses the same canonical rebuild and transition functions. Historical Edit Mode changes reconstruct later scores, Ski/Repaint cycles, Barrel sequences, same-round displacements, attempts, failed cycles and winner state. Derived Barrel fields remain non-editable. Replay snapshots continue to restore pre-round Barrel and completion state before recreating the same round and dealer position.

## Rules Document

Created `docs/MARIAGE_RULES.md` in Ukrainian. It documents supported player counts, Order and factual limits, ordinary scoring, Ski modes, Repaint modes and awards, Barrel entry/clamp, minimum Order, attempts, failed orders, displacement, failed-Barrel cycles, sequential multi-player entry, same-round holder-win priority and input-order independence.

## PWA And Files

- Added `js/games/mariage-config.js` to `index.html` before `mariage.js`.
- Added the config to the service-worker application shell.
- Incremented the cache from `cardscore-v5` to `cardscore-v6`.
- Updated the reusable CDP PWA smoke test to accept a configurable debugging port and verify `cardscore-v6`.
- Added `tests/cs-0017b.test.js` and updated earlier regression expectations for the corrected limit, sequential model and cache version.

The cache contains only the 17 intended runtime resources and no `Task/` path. LocalStorage remains authoritative. Poker source and behavior were not changed.

## Verification

The following passed:

- `node tests/cs-0017b.test.js`;
- `node tests/cs-0017.test.js`;
- `node tests/cs-0016a.test.js`;
- `node --check` for every project JavaScript file, including the new config and service worker;
- headless Edge service-worker inspection and offline application-shell reload.

CS-0017B coverage includes 420/421 boundaries for both player counts and ordering factual values; runtime/config linkage; two and three sequential entrants; one failure per same-round displacement; third-failure reset during sequential entry; existing-holder wins at 120 and 155 before new entries; non-ordering holder non-win; Bite and Bite+Ski followed by new entry; all four ordering criteria; complete qualifier inclusion; controlled missing-factual collection; three-player permutations; holder-plus-entrant permutations; multi-entrant four-player permutations; historical entry-sequence changes; historical holder-win removal; factual-order edits; Replay and different-order re-entry; normal scoring, dealer and Poker smoke checks.

The PWA test confirmed a controlling `cardscore-v6`, all 17 shell resources including `mariage-config.js`, no development documentation in cache, and successful offline reload with the hub, Mariage and Poker modules available.

## Deferred Scope

The shared Game Settings window, moving Edit Mode into settings, Poker first-player selection, richer CS-0018 Barrel/final-result presentation, broad legacy migration, Git/deployment/Builds, cloud sync and ZIP generation remain intentionally out of scope.
