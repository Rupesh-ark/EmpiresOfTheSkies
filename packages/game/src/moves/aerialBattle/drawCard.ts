import { MoveDefinition } from "../../types.js";
import { drawFortuneOfWarCard } from "../../helpers/helpers.js";
import { resolveBattleAndReturnWinner } from "../../helpers/resolveBattle.js";

// No-effect cards are handled by drawFortuneOfWarCard (reshuffle + redraw).
const drawCard: MoveDefinition = {
  fn: ({ G, ctx, playerID, events, random }, ...args) => {
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
  successLog: (G, pid) => {
    const k = G.playerInfo[pid].kingdomName;
    return `${k} draws a Fortune of War card`;
  },
};

export default drawCard;
