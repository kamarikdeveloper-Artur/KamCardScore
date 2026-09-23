"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = { window: {} };
vm.createContext(context);
for (const file of ["js/games/mariage-config.js", "js/games/mariage.js", "js/games/poker.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const M = context.window.Mariage;
const P = context.window.Poker;
const plain = value => JSON.parse(JSON.stringify(value));

function game() {
  return M.createGame({
    id: "history-icons", startedAt: "2026-09-23T00:00:00.000Z", skiMode: "three", repaintMode: "three",
    players: ["p1", "p2", "p3"].map(id => ({ id, name: id.toUpperCase() }))
  });
}

function play(state, options) {
  state.activeRound = M.createRound(state);
  state.activeRound.orderingPlayerId = options.ordering || "p3";
  state.activeRound.orderPoints = options.order || 100;
  state.activeRound.phase = "results";
  (options.sequence || ["p1", "p2", "p3"]).forEach(playerId => {
    if (playerId === state.activeRound.orderingPlayerId) {
      const semantic = options.results[playerId];
      M.resolvePlayerResult(state, playerId, null, semantic === "bite_ski" ? "bite-ski" : semantic);
    } else {
      M.resolvePlayerResult(state, playerId, options.results[playerId], null);
    }
  });
  if (state.activeRound && state.activeRound.phase === "ordering-factual") {
    M.resolveRequiredOrderingActualPoints(state, options.orderingActualPoints);
  }
  return state.rounds[state.rounds.length - 1];
}

function barrelView(state, round, playerId) {
  const presentation = M.getBarrelHistoryPresentation(state, round, playerId);
  return presentation && plain(presentation);
}

// A. One entrant is active and its semantic result remains intact.
let state = game();
state.players[0].score = 850;
let round = play(state, { results: { p1: 40, p2: 10, p3: "taken" } });
assert.equal(state.barrelState.p1.onBarrel, true);
assert.deepEqual(barrelView(state, round, "p1"), { active: true, asset: "assets/icons/icon_barrel.svg" });
assert.equal(round.results.p1.semantic.success, false);
assert.equal(M.getPresentation(round.results.p3, state.settings).fallback, "✅");

// B. All same-round entrants get icons; only the last entrant remains active.
state = game();
state.players.forEach(player => { player.score = 820; });
round = play(state, {
  ordering: "p3", order: 130,
  results: { p1: 130, p2: 130, p3: "taken" },
  sequence: ["p2", "p3", "p1"], orderingActualPoints: 130
});
assert.deepEqual(plain(round.barrel.entryOrder), ["p2", "p1", "p3"]);
assert.deepEqual(plain(state.players.map(player => player.score)), [760, 760, 880]);
assert.equal(state.barrelState.p1.failedBarrels, 1);
assert.equal(state.barrelState.p2.failedBarrels, 1);
assert.equal(state.barrelState.p3.onBarrel, true);
assert.equal(barrelView(state, round, "p1").active, false);
assert.equal(barrelView(state, round, "p2").active, false);
assert.equal(barrelView(state, round, "p3").active, true);

// C/D/E. Later displacement, repeated entry and recalculation preserve row history.
state = game();
play(state, { results: { p1: 420, p2: 420, p3: "taken" } });
play(state, { results: { p1: 410, p2: 410, p3: "taken" } });
const p1FirstEntry = play(state, { results: { p1: 50, p2: 40, p3: "taken" } });
assert.deepEqual(plain(p1FirstEntry.barrel.entryOrder), ["p1"]);
assert.equal(barrelView(state, p1FirstEntry, "p1").active, true);

const p2Entry = play(state, { results: { p1: 10, p2: 20, p3: "taken" } });
assert.deepEqual(plain(p2Entry.barrel.entryOrder), ["p2"]);
assert.equal(barrelView(state, p1FirstEntry, "p1").active, false);
assert.equal(barrelView(state, p2Entry, "p2").active, true);

const p1SecondEntry = play(state, { results: { p1: 120, p2: 10, p3: "taken" } });
assert.deepEqual(plain(p1SecondEntry.barrel.entryOrder), ["p1"]);
assert.equal(barrelView(state, p1FirstEntry, "p1").active, false);
assert.equal(barrelView(state, p2Entry, "p2").active, false);
assert.equal(barrelView(state, p1SecondEntry, "p1").active, true);
assert.equal(state.rounds.filter(item => item.barrel.entryOrder.includes("p1")).length, 2);

const persisted = plain(state);
const persistedViews = persisted.rounds.map(item => persisted.players.map(player =>
  barrelView(persisted, item, player.id)));
const rebuilt = M.recalculateMariageGame(persisted);
const rebuiltViews = rebuilt.rounds.map(item => rebuilt.players.map(player =>
  barrelView(rebuilt, item, player.id)));
assert.deepEqual(plain(rebuiltViews), plain(persistedViews));
assert.deepEqual(plain(rebuilt.players.map(player => player.score)), plain(state.players.map(player => player.score)));
assert.deepEqual(plain(rebuilt.barrelState), plain(state.barrelState));

// Rendering assets/styles and PWA shell.
assert.equal(M.PRESENTATION.success.asset, null);
assert.equal(M.PRESENTATION.success.fallback, "✅");
const mariageSource = fs.readFileSync(path.join(root, "js/games/mariage.js"), "utf8");
assert.doesNotMatch(mariageSource, /assets\/mariage\/results\/success\.svg/);
assert.match(mariageSource, /if \(barrelPresentation\) appendBarrelContent/);
const css = fs.readFileSync(path.join(root, "css/style.css"), "utf8");
assert.match(css, /\.mariage-barrel-icon--active/);
assert.match(css, /\.mariage-barrel-icon--inactive::after/);
assert.match(css, /grayscale\(1\)/);
assert.equal(fs.existsSync(path.join(root, "assets/icons/icon_barrel.svg")), true);
const sw = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
assert.match(sw, /\$\{CACHE_PREFIX\}v7/);
assert.match(sw, /\.\/assets\/icons\/icon_barrel\.svg/);
assert.doesNotMatch(sw, /Task\//);
assert.equal(P.calculateRoundScore("normal", 2, 2), 20);
console.log("CS-0017C regression checks passed");
