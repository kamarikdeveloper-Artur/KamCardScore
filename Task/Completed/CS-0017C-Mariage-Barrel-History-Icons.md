# CS-0017C — Mariage Barrel History Icons

## Objective
Make Barrel history directly visible in the Mariage score table so the game can be tested without inspecting JSON. Use the existing local `icon_barrel.svg` in the same narrow status/result cell that renders `✅`, `Б`, `Л`, `Р`.

This task is presentation/history work. Do not change established CS-0017B Barrel scoring/state-machine rules.

## 1. Active Barrel entry
When a player enters the Barrel in a resolved round, render `icon_barrel.svg` in that player's narrow status/result cell for that round.

For the player who remains the current Barrel holder after round finalization, render the icon in its normal active appearance.

The authoritative current state remains `barrelState[playerId].onBarrel`. Never infer ownership only from `score === 880`.

## 2. Leaving the Barrel
If a player entered/held the Barrel and subsequently leaves it, keep that Barrel icon in the historical row. Do not replace it with `--`.

Render it as inactive:
- visibly crossed out;
- reduced opacity and/or neutral gray treatment;
- clearly distinguishable from an active Barrel;
- still readable as a previous Barrel entry.

Apply this to existing Barrel exit paths such as displacement, failed own Barrel order, attempt exhaustion, and other already-defined engine exits. Do not add new exit rules.

## 3. Same-round sequential entries
CS-0017B supports multiple players crossing 880 in one round.

Regression scenario:

```text
Start: P1=P2=P3=820
Raw post-round: P1=P2=P3=950
barrel.entryOrder = [P2, P1, P3]

Final:
P1=760, failedBarrels=1
P2=760, failedBarrels=1
P3=880, onBarrel=true
```

That resolved row must show:
- P1: crossed-out Barrel icon
- P2: crossed-out Barrel icon
- P3: active Barrel icon

Do not render only the final holder. Use finalized Barrel transition data (`round.barrel.entryOrder`, `round.barrel.exits`, authoritative derived state) rather than reconstructing from scores.

## 4. Historical visibility
Barrel icons belong to the round where the Barrel event occurred.

Later rounds must not erase or move them. If the same player later enters again, show another icon in that later row. This must let the user visually count separate Barrel entries.

Example:
```text
Round 3: P1 crossed-out Barrel
Round 7: P1 crossed-out Barrel
Round 11: P1 active Barrel
```

Do not replace this history with only a numeric counter.

## 5. Existing status symbols
The narrow cell already presents success/Bite/Ski/Repaint/neutral states. When a Barrel entry event occurred for that player in that round, Barrel history has presentation priority in that cell.

Do not delete/corrupt underlying semantic result data. This is a renderer decision only. Deterministic recalculation must regenerate the same presentation.

## 6. Asset
Locate and use the existing `icon_barrel.svg` at its real repository path. Do not invent an absolute path or unnecessarily duplicate it.

Ensure it works with:
- Live Server / localhost
- GitHub Pages relative deployment
- installed PWA where applicable

Register it in the service-worker cache if the current caching architecture requires explicit assets.

## 7. Styling
Use dedicated semantic CSS classes, e.g.:
```css
.mariage-barrel-icon {}
.mariage-barrel-icon--active {}
.mariage-barrel-icon--inactive {}
```

Requirements:
- fits existing narrow status cell;
- no table dimension redesign;
- active state clearly visible;
- inactive state muted and visibly crossed out.

Prefer a CSS overlay/pseudo-element for strike-through instead of modifying the SVG itself.

## 8. Fix `success.svg` 404
Current testing repeatedly requests `assets/mariage/results/success.svg` and receives 404.

Inspect the existing renderer/assets and fix the mismatch:
- use the intended existing asset if it exists at another valid path/name; or
- use the established `✅` fallback without requesting a nonexistent file.

Do not create a fake placeholder just to silence the console. Normal Mariage play must no longer generate repeated `success.svg` 404 errors.

## 9. Persistence/recalculation
Barrel history presentation must survive:
- reload / Continue;
- PWA restart;
- deterministic recalculation;
- Edit Table → Apply;
- Replay Round where applicable.

Prefer deriving it from existing persisted/derived Barrel transition data. Do not create a second independent Barrel state/counter that can drift from `barrelState` or `round.barrel`.

If persisted round data is insufficient, minimally extend derived round Barrel metadata and regenerate it through the existing deterministic pipeline.

## 10. Regression tests
Add/update tests for:

### A. Single entrant
One player crosses 880 → active Barrel icon; `onBarrel === true`.

### B. Multiple same-round entrants
Use the 820→950 / `[P2,P1,P3]` scenario. P2 and P1 inactive/crossed; P3 active. Final scores/state remain CS-0017B-correct.

### C. Later displacement
Old history remains; displaced holder is historical/inactive; new entrant is active in the new row.

### D. Same player enters multiple times
Separate icons remain in each corresponding row. Previous entries inactive; current entry active if applicable.

### E. Reload/recalculation
Icon history is identical after persistence reload and deterministic recalculation.

### F. No gameplay regression
Do not alter threshold 880, clamp 880, displacement 760, failedBarrels, attempts, third-failure reset, Barrel minimum order, winner logic, or sequential `barrel.entryOrder`.

## 11. Manual QA
Run through Live Server, not `file://`.

Verify:
1. no manifest/CORS errors on localhost;
2. no repeated `success.svg` 404;
3. active Barrel icon appears in the status cell;
4. exited/displaced Barrel icons are crossed out and muted;
5. same-round sequential entries show all Barrel events;
6. old history remains after later rounds;
7. repeated entries by one player remain independently visible;
8. reload preserves presentation;
9. top Barrel indicator agrees with `barrelState`;
10. rendering alone never changes scores/state.

## Out of scope
Do not implement:
- Game Settings modal;
- rule profiles;
- exact-555 rule;
- configurable Repaint distribution;
- 4-player dealer-sits-out rules;
- 2-player Mariage;
- Pokerochok changes;
- broad table redesign;
- new Barrel scoring rules.

## Deliverables
1. Barrel history/status icon rendering.
2. Existing `icon_barrel.svg`.
3. Active and crossed-out/inactive states.
4. Multiple historical Barrel entries preserved.
5. `success.svg` 404 fixed.
6. PWA cache/version updated only if required.
7. Regression tests.
8. Minimal `docs/MARIAGE_RULES.md` update if necessary.
9. Normal English Codex report.

## Acceptance criterion
Looking only at the Mariage table, the user can determine:
- who is currently on the Barrel;
- who previously entered the Barrel;
- in which rounds entries occurred;
- how many separate Barrel entries each player has had;

without DevTools or saved JSON inspection.
