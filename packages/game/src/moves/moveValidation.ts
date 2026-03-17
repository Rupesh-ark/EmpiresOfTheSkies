import { MyGameState, MoveError } from "../types";
import {
  MAX_COUNSELLORS,
  MAX_FACTORIES,
  MAX_CATHEDRALS,
  MAX_PALACES,
  MAX_SHIPYARDS,
  MAX_SKYSHIPS_PER_FLEET,
  MAX_LEVIES,
  BASE_PRISONERS,
  MORE_PRISONS_BONUS,
  PUNISH_GOLD_COST,
  BuildingSlot,
  CounsellorSlot,
  KINGDOM_LOCATION,
} from "../codifiedGameInfo";
import { PlayerOrder } from "../types";

/**
 * Centralized pre-move validation. Each move declares what resources it
 * requires via `opts`, and this function checks whether the move is
 * allowed given the current game state (counsellors, event restrictions, etc.).
 *
 * Returns MoveError if blocked, null if allowed.
 *
 * To add a new restriction (e.g. from a new event card), add it here —
 * no need to touch individual move files.
 */
export const validateMove = (
  playerID: string,
  G: MyGameState,
  opts: { costsCounsellor?: boolean; costsGold?: boolean } = {}
): MoveError | null => {
  // Counsellor placement check
  if (opts.costsCounsellor && G.playerInfo[playerID].resources.counsellors === 0) {
    return { code: "NO_COUNSELLORS", message: "No Counsellors available to place" };
  }

  // Lenders Refuse Credit: players with outstanding debt cannot spend gold
  if (
    opts.costsGold &&
    G.eventState.lendersRefuseCredit.includes(playerID) &&
    G.playerInfo[playerID].resources.gold < 0
  ) {
    return { code: "CREDIT_REFUSED", message: "Lenders have refused your Kingdom further credit" };
  }

  return null;
};

// ── Per-move validators ───────────────────────────────────────────────────────
// Each validator mirrors the pre-state-mutation checks of its move file.
// Returns MoveError | null. Move files call these then return INVALID_MOVE if
// the result is non-null. The frontend can call the same function to show a
// toast message without attempting the move.

export const validateTrainTroops = (
  G: MyGameState,
  playerID: string
): MoveError | null => {
  const base = validateMove(playerID, G, { costsCounsellor: true });
  if (base) return base;

  if (G.playerInfo[playerID].playerBoardCounsellorLocations.trainTroops) {
    return { code: "ALREADY_TRAINED", message: "Troops have already been trained this round" };
  }

  return null;
};

export const validateBuildSkyships = (
  G: MyGameState,
  playerID: string,
  perShipyard: number
): MoveError | null => {
  const base = validateMove(playerID, G, { costsCounsellor: true, costsGold: true });
  if (base) return base;

  if (G.playerInfo[playerID].shipyards === 0) {
    return { code: "NO_SHIPYARDS", message: "Your Kingdom has no Shipyards" };
  }

  if (G.playerInfo[playerID].playerBoardCounsellorLocations.buildSkyships) {
    return { code: "ALREADY_BUILT", message: "Skyships have already been built this round" };
  }

  if (perShipyard !== 1 && perShipyard !== 2) {
    return { code: "INVALID_PRODUCTION_RATE", message: "Choose 1 or 2 Skyships per Shipyard" };
  }

  const total = perShipyard * G.playerInfo[playerID].shipyards;
  if (G.playerInfo[playerID].resources.gold < total) {
    return {
      code: "INSUFFICIENT_GOLD",
      message: `Not enough Gold — need ${total}, have ${G.playerInfo[playerID].resources.gold}`,
    };
  }

  return null;
};

export const validateConscriptLevies = (
  G: MyGameState,
  playerID: string,
  levyAmount: number
): MoveError | null => {
  if (G.playerInfo[playerID].playerBoardCounsellorLocations.conscriptLevies) {
    return { code: "ALREADY_CONSCRIPTED", message: "Levies have already been conscripted this round" };
  }

  const base = validateMove(playerID, G, { costsCounsellor: true });
  if (base) return base;

  if (levyAmount <= 0) {
    return { code: "INVALID_LEVY_AMOUNT", message: "Must conscript at least 1 Levy" };
  }

  if (G.playerInfo[playerID].resources.levies + levyAmount > MAX_LEVIES) {
    return {
      code: "LEVY_CAP_EXCEEDED",
      message: `Cannot exceed ${MAX_LEVIES} Levies — you have ${G.playerInfo[playerID].resources.levies}`,
    };
  }

  return null;
};

export const validateDeployFleet = (
  G: MyGameState,
  playerID: string,
  selectedFleetIndex: number,
  destination: [number, number],
  skyshipCount: number,
  regimentCount: number,
  levyCount: number
): MoveError | null => {
  const base = validateMove(playerID, G, { costsCounsellor: true, costsGold: true });
  if (base) return base;

  const currentPlayer = G.playerInfo[playerID];
  const fleet = currentPlayer.fleetInfo[selectedFleetIndex];

  if (!fleet) {
    return { code: "INVALID_FLEET", message: "No fleet found at that index" };
  }

  const atHome =
    fleet.location[0] === KINGDOM_LOCATION[0] &&
    fleet.location[1] === KINGDOM_LOCATION[1];

  if (atHome) {
    if (currentPlayer.resources.skyships < skyshipCount) {
      return {
        code: "INSUFFICIENT_SKYSHIPS",
        message: `Not enough Skyships — need ${skyshipCount}, have ${currentPlayer.resources.skyships}`,
      };
    }
    if (currentPlayer.resources.regiments < regimentCount) {
      return {
        code: "INSUFFICIENT_REGIMENTS",
        message: `Not enough Regiments — need ${regimentCount}, have ${currentPlayer.resources.regiments}`,
      };
    }
    if (currentPlayer.resources.levies < levyCount) {
      return {
        code: "INSUFFICIENT_LEVIES",
        message: `Not enough Levies — need ${levyCount}, have ${currentPlayer.resources.levies}`,
      };
    }
  }

  if (skyshipCount === 0) {
    return { code: "NO_SKYSHIPS_ASSIGNED", message: "A fleet must have at least 1 Skyship" };
  }

  if (skyshipCount > MAX_SKYSHIPS_PER_FLEET) {
    return {
      code: "FLEET_SIZE_EXCEEDED",
      message: `A fleet may carry at most ${MAX_SKYSHIPS_PER_FLEET} Skyships`,
    };
  }

  if (regimentCount + levyCount > skyshipCount) {
    return {
      code: "TROOP_CAPACITY_EXCEEDED",
      message: "Cannot carry more troops than Skyships (1 troop per Skyship)",
    };
  }

  // Note: destination validity (pathfinding) is checked inside deployFleet itself
  // because findPossibleDestinations is a server-side helper. The frontend can
  // call findPossibleDestinations independently to validate before calling this.

  return null;
};

export const validatePassFleetInfo = (
  G: MyGameState,
  playerID: string,
  fleetId: number,
  skyshipCount: number,
  regimentCount: number,
  levyCount: number,
  eliteRegimentCount: number
): MoveError | null => {
  const currentPlayer = G.playerInfo[playerID];
  const currentFleet = currentPlayer.fleetInfo[fleetId];

  if (!currentFleet || fleetId !== currentFleet.fleetId) {
    return { code: "INVALID_FLEET", message: "No fleet found with that ID" };
  }

  const atHome =
    currentFleet.location[0] === KINGDOM_LOCATION[0] &&
    currentFleet.location[1] === KINGDOM_LOCATION[1];

  if (atHome) {
    if (currentPlayer.resources.skyships < skyshipCount) {
      return {
        code: "INSUFFICIENT_SKYSHIPS",
        message: `Not enough Skyships — need ${skyshipCount}, have ${currentPlayer.resources.skyships}`,
      };
    }
    if (currentPlayer.resources.regiments < regimentCount) {
      return {
        code: "INSUFFICIENT_REGIMENTS",
        message: `Not enough Regiments — need ${regimentCount}, have ${currentPlayer.resources.regiments}`,
      };
    }
    if (currentPlayer.resources.levies < levyCount) {
      return {
        code: "INSUFFICIENT_LEVIES",
        message: `Not enough Levies — need ${levyCount}, have ${currentPlayer.resources.levies}`,
      };
    }
    if (currentPlayer.resources.eliteRegiments < eliteRegimentCount) {
      return {
        code: "INSUFFICIENT_ELITE_REGIMENTS",
        message: `Not enough Elite Regiments — need ${eliteRegimentCount}, have ${currentPlayer.resources.eliteRegiments}`,
      };
    }
    if (skyshipCount < regimentCount + levyCount + eliteRegimentCount) {
      return {
        code: "TROOP_CAPACITY_EXCEEDED",
        message: "Cannot carry more troops than Skyships (1 troop per Skyship)",
      };
    }
  }

  return null;
};

export const validatePurchaseSkyships = (
  G: MyGameState,
  playerID: string,
  slotIndex: number,
  republic: "zeeland" | "venoa"
): MoveError | null => {
  const base = validateMove(playerID, G, { costsCounsellor: true, costsGold: true });
  if (base) return base;

  const boardSlots =
    republic === "venoa"
      ? G.boardState.purchaseSkyshipsVenoa
      : G.boardState.purchaseSkyshipsZeeland;

  const slot: keyof typeof boardSlots = (slotIndex + 1) as 1 | 2;

  if (boardSlots[slot] !== undefined) {
    return { code: "SLOT_TAKEN", message: "That purchase slot is already taken" };
  }

  return null;
};

export const validateRecruitCounsellors = (
  G: MyGameState,
  playerID: string,
  slotIndex: number
): MoveError | null => {
  const base = validateMove(playerID, G, { costsCounsellor: true, costsGold: true });
  if (base) return base;

  const value: keyof typeof G.boardState.recruitCounsellors = (slotIndex + 1) as
    | typeof CounsellorSlot.First
    | typeof CounsellorSlot.Second
    | typeof CounsellorSlot.Third;

  if (G.boardState.recruitCounsellors[value] !== undefined) {
    return { code: "SLOT_TAKEN", message: "That Counsellor slot is already taken" };
  }

  if (G.playerInfo[playerID].resources.counsellors >= MAX_COUNSELLORS) {
    return {
      code: "COUNSELLOR_CAP_REACHED",
      message: `Already at maximum Counsellors (${MAX_COUNSELLORS})`,
    };
  }

  return null;
};

export const validateRecruitRegiments = (
  G: MyGameState,
  playerID: string,
  slotIndex: number
): MoveError | null => {
  const base = validateMove(playerID, G, { costsCounsellor: true, costsGold: true });
  if (base) return base;

  const value: keyof typeof G.boardState.recruitRegiments = (slotIndex + 1) as
    | 1 | 2 | 3 | 4 | 5 | 6;

  if (G.boardState.recruitRegiments[value] !== undefined) {
    return { code: "SLOT_TAKEN", message: "That Regiment recruitment slot is already taken" };
  }

  return null;
};

export const validateFoundBuildings = (
  G: MyGameState,
  playerID: string,
  buildingSlotIndex: number,
  heresyDirection?: "advance" | "retreat"
): MoveError | null => {
  const base = validateMove(playerID, G, { costsCounsellor: true, costsGold: true });
  if (base) return base;

  const value: keyof typeof G.boardState.foundBuildings = (buildingSlotIndex + 1) as
    | typeof BuildingSlot.Cathedral
    | typeof BuildingSlot.Palace
    | typeof BuildingSlot.Shipyard
    | typeof BuildingSlot.Fort;

  if (value === BuildingSlot.Cathedral) {
    if (G.playerInfo[playerID].cathedrals >= MAX_CATHEDRALS) {
      return { code: "CATHEDRAL_CAP_REACHED", message: `Already at maximum Cathedrals (${MAX_CATHEDRALS})` };
    }
    if (G.playerInfo[playerID].hereticOrOrthodox === "heretic") {
      return { code: "HERETIC_CANNOT_BUILD_CATHEDRAL", message: "Heretic Kingdoms cannot build Cathedrals" };
    }
  }

  if (value === BuildingSlot.Palace) {
    if (G.playerInfo[playerID].palaces >= MAX_PALACES) {
      return { code: "PALACE_CAP_REACHED", message: `Already at maximum Palaces (${MAX_PALACES})` };
    }
    if (heresyDirection !== "advance" && heresyDirection !== "retreat") {
      return { code: "MISSING_HERESY_DIRECTION", message: "Choose a heresy direction for the Palace" };
    }
  }

  if (value === BuildingSlot.Shipyard) {
    if (G.playerInfo[playerID].shipyards >= MAX_SHIPYARDS) {
      return { code: "SHIPYARD_CAP_REACHED", message: `Already at maximum Shipyards (${MAX_SHIPYARDS})` };
    }
  }

  if (value === BuildingSlot.Fort) {
    const hasValidTile = G.mapState.buildings.some((row, y) =>
      row.some((tile, x) => {
        const hasBuilding =
          tile.player?.id === playerID &&
          (tile.buildings === "colony" || tile.buildings === "outpost");
        const hasTroops =
          tile.garrisonedRegiments > 0 ||
          tile.garrisonedLevies > 0 ||
          G.playerInfo[playerID].fleetInfo.some(
            (f) =>
              f.location[0] === x &&
              f.location[1] === y &&
              (f.regiments > 0 || f.levies > 0)
          );
        return hasBuilding && !tile.fort && hasTroops;
      })
    );
    if (!hasValidTile) {
      return {
        code: "NO_VALID_FORT_TILE",
        message: "No eligible tile — need a colony or outpost with troops and no existing Fort",
      };
    }
  }

  return null;
};

export const validateFoundFactory = (
  G: MyGameState,
  playerID: string,
  slotIndex: number
): MoveError | null => {
  const base = validateMove(playerID, G, { costsCounsellor: true, costsGold: true });
  if (base) return base;

  if (G.playerInfo[playerID].factories >= MAX_FACTORIES) {
    return { code: "FACTORY_CAP_REACHED", message: `Already at maximum Factories (${MAX_FACTORIES})` };
  }

  const slot: keyof typeof G.boardState.foundFactories = (slotIndex + 1) as 1 | 2 | 3 | 4;
  if (G.boardState.foundFactories[slot] !== undefined) {
    return { code: "SLOT_TAKEN", message: "That Factory slot is already taken" };
  }

  return null;
};

export const validateInfluencePrelates = (
  G: MyGameState,
  playerID: string,
  slotIndex: number
): MoveError | null => {
  const base = validateMove(playerID, G, { costsCounsellor: true, costsGold: true });
  if (base) return base;

  const value: keyof typeof G.boardState.influencePrelates = (slotIndex + 1) as
    | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

  if (G.boardState.influencePrelates[value] !== undefined) {
    return { code: "SLOT_TAKEN", message: "That Prelate slot is already taken" };
  }

  return null;
};

export const validatePunishDissenters = (
  G: MyGameState,
  playerID: string,
  slotIndex: number,
  paymentType: "gold" | "counsellor" | "execute",
  numPlayers: number
): MoveError | null => {
  const value: keyof typeof G.boardState.punishDissenters = (slotIndex + 1) as
    | 1 | 2 | 3 | 4 | 5 | 6;

  const base = validateMove(playerID, G, {
    costsCounsellor: true,
    costsGold: paymentType === "gold",
  });
  if (base) return base;

  if (value > numPlayers) {
    return { code: "SLOT_OUT_OF_RANGE", message: "That Dissenters slot does not exist in this game" };
  }

  if (G.boardState.punishDissenters[value] !== undefined) {
    return { code: "SLOT_TAKEN", message: "That Dissenters slot is already taken" };
  }

  const alreadyPunishing = Object.values(G.boardState.punishDissenters).some(
    (id) => id === playerID
  );
  if (alreadyPunishing) {
    return { code: "ALREADY_PUNISHING", message: "Your Kingdom is already punishing Dissenters this round" };
  }

  const playerInfo = G.playerInfo[playerID];

  if (paymentType === "execute") {
    if (playerInfo.prisoners <= 0) {
      return { code: "NO_PRISONERS", message: "No prisoners to execute" };
    }
    return null;
  }

  const maxPrisoners =
    playerInfo.resources.advantageCard === "more_prisons"
      ? BASE_PRISONERS + MORE_PRISONS_BONUS
      : BASE_PRISONERS;

  if (playerInfo.prisoners >= maxPrisoners) {
    return { code: "PRISON_FULL", message: `Prison is full — cannot take more prisoners (max ${maxPrisoners})` };
  }

  if (paymentType === "gold") {
    if (playerInfo.resources.gold < PUNISH_GOLD_COST) {
      return {
        code: "INSUFFICIENT_GOLD",
        message: `Not enough Gold — need ${PUNISH_GOLD_COST}, have ${playerInfo.resources.gold}`,
      };
    }
  } else if (paymentType === "counsellor") {
    if (playerInfo.resources.counsellors < 2) {
      return { code: "INSUFFICIENT_COUNSELLORS", message: "Need 2 Counsellors to pay by Counsellor" };
    }
  } else {
    return { code: "INVALID_PAYMENT_TYPE", message: "Invalid payment type" };
  }

  return null;
};

export const validateAlterPlayerOrder = (
  G: MyGameState,
  playerID: string,
  newPosition: number,
  numPlayers: number
): MoveError | null => {
  const base = validateMove(playerID, G, { costsCounsellor: true });
  if (base) return base;

  const slot: keyof PlayerOrder = (newPosition + 1) as keyof PlayerOrder;

  if (numPlayers < slot) {
    return { code: "POSITION_OUT_OF_RANGE", message: "That player order position does not exist in this game" };
  }

  if (G.boardState.pendingPlayerOrder[slot] !== undefined) {
    return { code: "SLOT_TAKEN", message: "That player order position is already taken" };
  }

  const alreadyPlaced = Object.values(G.boardState.pendingPlayerOrder).some(
    (id) => id === playerID
  );
  if (alreadyPlaced) {
    return { code: "ALREADY_PLACED", message: "Your Kingdom has already chosen a player order position" };
  }

  return null;
};

export const validateConvertMonarch = (
  G: MyGameState,
  playerID: string,
  slotIndex: number,
  numPlayers: number
): MoveError | null => {
  const base = validateMove(playerID, G, { costsGold: true });
  if (base) return base;

  const value: keyof typeof G.boardState.convertMonarch = (slotIndex + 1) as
    | 1 | 2 | 3 | 4 | 5 | 6;

  if (G.eventState.cannotConvertThisRound.includes(playerID)) {
    return { code: "CONVERSION_BLOCKED", message: "Your Monarch cannot convert again this round" };
  }

  if (G.boardState.convertMonarch[value] !== undefined) {
    return { code: "SLOT_TAKEN", message: "That conversion slot is already taken" };
  }

  if (value > numPlayers) {
    return { code: "SLOT_OUT_OF_RANGE", message: "That conversion slot does not exist in this game" };
  }

  const alreadyConverting = Object.values(G.boardState.convertMonarch).some(
    (id) => id === playerID
  );
  if (alreadyConverting) {
    return { code: "ALREADY_CONVERTING", message: "Your Monarch is already converting this round" };
  }

  if (G.playerInfo[playerID].resources.counsellors < 2) {
    return { code: "INSUFFICIENT_COUNSELLORS", message: "Converting requires 2 Counsellors" };
  }

  if (G.playerInfo[playerID].resources.gold < 2) {
    return { code: "INSUFFICIENT_GOLD", message: "Converting requires 2 Gold" };
  }

  return null;
};
