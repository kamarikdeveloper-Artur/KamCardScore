# CS-0009 CardScore Game Hub Completion Report

## Summary

Added the CardScore Game Hub and a Pokerochok game menu without changing the Pokerochok rules or scoring engine. CardScore now opens on the hub, exposes Pokerochok as the available game, and shows Mariage as an unavailable future game.

## Files Created

- `Task/Reports/CS-0009-CardScore-Game-Hub-Report.md`

## Files Modified

- `index.html`
- `css/style.css`
- `js/app.js`
- `js/storage.js`

The task file was moved through `Task/In_Progress` to `Task/Completed`.

## Game Hub Architecture

`js/app.js` now owns an explicit application screen state with `GAME_HUB`, `POKEROCHOK_MENU`, `POKEROCHOK_SETUP`, and `POKEROCHOK_GAME`. `showScreen()` changes only the visible application panel. Gameplay state remains in the existing `gameState` and Pokerochok engine.

## Game Registry

A lightweight centralized registry in `js/app.js` defines stable `pokerochok` and `mariage` IDs, display names, and availability. The hub is rendered from this registry rather than branching on visible Ukrainian labels.

## Pokerochok Menu

The menu provides New Game, Continue, History, Statistics, and Back. Continue is disabled when no compatible current game exists. History and Statistics use native disabled controls with a clear `Незабаром` label. Back returns to the hub without changing current-game or History data. The active game table also has a non-destructive Menu control.

## New Game Protection

Starting a new game while an unfinished current game exists requires confirmation. Cancelling keeps the saved game and leaves the user in the Pokerochok menu. Confirming opens the existing setup while retaining the old save until the user actually presses `Грати`; only that action replaces the current-game record. Completed-game New Game behavior continues to archive once and open setup.

## Continue and Legacy Compatibility

Continue loads and normalizes the existing persisted game without changing its ID or `startedAt`. Current records without `gameType` are accepted as unambiguous legacy Pokerochok saves and receive `gameType: "pokerochok"` during normal loading. Player names, scores, round data, configuration, and progress remain intact.

## gameType and History

New current games and completed snapshots identify themselves as `pokerochok`. `getHistoryByGameType(gameType)` was added to storage; legacy History records without a type are treated as Pokerochok. The existing History array, key, and snapshot schema remain the source of truth and are not duplicated or renamed.

## Mariage Placeholder

Mariage is rendered from the registry as a disabled `Незабаром` entry. It has no click handler, gameplay rules, module, or persistence schema.

## Regression Results

Headless-browser regression passed for fresh Hub entry, registry rendering, Pokerochok menu, unavailable Continue, existing setup reuse, setup Back, game creation, non-destructive Menu/Back navigation, reload-to-Hub, Continue identity and progress preservation, pre-CS-0009 saves without `gameType`, New Game cancel/confirm behavior, deferred replacement, and History preservation.

Pokerochok engine regression passed for normal, Mines, and Golden scoring; finite ACTUAL values; last-player ORDER restriction; unique chronological round construction for 2, 3, and 4 players in Short and Full modes; storage round-trip; legacy History filtering; and archive idempotency. No Pokerochok rule code was modified.

Final-results regression passed for automatic opening of a completed retained game, four-player tied competition ranking, dismiss and reopen, exactly-once History archiving, and New Game after completion while preserving History.

Desktop (1280x800) and phone (390x844) Hub screenshots were rendered and visually inspected. Controls remained readable, responsive, and non-overlapping.

All JavaScript files passed `node --check`.

## Known Limitations

- Mariage gameplay is intentionally unavailable.
- History browsing is intentionally deferred; existing data is preserved.
- Statistics are intentionally deferred and no aggregates are persisted.
- No Git, deployment, build, service-worker, ZIP, or archive automation was added.
