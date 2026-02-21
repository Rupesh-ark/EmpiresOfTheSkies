import { Move } from "boardgame.io";
import { MyGameState } from "../../types";

const attackOtherPlayersFleet: Move<MyGameState> = (
  { G, ctx, playerID, events, random },
  ...args
) => {
  const defenderID: string = args[0];
  G.battleState = {
    attacker: { decision: "fight", ...G.playerInfo[playerID] },
    defender: { decision: "undecided", ...G.playerInfo[defenderID] },
  };
  events.endTurn({ next: defenderID });
  G.stage = "attack or evade";
};

export default attackOtherPlayersFleet;
