# CS-0017C Mariage Barrel History Icons Completion Report

## Summary

Added Barrel entry history to the existing narrow Mariage result/status cells without changing the CS-0017B scoring or state machine. Every `round.barrel.entryOrder` event now produces a local `assets/icons/icon_barrel.svg` marker in its original table row. Barrel presentation takes priority over the ordinary success/Bite/Ski/Repaint symbol for that cell while the underlying semantic result remains unchanged.

## Active And Historical States

`getBarrelHistoryPresentation()` derives display state from existing deterministic data. A Barrel icon is active only when:

- the player appears in that round's finalized `barrel.entryOrder`;
- that round is the player's latest entry event; and
- authoritative `barrelState[playerId].onBarrel` is true.

Every other entry marker remains in its original row as historical/inactive. This handles same-round sequential displacement, later displacement, failed own orders, attempt exhaustion and repeated entries without creating a second counter or persisted presentation state. A player's older entries become inactive when they leave or re-enter, while their latest entry is active only if they still hold the Barrel.

The inactive marker uses dedicated CSS classes, reduced opacity, grayscale and a high-contrast diagonal strike overlay. The active marker remains full-color with a restrained shadow. Both fit the established 28-pixel result icon dimensions and do not change table columns or scoring layout. Accessible labels and titles distinguish `Бочка` from `Попередня Бочка`.

## Asset And Success Fallback

The existing repository asset `assets/icons/icon_barrel.svg` is used through a relative runtime path suitable for localhost, relative deployment and installed PWA use. It was not duplicated or modified.

The nonexistent `assets/mariage/results/success.svg` reference was removed from the presentation map. Successful results now use the established `✅` fallback directly, so normal play no longer issues repeated requests for that missing file. No fake replacement asset was created.

## Persistence And Recalculation

Icon history is derived from `round.barrel.entryOrder`, chronological round sequence and current `barrelState`. Existing Continue migration and deterministic recalculation regenerate this data from primary round facts. Reload, PWA restart, Edit Table Apply and Replay therefore use the same source as the engine and cannot drift from scoring state.

The Ukrainian `docs/MARIAGE_RULES.md` now explains that each Barrel entry remains visible in its own row, with active and crossed-out historical appearances. No Barrel thresholds, entry ordering, clamp, displacement, failures, attempts, minimum Order, winner priority or other CS-0017B behavior changed.

## Files Changed

- `js/games/mariage.js`: pure Barrel-history presentation derivation, table rendering priority and removal of the missing success asset request.
- `css/style.css`: active/inactive Barrel icon classes and inactive strike overlay.
- `service-worker.js`: `cardscore-v7` and the existing Barrel SVG in the application shell.
- `docs/MARIAGE_RULES.md`: minimal table-history documentation.
- `tests/cs-0017c.test.js`: engine/presentation history regression coverage.
- `tests/cs-0017c-browser-qa.js`: repeatable localhost visual/reload QA through CDP.
- Earlier regression and PWA tests: expected cache version updated to `cardscore-v7`.

## Automated Verification

The following passed:

- `node tests/cs-0017c.test.js`;
- `node tests/cs-0017b.test.js`;
- `node tests/cs-0017.test.js`;
- `node tests/cs-0016a.test.js`;
- `node --check` for every JavaScript file, including the service worker and browser QA scripts.

CS-0017C tests cover a single active entrant; the required three-player 820-to-950 scenario with entry order `[P2, P1, P3]`; crossed-out P2/P1 and active P3; later displacement; two separate P1 entry rows; authoritative current ownership; JSON persistence; identical history after deterministic recalculation; unchanged scores/Barrel state; preserved semantic results; local asset existence; CSS state classes; success fallback; PWA asset registration; and Poker smoke behavior.

## Manual Browser And PWA QA

Headless Edge loaded the application through localhost, inserted a five-round derived Mariage history, opened it through the normal Menu and Continue workflow, and inspected the rendered table. The table showed one active icon and two crossed-out historical icons in their correct rows. The top Barrel indicator agreed with P1 ownership. Reload and Continue preserved all three markers. Resource timing reported one local Barrel SVG request and zero `success.svg` requests.

The service-worker test confirmed a controlling `cardscore-v7`, all 18 intended shell URLs including `icon_barrel.svg`, no `Task/` URL, and successful offline reload with the hub, Mariage and Poker modules available. No manifest or CORS errors occurred on localhost.

## Deferred Scope

Game Settings, rule profiles, exact-555 behavior, configurable Repaint distribution, four-player dealer-sits-out rules, two-player Mariage, Poker changes, broad table redesign and new Barrel rules remain out of scope.
