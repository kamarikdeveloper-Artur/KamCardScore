# CS-0012 — Mariage Player Count, Score Limits and Empty Status

## Baseline
Use the current project after completed CS-0011 as the authoritative baseline. Preserve Pokerochok completely and preserve existing Mariage scoring, arbitrary unresolved-player entry, Ski/Bite/Repaint logic, persistence, and SVG-ready presentation unless explicitly changed here.

## Objective
Correct Mariage player counts and point limits and improve empty status-cell presentation.

## 1. Supported players
Mariage supports ONLY:
```text
3 players
4 players
```
Remove 2-player Mariage from new-game setup. Do not alter Pokerochok player-count support.

## 2. Authoritative maximum
Use centralized Mariage maximum logic:
```text
3 players → 500
4 players → 420
```
The same per-round maximum applies to BOTH Order and Taken/actual entry. Avoid scattered hard-coded checks.

## 3. Order
Order rules:
```text
minimum = 100
maximum = player-count maximum
multiple of 5
```

3 players:
```text
100–500, multiple of 5
```

4 players:
```text
100–420, multiple of 5
```

Validate in JavaScript before committing. Invalid input must not commit Order, ordering player, phase, or score and must show a concise validation message. Update numeric controls to make valid values easy to enter.

This supersedes CS-0011's 3-player maximum of 420.

## 4. Taken / actual points
Normal result input must be:
```text
3 players → 0–500
4 players → 0–420
```
This applies to ordering and non-ordering players.

Do NOT require Taken/actual points to be multiples of 5. Only Order has the confirmed multiple-of-5 rule.

Reject negative values and values above the applicable maximum without scoring them.

Quick `Лижа` remains equivalent to actual = 0. Ordering-player `Байт + Лижа` remains unchanged.

## 5. Cumulative score is NOT capped
500/420 limits only a single Order or Taken/actual input. Never clamp cumulative game totals. A cumulative score may exceed 500, 420, 1000, etc.

## 6. Existing scoring
Preserve:
```text
ordering actual >= order → +order, status ✅
ordering actual < order and >0 → −order, status Б
ordering actual = 0 → Bite + Ski, status 🚫
non-ordering actual >0 → +actual
non-ordering actual = 0 → Ski
```
Preserve all existing Ski and Repaint modes/cycles.

## 7. Empty narrow status cells
Mariage has a narrow status column and a wide score column.

When the NARROW status cell has no semantic event/status, display:
```text
--
```

Examples:
```text
non-ordering positive normal result → --
unresolved/no status               → --
```

Semantic statuses replace the fallback:
```text
✅
Б
L1
L2
L3
L
Р1
Р2
Р3
Р
🚫
```

`--` is presentation only. Do NOT store `"--"` as authoritative game state.

## 8. Wide score column
Do NOT add `--` to the wide score column.

It remains:
- empty when there is genuinely no score value to display;
- muted/grey temporary Order while unresolved;
- cumulative score after resolution.

Examples:
```text
status -- | score [empty]
status -- | score 160
status L1 | score 160
status ✅ | score 280
```

## 9. Legacy saves
Older CS-0010/CS-0011 versions allowed 2-player Mariage.

New games must allow only 3/4 players. Do not silently convert or delete a legacy 2-player save. Handle it defensively without crashing, show that current Mariage rules support only 3/4 players if necessary, and allow safe return to the Mariage menu. Document the chosen behavior.

Existing 3-player saves use max 500 for future Order/actual input. Existing 4-player saves use max 420.

## 10. Setup UI
Expose only 3 and 4 players in Mariage setup. Remove/disable the 2-player choice cleanly rather than waiting until Start to reject it.

## 11. Validation messages
Use clear player-count-specific validation, e.g.:
```text
3-player Order: Заказ має бути від 100 до 500 і кратним 5.
4-player Order: Заказ має бути від 100 до 420 і кратним 5.
3-player actual: Бали мають бути від 0 до 500.
4-player actual: Бали мають бути від 0 до 420.
```
Do not silently clamp and commit a different value.

## 12. Regression requirements
Preserve:
- arbitrary unresolved-player selection/order;
- removal of confirmed players from unresolved list;
- partial result persistence/reload;
- quick `Лижа` for non-ordering player;
- `Байт + Лижа` for ordering player;
- Bite;
- both Ski modes;
- both Repaint modes;
- merged player headers;
- narrow/wide column proportions;
- grey temporary Order;
- semantic/SVG-ready presentation;
- independent Pokerochok/Mariage saves.

## 13. Required tests
Test Mariage setup exposes only 3/4 players.

3-player Order — accept:
```text
100, 105, 420, 495, 500
```
reject:
```text
95, 99, 101, 117, 501, 505
```

4-player Order — accept:
```text
100, 105, 415, 420
```
reject:
```text
95, 99, 101, 117, 421, 425, 500
```

3-player actual — accept:
```text
0, 1, 117, 420, 500
```
reject:
```text
-1, 501, 600
```

4-player actual — accept:
```text
0, 1, 117, 420
```
reject:
```text
-1, 421, 500
```

Verify actual 117 is accepted: actual points are NOT required to be divisible by 5.

Verify cumulative totals can exceed 500/420.

Verify empty narrow status shows `--`, semantic statuses replace it, and wide score cells do NOT show empty `--`.

Verify grey temporary Order remains correct.

Regression-test successful Order, Bite, Bite+Ski, Ski cycles, immediate Ski, Repaint cycles, immediate Repaint, arbitrary result order, reload persistence, and Pokerochok.

If practical, test a legacy 2-player Mariage save for safe handling.

Run syntax checks on every JavaScript file.

## Acceptance Criteria
Complete when:
1. new Mariage supports only 3/4 players;
2. 3-player Order is 100–500, multiple of 5;
3. 4-player Order is 100–420, multiple of 5;
4. 3-player actual is 0–500;
5. 4-player actual is 0–420;
6. actual is not incorrectly restricted to multiples of 5;
7. cumulative score is not capped;
8. empty narrow status cells display presentation-only `--`;
9. wide score cells do not receive empty `--`;
10. existing Mariage mechanics/persistence remain correct;
11. legacy 2-player saves are handled defensively;
12. Pokerochok remains unchanged;
13. all required tests and JS syntax checks pass.

## Scope restrictions
Do NOT add Git/GitHub, deployment, Builds, automatic ZIP, unrelated redesign, or new unspecified Mariage rules.

## Deliverables
Task lifecycle:
```text
Task/Inbox/CS-0012-Mariage-Player-Count-Score-Limits-and-Empty-Status.md
→ Task/In_Progress/CS-0012-Mariage-Player-Count-Score-Limits-and-Empty-Status.md
→ Task/Completed/CS-0012-Mariage-Player-Count-Score-Limits-and-Empty-Status.md
```

Create:
```text
Task/Reports/CS-0012-Mariage-Player-Count-Score-Limits-and-Empty-Status-Report.md
```

The English report must document implementation, files modified, player-count changes, centralized maximum logic, Order and actual validation, confirmation cumulative totals are not capped, status `--` presentation, score-column behavior, legacy 2-player handling, Mariage/Pokerochok regressions, and JS syntax checks.

Do NOT create a ZIP. The user will manually create and provide the project archive after Codex completes the task.
