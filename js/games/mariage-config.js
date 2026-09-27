(function () {
  "use strict";

  window.MARIAGE_CONFIG = Object.freeze({
    supportedPlayerCounts: Object.freeze([3, 4]),
    modes: Object.freeze(["three", "immediate"]),
    repaintAwardModes: Object.freeze(["fixed60"]),
    defaultRules: Object.freeze({
      profileId: "custom",
      skiMode: "three",
      repaint: Object.freeze({ penaltyMode: "three", awardMode: "fixed60" }),
      exact555Reset: false
    }),
    players: Object.freeze({
      3: Object.freeze({ minOrder: 100, maxOrder: 420, maxRoundPoints: 420 }),
      4: Object.freeze({ minOrder: 100, maxOrder: 420, maxRoundPoints: 420 })
    }),
    orderStep: 5,
    scoreRules: Object.freeze({ exact555ResetScore: 0 }),
    ski: Object.freeze({
      immediatePenalty: 50,
      cyclePenalty: 100,
      cycleLength: 3
    }),
    repaint: Object.freeze({
      immediatePenalty: 60,
      cyclePenalty: 120,
      otherPlayerPoints: 60,
      cycleLength: 3
    }),
    barrel: Object.freeze({
      entryScore: 880,
      minimumOrder: 120,
      maxAttempts: 3,
      ordinaryExitScore: 760,
      failuresBeforeReset: 3,
      resetScore: 0
    })
  });
})();
