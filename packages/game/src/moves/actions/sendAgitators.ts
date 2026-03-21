import { INVALID_MOVE } from "boardgame.io/core";
import { MoveDefinition, MoveError } from "../../types";
import { logEvent } from "../../helpers/stateUtils";

const AGITATOR_COST = 2;

const validateSendAgitators = (
  G: Parameters<typeof sendAgitators.fn>[0]["G"],
  playerID: string,
  targetID: string,
): MoveError | null => {
  if (!targetID || !G.playerInfo[targetID]) {
    return { code: "INVALID_TARGET", message: "Must target a valid player" };
  }
  if (targetID === playerID) {
    return { code: "SELF_TARGET", message: "Cannot send agitators to yourself" };
  }
  if (G.playerInfo[playerID].resources.gold < AGITATOR_COST) {
    return { code: "INSUFFICIENT_GOLD", message: `Need ${AGITATOR_COST} gold to send agitators` };
  }
  return null;
};

/**
 * Send Agitators: pay 2 gold to place a free dissenter in a rival's kingdom.
 * The target can imprison the dissenter via Punish Dissenters. If unhandled,
 * the dissenter shifts the target's heresy +1 at end of round.
 * Anytime action — does not cost a counsellor or end the player's turn.
 */
const sendAgitators: MoveDefinition = {
  fn: ({ G, playerID }, ...args: any[]) => {
    const targetID = args[0] as string;

    if (validateSendAgitators(G, playerID, targetID)) return INVALID_MOVE;

    G.playerInfo[playerID].resources.gold -= AGITATOR_COST;
    G.playerInfo[targetID].freeDissenters += 1;

    const senderName = G.playerInfo[playerID].kingdomName;
    const targetName = G.playerInfo[targetID].kingdomName;
    logEvent(G, `${senderName} sends agitators to ${targetName} (−${AGITATOR_COST} gold, 1 free dissenter placed)`);
  },
  errorMessage: "Cannot send agitators right now",
  validate: (G, playerID, targetID) => validateSendAgitators(G, playerID, targetID),
  successLog: (G, pid, targetID) => {
    const s = G.playerInfo[pid].kingdomName;
    const t = G.playerInfo[targetID].kingdomName;
    return `${s} sends agitators to ${t}`;
  },
};

export default sendAgitators;
