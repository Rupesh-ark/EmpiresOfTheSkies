import { Move } from "boardgame.io";
import { MyGameState, DealOffer } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { validateOffer } from "./proposeDeal";

/**
 * Executes one side of the deal: transfers gold, skyships, outposts,
 * and/or Archprelate token from offeror to recipient.
 */
const executeSide = (
  G: MyGameState,
  offerorID: string,
  recipientID: string,
  offer: DealOffer
) => {
  if (offer.gold && offer.gold > 0) {
    G.playerInfo[offerorID].resources.gold -= offer.gold;
    G.playerInfo[recipientID].resources.gold += offer.gold;
  }

  if (offer.skyships && offer.skyships > 0) {
    G.playerInfo[offerorID].resources.skyships -= offer.skyships;
    G.playerInfo[recipientID].resources.skyships += offer.skyships;
  }

  if (offer.archprelateToken) {
    G.playerInfo[offerorID].isArchprelate = false;
    G.playerInfo[recipientID].isArchprelate = true;
  }

  if (offer.outposts && offer.outposts.length > 0) {
    for (const [x, y] of offer.outposts) {
      G.mapState.buildings[y][x].player = G.playerInfo[recipientID];
    }
  }
};

const acceptDeal: Move<MyGameState> = ({ G, playerID }) => {
  if (!G.pendingDeal) {
    console.log("No deal pending");
    return INVALID_MOVE;
  }

  if (G.pendingDeal.targetID !== playerID) {
    console.log("Only the target player can accept a deal");
    return INVALID_MOVE;
  }

  const { proposerID, targetID, offering, requesting } = G.pendingDeal;

  // Re-validate both sides (state may have changed since proposal)
  const offerError = validateOffer(G, proposerID, targetID, offering);
  if (offerError) {
    console.log(`Proposer can no longer fulfil offer: ${offerError}`);
    G.pendingDeal = undefined;
    return INVALID_MOVE;
  }

  const requestError = validateOffer(G, targetID, proposerID, requesting);
  if (requestError) {
    console.log(`Target can no longer fulfil request: ${requestError}`);
    G.pendingDeal = undefined;
    return INVALID_MOVE;
  }

  // Execute both sides atomically
  executeSide(G, proposerID, targetID, offering);
  executeSide(G, targetID, proposerID, requesting);

  G.pendingDeal = undefined;
};

export default acceptDeal;
