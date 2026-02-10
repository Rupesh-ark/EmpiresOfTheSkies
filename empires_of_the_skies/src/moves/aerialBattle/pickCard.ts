import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { resolveBattleAndReturnWinner } from "../../helpers/resolveBattle";

const pickCard: Move<MyGameState> = (
  { G, ctx, playerID, events, random },
  ...args
) => {
  const value = args[0];

  const card = G.playerInfo[playerID].resources.fortuneCards[value];

  if (G.battleState) {
    Object.values(G.battleState).forEach((battler) => {
      if (battler.id === playerID) {
        battler.fowCard = card;
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
};

export default pickCard;
