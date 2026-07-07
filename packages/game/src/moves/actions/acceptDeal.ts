import { MyGameState, DealOffer, MoveError, MoveDefinition } from "../../types";
import { logEvent, toBuildingOwner } from "../../helpers/stateUtils";
import { validateOffer } from "./proposeDeal";
import { INVALID_MOVE } from "boardgame.io/core";

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
      G.mapState.buildings[y][x].player = toBuildingOwner(G.playerInfo[recipientID]);
    }
  }
};

const validateAcceptDeal = (G: MyGameState, playerID: string): MoveError | null => {
  if (!G.pendingDeal) {
    return { code: "NO_DEAL", message: "No deal pending" };
  }
  if (G.pendingDeal.targetID !== playerID) {
    return { code: "NOT_TARGET", message: "This deal is not for you" };
  }
  return null;
};

const acceptDeal: MoveDefinition = {
  fn: ({ G }) => {
    const { proposerID, targetID, offering, requesting } = G.pendingDeal!;

    const offerError = validateOffer(G, proposerID, targetID, offering);
    const requestError = !offerError && validateOffer(G, targetID, proposerID, requesting);
    if (offerError || requestError) {
      G.pendingDeal = undefined;
      return INVALID_MOVE;
    }

    const proposerName = G.playerInfo[proposerID].kingdomName;
    const targetName = G.playerInfo[targetID].kingdomName;

    executeSide(G, proposerID, targetID, offering);
    executeSide(G, targetID, proposerID, requesting);

    logEvent(G, `${targetName} accepts deal from ${proposerName}`);
    G.pendingDeal = undefined;
  },
  errorMessage: "Cannot accept this deal",
  validate: validateAcceptDeal,
};

export default acceptDeal;
