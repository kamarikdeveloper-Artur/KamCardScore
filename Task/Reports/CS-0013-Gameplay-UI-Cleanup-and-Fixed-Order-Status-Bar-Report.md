# CS-0013 Gameplay UI Cleanup and Fixed Order Status Bar Completion Report

## Implementation Summary

Completed the focused gameplay UI cleanup for Poker and Mariage without changing either game's scoring, round, phase, or persistence rules. The visible Phase blocks were removed, the existing game background was integrated, new player names were limited to 10 characters, and Poker's existing Order status was moved into one responsive fixed bottom bar.

## Files Modified

- `index.html`
- `css/style.css`
- `js/app.js`
- `js/games/mariage.js`

Created `Task/Reports/CS-0013-Gameplay-UI-Cleanup-and-Fixed-Order-Status-Bar-Report.md`. The task file was moved through `Task/In_Progress` to `Task/Completed`.

## Phase UI Removal

Removed only the visible `Фаза` child from each game's existing `status-strip`:

- Poker: removed `currentPhaseLabel` and its two display assignments.
- Mariage: removed `mariagePhaseLabel`, its DOM reference, and the phase-label-only mapping and assignments.

Both `status-strip` containers remain. Poker retains Round and Player. Mariage retains Round, Ordering Player, and Order. Internal `currentPhase` and `activeRound.phase` state, transitions, validation, and persistence were not removed or refactored.

## Game Background

Applied the existing `assets/backgrounds/bg_games.png` to `.game-panel` using the correct CSS-relative URL. It uses centered positioning, `cover` sizing, and no repeat. Existing panel dimensions, border, radius, shadow, spacing, and responsive behavior remain intact. Desktop, tablet, and phone screenshots confirmed that controls and tables remain readable.

## Player Name Limit

Both new-game setup renderers now set player-name inputs to `maxlength="10"`. The JavaScript commit paths independently trim and slice submitted names to 10 characters before creating Poker or Mariage state. Existing empty-name/default and whitespace behavior remains unchanged.

## Fixed Poker Order Status

Moved the existing `roundOrderStatus` presentation out of Poker's in-page `status-strip` and into one dedicated `roundOrderStatusBar`. Exactly one element retains `id="roundOrderStatus"`; Mariage has no equivalent bar.

The wrapper uses fixed viewport positioning, safe-area-aware bottom and side offsets, and an elevated z-index. It is independent of the table's horizontal and vertical scrolling. The original `Замовлено`, `НЕДОБОР`, and `ПЕРЕБОР` calculation and rendering paths remain authoritative, including their semantic colors.

The wrapper and its status content collapse together when Order status is irrelevant, including rounds that do not require an Order and completed games. No second status state was introduced.

## Bottom Content Access

The bar's rendered height is measured and exposed as a CSS custom property. Poker's scrollable table receives matching bottom clearance only while the bar is visible. A `ResizeObserver`, window resize handling, and per-render synchronization keep that clearance accurate if wrapping, viewport size, or orientation changes. The spacing is removed when the bar collapses.

## Regression Results

Automated Poker module regressions passed for normal scoring, failed Orders, overtricks, Mines, Golden rounds, last-player restrictions, consecutive Pass restrictions, finite ACTUAL pools, special-round descriptors, and unchanged Order-status calculations.

Automated Mariage module regressions passed for three-player maximum 500, four-player maximum 420, Order divisibility, arbitrary actual values, arbitrary result order, success, Bite plus Ski, three-Ski cycles, immediate Ski, Repaint, and immediate Repaint.

Headless-browser regression passed for:

- Both Phase blocks absent while both status strips and unrelated children remain.
- One Poker `roundOrderStatus`, outside the status strip, and no Mariage fixed bar.
- Successful 1920 by 1080 background asset load and computed center/cover/no-repeat styles.
- HTML and JavaScript enforcement of 10-character names in both games.
- Poker ORDER-to-ACTUAL transition, last-player restriction, finite ACTUAL completion, scoring, and next-round transition.
- Visible and differently colored `НЕДОБОР` and `ПЕРЕБОР` states.
- Fixed-bar collapse on an Order-free round.
- Mariage Order transition, arbitrary result entry, and partial-round reload persistence.
- Desktop 1280 by 800, tablet 768 by 1024, and phone 390 by 844 layouts with no unintended page overflow.
- Fixed position during vertical table/page scrolling and horizontal table scrolling.
- Successful access to the last table row above the fixed bar at maximum scroll.
- Independent Poker and Mariage current-game persistence during the test flows.

All JavaScript files passed `node --check`.

No Git, GitHub, deployment, Builds directory, automatic ZIP generation, or archive was added.
