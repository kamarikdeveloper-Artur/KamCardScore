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
const snapshot = value => JSON.parse(JSON.stringify(value));

function game(count = 3, skiMode = "three", repaintMode = "three") {
  return M.createGame({
    id: "test", startedAt: "2026-09-22", skiMode, repaintMode,
    players: Array.from({ length: count }, (_, index) => ({ id: `p${index + 1}`, name: `P${index + 1}` }))
  });
}

function round(state, order = 120, orderingPlayerId = "p1") {
  state.activeRound = M.createRound(state);
  state.activeRound.orderingPlayerId = orderingPlayerId;
  state.activeRound.orderPoints = order;
  state.activeRound.phase = "results";
}

function finish(state, orderingResult = "taken", others = [30, 0]) {
  round(state);
  M.resolvePlayerResult(state, "p1", null, orderingResult);
  others.forEach((points, index) => M.resolvePlayerResult(state, `p${index + 2}`, points, null));
}

function equalScores(actual, expected) {
  assert.deepEqual(Array.from(actual.players, player => player.score), expected);
}

assert.equal(M.isValidActualPoints(3, 420), true);
assert.equal(M.isValidActualPoints(3, 421), false);
assert.equal(M.isValidActualPoints(4, 420), true);
assert.equal(M.isValidActualPoints(4, 421), false);
assert.equal(M.isValidActualPoints(3, 30.5), true);
assert.equal(M.isValidOrderPoints(3, 120), true);
assert.equal(M.isValidOrderPoints(3, 121), false);

let state = game();
round(state);
assert.throws(() => M.resolvePlayerResult(state, "p1", 145, null));
assert.equal(Object.keys(state.activeRound.results).length, 0);
M.resolvePlayerResult(state, "p2", 45, null);
M.resolvePlayerResult(state, "p1", null, "taken");
assert.equal(state.players[0].score, 120);
M.setOrderingActualPoints(state.activeRound, 3, 145);
assert.equal(state.players[0].score, 120);
assert.throws(() => M.setOrderingActualPoints(state.activeRound, 3, 119));
assert.throws(() => M.setOrderingActualPoints(state.activeRound, 3, 421));
assert.throws(() => M.setOrderingActualPoints(state.activeRound, 3, 145.5));
M.resolvePlayerResult(state, "p3", 0, null);
assert.equal(state.rounds[0].primary.orderingResult, "taken");
assert.equal(state.rounds[0].primary.orderingActualPoints, 145);
equalScores(state, [120, 45, 0]);
let rebuilt = M.recalculateMariageGame(state);
equalScores(rebuilt, [120, 45, 0]);
assert.equal(rebuilt.rounds[0].primary.orderingActualPoints, 145);
equalScores(M.recalculateMariageGame(rebuilt), [120, 45, 0]);
const factualDraft = snapshot(state);
factualDraft.rounds[0].primary.orderingActualPoints = 200;
equalScores(M.recalculateMariageGame(factualDraft), [120, 45, 0]);
equalScores(state, [120, 45, 0]);
factualDraft.rounds[0].primary.orderingActualPoints = 119;
assert.throws(() => M.recalculateMariageGame(factualDraft));
equalScores(state, [120, 45, 0]);

state = game();
finish(state, "bite", [10, 20]);
equalScores(state, [-120, 10, 20]);
assert.equal(state.rounds[0].results.p1.semantic.bite, true);
assert.equal(state.rounds[0].results.p1.semantic.ski, false);
assert.equal(state.rounds[0].primary.orderingActualPoints, null);
equalScores(M.recalculateMariageGame(state), [-120, 10, 20]);

state = game();
for (let index = 0; index < 3; index += 1) finish(state, "bite-ski", [0, 20]);
equalScores(state, [-460, -100, 60]);
assert.deepEqual(Array.from(state.rounds, item => item.results.p1.skiCycleNumber), [1, 2, 3]);
equalScores(M.recalculateMariageGame(state), [-460, -100, 60]);
const historical = snapshot(state);
historical.rounds[0].primary.orderingResult = "taken";
rebuilt = M.recalculateMariageGame(historical);
equalScores(rebuilt, [-120, -100, 60]);
assert.deepEqual(Array.from(rebuilt.rounds, item => item.results.p1.skiCycleNumber), [null, 1, 2]);
equalScores(state, [-460, -100, 60]);

state = game(3, "immediate", "three");
finish(state, "bite-ski");
equalScores(state, [-170, 30, -50]);
equalScores(M.recalculateMariageGame(state), [-170, 30, -50]);

state = game(4);
round(state, 420);
M.resolvePlayerResult(state, "p4", 419, null);
M.resolvePlayerResult(state, "p1", null, "taken");
M.resolvePlayerResult(state, "p2", 420, null);
M.resolvePlayerResult(state, "p3", 0, null);
equalScores(state, [420, 420, 0, 419]);
equalScores(M.recalculateMariageGame(state), [420, 420, 0, 419]);

state = game();
round(state);
M.resolvePlayerResult(state, "p2", 40, null);
M.resolvePlayerResult(state, "p1", null, "bite-ski");
let continued = M.recalculateMariageGame(snapshot(state));
assert.equal(continued.activeRound.primary.orderingResult, "bite_ski");
assert.equal(continued.activeRound.results.p1.delta, -120);
M.resolvePlayerResult(continued, "p3", 10, null);
equalScores(continued, [-120, 40, 10]);
assert.equal(M.getDealer(continued).id, "p2");
M.replayLatestRound(continued);
equalScores(continued, [0, 0, 0]);
assert.equal(continued.activeRound.sequence, 1);
assert.equal(continued.activeRound.primary.orderingResult, null);
assert.equal(continued.activeRound.primary.orderingActualPoints, null);
assert.equal(M.getDealer(continued).id, "p1");

state = game();
round(state);
M.resolvePlayerResult(state, "p1", null, "taken");
M.setOrderingActualPoints(state.activeRound, 3, 150);
M.replayLatestRound(state);
assert.equal(state.activeRound.primary.orderingResult, null);
assert.equal(state.activeRound.primary.orderingActualPoints, null);
equalScores(state, [0, 0, 0]);

state = game();
round(state);
M.resolvePlayerResult(state, "p1", null, "bite-ski");
M.resolvePlayerResult(state, "p2", 50, null);
M.resolveRepaint(state);
equalScores(state, [0, 60, 60]);
const repaintDraft = snapshot(state);
repaintDraft.rounds[0].primary.orderingResult = "taken";
repaintDraft.rounds[0].primary.orderingActualPoints = 400;
repaintDraft.rounds[0].primary.actuals.p2 = { action: "actual", actualPoints: 300 };
equalScores(M.recalculateMariageGame(repaintDraft), [0, 60, 60]);
equalScores(M.recalculateMariageGame(state), [0, 60, 60]);
for (let index = 0; index < 2; index += 1) {
  round(state);
  M.resolveRepaint(state);
}
equalScores(state, [-120, 180, 180]);
const repaintHistory = snapshot(state);
repaintHistory.rounds[0].primary.resolution = "normal";
repaintHistory.rounds[0].primary.orderingResult = "taken";
repaintHistory.rounds[0].primary.actuals = {
  p2: { action: "actual", actualPoints: 20 },
  p3: { action: "actual", actualPoints: 30 }
};
rebuilt = M.recalculateMariageGame(repaintHistory);
equalScores(rebuilt, [120, 140, 150]);
assert.deepEqual(Array.from(rebuilt.rounds.slice(1), item => item.results.p1.repaintCycleNumber), [1, 2]);

for (const [actual, expected] of [[145, "taken"], [50, "bite"], [0, "bite_ski"]]) {
  state = game();
  round(state);
  M.resolvePlayerResult(state, "p2", 20, null);
  state.activeRound.primary = {
    resolution: "normal",
    actuals: { p1: { action: "actual", actualPoints: actual }, p2: { action: "actual", actualPoints: 20 } }
  };
  rebuilt = M.recalculateMariageGame(state);
  assert.equal(rebuilt.activeRound.primary.orderingResult, expected);
  assert.equal(rebuilt.activeRound.primary.orderingActualPoints, actual);
  assert.equal(rebuilt.players[0].score, expected === "taken" ? 120 : -120);
}

assert.ok(P && typeof P.calculateRoundScore === "function");
assert.equal(P.calculateRoundScore("normal", 2, 2), 20);
assert.equal(P.calculateRoundScore("mines", 0, 0), 10);
assert.equal(P.calculateRoundScore("golden", 0, 0), -10);
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.match(html, /id="mariageOrderingTakenButton"[^>]*>Взято/);
assert.match(html, /id="mariageBiteButton"[^>]*>Байт/);
assert.match(html, /id="mariageBiteSkiButton"[^>]*>Байт \+ Лижа/);
assert.match(html, /id="mariageNumericResultEntry"/);
const sw = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
assert.match(sw, /cardscore-/);
assert.match(sw, /\$\{CACHE_PREFIX\}v7/);
assert.doesNotMatch(sw, /Task\//);
console.log("CS-0016A regression checks passed");
