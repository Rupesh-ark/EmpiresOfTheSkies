import { Move } from "boardgame.io";
import { INVALID_MOVE } from "boardgame.io/core";
import { EventCardName, MyGameState } from "../../types";
import {
  isEventVoid,
  resolveEventCard,
  getBattleEventTarget,
  EVENT_CARD_DEFS,
} from "../../helpers/eventCardDefinitions";
import { logEvent } from "../../helpers/stateUtils";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/events/events";
import { RandomAPI } from "boardgame.io/dist/types/src/plugins/random/random";
import { Ctx } from "boardgame.io/dist/types/src/types";

const chooseEventCard: Move<MyGameState> = (
  {
    G,
    ctx,
    playerID,
    events,
    random,
  }: {
    G: MyGameState;
    ctx: Ctx;
    playerID: string;
    events: EventsAPI;
    random: RandomAPI;
  },
  cardName: EventCardName
) => {
  const hand = G.playerInfo[playerID].resources.eventCards;
  const idx = hand.indexOf(cardName);
  if (idx === -1) return INVALID_MOVE;

  // Remove from hand, add to face-down chosen pile
  hand.splice(idx, 1);
  G.eventState.chosenCards.push(cardName);

  const numPlayers = Object.keys(G.playerInfo).length;

  if (G.eventState.chosenCards.length >= numPlayers) {
    // All players have chosen — shuffle chosen cards
    const shuffled = random.Shuffle([...G.eventState.chosenCards]);
    G.eventState.chosenCards = [];

    // Reveal cards one by one until a non-void card is found
    const returnToDeck: EventCardName[] = [];
    let resolvedIndex = -1;

    for (let i = 0; i < shuffled.length; i++) {
      if (!isEventVoid(shuffled[i], G, ctx.playOrder)) {
        resolvedIndex = i;
        break;
      }
    }

    if (resolvedIndex >= 0) {
      const card = shuffled[resolvedIndex];
      const def = EVENT_CARD_DEFS[card];

      if (def.isBattle) {
        // Battle events deferred to Resolution phase
        const target = getBattleEventTarget(card, G, ctx.playOrder);
        if (target) {
          G.eventState.deferredEvents.push(target);
        }
      } else {
        resolveEventCard(card, G, ctx.playOrder);
      }
      G.eventState.resolvedEvent = card;
      logEvent(G, `Event: ${def.displayName} \u2014 ${def.description}`);

      // All other chosen cards go back to deck
      for (let i = 0; i < shuffled.length; i++) {
        if (i !== resolvedIndex) returnToDeck.push(shuffled[i]);
      }
    } else {
      // All void — no event this round, all cards return to deck
      returnToDeck.push(...shuffled);
      G.eventState.resolvedEvent = null;
      logEvent(G, "No event was resolved this round (all void)");
    }

    // Return unused cards to deck and shuffle
    G.eventState.deck.push(...returnToDeck);
    G.eventState.deck = random.Shuffle(G.eventState.deck);

    // Replenish hands — each player draws 1 card
    for (const id of ctx.playOrder) {
      if (G.eventState.deck.length > 0) {
        G.playerInfo[id].resources.eventCards.push(G.eventState.deck.pop()!);
      }
    }

    events.endPhase();
  } else {
    events.endTurn();
  }
};

export default chooseEventCard;
