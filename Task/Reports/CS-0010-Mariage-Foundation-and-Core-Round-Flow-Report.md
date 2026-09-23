# CS-0010 Mariage Foundation and Core Round Flow Completion Report

## Summary

Implemented Mariage as a functional, open-ended CardScore notebook while preserving the CS-0009 Game Hub and the complete Pokerochok implementation. Mariage has its own menu, setup, rule module, round workflow, semantic event model, responsive table, and independent current-game persistence.

## Files Created

- `js/games/mariage.js`
- `assets/mariage/results/README.md`
- `Task/Reports/CS-0010-Mariage-Foundation-and-Core-Round-Flow-Report.md`

## Files Modified

- `index.html`
- `css/style.css`
- `js/app.js`
- `js/storage.js`

The task file was moved through `Task/In_Progress` to `Task/Completed`.

## Module and Data Model

`js/games/mariage.js` owns Mariage rules, state transitions, scoring, cycle management, presentation mapping, rendering, and persistence calls. Pokerochok rule code was not changed.

Each Mariage game stores a stable ID, `startedAt`, `gameType: "mariage"`, players and cumulative scores, Ski/Repaint settings, per-player cycle state, resolved historical rounds, and an optional active round. Each round has a stable ID and sequence, status, phase, one `orderingPlayerId`, a separate `orderPoints`, Repaint state, sequential result position, and per-player results containing actual points, delta, cumulative score, semantic flags, cycle metadata, and score source where applicable.

## Setup

Setup supports 2, 3, or 4 named players. Ski and Repaint each have independent `three` and `immediate` settings, persisted with the game. Starting a replacement game requires confirmation and does not overwrite the retained game until `Грати` is pressed.

## Core Flow

The open-ended flow is: New Round, manual ordering-player selection, unrestricted numeric order entry, physical play, then either sequential result entry or whole-round Repaint resolution. The ordering player and order are shown in the status area. An unresolved order is displayed temporarily in the ordering player's score field without changing authoritative cumulative score.

Actual results are numeric and non-negative. They resolve and persist one player at a time, so reload restores the exact current player and phase. No automatic ordering rotation, order limits, fixed pool, round limit, target score, winner, or end condition was introduced.

## Scoring and Events

- Successful ordering player: `+order`, even when actual exceeds order; semantic `success`, fallback `✅`.
- Bite: ordering player only, always `-order`; semantic `bite`, fallback `Б`.
- Non-ordering positive actual: adds actual points without Bite or Repaint.
- Three-Ski mode: L1 and L2 have no penalty, L3 applies `-100`, then the player's cycle resets.
- Immediate Ski mode: every L applies `-50`.
- Bite + Ski preserves both semantic flags and combines `-order` with the applicable Ski penalty; fallback `🚫`.
- Three-Repaint mode: Р1/Р2 give the ordering player zero and others `+60`; Р3 gives the ordering player `-120` and others `+60`, then resets that player's cycle.
- Immediate Repaint mode: ordering player `-60`, others `+60`.
- Repaint records no synthetic actual values and does not trigger Bite or Ski.

Ski and Repaint counters are separate per player. Completed three-event cycles are visually de-emphasized without deleting historical entries. Immediate-mode events are not cycle-de-emphasized.

## Presentation and SVG Foundation

Semantic result state is independent from rendered labels. A centralized presentation map provides current fallbacks and optional future asset paths under `assets/mariage/results/`. Rendering attempts an optional SVG and retains the fallback when the file is absent. No artwork or asset filename is stored as game truth.

## Persistence Separation

Pokerochok retains its legacy `cardscore.currentGame` key and existing `saveGame`, `loadGame`, and `clearGame` API behavior. Mariage uses `cardscore.currentGame.mariage` through typed storage helpers. Both unfinished games can coexist and navigation in either game does not clear the other. The shared completed-game History key and existing Pokerochok legacy behavior remain unchanged; unfinished Mariage games are not archived.

## Test Results

Module regression passed for 2/3/4-player creation; both Ski modes; both Repaint modes; successful order (`300 + 120 = 420` with actual 130); Bite; non-ordering positive actual; L1/L2/L3/next-L1; repeated immediate L; Bite plus third Ski (`500 - 120 - 100 = 280`); Р1/Р2/Р3/next-Р1; immediate Р; Repaint beneficiaries; absence of accidental Repaint Bite/Ski; and semantic presentation keys.

Headless-browser regression passed for Hub to Mariage, menu disabled states, all setup player counts, separate current-game keys, temporary order display without score mutation, reload after order, reload midway through sequential results, reload after a resolved round, Repaint resolution, missing-SVG fallbacks, non-destructive Back navigation, retained cycle history, and visual de-emphasis of completed Ski/Repaint cycles.

Pokerochok regression passed for New Game, Continue with stable ID/start/progress, scoring functions, legacy current-game key compatibility, final results, tied winners, Results reopening, and isolation from the simultaneous Mariage save.

Desktop 1280x800 and mobile 390x844 Mariage game views were rendered and visually inspected. Controls and status content did not overlap; the wide score table remains usable through horizontal scrolling on phone.

All JavaScript files passed `node --check`.

## Intentionally Unresolved

The physical rule for earning the order, automatic ordering rotation, order limits or increments, fixed deal-point totals, target score, round count, winner/end-game rules, Mariage History UI, Statistics, and any additional bonuses or penalties remain unspecified and unimplemented.

No Git, GitHub, deployment, Builds directory, PWA, backend, cloud feature, automatic ZIP, or project archive was added.
