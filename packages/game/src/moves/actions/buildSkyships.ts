import { MyGameState, MoveError, MoveDefinition } from "../../types";
import { validateMove } from "../moveValidation";
import { INVALID_MOVE } from "boardgame.io/core";
import {
  addSkyship,
  removeGoldAmount,
  removeOneCounsellor,
} from "../../helpers/stateUtils";

const validateBuildSkyships = (
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

  return null;
};

const buildSkyships: MoveDefinition = {
  fn: ({ G, playerID, events }, ...args: any[]) => {
    // GAP-20: player chooses 1 or 2 skyships per shipyard, pays 1 Gold each
    const perShipyard: number = args[0];
    if (validateBuildSkyships(G, playerID, perShipyard)) return INVALID_MOVE;
    const total = perShipyard * G.playerInfo[playerID].shipyards;

    removeOneCounsellor(G, playerID);
    removeGoldAmount(G, playerID, total);
    for (let i = 0; i < total; i++) {
      addSkyship(G, playerID);
    }
    G.playerInfo[playerID].playerBoardCounsellorLocations.buildSkyships = true;

    G.playerInfo[playerID].turnComplete = true;
    events.endTurn();
  },
  errorMessage: "Cannot build Skyships right now",
  validate: validateBuildSkyships,
  successLog: (G, pid, perShipyard) => {
    const k = G.playerInfo[pid].kingdomName;
    const built = perShipyard * G.playerInfo[pid].shipyards;
    return `${k} builds ${built} Skyship(s)`;
  },
};

export default buildSkyships;
