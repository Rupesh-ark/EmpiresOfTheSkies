import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { removeVPAmount } from "../../helpers/stateUtils";

const attackOtherPlayersFleet: Move<MyGameState> = (
  { G, ctx, playerID, events, random },
  ...args
) => {
  const defenderID: string = args[0];

  // Peace Accord: first attacker loses 3 VP and nullifies the accord
  if (G.eventState.peaceAccordActive) {
    removeVPAmount(G, playerID, 3);
    G.eventState.peaceAccordActive = false;
  }

  // Dynastic Marriage: attacking your marriage partner ends the alliance
  if (G.eventState.dynasticMarriage) {
    const [p1, p2] = G.eventState.dynasticMarriage;
    if (
      (playerID === p1 && defenderID === p2) ||
      (playerID === p2 && defenderID === p1)
    ) {
      G.eventState.dynasticMarriage = null;
    }
  }

  G.battleState = {
    attacker: { decision: "fight", ...G.playerInfo[playerID] },
    defender: { decision: "undecided", ...G.playerInfo[defenderID] },
  };
  events.endTurn({ next: defenderID });
  G.stage = "attack or evade";
};

export default attackOtherPlayersFleet;
