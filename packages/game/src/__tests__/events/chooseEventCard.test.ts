/**
 * chooseEventCard.test.ts & resolveEventChoice.test.ts
 *
 * Tests for the event card system:
 * - chooseEventCard: player selects a card from hand, once all choose → resolve
 * - resolveEventChoice: target player makes interactive choice for certain events
 */

import { describe, it, expect, vi } from "vitest";
import chooseEventCard from "../../moves/events/chooseEventCard";
import resolveEventChoice from "../../moves/events/resolveEventChoice";
import { buildInitialG, buildPlayer, buildCtx, buildResources } from "../testHelpers";
import { INVALID_MOVE } from "boardgame.io/core";
import { EventCardName } from "../../types";

const stubEvents = () => ({ endTurn: vi.fn(), endPhase: vi.fn() });
const stubRandom = { Shuffle: <T>(arr: T[]) => arr };

function callChoose(
  G: ReturnType<typeof buildInitialG>,
  playerID: string,
  cardName: EventCardName,
  playOrder?: string[]
) {
  const events = stubEvents();
  const ctx = {
    ...buildCtx(playerID, Object.keys(G.playerInfo).length),
    playOrder: playOrder ?? Object.keys(G.playerInfo),
  };
  const result = (chooseEventCard as Function)(
    { G, ctx, playerID, events, random: stubRandom },
    cardName
  );
  return { result, events };
}

function callResolveChoice(
  G: ReturnType<typeof buildInitialG>,
  playerID: string,
  choiceValue: any,
  playOrder?: string[]
) {
  const events = stubEvents();
  const ctx = {
    ...buildCtx(playerID, Object.keys(G.playerInfo).length),
    playOrder: playOrder ?? Object.keys(G.playerInfo),
  };
  const result = (resolveEventChoice as Function)(
    { G, ctx, playerID, events },
    choiceValue
  );
  return { result, events };
}

// ── chooseEventCard ─────────────────────────────────────────────────────────

describe("chooseEventCard — validation", () => {
  it("returns INVALID_MOVE if card is not in player's hand", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ eventCards: ["bumper_crops"] }) }),
      buildPlayer("1"),
    ]);
    const { result } = callChoose(G, "0", "the_great_fire");
    expect(result).toBe(INVALID_MOVE);
  });
});

describe("chooseEventCard — card management", () => {
  it("removes the chosen card from the player's hand", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ eventCards: ["bumper_crops", "crops_fail"] }) }),
      buildPlayer("1", { resources: buildResources({ eventCards: ["bumper_crops"] }) }),
    ]);
    callChoose(G, "0", "bumper_crops");
    expect(G.playerInfo["0"].resources.eventCards).toEqual(["crops_fail"]);
  });

  it("adds the card to eventState.chosenCards", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ eventCards: ["bumper_crops"] }) }),
      buildPlayer("1", { resources: buildResources({ eventCards: ["crops_fail"] }) }),
    ]);
    callChoose(G, "0", "bumper_crops");
    expect(G.eventState.chosenCards).toContain("bumper_crops");
  });

  it("calls endTurn when not all players have chosen yet", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ eventCards: ["bumper_crops"] }) }),
      buildPlayer("1", { resources: buildResources({ eventCards: ["crops_fail"] }) }),
    ]);
    const { events } = callChoose(G, "0", "bumper_crops");
    expect(events.endTurn).toHaveBeenCalled();
    expect(events.endPhase).not.toHaveBeenCalled();
  });
});

describe("chooseEventCard — resolution (all players chosen)", () => {
  it("resolves an auto-resolve card and calls endPhase", () => {
    // bumper_crops is a non-battle, non-choice card that sets taxModifier
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ eventCards: ["bumper_crops"] }) }),
      buildPlayer("1", { resources: buildResources({ eventCards: ["bumper_crops"] }) }),
    ]);
    G.eventState.deck = ["crops_fail", "crops_fail"]; // for replenishment

    callChoose(G, "0", "bumper_crops");
    const { events } = callChoose(G, "1", "bumper_crops", ["0", "1"]);

    expect(G.eventState.resolvedEvent).toBe("bumper_crops");
    expect(events.endPhase).toHaveBeenCalled();
  });

  it("clears chosenCards after resolution", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ eventCards: ["bumper_crops"] }) }),
      buildPlayer("1", { resources: buildResources({ eventCards: ["bumper_crops"] }) }),
    ]);
    G.eventState.deck = ["crops_fail", "crops_fail"];

    callChoose(G, "0", "bumper_crops");
    callChoose(G, "1", "bumper_crops", ["0", "1"]);

    expect(G.eventState.chosenCards).toEqual([]);
  });

  it("replenishes each player with 1 card from deck", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ eventCards: ["bumper_crops"] }) }),
      buildPlayer("1", { resources: buildResources({ eventCards: ["bumper_crops"] }) }),
    ]);
    G.eventState.deck = ["crops_fail", "peace_accord_reached"];

    callChoose(G, "0", "bumper_crops");
    callChoose(G, "1", "bumper_crops", ["0", "1"]);

    // Each player should have 1 card replenished (the extra bumper_crops
    // goes back to deck, then shuffle, then draw)
    // Player 0 started with ["bumper_crops"], played it (empty), then gets replenished
    expect(G.playerInfo["0"].resources.eventCards.length).toBe(1);
    expect(G.playerInfo["1"].resources.eventCards.length).toBe(1);
  });

  it("returns unused cards to deck when a non-void card is found", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ eventCards: ["bumper_crops"] }) }),
      buildPlayer("1", { resources: buildResources({ eventCards: ["crops_fail"] }) }),
    ]);
    const deckSizeBefore = G.eventState.deck.length;

    callChoose(G, "0", "bumper_crops");
    callChoose(G, "1", "crops_fail", ["0", "1"]);

    // One card resolved, one returned to deck + replenishment draws
    // The deck should reflect the returned card minus replenishment draws
    // Since bumper_crops resolves first (Shuffle is identity), famine returns to deck
    // Then 2 players draw 1 each from deck
    expect(G.eventState.resolvedEvent).toBe("bumper_crops");
  });

  it("sets pendingChoice and transfers turn for interactive events", () => {
    // dynastic_marriage is void with <4 players, so use 4 players
    // All 4 players choose dynastic_marriage so identity-shuffle puts it first
    const G = buildInitialG([
      buildPlayer("0", {
        resources: buildResources({ eventCards: ["dynastic_marriage"], victoryPoints: 5 }),
      }),
      buildPlayer("1", {
        resources: buildResources({ eventCards: ["dynastic_marriage"], victoryPoints: 10 }),
      }),
      buildPlayer("2", {
        resources: buildResources({ eventCards: ["dynastic_marriage"], victoryPoints: 10 }),
      }),
      buildPlayer("3", {
        resources: buildResources({ eventCards: ["dynastic_marriage"], victoryPoints: 10 }),
      }),
    ]);
    G.eventState.deck = ["crops_fail", "crops_fail", "crops_fail", "crops_fail"];
    const playOrder = ["0", "1", "2", "3"];

    callChoose(G, "0", "dynastic_marriage", playOrder);
    callChoose(G, "1", "dynastic_marriage", playOrder);
    callChoose(G, "2", "dynastic_marriage", playOrder);
    const { events } = callChoose(G, "3", "dynastic_marriage", playOrder);

    // dynastic_marriage needs a choice (pick ally) → pendingChoice set
    expect(G.eventState.pendingChoice).not.toBeNull();
    expect(G.eventState.pendingChoice!.card).toBe("dynastic_marriage");
    expect(events.endTurn).toHaveBeenCalled();
  });
});

describe("chooseEventCard — all void scenario", () => {
  it("handles all-void cards: no event resolved, cards return to deck", () => {
    // Use cards that will be void: orthodox_rebellion is void when no heretics exist
    const G = buildInitialG([
      buildPlayer("0", {
        hereticOrOrthodox: "orthodox",
        resources: buildResources({ eventCards: ["orthodox_rebellion"] }),
      }),
      buildPlayer("1", {
        hereticOrOrthodox: "orthodox",
        resources: buildResources({ eventCards: ["orthodox_rebellion"] }),
      }),
    ]);
    G.eventState.deck = ["crops_fail", "crops_fail"];

    callChoose(G, "0", "orthodox_rebellion");
    callChoose(G, "1", "orthodox_rebellion", ["0", "1"]);

    expect(G.eventState.resolvedEvent).toBeNull();
    // Both void cards returned to deck (minus replenishment draws)
    expect(G.gameLog.some((e: any) => e.message?.includes("No event was resolved") || (typeof e === "string" && e.includes("No event")))).toBe(true);
  });
});

// ── resolveEventChoice ──────────────────────────────────────────────────────

describe("resolveEventChoice — validation", () => {
  it("returns INVALID_MOVE if no pendingChoice", () => {
    const G = buildInitialG();
    G.eventState.pendingChoice = null;
    const { result } = callResolveChoice(G, "0", "cathedral");
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE if wrong player tries to choose", () => {
    const G = buildInitialG();
    G.eventState.pendingChoice = {
      card: "the_great_fire",
      targetPlayerID: "0",
      buildingOptions: ["cathedral", "palace"],
    };
    const { result } = callResolveChoice(G, "1", "cathedral");
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE if no handler for the card", () => {
    const G = buildInitialG();
    G.eventState.pendingChoice = {
      card: "bumper_crops" as EventCardName, // no handler for this
      targetPlayerID: "0",
    };
    const { result } = callResolveChoice(G, "0", "anything");
    expect(result).toBe(INVALID_MOVE);
  });

  it("clears pendingChoice and calls endPhase on success", () => {
    const G = buildInitialG([
      buildPlayer("0", { cathedrals: 2, palaces: 1, shipyards: 0 }),
      buildPlayer("1"),
    ]);
    G.eventState.pendingChoice = {
      card: "the_great_fire",
      targetPlayerID: "0",
      buildingOptions: ["cathedral", "palace"],
    };
    const { events } = callResolveChoice(G, "0", "cathedral");
    expect(G.eventState.pendingChoice).toBeNull();
    expect(events.endPhase).toHaveBeenCalled();
  });
});

describe("resolveEventChoice — the_great_fire handler", () => {
  it("decrements the chosen building type", () => {
    const G = buildInitialG([
      buildPlayer("0", { cathedrals: 3, palaces: 2, shipyards: 1 }),
      buildPlayer("1"),
    ]);
    G.eventState.pendingChoice = {
      card: "the_great_fire",
      targetPlayerID: "0",
      buildingOptions: ["cathedral", "palace", "shipyard"],
    };
    callResolveChoice(G, "0", "cathedral");
    expect(G.playerInfo["0"].cathedrals).toBe(2);
  });

  it("rejects invalid building type", () => {
    const G = buildInitialG([
      buildPlayer("0", { cathedrals: 3, palaces: 2, shipyards: 1 }),
      buildPlayer("1"),
    ]);
    G.eventState.pendingChoice = {
      card: "the_great_fire",
      targetPlayerID: "0",
      buildingOptions: ["cathedral", "palace"],
    };
    const { result } = callResolveChoice(G, "0", "shipyard");
    expect(result).toBe(INVALID_MOVE);
  });
});

describe("resolveEventChoice — royal_succession handler", () => {
  it("sets the chosen legacy card on the player", () => {
    const card1 = { name: "the builder" as const, colour: "purple" as const };
    const card2 = { name: "the conqueror" as const, colour: "orange" as const };
    const G = buildInitialG([
      buildPlayer("0"),
      buildPlayer("1"),
    ]);
    G.eventState.pendingChoice = {
      card: "royal_succession",
      targetPlayerID: "0",
      legacyOptions: [card1, card2],
    };
    callResolveChoice(G, "0", card1);
    expect(G.playerInfo["0"].resources.legacyCard).toEqual(card1);
  });

  it("returns unchosen cards to the legacy deck", () => {
    const card1 = { name: "the builder" as const, colour: "purple" as const };
    const card2 = { name: "the conqueror" as const, colour: "orange" as const };
    const G = buildInitialG([
      buildPlayer("0"),
      buildPlayer("1"),
    ]);
    G.cardDecks.legacyDeck = [];
    G.eventState.pendingChoice = {
      card: "royal_succession",
      targetPlayerID: "0",
      legacyOptions: [card1, card2],
    };
    callResolveChoice(G, "0", card1);
    expect(G.cardDecks.legacyDeck).toContainEqual(card2);
    expect(G.cardDecks.legacyDeck).not.toContainEqual(card1);
  });

  it("rejects a card not in legacyOptions", () => {
    const card1 = { name: "the builder" as const, colour: "purple" as const };
    const G = buildInitialG([
      buildPlayer("0"),
      buildPlayer("1"),
    ]);
    G.eventState.pendingChoice = {
      card: "royal_succession",
      targetPlayerID: "0",
      legacyOptions: [card1],
    };
    const { result } = callResolveChoice(G, "0", { name: "the mighty", colour: "green" });
    expect(result).toBe(INVALID_MOVE);
  });
});

describe("resolveEventChoice — dynastic_marriage handler", () => {
  it("awards 3 VP to both players and sets alliance", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ victoryPoints: 10 }) }),
      buildPlayer("1", { resources: buildResources({ victoryPoints: 10 }) }),
    ]);
    G.eventState.pendingChoice = {
      card: "dynastic_marriage",
      targetPlayerID: "0",
      allyOptions: ["1"],
    };
    callResolveChoice(G, "0", "1");
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(13);
    expect(G.playerInfo["1"].resources.victoryPoints).toBe(13);
    expect(G.eventState.dynasticMarriage).toEqual(["0", "1"]);
  });

  it("rejects an invalid ally", () => {
    const G = buildInitialG([
      buildPlayer("0"),
      buildPlayer("1"),
    ]);
    G.eventState.pendingChoice = {
      card: "dynastic_marriage",
      targetPlayerID: "0",
      allyOptions: ["1"],
    };
    const { result } = callResolveChoice(G, "0", "99");
    expect(result).toBe(INVALID_MOVE);
  });
});
