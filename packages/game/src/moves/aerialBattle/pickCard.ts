import { INVALID_MOVE } from "boardgame.io/core";
import { MoveDefinition, MoveError, MyGameState } from "../../types.js";
import { resolveBattleAndReturnWinner } from "../../helpers/resolveBattle.js";
import { validateAerialCardSelection } from "./drawCard.js";

const validatePickCard = (
  G: MyGameState,
  playerID: string,
  value: unknown
): MoveError | null => {
  const base = validateAerialCardSelection(G, playerID);
  if (base) return base;
  if (!Number.isInteger(value) || (value as number) < 0) {
    return { code: "INVALID_INDEX", message: "Card index must be a non-negative integer" };
  }
  if ((value as number) >= G.playerInfo[playerID].resources.fortuneCards.length) {
    return { code: "OUT_OF_BOUNDS", message: "Card index is outside your Fortune of War hand" };
  }
  return null;
};

const pickCard: MoveDefinition = {
  fn: ({ G, ctx, playerID, events }, ...args) => {
    const value = args[0];

    if (validatePickCard(G, playerID, value)) return INVALID_MOVE;

    const card = G.playerInfo[playerID].resources.fortuneCards[value];

    if (G.battleState) {
      Object.values(G.battleState).forEach((battler) => {
        if (battler.id === playerID) {
          battler.fowCard = card;
          battler.fowSource = "hand";
        }
      });
      G.playerInfo[playerID].resources.fortuneCards.splice(value, 1);

      if (G.battleState.attacker.fowCard && G.battleState.defender.fowCard) {
        resolveBattleAndReturnWinner(G, events, ctx);
      } else if (!G.battleState.attacker.fowCard) {
        events.endTurn({ next: G.battleState.attacker.id });
      } else if (!G.battleState.defender.fowCard) {
        events.endTurn({ next: G.battleState.defender.id });
      }
    }
  },
  errorMessage: "Cannot pick a Fortune of War card right now",
  validate: validatePickCard,
  successLog: (G, pid) => {
    const k = G.playerInfo[pid].kingdomName;
    return `${k} commits a Fortune of War card`;
  },
};

export default pickCard;
