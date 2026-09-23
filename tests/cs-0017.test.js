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
const clone = value => JSON.parse(JSON.stringify(value));
let rebuilt;

function game(skiMode = "three", repaintMode = "three") {
  return M.createGame({
    id: "test", startedAt: "2026-09-22T00:00:00.000Z", skiMode, repaintMode,
    players: ["p1", "p2", "p3"].map(id => ({ id, name: id.toUpperCase() }))
  });
}

function scores(state) {
  return Array.from(state.players, player => player.score);
}

function play(state, options = {}) {
  const ordering = options.ordering || "p3";
  const order = options.order || 100;
  const result = options.result || "taken";
  const actuals = options.actuals || {};
  state.activeRound = M.createRound(state);
  state.activeRound.orderingPlayerId = ordering;
  state.activeRound.orderPoints = order;
  state.activeRound.phase = "results";
  const ids = state.players.map(player => player.id);
  ids.forEach(function (id) {
    if (id === ordering) {
      M.resolvePlayerResult(state, id, null, result === "bite_ski" ? "bite-ski" : result);
    } else {
      M.resolvePlayerResult(state, id, Object.prototype.hasOwnProperty.call(actuals, id) ? actuals[id] : 10, null);
    }
  });
  return state.activeRound || state.rounds[state.rounds.length - 1];
}

function putOnBarrel(state, playerId = "p1", attempts = 0, failures = 0) {
  state.players.find(player => player.id === playerId).score = 880;
  state.barrelState[playerId] = { onBarrel: true, barrelAttempts: attempts, failedBarrels: failures };
}

// Entry and clamp after overshoot.
let state = game();
state.players[0].score = 850;
let entryRound = play(state, { actuals: { p1: 180, p2: 10 } });
assert.deepEqual(scores(state), [880, 10, 100]);
assert.equal(M.getBarrelHolder(state).id, "p1");
assert.deepEqual(Array.from(entryRound.barrel.entryOrder), ["p1"]);
assert.equal(entryRound.results.p1.cumulativeScore, 880);
assert.equal(state.barrelState.p1.barrelAttempts, 0);
M.replayLatestRound(state);
assert.equal(M.getBarrelHolder(state), null);
assert.equal(state.players[0].score, 850);
assert.equal(state.activeRound.sequence, 1);
state.activeRound = null;
state = game();
state.players[0].score = 850;
entryRound = play(state, { actuals: { p1: 180, p2: 10 } });

// Barrel minimum order and final-bid win.
assert.equal(M.getMinimumOrder(state, "p1"), 120);
assert.equal(M.isValidOrderForPlayer(state, "p1", 115), false);
assert.equal(M.isValidOrderForPlayer(state, "p1", 120), true);
assert.equal(M.isValidOrderForPlayer(state, "p1", 155), true);
let beforeWin = clone(state);
play(state, { ordering: "p1", order: 120, result: "taken", actuals: { p2: 10, p3: 10 } });
assert.equal(state.status, "completed");
assert.equal(state.winnerPlayerId, "p1");
assert.ok(state.completedAt);
assert.throws(() => M.createRound(state));
M.replayLatestRound(state);
assert.equal(state.status, "active");
assert.equal(state.winnerPlayerId, null);
assert.equal(state.completedAt, null);
assert.equal(M.getBarrelHolder(state).id, "p1");
assert.equal(state.activeRound.sequence, beforeWin.rounds.length + 1);
state.activeRound = null;
state = beforeWin;
play(state, { ordering: "p1", order: 155, result: "taken", actuals: { p2: 10, p3: 10 } });
assert.equal(state.status, "completed");
assert.equal(state.winnerPlayerId, "p1");

// Failed own orders use the final order, with Ski exactly once.
state = game();
putOnBarrel(state);
let failureRound = play(state, { ordering: "p1", order: 120, result: "bite", actuals: { p2: 10, p3: 10 } });
assert.deepEqual(scores(state), [760, 10, 10]);
assert.equal(state.barrelState.p1.failedBarrels, 1);
assert.equal(failureRound.barrel.exits.length, 1);
assert.equal(failureRound.barrel.exits[0].reason, "failed-order");
M.replayLatestRound(state);
assert.equal(M.getBarrelHolder(state).id, "p1");
assert.equal(state.barrelState.p1.failedBarrels, 0);
assert.equal(state.players[0].score, 880);

state = game();
putOnBarrel(state);
play(state, { ordering: "p1", order: 155, result: "bite", actuals: { p2: 10, p3: 10 } });
assert.equal(state.players[0].score, 725);
assert.equal(state.barrelState.p1.failedBarrels, 1);

state = game();
putOnBarrel(state);
play(state, { ordering: "p1", order: 155, result: "bite_ski", actuals: { p2: 10, p3: 10 } });
assert.equal(state.players[0].score, 725);
assert.equal(state.cycleState.p1.ski.count, 1);
assert.equal(state.barrelState.p1.failedBarrels, 1);

state = game("immediate");
putOnBarrel(state);
play(state, { ordering: "p1", order: 155, result: "bite_ski", actuals: { p2: 10, p3: 10 } });
assert.equal(state.players[0].score, 675);

// Three non-ordering attempts stay at 880, then exit once at 760.
state = game();
putOnBarrel(state);
play(state, { actuals: { p1: 40, p2: 10 } });
assert.equal(state.barrelState.p1.barrelAttempts, 1);
assert.equal(state.players[0].score, 880);
play(state, { actuals: { p1: 50, p2: 10 } });
assert.equal(state.barrelState.p1.barrelAttempts, 2);
assert.equal(state.players[0].score, 880);
const exhaustion = play(state, { actuals: { p1: 60, p2: 10 } });
assert.equal(M.getBarrelHolder(state), null);
assert.equal(state.players[0].score, 760);
assert.equal(state.barrelState.p1.failedBarrels, 1);
assert.equal(exhaustion.barrel.exits.length, 1);

// Third failed Barrel resets score and failure cycle; later re-entry is possible.
state = game();
for (let failure = 1; failure <= 3; failure += 1) {
  putOnBarrel(state, "p1", 0, state.barrelState.p1.failedBarrels);
  play(state, { ordering: "p1", order: 120, result: "bite", actuals: { p2: 10, p3: 10 } });
  if (failure < 3) assert.equal(state.barrelState.p1.failedBarrels, failure);
}
assert.equal(state.players[0].score, 0);
assert.equal(state.barrelState.p1.failedBarrels, 0);
state.players[0].score = 850;
play(state, { actuals: { p1: 30, p2: 10 } });
assert.equal(M.getBarrelHolder(state).id, "p1");
assert.equal(state.players[0].score, 880);

// Displacement produces one exit/failure and one sole entrant.
state = game();
putOnBarrel(state, "p1", 1, 0);
state.players[1].score = 850;
const displacement = play(state, { actuals: { p1: 10, p2: 50 } });
assert.equal(M.getBarrelHolder(state).id, "p2");
assert.equal(state.players[0].score, 760);
assert.equal(state.barrelState.p1.failedBarrels, 1);
assert.equal(displacement.barrel.exits.length, 1);
assert.equal(displacement.barrel.exits[0].reason, "displacement");
assert.equal(Object.values(state.barrelState).filter(item => item.onBarrel).length, 1);
M.replayLatestRound(state);
assert.equal(M.getBarrelHolder(state).id, "p1");
assert.equal(state.barrelState.p1.failedBarrels, 0);
assert.equal(state.players[1].score, 850);

state = game();
putOnBarrel(state, "p1", 1, 2);
state.players[1].score = 850;
play(state, { actuals: { p1: 10, p2: 50 } });
assert.equal(M.getBarrelHolder(state).id, "p2");
assert.equal(state.players[0].score, 0);
assert.equal(state.barrelState.p1.failedBarrels, 0);

// Exact candidate priority levels.
const selectionState = game();
const selectionRound = M.createRound(selectionState);
selectionRound.orderingPlayerId = "p1";
function selected(candidates) {
  const order = M.buildBarrelEntryOrder(selectionState, selectionRound, candidates).entryOrder;
  return order[order.length - 1].playerId;
}
assert.equal(selected([
  { playerId: "p2", factualPoints: 40, preRoundScore: 850, isOrderingPlayer: false },
  { playerId: "p3", factualPoints: 50, preRoundScore: 850, isOrderingPlayer: false }
]), "p3");
assert.equal(selected([
  { playerId: "p2", factualPoints: 50, preRoundScore: 860, isOrderingPlayer: false },
  { playerId: "p3", factualPoints: 50, preRoundScore: 850, isOrderingPlayer: false }
]), "p2");
assert.equal(selected([
  { playerId: "p1", factualPoints: 120, preRoundScore: 760, isOrderingPlayer: true },
  { playerId: "p2", factualPoints: 120, preRoundScore: 760, isOrderingPlayer: false }
]), "p1");
assert.equal(selected([
  { playerId: "p2", factualPoints: 50, preRoundScore: 850, isOrderingPlayer: false },
  { playerId: "p3", factualPoints: 50, preRoundScore: 850, isOrderingPlayer: false }
]), "p2");
assert.equal(M.buildBarrelEntryOrder(selectionState, selectionRound, [
  { playerId: "p1", factualPoints: null, preRoundScore: 760, isOrderingPlayer: true },
  { playerId: "p2", factualPoints: 120, preRoundScore: 760, isOrderingPlayer: false }
]).factualRequiredPlayerId, "p1");

// Missing ordering factual value pauses completion, then changes priority without changing scoring.
state = game();
play(state, { actuals: { p1: 420, p2: 420 } });
play(state, { actuals: { p1: 340, p2: 340 } });
state.activeRound = M.createRound(state);
state.activeRound.orderingPlayerId = "p1";
state.activeRound.orderPoints = 120;
state.activeRound.phase = "results";
M.resolvePlayerResult(state, "p1", null, "taken");
M.resolvePlayerResult(state, "p2", 120, null);
M.resolvePlayerResult(state, "p3", 10, null);
assert.equal(state.activeRound.phase, "ordering-factual");
assert.equal(state.activeRound.factualRequiredPlayerId, "p1");
assert.equal(state.players[0].score, 880);
state = M.recalculateMariageGame(clone(state));
assert.equal(state.activeRound.phase, "ordering-factual");
assert.equal(state.activeRound.factualRequiredPlayerId, "p1");
M.resolveRequiredOrderingActualPoints(state, 130);
assert.equal(state.activeRound, null);
assert.equal(M.getBarrelHolder(state).id, "p1");
assert.equal(state.players[0].score, 880);
assert.equal(state.rounds[state.rounds.length - 1].primary.orderingActualPoints, 130);

state = game();
state.players[0].score = 760;
state.players[1].score = 760;
state.activeRound = M.createRound(state);
state.activeRound.orderingPlayerId = "p1";
state.activeRound.orderPoints = 120;
state.activeRound.phase = "results";
M.resolvePlayerResult(state, "p1", null, "taken");
M.resolvePlayerResult(state, "p2", 150, null);
M.resolvePlayerResult(state, "p3", 10, null);
M.resolveRequiredOrderingActualPoints(state, 120);
assert.equal(M.getBarrelHolder(state).id, "p2");
assert.equal(state.players[0].score, 760);
assert.equal(state.players[1].score, 880);

// Editing only factual candidate data deterministically changes the entrant.
state = game();
play(state, { actuals: { p1: 420, p2: 420 } });
play(state, { actuals: { p1: 340, p2: 340 } });
state.activeRound = M.createRound(state);
state.activeRound.orderingPlayerId = "p1";
state.activeRound.orderPoints = 120;
state.activeRound.phase = "results";
M.resolvePlayerResult(state, "p1", null, "taken");
M.resolvePlayerResult(state, "p2", 150, null);
M.resolvePlayerResult(state, "p3", 10, null);
M.resolveRequiredOrderingActualPoints(state, 160);
assert.equal(M.getBarrelHolder(state).id, "p1");
const factualEdit = clone(state);
factualEdit.rounds[2].primary.orderingActualPoints = 120;
rebuilt = M.recalculateMariageGame(factualEdit);
assert.equal(M.getBarrelHolder(rebuilt).id, "p2");
assert.equal(rebuilt.rounds[2].results.p1.delta, 120);
assert.equal(state.rounds[2].results.p1.delta, 120);

// Repaint may create an entrant and consumes an existing holder attempt.
state = game();
state.players[1].score = 850;
state.activeRound = M.createRound(state);
state.activeRound.orderingPlayerId = "p3";
state.activeRound.orderPoints = 100;
state.activeRound.phase = "physical-play";
M.resolveRepaint(state);
assert.equal(M.getBarrelHolder(state).id, "p2");
assert.equal(state.players[1].score, 880);

state = game();
putOnBarrel(state);
state.activeRound = M.createRound(state);
state.activeRound.orderingPlayerId = "p2";
state.activeRound.orderPoints = 100;
state.activeRound.phase = "physical-play";
M.resolveRepaint(state);
assert.equal(M.getBarrelHolder(state).id, "p1");
assert.equal(state.barrelState.p1.barrelAttempts, 1);
assert.equal(state.players[0].score, 880);

// Chronological recalculation rebuilds entry, and an old edit removes it.
state = game();
play(state, { actuals: { p1: 420, p2: 10 } });
play(state, { actuals: { p1: 410, p2: 10 } });
play(state, { actuals: { p1: 180, p2: 10 } });
assert.equal(M.getBarrelHolder(state).id, "p1");
rebuilt = M.recalculateMariageGame(state);
assert.equal(M.getBarrelHolder(rebuilt).id, "p1");
assert.deepEqual(scores(rebuilt), scores(state));
const edited = clone(state);
edited.rounds[2].primary.actuals.p1.actualPoints = 20;
rebuilt = M.recalculateMariageGame(edited);
assert.equal(M.getBarrelHolder(rebuilt), null);
assert.equal(rebuilt.players[0].score, 850);
assert.equal(state.players[0].score, 880);

// Completed winner and completion timestamp are stable through recalculation.
state = game();
play(state, { actuals: { p1: 420, p2: 10 } });
play(state, { actuals: { p1: 410, p2: 10 } });
play(state, { actuals: { p1: 180, p2: 10 } });
play(state, { ordering: "p1", order: 155, result: "taken", actuals: { p2: 10, p3: 10 } });
const completedAt = state.completedAt;
rebuilt = M.recalculateMariageGame(state);
assert.equal(rebuilt.status, "completed");
assert.equal(rebuilt.winnerPlayerId, "p1");
assert.equal(rebuilt.completedAt, completedAt);

// Partial rounds do not consume attempts or transition candidates.
state = game();
play(state, { actuals: { p1: 420, p2: 10 } });
play(state, { actuals: { p1: 410, p2: 10 } });
play(state, { actuals: { p1: 180, p2: 10 } });
play(state, { actuals: { p1: 20, p2: 10 } });
state.activeRound = M.createRound(state);
state.activeRound.orderingPlayerId = "p2";
state.activeRound.orderPoints = 100;
state.activeRound.phase = "results";
M.resolvePlayerResult(state, "p1", 50, null);
rebuilt = M.recalculateMariageGame(state);
assert.equal(rebuilt.barrelState.p1.barrelAttempts, 1);
assert.equal(rebuilt.barrelState.p1.failedBarrels, 0);
assert.equal(M.getBarrelHolder(rebuilt).id, "p1");

assert.ok(P && typeof P.calculateRoundScore === "function");
assert.equal(P.calculateRoundScore("normal", 2, 2), 20);
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.match(html, /id="mariageBarrelStatus"/);
assert.match(html, /id="mariageFactualStep"/);
assert.match(html, /не змінює нараховані бали/);
assert.doesNotMatch(html, /Game Settings/);
const sw = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
assert.match(sw, /\$\{CACHE_PREFIX\}v7/);
assert.doesNotMatch(sw, /Task\//);
console.log("CS-0017 regression checks passed");
