import { INVALID_MOVE } from "boardgame.io/core";
import { EventCardName, MoveDefinition } from "../../types";
import {
  isEventVoid,
  resolveEventCard,
  getBattleEventTarget,
  prepareEventChoice,
  EVENT_CARD_DEFS,
} from "../../helpers/eventCardDefinitions";
import { logEvent } from "../../helpers/stateUtils";

const chooseEventCard: MoveDefinition = {
  fn: ({ G, ctx, playerID, events, random }, ...args) => {
    const cardName: EventCardName = args[0];
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
        const voidReason = isEventVoid(shuffled[i], G, ctx.playOrder);
        if (!voidReason) {
          resolvedIndex = i;
          break;
        }
        const voidDef = EVENT_CARD_DEFS[shuffled[i]];
        logEvent(G, `Event card void: ${voidDef.displayName} \u2014 ${voidReason}`);
      }

      if (resolvedIndex >= 0) {
        const card = shuffled[resolvedIndex];
        const def = EVENT_CARD_DEFS[card];

        G.eventState.resolvedEvent = card;
        logEvent(G, `Event: ${def.displayName} \u2014 ${def.description}`);

        // Check if this card needs a player choice before resolving
        const choice = !def.isBattle
          ? prepareEventChoice(card, G, ctx.playOrder)
          : null;

        if (def.isBattle) {
          // Battle events deferred to Resolution phase
          // Colonial Rebellion with multiple colonies needs a choice first
          const colChoice = prepareEventChoice(card, G, ctx.playOrder);
          if (colChoice) {
            G.eventState.pendingChoice = colChoice;
          } else {
            const target = getBattleEventTarget(card, G, ctx.playOrder);
            if (target) {
              G.eventState.deferredEvents.push(target);
            }
          }
        } else if (choice) {
          // Card needs interactive choice — pause resolution
          G.eventState.pendingChoice = choice;
        } else {
          // Auto-resolve immediately
          resolveEventCard(card, G, ctx.playOrder);
        }

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

      if (G.eventState.pendingChoice) {
        // Transfer turn to the player who needs to make a choice
        events.endTurn({ next: G.eventState.pendingChoice.targetPlayerID });
      } else {
        events.endPhase();
      }
    } else {
      events.endTurn();
    }
  },
  errorMessage: "Cannot choose this event card",
  validate: (G, playerID, cardName) => {
    const hand = G.playerInfo[playerID].resources.eventCards;
    if (!hand.includes(cardName)) {
      return { code: "CARD_NOT_IN_HAND", message: "That event card is not in your hand" };
    }
    return null;
  },
};

export default chooseEventCard;
