# CS-0011 Mariage Gameplay UX Corrections Completion Report

## Implementation Summary

Applied the focused Mariage gameplay and UX corrections on top of CS-0010. Pokerochok rules and UI were not modified. Mariage scoring semantics, Ski/Repaint cycles, independent persistence, and SVG-ready presentation mapping were preserved.

## Files Modified

- `index.html`
- `css/style.css`
- `js/games/mariage.js`

Created `Task/Reports/CS-0011-Mariage-Gameplay-UX-Corrections-Report.md`. The task file was moved through `Task/In_Progress` to `Task/Completed`.

## Merged Headers and Table Layout

Each Mariage player now has one merged header with `colspan="2"` containing only the player's name. A generated `colgroup` assigns approximately 35% of each player pair to the semantic status column and 65% to the cumulative-score column. Positive results for non-ordering players leave the status cell empty. The existing horizontally scrollable responsive table behavior is retained.

## Order Cancel Behavior

Ordering-player selection is now a local draft until the Order is confirmed. The visible `Закрити` action clears the draft selection and input, closes the Order controls, and leaves `orderingPlayerId`, `orderPoints`, scores, and the persisted round phase unchanged. The same active round can reopen `Заказ` and select another player.

Older CS-0010 saves paused in the former `order-points` phase are migrated into the new uncommitted draft flow without losing the active round.

## Temporary Order Rendering

A confirmed unresolved Order remains separate from cumulative score and is rendered only in the ordering player's wide score cell. It uses the muted text and inactive background colors plus italic styling. Once that player's result is resolved, the cell displays the authoritative cumulative score.

## Arbitrary Result Workflow

Result entry now lists every unresolved player and allows selection in any order. Selecting a player opens the applicable controls but does not commit anything. `До списку` returns without resolving or scoring the player.

On confirmation, the module calculates and persists that player's result immediately, records the player in `resolvedPlayerIds`, updates the table, and removes the player from the unresolved list. The round completes automatically only when no unresolved players remain.

Per-player results remain authoritative. The module rejects a second result for an already resolved player, preventing double-scoring. CS-0010 partial rounds using `resultPlayerIndex` are migrated by deriving and persisting `resolvedPlayerIds` from the existing result map.

## Non-Ordering Ski Action

Non-ordering players now receive a one-tap `Лижа` action. It routes through the same result resolver as numeric zero, stores `actualPoints: 0`, applies the configured Ski mode, persists the semantic Ski event, and removes the player from the unresolved list.

The ordering player never receives standalone Ski. Their controls retain `Байт` and `Байт + Лижа`; numeric zero still creates the combined Bite/Ski semantic event.

## Three-Player Order Validation

For exactly three players, the Order control uses `min=100`, `max=420`, and `step=5`. JavaScript independently rejects values below 100, above 420, or not divisible by 5 without committing the ordering player, Order, or phase transition. The validation message explains the range and step.

No minimum, maximum, or step was introduced for two- or four-player Mariage. Their existing finite numeric behavior remains unchanged.

## Regression Results

Automated module tests passed for accepted three-player Orders `100, 105, 200, 415, 420`; rejected Orders `95, 99, 101, 117, 421, 425`; unrestricted two/four-player values; arbitrary player resolution; duplicate-result rejection; successful Order; Bite; Bite plus Ski; three-Ski and immediate-Ski behavior; three-Repaint and immediate-Repaint behavior; and ordering-player standalone-Ski rejection.

Headless-browser tests passed for merged player headers, 35/65 column definitions, muted temporary Order display, wrong-player Order cancellation and reopening, non-committing result-form return, arbitrary `Player 3 → Player 2 → Player 4 → Player 1` entry, removal after confirmation, partial reload showing only unresolved players, persisted migration of a CS-0010 partial round, quick non-ordering Ski, ordering-player control visibility, exact-once scoring, and automatic round completion.

Desktop 1280x800 and mobile 390x844 views were rendered and visually inspected. Merged headers, status/score proportions, unresolved-player controls, and horizontal table scrolling remained readable and non-overlapping.

Pokerochok regression passed for Game Hub navigation, Continue, scoring functions, table availability, and current-game storage isolation from Mariage. Pokerochok code was not changed.

All JavaScript files passed `node --check`.

## Intentionally Unresolved

Order constraints for two-player and four-player Mariage remain unspecified and unimplemented. No new gameplay rules, History UI, Statistics, target score, round limit, winner logic, or final SVG artwork was introduced.

No Git, GitHub, deployment, Builds directory, automatic ZIP generation, or archive was added.
