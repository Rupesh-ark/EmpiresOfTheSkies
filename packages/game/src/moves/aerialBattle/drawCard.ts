import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { drawFortuneOfWarCard } from "../../helpers/helpers";
import { resolveBattleAndReturnWinner } from "../../helpers/resolveBattle";

// No-effect cards are handled by drawFortuneOfWarCard (reshuffle + redraw).
const drawCard: Move<MyGameState> = (
  { G, ctx, playerID, events, random },
  ...args
) => {
  if (G.battleState) {
    Object.values(G.battleState).forEach((battler) => {
      if (battler.id === playerID) {
        battler.fowCard = drawFortuneOfWarCard(G);
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
};

export default drawCard;
