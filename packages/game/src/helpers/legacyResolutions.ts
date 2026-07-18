import { MyGameState } from "../types.js";
import { resolveCardWithAlignmentPenalty } from "./legacyCardDefinitions.js";

const legacyResolutions = (G: MyGameState) => {
  Object.values(G.playerInfo).forEach((player) => {
    if (!player.resources.legacyCard) return;
    resolveCardWithAlignmentPenalty(player, G, player.resources.legacyCard);
  });
};

export default legacyResolutions;
