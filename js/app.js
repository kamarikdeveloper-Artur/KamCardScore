(function () {
  "use strict";

  const storage = window.CardScoreStorage;
  const playerNameFields = window.CardScorePlayerNameFields;
  const poker = window.Poker;
  const mariage = window.Mariage;
  const POKER_GAME_TYPE = "poker";
  const LEGACY_POKER_GAME_TYPE = "poker" + "ochok";

  const APP_VIEWS = Object.freeze({
    HUB: "hub",
    MENU: "menu",
    SETUP: "setup",
    GAME: "game",
  });
  const GAME_REGISTRY = Object.freeze([
    Object.freeze({ id: "poker", name: "Покер", available: true }),
    Object.freeze({ id: "mariage", name: "Мар'яж", available: true }),
  ]);

  const gameMenuPanel = document.getElementById("gameMenuPanel");
  const gameMenuTitle = gameMenuPanel.querySelector("[data-role='game-title']");
  const gameMenuContinueButton = gameMenuPanel.querySelector("[data-action='continue-game']");
  const gameRegistry = document.getElementById("gameRegistry");
  const pokerGamePanel = document.getElementById("pokerGamePanel");
  const pokerPlayerNameFields = document.getElementById("pokerPlayerNameFields");
  const pokerStartButton = document.getElementById("pokerStartButton");
  const pokerSetupBackButton = document.getElementById("pokerSetupBackButton");
  const pokerGameMenuButton = document.getElementById("pokerGameMenuButton");
  const pokerResultsButton = document.getElementById("pokerResultsButton");
  const pokerScoreTable = document.getElementById("pokerScoreTable");
  const pokerCurrentRoundLabel = document.getElementById("pokerCurrentRoundLabel");
  const pokerCurrentDealerLabel = document.getElementById("pokerCurrentDealerLabel");
  const pokerActivePlayerLabel = document.getElementById("pokerActivePlayerLabel");
  const pokerRoundOrderStatusBar = document.getElementById("pokerRoundOrderStatusBar");
  const pokerRoundOrderStatus = document.getElementById("pokerRoundOrderStatus");
  const pokerRoundOrderProgress = document.getElementById("pokerRoundOrderProgress");
  const pokerRoundOrderClassification = document.getElementById("pokerRoundOrderClassification");
  const pokerCurrentTurnAction = document.getElementById("pokerCurrentTurnAction");
  const pokerCurrentTurnPlayer = document.getElementById("pokerCurrentTurnPlayer");
  const pokerCurrentTurnButton = document.getElementById("pokerCurrentTurnButton");
  const pokerNumberPickerOverlay = document.getElementById("pokerNumberPickerOverlay");
  const numberPickerDialog = pokerNumberPickerOverlay.querySelector(".number-picker-dialog");
  const pokerNumberPickerTitle = document.getElementById("pokerNumberPickerTitle");
  const pokerNumberPickerPlayer = document.getElementById("pokerNumberPickerPlayer");
  const pokerNumberPickerGameChoiceSection = document.getElementById("pokerNumberPickerGameChoiceSection");
  const pokerNumberPickerGameChoices = document.getElementById("pokerNumberPickerGameChoices");
  const pokerNumberPickerPlayerSection = document.getElementById("pokerNumberPickerPlayerSection");
  const pokerNumberPickerPlayers = document.getElementById("pokerNumberPickerPlayers");
  const pokerNumberPickerValues = document.getElementById("pokerNumberPickerValues");
  const pokerNumberPickerConfirmButton = document.getElementById("pokerNumberPickerConfirmButton");
  const pokerNumberPickerCloseButton = document.getElementById("pokerNumberPickerCloseButton");
  const pokerFinalResultsOverlay = document.getElementById("pokerFinalResultsOverlay");
  const finalResultsDialog = pokerFinalResultsOverlay.querySelector(".final-results-dialog");
  const pokerFinalResultsTitle = document.getElementById("pokerFinalResultsTitle");
  const pokerFinalWinnerNames = document.getElementById("pokerFinalWinnerNames");
  const pokerFinalWinnerScore = document.getElementById("pokerFinalWinnerScore");
  const pokerFinalStandings = document.getElementById("pokerFinalStandings");
  const pokerFinalNewGameButton = document.getElementById("pokerFinalNewGameButton");
  const pokerFinalExitButton = document.getElementById("pokerFinalExitButton");

  let gameState = null;
  let activeGameId = null;
  let mariageController = null;
  const gameControllers = new Map();
  let orderEditTurnIndex = null;
  let actualPickerPlayerId = null;
  let autoOpenedResultsGameId = null;
  let resultsPreviousFocus = null;
  const wheelPicker = window.CardScoreWheelPicker.create({
    viewport: pokerNumberPickerValues,
    confirmButton: pokerNumberPickerConfirmButton,
  });

  function syncRoundOrderStatusClearance() {
    if (pokerRoundOrderStatusBar.classList.contains("hidden")) {
      pokerGamePanel.style.removeProperty("--round-order-status-clearance");
      return;
    }
    const clearance = pokerRoundOrderStatusBar.getBoundingClientRect().height + 16;
    pokerGamePanel.style.setProperty("--round-order-status-clearance", `${clearance}px`);
  }

  if (typeof ResizeObserver === "function") {
    new ResizeObserver(syncRoundOrderStatusClearance).observe(pokerRoundOrderStatusBar);
  }
  window.addEventListener("resize", syncRoundOrderStatusClearance);

  function getSelectedPlayerCount() {
    return Number(document.querySelector("input[name='playerCount']:checked").value);
  }

  function getSelectedGameLength() {
    return document.querySelector("input[name='gameLength']:checked").value;
  }

  function getRoundDescriptorsForState(state) {
    return poker.getPlayableRoundDescriptors(state.playerCount, state.gameLength, state.suitOrder);
  }

  function getRoundKeys(state) {
    return getRoundDescriptorsForState(state).map(function (descriptor) {
      return descriptor.key;
    });
  }

  function getLastRoundKey(state) {
    const roundKeys = getRoundKeys(state);
    return roundKeys[roundKeys.length - 1];
  }

  function updateGameLengthLabels() {
    const playerCount = getSelectedPlayerCount();
    const shortLastRound = poker.getBaseRoundCount(playerCount, "short");
    const fullLastRound = poker.getBaseRoundCount(playerCount, "full");

    document.getElementById("pokerShortGameLabel").textContent = `Скорочена 1-${shortLastRound}`;
    document.getElementById("pokerFullGameLabel").textContent = `Довга 1-${fullLastRound}`;
  }

  function renderPlayerNameFields() {
    const playerCount = getSelectedPlayerCount();
    updateGameLengthLabels();
    playerNameFields.render({
      container: pokerPlayerNameFields,
      playerCount,
      idPrefix: "pokerPlayerName",
    });
  }

  function createEmptyResult() {
    return {
      ordered: null,
      actual: null,
      roundScore: null,
      totalScore: null,
    };
  }

  function buildRounds(players, gameLength, suitOrder) {
    const descriptors = poker.getPlayableRoundDescriptors(players.length, gameLength, suitOrder);
    const rounds = descriptors.reduce(function (roundMap, descriptor) {
      const results = {};

      players.forEach(function (player) {
        results[player.id] = createEmptyResult();
      });

      roundMap[descriptor.key] = {
        ...descriptor,
        startPlayerIndex: poker.getStartPlayerIndex(descriptor.sequenceIndex, players.length),
        results,
      };

      return roundMap;
    }, {});

    return {
      roundOrder: descriptors.map(function (descriptor) {
        return descriptor.key;
      }),
      rounds,
    };
  }

  function createGameState() {
    const playerCount = getSelectedPlayerCount();
    const gameLength = getSelectedGameLength();
    const nameInputs = Array.from(pokerPlayerNameFields.querySelectorAll("input"));
    const players = nameInputs.slice(0, playerCount).map(function (input, index) {
      const cleanName = input.value.trim().slice(0, 10);
      return {
        id: `p${index + 1}`,
        name: cleanName || `Гравець ${index + 1}`,
      };
    });

    const suitOrder = poker.createSuitOrder(playerCount);
    const roundState = buildRounds(players, gameLength, suitOrder);

    return {
      id: storage.createGameId(),
      startedAt: new Date().toISOString(),
      finishedAt: null,
      gameType: POKER_GAME_TYPE,
      gameLength,
      playerCount,
      players,
      suitOrder,
      roundOrder: roundState.roundOrder,
      currentRoundKey: roundState.roundOrder[0],
      currentPhase: "order",
      currentTurnIndex: 0,
      chronologyComplete: false,
      rounds: roundState.rounds,
    };
  }

  function ensureGameMetadata(state) {
    if (!state.gameType) {
      state.gameType = POKER_GAME_TYPE;
    }
    if (!state.id || typeof state.id !== "string") {
      state.id = storage.createGameId();
    }
    if (!state.startedAt || typeof state.startedAt !== "string") {
      state.startedAt = new Date().toISOString();
    }
    if (state.chronologyComplete && (!state.finishedAt || typeof state.finishedAt !== "string")) {
      state.finishedAt = new Date().toISOString();
    } else if (!state.finishedAt || typeof state.finishedAt !== "string") {
      state.finishedAt = null;
    }
    return state;
  }

  function getFinalPlayerScore(state, playerId) {
    const roundKeys = poker.getChronologicalRoundKeys(state);
    for (let index = roundKeys.length - 1; index >= 0; index -= 1) {
      const result = state.rounds[roundKeys[index]].results[playerId];
      if (result && Number.isFinite(result.totalScore)) return result.totalScore;
    }
    return 0;
  }

  function getFinalStandings(state) {
    const sorted = state.players
      .map(function (player) {
        return {
          playerId: player.id,
          name: player.name,
          finalScore: getFinalPlayerScore(state, player.id),
        };
      })
      .sort(function (first, second) {
        return second.finalScore - first.finalScore;
      });

    return sorted.map(function (entry, index) {
      const previous = sorted[index - 1];
      const previousPlace = index > 0 && previous.finalScore === entry.finalScore ? sorted[index - 1].place : null;
      entry.place = previousPlace === null ? index + 1 : previousPlace;
      return entry;
    });
  }

  function createCompletedGameSnapshot(state) {
    if (!state.chronologyComplete) throw new Error("Cannot archive an incomplete game");
    ensureGameMetadata(state);
    const standings = getFinalStandings(state);
    const standingByPlayerId = standings.reduce(function (map, standing) {
      map[standing.playerId] = standing;
      return map;
    }, {});

    return {
      id: state.id,
      schemaVersion: 1,
      gameType: state.gameType,
      startedAt: state.startedAt,
      finishedAt: state.finishedAt,
      gameLength: state.gameLength,
      playerCount: state.playerCount,
      suitOrder: Array.isArray(state.suitOrder) ? state.suitOrder.slice() : [],
      players: state.players.map(function (player) {
        const standing = standingByPlayerId[player.id];
        return {
          id: player.id,
          name: player.name,
          finalScore: standing.finalScore,
          place: standing.place,
        };
      }),
      rounds: poker.getChronologicalRoundKeys(state).map(function (roundKey) {
        const round = state.rounds[roundKey];
        const snapshotRound = {
          id: roundKey,
          type: round.type,
          label: round.label,
          maximum: round.maximum,
          sequenceIndex: round.sequenceIndex,
          startPlayerIndex: round.startPlayerIndex,
          requiresOrder: round.requiresOrder,
          scoringType: round.scoringType,
          results: state.players.map(function (player) {
            const result = round.results[player.id];
            return {
              playerId: player.id,
              ordered: result.ordered,
              actual: result.actual,
              roundScore: result.roundScore,
              totalScore: result.totalScore,
            };
          }),
        };

        if (round.type === "base") {
          snapshotRound.baseDirection = round.baseDirection;
          snapshotRound.baseNumber = round.baseNumber;
        }
        if (round.type === "suit") snapshotRound.suit = round.suit;
        if (round.type === "ordered-trump") snapshotRound.gameChoice = round.gameChoice;
        return snapshotRound;
      }),
    };
  }

  function getCurrentRoundData() {
    return gameState.rounds[gameState.currentRoundKey];
  }

  function getCurrentRoundDescriptor() {
    return poker.getRoundDescriptor(gameState, gameState.currentRoundKey);
  }

  function getInitialPhaseForRound(state, roundKey) {
    const descriptor = poker.getRoundDescriptor(state, roundKey);
    return descriptor && descriptor.requiresOrder === false ? "actual" : "order";
  }

  function calculateResultScore(state, roundKey, ordered, actual) {
    const descriptor = poker.getRoundDescriptor(state, roundKey);
    return poker.calculateRoundScore(descriptor.scoringType, ordered, actual);
  }

  function getCurrentOrder() {
    return poker.getPlayerOrderForRound(gameState, gameState.currentRoundKey);
  }

  function getActivePlayerIndex() {
    return getCurrentOrder()[gameState.currentTurnIndex] || 0;
  }

  function getActivePlayer() {
    return gameState.players[getActivePlayerIndex()];
  }

  function getSavedActualValues(roundKey, excludedPlayerId) {
    const roundData = gameState.rounds[roundKey];
    return poker
      .getPlayerOrderForRound(gameState, roundKey)
      .map(function (playerIndex) {
        const player = gameState.players[playerIndex];
        return player.id === excludedPlayerId ? null : roundData.results[player.id].actual;
      })
      .filter(function (actual) {
        return actual !== null;
      });
  }

  function getUnresolvedActualTurnIndices(roundKey) {
    const roundData = gameState.rounds[roundKey];
    return poker
      .getPlayerOrderForRound(gameState, roundKey)
      .map(function (playerIndex, turnIndex) {
        const player = gameState.players[playerIndex];
        return roundData.results[player.id].actual === null ? turnIndex : null;
      })
      .filter(function (turnIndex) {
        return turnIndex !== null;
      });
  }

  function getActualPickerTargetIndex() {
    const order = getCurrentOrder();
    const roundData = getCurrentRoundData();
    const selectedPlayerIndex = gameState.players.findIndex(function (player) {
      return player.id === actualPickerPlayerId;
    });
    const selectedTurnIndex = order.indexOf(selectedPlayerIndex);

    if (selectedTurnIndex >= 0) {
      const selectedPlayer = gameState.players[selectedPlayerIndex];
      if (roundData.results[selectedPlayer.id].actual === null) {
        return selectedPlayerIndex;
      }
    }

    const firstUnresolvedTurnIndex = getUnresolvedActualTurnIndices(gameState.currentRoundKey)[0];
    return firstUnresolvedTurnIndex === undefined ? getActivePlayerIndex() : order[firstUnresolvedTurnIndex];
  }

  function isRoundComplete(roundKey) {
    return isRoundCompleteForState(gameState, roundKey);
  }

  function isRoundUnlocked(roundKey) {
    const roundIndex = gameState.roundOrder.indexOf(roundKey);
    if (roundIndex === 0) return true;
    if (roundIndex < 0) return false;

    return isRoundComplete(gameState.roundOrder[roundIndex - 1]);
  }

  function isLoadableGame(loadedGame) {
    return Boolean(
      loadedGame &&
      (!loadedGame.gameType || loadedGame.gameType === POKER_GAME_TYPE || loadedGame.gameType === LEGACY_POKER_GAME_TYPE) &&
      Array.isArray(loadedGame.players) &&
      loadedGame.players.length >= 2 &&
      loadedGame.players.length <= 4 &&
      loadedGame.rounds &&
      typeof loadedGame.rounds === "object",
    );
  }

  function getSuitIdFromSavedRound(roundKey, roundData) {
    const keyMatch = /^suit-(spades|hearts|clubs|diamonds)(?:-\d+)?$/.exec(String(roundKey));
    if (keyMatch) return keyMatch[1];

    const candidates = [roundData && roundData.suit, roundData && roundData.label];
    return (
      poker.SUIT_IDS.find(function (suitId) {
        return candidates.includes(suitId) || candidates.includes(poker.getSuitSymbol(suitId));
      }) || null
    );
  }

  function getSavedSuitOrder(loadedGame) {
    const normalized = poker.normalizeSuitOrder(loadedGame.playerCount, loadedGame.suitOrder);
    if (normalized) return normalized;

    if (loadedGame.playerCount === 3) {
      const savedRoundOrder = Array.isArray(loadedGame.roundOrder) ? loadedGame.roundOrder : Object.keys(loadedGame.rounds);
      const inferred = savedRoundOrder.reduce(function (suits, roundKey) {
        const suitId = getSuitIdFromSavedRound(roundKey, loadedGame.rounds[roundKey]);
        if (suitId && !suits.includes(suitId)) suits.push(suitId);
        return suits;
      }, []);
      const inferredOrder = poker.normalizeSuitOrder(loadedGame.playerCount, inferred);
      if (inferredOrder) return inferredOrder;
    }

    return poker.createSuitOrder(loadedGame.playerCount);
  }

  function getSourceRound(loadedGame, descriptor) {
    if (loadedGame.rounds[descriptor.key]) {
      return loadedGame.rounds[descriptor.key];
    }

    if (descriptor.type === "base" && descriptor.baseDirection === "ascending") {
      return loadedGame.rounds[`base-${descriptor.baseNumber}`] || loadedGame.rounds[descriptor.baseNumber];
    }

    if (descriptor.type === "suit") {
      const legacySuitKey = Object.keys(loadedGame.rounds).find(function (roundKey) {
        return getSuitIdFromSavedRound(roundKey, loadedGame.rounds[roundKey]) === descriptor.suit;
      });
      return legacySuitKey ? loadedGame.rounds[legacySuitKey] : null;
    }

    if (descriptor.type === "ordered-trump") {
      const occurrence = descriptor.key.replace("ordered-", "");
      return loadedGame.rounds[`ordered-trump-${occurrence}`] || null;
    }

    return null;
  }

  function getMigratedCurrentRoundKey(loadedGame, savedCurrentRoundKey, legacyCurrentRound) {
    if (loadedGame.roundOrder.includes(savedCurrentRoundKey)) {
      return savedCurrentRoundKey;
    }

    const savedBaseIdentity = poker.parseBaseRoundKey(savedCurrentRoundKey);
    if (savedBaseIdentity) {
      const baseKey = poker.getBaseRoundKey(savedBaseIdentity.baseNumber, savedBaseIdentity.baseDirection);
      if (loadedGame.roundOrder.includes(baseKey)) return baseKey;
    }

    const savedSuitId = getSuitIdFromSavedRound(savedCurrentRoundKey, null);
    const suitKey = savedSuitId ? `suit-${savedSuitId}` : null;
    if (loadedGame.roundOrder.includes(suitKey)) return suitKey;

    const legacyOrderedMatch = /^ordered-trump-(\d+)$/.exec(String(savedCurrentRoundKey));
    const orderedKey = legacyOrderedMatch ? `ordered-${legacyOrderedMatch[1]}` : null;
    if (loadedGame.roundOrder.includes(orderedKey)) return orderedKey;

    const legacyRoundNumber = Number(legacyCurrentRound);
    const legacyBaseKey = Number.isInteger(legacyRoundNumber) ? poker.getBaseRoundKey(legacyRoundNumber, "ascending") : null;
    return loadedGame.roundOrder.includes(legacyBaseKey) ? legacyBaseKey : null;
  }

  function normalizeLoadedGame(loadedGame) {
    if (!isLoadableGame(loadedGame)) {
      return null;
    }

    loadedGame.gameType = POKER_GAME_TYPE;
    loadedGame.playerCount = loadedGame.players.length;
    loadedGame.gameLength = poker.GAME_LENGTHS.includes(loadedGame.gameLength) ? loadedGame.gameLength : "full";
    loadedGame.suitOrder = getSavedSuitOrder(loadedGame);

    const savedCurrentRoundKey = loadedGame.currentRoundKey;
    const legacyCurrentRound = loadedGame.currentRound;
    const descriptors = getRoundDescriptorsForState(loadedGame);
    const normalizedRounds = {};

    descriptors.forEach(function (descriptor) {
      const sourceRound = getSourceRound(loadedGame, descriptor);
      const gameChoice =
        descriptor.type === "ordered-trump"
          ? poker.normalizeOrderedGameChoice(
              sourceRound && sourceRound.gameChoice !== undefined ? sourceRound.gameChoice : sourceRound && sourceRound.trumpSuit,
            )
          : null;
      const results = {};

      loadedGame.players.forEach(function (player) {
        const sourceResult = sourceRound && sourceRound.results && sourceRound.results[player.id];
        const result = sourceResult && typeof sourceResult === "object" ? sourceResult : createEmptyResult();

        if (result.ordered === undefined) result.ordered = null;
        if (result.actual === undefined) result.actual = null;
        if (result.roundScore === undefined) {
          result.roundScore = result.score === undefined ? null : result.score;
        }
        result.totalScore = result.totalScore === undefined ? null : result.totalScore;
        delete result.score;
        results[player.id] = result;
      });

      const normalizedRound = {
        ...descriptor,
        startPlayerIndex: poker.getStartPlayerIndex(descriptor.sequenceIndex, loadedGame.playerCount),
        results,
      };
      if (descriptor.type === "ordered-trump") {
        normalizedRound.gameChoice = gameChoice;
        normalizedRound.trumpSuit = gameChoice;
      }
      normalizedRounds[descriptor.key] = normalizedRound;
    });

    loadedGame.roundOrder = descriptors.map(function (descriptor) {
      return descriptor.key;
    });
    loadedGame.rounds = normalizedRounds;
    loadedGame.currentRoundKey =
      getMigratedCurrentRoundKey(loadedGame, savedCurrentRoundKey, legacyCurrentRound) ||
      loadedGame.roundOrder.find(function (roundKey) {
        return !isRoundCompleteForState(loadedGame, roundKey);
      }) ||
      getLastRoundKey(loadedGame);
    delete loadedGame.currentRound;
    delete loadedGame.baseStageComplete;

    loadedGame.currentPhase =
      getInitialPhaseForRound(loadedGame, loadedGame.currentRoundKey) === "actual"
        ? "actual"
        : ["order", "actual"].includes(loadedGame.currentPhase)
          ? loadedGame.currentPhase
          : "order";
    loadedGame.currentTurnIndex = Number.isInteger(loadedGame.currentTurnIndex)
      ? Math.max(0, Math.min(loadedGame.currentTurnIndex, loadedGame.playerCount - 1))
      : 0;

    loadedGame.roundOrder.forEach(function (roundKey) {
      updateRoundTotals(loadedGame, roundKey);
    });

    loadedGame.chronologyComplete = loadedGame.roundOrder.every(function (roundKey) {
      return isRoundCompleteForState(loadedGame, roundKey);
    });

    if (loadedGame.chronologyComplete) {
      loadedGame.currentRoundKey = getLastRoundKey(loadedGame);
      loadedGame.currentTurnIndex = loadedGame.playerCount - 1;
    } else if (isRoundCompleteForState(loadedGame, loadedGame.currentRoundKey)) {
      loadedGame.currentRoundKey = loadedGame.roundOrder.find(function (roundKey) {
        return !isRoundCompleteForState(loadedGame, roundKey);
      });
      loadedGame.currentPhase = getInitialPhaseForRound(loadedGame, loadedGame.currentRoundKey);
      loadedGame.currentTurnIndex = 0;
    }

    ensureGameMetadata(loadedGame);
    return loadedGame;
  }

  function persistCurrentGame() {
    if (!gameState) return null;
    ensureGameMetadata(gameState);
    storage.saveGame(gameState);
    return gameState.chronologyComplete ? storage.archiveCompletedGame(createCompletedGameSnapshot(gameState)) : null;
  }

  function showView(view, gameId) {
    activeGameId = gameId || null;
    document.querySelectorAll("[data-view]").forEach(function (panel) {
      const belongsToGame = panel.dataset.gameId;
      const isVisible = panel.dataset.view === view && (!belongsToGame || belongsToGame === activeGameId);
      panel.classList.toggle("hidden", !isVisible);
    });
  }

  function getGameDefinition(gameId) {
    return (
      GAME_REGISTRY.find(function (game) {
        return game.id === gameId;
      }) || null
    );
  }

  function openGameMenu(gameId) {
    const game = getGameDefinition(gameId);
    const controller = gameControllers.get(gameId);
    if (!game || !game.available || !controller) return;
    gameMenuTitle.textContent = game.name;
    gameMenuContinueButton.disabled = !controller.hasSavedGame();
    showView(APP_VIEWS.MENU, gameId);
  }

  function renderGameRegistry() {
    gameRegistry.replaceChildren();
    GAME_REGISTRY.forEach(function (game) {
      const button = document.createElement("button");
      const name = document.createElement("strong");
      // const status = document.createElement("span");
      button.type = "button";
      button.className = "game-entry";
      name.className = "game-entry-txt";
      button.dataset.gameId = game.id;
      button.disabled = !game.available;
      name.textContent = game.name;
      // status.textContent = game.available ? "Відкрити" : "Незабаром";
      button.appendChild(name);
      // button.appendChild(status);
      if (game.available) {
        button.addEventListener("click", function () {
          openGameMenu(game.id);
        });
      }
      gameRegistry.appendChild(button);
    });
  }

  function showGameHub() {
    showView(APP_VIEWS.HUB, null);
  }

  function registerServiceWorker() {
    const localHostnames = ["localhost", "127.0.0.1"];
    const canRegister = "serviceWorker" in navigator && (location.protocol === "https:" || localHostnames.includes(location.hostname));
    if (!canRegister) return;

    const register = function () {
      navigator.serviceWorker.register("./service-worker.js").catch(function (error) {
        console.warn("CardScore service worker registration failed.", error);
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }

  function showPokerMenu() {
    openGameMenu(POKER_GAME_TYPE);
  }

  function showSetup() {
    showView(APP_VIEWS.SETUP, POKER_GAME_TYPE);
  }

  function showGame() {
    showView(APP_VIEWS.GAME, POKER_GAME_TYPE);
    autoResolveRemainingActuals();
    persistCurrentGame();
    renderGame();
    maybeAutoOpenFinalResults();
  }

  function saveAndRender() {
    autoResolveRemainingActuals();
    persistCurrentGame();
    renderGame();
    maybeAutoOpenFinalResults();
  }

  function renderGame() {
    renderStatus();
    renderRoundOrderStatus();
    renderCurrentTurnAction();
    renderTable();
    pokerResultsButton.classList.toggle("hidden", !gameState.chronologyComplete);
  }

  function renderFinalResultsModal() {
    const standings = getFinalStandings(gameState);
    const winners = standings.filter(function (standing) {
      return standing.place === 1;
    });
    pokerFinalResultsTitle.textContent = winners.length === 1 ? "ПЕРЕМОЖЕЦЬ" : "ПЕРЕМОЖЦІ";
    pokerFinalWinnerNames.textContent = winners
      .map(function (winner) {
        return winner.name;
      })
      .join(" • ");
    pokerFinalWinnerScore.textContent = `${winners[0].finalScore} балів`;
    pokerFinalStandings.replaceChildren();

    standings.forEach(function (standing) {
      const row = document.createElement("div");
      const place = document.createElement("strong");
      const name = document.createElement("span");
      const score = document.createElement("strong");
      row.className = "final-standing-row";
      row.setAttribute("role", "listitem");
      if (standing.place === 1) row.classList.add("winner");
      place.className = "final-standing-place";
      place.textContent = `${standing.place} місце`;
      name.className = "final-standing-name";
      name.textContent = standing.name;
      score.className = "final-standing-score";
      score.textContent = String(standing.finalScore);
      row.appendChild(place);
      row.appendChild(name);
      row.appendChild(score);
      pokerFinalStandings.appendChild(row);
    });
  }

  function isFinalResultsOpen() {
    return !pokerFinalResultsOverlay.classList.contains("hidden");
  }

  function openFinalResultsModal() {
    if (!gameState || !gameState.chronologyComplete) return false;
    persistCurrentGame();
    renderFinalResultsModal();
    resultsPreviousFocus = document.activeElement;
    pokerFinalResultsOverlay.classList.remove("hidden");
    pokerFinalResultsOverlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    autoOpenedResultsGameId = gameState.id;
    finalResultsDialog.focus();
    return true;
  }

  function closeFinalResultsModal() {
    pokerFinalResultsOverlay.classList.add("hidden");
    pokerFinalResultsOverlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");

    if (gameState && gameState.chronologyComplete && !pokerResultsButton.classList.contains("hidden")) {
      pokerResultsButton.focus();
    } else if (resultsPreviousFocus && typeof resultsPreviousFocus.focus === "function") {
      resultsPreviousFocus.focus();
    }
    resultsPreviousFocus = null;
  }

  function maybeAutoOpenFinalResults() {
    if (gameState && gameState.chronologyComplete && autoOpenedResultsGameId !== gameState.id && !isFinalResultsOpen()) openFinalResultsModal();
  }

  function startNewGameSetup(options) {
    const settings = options || {};
    if (gameState && gameState.chronologyComplete) persistCurrentGame();
    if (isFinalResultsOpen()) closeFinalResultsModal();
    if (!settings.preserveCurrentUntilStart) storage.clearGame();
    gameState = null;
    orderEditTurnIndex = null;
    autoOpenedResultsGameId = null;
    showSetup();
  }

  function renderStatus() {
    const activePlayer = getActivePlayer();
    const currentRoundDescriptor = getCurrentRoundDescriptor();
    const currentGameChoice = currentRoundDescriptor && poker.getOrderedGameChoiceDefinition(currentRoundDescriptor.gameChoice);
    pokerCurrentRoundLabel.textContent = currentRoundDescriptor
      ? `${currentRoundDescriptor.label}${currentGameChoice ? ` ${currentGameChoice.symbol}` : ""}`
      : "";
    const dealerIndex = currentRoundDescriptor ? poker.getDealerIndex(currentRoundDescriptor.sequenceIndex, gameState.playerCount) : -1;
    const dealer = gameState.players[dealerIndex];
    pokerCurrentDealerLabel.textContent = dealer ? dealer.name : "-";

    if (gameState.chronologyComplete) {
      pokerActivePlayerLabel.textContent = "Раунди завершено";
      return;
    }

    pokerActivePlayerLabel.textContent = activePlayer ? activePlayer.name : "Добре";
  }

  function getCurrentRoundOrderStatus() {
    const descriptor = getCurrentRoundDescriptor();
    const roundData = getCurrentRoundData();
    const orderedValues = gameState.players.map(function (player) {
      return roundData.results[player.id].ordered;
    });

    return poker.getRoundOrderStatus(poker.getRoundMaximum(descriptor), orderedValues, descriptor.requiresOrder);
  }

  function renderRoundOrderStatus() {
    const status = getCurrentRoundOrderStatus();
    const visible = status.visible && !gameState.chronologyComplete;
    pokerRoundOrderStatusBar.classList.toggle("hidden", !visible);
    pokerRoundOrderStatus.classList.toggle("hidden", !visible);

    if (!visible) {
      pokerGamePanel.style.removeProperty("--round-order-status-clearance");
      return;
    }

    pokerRoundOrderProgress.textContent = `Замовлено: ${status.totalOrdered} / ${status.maximum}`;
    pokerRoundOrderClassification.classList.remove("round-status--shortage", "round-status--overage");
    pokerRoundOrderClassification.classList.toggle("hidden", !status.classification);

    if (status.classification === "shortage") {
      pokerRoundOrderClassification.textContent = `Недобор: ${status.difference}`;
      pokerRoundOrderClassification.classList.add("round-status--shortage");
    } else if (status.classification === "overage") {
      pokerRoundOrderClassification.textContent = `Перебор: ${Math.abs(status.difference)}`;
      pokerRoundOrderClassification.classList.add("round-status--overage");
    } else {
      pokerRoundOrderClassification.textContent = "";
    }

    requestAnimationFrame(syncRoundOrderStatusClearance);
  }

  function getCurrentTurnActionState() {
    if (!gameState || gameState.chronologyComplete || !gameState.currentRoundKey) {
      return { visible: false };
    }

    const descriptor = getCurrentRoundDescriptor();
    if (!descriptor || !isRoundEditable(gameState.currentRoundKey) || isRoundComplete(gameState.currentRoundKey)) {
      return { visible: false };
    }

    const activePlayer = getActivePlayer();
    if (!activePlayer) {
      return { visible: false };
    }

    const phase = descriptor.requiresOrder ? gameState.currentPhase : "actual";
    if (!["order", "actual"].includes(phase)) {
      return { visible: false };
    }

    return {
      visible: true,
      enabled: phase === gameState.currentPhase,
      playerName: activePlayer.name,
      buttonLabel: phase === "order" ? "Замовити" : "Взято",
    };
  }

  function renderCurrentTurnAction() {
    const actionState = getCurrentTurnActionState();
    pokerCurrentTurnAction.classList.toggle("hidden", !actionState.visible);

    if (!actionState.visible) {
      pokerCurrentTurnButton.disabled = true;
      return;
    }

    pokerCurrentTurnPlayer.textContent = actionState.playerName;
    pokerCurrentTurnButton.textContent = actionState.buttonLabel;
    pokerCurrentTurnButton.disabled = !actionState.enabled;
  }

  function renderTable() {
    const header = document.createElement("thead");
    const body = document.createElement("tbody");
    const headerRow = document.createElement("tr");

    headerRow.innerHTML = `<th class="round-header">Гра</th>`;
    gameState.players.forEach(function (player) {
      headerRow.innerHTML += `<th class="player-header" colspan="2">${escapeHtml(player.name)}</th>`;
    });
    header.appendChild(headerRow);

    gameState.roundOrder.forEach(function (roundKey) {
      body.appendChild(renderRoundRow(roundKey));
    });

    poker.getFutureRoundPlaceholders(gameState.playerCount, gameState.gameLength).forEach(function (placeholder) {
      const row = document.createElement("tr");
      row.className = "future-row";
      row.dataset.roundKey = placeholder.key;
      row.innerHTML = `<td class="round-cell">${escapeHtml(placeholder.label)}</td><td class="future-note" colspan="${gameState.playerCount * 2}">Наступний раунд</td>`;
      body.appendChild(row);
    });

    pokerScoreTable.replaceChildren(header, body);
  }

  function createRoundLabelCell(descriptor) {
    const roundCell = document.createElement("td");
    roundCell.className = "round-cell card-suit-red";

    if (descriptor.type === "ordered-trump") {
      const label = document.createElement("span");
      const choice = poker.getOrderedGameChoiceDefinition(descriptor.gameChoice);
      roundCell.classList.add("ordered-round-cell");
      label.className = "ordered-round-index";
      label.textContent = descriptor.label;
      roundCell.appendChild(label);

      if (!choice) return roundCell;

      if (choice.icon) {
        const icon = document.createElement("img");
        icon.className = "ordered-round-choice-icon";
        icon.src = choice.icon;
        icon.alt = choice.name;
        icon.addEventListener("error", function () {
          icon.replaceWith(document.createTextNode(choice.symbol));
        });
        roundCell.appendChild(icon);
      } else {
        const noTrump = document.createElement("span");
        noTrump.className = "ordered-round-no-trump";
        noTrump.textContent = choice.symbol;
        noTrump.setAttribute("aria-label", choice.name);
        roundCell.appendChild(noTrump);
      }
      return roundCell;
    }

    if (descriptor.type !== "suit") {
      roundCell.textContent = descriptor.label;
      return roundCell;
    }

    const suit = poker.getSuitDefinition(descriptor.suit);
    if (!suit || !suit.icon) {
      roundCell.textContent = descriptor.label;
      return roundCell;
    }

    const icon = document.createElement("img");
    icon.className = "suit-icon";
    icon.src = suit.icon;
    icon.alt = suit.name || suit.symbol;
    icon.addEventListener("error", function () {
      roundCell.textContent = suit.symbol;
    });
    roundCell.appendChild(icon);
    return roundCell;
  }

  function renderRoundRow(roundKey) {
    const row = document.createElement("tr");
    const roundData = gameState.rounds[roundKey];
    const descriptor = poker.getRoundDescriptor(gameState, roundKey);
    const unlocked = isRoundUnlocked(roundKey);
    row.dataset.roundKey = roundKey;
    row.appendChild(createRoundLabelCell(descriptor));

    gameState.players.forEach(function (player) {
      const result = roundData.results[player.id];
      const resultCell = document.createElement("td");
      const scoreCell = document.createElement("td");
      const playerIndex = gameState.players.findIndex(function (candidate) {
        return candidate.id === player.id;
      });

      resultCell.className = "result-cell";
      resultCell.innerHTML = renderResultValue(result, descriptor);
      const resultOutcome = descriptor.requiresOrder ? poker.getOrderedResultOutcome(result.ordered, result.actual) : null;
      if (resultOutcome) {
        resultCell.classList.add(`result-outcome--${resultOutcome}`);
      }

      if (isResultCellSelectable(roundKey, playerIndex)) {
        resultCell.classList.add("selectable");
        resultCell.addEventListener("click", function () {
          selectCell(roundKey, playerIndex);
        });
      }

      if (isOrderCellReorderable(roundKey, player.id)) {
        resultCell.classList.add("reorderable");
      }

      if (isOrderEditTarget(roundKey, playerIndex)) {
        resultCell.classList.add("reorder-edit-target");
      }

      if (!isRoundEditable(roundKey) && unlocked) {
        resultCell.classList.add("locked");
      }

      if (!gameState.chronologyComplete && roundKey === gameState.currentRoundKey && playerIndex === getActivePlayerIndex()) {
        resultCell.classList.add("active");
      }

      scoreCell.className = "score-cell";
      if (result.totalScore < 0) {
        scoreCell.classList.add("negative");
      }
      scoreCell.textContent = result.totalScore === null ? "" : String(result.totalScore);

      row.appendChild(resultCell);
      row.appendChild(scoreCell);
    });

    return row;
  }

  function renderResultValue(result, descriptor) {
    if (descriptor.requiresOrder === false) {
      return result.actual === null ? `<div class="result-empty">-</div>` : `<div class="result-single">${result.actual}</div>`;
    }

    if (result.ordered === null) {
      return `<div class="result-empty">-</div>`;
    }

    if (result.actual === null) {
      return `<div class="result-single">${result.ordered}</div>`;
    }

    const outcome = poker.getOrderedResultOutcome(result.ordered, result.actual);
    if (outcome === "exact") {
      return `<div class="result-single result-value--exact">${result.actual}</div>`;
    }

    return [
      `<div class="result-split result-split--${outcome}">`,
      `<span class="ordered-value ordered-value-player ordered-value--target">${result.ordered}</span>`,
      `<span class="actual-value actual-value-player actual-value--${outcome}">${result.actual}</span>`,
      `</div>`,
    ].join("");
  }

  function getActualPlayerPickerOptions(inputPlayerIndex, descriptor) {
    const roundData = getCurrentRoundData();
    return getCurrentOrder().map(function (playerIndex) {
      const player = gameState.players[playerIndex];
      const result = roundData.results[player.id];
      const isCurrentPlayer = playerIndex === inputPlayerIndex;

      return {
        playerId: player.id,
        name: player.name,
        order: descriptor.requiresOrder ? result.ordered : null,
        actual: result.actual,
        selected: isCurrentPlayer,
        completed: result.actual !== null,
        selectable: result.actual === null,
      };
    });
  }

  function getNumberPickerOptions() {
    const inputPlayer = getInputPlayer();
    const inputPlayerIndex = getInputPlayerIndex();
    const descriptor = getCurrentRoundDescriptor();
    const roundData = getCurrentRoundData();
    const roundMaximum = poker.getRoundMaximum(gameState, gameState.currentRoundKey);
    const isOrderPhase = gameState.currentPhase === "order";
    const authoritativeOrder =
      !isOrderPhase && descriptor.requiresOrder && inputPlayer && roundData.results[inputPlayer.id]
        ? roundData.results[inputPlayer.id].ordered
        : null;
    const orderInputTurnIndex = getOrderInputTurnIndex();
    const requiresGameChoice = isOrderPhase && descriptor.type === "ordered-trump" && orderInputTurnIndex === 0;
    const isLastPlayer = orderInputTurnIndex === gameState.playerCount - 1;
    const previousOrders = getOrderedValuesBeforeTurnIndex(orderInputTurnIndex);
    const savedActuals = getSavedActualValues(gameState.currentRoundKey);
    const values = Array.from({ length: roundMaximum + 1 }, function (_, value) {
      return value;
    });

    const title = requiresGameChoice
      ? `${isOrderEditMode() ? "Перезамовлення" : "Заказна"} — Раунд ${descriptor.label}`
      : isOrderEditMode()
        ? "Перезамовлення взяток"
        : isOrderPhase
          ? "Заказ взяток"
          : "Взяті взятки";
    return {
      title,
      playerName: inputPlayer ? inputPlayer.name : "Round complete",
      requiresGameChoice,
      gameChoices: requiresGameChoice ? poker.ORDERED_GAME_CHOICES.map(poker.getOrderedGameChoiceDefinition) : [],
      selectedGameChoice: requiresGameChoice ? roundData.gameChoice : null,
      values,
      selectedValue:
        inputPlayer && roundData.results[inputPlayer.id]
          ? isOrderPhase
            ? roundData.results[inputPlayer.id].ordered
            : (roundData.results[inputPlayer.id].actual ?? authoritativeOrder)
          : null,
      isValueAllowed: isOrderPhase
        ? function (value) {
            return poker.isOrderAllowed(roundMaximum, value, previousOrders, isLastPlayer, {
              gameState,
              playerIndex: inputPlayerIndex,
              currentRoundKey: gameState.currentRoundKey,
            });
          }
        : function (value) {
            return poker.isActualAllowed(roundMaximum, value, savedActuals);
          },
      playerOptions: isOrderPhase ? [] : getActualPlayerPickerOptions(inputPlayerIndex, descriptor),
      onPlayerSelect: isOrderPhase
        ? null
        : function (playerId) {
            actualPickerPlayerId = playerId;
            openNumberPicker(getNumberPickerOptions());
          },
      onConfirm: function (value, gameChoice) {
        const roundKey = gameState.currentRoundKey;
        const phase = gameState.currentPhase;
        const canContinueSequence = !isOrderEditMode();
        const targetPlayerId = isOrderPhase ? null : inputPlayer.id;
        if (enterValue(value, gameChoice, targetPlayerId)) {
          if (canContinueSequence && !gameState.chronologyComplete && gameState.currentRoundKey === roundKey && gameState.currentPhase === phase) {
            openNumberPicker(getNumberPickerOptions());
          } else {
            closeNumberPicker();
          }
        }
      },
    };
  }

  function openNumberPicker(options) {
    const hasPlayerOptions = options.playerOptions.length > 0;
    pokerNumberPickerTitle.textContent = options.title;
    pokerNumberPickerPlayer.textContent = options.playerName;
    pokerNumberPickerPlayer.classList.toggle("hidden", hasPlayerOptions);
    pokerNumberPickerGameChoiceSection.classList.toggle("hidden", !options.requiresGameChoice);
    pokerNumberPickerPlayerSection.classList.toggle("hidden", !hasPlayerOptions);
    pokerNumberPickerGameChoices.innerHTML = "";
    pokerNumberPickerPlayers.innerHTML = "";
    let selectedGameChoice = poker.normalizeOrderedGameChoice(options.selectedGameChoice);

    options.playerOptions.forEach(function (playerOption) {
      const button = document.createElement("button");
      const orderText = playerOption.order === null ? "" : `Замовив: ${playerOption.order}`;
      const statusText = playerOption.actual === null ? (playerOption.selected ? "Поточний" : "Очікує") : `Взято: ${playerOption.actual}`;
      button.className = "number-picker-player-option";
      button.type = "button";
      button.disabled = !playerOption.selectable;
      button.classList.toggle("selected", playerOption.selected);
      button.classList.toggle("completed", playerOption.completed);
      button.setAttribute("aria-pressed", String(playerOption.selected));
      button.setAttribute("aria-current", playerOption.selected ? "true" : "false");
      button.setAttribute("aria-label", [playerOption.name, orderText, statusText].filter(Boolean).join(". "));
      button.innerHTML = [
        `<strong>${escapeHtml(playerOption.name)}</strong>`,
        orderText ? `<span>${escapeHtml(orderText)}</span>` : "",
        `<small>${escapeHtml(statusText)}</small>`,
      ].join("");
      if (playerOption.selectable && options.onPlayerSelect) {
        button.addEventListener("click", function () {
          options.onPlayerSelect(playerOption.playerId);
        });
      }
      pokerNumberPickerPlayers.appendChild(button);
    });

    if (options.requiresGameChoice) {
      const choiceButtons = options.gameChoices.map(function (choice) {
        const button = document.createElement("button");
        const content = choice.icon
          ? `<img src="${escapeHtml(choice.icon)}" alt="">`
          : `<span class="game-choice-no-trump">${escapeHtml(choice.symbol)}</span>`;
        button.className = "game-choice-button";
        button.type = "button";
        button.setAttribute("aria-label", choice.name);
        button.innerHTML = `${content}<span class="game-choice-check" aria-hidden="true">✓</span>`;
        pokerNumberPickerGameChoices.appendChild(button);
        return { button, choice };
      });

      function renderSelectedGameChoice() {
        choiceButtons.forEach(function (item) {
          const isSelected = item.choice.id === selectedGameChoice;
          item.button.classList.toggle("selected", isSelected);
          item.button.setAttribute("aria-pressed", String(isSelected));
        });
      }

      choiceButtons.forEach(function (item) {
        item.button.addEventListener("click", function () {
          selectedGameChoice = item.choice.id;
          renderSelectedGameChoice();
          wheelPicker.setConfirmationAvailable(true);
        });
      });
      renderSelectedGameChoice();
    }

    pokerNumberPickerOverlay.classList.remove("hidden");
    pokerNumberPickerOverlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    wheelPicker.configure({
      values: options.values,
      selectedValue: options.selectedValue,
      isValueAllowed: options.isValueAllowed,
      canConfirm: !options.requiresGameChoice || selectedGameChoice !== null,
      onConfirm: function (value) {
        options.onConfirm(value, selectedGameChoice);
      },
    });
    numberPickerDialog.focus();
  }

  function closeNumberPicker() {
    pokerNumberPickerOverlay.classList.add("hidden");
    pokerNumberPickerOverlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    pokerNumberPickerGameChoiceSection.classList.add("hidden");
    pokerNumberPickerPlayerSection.classList.add("hidden");
    pokerNumberPickerGameChoices.innerHTML = "";
    pokerNumberPickerPlayers.innerHTML = "";
    wheelPicker.reset();
    orderEditTurnIndex = null;
    actualPickerPlayerId = null;
  }

  function isNumberPickerOpen() {
    return !pokerNumberPickerOverlay.classList.contains("hidden");
  }

  function openCurrentTurnNumberPicker() {
    orderEditTurnIndex = null;
    actualPickerPlayerId = null;

    if (autoResolveRemainingActuals()) {
      persistCurrentGame();
      renderGame();
      maybeAutoOpenFinalResults();
      return;
    }

    const actionState = getCurrentTurnActionState();
    if (!actionState.visible || !actionState.enabled) {
      renderCurrentTurnAction();
      return;
    }

    if (gameState.currentPhase === "actual") {
      const firstUnresolvedTurnIndex = getUnresolvedActualTurnIndices(gameState.currentRoundKey)[0];
      if (firstUnresolvedTurnIndex !== undefined) {
        const playerIndex = getCurrentOrder()[firstUnresolvedTurnIndex];
        actualPickerPlayerId = gameState.players[playerIndex].id;
      }
    }

    openNumberPicker(getNumberPickerOptions());
  }

  function selectCell(roundKey, playerIndex) {
    if (!isRoundEditable(roundKey)) {
      return;
    }

    const order = poker.getPlayerOrderForRound(gameState, roundKey);
    const descriptor = poker.getRoundDescriptor(gameState, roundKey);
    const turnIndex = order.indexOf(playerIndex);
    const player = gameState.players[playerIndex];
    const result = gameState.rounds[roundKey].results[player.id];
    const allOrdersEntered = gameState.players.every(function (candidate) {
      return gameState.rounds[roundKey].results[candidate.id].ordered !== null;
    });

    if (gameState.currentPhase === "order") {
      if (!isOrderCellEditable(roundKey, player.id)) {
        return;
      }

      orderEditTurnIndex = isOrderCellReorderable(roundKey, player.id) ? turnIndex : null;
      openNumberPicker(getNumberPickerOptions());
      return;
    }

    orderEditTurnIndex = null;
    gameState.currentTurnIndex = turnIndex >= 0 ? turnIndex : 0;
    gameState.currentPhase = descriptor.requiresOrder && (result.ordered === null || !allOrdersEntered) ? "order" : "actual";
    actualPickerPlayerId = gameState.currentPhase === "actual" && result.actual === null ? player.id : null;
    openNumberPicker(getNumberPickerOptions());
  }

  function enterValue(value, gameChoice, targetPlayerId) {
    const roundMaximum = poker.getRoundMaximum(gameState, gameState.currentRoundKey);
    const activePlayer =
      gameState.currentPhase === "actual" && targetPlayerId
        ? gameState.players.find(function (player) {
            return player.id === targetPlayerId;
          })
        : getInputPlayer();
    if (!activePlayer) {
      return false;
    }
    const roundData = getCurrentRoundData();
    const result = roundData.results[activePlayer.id];

    if (!Number.isInteger(value) || value < 0 || value > roundMaximum) {
      return false;
    }

    let wasEntered = false;

    if (gameState.currentPhase === "order") {
      wasEntered = enterOrderValue(result, value, roundMaximum, gameChoice);
    } else {
      wasEntered = enterActualValue(result, value, activePlayer.id);
    }

    if (!wasEntered) {
      return false;
    }

    saveAndRender();
    return true;
  }

  function enterOrderValue(result, value, roundMaximum, gameChoice) {
    const orderInputTurnIndex = getOrderInputTurnIndex();
    const isReorderEdit = orderEditTurnIndex !== null;
    const isLastPlayer = orderInputTurnIndex === gameState.playerCount - 1;
    const previousOrders = getOrderedValuesBeforeTurnIndex(orderInputTurnIndex);
    const inputPlayerIndex = getInputPlayerIndex();
    const descriptor = getCurrentRoundDescriptor();
    const roundData = getCurrentRoundData();
    const isOrderedRound = descriptor.type === "ordered-trump";
    const isGameChoiceOwner = isOrderedRound && orderInputTurnIndex === 0;

    if (isGameChoiceOwner && !poker.isOrderedGameChoice(gameChoice)) {
      return false;
    }

    if (isOrderedRound && !isGameChoiceOwner && !poker.isOrderedGameChoice(roundData.gameChoice)) {
      return false;
    }

    if (
      !poker.isOrderAllowed(roundMaximum, value, previousOrders, isLastPlayer, {
        gameState,
        playerIndex: inputPlayerIndex,
        currentRoundKey: gameState.currentRoundKey,
      })
    ) {
      return false;
    }

    result.ordered = value;
    if (isGameChoiceOwner) {
      roundData.gameChoice = gameChoice;
      roundData.trumpSuit = gameChoice;
    }

    if (result.actual !== null) {
      setResultRoundScore(result, calculateResultScore(gameState, gameState.currentRoundKey, result.ordered, result.actual));
      updateRoundTotals(gameState, gameState.currentRoundKey);
    }

    if (isReorderEdit) {
      orderEditTurnIndex = null;
      return true;
    }

    orderEditTurnIndex = null;
    moveToNextTurn("order");
    return true;
  }

  function enterActualValue(result, value, playerId) {
    const descriptor = getCurrentRoundDescriptor();
    if (descriptor.requiresOrder && result.ordered === null) {
      return false;
    }

    const roundMaximum = poker.getRoundMaximum(gameState, gameState.currentRoundKey);
    const savedActuals = getSavedActualValues(gameState.currentRoundKey, result.actual === null ? null : playerId);

    if (result.actual !== null || !poker.isActualAllowed(roundMaximum, value, savedActuals)) {
      return false;
    }

    result.actual = value;
    setResultRoundScore(result, calculateResultScore(gameState, gameState.currentRoundKey, result.ordered, result.actual));
    updateRoundTotals(gameState, gameState.currentRoundKey);

    const order = getCurrentOrder();
    const playerIndex = gameState.players.findIndex(function (player) {
      return player.id === playerId;
    });
    const confirmedTurnIndex = order.indexOf(playerIndex);
    const unresolvedTurnIndices = getUnresolvedActualTurnIndices(gameState.currentRoundKey);
    const nextTurnIndex = unresolvedTurnIndices.find(function (turnIndex) {
      return turnIndex > confirmedTurnIndex;
    });
    const resolvedNextTurnIndex = nextTurnIndex === undefined ? unresolvedTurnIndices[0] : nextTurnIndex;

    if (resolvedNextTurnIndex !== undefined) {
      gameState.currentTurnIndex = resolvedNextTurnIndex;
      actualPickerPlayerId = gameState.players[order[resolvedNextTurnIndex]].id;
    }

    autoResolveRemainingActuals();
    return true;
  }

  function moveToNextTurn(phase) {
    orderEditTurnIndex = null;

    if (gameState.currentTurnIndex < gameState.playerCount - 1) {
      gameState.currentTurnIndex += 1;
      return;
    }

    if (phase === "order") {
      gameState.currentPhase = "actual";
      gameState.currentTurnIndex = 0;
      return;
    }

    advanceToNextRound();
  }

  function autoResolveRemainingActuals() {
    orderEditTurnIndex = null;

    if (!gameState || gameState.chronologyComplete || gameState.currentPhase !== "actual") {
      return false;
    }

    const descriptor = getCurrentRoundDescriptor();
    if (descriptor.requiresOrder && !areAllOrdersEntered(gameState.currentRoundKey)) {
      return false;
    }

    const roundMaximum = poker.getRoundMaximum(gameState, gameState.currentRoundKey);
    const remainingActual = poker.getRemainingActualTricks(roundMaximum, getSavedActualValues(gameState.currentRoundKey));
    const unresolvedTurnIndices = getUnresolvedActualTurnIndices(gameState.currentRoundKey);

    if (remainingActual === 0) {
      fillRemainingActualsWithZero(gameState.currentRoundKey);
      updateRoundTotals(gameState, gameState.currentRoundKey);
      advanceToNextRound();
      return true;
    }

    if (unresolvedTurnIndices.length !== 1) {
      return false;
    }

    const finalTurnIndex = unresolvedTurnIndices[0];
    const activePlayer = gameState.players[getCurrentOrder()[finalTurnIndex]];
    const roundData = getCurrentRoundData();
    const result = roundData.results[activePlayer.id];

    if (descriptor.requiresOrder && result.ordered === null) {
      return false;
    }

    result.actual = remainingActual;
    setResultRoundScore(result, calculateResultScore(gameState, gameState.currentRoundKey, result.ordered, remainingActual));
    updateRoundTotals(gameState, gameState.currentRoundKey);
    advanceToNextRound();
    return true;
  }

  function fillRemainingActualsWithZero(roundKey) {
    const roundData = gameState.rounds[roundKey];
    const order = poker.getPlayerOrderForRound(gameState, roundKey);

    order.forEach(function (playerIndex) {
      const player = gameState.players[playerIndex];
      const result = roundData.results[player.id];

      if (result.actual !== null) {
        return;
      }

      result.actual = 0;
      setResultRoundScore(result, calculateResultScore(gameState, roundKey, result.ordered, 0));
    });
  }

  function advanceToNextRound() {
    orderEditTurnIndex = null;
    actualPickerPlayerId = null;
    const currentRoundIndex = gameState.roundOrder.indexOf(gameState.currentRoundKey);
    const nextRoundKey = gameState.roundOrder[currentRoundIndex + 1];

    if (nextRoundKey) {
      gameState.currentRoundKey = nextRoundKey;
      gameState.currentPhase = getInitialPhaseForRound(gameState, nextRoundKey);
      gameState.currentTurnIndex = 0;
      gameState.chronologyComplete = false;
      return;
    }

    gameState.chronologyComplete = true;
    gameState.currentTurnIndex = gameState.playerCount - 1;
  }

  function getRoundActualTotal(roundKey) {
    return getRoundActualTotalForState(gameState, roundKey);
  }

  function getRoundActualTotalForState(state, roundKey) {
    const roundData = state.rounds[roundKey];

    if (!roundData) {
      return 0;
    }

    return state.players.reduce(function (total, player) {
      return total + Number(roundData.results[player.id].actual || 0);
    }, 0);
  }

  function isRoundCompleteForState(state, roundKey) {
    if (!state || !state.rounds || !state.rounds[roundKey]) {
      return false;
    }

    const roundData = state.rounds[roundKey];
    const descriptor = poker.getRoundDescriptor(state, roundKey);
    if (descriptor && descriptor.type === "ordered-trump" && !poker.isOrderedGameChoice(roundData.gameChoice)) {
      return false;
    }
    const allActualsEntered = state.players.every(function (player) {
      return roundData.results[player.id].actual !== null;
    });
    const roundMaximum = poker.getRoundMaximum(state, roundKey);
    const actualTotal = getRoundActualTotalForState(state, roundKey);

    return allActualsEntered && actualTotal === roundMaximum;
  }

  function areAllOrdersEntered(roundKey) {
    return gameState.players.every(function (player) {
      return gameState.rounds[roundKey].results[player.id].ordered !== null;
    });
  }

  function setResultRoundScore(result, roundScore) {
    result.roundScore = roundScore;
    result.totalScore = null;
  }

  function getPreviousRoundTotalScore(state, playerId, roundKey) {
    const chronologicalRoundKeys = poker.getChronologicalRoundKeys(state);
    const currentRoundIndex = chronologicalRoundKeys.indexOf(roundKey);

    for (let index = currentRoundIndex - 1; index >= 0; index -= 1) {
      const previousRoundKey = chronologicalRoundKeys[index];
      const previousResult = state.rounds[previousRoundKey] && state.rounds[previousRoundKey].results[playerId];

      if (previousResult && previousResult.totalScore !== null && previousResult.totalScore !== undefined) {
        return previousResult.totalScore;
      }
    }

    return 0;
  }

  function calculateCumulativeScore(previousTotal, roundScore) {
    return previousTotal + roundScore;
  }

  function updateRoundTotals(state, roundKey) {
    if (!state || !state.rounds || !state.rounds[roundKey]) {
      return;
    }

    state.players.forEach(function (player) {
      const result = state.rounds[roundKey].results[player.id];

      if (!result || result.roundScore === null || result.roundScore === undefined) {
        if (result) {
          result.totalScore = null;
        }
        return;
      }

      result.totalScore = calculateCumulativeScore(getPreviousRoundTotalScore(state, player.id, roundKey), result.roundScore);
    });
  }

  function isRoundEditable(roundKey) {
    return gameState && !gameState.chronologyComplete && roundKey === gameState.currentRoundKey && isRoundUnlocked(roundKey);
  }

  function getOrderedValuesBeforeTurnIndex(turnIndex) {
    const roundData = getCurrentRoundData();
    return getCurrentOrder()
      .slice(0, turnIndex)
      .map(function (playerIndex) {
        return roundData.results[gameState.players[playerIndex].id].ordered;
      });
  }

  function getOrderInputTurnIndex() {
    return orderEditTurnIndex === null ? gameState.currentTurnIndex : orderEditTurnIndex;
  }

  function isOrderEditMode() {
    return gameState && gameState.currentPhase === "order" && orderEditTurnIndex !== null;
  }

  function getInputPlayer() {
    return gameState.players[getInputPlayerIndex()];
  }

  function getInputPlayerIndex() {
    if (gameState.currentPhase !== "order") {
      return getActualPickerTargetIndex();
    }

    return getCurrentOrder()[getOrderInputTurnIndex()];
  }

  function isOrderEditTarget(roundKey, playerIndex) {
    if (!isOrderEditMode() || !isRoundEditable(roundKey)) {
      return false;
    }

    return poker.getPlayerOrderForRound(gameState, roundKey)[orderEditTurnIndex] === playerIndex;
  }

  function isResultCellSelectable(roundKey, playerIndex) {
    if (!isRoundEditable(roundKey)) {
      return false;
    }

    if (gameState.currentPhase !== "order") {
      return playerIndex === getActivePlayerIndex() && gameState.currentTurnIndex < gameState.playerCount - 1;
    }

    return isOrderCellEditable(roundKey, gameState.players[playerIndex].id);
  }

  function isOrderCellEditable(roundKey, playerId) {
    if (!isRoundEditable(roundKey) || gameState.currentPhase !== "order") {
      return false;
    }

    const roundData = gameState.rounds[roundKey];
    const playerIndex = gameState.players.findIndex(function (player) {
      return player.id === playerId;
    });
    const turnIndex = poker.getPlayerOrderForRound(gameState, roundKey).indexOf(playerIndex);
    const activeResult = roundData.results[getActivePlayer().id];
    const result = roundData.results[playerId];

    if (turnIndex === gameState.currentTurnIndex) {
      return result.ordered === null;
    }

    return turnIndex === gameState.currentTurnIndex - 1 && activeResult.ordered === null && result.ordered !== null;
  }

  function isOrderCellReorderable(roundKey, playerId) {
    if (!isRoundEditable(roundKey) || gameState.currentPhase !== "order") {
      return false;
    }

    const playerIndex = gameState.players.findIndex(function (player) {
      return player.id === playerId;
    });
    const turnIndex = poker.getPlayerOrderForRound(gameState, roundKey).indexOf(playerIndex);
    const activeResult = gameState.rounds[roundKey].results[getActivePlayer().id];
    const result = gameState.rounds[roundKey].results[playerId];

    return turnIndex === gameState.currentTurnIndex - 1 && activeResult.ordered === null && result.ordered !== null;
  }

  function escapeHtml(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  document.querySelectorAll("input[name='playerCount']").forEach(function (radio) {
    radio.addEventListener("change", renderPlayerNameFields);
  });

  pokerCurrentTurnButton.addEventListener("click", openCurrentTurnNumberPicker);
  pokerNumberPickerCloseButton.addEventListener("click", closeNumberPicker);
  pokerNumberPickerOverlay.addEventListener("click", function (event) {
    if (event.target === pokerNumberPickerOverlay) {
      closeNumberPicker();
    }
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      if (isFinalResultsOpen()) {
        closeFinalResultsModal();
        return;
      }
      if (isNumberPickerOpen()) closeNumberPicker();
    }

    if (event.key === "Tab" && isFinalResultsOpen()) {
      const focusable = [pokerFinalNewGameButton, pokerFinalExitButton];
      const currentIndex = focusable.indexOf(document.activeElement);
      const nextIndex = event.shiftKey
        ? currentIndex <= 0
          ? focusable.length - 1
          : currentIndex - 1
        : currentIndex === focusable.length - 1
          ? 0
          : currentIndex + 1;
      event.preventDefault();
      focusable[nextIndex].focus();
    }
  });

  pokerResultsButton.addEventListener("click", openFinalResultsModal);
  pokerFinalExitButton.addEventListener("click", closeFinalResultsModal);
  pokerFinalNewGameButton.addEventListener("click", function () {
    startNewGameSetup();
  });

  pokerStartButton.addEventListener("click", function () {
    gameState = createGameState();
    storage.saveGame(gameState);
    showGame();
  });

  function hasPokerSavedGame() {
    return isLoadableGame(storage.loadGame());
  }

  function continuePokerGame() {
    gameState = normalizeLoadedGame(storage.loadGame());
    if (gameState) {
      storage.saveGame(gameState);
      showGame();
    }
  }

  pokerGameMenuButton.addEventListener("click", function () {
    persistCurrentGame();
    closeNumberPicker();
    if (isFinalResultsOpen()) closeFinalResultsModal();
    showPokerMenu();
  });

  function requestPokerNewGame() {
    const savedGame = storage.loadGame();
    if (
      isLoadableGame(savedGame) &&
      !savedGame.chronologyComplete &&
      !window.confirm("Початок нової гри замінить поточну незавершену гру. Історія завершених ігор збережеться. Продовжити?")
    ) {
      showPokerMenu();
      return;
    }
    startNewGameSetup({ preserveCurrentUntilStart: true });
  }

  pokerSetupBackButton.addEventListener("click", showPokerMenu);

  gameMenuPanel.addEventListener("click", function (event) {
    const command = event.target.closest("[data-action]");
    if (!command || !gameMenuPanel.contains(command)) return;
    const action = command.dataset.action;
    if (action === "back-to-hub") {
      showGameHub();
      return;
    }
    const controller = gameControllers.get(activeGameId);
    const methodByAction = {
      "new-game": "requestNewGame",
      "continue-game": "continueGame",
    };
    const method = methodByAction[action];
    if (controller && method && typeof controller[method] === "function") controller[method]();
  });

  renderPlayerNameFields();
  mariageController = mariage.initialize({
    storage,
    navigate: function (view) {
      showView(view, mariage.GAME_TYPE);
    },
    showMenu: function () {
      openGameMenu(mariage.GAME_TYPE);
    },
  });
  gameControllers.set(POKER_GAME_TYPE, {
    hasSavedGame: hasPokerSavedGame,
    requestNewGame: requestPokerNewGame,
    continueGame: continuePokerGame,
  });
  gameControllers.set(mariage.GAME_TYPE, mariageController);
  renderGameRegistry();
  showGameHub();
  registerServiceWorker();
})();
