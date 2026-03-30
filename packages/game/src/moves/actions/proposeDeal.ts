import { MyGameState, DealOffer, DealProposal, MoveDefinition, MoveError } from "../../types";
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

const validateProposeDeal = (G: MyGameState, playerID: string, targetID: string, offering: DealOffer, requesting: DealOffer): MoveError | null => {
  if (G.pendingDeal) {
    return { code: "DEAL_PENDING", message: "A deal is already pending" };
  }
  if (targetID === playerID) {
    return { code: "SELF_DEAL", message: "Cannot propose a deal with yourself" };
  }
  if (!G.playerInfo[targetID]) {
    return { code: "INVALID_TARGET", message: "Target player does not exist" };
  }
  const offerError = validateOffer(G, playerID, targetID, offering);
  if (offerError) {
    return { code: "OFFER_INVALID", message: offerError };
  }
  const requestError = validateOffer(G, targetID, playerID, requesting);
  if (requestError) {
    return { code: "REQUEST_INVALID", message: requestError };
  }
  return null;
};

const proposeDeal: MoveDefinition = {
  fn: ({ G, playerID }, ...args: any[]) => {
    const targetID: string = args[0];
    const offering: DealOffer = args[1];
    const requesting: DealOffer = args[2];

    const deal: DealProposal = {
      proposerID: playerID,
      targetID,
      offering,
      requesting,
    };

    G.pendingDeal = deal;
  },
  errorMessage: "Cannot propose this deal",
  validate: validateProposeDeal,
};

export default proposeDeal;
export { validateOffer };
