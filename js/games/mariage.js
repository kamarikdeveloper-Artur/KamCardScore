(function () {
  "use strict";

  const GAME_TYPE = "mariage";
  const MODES = Object.freeze(["three", "immediate"]);
  const SUPPORTED_PLAYER_COUNTS = Object.freeze([3, 4]);
  const MAXIMUM_POINTS_BY_PLAYER_COUNT = Object.freeze({ 3: 500, 4: 420 });
  const PRESENTATION = Object.freeze({
    success: Object.freeze({ fallback: "✅", asset: "assets/mariage/results/success.svg" }),
    bite: Object.freeze({ fallback: "Б", asset: "assets/mariage/results/bite.svg" }),
    ski1: Object.freeze({ fallback: "L1", asset: "assets/mariage/results/ski.svg" }),
    ski2: Object.freeze({ fallback: "L2", asset: "assets/mariage/results/ski.svg" }),
    ski3: Object.freeze({ fallback: "L3", asset: "assets/mariage/results/ski.svg" }),
    ski: Object.freeze({ fallback: "L", asset: "assets/mariage/results/ski.svg" }),
    repaint1: Object.freeze({ fallback: "Р1", asset: "assets/mariage/results/repaint.svg" }),
    repaint2: Object.freeze({ fallback: "Р2", asset: "assets/mariage/results/repaint.svg" }),
    repaint3: Object.freeze({ fallback: "Р3", asset: "assets/mariage/results/repaint.svg" }),
    repaint: Object.freeze({ fallback: "Р", asset: "assets/mariage/results/repaint.svg" }),
    biteSki: Object.freeze({ fallback: "🚫", asset: "assets/mariage/results/bite-ski.svg" }),
    repaintBeneficiary: Object.freeze({ fallback: "--", asset: null })
  });

  function createPlayerCycleState(players) {
    return players.reduce(function (map, player) {
      map[player.id] = {
        ski: { count: 0, cycleId: 1 },
        repaint: { count: 0, cycleId: 1 }
      };
      return map;
    }, {});
  }

  function isSupportedPlayerCount(playerCount) {
    return SUPPORTED_PLAYER_COUNTS.includes(Number(playerCount));
  }

  function getMaximumPoints(playerCount) {
    return MAXIMUM_POINTS_BY_PLAYER_COUNT[Number(playerCount)] || null;
  }

  function createGame(options) {
    const players = options.players.map(function (player, index) {
      return { id: player.id || `p${index + 1}`, name: player.name || `Гравець ${index + 1}`, score: 0 };
    });
    if (!isSupportedPlayerCount(players.length)) throw new Error("Mariage supports 3 or 4 players");
    if (!MODES.includes(options.skiMode) || !MODES.includes(options.repaintMode)) throw new Error("Invalid Mariage mode");
    return {
      id: options.id,
      gameType: GAME_TYPE,
      startedAt: options.startedAt,
      playerCount: players.length,
      players,
      settings: { skiMode: options.skiMode, repaintMode: options.repaintMode },
      cycleState: createPlayerCycleState(players),
      rounds: [],
      activeRound: null
    };
  }

  function createRound(state) {
    const sequence = state.rounds.length + 1;
    return {
      id: `round-${sequence}`,
      sequence,
      status: "open",
      phase: "ordering-player",
      orderingPlayerId: null,
      orderPoints: null,
      repaint: false,
      resultPlayerIndex: null,
      resolvedPlayerIds: [],
      results: {},
      primary: { resolution: "normal", actuals: {} },
      startState: {
        scores: state.players.reduce(function (scores, player) {
          scores[player.id] = player.score;
          return scores;
        }, {}),
        cycleState: JSON.parse(JSON.stringify(state.cycleState))
      }
    };
  }

  function getDealer(state) {
    if (!state || !state.players.length) return null;
    const sequence = state.activeRound ? state.activeRound.sequence : state.rounds.length + 1;
    return state.players[(sequence - 1) % state.players.length];
  }

  function restoreRoundStart(state, round) {
    if (!round || !round.startState) throw new Error("Round-start state is unavailable");
    state.players.forEach(function (player) {
      player.score = round.startState.scores[player.id];
    });
    state.cycleState = JSON.parse(JSON.stringify(round.startState.cycleState));
  }

  function replayLatestRound(state) {
    const round = state.activeRound || state.rounds[state.rounds.length - 1];
    if (!round) throw new Error("There is no round to replay");
    if (!round.startState) throw new Error("Round-start state is unavailable");
    if (!state.activeRound) state.rounds.pop();
    restoreRoundStart(state, round);
    state.activeRound = createRound(state);
    state.activeRound.id = round.id;
    state.activeRound.sequence = round.sequence;
    return state.activeRound;
  }

  function applySki(state, playerId) {
    const skiState = state.cycleState[playerId].ski;
    if (state.settings.skiMode === "immediate") {
      return { penalty: -50, cycleNumber: null, cycleId: null };
    }
    skiState.count += 1;
    const event = { penalty: skiState.count === 3 ? -100 : 0, cycleNumber: skiState.count, cycleId: skiState.cycleId };
    if (skiState.count === 3) {
      skiState.count = 0;
      skiState.cycleId += 1;
    }
    return event;
  }

  function applyRepaint(state, playerId) {
    const repaintState = state.cycleState[playerId].repaint;
    if (state.settings.repaintMode === "immediate") {
      return { penalty: -60, cycleNumber: null, cycleId: null };
    }
    repaintState.count += 1;
    const event = { penalty: repaintState.count === 3 ? -120 : 0, cycleNumber: repaintState.count, cycleId: repaintState.cycleId };
    if (repaintState.count === 3) {
      repaintState.count = 0;
      repaintState.cycleId += 1;
    }
    return event;
  }

  function getPlayer(state, playerId) {
    return state.players.find(function (player) { return player.id === playerId; });
  }

  function buildResult(state, playerId, options) {
    const player = getPlayer(state, playerId);
    const semantic = {
      success: Boolean(options.success),
      bite: Boolean(options.bite),
      ski: Boolean(options.ski),
      repaint: Boolean(options.repaint),
      repaintBeneficiary: Boolean(options.repaintBeneficiary)
    };
    const result = {
      playerId,
      actualPoints: options.actualPoints === undefined ? null : options.actualPoints,
      delta: options.delta,
      cumulativeScore: player.score + options.delta,
      semantic,
      skiCycleNumber: options.skiCycleNumber || null,
      skiCycleId: options.skiCycleId || null,
      repaintCycleNumber: options.repaintCycleNumber || null,
      repaintCycleId: options.repaintCycleId || null,
      scoreSourcePlayerId: options.scoreSourcePlayerId || null
    };
    player.score = result.cumulativeScore;
    return result;
  }

  function getResolvedPlayerIds(round) {
    return Object.keys(round && round.results ? round.results : {});
  }

  function getUnresolvedPlayers(state) {
    const round = state.activeRound;
    if (!round) return [];
    return state.players.filter(function (player) {
      return !round.results[player.id];
    });
  }

  function isValidOrderPoints(playerCount, orderPoints) {
    const value = Number(orderPoints);
    const maximum = getMaximumPoints(playerCount);
    return maximum !== null && Number.isFinite(value) && value >= 100 && value <= maximum && value % 5 === 0;
  }

  function isValidActualPoints(playerCount, actualPoints) {
    const value = Number(actualPoints);
    const maximum = getMaximumPoints(playerCount);
    return maximum !== null && Number.isFinite(value) && value >= 0 && value <= maximum;
  }

  function resolvePlayerResult(state, playerId, actualPoints, quickAction) {
    const round = state.activeRound;
    if (!round || round.phase !== "results") throw new Error("Mariage round is not accepting results");
    const player = getPlayer(state, playerId);
    if (!player) throw new Error("Unknown Mariage player");
    if (round.results[player.id]) throw new Error("Player result is already resolved");
    const isOrderingPlayer = player.id === round.orderingPlayerId;
    if ((quickAction === "bite" || quickAction === "bite-ski") && !isOrderingPlayer) {
      throw new Error("Only the ordering player can receive Bite");
    }
    if (quickAction === "ski" && isOrderingPlayer) {
      throw new Error("The ordering player must receive Bite with Ski");
    }

    let actual = actualPoints;
    let bite = quickAction === "bite" || quickAction === "bite-ski";
    let ski = quickAction === "bite-ski" || quickAction === "ski";
    let success = false;
    let delta = 0;

    if (!quickAction || quickAction === "ski") {
      if (quickAction === "ski") actual = 0;
      if (String(actualPoints).trim() === "") throw new Error("Actual points must be non-negative");
      actual = Number(actual);
      if (!isValidActualPoints(state.playerCount, actual)) throw new Error("Actual points are outside the allowed range");
      ski = actual === 0;
      if (isOrderingPlayer) {
        success = actual >= round.orderPoints;
        bite = !success;
      }
    }

    if (isOrderingPlayer) {
      delta += success ? round.orderPoints : -round.orderPoints;
    } else if (actual > 0) {
      delta += actual;
    }

    let skiEvent = null;
    if (ski) {
      skiEvent = applySki(state, player.id);
      delta += skiEvent.penalty;
    }

    round.results[player.id] = buildResult(state, player.id, {
      actualPoints: actual,
      delta,
      success,
      bite,
      ski,
      skiCycleNumber: skiEvent && skiEvent.cycleNumber,
      skiCycleId: skiEvent && skiEvent.cycleId
    });
    round.primary = round.primary || getRoundPrimary(round);
    round.primary.resolution = "normal";
    round.primary.actuals[player.id] = quickAction === "bite"
      ? { action: "bite", actualPoints: null }
      : { action: "actual", actualPoints: actual };
    round.resolvedPlayerIds = getResolvedPlayerIds(round);
    if (getUnresolvedPlayers(state).length === 0) finishRound(state);
    return round.results[player.id];
  }

  function resolveActual(state, actualPoints, quickAction) {
    const round = state.activeRound;
    if (!round) throw new Error("Mariage round is not accepting results");
    const indexedPlayer = Number.isInteger(round.resultPlayerIndex) ? state.players[round.resultPlayerIndex] : null;
    const player = indexedPlayer && !round.results[indexedPlayer.id] ? indexedPlayer : getUnresolvedPlayers(state)[0];
    if (!player) throw new Error("No unresolved Mariage players");
    return resolvePlayerResult(state, player.id, actualPoints, quickAction);
  }

  function resolveRepaint(state) {
    const round = state.activeRound;
    if (!round || !["physical-play", "results"].includes(round.phase) || !round.orderingPlayerId) {
      throw new Error("Repaint is unavailable");
    }
    if (round.phase === "results" && getResolvedPlayerIds(round).length) {
      restoreRoundStart(state, round);
      round.results = {};
      round.resolvedPlayerIds = [];
    }
    const repaintEvent = applyRepaint(state, round.orderingPlayerId);
    round.repaint = true;
    round.primary = { resolution: "repaint", actuals: {} };
    state.players.forEach(function (player) {
      const isOrderingPlayer = player.id === round.orderingPlayerId;
      round.results[player.id] = buildResult(state, player.id, {
        actualPoints: null,
        delta: isOrderingPlayer ? repaintEvent.penalty : 60,
        repaint: isOrderingPlayer,
        repaintBeneficiary: !isOrderingPlayer,
        repaintCycleNumber: isOrderingPlayer ? repaintEvent.cycleNumber : null,
        repaintCycleId: isOrderingPlayer ? repaintEvent.cycleId : null,
        scoreSourcePlayerId: isOrderingPlayer ? null : round.orderingPlayerId
      });
    });
    round.resolvedPlayerIds = getResolvedPlayerIds(round);
    finishRound(state);
    return round;
  }

  function finishRound(state) {
    const round = state.activeRound;
    round.status = "resolved";
    round.phase = "resolved";
    round.resultPlayerIndex = null;
    state.rounds.push(round);
    state.activeRound = null;
  }

  function getRoundPrimary(round) {
    if (round.primary) return JSON.parse(JSON.stringify(round.primary));
    const primary = { resolution: round.repaint ? "repaint" : "normal", actuals: {} };
    if (primary.resolution === "repaint") return primary;
    Object.keys(round.results || {}).forEach(function (playerId) {
      const result = round.results[playerId];
      if (result.actualPoints === null && result.semantic && result.semantic.bite && !result.semantic.ski) {
        primary.actuals[playerId] = { action: "bite", actualPoints: null };
      } else {
        primary.actuals[playerId] = { action: "actual", actualPoints: result.actualPoints };
      }
    });
    return primary;
  }

  function recalculateMariageGame(gameDraft) {
    const source = JSON.parse(JSON.stringify(gameDraft));
    if (!isSupportedPlayerCount(source.playerCount) || source.players.length !== source.playerCount ||
      !MODES.includes(source.settings.skiMode) || !MODES.includes(source.settings.repaintMode)) {
      throw new Error("Некоректні налаштування гри.");
    }
    const playerIds = source.players.map(function (player) { return player.id; });
    if (new Set(playerIds).size !== playerIds.length) throw new Error("Повторюються ідентифікатори гравців.");
    const rebuilt = JSON.parse(JSON.stringify(source));
    rebuilt.players.forEach(function (player) { player.score = 0; });
    rebuilt.cycleState = createPlayerCycleState(rebuilt.players);
    rebuilt.rounds = [];
    rebuilt.activeRound = null;
    const rounds = source.rounds.concat(source.activeRound ? [source.activeRound] : []);

    rounds.forEach(function (original, index) {
      const completed = index < source.rounds.length;
      if (original.sequence !== index + 1 || typeof original.id !== "string") {
        throw new Error("Порушено порядок раундів.");
      }
      const primary = getRoundPrimary(original);
      if (!["normal", "repaint"].includes(primary.resolution) ||
        !primary.actuals || typeof primary.actuals !== "object" || Array.isArray(primary.actuals)) {
        throw new Error(`Некоректні дані раунду ${original.sequence}.`);
      }
      const round = createRound(rebuilt);
      round.id = original.id;
      rebuilt.activeRound = round;
      const hasOrder = original.orderingPlayerId !== null || original.orderPoints !== null;
      if (hasOrder) {
        if (!playerIds.includes(original.orderingPlayerId) ||
          !isValidOrderPoints(rebuilt.playerCount, original.orderPoints)) {
          throw new Error(`Некоректний заказ у раунді ${original.sequence}.`);
        }
        round.orderingPlayerId = original.orderingPlayerId;
        round.orderPoints = original.orderPoints;
      } else if (completed || Object.keys(primary.actuals).length) {
        throw new Error(`Не вказано заказ у раунді ${original.sequence}.`);
      }
      if (primary.resolution === "repaint") {
        if (!hasOrder || !completed || Object.keys(primary.actuals).length) {
          throw new Error(`Некоректний розпис у раунді ${original.sequence}.`);
        }
        round.phase = "physical-play";
        resolveRepaint(rebuilt);
      } else {
        const inputIds = Object.keys(primary.actuals);
        if (inputIds.some(function (id) { return !playerIds.includes(id); }) ||
          (completed && inputIds.length !== playerIds.length)) {
          throw new Error(`Некоректні результати раунду ${original.sequence}.`);
        }
        if (inputIds.length) round.phase = "results";
        playerIds.forEach(function (playerId) {
          if (!Object.prototype.hasOwnProperty.call(primary.actuals, playerId)) return;
          const input = primary.actuals[playerId];
          if (input.action === "bite") {
            if (playerId !== round.orderingPlayerId) throw new Error("Байт доступний лише тому, хто заказує.");
            resolvePlayerResult(rebuilt, playerId, null, "bite");
          } else if (input.action === "actual" &&
            input.actualPoints !== null && input.actualPoints !== "" &&
            isValidActualPoints(rebuilt.playerCount, input.actualPoints)) {
            resolvePlayerResult(rebuilt, playerId, input.actualPoints, null);
          } else {
            throw new Error(`Некоректне Взято у раунді ${original.sequence}.`);
          }
        });
        if (completed && rebuilt.activeRound) throw new Error(`Раунд ${original.sequence} не завершений.`);
        if (!completed && !rebuilt.activeRound) throw new Error("Поточний раунд не може бути завершеним.");
        if (!completed && rebuilt.activeRound) {
          if (!["ordering-player", "physical-play", "results"].includes(original.phase)) {
            throw new Error("Некоректна фаза поточного раунду.");
          }
          if (inputIds.length && original.phase !== "results") {
            throw new Error("Результати внесено поза фазою Взято.");
          }
          rebuilt.activeRound.phase = original.phase;
          rebuilt.activeRound.primary = primary;
        }
      }
    });
    return rebuilt;
  }

  function getPresentationKey(result, settings) {
    if (!result) return null;
    if (result.semantic.repaintBeneficiary) return "repaintBeneficiary";
    if (result.semantic.repaint) return settings.repaintMode === "immediate" ? "repaint" : `repaint${result.repaintCycleNumber}`;
    if (result.semantic.bite && result.semantic.ski) return "biteSki";
    if (result.semantic.bite) return "bite";
    if (result.semantic.ski) return settings.skiMode === "immediate" ? "ski" : `ski${result.skiCycleNumber}`;
    if (result.semantic.success) return "success";
    return null;
  }

  function getPresentation(result, settings) {
    const key = getPresentationKey(result, settings);
    return key ? { key, fallback: PRESENTATION[key].fallback, asset: PRESENTATION[key].asset } : null;
  }

  function isCycleComplete(state, playerId, type, cycleId) {
    if (!cycleId || state.settings[`${type}Mode`] !== "three") return false;
    const numberKey = `${type}CycleNumber`;
    const idKey = `${type}CycleId`;
    return state.rounds.some(function (round) {
      const result = round.results[playerId];
      return result && result[idKey] === cycleId && result[numberKey] === 3;
    });
  }

  function initialize(options) {
    const storage = options.storage;
    const screens = options.screens;
    const navigate = options.navigate;
    const elements = {
      menuContinue: document.getElementById("mariageMenuContinueButton"),
      setupNames: document.getElementById("mariagePlayerNameFields"),
      dealer: document.getElementById("mariageDealer"),
      replay: document.getElementById("mariageReplayButton"),
      replayDialog: document.getElementById("mariageReplayDialog"),
      replayNo: document.getElementById("mariageReplayNoButton"),
      replayYes: document.getElementById("mariageReplayYesButton"),
      actionPanel: document.getElementById("mariageActionPanel"),
      editButton: document.getElementById("mariageEditButton"),
      editToolbar: document.getElementById("mariageEditToolbar"),
      editError: document.getElementById("mariageEditError"),
      editApply: document.getElementById("mariageEditApplyButton"),
      editDiscard: document.getElementById("mariageEditDiscardButton"),
      editConfirm: document.getElementById("mariageEditConfirmDialog"),
      editConfirmTitle: document.getElementById("mariageEditConfirmTitle"),
      editConfirmDescription: document.getElementById("mariageEditConfirmDescription"),
      editConfirmNo: document.getElementById("mariageEditConfirmNo"),
      editConfirmYes: document.getElementById("mariageEditConfirmYes"),
      valueEditor: document.getElementById("mariageValueEditor"),
      valueFields: document.getElementById("mariageValueFields"),
      valueError: document.getElementById("mariageValueError"),
      valueCancel: document.getElementById("mariageValueCancel"),
      valueSave: document.getElementById("mariageValueSave"),
      gameMenu: document.getElementById("mariageGameMenuButton"),
      gameNew: document.getElementById("mariageGameNewButton"),
      roundLabel: document.getElementById("mariageRoundLabel"),
      orderingLabel: document.getElementById("mariageOrderingLabel"),
      orderLabel: document.getElementById("mariageOrderLabel"),
      newRound: document.getElementById("mariageNewRoundButton"),
      orderPlayerStep: document.getElementById("mariageOrderPlayerStep"),
      orderingPlayers: document.getElementById("mariageOrderingPlayers"),
      orderPointsStep: document.getElementById("mariageOrderPointsStep"),
      orderPoints: document.getElementById("mariageOrderPoints"),
      playStep: document.getElementById("mariagePlayStep"),
      resultStep: document.getElementById("mariageResultStep"),
      unresolvedStep: document.getElementById("mariageUnresolvedStep"),
      unresolvedPlayers: document.getElementById("mariageUnresolvedPlayers"),
      selectedResultStep: document.getElementById("mariageSelectedResultStep"),
      selectedPlayerRole: document.getElementById("mariageSelectedPlayerRole"),
      currentPlayer: document.getElementById("mariageCurrentPlayer"),
      actualPoints: document.getElementById("mariageActualPoints"),
      orderingQuickActions: document.getElementById("mariageOrderingQuickActions"),
      nonOrderingQuickActions: document.getElementById("mariageNonOrderingQuickActions"),
      message: document.getElementById("mariageMessage"),
      table: document.getElementById("mariageScoreTable")
    };
    let state = null;
    let draftOrderingPlayerId = null;
    let orderDialogOpen = false;
    let selectedResultPlayerId = null;
    let replayPreviousFocus = null;
    let editDraft = null;
    let editDirty = false;
    let confirmAction = null;
    let valueTarget = null;
    let lastTouch = { key: null, at: 0 };
    let lastTouchActivationAt = 0;

    function load() {
      const saved = storage.loadGameByType(GAME_TYPE);
      return saved && saved.gameType === GAME_TYPE ? saved : null;
    }

    function persist() {
      if (state && !editDraft) storage.saveGameByType(GAME_TYPE, state);
    }

    function selectedValue(name) {
      return document.querySelector(`input[name='${name}']:checked`).value;
    }

    function renderNameFields() {
      const count = Number(selectedValue("mariagePlayerCount"));
      const existing = Array.from(elements.setupNames.querySelectorAll("input")).map(function (input) { return input.value; });
      elements.setupNames.replaceChildren();
      for (let index = 0; index < count; index += 1) {
        const wrapper = document.createElement("div");
        const label = document.createElement("label");
        const input = document.createElement("input");
        wrapper.className = "name-field";
        label.htmlFor = `mariagePlayerName${index + 1}`;
        label.textContent = `Гравець ${index + 1}`;
        input.id = label.htmlFor;
        input.type = "text";
        input.maxLength = 10;
        input.value = existing[index] || `Гравець ${index + 1}`;
        wrapper.append(label, input);
        elements.setupNames.appendChild(wrapper);
      }
    }

    function showMenu() {
      if (editDraft) return;
      elements.menuContinue.disabled = !load();
      navigate(screens.MARIAGE_MENU);
    }

    function requestNewGame() {
      if (editDraft) return;
      const saved = load();
      if (saved && !window.confirm("Початок нової гри замінить поточну гру Мар'яж. Продовжити?")) {
        showMenu();
        return;
      }
      state = null;
      navigate(screens.MARIAGE_SETUP);
    }

    function startGame() {
      const names = Array.from(elements.setupNames.querySelectorAll("input"));
      state = createGame({
        id: storage.createGameId(),
        startedAt: new Date().toISOString(),
        skiMode: selectedValue("mariageSkiMode"),
        repaintMode: selectedValue("mariageRepaintMode"),
        players: names.map(function (input, index) {
          return { id: `p${index + 1}`, name: input.value.trim().slice(0, 10) };
        })
      });
      persist();
      showGame();
    }

    function continueGame() {
      state = load();
      if (state) {
        if (!isSupportedPlayerCount(state.playerCount)) {
          selectedResultPlayerId = null;
          showGame();
          return;
        }
        const round = state.activeRound;
        let migrated = false;
        if (round) {
          round.results = round.results || {};
          const resolvedPlayerIds = getResolvedPlayerIds(round);
          if (JSON.stringify(round.resolvedPlayerIds || []) !== JSON.stringify(resolvedPlayerIds)) {
            round.resolvedPlayerIds = resolvedPlayerIds;
            migrated = true;
          }
          if (round.resultPlayerIndex !== null) {
            round.resultPlayerIndex = null;
            migrated = true;
          }
          if (round.phase === "order-points" && round.orderPoints === null) {
            draftOrderingPlayerId = round.orderingPlayerId;
            round.orderingPlayerId = null;
            round.phase = "ordering-player";
            orderDialogOpen = true;
            migrated = true;
          }
        }
        if (migrated) persist();
        selectedResultPlayerId = null;
        showGame();
      }
    }

    function showGame() {
      navigate(screens.MARIAGE_GAME);
      render();
    }

    function setMessage(message) {
      elements.message.textContent = message || "";
    }

    function closeEditConfirm() {
      elements.editConfirm.classList.add("hidden");
      elements.editConfirm.setAttribute("aria-hidden", "true");
      confirmAction = null;
    }

    function showEditConfirm(title, description, noLabel, yesLabel, action) {
      elements.editConfirmTitle.textContent = title;
      elements.editConfirmDescription.textContent = description;
      elements.editConfirmNo.textContent = noLabel;
      elements.editConfirmYes.textContent = yesLabel;
      confirmAction = action;
      elements.editConfirm.classList.remove("hidden");
      elements.editConfirm.setAttribute("aria-hidden", "false");
      elements.editConfirmNo.focus();
    }

    function enterEditMode() {
      if (editDraft || !isSupportedPlayerCount(state.playerCount)) return;
      showEditConfirm("Редагувати таблицю?", "Перехід у режим редагування дозволить змінювати внесені дані.", "Ні", "Так", function () {
        editDraft = JSON.parse(JSON.stringify(state));
        editDraft.rounds.concat(editDraft.activeRound ? [editDraft.activeRound] : []).forEach(function (round) {
          round.primary = getRoundPrimary(round);
        });
        editDirty = false;
        elements.editError.textContent = "";
        render();
      });
    }

    function leaveEditMode() {
      editDraft = null;
      editDirty = false;
      elements.editError.textContent = "";
      render();
    }

    function discardEditMode() {
      if (!editDraft) return;
      if (!editDirty) {
        leaveEditMode();
        return;
      }
      showEditConfirm("Скасувати редагування?", "Усі незбережені зміни буде втрачено.", "Ні", "Так", leaveEditMode);
    }

    function requestApplyEdits() {
      if (!editDraft) return;
      showEditConfirm("Застосувати зміни?", "Після підтвердження результати та бали буде перераховано.", "Скасувати", "Застосувати", function () {
        try {
          const recalculated = recalculateMariageGame(editDraft);
          storage.saveGameByType(GAME_TYPE, recalculated);
          state = recalculated;
          editDraft = null;
          editDirty = false;
          elements.editError.textContent = "";
          render();
        } catch (error) {
          elements.editError.textContent = error.message;
        }
      });
    }

    function getDraftRound(sequence) {
      return editDraft.rounds.concat(editDraft.activeRound ? [editDraft.activeRound] : [])
        .find(function (round) { return round.sequence === sequence; });
    }

    function closeValueEditor() {
      elements.valueEditor.classList.add("hidden");
      elements.valueEditor.setAttribute("aria-hidden", "true");
      valueTarget = null;
    }

    function addValueField(labelText, fieldName, kind, value, choices) {
      const label = document.createElement("label");
      const control = document.createElement(kind === "select" ? "select" : "input");
      label.textContent = labelText;
      control.name = fieldName;
      if (kind === "select") {
        choices.forEach(function (choice) {
          const option = document.createElement("option");
          option.value = choice.value;
          option.textContent = choice.label;
          control.appendChild(option);
        });
      } else {
        control.type = "number";
        control.inputMode = "decimal";
      }
      control.value = value === null || value === undefined ? "" : String(value);
      label.appendChild(control);
      elements.valueFields.appendChild(label);
      return control;
    }

    function openValueEditor(target) {
      valueTarget = target;
      const round = getDraftRound(target.sequence);
      elements.valueFields.replaceChildren();
      elements.valueError.textContent = "";
      if (target.field === "player") {
        addValueField("Хто заказує", "player", "select", round.orderingPlayerId,
          editDraft.players.map(function (player) { return { value: player.id, label: player.name }; }));
      } else if (target.field === "order") {
        addValueField("Сума заказу", "order", "number", round.orderPoints);
      } else if (target.field === "actual") {
        const input = round.primary.actuals[target.playerId];
        if (target.playerId === round.orderingPlayerId) {
          addValueField("Тип результату", "action", "select", input.action,
            [{ value: "actual", label: "Фактично взято" }, { value: "bite", label: "Байт без Лижі" }]);
        }
        addValueField("Фактично взято", "actual", "number", input.actualPoints);
      } else if (target.field === "resolution") {
        const resolution = addValueField("Результат раунду", "resolution", "select", round.primary.resolution,
          [{ value: "normal", label: "Взято" }, { value: "repaint", label: "Розпис" }]);
        const actualFields = document.createElement("div");
        actualFields.className = "mariage-value-fields";
        elements.valueFields.appendChild(actualFields);
        editDraft.players.forEach(function (player) {
          const input = round.primary.actuals[player.id];
          const label = document.createElement("label");
          const control = document.createElement("input");
          label.textContent = `Взято: ${player.name}`;
          control.type = "number";
          control.inputMode = "decimal";
          control.name = `actual-${player.id}`;
          control.value = input && input.action === "actual" ? String(input.actualPoints) : "";
          label.appendChild(control);
          actualFields.appendChild(label);
        });
        const toggleFields = function () { actualFields.classList.toggle("hidden", resolution.value !== "normal"); };
        resolution.addEventListener("change", toggleFields);
        toggleFields();
      }
      elements.valueEditor.classList.remove("hidden");
      elements.valueEditor.setAttribute("aria-hidden", "false");
      elements.valueFields.querySelector("input, select").focus();
    }

    function saveValueEdit() {
      if (!editDraft || !valueTarget) return;
      const round = getDraftRound(valueTarget.sequence);
      const field = function (name) { return elements.valueFields.querySelector(`[name="${name}"]`); };
      if (valueTarget.field === "player") {
        round.orderingPlayerId = field("player").value;
      } else if (valueTarget.field === "order") {
        round.orderPoints = field("order").value === "" ? null : Number(field("order").value);
      } else if (valueTarget.field === "actual") {
        const action = field("action") ? field("action").value : "actual";
        const raw = field("actual").value;
        round.primary.actuals[valueTarget.playerId] = {
          action,
          actualPoints: action === "bite" ? null : raw === "" ? null : Number(raw)
        };
      } else if (valueTarget.field === "resolution") {
        const resolution = field("resolution").value;
        round.primary.resolution = resolution;
        round.primary.actuals = {};
        if (resolution === "normal") {
          editDraft.players.forEach(function (player) {
            const raw = field(`actual-${player.id}`).value;
            round.primary.actuals[player.id] = { action: "actual", actualPoints: raw === "" ? null : Number(raw) };
          });
        }
      }
      editDirty = true;
      closeValueEditor();
      try {
        editDraft = recalculateMariageGame(editDraft);
        elements.editError.textContent = "";
      } catch (error) {
        elements.editError.textContent = error.message;
      }
      render();
    }

    function requestValueEdit(target) {
      if (!editDraft) return;
      showEditConfirm("Редагувати дані?", "Ви дійсно бажаєте змінити внесені дані?", "Ні", "Так", function () {
        openValueEditor(target);
      });
    }

    function bindDoubleActivation(button, target) {
      const key = `${target.sequence}:${target.field}:${target.playerId || ""}`;
      button.addEventListener("dblclick", function () {
        if (Date.now() - lastTouchActivationAt < 500) return;
        requestValueEdit(target);
      });
      button.addEventListener("pointerup", function (event) {
        if (event.pointerType !== "touch") return;
        const now = Date.now();
        if (lastTouch.key === key && now - lastTouch.at < 400) {
          lastTouch = { key: null, at: 0 };
          lastTouchActivationAt = now;
          requestValueEdit(target);
        } else {
          lastTouch = { key, at: now };
        }
      });
    }

    function beginRound() {
      if (editDraft) return;
      if (!state.activeRound) {
        state.activeRound = createRound(state);
        persist();
      }
      draftOrderingPlayerId = null;
      orderDialogOpen = true;
      render();
    }

    function selectOrderingPlayer(playerId) {
      if (editDraft) return;
      draftOrderingPlayerId = playerId;
      render();
      elements.orderPoints.focus();
    }

    function cancelOrder() {
      draftOrderingPlayerId = null;
      orderDialogOpen = false;
      elements.orderPoints.value = "";
      setMessage("");
      render();
    }

    function confirmOrder() {
      if (editDraft) return;
      if (elements.orderPoints.value.trim() === "") {
        setMessage("Введіть числову суму заказу.");
        return;
      }
      const orderPoints = Number(elements.orderPoints.value);
      if (!isValidOrderPoints(state.playerCount, orderPoints)) {
        setMessage(`Для ${state.playerCount} гравців заказ має бути від 100 до ${getMaximumPoints(state.playerCount)} і кратним 5.`);
        return;
      }
      if (!draftOrderingPlayerId) {
        setMessage("Введіть числову суму заказу.");
        return;
      }
      state.activeRound.orderingPlayerId = draftOrderingPlayerId;
      state.activeRound.orderPoints = orderPoints;
      state.activeRound.phase = "physical-play";
      draftOrderingPlayerId = null;
      orderDialogOpen = false;
      elements.orderPoints.value = "";
      setMessage("");
      persist();
      render();
    }

    function beginResults() {
      if (editDraft) return;
      state.activeRound.phase = "results";
      state.activeRound.resultPlayerIndex = null;
      state.activeRound.resolvedPlayerIds = getResolvedPlayerIds(state.activeRound);
      selectedResultPlayerId = null;
      persist();
      render();
    }

    function selectResultPlayer(playerId) {
      if (editDraft) return;
      if (!state.activeRound.results[playerId]) {
        selectedResultPlayerId = playerId;
        setMessage("");
        render();
        elements.actualPoints.focus();
      }
    }

    function closeResultPlayer() {
      selectedResultPlayerId = null;
      elements.actualPoints.value = "";
      setMessage("");
      render();
    }

    function enterActual() {
      if (editDraft) return;
      try {
        const value = elements.actualPoints.value;
        if (value.trim() === "" || !isValidActualPoints(state.playerCount, value)) {
          setMessage(`Для ${state.playerCount} гравців бали мають бути від 0 до ${getMaximumPoints(state.playerCount)}.`);
          return;
        }
        resolvePlayerResult(state, selectedResultPlayerId, elements.actualPoints.value, null);
        elements.actualPoints.value = "";
        selectedResultPlayerId = null;
        setMessage("");
        persist();
        render();
      } catch (error) {
        setMessage(error.message);
      }
    }

    function enterQuick(action) {
      if (editDraft) return;
      try {
        const actual = action === "bite-ski" || action === "ski" ? 0 : null;
        resolvePlayerResult(state, selectedResultPlayerId, actual, action);
        selectedResultPlayerId = null;
        setMessage("");
        persist();
        render();
      } catch (error) {
        setMessage(error.message);
      }
    }

    function repaintRound() {
      if (editDraft) return;
      try {
        resolveRepaint(state);
        selectedResultPlayerId = null;
        elements.actualPoints.value = "";
        setMessage("");
        persist();
        render();
      } catch (error) {
        setMessage(error.message);
      }
    }

    function closeReplayDialog() {
      elements.replayDialog.classList.add("hidden");
      elements.replayDialog.setAttribute("aria-hidden", "true");
      if (replayPreviousFocus) replayPreviousFocus.focus();
      replayPreviousFocus = null;
    }

    function openReplayDialog() {
      if (editDraft) return;
      replayPreviousFocus = document.activeElement;
      elements.replayDialog.classList.remove("hidden");
      elements.replayDialog.setAttribute("aria-hidden", "false");
      elements.replayNo.focus();
    }

    function confirmReplay() {
      if (editDraft) return;
      try {
        replayLatestRound(state);
        draftOrderingPlayerId = null;
        selectedResultPlayerId = null;
        orderDialogOpen = false;
        elements.orderPoints.value = "";
        elements.actualPoints.value = "";
        setMessage("");
        persist();
        closeReplayDialog();
        render();
      } catch (error) {
        closeReplayDialog();
        setMessage(error.message);
      }
    }

    function renderOrderingButtons() {
      elements.orderingPlayers.replaceChildren();
      state.players.forEach(function (player) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "secondary-button";
        button.textContent = player.name;
        button.addEventListener("click", function () { selectOrderingPlayer(player.id); });
        elements.orderingPlayers.appendChild(button);
      });
    }

    function renderUnresolvedButtons() {
      elements.unresolvedPlayers.replaceChildren();
      getUnresolvedPlayers(state).forEach(function (player) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "secondary-button";
        button.textContent = player.name;
        button.addEventListener("click", function () { selectResultPlayer(player.id); });
        elements.unresolvedPlayers.appendChild(button);
      });
    }

    function appendResultContent(cell, result) {
      const presentation = getPresentation(result, state.settings);
      if (!presentation) {
        cell.textContent = "--";
        return;
      }
      const fallback = document.createElement("span");
      fallback.textContent = presentation.fallback;
      cell.appendChild(fallback);
      if (presentation.asset) {
        const image = document.createElement("img");
        image.className = "mariage-result-icon hidden";
        image.alt = presentation.fallback;
        image.addEventListener("load", function () { image.classList.remove("hidden"); fallback.classList.add("hidden"); });
        image.addEventListener("error", function () { image.remove(); });
        image.src = presentation.asset;
        cell.appendChild(image);
      }
    }

    function renderEditInputRow(body, round, displayState) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      const values = document.createElement("div");
      row.className = "mariage-edit-input-row";
      cell.colSpan = displayState.players.length * 2;
      values.className = "mariage-edit-values";
      const addValue = function (label, field, playerId) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "mariage-edit-value";
        button.textContent = label;
        button.title = "Двічі натисніть, щоб змінити";
        button.dataset.field = field;
        button.dataset.round = String(round.sequence);
        if (playerId) button.dataset.playerId = playerId;
        bindDoubleActivation(button, { sequence: round.sequence, field, playerId });
        values.appendChild(button);
      };
      const orderingPlayer = displayState.players.find(function (player) { return player.id === round.orderingPlayerId; });
      if (orderingPlayer) {
        addValue(`Заказує: ${orderingPlayer.name}`, "player");
        addValue(`Заказ: ${round.orderPoints}`, "order");
      }
      if (displayState.rounds.includes(round)) {
        addValue(`Результат: ${round.primary.resolution === "repaint" ? "Розпис" : "Взято"}`, "resolution");
      }
      if (round.primary.resolution === "normal") {
        displayState.players.forEach(function (player) {
          const input = round.primary.actuals[player.id];
          if (!input) return;
          addValue(`${player.name}: ${input.action === "bite" ? "Байт" : input.actualPoints}`, "actual", player.id);
        });
      }
      cell.appendChild(values);
      row.appendChild(cell);
      body.appendChild(row);
    }

    function renderTable(displayState) {
      const head = document.createElement("thead");
      const headRow = document.createElement("tr");
      const body = document.createElement("tbody");
      const columns = document.createElement("colgroup");
      displayState.players.forEach(function (player) {
        const resultColumn = document.createElement("col");
        const scoreColumn = document.createElement("col");
        const playerHeader = document.createElement("th");
        resultColumn.className = "mariage-status-column";
        scoreColumn.className = "mariage-score-column";
        resultColumn.style.width = `${30 / displayState.players.length}%`;
        scoreColumn.style.width = `${70 / displayState.players.length}%`;
        columns.append(resultColumn, scoreColumn);
        playerHeader.textContent = player.name;
        playerHeader.className = "player-header mariage-player-header";
        playerHeader.colSpan = 2;
        headRow.appendChild(playerHeader);
      });
      head.appendChild(headRow);

      const rounds = displayState.rounds.concat(displayState.activeRound ? [displayState.activeRound] : []);
      rounds.forEach(function (round) {
        const row = document.createElement("tr");
        displayState.players.forEach(function (player) {
          const result = round.results[player.id];
          const resultCell = document.createElement("td");
          const scoreCell = document.createElement("td");
          resultCell.className = "result-cell mariage-result-cell";
          scoreCell.className = "score-cell";
          if (result) {
            appendResultContent(resultCell, result);
            scoreCell.textContent = String(result.cumulativeScore);
            if (isCycleComplete(displayState, player.id, "ski", result.skiCycleId) ||
              isCycleComplete(displayState, player.id, "repaint", result.repaintCycleId)) {
              resultCell.classList.add("completed-cycle");
            }
            if (result.semantic.repaintBeneficiary) resultCell.classList.add("neutral-result");
          } else if (round === displayState.activeRound && round.orderingPlayerId === player.id && round.orderPoints !== null) {
            resultCell.textContent = "--";
            scoreCell.textContent = String(round.orderPoints);
            scoreCell.classList.add("pending-order-score");
          } else {
            resultCell.textContent = "--";
          }
          row.append(resultCell, scoreCell);
        });
        body.appendChild(row);
        if (editDraft) renderEditInputRow(body, round, displayState);
      });
      if (rounds.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = displayState.players.length * 2;
        cell.className = "future-note";
        cell.textContent = "Почніть перший раунд";
        row.appendChild(cell);
        body.appendChild(row);
      }
      elements.table.replaceChildren(columns, head, body);
    }

    function render() {
      const viewState = editDraft || state;
      const round = viewState.activeRound;
      const editing = Boolean(editDraft);
      elements.actionPanel.classList.toggle("hidden", editing);
      elements.editToolbar.classList.toggle("hidden", !editing);
      elements.editButton.classList.toggle("active", editing);
      elements.editButton.classList.toggle("hidden", !isSupportedPlayerCount(state.playerCount));
      elements.editButton.disabled = editing;
      elements.gameMenu.disabled = editing;
      elements.gameNew.disabled = editing;
      const dealer = getDealer(viewState);
      elements.dealer.textContent = dealer ? `Роздає: ${dealer.name}` : "";
      const replayTarget = round || viewState.rounds[viewState.rounds.length - 1];
      elements.replay.classList.toggle("hidden", editing || !isSupportedPlayerCount(state.playerCount) ||
        !replayTarget || !replayTarget.startState ||
        (round && !round.orderingPlayerId && round.orderPoints === null && !getResolvedPlayerIds(round).length));
      if (!isSupportedPlayerCount(state.playerCount)) {
        elements.roundLabel.textContent = "—";
        elements.orderingLabel.textContent = "—";
        elements.orderLabel.textContent = "—";
        elements.newRound.classList.add("hidden");
        elements.orderPlayerStep.classList.add("hidden");
        elements.orderPointsStep.classList.add("hidden");
        elements.playStep.classList.add("hidden");
        elements.resultStep.classList.add("hidden");
        setMessage("Це збереження має 2 гравців. Поточні правила Мар'яж підтримують лише 3 або 4 гравців.");
        renderTable(editDraft || state);
        return;
      }
      elements.roundLabel.textContent = round ? String(round.sequence) : viewState.rounds.length ? `Завершено ${viewState.rounds.length}` : "0";
      const orderingPlayer = round && getPlayer(viewState, round.orderingPlayerId || draftOrderingPlayerId);
      elements.orderingLabel.textContent = orderingPlayer ? orderingPlayer.name : "—";
      elements.orderLabel.textContent = round && round.orderPoints !== null ? String(round.orderPoints) : "—";
      const canOpenOrder = !round || (round.phase === "ordering-player" && !orderDialogOpen);
      elements.newRound.classList.toggle("hidden", !canOpenOrder);
      elements.newRound.textContent = round ? "Заказ" : "Новий раунд";
      elements.orderPlayerStep.classList.toggle("hidden", !round || round.phase !== "ordering-player" || !orderDialogOpen || Boolean(draftOrderingPlayerId));
      elements.orderPointsStep.classList.toggle("hidden", !round || round.phase !== "ordering-player" || !orderDialogOpen || !draftOrderingPlayerId);
      elements.playStep.classList.toggle("hidden", !round || round.phase !== "physical-play");
      elements.resultStep.classList.toggle("hidden", !round || round.phase !== "results");
      elements.resultStep.querySelector("#mariageResultRepaintButton").classList.toggle("hidden", !round || round.phase !== "results");
      if (round && round.phase === "ordering-player" && orderDialogOpen && !draftOrderingPlayerId) renderOrderingButtons();
      if (round && round.phase === "ordering-player" && draftOrderingPlayerId) {
        elements.orderPoints.min = "100";
        elements.orderPoints.max = String(getMaximumPoints(state.playerCount));
        elements.orderPoints.step = "5";
      }
      if (round && round.phase === "results") {
        if (selectedResultPlayerId && round.results[selectedResultPlayerId]) selectedResultPlayerId = null;
        const player = getPlayer(state, selectedResultPlayerId);
        elements.unresolvedStep.classList.toggle("hidden", Boolean(player));
        elements.selectedResultStep.classList.toggle("hidden", !player);
        renderUnresolvedButtons();
        if (player) {
          const isOrderingPlayer = player.id === round.orderingPlayerId;
          elements.currentPlayer.textContent = player.name;
          elements.selectedPlayerRole.textContent = isOrderingPlayer ? "Гравець, який заказує" : "Результат гравця";
          elements.orderingQuickActions.classList.toggle("hidden", !isOrderingPlayer);
          elements.nonOrderingQuickActions.classList.toggle("hidden", isOrderingPlayer);
          elements.actualPoints.min = "0";
          elements.actualPoints.max = String(getMaximumPoints(state.playerCount));
          elements.actualPoints.step = "any";
        }
      }
      renderTable(viewState);
    }

    document.querySelectorAll("input[name='mariagePlayerCount']").forEach(function (radio) {
      radio.addEventListener("change", renderNameFields);
    });
    document.getElementById("mariageMenuNewButton").addEventListener("click", requestNewGame);
    elements.menuContinue.addEventListener("click", continueGame);
    document.getElementById("mariageMenuBackButton").addEventListener("click", options.showHub);
    document.getElementById("mariageSetupBackButton").addEventListener("click", showMenu);
    document.getElementById("mariageStartButton").addEventListener("click", startGame);
    document.getElementById("mariageGameMenuButton").addEventListener("click", function () { persist(); showMenu(); });
    document.getElementById("mariageGameNewButton").addEventListener("click", requestNewGame);
    elements.newRound.addEventListener("click", beginRound);
    document.getElementById("mariageConfirmOrderButton").addEventListener("click", confirmOrder);
    document.getElementById("mariageCancelOrderButton").addEventListener("click", cancelOrder);
    document.getElementById("mariageTakenButton").addEventListener("click", beginResults);
    document.getElementById("mariageRepaintButton").addEventListener("click", repaintRound);
    document.getElementById("mariageResultRepaintButton").addEventListener("click", repaintRound);
    elements.replay.addEventListener("click", openReplayDialog);
    elements.replayNo.addEventListener("click", closeReplayDialog);
    elements.replayYes.addEventListener("click", confirmReplay);
    document.getElementById("mariageConfirmActualButton").addEventListener("click", enterActual);
    document.getElementById("mariageBiteButton").addEventListener("click", function () { enterQuick("bite"); });
    document.getElementById("mariageBiteSkiButton").addEventListener("click", function () { enterQuick("bite-ski"); });
    document.getElementById("mariageSkiButton").addEventListener("click", function () { enterQuick("ski"); });
    document.getElementById("mariageResultBackButton").addEventListener("click", closeResultPlayer);
    elements.editButton.addEventListener("click", enterEditMode);
    elements.editDiscard.addEventListener("click", discardEditMode);
    elements.editApply.addEventListener("click", requestApplyEdits);
    elements.editConfirmNo.addEventListener("click", closeEditConfirm);
    elements.editConfirmYes.addEventListener("click", function () {
      const action = confirmAction;
      closeEditConfirm();
      if (action) action();
    });
    elements.valueCancel.addEventListener("click", closeValueEditor);
    elements.valueSave.addEventListener("click", saveValueEdit);
    renderNameFields();

    return { showMenu, continueGame, requestNewGame };
  }

  window.Mariage = {
    GAME_TYPE,
    MODES,
    SUPPORTED_PLAYER_COUNTS,
    MAXIMUM_POINTS_BY_PLAYER_COUNT,
    PRESENTATION,
    isSupportedPlayerCount,
    getMaximumPoints,
    createPlayerCycleState,
    createGame,
    createRound,
    getDealer,
    replayLatestRound,
    applySki,
    applyRepaint,
    getResolvedPlayerIds,
    getUnresolvedPlayers,
    isValidOrderPoints,
    isValidActualPoints,
    resolvePlayerResult,
    resolveActual,
    resolveRepaint,
    getRoundPrimary,
    recalculateMariageGame,
    getPresentation,
    isCycleComplete,
    initialize
  };
})();
