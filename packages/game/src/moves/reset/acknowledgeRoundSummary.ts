import { MoveDefinition } from "../../types.js";

const acknowledgeRoundSummary: MoveDefinition = {
  fn: ({ G, ctx, playerID, events }) => {
    G.roundSummaryAck ??= [];

    if (!G.roundSummaryAck.includes(playerID)) {
      G.roundSummaryAck.push(playerID);
    }

    events.endStage();

    if (G.roundSummaryAck.length >= ctx.playOrder.length) {
      events.endPhase();
    }
  },
  errorMessage: "Cannot acknowledge the round summary right now",
  validate: (G) => {
    if (G.step !== "round_summary") {
      return { code: "WRONG_STAGE", message: "Round summary is not awaiting acknowledgement" };
    }
    return null;
  },
};

export default acknowledgeRoundSummary;
