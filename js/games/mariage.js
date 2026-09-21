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
      results: {}
    };
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
    if (!round || round.phase !== "physical-play" || !round.orderingPlayerId) throw new Error("Repaint is unavailable");
    const repaintEvent = applyRepaint(state, round.orderingPlayerId);
    round.repaint = true;
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

    function load() {
      const saved = storage.loadGameByType(GAME_TYPE);
      return saved && saved.gameType === GAME_TYPE ? saved : null;
    }

    function persist() {
      if (state) storage.saveGameByType(GAME_TYPE, state);
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
      elements.menuContinue.disabled = !load();
      navigate(screens.MARIAGE_MENU);
    }

    function requestNewGame() {
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

    function beginRound() {
      if (!state.activeRound) {
        state.activeRound = createRound(state);
        persist();
      }
      draftOrderingPlayerId = null;
      orderDialogOpen = true;
      render();
    }

    function selectOrderingPlayer(playerId) {
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
      state.activeRound.phase = "results";
      state.activeRound.resultPlayerIndex = null;
      state.activeRound.resolvedPlayerIds = getResolvedPlayerIds(state.activeRound);
      selectedResultPlayerId = null;
      persist();
      render();
    }

    function selectResultPlayer(playerId) {
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
      resolveRepaint(state);
      persist();
      render();
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

    function renderTable() {
      const head = document.createElement("thead");
      const headRow = document.createElement("tr");
      const body = document.createElement("tbody");
      const columns = document.createElement("colgroup");
      state.players.forEach(function (player) {
        const resultColumn = document.createElement("col");
        const scoreColumn = document.createElement("col");
        const playerHeader = document.createElement("th");
        resultColumn.className = "mariage-status-column";
        scoreColumn.className = "mariage-score-column";
        resultColumn.style.width = `${30 / state.players.length}%`;
        scoreColumn.style.width = `${70 / state.players.length}%`;
        columns.append(resultColumn, scoreColumn);
        playerHeader.textContent = player.name;
        playerHeader.className = "player-header mariage-player-header";
        playerHeader.colSpan = 2;
        headRow.appendChild(playerHeader);
      });
      head.appendChild(headRow);

      const rounds = state.rounds.concat(state.activeRound ? [state.activeRound] : []);
      rounds.forEach(function (round) {
        const row = document.createElement("tr");
        state.players.forEach(function (player) {
          const result = round.results[player.id];
          const resultCell = document.createElement("td");
          const scoreCell = document.createElement("td");
          resultCell.className = "result-cell mariage-result-cell";
          scoreCell.className = "score-cell";
          if (result) {
            appendResultContent(resultCell, result);
            scoreCell.textContent = String(result.cumulativeScore);
            if (isCycleComplete(state, player.id, "ski", result.skiCycleId) ||
              isCycleComplete(state, player.id, "repaint", result.repaintCycleId)) {
              resultCell.classList.add("completed-cycle");
            }
            if (result.semantic.repaintBeneficiary) resultCell.classList.add("neutral-result");
          } else if (round === state.activeRound && round.orderingPlayerId === player.id && round.orderPoints !== null) {
            resultCell.textContent = "--";
            scoreCell.textContent = String(round.orderPoints);
            scoreCell.classList.add("pending-order-score");
          } else {
            resultCell.textContent = "--";
          }
          row.append(resultCell, scoreCell);
        });
        body.appendChild(row);
      });
      if (rounds.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = state.players.length * 2;
        cell.className = "future-note";
        cell.textContent = "Почніть перший раунд";
        row.appendChild(cell);
        body.appendChild(row);
      }
      elements.table.replaceChildren(columns, head, body);
    }

    function render() {
      const round = state.activeRound;
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
        renderTable();
        return;
      }
      elements.roundLabel.textContent = round ? String(round.sequence) : state.rounds.length ? `Завершено ${state.rounds.length}` : "0";
      const orderingPlayer = round && getPlayer(state, round.orderingPlayerId || draftOrderingPlayerId);
      elements.orderingLabel.textContent = orderingPlayer ? orderingPlayer.name : "—";
      elements.orderLabel.textContent = round && round.orderPoints !== null ? String(round.orderPoints) : "—";
      const canOpenOrder = !round || (round.phase === "ordering-player" && !orderDialogOpen);
      elements.newRound.classList.toggle("hidden", !canOpenOrder);
      elements.newRound.textContent = round ? "Заказ" : "Новий раунд";
      elements.orderPlayerStep.classList.toggle("hidden", !round || round.phase !== "ordering-player" || !orderDialogOpen || Boolean(draftOrderingPlayerId));
      elements.orderPointsStep.classList.toggle("hidden", !round || round.phase !== "ordering-player" || !orderDialogOpen || !draftOrderingPlayerId);
      elements.playStep.classList.toggle("hidden", !round || round.phase !== "physical-play");
      elements.resultStep.classList.toggle("hidden", !round || round.phase !== "results");
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
      renderTable();
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
    document.getElementById("mariageConfirmActualButton").addEventListener("click", enterActual);
    document.getElementById("mariageBiteButton").addEventListener("click", function () { enterQuick("bite"); });
    document.getElementById("mariageBiteSkiButton").addEventListener("click", function () { enterQuick("bite-ski"); });
    document.getElementById("mariageSkiButton").addEventListener("click", function () { enterQuick("ski"); });
    document.getElementById("mariageResultBackButton").addEventListener("click", closeResultPlayer);
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
    applySki,
    applyRepaint,
    getResolvedPlayerIds,
    getUnresolvedPlayers,
    isValidOrderPoints,
    isValidActualPoints,
    resolvePlayerResult,
    resolveActual,
    resolveRepaint,
    getPresentation,
    isCycleComplete,
    initialize
  };
})();
