import { INVALID_MOVE } from "boardgame.io/core";
import { EventCardName, LegacyCardInfo, MoveDefinition } from "../../types";
import { getBattleEventTarget } from "../../helpers/eventCardDefinitions";
import { addVPAmount, removeVPAmount, logEvent } from "../../helpers/stateUtils";
import { BUILDING_SELL_PRICE } from "../../data/gameData";

// ── Choice handlers ──────────────────────────────────────────────────────────
// Each handler validates the choice, applies the effect, and returns true
// on success or false if the choice is invalid.

type ChoiceHandler = (G: any, ctx: any, choiceValue: any) => boolean;

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
    if (!options.some((c: LegacyCardInfo) => c.name === chosenCard.name && c.colour === chosenCard.colour)) {
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
    if (!choice.colonyOptions?.some(([x, y]: [number, number]) => x === tile[0] && y === tile[1])) {
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

  guild_revolt: (G, _ctx, choiceValue) => {
    const choice = G.eventState.pendingChoice!;
    const option = choiceValue as string;
    if (!choice.binaryOptions?.includes(option)) return false;

    const p = G.playerInfo[choice.targetPlayerID];

    if (option.startsWith("pay_gold:")) {
      const cost = parseInt(option.split(":")[1], 10);
      p.resources.gold -= cost;
      logEvent(G, `Guild Revolt: ${p.kingdomName} pays ${cost} gold (2 per factory)`);
    } else if (option === "sell_factory") {
      p.factories -= 1;
      p.resources.gold += BUILDING_SELL_PRICE;
      logEvent(G, `Guild Revolt: ${p.kingdomName} sells a factory for ${BUILDING_SELL_PRICE} gold (now has ${p.factories})`);
    } else {
      return false;
    }
    return true;
  },

  corruption_scandal: (G, _ctx, choiceValue) => {
    const choice = G.eventState.pendingChoice!;
    const option = choiceValue as string;
    if (!choice.binaryOptions?.includes(option)) return false;

    const p = G.playerInfo[choice.targetPlayerID];

    if (option === "lose_cathedral") {
      p.cathedrals -= 1;
      p.resources.gold += BUILDING_SELL_PRICE;
      logEvent(G, `Corruption Scandal: ${p.kingdomName} loses a cathedral (sold for ${BUILDING_SELL_PRICE} gold, now has ${p.cathedrals})`);
    } else if (option === "lose_vp") {
      removeVPAmount(G, choice.targetPlayerID, 3);
      logEvent(G, `Corruption Scandal: ${p.kingdomName} loses 3 VP (protecting their cathedrals)`);
    } else {
      return false;
    }
    return true;
  },
};

// ── Move ─────────────────────────────────────────────────────────────────────

const resolveEventChoice: MoveDefinition = {
  fn: ({ G, ctx, playerID, events }, ...args) => {
    const choiceValue = args[0];

    const choice = G.eventState.pendingChoice;
    if (!choice) return INVALID_MOVE;
    if (choice.targetPlayerID !== playerID) return INVALID_MOVE;

    const handler = CHOICE_HANDLERS[choice.card];
    if (!handler) return INVALID_MOVE;

    const success = handler(G, ctx, choiceValue);
    if (!success) return INVALID_MOVE;

    G.eventState.pendingChoice = null;
    events.endPhase();
  },
  errorMessage: "Cannot resolve this event choice",
};

export default resolveEventChoice;
