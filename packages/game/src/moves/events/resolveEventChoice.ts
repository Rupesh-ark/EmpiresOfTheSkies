import { Move } from "boardgame.io";
import { INVALID_MOVE } from "boardgame.io/core";
import { EventCardName, LegacyCardInfo, MyGameState } from "../../types";
import { getBattleEventTarget } from "../../helpers/eventCardDefinitions";
import { addVPAmount, logEvent } from "../../helpers/stateUtils";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/events/events";
import { Ctx } from "boardgame.io/dist/types/src/types";

// ── Choice handlers ──────────────────────────────────────────────────────────
// Each handler validates the choice, applies the effect, and returns true
// on success or false if the choice is invalid.

type ChoiceHandler = (G: MyGameState, ctx: Ctx, choiceValue: any) => boolean;

const CHOICE_HANDLERS: Partial<Record<EventCardName, ChoiceHandler>> = {
  the_great_fire: (G, _ctx, choiceValue) => {
    const choice = G.eventState.pendingChoice!;
    const buildingType = choiceValue as "cathedral" | "palace" | "shipyard";
    if (!choice.buildingOptions?.includes(buildingType)) return false;

    const p = G.playerInfo[choice.targetPlayerID];
    if (buildingType === "cathedral") p.cathedrals--;
    else if (buildingType === "palace") p.palaces--;
    else p.shipyards--;

    logEvent(G, `The Great Fire: ${p.kingdomName} loses a ${buildingType}`);
    return true;
  },

  royal_succession: (G, _ctx, choiceValue) => {
    const choice = G.eventState.pendingChoice!;
    const chosenCard = choiceValue as LegacyCardInfo;
    const options = choice.legacyOptions ?? [];
    if (!options.some((c) => c.name === chosenCard.name && c.colour === chosenCard.colour)) {
      return false;
    }

    const p = G.playerInfo[choice.targetPlayerID];
    p.resources.legacyCard = chosenCard;
    for (const card of options) {
      if (card.name !== chosenCard.name || card.colour !== chosenCard.colour) {
        G.cardDecks.legacyDeck.push(card);
      }
    }

    logEvent(G, `Royal Succession: ${p.kingdomName} picks ${chosenCard.name}`);
    return true;
  },

  dynastic_marriage: (G, _ctx, choiceValue) => {
    const choice = G.eventState.pendingChoice!;
    const allyID = choiceValue as string;
    if (!choice.allyOptions?.includes(allyID)) return false;

    addVPAmount(G, choice.targetPlayerID, 3);
    addVPAmount(G, allyID, 3);
    G.eventState.dynasticMarriage = [choice.targetPlayerID, allyID];

    const k1 = G.playerInfo[choice.targetPlayerID].kingdomName;
    const k2 = G.playerInfo[allyID].kingdomName;
    logEvent(G, `Dynastic Marriage: ${k1} & ${k2} allied (+3 VP each)`);
    return true;
  },

  colonial_rebellion: (G, ctx, choiceValue) => {
    const choice = G.eventState.pendingChoice!;
    const tile = choiceValue as [number, number];
    if (!choice.colonyOptions?.some(([x, y]) => x === tile[0] && y === tile[1])) {
      return false;
    }

    const target = getBattleEventTarget(choice.card, G, ctx.playOrder);
    if (target) {
      target.targetTile = tile;
      G.eventState.deferredEvents.push(target);
    }

    const land = G.mapState.currentTileArray[tile[1]][tile[0]];
    logEvent(G, `Colonial Rebellion: ${G.playerInfo[choice.targetPlayerID].kingdomName} risks colony at ${land.name}`);
    return true;
  },
};

// ── Move ─────────────────────────────────────────────────────────────────────

/**
 * Move called by the target player to resolve an event card that
 * requires an interactive choice. The handler is looked up from
 * CHOICE_HANDLERS by card name — to add a new interactive card,
 * just add an entry to the map.
 */
const resolveEventChoice: Move<MyGameState> = (
  { G, ctx, playerID, events }: {
    G: MyGameState;
    ctx: Ctx;
    playerID: string;
    events: EventsAPI;
  },
  choiceValue: any
) => {
  const choice = G.eventState.pendingChoice;
  if (!choice) return INVALID_MOVE;
  if (choice.targetPlayerID !== playerID) return INVALID_MOVE;

  const handler = CHOICE_HANDLERS[choice.card];
  if (!handler) return INVALID_MOVE;

  const success = handler(G, ctx, choiceValue);
  if (!success) return INVALID_MOVE;

  G.eventState.pendingChoice = null;
  events.endPhase();
};

export default resolveEventChoice;
