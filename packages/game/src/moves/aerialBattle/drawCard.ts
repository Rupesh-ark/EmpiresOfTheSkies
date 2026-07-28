import { INVALID_MOVE } from "boardgame.io/core";
import { MoveDefinition, MoveError, MyGameState } from "../../types.js";
import { drawFortuneOfWarCard } from "../../helpers/helpers.js";
import { resolveBattleAndReturnWinner } from "../../helpers/resolveBattle.js";

export const validateAerialCardSelection = (
  G: MyGameState,
  playerID: string
): MoveError | null => {
  if (!G.battleState) {
    return { code: "NO_BATTLE", message: "No active battle" };
  }
  if (G.step !== "aerial_resolve") {
    return { code: "WRONG_STAGE", message: "Cannot pick or draw a Fortune of War card in this stage" };
  }
  const battler = Object.values(G.battleState).find((candidate) => candidate.id === playerID);
  if (!battler) {
    return { code: "NOT_IN_BATTLE", message: "You are not in this battle" };
  }
  if (battler.fowCard !== undefined) {
    return { code: "CARD_ALREADY_SET", message: "You have already committed a Fortune of War card" };
  }
  return null;
};

// No-effect cards are handled by drawFortuneOfWarCard (reshuffle + redraw).
const drawCard: MoveDefinition = {
  fn: ({ G, ctx, playerID, events, random }, ...args) => {
    if (validateAerialCardSelection(G, playerID)) return INVALID_MOVE;

    if (G.battleState) {
      Object.values(G.battleState).forEach((battler) => {
        if (battler.id === playerID) {
          battler.fowCard = drawFortuneOfWarCard(G, random.Shuffle);
          battler.fowSource = "deck";
        }
      });

      if (G.battleState.attacker.fowCard && G.battleState.defender.fowCard) {
        resolveBattleAndReturnWinner(G, events, ctx);
      } else if (!G.battleState.attacker.fowCard) {
        events.endTurn({ next: G.battleState.attacker.id });
      } else if (!G.battleState.defender.fowCard) {
        events.endTurn({ next: G.battleState.defender.id });
      }
    }
  },
  errorMessage: "Cannot draw a card right now",
  validate: validateAerialCardSelection,
  successLog: (G, pid) => {
    const k = G.playerInfo[pid].kingdomName;
    return `${k} draws a Fortune of War card`;
  },
};

export default drawCard;
