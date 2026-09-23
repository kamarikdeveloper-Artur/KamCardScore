# CS-0016A Completion Report

## Implementation

Mariage normal rounds now keep the ordering player's authoritative result in `primary.orderingResult`: `taken`, `bite`, or `bite_ski`. The ordering player's ordinary numeric Taken input was replaced with the three explicit Ukrainian result buttons. Merely selecting that player does not resolve a result. Non-ordering players retain numeric Taken and the Ski shortcut, with the established 3-player and 4-player maxima.

`taken` credits exactly the Order, `bite` subtracts exactly the Order, and `bite_ski` subtracts the Order and applies the configured Ski event once. Derived result semantics and symbols remain separate from primary inputs. The optional `primary.orderingActualPoints` holds factual points only; it is validated as an integer from zero through the player-count maximum and, for `taken`, at least the Order. It does not affect ordinary scores. The exported `setOrderingActualPoints` helper provides a domain boundary for a later factual-points prompt; ordinary rounds do not request it. No factual value is invented for a new Bite or Bite+Ski result.

Deterministic recalculation now replays the semantic ordering result and the non-ordering numeric inputs in chronological order. It rebuilds cumulative scores, statuses, Ski and Repaint cycles, and round-start snapshots. Repaint remains a whole-round alternative and clears/ignores stale normal-resolution inputs. Partial rounds remain resolvable in any player order and survive reload/Continue. Replay restores the same round's pre-round scores and counters, clears semantic and factual fields, and does not change dealer rotation.

CS-0016 Edit Mode exposes the ordering semantic result as a select control. An existing factual value appears as a separate, explicitly non-scoring edit value. Resolution conversion requests the semantic result plus non-ordering numeric inputs. Double activation, second confirmation, isolated draft, recalculated preview, transactional Apply, failed-Apply isolation, and Discard remain in place. Old CS-0016 numeric ordering inputs are minimally normalized on read: at least Order to `taken`, positive below Order to `bite`, and zero to `bite_ski`. The semantic result is authoritative afterward; there is no broad migration framework.

## Files

- `js/games/mariage.js`: semantic primary model, scoring, normalization, factual-points helper, recalculation, gameplay and Edit Mode integration.
- `index.html`: ordering result buttons and a separately hidden non-ordering numeric entry.
- `service-worker.js`: CardScore cache version `cardscore-v3` to `cardscore-v4` for changed runtime assets. The existing shell allowlist and obsolete CardScore cache cleanup remain; `Task/` is not cached.
- `tests/cs-0016a.test.js`: focused executable regression suite.

Poker source, its saves, localStorage ownership, PWA manifest/icons, and the other Mariage rules were not changed. No Barrel logic was implemented: no 880 threshold, candidate detection or selection, Barrel entry, attempts, displacement, win condition, or tie-breaks.

## Verification

`node tests/cs-0016a.test.js` passed. It covers explicit-result scoring, factual excess and validation, Bite and Bite+Ski, three-cycle and immediate Ski, non-ordering Taken, 3/4-player bounds, Repaint and historical Repaint-cycle reconstruction, historical semantic corrections, partial rounds, repeated recalculation without double-scoring, Replay, dealer rotation, three old numeric normalization cases, Poker normal/Mines/Golden scoring smoke tests, and the PWA cache/version allowlist. Invalid factual edits are rejected without changing the source game.

All JavaScript files, including the service worker and regression test, passed `node --check`. A local HTTP smoke check returned 200 for the app root, HTML, Mariage module, service worker, manifest, and both launcher icons. The application is available locally at `http://127.0.0.1:8765/`.

## Known Limitations

No browser automation runtime was available in this environment, so the UI and offline reload were checked by code/HTTP inspection rather than an interactive browser run. CS-0017 will decide when factual points are requested and how Barrel candidates are compared; this task intentionally makes neither decision.
