# CS-0012 Mariage Player Count, Score Limits and Empty Status Completion Report

## Implementation Summary

Updated Mariage new-game player support, centralized per-input point limits, applied the new Order and actual validation rules, and added presentation-only `--` fallbacks to empty narrow status cells. Existing arbitrary result entry, persistence, Bite, Ski, Bite plus Ski, Repaint, semantic presentation, and Pokerochok behavior were preserved.

## Files Modified

- `index.html`
- `js/games/mariage.js`

Created `Task/Reports/CS-0012-Mariage-Player-Count-Score-Limits-and-Empty-Status-Report.md`. The task file was moved through `Task/In_Progress` to `Task/Completed`.

## Player Counts

Mariage setup now exposes only three-player and four-player choices. New game creation validates the same supported set. Pokerochok player-count choices were not changed.

## Centralized Maximum Logic

`MAXIMUM_POINTS_BY_PLAYER_COUNT` and `getMaximumPoints(playerCount)` are the single source of truth:

- Three players: 500
- Four players: 420

The same maximum is used by Order validation, actual-point validation, numeric input attributes, and validation messages.

## Order Validation

All new Orders must be at least 100, no greater than the player-count maximum, and divisible by 5. Three-player Orders therefore accept 100–500; four-player Orders accept 100–420. JavaScript validation runs before the ordering player, Order, or phase is committed. Invalid values remain in the draft form and display a player-count-specific Ukrainian message.

The Order input uses `min=100`, the centralized maximum, and `step=5`.

## Actual Validation

Normal Taken/actual input accepts any finite numeric value from zero through the player-count maximum. It does not require divisibility by 5. Negative or over-maximum values are rejected before scoring, persistence, or unresolved-player removal.

The actual input uses `min=0`, the centralized maximum, and `step=any`. Quick Ski remains actual zero, and ordering-player Bite plus Ski remains unchanged.

## Cumulative Scores

Only individual Order and actual inputs are limited. Cumulative scores are never clamped. Regression coverage confirmed a non-ordering result of 117 raised an existing score of 950 to 1067.

## Empty Status and Score Presentation

Every empty narrow status cell now renders `--`, including unresolved players and non-ordering players with positive normal results. Semantic presentation continues to replace that fallback with success, Bite, Ski, Bite plus Ski, or Repaint output. The fallback is generated only by the renderer and is never stored in game state.

Wide score cells remain empty when no score value exists. They show the muted temporary Order for the unresolved ordering player and the cumulative score after resolution. No empty `--` placeholder was added to score cells.

## Legacy Two-Player Saves

Existing two-player Mariage saves are detected on Continue and opened in a defensive read-only game view. The UI explains that current Mariage rules support only three or four players, hides round-entry controls, and keeps the Menu action available. The stored JSON is not deleted, converted, normalized, or rewritten. The user can safely return to the Mariage menu and may explicitly start a supported new game through the existing replacement confirmation flow.

## Regression Results

Automated module tests passed for:

- Three-player Order acceptance: 100, 105, 420, 495, 500.
- Three-player Order rejection: 95, 99, 101, 117, 501, 505.
- Four-player Order acceptance: 100, 105, 415, 420.
- Four-player Order rejection: 95, 99, 101, 117, 421, 425, 500.
- Three-player actual acceptance: 0, 1, 117, 420, 500; rejection: -1, 501, 600.
- Four-player actual acceptance: 0, 1, 117, 420; rejection: -1, 421, 500.
- Actual 117 without a multiple-of-five restriction and cumulative score 1067.
- Successful Order, Bite plus Ski, three-Ski cycles, immediate Ski, three-Repaint cycles, and immediate Repaint.

Headless-browser regression passed for setup exposing only 3/4 players, input min/max/step attributes, invalid inputs remaining uncommitted, 3-player maximum 500, 4-player maximum 420, actual 117, muted temporary Order, `--` narrow-status fallback, empty wide score cells, arbitrary partial result order, reload with only unresolved players, and unchanged read-only handling of a legacy two-player save.

Pokerochok regression passed for Game Hub navigation, Continue, normal/Mines/Golden scoring functions, and independent current-game persistence. Pokerochok files were not changed.

All JavaScript files passed `node --check`.

No Git, GitHub, deployment, Builds directory, automatic ZIP generation, or archive was added.
