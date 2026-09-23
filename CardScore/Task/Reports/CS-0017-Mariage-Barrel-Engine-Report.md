# CS-0017 Mariage Barrel Engine Completion Report

## Implementation Summary

Implemented Barrel as deterministic derived Mariage state inside the chronological recalculation engine. Every player has reconstructed `{ onBarrel, barrelAttempts, failedBarrels }` state, while the game has stable `status`, `winnerPlayerId`, and `completedAt` fields. The engine never infers ownership from score alone and enforces a single holder.

After each fully resolved round, non-holder players with raw post-round scores of at least 880 become candidates. The selected entrant is clamped to exactly 880; non-selected candidates retain their normal deterministic score. Selection uses, in order, higher factual round points, higher pre-round score, the uniquely tied ordering player, and cyclic player order immediately after the ordering player. When multiple candidates include the ordering player and `orderingActualPoints` is missing, the round pauses in the controlled `ordering-factual` phase. The UI explains that the integer value determines Barrel-entry priority and does not change successful-order scoring. No value is inferred from the Order.

The Barrel holder's minimum final Order is 120, while the existing player-count maximum and divisibility rules remain. A semantic `taken` by the ordering holder wins at either 120 or a higher final Order. The winner and completion timestamp are persisted once, and ordinary gameplay mutation is blocked after completion; Replay and historical Edit Mode remain available.

An ordering holder's `bite` or `bite_ski` exits immediately. The pre-cycle score is `880 - final orderPoints`; Bite+Ski applies the configured Ski event once before the failure-cycle override. A holder who is not ordering consumes one completed attempt and remains fixed at 880. The third non-winning attempt exits at 760. Displacement also exits at 760. All non-winning exits pass through one transition function, register exactly one failed Barrel, and reset attempts. The third failed Barrel overrides any exit score to zero and resets the failed-Barrel cycle, allowing later re-entry.

Repaint remains a whole-round alternate resolution. It can create candidates, and a current holder consumes an attempt unless candidate displacement supersedes exhaustion. Repaint does not reuse normal actuals or `orderingActualPoints`. Ski and Repaint cycle reconstruction remains chronological and independent of Barrel failure counting.

## Recalculation, Editing, Replay And Persistence

`recalculateMariageGame()` starts with clean score, Ski/Repaint, Barrel, and completion state, then replays primary rounds in sequence. Each completed round rebuilds raw scoring, candidate selection, clamp, attempts, exits, failed cycles, displacement, and winner state. Round-start snapshots now include Barrel and completion state. Derived post-transition scores are written to result rows so table history matches the next round's start state.

CS-0016/CS-0016A Edit Mode still exposes only primary data. Barrel ownership, attempts, failures, clamp, exit reason, and winner state have no edit controls. Editing an old score, semantic ordering result, Order, resolution, or factual candidate value recalculates all later Barrel history in the isolated draft. Apply remains transactional; failed validation leaves authoritative memory and localStorage untouched; Discard remains safe.

Partial rounds do not consume attempts, select candidates, register failures, or declare a winner. A factual-priority pause survives Continue and resumes through the dedicated primary-value boundary. Replay restores the same round's pre-round scores, counters, holder, attempts, failed cycle, and completion state, then recreates the same round identity and dealer position without duplication.

Existing CS-0016A saves without Barrel fields are reconstructed from their primary round history on Continue. Mariage remains on its independent localStorage key. Poker source, behavior, persistence and history were not changed.

## UI And PWA

The existing Mariage status strip now shows the sole Barrel holder and a compact current attempt indicator. It exposes 1/3, 2/3 or 3/3 as appropriate without redesigning the table. The factual-points prompt is shown only when candidate comparison needs the ordering player's value. Completed games show the winner using the intentionally minimal presentation required before CS-0018.

The service-worker cache was incremented from `cardscore-v4` to `cardscore-v5`. The established runtime allowlist, obsolete CardScore cache cleanup, manifest, localStorage authority and offline behavior are preserved. `Task/` remains outside the cache.

## Files Changed

- `js/games/mariage.js`: Barrel state, transitions, priority selection, factual pause, deterministic recalculation, Replay snapshots, validation, gameplay guards and status rendering.
- `index.html`: minimal Barrel status and conditional factual-points entry.
- `service-worker.js`: cache version increment to `cardscore-v5`.
- `tests/cs-0017.test.js`: Barrel regression matrix.
- `tests/cs-0016a.test.js`: updated expected PWA cache version.
- `tests/pwa-cdp-smoke.js`: reusable localhost service-worker/offline CDP smoke test.

## Verification

`node tests/cs-0017.test.js` passed. Coverage includes overshoot entry/clamp; 120 minimum and higher final orders; wins at 120 and 155; failed orders at 120 and 155; Bite+Ski in cycle and immediate modes; attempts 1 through 3; all three failed-Barrel cycle outcomes and re-entry; displacement and its third-failure override; all four candidate-priority levels; missing factual pause/reload/resume; factual edits changing selection without changing the ordering score delta; Repaint entry and holder attempts; historical entry removal; partial-round isolation; winner reconstruction; Replay of entry, displacement, failure and win; sole-holder enforcement; and Poker scoring smoke coverage.

`node tests/cs-0016a.test.js` also passed. Every JavaScript file, including both game modules, service worker and tests, passed `node --check`.

Headless Edge rendered the localhost application successfully. The CDP PWA test confirmed a controlling service worker, only `cardscore-v5`, all 16 intended runtime shell resources, no cached `Task/` URL, and a successful offline reload with the hub plus Mariage and Poker modules available.

## Deferred Scope

CS-0018 rich Barrel/failure/final-result presentation is not implemented. The planned shared Game Settings window, Poker first-player selection, moving Edit Mode into settings, Git/deployment/Builds, cloud sync and ZIP generation were not added.
