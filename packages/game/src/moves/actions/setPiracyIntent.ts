import { INVALID_MOVE } from "boardgame.io/core";
import { MoveDefinition } from "../../types";
import { logEvent } from "../../helpers/stateUtils";

/**
 * Declare piracy intent for this round: "tax" (collect gold) or "cut" (remove a skyship).
 * Anytime action during the actions phase — does not cost a counsellor or end the turn.
 * Resets to "tax" at the start of each round.
 */
const setPiracyIntent: MoveDefinition = {
  fn: ({ G, playerID }, ...args: any[]) => {
    const intent = args[0] as "tax" | "cut";
    if (intent !== "tax" && intent !== "cut") return INVALID_MOVE;

    G.playerInfo[playerID].piracyIntent = intent;
    const name = G.playerInfo[playerID].kingdomName;
    logEvent(G, `${name} declares piracy intent: ${intent === "cut" ? "cut routes" : "collect taxes"}`);
  },
  errorMessage: "Cannot set piracy intent right now",
};

export default setPiracyIntent;
