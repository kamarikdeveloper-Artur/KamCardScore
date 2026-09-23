# CS-0009 — CardScore Game Hub

## Project

CardScore

## Baseline

Use the current clean project version supplied by the user as the authoritative baseline.

This baseline already contains the completed Pokerochok implementation through CS-0008, including:

- complete Pokerochok round chronology;
- ORDER / ACTUAL workflow;
- scoring and cumulative totals;
- Pass rules;
- special rounds;
- current-game persistence;
- final results;
- completed-game history foundation.

Do not rebuild or redesign Pokerochok gameplay.

This task introduces the application-level Game Hub so CardScore can later contain multiple card-game notebooks.

---

## Objective

Transform CardScore from a single-game application into a multi-game shell.

After this task the application entry flow must be:

```text
CardScore
│
├── Покерочек
│   ├── Нова гра
│   ├── Продовжити
│   ├── Історія
│   ├── Статистика
│   └── Назад
│
└── Марьяж
    └── Незабаром
```

Only Pokerochok is functional in CS-0009.

Do NOT implement Mariage rules.

---

# 1. Minimal Task Workflow

If the project currently has no `Task/` directory, create:

```text
Task/
├── Inbox/
├── In_Progress/
├── Completed/
└── Reports/
```

Use the normal task lifecycle:

```text
Inbox → In_Progress → Completed
```

Create an English completion report in:

```text
Task/Reports/
```

Do NOT create:

- `Builds/`;
- automatic ZIP generation;
- Git workflow;
- GitHub workflow;
- deployment configuration.

The user will create project ZIP archives manually.

---

# 2. Application Entry Point

CardScore must no longer open directly into Pokerochok setup.

On a normal fresh application load, show the CardScore Game Hub first.

The hub must clearly identify the application as:

```text
CardScore
```

and present the available game notebooks.

At minimum:

```text
Покерочек
Марьяж
```

---

# 3. Game Registry

Introduce a lightweight game registry or equivalent centralized configuration.

Conceptually:

```javascript
[
  {
    id: "pokerochok",
    name: "Покерочек",
    available: true
  },
  {
    id: "mariage",
    name: "Марьяж",
    available: false
  }
]
```

Exact implementation may follow the current architecture.

Requirements:

- stable game IDs;
- UI must not depend only on visible Ukrainian names;
- future games should be addable without rewriting the entire application shell;
- do not over-engineer with a framework or plugin system.

---

# 4. Pokerochok Game Menu

Selecting:

```text
Покерочек
```

must open its game menu.

Provide:

```text
Нова гра
Продовжити
Історія
Статистика
Назад
```

---

# 5. New Game

`Нова гра` must open the existing Pokerochok setup flow.

Reuse the existing setup implementation.

Do not duplicate the setup logic.

If no unfinished current game exists:

```text
Нова гра
→ existing Pokerochok setup
```

If an unfinished current game already exists, do NOT silently overwrite it.

Show a confirmation before replacing it.

The confirmation must clearly explain that starting a new game will replace the current unfinished game.

History must not be deleted.

If the user cancels:

- keep the current game;
- remain in the Pokerochok menu.

If confirmed:

- proceed to setup/new game;
- replace only the current game when the new game is actually started;
- preserve completed-game History.

---

# 6. Continue

`Продовжити` must use the existing persisted current game.

If a current game exists:

```text
Продовжити
→ restore the same game
```

Preserve:

- game ID;
- startedAt;
- round state;
- scores;
- player names;
- configuration;
- final/completed state where applicable.

Do NOT create a new game ID.

Do NOT reset startedAt.

If the retained current game is already completed, Continue may reopen the completed locked table/results state rather than creating a new game.

If no current game exists, `Продовжити` should be visibly disabled or otherwise clearly unavailable.

Do not show a fake empty game.

---

# 7. History

The existing CS-0008 history foundation must be preserved.

For CS-0009, do NOT build the full History browser yet.

The `Історія` control may be:

- disabled with a clear unavailable state; or
- a lightweight placeholder indicating that the interface will be added later.

Do not delete or modify stored History data.

Do not create a second incompatible History schema.

---

# 8. Statistics

Do NOT implement Statistics in CS-0009.

The `Статистика` control should be disabled or show a lightweight future-feature state.

Do not calculate or persist aggregate statistics yet.

History remains the future source of truth for statistics.

---

# 9. Back Navigation

`Назад` from the Pokerochok menu must return to the CardScore Game Hub.

This action must be non-destructive.

It must not:

- clear the current game;
- clear History;
- change scores;
- create a new game;
- modify game timestamps.

---

# 10. Mariage Placeholder

The Game Hub must contain:

```text
Марьяж
```

Mariage is not implemented yet.

Display a clear state such as:

```text
Незабаром
```

The Mariage entry must not accidentally launch Pokerochok or an empty game.

Do NOT invent:

- Mariage scoring;
- rounds;
- table structure;
- player limits;
- game rules;
- persistence schema.

Those will be specified in future tasks.

---

# 11. Navigation State vs Gameplay State

Application navigation must be separate from Pokerochok gameplay state.

Conceptually distinguish states such as:

```text
GAME_HUB
POKEROCHOK_MENU
POKEROCHOK_SETUP
POKEROCHOK_GAME
```

Exact naming is implementation-dependent.

Navigating between shell screens must not mutate game data.

Avoid using gameplay state as a substitute for application navigation state.

---

# 12. Existing Save Compatibility

Existing saves created by the supplied pre-CS-0009 baseline must remain usable.

A user with an existing Pokerochok current game must be able to:

```text
open CardScore
→ see Game Hub
→ Покерочек
→ Продовжити
→ recover existing game
```

Do not automatically open the old game on startup.

Do not destroy legacy current-game data merely because the new Game Hub exists.

Normalize legacy data only where required and non-destructively.

---

# 13. Game Type Metadata

Prepare persisted game records for multiple game types.

Pokerochok records should conceptually identify:

```javascript
gameType: "pokerochok"
```

If old current/history records lack `gameType`, treat them as Pokerochok where that is unambiguous.

Do not break old saves solely because this field was absent.

Future Mariage records must be able to use a different game type without conflicting with Pokerochok.

Do not implement Mariage persistence yet.

---

# 14. History Separation by Game Type

Do not redesign the existing History storage unnecessarily.

However, prepare access so future application code can distinguish records by game type.

A helper concept such as:

```javascript
getHistoryByGameType("pokerochok")
```

is acceptable.

Do not persist duplicated history collections merely for UI convenience.

The stored game snapshot remains the source of truth.

---

# 15. Pokerochok Preservation

All existing Pokerochok behavior must remain unchanged.

Preserve, among other current functionality:

- player-count configuration;
- Short / Full ranges;
- ascending numeric rounds;
- suit rounds;
- descending numeric rounds;
- Lobiky;
- Dark;
- No-Trump;
- Ordered Trump;
- Mines;
- Golden;
- global starting-player rotation;
- ORDER restrictions;
- Pass streak rule;
- previous ORDER edit behavior;
- finite ACTUAL pool;
- auto remainder behavior;
- all scoring formulas;
- cumulative scores;
- sticky player header;
- current action control;
- round status;
- final results;
- competition ranking ties;
- multiple winners;
- Results reopening;
- New Game behavior after completion;
- History archive idempotency;
- localStorage persistence.

Do not change game rules in this task.

---

# 16. Existing Final Results Behavior

Preserve the CS-0008 final-results flow.

When a Pokerochok game completes:

- the final results modal still opens;
- ranking still works;
- ties still work;
- `Результати` can reopen the modal;
- `Вийти` dismisses results without destroying the completed game;
- completed game remains recoverable according to existing behavior;
- History archive remains exactly-once/idempotent.

Integrate these behaviors into the new navigation shell without rewriting the scoring engine.

---

# 17. New Game After Completion

The existing final-results `Нова гра` action should integrate naturally with the new shell.

Preferred behavior:

```text
completed Pokerochok
→ final results
→ Нова гра
→ Pokerochok setup
```

It must continue to:

- archive the completed game exactly once;
- clear/replace only the current-game state as appropriate;
- preserve History.

Do not send the user into Mariage or create an unrelated Game Hub reset unless required by the current established CS-0008 behavior.

---

# 18. UI Requirements

Game Hub and Pokerochok menu must follow the existing visual language.

Do not perform a major redesign.

Requirements:

- touch-friendly controls;
- suitable for Android tablet;
- usable on phone;
- usable on desktop;
- responsive layout;
- clear disabled states;
- clear selected/available game states;
- no hover-only interaction;
- existing Ukrainian UI terminology retained.

Do not revert existing manual CSS refinements.

---

# 19. Accessibility

For newly introduced interactive controls:

- use actual buttons where appropriate;
- maintain keyboard accessibility;
- provide visible focus states;
- use appropriate disabled semantics;
- avoid clickable generic containers where a button is suitable.

Do not introduce inaccessible custom controls unnecessarily.

---

# 20. Architecture Boundary

Keep game-specific behavior separate from the application shell where practical.

The shell should decide:

```text
which game?
which menu?
which application screen?
```

`pokerochok.js` should continue to own Pokerochok-specific rules.

Do not move all Pokerochok logic into `app.js`.

Do not create Mariage logic in `pokerochok.js`.

Future architecture should be able to evolve toward:

```text
js/
├── app.js
├── storage.js
└── games/
    ├── pokerochok.js
    └── mariage.js   ← future
```

Do NOT create a fake `mariage.js` implementation just to satisfy this diagram.

---

# 21. Storage Safety

Do not clear localStorage on normal navigation.

Do not rename existing storage keys without a compatibility layer.

Do not merge current-game and History data into one destructive object.

Do not make navigation state permanently overwrite gameplay state.

If application navigation state is persisted at all, it must not prevent the Game Hub from being the normal application entry screen.

---

# 22. No Git / Deployment / Automatic Archive Work

This task must not introduce:

```text
.gitignore
.github/
GitHub Actions
GitHub Pages
deployment scripts
DEPLOYMENT.md
Builds/
automatic ZIP generation
```

The user currently creates and sends project archives manually.

Do not execute Git operations as part of this task.

---

# 23. Required Regression Checks

At minimum verify the following.

## Fresh load

```text
open application
→ Game Hub visible
```

## Pokerochok menu

```text
Game Hub
→ Покерочек
→ game menu visible
```

## New game

```text
Покерочек
→ Нова гра
→ existing setup
→ start game
→ existing game table works
```

## Continue

With a saved game:

```text
reload
→ Game Hub
→ Покерочек
→ Продовжити
→ same game restored
```

Verify the same:

- game ID;
- player names;
- scores;
- current round/progress.

## Existing legacy save

Verify a save from the supplied baseline remains recoverable.

## Back

```text
Pokerochok menu
→ Назад
→ Game Hub
```

Verify game data remains unchanged.

## Mariage

Verify:

```text
Марьяж
→ unavailable / Незабаром
```

and no Pokerochok state is mutated.

## History

Verify existing history records survive navigation and new shell initialization.

## Completed game

Verify completed Pokerochok can still expose its retained results state.

## Final results

Verify ranking/modal behavior remains unchanged.

## JavaScript

Run syntax checks on all JavaScript files.

---

# 24. Scope Restrictions

Do NOT implement:

- Mariage gameplay;
- full History screen;
- Statistics screen;
- cloud synchronization;
- accounts;
- backend;
- PWA/service worker;
- APK/Capacitor;
- Git;
- GitHub;
- public deployment;
- automatic ZIP snapshots;
- new Pokerochok rules;
- scoring changes;
- unrelated UI redesign.

---

# 25. Acceptance Criteria

CS-0009 is complete when:

1. CardScore opens to a Game Hub.
2. Pokerochok is available from the hub.
3. Mariage is visible as unavailable / `Незабаром`.
4. Pokerochok has New Game, Continue, History, Statistics and Back controls.
5. New Game reuses the existing setup.
6. An unfinished game is not silently overwritten.
7. Continue restores the same persisted game.
8. Existing pre-CS-0009 saves remain compatible.
9. Back navigation is non-destructive.
10. navigation state is separated from gameplay state.
11. Pokerochok records can be identified by `gameType`.
12. History remains compatible and preserved.
13. all Pokerochok rules remain unchanged.
14. final results remain functional.
15. no Mariage rules are invented.
16. no Git/deployment/automatic-ZIP infrastructure is introduced.
17. JavaScript syntax checks pass.
18. required regression checks pass.
19. an English completion report is created.

---

# Deliverables

Task lifecycle:

```text
Task/Inbox/CS-0009-CardScore-Game-Hub.md
→ Task/In_Progress/CS-0009-CardScore-Game-Hub.md
→ Task/Completed/CS-0009-CardScore-Game-Hub.md
```

Create:

```text
Task/Reports/CS-0009-CardScore-Game-Hub-Report.md
```

The report must include:

- summary of implementation;
- files created;
- files modified;
- Game Hub architecture;
- game registry implementation;
- Pokerochok menu behavior;
- New Game protection behavior;
- Continue behavior;
- legacy save compatibility;
- gameType compatibility;
- History preservation;
- Mariage placeholder behavior;
- navigation-state separation;
- Pokerochok regression results;
- final-results regression results;
- JavaScript syntax-check results;
- known limitations.

Do not create a project ZIP. The user will create the archive manually after reviewing the completed task.
