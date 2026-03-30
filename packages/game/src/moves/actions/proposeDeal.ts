import { Move } from "boardgame.io";
import { MyGameState, DealOffer, DealProposal } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { validateOutpostTransfer } from "../../helpers/stateUtils";

/**
 * Validates that a player can fulfil the items in their side of the deal.
 * For outposts, validates the recipient has a Fleet present.
 */
const validateOffer = (
  G: MyGameState,
  offerorID: string,
  recipientID: string,
  offer: DealOffer
): string | undefined => {
  if (offer.gold && offer.gold > 0) {
    if (G.playerInfo[offerorID].resources.gold < offer.gold) {
      return "Not enough gold";
    }
  }

  if (offer.skyships && offer.skyships > 0) {
    if (G.playerInfo[offerorID].resources.skyships < offer.skyships) {
      return "Not enough skyships in Kingdom reserves";
    }
  }

  if (offer.archprelateToken) {
    if (!G.playerInfo[offerorID].isArchprelate) {
      return "Player is not the Archprelate";
    }
  }

  if (offer.outposts && offer.outposts.length > 0) {
    for (const coords of offer.outposts) {
      const error = validateOutpostTransfer(G, offerorID, recipientID, coords);
      if (error) return error;
    }
  }

  return undefined;
};

const proposeDeal: Move<MyGameState> = ({ G, playerID }, ...args: any[]) => {
  const targetID: string = args[0];
  const offering: DealOffer = args[1];
  const requesting: DealOffer = args[2];

  if (G.pendingDeal) {
    console.log("A deal is already pending");
    return INVALID_MOVE;
  }

  if (targetID === playerID) {
    console.log("Cannot propose a deal with yourself");
    return INVALID_MOVE;
  }

  if (!G.playerInfo[targetID]) {
    console.log("Target player does not exist");
    return INVALID_MOVE;
  }

  // Validate proposer can fulfil their offer
  const offerError = validateOffer(G, playerID, targetID, offering);
  if (offerError) {
    console.log(`Proposer offer invalid: ${offerError}`);
    return INVALID_MOVE;
  }

  // Validate target can fulfil what's being requested
  const requestError = validateOffer(G, targetID, playerID, requesting);
  if (requestError) {
    console.log(`Request invalid: ${requestError}`);
    return INVALID_MOVE;
  }

  const deal: DealProposal = {
    proposerID: playerID,
    targetID,
    offering,
    requesting,
  };

  G.pendingDeal = deal;
};

export default proposeDeal;
export { validateOffer };
