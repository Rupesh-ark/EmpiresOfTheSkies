import { INVALID_MOVE } from "boardgame.io/core";
import { MoveDefinition } from "../../types.js";
import { logEvent } from "../../helpers/stateUtils.js";
import { resolveInvasionFoWChoice } from "../../helpers/resolveInvasion.js";

const commitInvasionFoW: MoveDefinition = {
  fn: ({ G, ctx, playerID, events, random }, ...args) => {
    const invasion = G.currentInvasion;
    if (
      !invasion ||
      (invasion.phase !== "aerial_fow" &&
        invasion.phase !== "ground_fow")
    ) {
      return INVALID_MOVE;
    }

    const captainGeneral =
      G.turnOrder.find((id) => G.playerInfo[id].isCaptainGeneral) ??
      G.turnOrder[0];
    if (playerID !== captainGeneral) return INVALID_MOVE;

    const selection: unknown = args[0];
    const player = G.playerInfo[playerID];
    let fowCard: { sword: number; shield: number } | undefined;

    if (selection === "draw") {
      logEvent(
        G,
        `${player.kingdomName} draws a Fortune of War card for the invasion`
      );
    } else if (
      Number.isInteger(selection) &&
      (selection as number) >= 0 &&
      (selection as number) < player.resources.fortuneCards.length
    ) {
      const card = player.resources.fortuneCards.splice(
        selection as number,
        1
      )[0];
      fowCard = { sword: card.sword, shield: card.shield };
      if (player.resources.advantageCard === "improved_training") {
        if (fowCard.sword > 0) fowCard.sword += 1;
        if (fowCard.shield > 0) fowCard.shield += 1;
      }
      logEvent(
        G,
        `${player.kingdomName} plays Fortune of War card: ${card.sword}S/${card.shield}Sh`
      );
    } else {
      return INVALID_MOVE;
    }

    const result = resolveInvasionFoWChoice(
      G,
      random.Shuffle,
      fowCard
    );
    if (result.status === "awaiting_fow") {
      events.endTurn({ next: result.playerID });
    } else if (result.status === "defeat") {
      events.endTurn({ next: ctx.playOrder[0] });
    } else {
      events.endPhase();
    }
  },
  errorMessage: "Cannot commit an invasion battle card right now",
};

export default commitInvasionFoW;
