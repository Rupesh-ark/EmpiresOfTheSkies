import { MyGameState, PlayerColour, MoveError, MoveDefinition } from "../../types";
import { validateMove } from "../moveValidation";
import { INVALID_MOVE } from "boardgame.io/core";
import {
  addGoldAmount,
  removeGoldAmount,
  removeOneCounsellor,
} from "../../helpers/stateUtils";

const validateInfluencePrelates = (
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

const influencePrelates: MoveDefinition = {
  fn: ({ G, playerID }, ...args: any[]) => {
    const value: keyof typeof G.boardState.influencePrelates = args[0] + 1;

    if (validateInfluencePrelates(G, playerID, args[0])) return INVALID_MOVE;
    let recipientOfPayment;
    let cost = 1;

    const kingdomToIDMap: { [key: number]: string | null } = {
      1: PlayerColour.red,
      2: PlayerColour.blue,
      3: PlayerColour.yellow,
      4: null,
      5: null,
      6: PlayerColour.brown,
      7: PlayerColour.white,
      8: PlayerColour.green,
    };

    // GAP-5: placing in your own kingdom's slot is free
    const slotColour = kingdomToIDMap[value];
    const actingPlayerColour = G.playerInfo[playerID].colour;
    if (slotColour !== null && slotColour === actingPlayerColour) {
      cost = 0;
    } else {
      Object.entries(G.playerInfo).forEach(([id, playerInfo]) => {
        if (playerInfo.colour === slotColour) {
          recipientOfPayment = id;
          cost = playerInfo.cathedrals;
        }
      });
    }

    if (recipientOfPayment) {
      addGoldAmount(G, recipientOfPayment, cost);
    }
    removeGoldAmount(G, playerID, cost);

    removeOneCounsellor(G, playerID);

    G.boardState.influencePrelates[value] = playerID;
    G.playerInfo[playerID].turnComplete = true;
  },
  errorMessage: "Cannot influence Prelates right now",
  validate: validateInfluencePrelates,
  successLog: (G, pid) => {
    const k = G.playerInfo[pid].kingdomName;
    return `${k} influences Prelates`;
  },
};

export default influencePrelates;
