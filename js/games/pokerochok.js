(function () {
  "use strict";

  const STANDARD_ROUNDS = [1, 2, 3, 4, 5, 6, 7, 8];
  const GAME_LENGTHS = ["short", "full"];
  const BASE_DIRECTIONS = ["ascending", "descending"];
  const SUITS = ["♠", "♥", "♣", "♦"];
  const SUIT_DEFINITIONS = Object.freeze([
    Object.freeze({ id: "spades", symbol: "♠", name: "Піки", icon: "assets/suits/spades.svg" }),
    Object.freeze({ id: "hearts", symbol: "♥", name: "Черви", icon: "assets/suits/hearts.svg" }),
    Object.freeze({ id: "clubs", symbol: "♣", name: "Трефи", icon: "assets/suits/clubs.svg" }),
    Object.freeze({ id: "diamonds", symbol: "♦", name: "Бубни", icon: "assets/suits/diamonds.svg" })
  ]);
  const SUIT_IDS = Object.freeze(SUIT_DEFINITIONS.map(function (suit) { return suit.id; }));
  const ORDERED_GAME_CHOICES = Object.freeze(SUIT_IDS.concat("no-trump"));
  const NO_TRUMP_GAME_CHOICE = Object.freeze({
    id: "no-trump",
    symbol: "БК",
    name: "Без козира",
    icon: null
  });
  const SPECIAL_ROUND_CONFIG_BY_PLAYER_COUNT = Object.freeze({
    2: Object.freeze({ maxTricks: 10, roundCount: 2 }),
    3: Object.freeze({ maxTricks: 9, roundCount: 3 }),
    4: Object.freeze({ maxTricks: 8, roundCount: 4 })
  });
  const SPECIAL_ROUND_MAXIMUM_BY_PLAYER_COUNT = Object.freeze(Object.keys(SPECIAL_ROUND_CONFIG_BY_PLAYER_COUNT).reduce(function (maximums, playerCount) {
    maximums[playerCount] = SPECIAL_ROUND_CONFIG_BY_PLAYER_COUNT[playerCount].maxTricks;
    return maximums;
  }, {}));
  const SPECIAL_REPEAT_COUNT_BY_PLAYER_COUNT = Object.freeze(Object.keys(SPECIAL_ROUND_CONFIG_BY_PLAYER_COUNT).reduce(function (counts, playerCount) {
    counts[playerCount] = SPECIAL_ROUND_CONFIG_BY_PLAYER_COUNT[playerCount].roundCount;
    return counts;
  }, {}));
  const LOBIKY_MAX_TRICKS = 1;
  const LOBIKY_LABELS = Object.freeze(["Л₁", "Л₂", "Л₃", "Л₄"]);
  const DARK_LABELS = Object.freeze(["Т₁", "Т₂", "Т₃", "Т₄"]);
  const NO_TRUMP_LABELS = Object.freeze(["Б₁", "Б₂", "Б₃", "Б₄"]);
  const ORDERED_LABELS = Object.freeze(["&₁", "&₂", "&₃", "&₄"]);
  const MINES_LABELS = Object.freeze(["М₁", "М₂", "М₃", "М₄"]);
  const GOLDEN_LABELS = Object.freeze(["З₁", "З₂", "З₃", "З₄"]);
  const ROUND_TYPE_CONFIG = Object.freeze({
    base: Object.freeze({ keyPrefix: "base", label: null, requiresOrder: true, usesPassStreakRule: true, scoringType: "normal" }),
    suit: Object.freeze({ keyPrefix: "suit", label: null, requiresOrder: true, usesPassStreakRule: true, scoringType: "normal" }),
    lobiky: Object.freeze({ keyPrefix: "lobiky", label: "Л", name: "Лобіки", requiresOrder: true, usesPassStreakRule: true, scoringType: "normal" }),
    temni: Object.freeze({ keyPrefix: "dark", label: "Т", name: "Темні", requiresOrder: true, usesPassStreakRule: true, scoringType: "normal" }),
    bezkozyrka: Object.freeze({ keyPrefix: "no-trump", label: "Б", name: "Безкозирка", requiresOrder: true, usesPassStreakRule: true, scoringType: "normal" }),
    "ordered-trump": Object.freeze({ keyPrefix: "ordered", label: "&", name: "Заказні", requiresOrder: true, usesPassStreakRule: true, scoringType: "normal" }),
    mines: Object.freeze({ keyPrefix: "mines", label: "М", name: "Міни", requiresOrder: false, usesPassStreakRule: false, scoringType: "mines" }),
    golden: Object.freeze({ keyPrefix: "golden", label: "З", name: "Золоті", requiresOrder: false, usesPassStreakRule: false, scoringType: "golden" })
  });
  const REPEATED_SPECIAL_ROUND_TYPES = [];

  function assertSupportedPlayerCount(playerCount) {
    const count = Number(playerCount);
    if (![2, 3, 4].includes(count)) throw new Error("Unsupported player count");
    return count;
  }

  function getBaseRoundCount(playerCount, gameLength) {
    const count = assertSupportedPlayerCount(playerCount);
    const length = GAME_LENGTHS.includes(gameLength) ? gameLength : "full";
    if (count === 3) return length === "short" ? 3 : 6;
    return length === "short" ? 4 : 8;
  }

  function getBaseRoundNumbers(playerCount, gameLength) {
    return Array.from({ length: getBaseRoundCount(playerCount, gameLength) }, function (_, index) {
      return index + 1;
    });
  }

  function getBaseRoundKey(roundNumber, baseDirection) {
    const value = Number(roundNumber);
    const direction = baseDirection || "ascending";
    if (!Number.isInteger(value) || value < 1) throw new Error("Invalid base round number");
    if (!BASE_DIRECTIONS.includes(direction)) throw new Error("Invalid base round direction");
    return `base-${direction === "ascending" ? "up" : "down"}-${value}`;
  }

  function parseBaseRoundKey(roundKey) {
    const key = String(roundKey);
    const stableMatch = /^base-(up|down)-(\d+)$/.exec(key);

    if (stableMatch) {
      return {
        baseDirection: stableMatch[1] === "up" ? "ascending" : "descending",
        baseNumber: Number(stableMatch[2]),
        isLegacy: false
      };
    }

    const legacyMatch = /^base-(\d+)$/.exec(key);
    return legacyMatch
      ? { baseDirection: "ascending", baseNumber: Number(legacyMatch[1]), isLegacy: true }
      : null;
  }

  function getBaseRoundNumber(roundKey) {
    const identity = parseBaseRoundKey(roundKey);
    return identity ? identity.baseNumber : null;
  }

  function getBaseRoundDirection(roundKey) {
    const identity = parseBaseRoundKey(roundKey);
    return identity ? identity.baseDirection : null;
  }

  function getSpecialMaxTricks(playerCount) {
    return SPECIAL_ROUND_CONFIG_BY_PLAYER_COUNT[assertSupportedPlayerCount(playerCount)].maxTricks;
  }

  function getSpecialRoundCount(playerCount) {
    return SPECIAL_ROUND_CONFIG_BY_PLAYER_COUNT[assertSupportedPlayerCount(playerCount)].roundCount;
  }

  function getSpecialRoundMaximum(playerCount) {
    return getSpecialMaxTricks(playerCount);
  }

  function getSpecialRepeatCount(playerCount) {
    return getSpecialRoundCount(playerCount);
  }

  function getLobikyRoundCount(playerCount, gameLength) {
    const count = assertSupportedPlayerCount(playerCount);
    const length = GAME_LENGTHS.includes(gameLength) ? gameLength : "full";
    if (count === 2) return length === "short" ? 2 : 4;
    return count;
  }

  function getSuitRoundCount(playerCount) {
    return assertSupportedPlayerCount(playerCount) === 3 ? 3 : 4;
  }

  function getSuitDefinition(suitValue) {
    const value = String(suitValue);
    return SUIT_DEFINITIONS.find(function (suit) {
      return suit.id === value || suit.symbol === value;
    }) || null;
  }

  function getSuitSymbol(suitId) {
    const suit = getSuitDefinition(suitId);
    return suit ? suit.symbol : null;
  }

  function isOrderedGameChoice(gameChoice) {
    return ORDERED_GAME_CHOICES.includes(gameChoice);
  }

  function normalizeOrderedGameChoice(gameChoice) {
    return isOrderedGameChoice(gameChoice) ? gameChoice : null;
  }

  function getOrderedGameChoiceDefinition(gameChoice) {
    if (gameChoice === NO_TRUMP_GAME_CHOICE.id) return NO_TRUMP_GAME_CHOICE;
    return getSuitDefinition(gameChoice);
  }

  function normalizeSuitOrder(playerCount, suitOrder) {
    const count = assertSupportedPlayerCount(playerCount);

    if (count !== 3) {
      return SUIT_IDS.slice();
    }

    if (!Array.isArray(suitOrder) || suitOrder.length !== 3) {
      return null;
    }

    const normalized = suitOrder.map(function (suitValue) {
      const suit = getSuitDefinition(suitValue);
      return suit && suit.id;
    });

    return normalized.every(Boolean) && new Set(normalized).size === 3 ? normalized : null;
  }

  function createSuitOrder(playerCount, randomSource) {
    const count = assertSupportedPlayerCount(playerCount);
    const suitIds = SUIT_IDS.slice();

    if (count !== 3) {
      return suitIds;
    }

    const random = typeof randomSource === "function" ? randomSource : Math.random;
    for (let index = suitIds.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(random() * (index + 1));
      const temporarySuit = suitIds[index];
      suitIds[index] = suitIds[randomIndex];
      suitIds[randomIndex] = temporarySuit;
    }

    return suitIds.slice(0, 3);
  }

  function createRoundDescriptor(type, options) {
    const config = ROUND_TYPE_CONFIG[type];
    const descriptorOptions = options || {};
    if (!config) throw new Error("Unsupported round type");
    if (!Number.isInteger(descriptorOptions.sequenceIndex) || descriptorOptions.sequenceIndex < 0) {
      throw new Error("Invalid round sequence index");
    }
    if (!Number.isInteger(descriptorOptions.maximum) || descriptorOptions.maximum < 0) {
      throw new Error("Invalid round maximum");
    }

    const suit = type === "suit" ? getSuitDefinition(descriptorOptions.suit) : null;
    if (type === "suit" && !suit) throw new Error("Invalid suit round");

    const orderedGameChoiceSource = descriptorOptions.gameChoice === undefined
      ? descriptorOptions.trumpSuit
      : descriptorOptions.gameChoice;
    const gameChoice = type === "ordered-trump"
      ? normalizeOrderedGameChoice(orderedGameChoiceSource)
      : null;
    const descriptor = {
      key: String(descriptorOptions.key),
      type,
      label: String(descriptorOptions.label),
      sequenceIndex: descriptorOptions.sequenceIndex,
      maximum: descriptorOptions.maximum,
      name: config.name || null,
      requiresOrder: config.requiresOrder,
      usesPassStreakRule: config.usesPassStreakRule,
      scoringType: config.scoringType,
      suit: suit ? suit.id : null
    };

    if (type === "ordered-trump") {
      descriptor.gameChoice = gameChoice;
      descriptor.trumpSuit = gameChoice;
    }

    if (type === "base") {
      if (!BASE_DIRECTIONS.includes(descriptorOptions.baseDirection)) {
        throw new Error("Invalid base round direction");
      }
      if (!Number.isInteger(descriptorOptions.baseNumber) || descriptorOptions.baseNumber < 1) {
        throw new Error("Invalid base round number");
      }
      descriptor.baseDirection = descriptorOptions.baseDirection;
      descriptor.baseNumber = descriptorOptions.baseNumber;
    }

    return descriptor;
  }

  function createBaseRoundDescriptor(roundNumber, sequenceIndex, baseDirection) {
    const value = Number(roundNumber);
    const direction = baseDirection || "ascending";
    return createRoundDescriptor("base", {
      key: getBaseRoundKey(value, direction),
      label: value,
      sequenceIndex,
      maximum: value,
      baseDirection: direction,
      baseNumber: value
    });
  }

  function getSequenceOffset(sequenceOffset) {
    const offset = sequenceOffset === undefined ? 0 : Number(sequenceOffset);
    if (!Number.isInteger(offset) || offset < 0) throw new Error("Invalid sequence offset");
    return offset;
  }

  function buildAscendingBaseRounds(playerCount, gameLength, sequenceOffset) {
    const offset = getSequenceOffset(sequenceOffset);
    return getBaseRoundNumbers(playerCount, gameLength).map(function (roundNumber, sequenceIndex) {
      return createBaseRoundDescriptor(roundNumber, offset + sequenceIndex, "ascending");
    });
  }

  function buildSuitRounds(playerCount, sequenceOffset, selectedSuits) {
    const offset = getSequenceOffset(sequenceOffset);
    const suitCount = getSuitRoundCount(playerCount);
    const suits = selectedSuits === undefined
      ? SUIT_IDS.slice(0, suitCount)
      : normalizeSuitOrder(playerCount, selectedSuits);

    if (!suits || suits.length !== suitCount) {
      throw new Error("Invalid suit round selection");
    }

    return suits.map(function (suit, index) {
      return createSpecialRoundDescriptor("suit", index + 1, offset + index, playerCount, { suit });
    });
  }

  function buildDescendingBaseRounds(playerCount, gameLength, sequenceOffset) {
    const offset = getSequenceOffset(sequenceOffset);
    return getBaseRoundNumbers(playerCount, gameLength).reverse().map(function (roundNumber, sequenceIndex) {
      return createBaseRoundDescriptor(roundNumber, offset + sequenceIndex, "descending");
    });
  }

  function buildLobikyRounds(playerCount, gameLength, sequenceOffset) {
    const offset = getSequenceOffset(sequenceOffset);
    const roundCount = getLobikyRoundCount(playerCount, gameLength);
    return Array.from({ length: roundCount }, function (_, index) {
      return createSpecialRoundDescriptor("lobiky", index + 1, offset + index, playerCount, {
        label: LOBIKY_LABELS[index],
        maximum: LOBIKY_MAX_TRICKS
      });
    });
  }

  function buildSpecialRoundBlock(type, labels, playerCount, sequenceOffset) {
    const offset = getSequenceOffset(sequenceOffset);
    const roundCount = getSpecialRoundCount(playerCount);
    return Array.from({ length: roundCount }, function (_, index) {
      return createSpecialRoundDescriptor(type, index + 1, offset + index, playerCount, {
        label: labels[index]
      });
    });
  }

  function buildDarkRounds(playerCount, sequenceOffset) {
    return buildSpecialRoundBlock("temni", DARK_LABELS, playerCount, sequenceOffset);
  }

  function buildNoTrumpRounds(playerCount, sequenceOffset) {
    return buildSpecialRoundBlock("bezkozyrka", NO_TRUMP_LABELS, playerCount, sequenceOffset);
  }

  function buildOrderedRounds(playerCount, sequenceOffset) {
    return buildSpecialRoundBlock("ordered-trump", ORDERED_LABELS, playerCount, sequenceOffset);
  }

  function buildMinesRounds(playerCount, sequenceOffset) {
    return buildSpecialRoundBlock("mines", MINES_LABELS, playerCount, sequenceOffset);
  }

  function buildGoldenRounds(playerCount, sequenceOffset) {
    return buildSpecialRoundBlock("golden", GOLDEN_LABELS, playerCount, sequenceOffset);
  }

  function buildRepeatedSpecialRounds(playerCount, sequenceOffset) {
    const offset = getSequenceOffset(sequenceOffset);
    const repeatCount = getSpecialRoundCount(playerCount);
    let sequenceIndex = offset;

    return REPEATED_SPECIAL_ROUND_TYPES.reduce(function (rounds, type) {
      for (let occurrence = 1; occurrence <= repeatCount; occurrence += 1) {
        rounds.push(createSpecialRoundDescriptor(type, occurrence, sequenceIndex, playerCount));
        sequenceIndex += 1;
      }
      return rounds;
    }, []);
  }

  function getBaseRoundDescriptors(playerCount, gameLength) {
    return buildAscendingBaseRounds(playerCount, gameLength, 0);
  }

  function getPlayableRoundDescriptors(playerCount, gameLength, suitOrder) {
    const ascending = buildAscendingBaseRounds(playerCount, gameLength, 0);
    const suits = buildSuitRounds(playerCount, ascending.length, suitOrder);
    const descending = buildDescendingBaseRounds(playerCount, gameLength, ascending.length + suits.length);
    const lobiky = buildLobikyRounds(playerCount, gameLength, ascending.length + suits.length + descending.length);
    const dark = buildDarkRounds(playerCount, ascending.length + suits.length + descending.length + lobiky.length);
    const noTrump = buildNoTrumpRounds(playerCount, ascending.length + suits.length + descending.length + lobiky.length + dark.length);
    const ordered = buildOrderedRounds(playerCount, ascending.length + suits.length + descending.length + lobiky.length + dark.length + noTrump.length);
    const mines = buildMinesRounds(playerCount, ascending.length + suits.length + descending.length + lobiky.length + dark.length + noTrump.length + ordered.length);
    const golden = buildGoldenRounds(playerCount, ascending.length + suits.length + descending.length + lobiky.length + dark.length + noTrump.length + ordered.length + mines.length);
    return ascending.concat(suits, descending, lobiky, dark, noTrump, ordered, mines, golden);
  }

  function createSpecialRoundDescriptor(type, occurrence, sequenceIndex, playerCount, options) {
    const config = ROUND_TYPE_CONFIG[type];
    const descriptorOptions = options || {};
    const instance = Number(occurrence);
    if (!config || type === "base") throw new Error("Unsupported special round type");
    if (!Number.isInteger(instance) || instance < 1) throw new Error("Invalid special round occurrence");

    let key = `${config.keyPrefix}-${instance}`;
    let label = descriptorOptions.label === undefined ? config.label : descriptorOptions.label;
    if (type === "suit") {
      const suit = getSuitDefinition(descriptorOptions.suit);
      if (!suit) throw new Error("Invalid suit round");
      key = `suit-${suit.id}`;
      label = suit.symbol;
    }

    return createRoundDescriptor(type, {
      key,
      label,
      sequenceIndex,
      maximum: Number.isInteger(descriptorOptions.maximum)
        ? descriptorOptions.maximum
        : getSpecialMaxTricks(playerCount),
      gameChoice: descriptorOptions.gameChoice,
      trumpSuit: descriptorOptions.trumpSuit,
      suit: descriptorOptions.suit
    });
  }

  function getDescendingSummaryLabel(playerCount, gameLength) {
    return `${getBaseRoundCount(playerCount, gameLength)}–1`;
  }

  function getFutureRoundPlaceholders(playerCount, gameLength) {
    const repeatCount = getSpecialRoundCount(playerCount);
    const repeatedRows = REPEATED_SPECIAL_ROUND_TYPES.map(function (type) {
      return {
        key: `placeholder-${ROUND_TYPE_CONFIG[type].keyPrefix}`,
        label: `${ROUND_TYPE_CONFIG[type].label} ×${repeatCount}`
      };
    });
    return repeatedRows;
  }

  function getChronologicalRoundKeys(gameState) {
    if (!gameState || !gameState.rounds) return [];
    if (Array.isArray(gameState.roundOrder)) {
      return gameState.roundOrder.filter(function (roundKey) {
        return gameState.rounds[roundKey] !== undefined;
      });
    }

    return Object.keys(gameState.rounds).sort(function (first, second) {
      const firstNumber = Number(first);
      const secondNumber = Number(second);
      const firstIsNumber = Number.isFinite(firstNumber);
      const secondIsNumber = Number.isFinite(secondNumber);
      if (firstIsNumber && secondIsNumber) return firstNumber - secondNumber;
      return String(first).localeCompare(String(second));
    });
  }

  function getRoundDescriptor(gameState, roundKey) {
    if (!gameState || !gameState.rounds) return null;
    const key = String(roundKey);
    const roundData = gameState.rounds[key];
    if (!roundData) return null;

    const baseIdentity = parseBaseRoundKey(key);
    const type = roundData.type || (baseIdentity ? "base" : null);
    const config = ROUND_TYPE_CONFIG[type];
    if (!config) return null;

    const sequenceIndex = Number.isInteger(roundData.sequenceIndex)
      ? roundData.sequenceIndex
      : getChronologicalRoundKeys(gameState).indexOf(key);
    const baseRoundNumber = Number.isInteger(roundData.baseNumber)
      ? roundData.baseNumber
      : baseIdentity && baseIdentity.baseNumber;
    const baseDirection = BASE_DIRECTIONS.includes(roundData.baseDirection)
      ? roundData.baseDirection
      : baseIdentity && baseIdentity.baseDirection;
    const maximum = Number.isInteger(roundData.maximum)
      ? roundData.maximum
      : type === "base"
        ? baseRoundNumber
        : type === "lobiky" ? LOBIKY_MAX_TRICKS : getSpecialMaxTricks(gameState.playerCount);
    const suitKeyMatch = /^suit-(spades|hearts|clubs|diamonds)(?:-\d+)?$/.exec(key);
    const suit = type === "suit"
      ? getSuitDefinition(roundData.suit || (suitKeyMatch && suitKeyMatch[1]) || roundData.label)
      : null;
    if (sequenceIndex < 0 || maximum === null || !Number.isInteger(maximum)) return null;
    if (type === "base" && (!BASE_DIRECTIONS.includes(baseDirection) || !Number.isInteger(baseRoundNumber))) {
      return null;
    }
    if (type === "suit" && !suit) return null;

    return createRoundDescriptor(type, {
      key,
      label: roundData.label === undefined ? (type === "base" ? baseRoundNumber : config.label) : roundData.label,
      sequenceIndex,
      maximum,
      gameChoice: roundData.gameChoice === undefined ? roundData.trumpSuit : roundData.gameChoice,
      trumpSuit: roundData.trumpSuit,
      suit: suit && suit.id,
      baseDirection,
      baseNumber: baseRoundNumber
    });
  }

  function getRoundMaximum(gameStateOrDescriptor, roundKey) {
    if (gameStateOrDescriptor && gameStateOrDescriptor.rounds) {
      const descriptor = getRoundDescriptor(gameStateOrDescriptor, roundKey);
      if (!descriptor) throw new Error("Unknown round");
      return descriptor.maximum;
    }
    if (gameStateOrDescriptor && Number.isInteger(gameStateOrDescriptor.maximum)) {
      return gameStateOrDescriptor.maximum;
    }

    const legacyMaximum = Number(gameStateOrDescriptor);
    if (Number.isInteger(legacyMaximum) && legacyMaximum >= 0) return legacyMaximum;
    throw new Error("Unknown round maximum");
  }

  function getStartPlayerIndex(sequenceIndex, playerCount) {
    const count = assertSupportedPlayerCount(playerCount);
    const index = Number(sequenceIndex);
    if (!Number.isInteger(index) || index < 0) throw new Error("Invalid round sequence index");
    return index % count;
  }

  function getPlayerOrder(sequenceIndex, playerCount) {
    const count = assertSupportedPlayerCount(playerCount);
    const startPlayerIndex = getStartPlayerIndex(sequenceIndex, count);
    return Array.from({ length: count }, function (_, offset) {
      return (startPlayerIndex + offset) % count;
    });
  }

  function getPlayerOrderForRound(gameState, roundKey) {
    const descriptor = getRoundDescriptor(gameState, roundKey);
    return descriptor ? getPlayerOrder(descriptor.sequenceIndex, gameState.playerCount) : [];
  }

  function getForbiddenLastOrder(roundMaximum, previousOrders) {
    const previousOrdersSum = previousOrders.reduce(function (sum, order) {
      return sum + Number(order || 0);
    }, 0);
    const forbiddenOrder = roundMaximum - previousOrdersSum;
    return forbiddenOrder >= 0 && forbiddenOrder <= roundMaximum ? forbiddenOrder : null;
  }

  function getPreviousPlayedOrdersForPlayer(gameState, playerIndex, currentRoundKey) {
    if (!gameState || !Array.isArray(gameState.players) || !gameState.players[playerIndex]) return [];
    const playerId = gameState.players[playerIndex].id;
    const chronologicalRoundKeys = getChronologicalRoundKeys(gameState);
    const currentRoundIndex = chronologicalRoundKeys.indexOf(String(currentRoundKey));
    const previousRoundKeys = currentRoundIndex === -1
      ? chronologicalRoundKeys
      : chronologicalRoundKeys.slice(0, currentRoundIndex);

    return previousRoundKeys.reduce(function (orders, roundKey) {
      const roundData = gameState.rounds[roundKey];
      const result = roundData && roundData.results && roundData.results[playerId];
      if (result && result.ordered !== null && result.ordered !== undefined) orders.push(result.ordered);
      return orders;
    }, []);
  }

  function isPassAllowedForPlayer(gameState, playerIndex, currentRoundKey) {
    const descriptor = getRoundDescriptor(gameState, currentRoundKey);
    if (descriptor && !descriptor.usesPassStreakRule) return true;
    const previousOrders = getPreviousPlayedOrdersForPlayer(gameState, playerIndex, currentRoundKey);
    const recentOrders = previousOrders.slice(-2);
    return !(recentOrders.length === 2 && recentOrders[0] === 0 && recentOrders[1] === 0);
  }

  function getDisabledOrderValues(roundMaximum, previousOrders, isLastPlayer, options) {
    const disabledValues = [];
    const validationOptions = options || {};
    const currentRoundKey = validationOptions.currentRoundKey === undefined
      ? validationOptions.currentRound
      : validationOptions.currentRoundKey;

    if (
      validationOptions.gameState && Number.isInteger(validationOptions.playerIndex) &&
      currentRoundKey !== undefined &&
      !isPassAllowedForPlayer(validationOptions.gameState, validationOptions.playerIndex, currentRoundKey)
    ) disabledValues.push(0);

    if (isLastPlayer) {
      const forbiddenOrder = getForbiddenLastOrder(roundMaximum, previousOrders);
      if (forbiddenOrder !== null) disabledValues.push(forbiddenOrder);
    }

    return Array.from(new Set(disabledValues)).sort(function (first, second) {
      return first - second;
    });
  }

  function getAllowedOrderValues(roundMaximum, previousOrders, isLastPlayer, options) {
    const disabledValues = getDisabledOrderValues(roundMaximum, previousOrders, isLastPlayer, options);
    return Array.from({ length: roundMaximum + 1 }, function (_, value) {
      return value;
    }).filter(function (value) {
      return !disabledValues.includes(value);
    });
  }

  function isOrderAllowed(roundMaximum, orderValue, previousOrders, isLastPlayer, options) {
    const value = Number(orderValue);
    if (!Number.isInteger(value) || value < 0 || value > roundMaximum) return false;
    return !getDisabledOrderValues(roundMaximum, previousOrders, isLastPlayer, options).includes(value);
  }

  function getRoundOrderStatus(roundMaximum, orderedValues, requiresOrder) {
    const maximum = Number(roundMaximum);
    const values = Array.isArray(orderedValues) ? orderedValues : [];

    if (requiresOrder === false || !Number.isInteger(maximum) || maximum < 0) {
      return { visible: false };
    }

    const totalOrdered = values.reduce(function (total, value) {
      return total + Number(value || 0);
    }, 0);
    const isComplete = values.length > 0 && values.every(function (value) {
      return value !== null && value !== undefined;
    });
    const difference = isComplete ? totalOrdered - maximum : null;
    let classification = null;

    if (difference > 0) classification = "shortage";
    if (difference < 0) classification = "overage";

    return {
      visible: true,
      totalOrdered,
      maximum,
      isComplete,
      difference,
      classification
    };
  }

  function getRemainingActualTricks(roundMaximum, actualValues) {
    const assignedActualTricks = actualValues.reduce(function (sum, actual) {
      return sum + Number(actual || 0);
    }, 0);
    return Math.max(0, roundMaximum - assignedActualTricks);
  }

  function getAllowedActualValues(roundMaximum, actualValues) {
    const remainingTricks = getRemainingActualTricks(roundMaximum, actualValues);
    return Array.from({ length: remainingTricks + 1 }, function (_, value) {
      return value;
    });
  }

  function isActualAllowed(roundMaximum, actualValue, previousActualValues) {
    const value = Number(actualValue);
    const remainingTricks = getRemainingActualTricks(roundMaximum, previousActualValues);
    return Number.isInteger(value) && value >= 0 && value <= remainingTricks;
  }

  function calculateScore(ordered, actual) {
    if (ordered === 0 && actual === 0) return 5;
    if (actual === ordered) return actual * 10;
    if (actual < ordered) return -(ordered - actual) * 10;
    return actual;
  }

  function calculateMinesScore(actual) {
    return actual === 0 ? 10 : actual * -20;
  }

  function calculateGoldenScore(actual) {
    return actual === 0 ? -10 : actual * 20;
  }

  function calculateRoundScore(scoringType, ordered, actual) {
    if (scoringType === "mines") return calculateMinesScore(actual);
    if (scoringType === "golden") return calculateGoldenScore(actual);
    return calculateScore(ordered, actual);
  }

  window.Pokerochok = {
    STANDARD_ROUNDS,
    GAME_LENGTHS,
    BASE_DIRECTIONS,
    SUITS,
    SUIT_DEFINITIONS,
    SUIT_IDS,
    ORDERED_GAME_CHOICES,
    NO_TRUMP_GAME_CHOICE,
    SPECIAL_ROUND_CONFIG_BY_PLAYER_COUNT,
    SPECIAL_ROUND_MAXIMUM_BY_PLAYER_COUNT,
    SPECIAL_REPEAT_COUNT_BY_PLAYER_COUNT,
    LOBIKY_MAX_TRICKS,
    ROUND_TYPE_CONFIG,
    REPEATED_SPECIAL_ROUND_TYPES,
    getBaseRoundCount,
    getBaseRoundNumbers,
    getBaseRoundKey,
    parseBaseRoundKey,
    getBaseRoundNumber,
    getBaseRoundDirection,
    getBaseRoundDescriptors,
    getPlayableRoundDescriptors,
    getSpecialMaxTricks,
    getSpecialRoundCount,
    getSpecialRoundMaximum,
    getSpecialRepeatCount,
    getLobikyRoundCount,
    getSuitRoundCount,
    getSuitDefinition,
    getSuitSymbol,
    isOrderedGameChoice,
    normalizeOrderedGameChoice,
    getOrderedGameChoiceDefinition,
    normalizeSuitOrder,
    createSuitOrder,
    createRoundDescriptor,
    createBaseRoundDescriptor,
    createSpecialRoundDescriptor,
    buildAscendingBaseRounds,
    buildSuitRounds,
    buildDescendingBaseRounds,
    buildLobikyRounds,
    buildDarkRounds,
    buildNoTrumpRounds,
    buildOrderedRounds,
    buildMinesRounds,
    buildGoldenRounds,
    buildRepeatedSpecialRounds,
    getDescendingSummaryLabel,
    getFutureRoundPlaceholders,
    getRoundDescriptor,
    getRoundMaximum,
    getStartPlayerIndex,
    getPlayerOrder,
    getPlayerOrderForRound,
    getForbiddenLastOrder,
    getChronologicalRoundKeys,
    getPreviousPlayedOrdersForPlayer,
    isPassAllowedForPlayer,
    getDisabledOrderValues,
    getAllowedOrderValues,
    isOrderAllowed,
    getRoundOrderStatus,
    getRemainingActualTricks,
    getAllowedActualValues,
    isActualAllowed,
    calculateScore,
    calculateMinesScore,
    calculateGoldenScore,
    calculateRoundScore
  };
})();
