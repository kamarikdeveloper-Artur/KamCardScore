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
const C = context.window.MARIAGE_CONFIG;
const M = context.window.Mariage;
const P = context.window.Poker;
const plain = value => JSON.parse(JSON.stringify(value));

function game(count = 3, skiMode = "three", repaintMode = "three") {
  return M.createGame({
    id: "test", startedAt: "2026-09-22T00:00:00.000Z", skiMode, repaintMode,
    players: Array.from({ length: count }, (_, index) => ({ id: `p${index + 1}`, name: `P${index + 1}` }))
  });
}

function prepareRound(state, orderingPlayerId = "p3", orderPoints = 100) {
  state.activeRound = M.createRound(state);
  state.activeRound.orderingPlayerId = orderingPlayerId;
  state.activeRound.orderPoints = orderPoints;
  state.activeRound.phase = "results";
}

function playComplete(state, orderingPlayerId, orderPoints, facts, sequence) {
  prepareRound(state, orderingPlayerId, orderPoints);
  return enterResults(state, facts, sequence || state.players.map(player => player.id));
}

function enterResults(state, facts, sequence) {
  sequence.forEach(playerId => {
    if (playerId === state.activeRound.orderingPlayerId) {
      const result = facts[playerId];
      M.resolvePlayerResult(state, playerId, null, result === "bite_ski" ? "bite-ski" : result);
    } else {
      M.resolvePlayerResult(state, playerId, facts[playerId], null);
    }
  });
  return state.activeRound || state.rounds[state.rounds.length - 1];
}

function derivedSnapshot(state) {
  const round = state.rounds[state.rounds.length - 1];
  return {
    scores: state.players.map(player => player.score),
    ski: state.players.map(player => plain(state.cycleState[player.id].ski)),
    repaint: state.players.map(player => plain(state.cycleState[player.id].repaint)),
    barrel: state.players.map(player => plain(state.barrelState[player.id])),
    entryOrder: round ? plain(round.barrel.entryOrder) : [],
    exits: round ? plain(round.barrel.exits) : [],
    winnerPlayerId: state.winnerPlayerId,
    status: state.status
  };
}

function scenario(options) {
  const state = game(options.count || 3, options.skiMode || "three");
  Object.entries(options.scores || {}).forEach(([id, score]) => {
    state.players.find(player => player.id === id).score = score;
  });
  if (options.holder) {
    state.barrelState[options.holder].onBarrel = true;
    state.barrelState[options.holder].barrelAttempts = options.attempts || 0;
    state.barrelState[options.holder].failedBarrels = options.failures || 0;
  }
  Object.entries(options.failureCounts || {}).forEach(([id, failures]) => {
    state.barrelState[id].failedBarrels = failures;
  });
  prepareRound(state, options.ordering, options.order);
  const round = enterResults(state, options.facts, options.sequence);
  if (state.activeRound && state.activeRound.phase === "ordering-factual") {
    M.resolveRequiredOrderingActualPoints(state, options.orderingActualPoints);
  }
  return { state, round: state.rounds[state.rounds.length - 1] || round };
}

// Central configuration and corrected limits.
assert.deepEqual(Array.from(C.supportedPlayerCounts), [3, 4]);
assert.equal(C.players[3].maxOrder, 420);
assert.equal(C.players[3].maxRoundPoints, 420);
assert.equal(C.players[4].maxOrder, 420);
assert.equal(C.players[4].maxRoundPoints, 420);
assert.equal(M.CONFIG, C);
assert.equal(M.getMaximumPoints(3), 420);
assert.equal(M.isValidActualPoints(3, 420), true);
assert.equal(M.isValidActualPoints(3, 421), false);
assert.equal(M.isValidActualPoints(4, 420), true);
assert.equal(M.isValidActualPoints(4, 421), false);
let state = game();
prepareRound(state, "p1", 120);
state.activeRound.primary.orderingResult = "taken";
M.setOrderingActualPoints(state.activeRound, 3, 420);
assert.throws(() => M.setOrderingActualPoints(state.activeRound, 3, 421));

// Two sequential entrants: weaker first, stronger last.
let outcome = scenario({
  scores: { p1: 850, p2: 850 }, ordering: "p3", order: 100,
  facts: { p1: 40, p2: 50, p3: "taken" }, sequence: ["p1", "p2", "p3"]
});
assert.deepEqual(plain(outcome.round.barrel.entryOrder), ["p1", "p2"]);
assert.equal(outcome.state.players[0].score, 760);
assert.equal(outcome.state.barrelState.p1.failedBarrels, 1);
assert.equal(outcome.state.players[1].score, 880);
assert.equal(M.getBarrelHolder(outcome.state).id, "p2");

// Three entrants: each earlier entrant is displaced exactly once.
outcome = scenario({
  scores: { p1: 850, p2: 850, p3: 780 }, ordering: "p3", order: 100,
  facts: { p1: 40, p2: 50, p3: "taken" }, sequence: ["p2", "p3", "p1"],
  orderingActualPoints: 100
});
assert.deepEqual(plain(outcome.round.barrel.entryOrder), ["p1", "p2", "p3"]);
assert.deepEqual(plain(outcome.round.barrel.exits.map(exit => exit.playerId)), ["p1", "p2"]);
assert.deepEqual(plain(outcome.state.players.map(player => player.score)), [760, 760, 880]);
assert.equal(outcome.state.barrelState.p1.failedBarrels, 1);
assert.equal(outcome.state.barrelState.p2.failedBarrels, 1);
assert.equal(M.getBarrelHolder(outcome.state).id, "p3");

// Same-round displacement can trigger the third-failure reset.
outcome = scenario({
  scores: { p1: 850, p2: 850 }, failureCounts: { p1: 2 }, ordering: "p3", order: 100,
  facts: { p1: 40, p2: 50, p3: "taken" }, sequence: ["p3", "p1", "p2"]
});
assert.equal(outcome.state.players[0].score, 0);
assert.equal(outcome.state.barrelState.p1.failedBarrels, 0);

// An existing holder's fulfilled final order wins before any new entry.
for (const order of [120, 155]) {
  outcome = scenario({
    scores: { p1: 880, p2: 850 }, holder: "p1", ordering: "p1", order,
    facts: { p1: "taken", p2: 100, p3: 10 }, sequence: ["p2", "p3", "p1"]
  });
  assert.equal(outcome.state.status, "completed");
  assert.equal(outcome.state.winnerPlayerId, "p1");
  assert.deepEqual(plain(outcome.round.barrel.entryOrder), []);
  assert.equal(outcome.state.players[1].score, 950);
  assert.equal(outcome.state.barrelState.p2.onBarrel, false);
}

// A holder who is not ordering cannot win through factual points.
outcome = scenario({
  scores: { p1: 880 }, holder: "p1", ordering: "p3", order: 100,
  facts: { p1: 120, p2: 10, p3: "taken" }, sequence: ["p1", "p2", "p3"]
});
assert.equal(outcome.state.status, "active");
assert.equal(outcome.state.winnerPlayerId, null);
assert.equal(outcome.state.barrelState.p1.barrelAttempts, 1);

// Failed holder exits once, then all new entrants are processed.
for (const semantic of ["bite", "bite_ski"]) {
  outcome = scenario({
    scores: { p1: 880, p2: 850 }, holder: "p1", ordering: "p1", order: 120,
    facts: { p1: semantic, p2: 50, p3: 10 }, sequence: ["p3", "p1", "p2"]
  });
  assert.equal(outcome.round.barrel.exits.filter(exit => exit.playerId === "p1").length, 1);
  assert.equal(M.getBarrelHolder(outcome.state).id, "p2");
  assert.equal(outcome.state.barrelState.p1.failedBarrels, 1);
  assert.equal(outcome.state.cycleState.p1.ski.count, semantic === "bite_ski" ? 1 : 0);
}

// Ordering criteria are weak-to-strong so the strongest candidate enters last.
const orderingState = game();
const orderingRound = M.createRound(orderingState);
orderingRound.orderingPlayerId = "p1";
const entryIds = candidates => plain(M.buildBarrelEntryOrder(orderingState, orderingRound, candidates)
  .entryOrder.map(candidate => candidate.playerId));
assert.deepEqual(entryIds([
  { playerId: "p2", factualPoints: 40, preRoundScore: 850, isOrderingPlayer: false },
  { playerId: "p3", factualPoints: 50, preRoundScore: 850, isOrderingPlayer: false }
]), ["p2", "p3"]);
assert.deepEqual(entryIds([
  { playerId: "p2", factualPoints: 50, preRoundScore: 840, isOrderingPlayer: false },
  { playerId: "p3", factualPoints: 50, preRoundScore: 850, isOrderingPlayer: false }
]), ["p2", "p3"]);
assert.deepEqual(entryIds([
  { playerId: "p1", factualPoints: 120, preRoundScore: 760, isOrderingPlayer: true },
  { playerId: "p2", factualPoints: 120, preRoundScore: 760, isOrderingPlayer: false }
]), ["p2", "p1"]);
assert.deepEqual(entryIds([
  { playerId: "p2", factualPoints: 50, preRoundScore: 850, isOrderingPlayer: false },
  { playerId: "p3", factualPoints: 50, preRoundScore: 850, isOrderingPlayer: false }
]), ["p3", "p2"]);
const allIds = entryIds([
  { playerId: "p2", factualPoints: 50, preRoundScore: 850, isOrderingPlayer: false },
  { playerId: "p3", factualPoints: 50, preRoundScore: 850, isOrderingPlayer: false }
]);
assert.equal(new Set(allIds).size, 2);
assert.equal(M.buildBarrelEntryOrder(orderingState, orderingRound, [
  { playerId: "p1", factualPoints: null, preRoundScore: 760, isOrderingPlayer: true },
  { playerId: "p2", factualPoints: 120, preRoundScore: 760, isOrderingPlayer: false }
]).factualRequiredPlayerId, "p1");

// Result-entry permutations are invariant for three players and multiple entrants.
function permutationOutcome(sequence, options = {}) {
  return derivedSnapshot(scenario({
    count: options.count || 3,
    scores: options.scores,
    holder: options.holder,
    attempts: options.attempts,
    failures: options.failures,
    ordering: options.ordering,
    order: options.order,
    facts: options.facts,
    sequence,
    orderingActualPoints: options.orderingActualPoints
  }).state);
}
const threeOptions = {
  scores: { p1: 850, p2: 850 }, ordering: "p3", order: 100,
  facts: { p1: 40, p2: 50, p3: "taken" }
};
const threeA = permutationOutcome(["p1", "p2", "p3"], threeOptions);
assert.deepEqual(permutationOutcome(["p3", "p1", "p2"], threeOptions), threeA);
assert.deepEqual(permutationOutcome(["p2", "p3", "p1"], threeOptions), threeA);

const holderOptions = {
  scores: { p1: 880, p2: 850 }, holder: "p1", attempts: 1,
  ordering: "p3", order: 100, facts: { p1: 30, p2: 50, p3: "taken" }
};
const holderA = permutationOutcome(["p1", "p2", "p3"], holderOptions);
assert.deepEqual(permutationOutcome(["p3", "p1", "p2"], holderOptions), holderA);
assert.deepEqual(permutationOutcome(["p2", "p3", "p1"], holderOptions), holderA);

const fourOptions = {
  count: 4, scores: { p1: 850, p2: 850, p3: 850 }, ordering: "p4", order: 100,
  facts: { p1: 40, p2: 50, p3: 60, p4: "taken" }
};
const fourA = permutationOutcome(["p1", "p2", "p3", "p4"], fourOptions);
assert.deepEqual(permutationOutcome(["p4", "p2", "p1", "p3"], fourOptions), fourA);
assert.deepEqual(permutationOutcome(["p3", "p1", "p4", "p2"], fourOptions), fourA);

// Historical edits rebuild qualifying entrants and the start-holder win path.
state = game();
playComplete(state, "p3", 100, { p1: 420, p2: 420, p3: "taken" });
playComplete(state, "p3", 100, { p1: 410, p2: 410, p3: "taken" });
playComplete(state, "p3", 100, { p1: 40, p2: 50, p3: "taken" });
assert.deepEqual(plain(state.rounds[2].barrel.entryOrder), ["p2"]);
let edited = plain(state);
edited.rounds[2].primary.actuals.p1.actualPoints = 60;
let rebuilt = M.recalculateMariageGame(edited);
assert.deepEqual(plain(rebuilt.rounds[2].barrel.entryOrder), ["p2", "p1"]);
assert.equal(M.getBarrelHolder(rebuilt).id, "p1");

state = game();
playComplete(state, "p3", 100, { p1: 420, p2: 10, p3: "taken" });
playComplete(state, "p3", 100, { p1: 410, p2: 10, p3: "taken" });
playComplete(state, "p3", 100, { p1: 180, p2: 10, p3: "taken" });
playComplete(state, "p1", 155, { p1: "taken", p2: 10, p3: 10 });
assert.equal(state.status, "completed");
edited = plain(state);
edited.rounds[2].primary.actuals.p1.actualPoints = 20;
rebuilt = M.recalculateMariageGame(edited);
assert.equal(rebuilt.status, "active");
assert.equal(rebuilt.winnerPlayerId, null);
assert.equal(M.getBarrelHolder(rebuilt).id, "p1");

// Replay restores every same-round sequential transition, then permits a different input order.
outcome = scenario({
  scores: { p1: 850, p2: 850 }, ordering: "p3", order: 100,
  facts: { p1: 40, p2: 50, p3: "taken" }, sequence: ["p1", "p2", "p3"]
});
const originalDerived = derivedSnapshot(outcome.state);
M.replayLatestRound(outcome.state);
assert.equal(M.getBarrelHolder(outcome.state), null);
assert.deepEqual(plain(outcome.state.players.map(player => player.score)), [850, 850, 0]);
outcome.state.activeRound.orderingPlayerId = "p3";
outcome.state.activeRound.orderPoints = 100;
outcome.state.activeRound.phase = "results";
enterResults(outcome.state, { p1: 40, p2: 50, p3: "taken" }, ["p3", "p2", "p1"]);
assert.deepEqual(derivedSnapshot(outcome.state), originalDerived);

// Regression surfaces.
assert.equal(P.calculateRoundScore("normal", 2, 2), 20);
assert.equal(M.getDealer(game()).id, "p1");
const configSource = fs.readFileSync(path.join(root, "js/games/mariage-config.js"), "utf8");
assert.doesNotMatch(configSource, /maxRoundPoints:\s*500/);
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.ok(html.indexOf("mariage-config.js") < html.indexOf("mariage.js"));
assert.doesNotMatch(html, /Game Settings/);
const sw = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
assert.match(sw, /\$\{CACHE_PREFIX\}v7/);
assert.match(sw, /\.\/js\/games\/mariage-config\.js/);
assert.doesNotMatch(sw, /Task\//);
console.log("CS-0017B regression checks passed");
