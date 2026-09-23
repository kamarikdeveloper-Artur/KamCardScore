(function () {
  "use strict";

  const storage = window.CardScoreStorage;
  const poker = window.Poker;
  const mariage = window.Mariage;
  const POKER_GAME_TYPE = "poker";
  const LEGACY_POKER_GAME_TYPE = "poker" + "ochok";

  const APP_SCREENS = Object.freeze({
    GAME_HUB: "GAME_HUB",
    POKER_MENU: "POKER_MENU",
    POKER_SETUP: "POKER_SETUP",
    POKER_GAME: "POKER_GAME",
    MARIAGE_MENU: "MARIAGE_MENU",
    MARIAGE_SETUP: "MARIAGE_SETUP",
    MARIAGE_GAME: "MARIAGE_GAME"
  });
  const GAME_REGISTRY = Object.freeze([
    Object.freeze({ id: "poker", name: "Покер", available: true }),
    Object.freeze({ id: "mariage", name: "Мар'яж", available: true })
  ]);

  const gameHubPanel = document.getElementById("gameHubPanel");
  const pokerMenuPanel = document.getElementById("pokerMenuPanel");
  const mariageMenuPanel = document.getElementById("mariageMenuPanel");
  const mariageSetupPanel = document.getElementById("mariageSetupPanel");
  const mariageGamePanel = document.getElementById("mariageGamePanel");
  const gameRegistry = document.getElementById("gameRegistry");
  const setupPanel = document.getElementById("setupPanel");
  const gamePanel = document.getElementById("gamePanel");
  const playerNameFields = document.getElementById("playerNameFields");
  const startGameButton = document.getElementById("startGameButton");
  const menuNewGameButton = document.getElementById("menuNewGameButton");
  const menuContinueButton = document.getElementById("menuContinueButton");
  const menuBackButton = document.getElementById("menuBackButton");
  const setupBackButton = document.getElementById("setupBackButton");
  const newGameButton = document.getElementById("newGameButton");
  const gameMenuButton = document.getElementById("gameMenuButton");
  const resultsButton = document.getElementById("resultsButton");
  const scoreTable = document.getElementById("scoreTable");
  const currentRoundLabel = document.getElementById("currentRoundLabel");
  const activePlayerLabel = document.getElementById("activePlayerLabel");
  const roundOrderStatusBar = document.getElementById("roundOrderStatusBar");
  const roundOrderStatus = document.getElementById("roundOrderStatus");
  const roundOrderProgress = document.getElementById("roundOrderProgress");
  const roundOrderClassification = document.getElementById("roundOrderClassification");
  const currentTurnAction = document.getElementById("currentTurnAction");
  const currentTurnPlayer = document.getElementById("currentTurnPlayer");
  const currentTurnRemaining = document.getElementById("currentTurnRemaining");
  const currentTurnButton = document.getElementById("currentTurnButton");
  const numberPickerOverlay = document.getElementById("numberPickerOverlay");
  const numberPickerDialog = numberPickerOverlay.querySelector(".number-picker-dialog");
  const numberPickerTitle = document.getElementById("numberPickerTitle");
  const numberPickerPlayer = document.getElementById("numberPickerPlayer");
  const numberPickerHint = document.getElementById("numberPickerHint");
  const numberPickerGameChoiceSection = document.getElementById("numberPickerGameChoiceSection");
  const numberPickerGameChoices = document.getElementById("numberPickerGameChoices");
  const numberPickerValuesLabel = document.getElementById("numberPickerValuesLabel");
  const numberPickerValues = document.getElementById("numberPickerValues");
  const numberPickerCloseButton = document.getElementById("numberPickerCloseButton");
  const numberPickerCancelButton = document.getElementById("numberPickerCancelButton");
  const finalResultsOverlay = document.getElementById("finalResultsOverlay");
  const finalResultsDialog = finalResultsOverlay.querySelector(".final-results-dialog");
  const finalResultsTitle = document.getElementById("finalResultsTitle");
  const finalWinnerNames = document.getElementById("finalWinnerNames");
  const finalWinnerScore = document.getElementById("finalWinnerScore");
  const finalStandings = document.getElementById("finalStandings");
  const finalNewGameButton = document.getElementById("finalNewGameButton");
  const finalExitButton = document.getElementById("finalExitButton");

  let gameState = null;
  let appScreen = APP_SCREENS.GAME_HUB;
  let mariageController = null;
  let orderEditTurnIndex = null;
  let autoOpenedResultsGameId = null;
  let resultsPreviousFocus = null;

  function syncRoundOrderStatusClearance() {
    if (roundOrderStatusBar.classList.contains("hidden")) {
      gamePanel.style.removeProperty("--round-order-status-clearance");
      return;
    }
    const clearance = roundOrderStatusBar.getBoundingClientRect().height + 16;
    gamePanel.style.setProperty("--round-order-status-clearance", `${clearance}px`);
  }

  if (typeof ResizeObserver === "function") {
    new ResizeObserver(syncRoundOrderStatusClearance).observe(roundOrderStatusBar);
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

    document.getElementById("shortGameLabel").textContent = `Скорочена 1-${shortLastRound}`;
    document.getElementById("fullGameLabel").textContent = `Довга 1-${fullLastRound}`;
  }

  function renderPlayerNameFields() {
    const playerCount = getSelectedPlayerCount();
    playerNameFields.innerHTML = "";
    updateGameLengthLabels();

    for (let index = 0; index < playerCount; index += 1) {
      const wrapper = document.createElement("div");
      wrapper.className = "name-field";
      wrapper.innerHTML = [
        `<label for="playerName${index + 1}">Гравець ${index + 1}</label>`,
        `<input id="playerName${index + 1}" type="text" maxlength="10" value="Гравець ${index + 1}">`
      ].join("");
      playerNameFields.appendChild(wrapper);
    }
  }

  function createEmptyResult() {
    return {
      ordered: null,
      actual: null,
      roundScore: null,
      totalScore: null
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
        results
      };

      return roundMap;
    }, {});

    return {
      roundOrder: descriptors.map(function (descriptor) { return descriptor.key; }),
      rounds
    };
  }

  function createGameState() {
    const playerCount = getSelectedPlayerCount();
    const gameLength = getSelectedGameLength();
    const nameInputs = Array.from(playerNameFields.querySelectorAll("input"));
    const players = nameInputs.slice(0, playerCount).map(function (input, index) {
      const cleanName = input.value.trim().slice(0, 10);
      return {
        id: `p${index + 1}`,
        name: cleanName || `Гравець ${index + 1}`
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
      rounds: roundState.rounds
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
    const sorted = state.players.map(function (player) {
      return {
        playerId: player.id,
        name: player.name,
        finalScore: getFinalPlayerScore(state, player.id)
      };
    }).sort(function (first, second) {
      return second.finalScore - first.finalScore;
    });

    return sorted.map(function (entry, index) {
      const previous = sorted[index - 1];
      const previousPlace = index > 0 && previous.finalScore === entry.finalScore
        ? sorted[index - 1].place
        : null;
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
          place: standing.place
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
              totalScore: result.totalScore
            };
          })
        };

        if (round.type === "base") {
          snapshotRound.baseDirection = round.baseDirection;
          snapshotRound.baseNumber = round.baseNumber;
        }
        if (round.type === "suit") snapshotRound.suit = round.suit;
        if (round.type === "ordered-trump") snapshotRound.gameChoice = round.gameChoice;
        return snapshotRound;
      })
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

  function getActualValuesBeforeTurn() {
    const roundData = getCurrentRoundData();
    return getCurrentOrder()
      .slice(0, gameState.currentTurnIndex)
      .map(function (playerIndex) {
        return roundData.results[gameState.players[playerIndex].id].actual;
      });
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
      typeof loadedGame.rounds === "object"
    );
  }

  function getSuitIdFromSavedRound(roundKey, roundData) {
    const keyMatch = /^suit-(spades|hearts|clubs|diamonds)(?:-\d+)?$/.exec(String(roundKey));
    if (keyMatch) return keyMatch[1];

    const candidates = [roundData && roundData.suit, roundData && roundData.label];
    return poker.SUIT_IDS.find(function (suitId) {
      return candidates.includes(suitId) || candidates.includes(poker.getSuitSymbol(suitId));
    }) || null;
  }

  function getSavedSuitOrder(loadedGame) {
    const normalized = poker.normalizeSuitOrder(loadedGame.playerCount, loadedGame.suitOrder);
    if (normalized) return normalized;

    if (loadedGame.playerCount === 3) {
      const savedRoundOrder = Array.isArray(loadedGame.roundOrder)
        ? loadedGame.roundOrder
        : Object.keys(loadedGame.rounds);
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
    const legacyBaseKey = Number.isInteger(legacyRoundNumber)
      ? poker.getBaseRoundKey(legacyRoundNumber, "ascending")
      : null;
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
      const gameChoice = descriptor.type === "ordered-trump"
        ? poker.normalizeOrderedGameChoice(
          sourceRound && sourceRound.gameChoice !== undefined
            ? sourceRound.gameChoice
            : sourceRound && sourceRound.trumpSuit
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
        results
      };
      if (descriptor.type === "ordered-trump") {
        normalizedRound.gameChoice = gameChoice;
        normalizedRound.trumpSuit = gameChoice;
      }
      normalizedRounds[descriptor.key] = normalizedRound;
    });

    loadedGame.roundOrder = descriptors.map(function (descriptor) { return descriptor.key; });
    loadedGame.rounds = normalizedRounds;
    loadedGame.currentRoundKey = getMigratedCurrentRoundKey(
      loadedGame,
      savedCurrentRoundKey,
      legacyCurrentRound
    ) || loadedGame.roundOrder.find(function (roundKey) {
      return !isRoundCompleteForState(loadedGame, roundKey);
    }) || getLastRoundKey(loadedGame);
    delete loadedGame.currentRound;
    delete loadedGame.baseStageComplete;

    loadedGame.currentPhase = getInitialPhaseForRound(loadedGame, loadedGame.currentRoundKey) === "actual"
      ? "actual"
      : ["order", "actual"].includes(loadedGame.currentPhase) ? loadedGame.currentPhase : "order";
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
    return gameState.chronologyComplete
      ? storage.archiveCompletedGame(createCompletedGameSnapshot(gameState))
      : null;
  }

  function showScreen(screen) {
    appScreen = screen;
    gameHubPanel.classList.toggle("hidden", screen !== APP_SCREENS.GAME_HUB);
    pokerMenuPanel.classList.toggle("hidden", screen !== APP_SCREENS.POKER_MENU);
    mariageMenuPanel.classList.toggle("hidden", screen !== APP_SCREENS.MARIAGE_MENU);
    mariageSetupPanel.classList.toggle("hidden", screen !== APP_SCREENS.MARIAGE_SETUP);
    mariageGamePanel.classList.toggle("hidden", screen !== APP_SCREENS.MARIAGE_GAME);
    setupPanel.classList.toggle("hidden", screen !== APP_SCREENS.POKER_SETUP);
    gamePanel.classList.toggle("hidden", screen !== APP_SCREENS.POKER_GAME);
  }

  function renderGameRegistry() {
    gameRegistry.replaceChildren();
    GAME_REGISTRY.forEach(function (game) {
      const button = document.createElement("button");
      const name = document.createElement("strong");
      const status = document.createElement("span");
      button.type = "button";
      button.className = "game-entry";
      button.dataset.gameId = game.id;
      button.disabled = !game.available;
      name.textContent = game.name;
      status.textContent = game.available ? "Відкрити" : "Незабаром";
      button.appendChild(name);
      button.appendChild(status);
      if (game.available) {
        button.addEventListener("click", function () {
          if (game.id === "poker") showPokerMenu();
          if (game.id === "mariage") mariageController.showMenu();
        });
      }
      gameRegistry.appendChild(button);
    });
  }

  function showGameHub() {
    showScreen(APP_SCREENS.GAME_HUB);
  }

  function registerServiceWorker() {
    const localHostnames = ["localhost", "127.0.0.1"];
    const canRegister = "serviceWorker" in navigator &&
      (location.protocol === "https:" || localHostnames.includes(location.hostname));
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
    menuContinueButton.disabled = !isLoadableGame(storage.loadGame());
    showScreen(APP_SCREENS.POKER_MENU);
  }

  function showSetup() {
    showScreen(APP_SCREENS.POKER_SETUP);
  }

  function showGame() {
    showScreen(APP_SCREENS.POKER_GAME);
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
    resultsButton.classList.toggle("hidden", !gameState.chronologyComplete);
  }

  function renderFinalResultsModal() {
    const standings = getFinalStandings(gameState);
    const winners = standings.filter(function (standing) { return standing.place === 1; });
    finalResultsTitle.textContent = winners.length === 1 ? "ПЕРЕМОЖЕЦЬ" : "ПЕРЕМОЖЦІ";
    finalWinnerNames.textContent = winners.map(function (winner) { return winner.name; }).join(" • ");
    finalWinnerScore.textContent = `${winners[0].finalScore} балів`;
    finalStandings.replaceChildren();

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
      finalStandings.appendChild(row);
    });
  }

  function isFinalResultsOpen() {
    return !finalResultsOverlay.classList.contains("hidden");
  }

  function openFinalResultsModal() {
    if (!gameState || !gameState.chronologyComplete) return false;
    persistCurrentGame();
    renderFinalResultsModal();
    resultsPreviousFocus = document.activeElement;
    finalResultsOverlay.classList.remove("hidden");
    finalResultsOverlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    autoOpenedResultsGameId = gameState.id;
    finalResultsDialog.focus();
    return true;
  }

  function closeFinalResultsModal() {
    finalResultsOverlay.classList.add("hidden");
    finalResultsOverlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");

    if (gameState && gameState.chronologyComplete && !resultsButton.classList.contains("hidden")) {
      resultsButton.focus();
    } else if (resultsPreviousFocus && typeof resultsPreviousFocus.focus === "function") {
      resultsPreviousFocus.focus();
    }
    resultsPreviousFocus = null;
  }

  function maybeAutoOpenFinalResults() {
    if (
      gameState && gameState.chronologyComplete &&
      autoOpenedResultsGameId !== gameState.id &&
      !isFinalResultsOpen()
    ) openFinalResultsModal();
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
    currentRoundLabel.textContent = currentRoundDescriptor
      ? `${currentRoundDescriptor.label}${currentGameChoice ? ` ${currentGameChoice.symbol}` : ""}`
      : "";

    if (gameState.chronologyComplete) {
      activePlayerLabel.textContent = "Раунди завершено";
      return;
    }

    activePlayerLabel.textContent = activePlayer ? activePlayer.name : "Добре";
  }

  function getCurrentRoundOrderStatus() {
    const descriptor = getCurrentRoundDescriptor();
    const roundData = getCurrentRoundData();
    const orderedValues = gameState.players.map(function (player) {
      return roundData.results[player.id].ordered;
    });

    return poker.getRoundOrderStatus(
      poker.getRoundMaximum(descriptor),
      orderedValues,
      descriptor.requiresOrder
    );
  }

  function renderRoundOrderStatus() {
    const status = getCurrentRoundOrderStatus();
    const visible = status.visible && !gameState.chronologyComplete;
    roundOrderStatusBar.classList.toggle("hidden", !visible);
    roundOrderStatus.classList.toggle("hidden", !visible);

    if (!visible) {
      gamePanel.style.removeProperty("--round-order-status-clearance");
      return;
    }

    roundOrderProgress.textContent = `Замовлено: ${status.totalOrdered} / ${status.maximum}`;
    roundOrderClassification.classList.remove("round-status--shortage", "round-status--overage");
    roundOrderClassification.classList.toggle("hidden", !status.classification);

    if (status.classification === "shortage") {
      roundOrderClassification.textContent = `НЕДОБОР: ${status.difference}`;
      roundOrderClassification.classList.add("round-status--shortage");
    } else if (status.classification === "overage") {
      roundOrderClassification.textContent = `ПЕРЕБОР: ${Math.abs(status.difference)}`;
      roundOrderClassification.classList.add("round-status--overage");
    } else {
      roundOrderClassification.textContent = "";
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

    let remainingActual = null;
    if (phase === "actual") {
      const roundMaximum = poker.getRoundMaximum(gameState, gameState.currentRoundKey);
      remainingActual = poker.getRemainingActualTricks(roundMaximum, getActualValuesBeforeTurn());
    }

    return {
      visible: true,
      enabled: phase === gameState.currentPhase,
      phase,
      playerName: activePlayer.name,
      buttonLabel: phase === "order" ? "Замовити" : "Взято",
      remainingActual
    };
  }

  function renderCurrentTurnAction() {
    const actionState = getCurrentTurnActionState();
    currentTurnAction.classList.toggle("hidden", !actionState.visible);

    if (!actionState.visible) {
      currentTurnButton.disabled = true;
      currentTurnRemaining.classList.add("hidden");
      currentTurnRemaining.textContent = "";
      return;
    }

    currentTurnPlayer.textContent = actionState.playerName;
    currentTurnButton.textContent = actionState.buttonLabel;
    currentTurnButton.disabled = !actionState.enabled;

    const showRemaining = actionState.phase === "actual" && actionState.remainingActual !== null;
    currentTurnRemaining.classList.toggle("hidden", !showRemaining);
    currentTurnRemaining.textContent = showRemaining
      ? `Залишилось взяток: ${actionState.remainingActual}`
      : "";
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

    scoreTable.replaceChildren(header, body);
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
      if (result.totalScore > 0) {
        scoreCell.classList.add("positive");
      } else if (result.totalScore < 0) {
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
      return result.actual === null
        ? `<div class="result-empty">-</div>`
        : `<div class="result-single">${result.actual}</div>`;
    }

    if (result.ordered === null) {
      return `<div class="result-empty">-</div>`;
    }

    if (result.actual === null) {
      return `<div class="result-single">${result.ordered}</div>`;
    }

    if (result.ordered === result.actual) {
      return `<div class="result-single">${result.actual}</div>`;
    }

    return [
      `<div class="result-split">`,
      `<span class="ordered-value">${result.ordered}</span>`,
      `<span class="actual-value">${result.actual}</span>`,
      `</div>`
    ].join("");
  }

  function getNumberPickerOptions() {
    const inputPlayer = getInputPlayer();
    const inputPlayerIndex = getInputPlayerIndex();
    const descriptor = getCurrentRoundDescriptor();
    const roundData = getCurrentRoundData();
    const roundMaximum = poker.getRoundMaximum(gameState, gameState.currentRoundKey);
    const isOrderPhase = gameState.currentPhase === "order";
    const orderInputTurnIndex = getOrderInputTurnIndex();
    const requiresGameChoice = isOrderPhase && descriptor.type === "ordered-trump" && orderInputTurnIndex === 0;
    const isLastPlayer = orderInputTurnIndex === gameState.playerCount - 1;
    const previousOrders = getOrderedValuesBeforeTurnIndex(orderInputTurnIndex);
    const previousActuals = getActualValuesBeforeTurn();
    const disabledOrderValues = isOrderPhase
      ? poker.getDisabledOrderValues(roundMaximum, previousOrders, isLastPlayer, {
        gameState,
        playerIndex: inputPlayerIndex,
        currentRoundKey: gameState.currentRoundKey
      })
      : [];
    const remainingActual = poker.getRemainingActualTricks(roundMaximum, previousActuals);
    const allowedActualValues = poker.getAllowedActualValues(roundMaximum, previousActuals);

    const title = requiresGameChoice
      ? `${isOrderEditMode() ? "Перезамовлення" : "Заказна"} — Раунд ${descriptor.label}`
      : isOrderEditMode()
        ? "Перезамовлення взяток"
        : isOrderPhase ? "Заказ взяток" : "Взяті взятки";
    let hint = "";

    if (isOrderPhase) {
      hint = disabledOrderValues.length === 0
        ? `Мін/Мах в раунді: 0-${roundMaximum}`
        : `Значення недоступні: ${disabledOrderValues.join(", ")}.`;
    } else {
      hint = `Залишилося: ${remainingActual} / ${roundMaximum}`;
    }

    return {
      title,
      playerName: inputPlayer ? inputPlayer.name : "Round complete",
      hint,
      requiresGameChoice,
      gameChoices: requiresGameChoice
        ? poker.ORDERED_GAME_CHOICES.map(poker.getOrderedGameChoiceDefinition)
        : [],
      selectedGameChoice: requiresGameChoice ? roundData.gameChoice : null,
      values: isOrderPhase
      ? Array.from({ length: roundMaximum + 1 }, function (_, value) { return value; })
      : allowedActualValues,
      disabledValues: disabledOrderValues,
      onSelect: function (value, gameChoice) {
        if (enterValue(value, gameChoice)) {
          closeNumberPicker();
        }
      }
    };
  }

  function openNumberPicker(options) {
    numberPickerTitle.textContent = options.title;
    numberPickerPlayer.textContent = options.playerName;
    numberPickerHint.textContent = options.hint || "";
    numberPickerGameChoiceSection.classList.toggle("hidden", !options.requiresGameChoice);
    numberPickerValuesLabel.classList.toggle("hidden", !options.requiresGameChoice);
    numberPickerGameChoices.innerHTML = "";
    numberPickerValues.innerHTML = "";
    let selectedGameChoice = poker.normalizeOrderedGameChoice(options.selectedGameChoice);

    function renderValueButtons() {
      numberPickerValues.innerHTML = "";

      options.values.forEach(function (value) {
        const button = document.createElement("button");
        button.className = "value-button";
        button.type = "button";
        button.textContent = String(value);

        if (options.disabledValues.includes(value) || (options.requiresGameChoice && selectedGameChoice === null)) {
          button.disabled = true;
        }

        button.addEventListener("click", function () {
          options.onSelect(value, selectedGameChoice);
        });

        numberPickerValues.appendChild(button);
      });
    }

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
        numberPickerGameChoices.appendChild(button);
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
          renderValueButtons();
        });
      });
      renderSelectedGameChoice();
    }

    renderValueButtons();

    numberPickerOverlay.classList.remove("hidden");
    numberPickerOverlay.setAttribute("aria-hidden", "false");
    numberPickerDialog.focus();
  }

  function closeNumberPicker() {
    numberPickerOverlay.classList.add("hidden");
    numberPickerOverlay.setAttribute("aria-hidden", "true");
    numberPickerGameChoiceSection.classList.add("hidden");
    numberPickerValuesLabel.classList.add("hidden");
    numberPickerGameChoices.innerHTML = "";
    numberPickerValues.innerHTML = "";
    orderEditTurnIndex = null;
  }

  function isNumberPickerOpen() {
    return !numberPickerOverlay.classList.contains("hidden");
  }

  function openCurrentTurnNumberPicker() {
    orderEditTurnIndex = null;

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
    gameState.currentPhase = descriptor.requiresOrder && (result.ordered === null || !allOrdersEntered)
      ? "order"
      : "actual";
    openNumberPicker(getNumberPickerOptions());
  }

  function enterValue(value, gameChoice) {
    const roundMaximum = poker.getRoundMaximum(gameState, gameState.currentRoundKey);
    const activePlayer = getInputPlayer();
    const roundData = getCurrentRoundData();
    const result = roundData.results[activePlayer.id];

    if (!Number.isInteger(value) || value < 0 || value > roundMaximum) {
      return false;
    }

    let wasEntered = false;

    if (gameState.currentPhase === "order") {
      wasEntered = enterOrderValue(result, value, roundMaximum, gameChoice);
    } else {
      wasEntered = enterActualValue(result, value);
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

    if (!poker.isOrderAllowed(roundMaximum, value, previousOrders, isLastPlayer, {
      gameState,
      playerIndex: inputPlayerIndex,
      currentRoundKey: gameState.currentRoundKey
    })) {
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

  function enterActualValue(result, value) {
    const descriptor = getCurrentRoundDescriptor();
    if (descriptor.requiresOrder && result.ordered === null) {
      return false;
    }

    const roundMaximum = poker.getRoundMaximum(gameState, gameState.currentRoundKey);
    const previousActuals = getActualValuesBeforeTurn();

    if (!poker.isActualAllowed(roundMaximum, value, previousActuals)) {
      return false;
    }

    result.actual = value;
    setResultRoundScore(result, calculateResultScore(gameState, gameState.currentRoundKey, result.ordered, result.actual));
    clearActualValuesAfterTurn(gameState.currentRoundKey, gameState.currentTurnIndex);
    updateRoundTotals(gameState, gameState.currentRoundKey);

    if (getRemainingActualTricksThroughTurn(gameState.currentRoundKey, gameState.currentTurnIndex) === 0) {
      fillRemainingActualsWithZero(gameState.currentRoundKey, gameState.currentTurnIndex + 1);
      updateRoundTotals(gameState, gameState.currentRoundKey);
      advanceToNextRound();
      return true;
    }

    moveToNextTurn("actual");
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
    const remainingActual = poker.getRemainingActualTricks(roundMaximum, getActualValuesBeforeTurn());

    if (remainingActual === 0) {
      fillRemainingActualsWithZero(gameState.currentRoundKey, gameState.currentTurnIndex);
      updateRoundTotals(gameState, gameState.currentRoundKey);
      advanceToNextRound();
      return true;
    }

    if (gameState.currentTurnIndex !== gameState.playerCount - 1) {
      return false;
    }

    const activePlayer = getActivePlayer();
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

  function fillRemainingActualsWithZero(roundKey, startTurnIndex) {
    const roundData = gameState.rounds[roundKey];
    const order = poker.getPlayerOrderForRound(gameState, roundKey);

    order.slice(startTurnIndex).forEach(function (playerIndex) {
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

  function clearActualValuesAfterTurn(roundKey, turnIndex) {
    const roundData = gameState.rounds[roundKey];
    const order = poker.getPlayerOrderForRound(gameState, roundKey);

    order.slice(turnIndex + 1).forEach(function (playerIndex) {
      const player = gameState.players[playerIndex];
      roundData.results[player.id].actual = null;
      roundData.results[player.id].roundScore = null;
      roundData.results[player.id].totalScore = null;
    });
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

  function getRemainingActualTricksThroughTurn(roundKey, turnIndex) {
    const roundData = gameState.rounds[roundKey];
    const roundMaximum = poker.getRoundMaximum(gameState, roundKey);
    const order = poker.getPlayerOrderForRound(gameState, roundKey);
    const actualValues = order.slice(0, turnIndex + 1).map(function (playerIndex) {
      return roundData.results[gameState.players[playerIndex].id].actual;
    });

    return poker.getRemainingActualTricks(roundMaximum, actualValues);
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

      result.totalScore = calculateCumulativeScore(
        getPreviousRoundTotalScore(state, player.id, roundKey),
        result.roundScore
      );
    });
  }

  function isRoundEditable(roundKey) {
    return gameState && !gameState.chronologyComplete &&
      roundKey === gameState.currentRoundKey && isRoundUnlocked(roundKey);
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
    if (gameState.currentPhase !== "order") {
      return getActivePlayer();
    }

    return gameState.players[getInputPlayerIndex()];
  }

  function getInputPlayerIndex() {
    if (gameState.currentPhase !== "order") {
      return getActivePlayerIndex();
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

    return turnIndex === gameState.currentTurnIndex - 1 &&
      activeResult.ordered === null &&
      result.ordered !== null;
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

    return turnIndex === gameState.currentTurnIndex - 1 &&
      activeResult.ordered === null &&
      result.ordered !== null;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  document.querySelectorAll("input[name='playerCount']").forEach(function (radio) {
    radio.addEventListener("change", renderPlayerNameFields);
  });

  currentTurnButton.addEventListener("click", openCurrentTurnNumberPicker);
  numberPickerCloseButton.addEventListener("click", closeNumberPicker);
  numberPickerCancelButton.addEventListener("click", closeNumberPicker);
  numberPickerOverlay.addEventListener("click", function (event) {
    if (event.target === numberPickerOverlay) {
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
      const focusable = [finalNewGameButton, finalExitButton];
      const currentIndex = focusable.indexOf(document.activeElement);
      const nextIndex = event.shiftKey
        ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
        : (currentIndex === focusable.length - 1 ? 0 : currentIndex + 1);
      event.preventDefault();
      focusable[nextIndex].focus();
    }
  });

  resultsButton.addEventListener("click", openFinalResultsModal);
  finalExitButton.addEventListener("click", closeFinalResultsModal);
  finalNewGameButton.addEventListener("click", function () {
    startNewGameSetup();
  });

  startGameButton.addEventListener("click", function () {
    gameState = createGameState();
    storage.saveGame(gameState);
    showGame();
  });

  menuContinueButton.addEventListener("click", function () {
    gameState = normalizeLoadedGame(storage.loadGame());
    if (gameState) {
      storage.saveGame(gameState);
      showGame();
    }
  });

  newGameButton.addEventListener("click", function () {
    if (gameState && !gameState.chronologyComplete &&
      !window.confirm("Початок нової гри замінить поточну незавершену гру. Історія завершених ігор збережеться. Продовжити?")) {
      return;
    }
    startNewGameSetup({ preserveCurrentUntilStart: true });
  });

  gameMenuButton.addEventListener("click", function () {
    persistCurrentGame();
    closeNumberPicker();
    if (isFinalResultsOpen()) closeFinalResultsModal();
    showPokerMenu();
  });

  menuNewGameButton.addEventListener("click", function () {
    const savedGame = storage.loadGame();
    if (isLoadableGame(savedGame) && !savedGame.chronologyComplete &&
      !window.confirm("Початок нової гри замінить поточну незавершену гру. Історія завершених ігор збережеться. Продовжити?")) {
      showPokerMenu();
      return;
    }
    startNewGameSetup({ preserveCurrentUntilStart: true });
  });

  menuBackButton.addEventListener("click", showGameHub);
  setupBackButton.addEventListener("click", showPokerMenu);

  renderPlayerNameFields();
  mariageController = mariage.initialize({
    storage,
    screens: APP_SCREENS,
    navigate: showScreen,
    showHub: showGameHub
  });
  renderGameRegistry();
  showGameHub();
  registerServiceWorker();
})();
