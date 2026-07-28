import { INVALID_MOVE } from "boardgame.io/core";
import type { MoveDefinition } from "../../types.js";
import { resolveOccupationBattle } from "../../helpers/resolveOccupation.js";
import { logEvent } from "../../helpers/stateUtils.js";
import { findNextGroundBattle } from "../../helpers/findNext.js";

const commitOccupationBattleCard: MoveDefinition = {
  fn: ({ G, playerID, events, random }, ...args) => {
    const battle = G.currentOccupationBattle;
    if (
      !battle ||
      G.step !== "occupation_battle" ||
      battle.attackerPlayerID !== playerID
    ) {
      return INVALID_MOVE;
    }

    const cardIndex = args[0];
    if (cardIndex === "pass") {
      logEvent(
        G,
        `${G.playerInfo[playerID].kingdomName} declines to attack the occupied building`
      );
      G.currentOccupationBattle = null;
      G.battleState = undefined;
      findNextGroundBattle(G, events);
      return;
    }

    let card:
      | { name: string; sword: number; shield: number }
      | undefined;
    if (cardIndex !== undefined) {
      if (
        !Number.isInteger(cardIndex) ||
        cardIndex < 0 ||
        cardIndex >=
          G.playerInfo[playerID].resources.fortuneCards.length
      ) {
        return INVALID_MOVE;
      }
      const selected =
        G.playerInfo[playerID].resources.fortuneCards.splice(
          cardIndex,
          1
        )[0];
      card = {
        name: selected.name,
        sword: selected.sword,
        shield: selected.shield,
      };
      logEvent(
        G,
        `${G.playerInfo[playerID].kingdomName} plays Fortune of War card: ${selected.sword}S/${selected.shield}Sh`
      );
    }

    resolveOccupationBattle(G, events, random.Shuffle, card);
  },
  errorMessage: "Cannot choose a card for this retake battle",
};

export default commitOccupationBattleCard;
