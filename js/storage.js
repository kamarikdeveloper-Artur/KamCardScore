(function () {
  "use strict";

  const CURRENT_GAME_KEY = "cardscore.currentGame";
  const MARIAGE_CURRENT_GAME_KEY = "cardscore.currentGame.mariage";
  const GAME_HISTORY_KEY = "cardscore.gameHistory";
  const POKER_GAME_TYPE = "poker";
  const LEGACY_POKER_GAME_TYPE = "poker" + "ochok";

  function normalizeGameType(gameType) {
    if (!gameType || gameType === LEGACY_POKER_GAME_TYPE) return POKER_GAME_TYPE;
    return gameType;
  }

  function getCurrentGameKey(gameType) {
    return gameType === "mariage" ? MARIAGE_CURRENT_GAME_KEY : CURRENT_GAME_KEY;
  }

  function saveGameByType(gameType, gameState) {
    localStorage.setItem(getCurrentGameKey(gameType), JSON.stringify(gameState));
  }

  function loadGameByType(gameType) {
    const rawState = localStorage.getItem(getCurrentGameKey(gameType));
    if (!rawState) return null;
    try {
      return JSON.parse(rawState);
    } catch (error) {
      return null;
    }
  }

  function clearGameByType(gameType) {
    localStorage.removeItem(getCurrentGameKey(gameType));
  }

  function saveGame(gameState) {
    saveGameByType(POKER_GAME_TYPE, gameState);
  }

  function loadGame() {
    return loadGameByType(POKER_GAME_TYPE);
  }

  function clearGame() {
    clearGameByType(POKER_GAME_TYPE);
  }

  function createGameId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `game-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }

  function loadGameHistory() {
    const rawHistory = localStorage.getItem(GAME_HISTORY_KEY);
    if (!rawHistory) return [];

    try {
      const history = JSON.parse(rawHistory);
      return Array.isArray(history) ? history : [];
    } catch (error) {
      return [];
    }
  }

  function getHistoryByGameType(gameType) {
    return loadGameHistory().filter(function (record) {
      const recordGameType = normalizeGameType(record && record.gameType);
      return recordGameType === normalizeGameType(gameType);
    });
  }

  function archiveCompletedGame(snapshot) {
    if (!snapshot || typeof snapshot.id !== "string" || snapshot.id.length === 0) {
      throw new Error("Completed game snapshot requires a stable ID");
    }

    const history = loadGameHistory();
    const existingRecord = history.find(function (record) {
      return record && record.id === snapshot.id;
    });

    if (existingRecord) {
      return { inserted: false, record: existingRecord };
    }

    history.push(snapshot);
    localStorage.setItem(GAME_HISTORY_KEY, JSON.stringify(history));
    return { inserted: true, record: snapshot };
  }

  window.CardScoreStorage = {
    CURRENT_GAME_KEY,
    MARIAGE_CURRENT_GAME_KEY,
    GAME_HISTORY_KEY,
    POKER_GAME_TYPE,
    normalizeGameType,
    getCurrentGameKey,
    saveGameByType,
    loadGameByType,
    clearGameByType,
    saveGame,
    loadGame,
    clearGame,
    createGameId,
    loadGameHistory,
    getHistoryByGameType,
    archiveCompletedGame
  };
})();
