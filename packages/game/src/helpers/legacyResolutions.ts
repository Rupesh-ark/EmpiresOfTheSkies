import { MyGameState } from "../types";
import { resolveCardWithAlignmentPenalty } from "./legacyCardDefinitions";

const legacyResolutions = (G: MyGameState) => {
  Object.values(G.playerInfo).forEach((player) => {
    if (!player.resources.legacyCard) return;
    resolveCardWithAlignmentPenalty(player, G, player.resources.legacyCard);
  });
};

export default legacyResolutions;
