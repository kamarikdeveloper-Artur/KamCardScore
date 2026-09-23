# CS-0013 — CardScore Gameplay UI Cleanup and Fixed Order Status Bar

## Baseline
Use `CardScore_04(1)` after completed CS-0012 as the authoritative baseline.

This is a focused UI/UX task. Preserve all existing Pokerochok and Mariage gameplay/scoring/state logic unless explicitly changed below.

The project is still in active testing. Do not spend scope on backward compatibility with obsolete test saves.

Do NOT add Git, GitHub, deployment, Builds, or automatic ZIP generation.

## Objective
Implement exactly these changes:
1. Remove only the visible Phase/`Фаза` block from each game's `status-strip`.
2. Use existing `assets/backgrounds/bg_games.png` as the `.game-panel` background.
3. Limit new player names to maximum 10 characters.
4. Move Pokerochok `roundOrderStatus` into a fixed bottom status bar that remains visible while scrolling.

Do not redesign unrelated UI.

---

## 1. Mariage — remove only Phase UI

Inside:
```html
<section class="status-strip" aria-live="polite">
```

remove ONLY:
```html
<div>
    <span class="status-label">Фаза</span>
    <strong id="mariagePhaseLabel">Готово</strong>
</div>
```

Remove DOM references, assignments, helper code, and CSS only when they exist exclusively to render/update this deleted block.

CRITICAL:
- Do NOT remove/refactor Mariage internal phase/state logic.
- Do NOT remove `status-strip`.
- Do NOT remove other `status-strip` children.
- Do NOT alter table statuses (`--`, `✅`, `Б`, `L1/L2/L3`, `L`, `Р1/Р2/Р3`, `Р`, `🚫`).

---

## 2. Pokerochok — remove only Phase UI

Inside:
```html
<section class="status-strip" aria-live="polite">
```

remove ONLY:
```html
<div>
    <span class="status-label">Фаза</span>
    <strong id="currentPhaseLabel">Заказ</strong>
</div>
```

Remove DOM references, assignments, helper code, and CSS only when they exist exclusively to render/update this deleted block.

CRITICAL:
- Do NOT remove/refactor Pokerochok internal phase/state logic.
- Preserve ORDER/ACTUAL transitions and all gameplay state.
- Do NOT remove `status-strip`.
- Do NOT remove other `status-strip` children.
- Do not globally delete `.status-label` unless verified unused after these changes.

---

## 3. `.game-panel` background

The image already exists:
```text
assets/backgrounds/bg_games.png
```

Use it as the background image for `.game-panel`.

Required behavior:
```text
background-position: center
background-size: cover
background-repeat: no-repeat
```

Determine the correct relative URL from the actual CSS file.

Preserve existing `.game-panel` layout, dimensions, border/radius, shadow, spacing, responsive behavior, and unrelated styles. Do not rename/move the image or create another background.

Verify controls/table remain readable. Make only minimal readability adjustments if actually necessary; no unrelated redesign.

---

## 4. Player name maximum

For current new-game/setup player-name input used by both games:
```text
maximum = 10 characters
```

Use `maxlength="10"` where appropriate and also enforce the limit in JavaScript.

Do not allow a newly entered name longer than 10 characters to be committed.

Preserve existing rules for empty names, whitespace, defaults, duplicates, etc.; do not invent new validation behavior.

Do not add legacy migration logic for old test saves.

---

## 5. Pokerochok — move `roundOrderStatus`

Locate:
```html
<div class="round-order-status" id="roundOrderStatus">
```

Move the existing status presentation from its current in-page position into a dedicated bottom status-bar container.

There must remain exactly ONE authoritative element with:
```text
id="roundOrderStatus"
```

Conceptually:
```html
<div class="round-order-status-bar">
    <div class="round-order-status" id="roundOrderStatus"></div>
</div>
```

Wrapper naming may follow existing conventions, but do not duplicate `roundOrderStatus`.

---

## 6. Fixed bottom behavior

The new Pokerochok status bar must:
- use fixed positioning at the bottom of the viewport;
- remain visible during vertical page/table scrolling;
- remain independent of horizontal table scrolling;
- render above normal content with appropriate `z-index`;
- work on phone, tablet, and desktop;
- behave as a compact independent information row;
- not depend on table scroll position.

Use responsive CSS. Respect mobile safe-area bottom inset if appropriate for the existing architecture.

Because the bar overlays the viewport, ensure the bottom of the table/game content can still be reached and seen. Add only the necessary bottom spacing. Avoid a permanent large empty gap and avoid brittle assumptions about bar height where practical.

---

## 7. Preserve `roundOrderStatus` logic

This task changes placement/presentation only.

Preserve existing messages and semantics:
```text
Замовлено: X / N
Недобор
Перебор
```

Preserve existing semantic colors unless minimal adaptation is needed for readability.

Do NOT change:
- total Ordered calculation;
- round maximum;
- last-player restriction;
- ORDER flow;
- ACTUAL flow;
- Pass rules;
- scoring;
- special rounds.

Use the existing game state as the single source of truth.

When no `roundOrderStatus` message is relevant/visible, the fixed wrapper must hide/collapse so it does not leave an empty strip. When relevant again, show it. Do not create a second independent status state.

This fixed bottom bar applies to Pokerochok ONLY. Do not invent an equivalent bar for Mariage.

---

## 8. Required tests

### Phase blocks
Verify the specified Mariage Phase block is gone while its `status-strip` and unrelated children remain.
Verify the specified Pokerochok Phase block is gone while its `status-strip` and unrelated children remain.
Verify internal phase/state transitions still work in both games.

### Background
Verify `assets/backgrounds/bg_games.png` loads successfully for `.game-panel`, uses center/cover/no-repeat, and remains readable/responsive.

### Player names
Verify names up to 10 characters can follow existing setup rules.
Verify an 11+ character new name cannot be committed.
Verify the limit applies to both games' shared/current setup.
No special legacy-name tests are required.

### Fixed Pokerochok status bar
Verify:
- `roundOrderStatus` exists only once;
- existing status text/logic is unchanged;
- it remains visible while vertically scrolling;
- horizontal table scrolling does not move it away;
- `Недобор`/`Перебор` remain visually distinguishable;
- incomplete Order status remains correct;
- bottom table rows remain accessible;
- empty/irrelevant bar collapses;
- phone/tablet/desktop behavior is correct.

### Gameplay regressions
Pokerochok: ORDER, last-player restriction, Pass, ACTUAL finite pool, scoring, completed locking, special rounds, actions, save/reload.

Mariage: Order, arbitrary result entry, success, Bite, Ski, Bite+Ski, Repaint, persistence, 3-player max 500, 4-player max 420.

Run syntax checks on every JavaScript file.

---

## Acceptance Criteria
1. Only the specified Mariage Phase block is removed.
2. Only the specified Pokerochok Phase block is removed.
3. Both `status-strip` containers and unrelated children remain.
4. Internal phase/state logic remains intact.
5. Dead presentation code exclusively tied to removed Phase labels is safely cleaned.
6. `bg_games.png` is the `.game-panel` background.
7. Existing `.game-panel` structure/styling is preserved aside from necessary integration.
8. New player names are limited to 10 characters in HTML and JS.
9. No unnecessary legacy-save compatibility work is added.
10. Pokerochok `roundOrderStatus` is in a dedicated fixed bottom bar.
11. Exactly one `roundOrderStatus` exists.
12. The bar remains visible during scrolling and independent of table horizontal scroll.
13. Existing `Замовлено` / `Недобор` / `Перебор` logic is unchanged.
14. The bar collapses when irrelevant/empty.
15. The fixed bar does not obstruct access to bottom content.
16. Mariage does not receive an invented fixed order-status bar.
17. Both games pass regression checks.
18. All JavaScript syntax checks pass.

---

## Scope restrictions
Do NOT redesign/remove `status-strip`, remove internal phase logic, alter scoring/order mathematics, add a Mariage fixed order-status bar, add legacy migration for obsolete test saves, add Git/GitHub/deployment/Builds, create automatic ZIPs, or implement unrelated features.

## Deliverables

Task lifecycle:
```text
Task/Inbox/CS-0013-Gameplay-UI-Cleanup-and-Fixed-Order-Status-Bar.md
→ Task/In_Progress/CS-0013-Gameplay-UI-Cleanup-and-Fixed-Order-Status-Bar.md
→ Task/Completed/CS-0013-Gameplay-UI-Cleanup-and-Fixed-Order-Status-Bar.md
```

Create:
```text
Task/Reports/CS-0013-Gameplay-UI-Cleanup-and-Fixed-Order-Status-Bar-Report.md
```

The English report must document:
- implementation summary;
- files modified;
- exact Phase UI removal in both games;
- confirmation internal phase/state logic was preserved;
- safe CSS/dead-code cleanup;
- `bg_games.png` integration;
- 10-character player-name validation;
- fixed Pokerochok `roundOrderStatus` implementation;
- bottom-content obstruction handling;
- hide/show behavior;
- Pokerochok and Mariage regression results;
- JavaScript syntax-check results.

Do NOT create a ZIP archive. The user will manually create and provide the project archive after Codex completes the task.
