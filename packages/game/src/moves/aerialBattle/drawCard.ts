import { MoveDefinition } from "../../types";
import { drawFortuneOfWarCard } from "../../helpers/helpers";
import { resolveBattleAndReturnWinner } from "../../helpers/resolveBattle";

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
};

export default drawCard;
