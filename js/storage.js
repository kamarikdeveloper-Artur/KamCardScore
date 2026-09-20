(function () {
  "use strict";

  const CURRENT_GAME_KEY = "cardscore.currentGame";
  const GAME_HISTORY_KEY = "cardscore.gameHistory";

  function saveGame(gameState) {
    localStorage.setItem(CURRENT_GAME_KEY, JSON.stringify(gameState));
  }

  function loadGame() {
    const rawState = localStorage.getItem(CURRENT_GAME_KEY);

    if (!rawState) {
      return null;
    }

    try {
      return JSON.parse(rawState);
    } catch (error) {
      return null;
    }
  }

  function clearGame() {
    localStorage.removeItem(CURRENT_GAME_KEY);
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
      const recordGameType = record && record.gameType ? record.gameType : "pokerochok";
      return recordGameType === gameType;
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
    GAME_HISTORY_KEY,
    saveGame,
    loadGame,
    clearGame,
    createGameId,
    loadGameHistory,
    getHistoryByGameType,
    archiveCompletedGame
  };
})();
