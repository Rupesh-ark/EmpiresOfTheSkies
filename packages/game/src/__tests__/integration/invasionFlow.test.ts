/**
 * invasionFlow.test.ts (integration)
 *
 * Tests the full invasion chain:
 *   1. Archprelate nominates Captain-General (nominateCaptainGeneral)
 *   2. All players contribute troops (contributeToGrandArmy)
 *   3a. Grand Army wins → VP rewards distributed
 *   3b. Grand Army loses → buyoff phase (offerBuyoffGold)
 *
 * Key rules tested:
 *   - Only Archprelate can nominate
 *   - Nominee must be Orthodox if any Orthodox player exists
 *   - All players must contribute before battle resolves
 *   - Contributing 0 is valid
 *   - Captain-General VP bonus on successful defense
 *   - Buyoff: all players offer gold after defeat
 */

import { describe, it, expect, vi } from "vitest";
import nominateCaptainGeneral from "../../moves/events/nominateCaptainGeneral.js";
import contributeToGrandArmy from "../../moves/events/contributeToGrandArmy.js";
import commitInvasionFoW from "../../moves/events/commitInvasionFoW.js";
import offerBuyoffGold from "../../moves/events/offerBuyoffGold.js";
import { checkForInvasion } from "../../helpers/resolveInvasion.js";
import {
  ASSIGNABLE_KINGDOMS,
  INFIDEL_EMPIRE_LOCATION,
} from "../../data/gameData.js";
import { enumerateLegalMoves } from "../../ai/enumerate.js";
import {
  buildInitialG,
  buildPlayer,
  buildCtx,
  buildResources,
  buildRandom,
} from "../testHelpers.js";
import { INVALID_MOVE } from "boardgame.io/core";
import type { EventsAPI } from "../../types.js";

const stubEvents = () =>
  ({
    endTurn: vi.fn(),
    endPhase: vi.fn(),
  } as unknown as EventsAPI & {
    endTurn: ReturnType<typeof vi.fn>;
    endPhase: ReturnType<typeof vi.fn>;
  });

function buildInvasion(totalHostSwords = 5) {
  return {
    totalHostSwords,
    contributions: {} as Record<string, { regiments: number; levies: number; skyships: number }>,
    phase: "nominate" as const,
    eligibleCaptainGenerals: ["0", "1"] as string[],
  };
}

function callNominate(
  G: ReturnType<typeof buildInitialG>,
  playerID: string,
  nomineeID: string,
  playOrder: string[]
) {
  const events = stubEvents();
  const ctx = {
    ...buildCtx(playerID, playOrder.length),
    playOrder,
    currentPlayer: playerID,
  };
  const result = nominateCaptainGeneral.fn({ G, ctx, playerID, events }, nomineeID);
  return { result, events };
}

function callContribute(
  G: ReturnType<typeof buildInitialG>,
  playerID: string,
  regiments: number,
  levies: number,
  playOrder: string[],
  skyships = 0
) {
  const events = stubEvents();
  const ctx = {
    ...buildCtx(playerID, playOrder.length),
    playOrder,
    currentPlayer: playerID,
  };
  const result = contributeToGrandArmy.fn(
    { G, ctx, playerID, events, random: buildRandom() },
    regiments,
    levies,
    skyships
  );
  return { result, events };
}

function callCommitInvasionFoW(
  G: ReturnType<typeof buildInitialG>,
  playerID: string,
  selection: number | "draw",
  playOrder: string[]
) {
  const events = stubEvents();
  const ctx = {
    ...buildCtx(playerID, playOrder.length),
    playOrder,
    currentPlayer: playerID,
  };
  const result = commitInvasionFoW.fn(
    { G, ctx, playerID, events, random: buildRandom() },
    selection
  );
  return { result, events };
}

function callBuyoff(
  G: ReturnType<typeof buildInitialG>,
  playerID: string,
  amount: number,
  playOrder: string[]
) {
  const events = stubEvents();
  const ctx = {
    ...buildCtx(playerID, playOrder.length),
    playOrder,
    currentPlayer: playerID,
  };
  const result = offerBuyoffGold.fn({ G, ctx, playerID, events }, amount);
  return { result, events };
}

// Test 1: Archprelate nominates Captain-General

describe("invasionFlow — Archprelate nominates Captain-General", () => {
  it("sets isCaptainGeneral on the nominated player", () => {
    const G = buildInitialG([
      buildPlayer("0", { isArchprelate: true, hereticOrOrthodox: "orthodox" }),
      buildPlayer("1", { hereticOrOrthodox: "orthodox" }),
    ]);
    G.currentInvasion = buildInvasion();

    callNominate(G, "0", "1", ["0", "1"]);

    expect(G.playerInfo["1"].isCaptainGeneral).toBe(true);
    expect(G.playerInfo["0"].isCaptainGeneral).toBe(false);
  });

  it("advances invasion phase to 'contribute' and stage to 'invasion_contribute'", () => {
    const G = buildInitialG([
      buildPlayer("0", { isArchprelate: true, hereticOrOrthodox: "orthodox" }),
      buildPlayer("1", { hereticOrOrthodox: "orthodox" }),
    ]);
    G.currentInvasion = buildInvasion();

    callNominate(G, "0", "1", ["0", "1"]);

    expect(G.currentInvasion?.phase).toBe("contribute");
    expect(G.step).toBe("invasion_contribute");
  });

  it("returns INVALID_MOVE if the player is not the Archprelate", () => {
    const G = buildInitialG([
      buildPlayer("0", { isArchprelate: false }),
      buildPlayer("1", { isArchprelate: true }),
    ]);
    G.currentInvasion = buildInvasion();

    const { result } = callNominate(G, "0", "1", ["0", "1"]);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when nominating a Heretic if Orthodox players exist", () => {
    const G = buildInitialG([
      buildPlayer("0", { isArchprelate: true, hereticOrOrthodox: "orthodox" }),
      buildPlayer("1", { hereticOrOrthodox: "heretic" }),
    ]);
    G.currentInvasion = buildInvasion();

    const { result } = callNominate(G, "0", "1", ["0", "1"]);
    expect(result).toBe(INVALID_MOVE);
  });
});

// Test 2: All players contribute → invasion resolves

describe("invasionFlow — all players contribute troops", () => {
  it("does not resolve after only one player has contributed (2-player game)", () => {
    const G = buildInitialG([
      buildPlayer("0", { isArchprelate: true, resources: buildResources({ regiments: 6 }) }),
      buildPlayer("1", { resources: buildResources({ regiments: 6 }) }),
    ]);
    G.currentInvasion = { ...buildInvasion(5), phase: "contribute" };
    // Set up contingent pool for the battle simulation
    G.contingentPool = [3, 3, 3, 3, 3, 3];
    G.accumulatedHosts = [{ swords: 5, shields: 0, isFleet: false, isInvasionTrigger: true }];

    callContribute(G, "0", 3, 0, ["0", "1"]);

    // Player "1" hasn't contributed yet
    expect(G.currentInvasion?.contributions["0"]).toBeDefined();
    expect(G.currentInvasion?.contributions["1"]).toBeUndefined();
  });

  it("resolves after all players contribute", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        isArchprelate: true,
        isCaptainGeneral: true,
        resources: buildResources({ regiments: 8 }),
      }),
      buildPlayer("1", { resources: buildResources({ regiments: 8 }) }),
    ]);
    // Use very large contributions to ensure Grand Army wins
    G.currentInvasion = { ...buildInvasion(3), phase: "contribute" };
    G.contingentPool = [3, 3, 3, 3, 3, 3];
    G.accumulatedHosts = [{ swords: 3, shields: 0, isFleet: false, isInvasionTrigger: true }];

    callContribute(G, "0", 5, 0, ["0", "1"]);
    const { events } = callContribute(G, "1", 5, 0, ["0", "1"]);

    expect(G.currentInvasion).toBeNull();
    expect(events.endPhase).toHaveBeenCalledOnce();
  });

  it("excludes the Infidel Fleet from Grand Army ground battle and pool return", () => {
    const fleetCounter = { swords: 15, shields: 5, isFleet: true, isInvasionTrigger: false };
    const triggerCounter = { swords: 30, shields: 0, isFleet: false, isInvasionTrigger: true };
    const G = buildInitialG([
      buildPlayer("0", {
        resources: buildResources({ regiments: 20 }),
      }),
      buildPlayer("1", {
        resources: buildResources({ regiments: 20 }),
      }),
    ]);
    G.infidelHostPool = [triggerCounter, fleetCounter];
    G.contingentPool = [];
    G.cardDecks.fortuneOfWarCards = [
      { name: "Sword1_1", sword: 1, shield: 0 },
      { name: "Sword1_2", sword: 1, shield: 0 },
    ];

    expect(checkForInvasion(G)).toBe(false);
    expect(G.infidelFleet?.counter).toBe(fleetCounter);
    expect(G.accumulatedHosts).toEqual([]);

    expect(checkForInvasion(G)).toBe(true);
    expect(G.accumulatedHosts).toEqual([triggerCounter]);
    G.accumulatedHosts.push(fleetCounter);
    G.currentInvasion!.phase = "contribute";

    callContribute(G, "0", 15, 0, ["0", "1"]);
    callContribute(G, "1", 15, 0, ["0", "1"]);

    expect(G.battleResult?.attackerSwords).toBe(30);
    expect(G.battleResult?.attackerShields).toBe(0);
    expect(G.infidelFleet).not.toBeNull();
    expect(G.infidelFleet?.location).toEqual(INFIDEL_EMPIRE_LOCATION);
    expect(G.infidelHostPool.filter((counter) => counter.isFleet)).toHaveLength(0);
  });
});

describe("invasionFlow — corrected ground battle and casualties", () => {
  it("wins by surviving even when the Host is not wiped out", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        isCaptainGeneral: true,
        resources: buildResources({ regiments: 4 }),
      }),
      buildPlayer("1"),
    ]);
    G.currentInvasion = {
      ...buildInvasion(5),
      phase: "contribute",
    };
    G.contingentPool = [];
    G.accumulatedHosts = [
      {
        swords: 5,
        shields: 20,
        isFleet: false,
        isInvasionTrigger: true,
      },
    ];
    G.cardDecks.fortuneOfWarCards = [
      { name: "Host shield", sword: 0, shield: 1 },
      { name: "Army shield", sword: 0, shield: 1 },
    ];

    callContribute(G, "0", 4, 0, ["0", "1"]);
    callContribute(G, "1", 0, 0, ["0", "1"]);

    expect(G.battleResult).toMatchObject({
      winner: "Grand Army",
      attackerLosses: "none",
      defenderSwords: 8,
    });
    expect(G.currentInvasion).toBeNull();
  });

  it("applies victory casualties largest-first, with an NPR later than an IPO-tied player force", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        isCaptainGeneral: true,
        resources: buildResources({ levies: 2 }),
      }),
      buildPlayer("1", {
        resources: buildResources({ regiments: 1 }),
      }),
    ]);
    G.currentInvasion = {
      ...buildInvasion(2),
      phase: "contribute",
    };
    // One strength-2 NPR force ties player 0's two-unit force for size.
    G.contingentPool = [2];
    G.accumulatedHosts = [
      {
        swords: 2,
        shields: 20,
        isFleet: false,
        isInvasionTrigger: true,
      },
    ];
    G.cardDecks.fortuneOfWarCards = [
      { name: "Host sword", sword: 1, shield: 0 },
      { name: "Army shield", sword: 0, shield: 1 },
    ];

    callContribute(G, "0", 0, 2, ["0", "1"]);
    callContribute(G, "1", 1, 0, ["0", "1"]);

    expect(G.battleResult?.winner).toBe("Grand Army");
    expect(G.playerInfo["0"].resources.levies).toBe(0);
    expect(G.playerInfo["1"].resources.regiments).toBe(1);
    expect(G.contingentPool).toContain(2);
  });

  it("annihilates every contributed unit and returns NPR contingents on defeat", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        isCaptainGeneral: true,
        resources: buildResources({
          regiments: 2,
          levies: 1,
          skyships: 2,
        }),
      }),
      buildPlayer("1", {
        resources: buildResources({
          regiments: 1,
          levies: 2,
          skyships: 1,
        }),
      }),
    ]);
    G.currentInvasion = {
      ...buildInvasion(20),
      phase: "contribute",
    };
    G.contingentPool = [2];
    G.accumulatedHosts = [
      {
        swords: 20,
        shields: 20,
        isFleet: false,
        isInvasionTrigger: true,
      },
    ];
    G.cardDecks.fortuneOfWarCards = [
      { name: "Host sword", sword: 1, shield: 0 },
      { name: "Army shield", sword: 0, shield: 1 },
    ];

    callContribute(G, "0", 2, 1, ["0", "1"], 2);
    callContribute(G, "1", 1, 2, ["0", "1"], 1);

    expect(G.battleResult?.winner).toBe("Infidel Host");
    expect(G.currentInvasion?.phase).toBe("buyoff");
    expect(G.playerInfo["0"].resources).toMatchObject({
      regiments: 0,
      levies: 0,
      skyships: 0,
    });
    expect(G.playerInfo["1"].resources).toMatchObject({
      regiments: 0,
      levies: 0,
      skyships: 0,
    });
    expect(G.contingentPool).toEqual([2]);
  });

  it("ranks player forces by unit count, so three Levies outrank two Regiments", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        resources: buildResources({ regiments: 2 }),
      }),
      buildPlayer("1", {
        isCaptainGeneral: true,
        resources: buildResources({ levies: 3 }),
      }),
    ]);
    G.currentInvasion = {
      ...buildInvasion(1),
      phase: "contribute",
    };
    G.contingentPool = [];
    G.accumulatedHosts = [
      {
        swords: 1,
        shields: 20,
        isFleet: false,
        isInvasionTrigger: true,
      },
    ];
    G.cardDecks.fortuneOfWarCards = [
      { name: "Host shield", sword: 0, shield: 1 },
      { name: "Army shield", sword: 0, shield: 1 },
    ];

    callContribute(G, "0", 2, 0, ["0", "1"]);
    callContribute(G, "1", 0, 3, ["0", "1"]);

    expect(G.playerInfo["0"].resources.victoryPoints).toBe(12);
    expect(G.playerInfo["1"].resources.victoryPoints).toBe(18);
  });

  it("awards 4VP to each tied-largest player force", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        isCaptainGeneral: true,
        resources: buildResources({ levies: 2 }),
      }),
      buildPlayer("1", {
        resources: buildResources({ levies: 2 }),
      }),
    ]);
    G.currentInvasion = {
      ...buildInvasion(1),
      phase: "contribute",
    };
    G.contingentPool = [];
    G.accumulatedHosts = [
      {
        swords: 1,
        shields: 20,
        isFleet: false,
        isInvasionTrigger: true,
      },
    ];
    G.cardDecks.fortuneOfWarCards = [
      { name: "Host shield", sword: 0, shield: 1 },
      { name: "Army shield", sword: 0, shield: 1 },
    ];

    callContribute(G, "0", 0, 2, ["0", "1"]);
    callContribute(G, "1", 0, 2, ["0", "1"]);

    expect(G.playerInfo["0"].resources.victoryPoints).toBe(17);
    expect(G.playerInfo["1"].resources.victoryPoints).toBe(14);
  });

  it("awards 5VP to a unique largest force and 4VP to each tied-second force", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        isCaptainGeneral: true,
        resources: buildResources({ levies: 3 }),
      }),
      buildPlayer("1", {
        resources: buildResources({ levies: 2 }),
      }),
      buildPlayer("2", {
        resources: buildResources({ levies: 2 }),
      }),
    ]);
    G.currentInvasion = {
      ...buildInvasion(1),
      phase: "contribute",
    };
    G.contingentPool = [];
    G.accumulatedHosts = [
      {
        swords: 1,
        shields: 20,
        isFleet: false,
        isInvasionTrigger: true,
      },
    ];
    G.cardDecks.fortuneOfWarCards = [
      { name: "Host shield", sword: 0, shield: 1 },
      { name: "Army shield", sword: 0, shield: 1 },
    ];

    callContribute(G, "0", 0, 3, ["0", "1", "2"]);
    callContribute(G, "1", 0, 2, ["0", "1", "2"]);
    callContribute(G, "2", 0, 2, ["0", "1", "2"]);

    expect(G.playerInfo["0"].resources.victoryPoints).toBe(18);
    expect(G.playerInfo["1"].resources.victoryPoints).toBe(14);
    expect(G.playerInfo["2"].resources.victoryPoints).toBe(14);
  });

  it("deducts 5VP from a unique smallest force and 4VP from each tied-second-smallest force", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        isCaptainGeneral: true,
        resources: buildResources({ levies: 1 }),
      }),
      buildPlayer("1", {
        resources: buildResources({ levies: 2 }),
      }),
      buildPlayer("2", {
        resources: buildResources({ levies: 2 }),
      }),
    ]);
    G.currentInvasion = {
      ...buildInvasion(10),
      phase: "contribute",
    };
    G.contingentPool = [];
    G.accumulatedHosts = [
      {
        swords: 10,
        shields: 20,
        isFleet: false,
        isInvasionTrigger: true,
      },
    ];
    G.cardDecks.fortuneOfWarCards = [
      { name: "Host sword", sword: 1, shield: 0 },
      { name: "Army shield", sword: 0, shield: 1 },
    ];

    callContribute(G, "0", 0, 1, ["0", "1", "2"]);
    callContribute(G, "1", 0, 2, ["0", "1", "2"]);
    callContribute(G, "2", 0, 2, ["0", "1", "2"]);

    expect(G.battleResult?.winner).toBe("Infidel Host");
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(2);
    expect(G.playerInfo["1"].resources.victoryPoints).toBe(6);
    expect(G.playerInfo["2"].resources.victoryPoints).toBe(6);
  });

  it("does not Shame a fleet-only contributor", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        isCaptainGeneral: true,
        heresyTracker: 0,
        resources: buildResources({ skyships: 1 }),
      }),
      buildPlayer("1", {
        resources: buildResources({ regiments: 1 }),
      }),
    ]);
    G.currentInvasion = {
      ...buildInvasion(1),
      phase: "contribute",
    };
    G.contingentPool = [];
    G.accumulatedHosts = [
      {
        swords: 1,
        shields: 20,
        isFleet: false,
        isInvasionTrigger: true,
      },
    ];
    G.cardDecks.fortuneOfWarCards = [
      { name: "Host shield", sword: 0, shield: 1 },
      { name: "Army shield", sword: 0, shield: 1 },
    ];

    callContribute(G, "0", 0, 0, ["0", "1"], 1);
    callContribute(G, "1", 1, 0, ["0", "1"]);

    expect(G.playerInfo["0"].heresyTracker).toBe(0);
  });
});

describe("invasionFlow — NPR realm scaling", () => {
  it.each([
    [2, 4],
    [4, 2],
    [6, 0],
  ])(
    "draws %i-player Grand Army contingents only for the %i unseated Kingdom slots",
    (playerCount, expectedNprCount) => {
      const players = ASSIGNABLE_KINGDOMS.slice(0, playerCount).map(
        (kingdomName, index) =>
          buildPlayer(String(index), {
            kingdomName,
            isCaptainGeneral: index === 0,
            resources: buildResources({
              fortuneCards:
                index === 0
                  ? [
                      {
                        name: "Pause ground",
                        sword: 1,
                        shield: 0,
                        flipped: false,
                      },
                    ]
                  : [],
            }),
          })
      );
      const playOrder = players.map((player) => player.id);
      const G = buildInitialG(players);
      G.currentInvasion = {
        ...buildInvasion(1),
        phase: "contribute",
        eligibleCaptainGenerals: playOrder,
      };
      G.contingentPool = [1, 2, 3, 4, 5, 6];
      G.accumulatedHosts = [
        {
          swords: 1,
          shields: 0,
          isFleet: false,
          isInvasionTrigger: true,
        },
      ];

      for (const playerID of playOrder) {
        callContribute(G, playerID, 0, 0, playOrder);
      }

      expect(G.currentInvasion?.phase).toBe("ground_fow");
      expect(G.currentInvasion?.nprContingents).toHaveLength(
        expectedNprCount
      );
      expect(G.contingentPool).toHaveLength(6 - expectedNprCount);
    }
  );
});

describe("invasionFlow — aerial invasion stage", () => {
  const fleetCounter = {
    swords: 3,
    shields: 0,
    isFleet: true,
    isInvasionTrigger: false,
  };

  const buildAerialG = () => {
    const G = buildInitialG([
      buildPlayer("0", {
        isCaptainGeneral: true,
        resources: buildResources({
          skyships: 2,
          fortuneCards: [
            {
              name: "Hand strike",
              sword: 3,
              shield: 0,
              flipped: false,
            },
            {
              name: "Ground reserve",
              sword: 1,
              shield: 0,
              flipped: false,
            },
          ],
        }),
      }),
    ]);
    G.currentInvasion = {
      ...buildInvasion(1),
      phase: "contribute",
      eligibleCaptainGenerals: ["0"],
    };
    G.contingentPool = [];
    G.accumulatedHosts = [
      {
        swords: 1,
        shields: 0,
        isFleet: false,
        isInvasionTrigger: true,
      },
    ];
    G.infidelFleet = {
      counter: { ...fleetCounter },
      location: [...INFIDEL_EMPIRE_LOCATION],
      active: true,
      destroyed: false,
    };
    G.cardDecks.fortuneOfWarCards = [
      { name: "Fleet sword", sword: 2, shield: 0 },
      { name: "Wing shield", sword: 0, shield: 1 },
    ];
    return G;
  };

  it("lets the Captain-General's hand card win where drawing loses, and consumes no player deck card", () => {
    const handG = buildAerialG();
    callContribute(handG, "0", 0, 0, ["0"], 2);
    expect(handG.currentInvasion?.phase).toBe("aerial_fow");
    callCommitInvasionFoW(handG, "0", 0, ["0"]);

    const drawG = buildAerialG();
    callContribute(drawG, "0", 0, 0, ["0"], 2);
    callCommitInvasionFoW(drawG, "0", "draw", ["0"]);

    expect(handG.currentInvasion?.aerialOutcome).toBe("players");
    expect(drawG.currentInvasion?.aerialOutcome).toBe("infidel");
    expect(handG.cardDecks.fortuneOfWarCards).toHaveLength(1);
    expect(drawG.cardDecks.fortuneOfWarCards).toHaveLength(0);
  });

  it("returns surviving skyships to contributors when the fleet wing loses", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        isCaptainGeneral: true,
        resources: buildResources({
          skyships: 5,
          fortuneCards: [
            {
              name: "Keep ground choice open",
              sword: 1,
              shield: 0,
              flipped: false,
            },
          ],
        }),
      }),
    ]);
    G.currentInvasion = {
      ...buildInvasion(1),
      phase: "contribute",
      eligibleCaptainGenerals: ["0"],
    };
    G.contingentPool = [];
    G.accumulatedHosts = [
      {
        swords: 1,
        shields: 0,
        isFleet: false,
        isInvasionTrigger: true,
      },
    ];
    G.infidelFleet = {
      counter: {
        ...fleetCounter,
        shields: 4,
      },
      location: [...INFIDEL_EMPIRE_LOCATION],
      active: true,
      destroyed: false,
    };
    G.cardDecks.fortuneOfWarCards = [
      { name: "Fleet sword", sword: 4, shield: 0 },
      { name: "Wing shield", sword: 0, shield: 1 },
    ];

    callContribute(G, "0", 0, 0, ["0"], 5);
    callCommitInvasionFoW(G, "0", "draw", ["0"]);

    expect(G.currentInvasion?.aerialOutcome).toBe("infidel");
    expect(G.currentInvasion?.survivingSkyships?.["0"]).toBe(0);
    expect(G.playerInfo["0"].resources.skyships).toBe(4);
    expect(G.currentInvasion?.phase).toBe("ground_fow");
  });

  it("allocates fleet-wing losses largest-contributor-first, then earliest IPO", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        isCaptainGeneral: true,
        resources: buildResources({
          skyships: 1,
          fortuneCards: [
            {
              name: "Aerial strike",
              sword: 1,
              shield: 0,
              flipped: false,
            },
            {
              name: "Ground reserve",
              sword: 1,
              shield: 0,
              flipped: false,
            },
          ],
        }),
      }),
      buildPlayer("1", {
        resources: buildResources({ skyships: 1 }),
      }),
      buildPlayer("2", {
        resources: buildResources({ skyships: 2 }),
      }),
    ]);
    G.currentInvasion = {
      ...buildInvasion(1),
      phase: "contribute",
      eligibleCaptainGenerals: ["0", "1"],
    };
    G.contingentPool = [];
    G.accumulatedHosts = [
      {
        swords: 1,
        shields: 0,
        isFleet: false,
        isInvasionTrigger: true,
      },
    ];
    G.infidelFleet = {
      counter: {
        ...fleetCounter,
        shields: 5,
      },
      location: [...INFIDEL_EMPIRE_LOCATION],
      active: true,
      destroyed: false,
    };
    G.cardDecks.fortuneOfWarCards = [
      { name: "Fleet strike", sword: 4, shield: 0 },
    ];

    callContribute(G, "0", 0, 0, ["0", "1", "2"], 1);
    callContribute(G, "1", 0, 0, ["0", "1", "2"], 1);
    callContribute(G, "2", 0, 0, ["0", "1", "2"], 2);
    callCommitInvasionFoW(G, "0", 0, ["0", "1", "2"]);

    expect(G.currentInvasion?.aerialOutcome).toBe("infidel");
    expect(G.playerInfo["0"].resources.skyships).toBe(0);
    expect(G.playerInfo["1"].resources.skyships).toBe(1);
    expect(G.playerInfo["2"].resources.skyships).toBe(0);
    expect(G.currentInvasion?.phase).toBe("ground_fow");
  });

  it("flips a surviving Infidel Fleet after the player wing wins", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        isCaptainGeneral: true,
        resources: buildResources({
          skyships: 5,
          fortuneCards: [
            {
              name: "Aerial shield",
              sword: 0,
              shield: 1,
              flipped: false,
            },
            {
              name: "Ground reserve",
              sword: 1,
              shield: 0,
              flipped: false,
            },
          ],
        }),
      }),
    ]);
    G.currentInvasion = {
      ...buildInvasion(1),
      phase: "contribute",
      eligibleCaptainGenerals: ["0"],
    };
    G.contingentPool = [];
    G.accumulatedHosts = [
      {
        swords: 1,
        shields: 0,
        isFleet: false,
        isInvasionTrigger: true,
      },
    ];
    G.infidelFleet = {
      counter: {
        ...fleetCounter,
        shields: 3,
      },
      location: [...INFIDEL_EMPIRE_LOCATION],
      active: true,
      destroyed: false,
    };
    G.cardDecks.fortuneOfWarCards = [
      { name: "Fleet strike", sword: 3, shield: 0 },
    ];

    callContribute(G, "0", 0, 0, ["0"], 5);
    callCommitInvasionFoW(G, "0", 0, ["0"]);

    expect(G.currentInvasion?.aerialOutcome).toBe("players");
    expect(G.infidelFleet).toMatchObject({
      location: INFIDEL_EMPIRE_LOCATION,
      active: false,
      destroyed: false,
    });
    expect(G.currentInvasion?.phase).toBe("ground_fow");
  });

  it("ignores Infidel Fleet losses when it wins an annihilating equal-loss tie", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        isCaptainGeneral: true,
        resources: buildResources({
          skyships: 3,
          fortuneCards: [
            {
              name: "Aerial no effect",
              sword: 0,
              shield: 0,
              flipped: false,
            },
            {
              name: "Ground reserve",
              sword: 1,
              shield: 0,
              flipped: false,
            },
          ],
        }),
      }),
    ]);
    G.currentInvasion = {
      ...buildInvasion(1),
      phase: "contribute",
      eligibleCaptainGenerals: ["0"],
    };
    G.contingentPool = [];
    G.accumulatedHosts = [
      {
        swords: 1,
        shields: 0,
        isFleet: false,
        isInvasionTrigger: true,
      },
    ];
    G.infidelFleet = {
      counter: { ...fleetCounter },
      location: [...INFIDEL_EMPIRE_LOCATION],
      active: true,
      destroyed: false,
    };
    G.cardDecks.fortuneOfWarCards = [
      { name: "Fleet strike", sword: 3, shield: 0 },
    ];

    callContribute(G, "0", 0, 0, ["0"], 3);
    callCommitInvasionFoW(G, "0", 0, ["0"]);

    expect(G.currentInvasion?.aerialOutcome).toBe("infidel");
    expect(G.playerInfo["0"].resources.skyships).toBe(0);
    expect(G.infidelFleet).toMatchObject({
      location: INFIDEL_EMPIRE_LOCATION,
      active: true,
      destroyed: false,
    });
    expect(
      G.infidelHostPool.some((counter) => counter.isFleet)
    ).toBe(false);
    expect(G.currentInvasion?.phase).toBe("ground_fow");
  });

  it("adds a victorious fleet wing's surviving skyships to the ground host", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        isCaptainGeneral: true,
        resources: buildResources({ skyships: 5 }),
      }),
    ]);
    G.currentInvasion = {
      ...buildInvasion(1),
      phase: "contribute",
      eligibleCaptainGenerals: ["0"],
    };
    G.contingentPool = [];
    G.accumulatedHosts = [
      {
        swords: 1,
        shields: 20,
        isFleet: false,
        isInvasionTrigger: true,
      },
    ];
    G.infidelFleet = {
      counter: { ...fleetCounter },
      location: [...INFIDEL_EMPIRE_LOCATION],
      active: true,
      destroyed: false,
    };
    G.cardDecks.fortuneOfWarCards = [
      { name: "Fleet shield", sword: 0, shield: 1 },
      { name: "Wing shield", sword: 0, shield: 1 },
      { name: "Host shield", sword: 0, shield: 1 },
      { name: "Army shield", sword: 0, shield: 1 },
    ];

    callContribute(G, "0", 0, 0, ["0"], 5);

    expect(G.infidelFleet).toBeNull();
    expect(G.battleResult).toMatchObject({
      battleType: "Infidel Invasion",
      defenderSwords: 5,
      defenderShields: 5,
    });
    expect(G.playerInfo["0"].resources.skyships).toBe(5);
  });

  it("resolves the separate ground FoW hand-or-draw decision", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        isCaptainGeneral: true,
        resources: buildResources({
          fortuneCards: [
            {
              name: "Ground defence",
              sword: 0,
              shield: 3,
              flipped: false,
            },
          ],
        }),
      }),
    ]);
    G.currentInvasion = {
      ...buildInvasion(1),
      phase: "contribute",
      eligibleCaptainGenerals: ["0"],
    };
    G.contingentPool = [1];
    G.accumulatedHosts = [
      {
        swords: 1,
        shields: 0,
        isFleet: false,
        isInvasionTrigger: true,
      },
    ];
    G.cardDecks.fortuneOfWarCards = [
      { name: "Host shield", sword: 0, shield: 1 },
    ];

    callContribute(G, "0", 0, 0, ["0"]);
    expect(G.currentInvasion?.phase).toBe("ground_fow");

    const { events } = callCommitInvasionFoW(G, "0", 0, ["0"]);

    expect(G.currentInvasion).toBeNull();
    expect(G.playerInfo["0"].resources.fortuneCards).toHaveLength(0);
    expect(events.endPhase).toHaveBeenCalledOnce();
  });

  it.each([
    {
      state: "destroyed",
      active: false,
      destroyed: true,
      expectedPhase: "ground_fow",
      expectedFleet: null,
    },
    {
      state: "flipped",
      active: false,
      destroyed: false,
      expectedPhase: "ground_fow",
      expectedFleet: "present",
    },
    {
      state: "active",
      active: true,
      destroyed: false,
      expectedPhase: "aerial_fow",
      expectedFleet: "present",
    },
  ] as const)(
    "carries a $state prior-combat Infidel Fleet into invasion setup correctly",
    ({ active, destroyed, expectedPhase, expectedFleet }) => {
      const G = buildAerialG();
      G.infidelFleet!.active = active;
      G.infidelFleet!.destroyed = destroyed;

      callContribute(G, "0", 0, 0, ["0"], 2);

      expect(G.currentInvasion?.phase).toBe(expectedPhase);
      expect(G.currentInvasion?.aerialOutcome).toBe(
        expectedPhase === "ground_fow" ? "skipped" : undefined
      );
      if (expectedFleet === null) {
        expect(G.infidelFleet).toBeNull();
        expect(
          G.infidelHostPool.some((counter) => counter.isFleet)
        ).toBe(true);
      } else {
        expect(G.infidelFleet).not.toBeNull();
      }
    }
  );

  it.each([
    ["aerial_fow", "invasion_aerial_fow"],
    ["ground_fow", "invasion_ground_fow"],
  ] as const)(
    "AI enumerates every hand index plus draw for the %s decision",
    (phase, step) => {
      const G = buildAerialG();
      G.currentInvasion!.phase = phase;
      G.step = step;
      const ctx = {
        ...buildCtx("0", 1),
        phase: "invasionCheck",
      };

      const moves = enumerateLegalMoves(G, ctx, "0").filter(
        (move) => move.move === "commitInvasionFoW"
      );

      expect(moves.map((move) => move.args)).toEqual([
        [0],
        [1],
        ["draw"],
      ]);
    }
  );
});

// Test 3: Contributing 0 troops is valid

describe("invasionFlow — contributing 0 troops is valid", () => {
  it("allows a player to contribute nothing", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        isArchprelate: true,
        isCaptainGeneral: true,
        resources: buildResources({ regiments: 6 }),
      }),
      buildPlayer("1", { resources: buildResources({ regiments: 6 }) }),
    ]);
    G.currentInvasion = { ...buildInvasion(100), phase: "contribute" };
    G.contingentPool = [3, 3, 3, 3, 3, 3];
    G.accumulatedHosts = [{ swords: 100, shields: 0, isFleet: false, isInvasionTrigger: true }];

    const { result } = callContribute(G, "0", 0, 0, ["0", "1"]);
    expect(result).not.toBe(INVALID_MOVE);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid skyship contribution %s",
    (skyships) => {
      const G = buildInitialG([
        buildPlayer("0", {
          resources: buildResources({ skyships: 3 }),
        }),
        buildPlayer("1"),
      ]);
      G.currentInvasion = {
        ...buildInvasion(),
        phase: "contribute",
      };

      const { result } = callContribute(
        G,
        "0",
        0,
        0,
        ["0", "1"],
        skyships
      );
      expect(result).toBe(INVALID_MOVE);
    }
  );
});

// Test 4: Buyoff phase after Grand Army loses

describe("invasionFlow — buyoff phase", () => {
  it("all players offer gold → transitions to retrieve fleets", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 10 }) }),
      buildPlayer("1", { resources: buildResources({ gold: 10 }) }),
    ]);
    // Set up buyoff phase directly
    G.currentInvasion = {
      totalHostSwords: 20,
      contributions: {},
      phase: "buyoff",
      eligibleCaptainGenerals: ["0", "1"],
      buyoffCost: 10,
      buyoffOffered: {},
    };

    callBuyoff(G, "0", 5, ["0", "1"]);

    // Only player "0" has offered — not yet resolved
    expect(G.currentInvasion).not.toBeNull();
    expect(G.currentInvasion?.buyoffOffered?.["0"]).toBe(5);

    const { events } = callBuyoff(G, "1", 5, ["0", "1"]);

    // Both offered → should transition away from buyoff
    expect(G.currentInvasion).toBeNull();
    expect(events.endPhase).toHaveBeenCalledOnce();
  });

  it("returns INVALID_MOVE if player offers more gold than they have", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 3 }) }),
      buildPlayer("1", { resources: buildResources({ gold: 3 }) }),
    ]);
    G.currentInvasion = {
      totalHostSwords: 20,
      contributions: {},
      phase: "buyoff",
      eligibleCaptainGenerals: ["0", "1"],
      buyoffCost: 10,
      buyoffOffered: {},
    };

    const { result } = callBuyoff(G, "0", 10, ["0", "1"]);
    expect(result).toBe(INVALID_MOVE);
  });

  it("offering 0 gold is valid (can't afford buyoff)", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 0 }) }),
      buildPlayer("1", { resources: buildResources({ gold: 5 }) }),
    ]);
    G.currentInvasion = {
      totalHostSwords: 10,
      contributions: {},
      phase: "buyoff",
      eligibleCaptainGenerals: ["0", "1"],
      buyoffCost: 5,
      buyoffOffered: {},
    };

    const { result } = callBuyoff(G, "0", 0, ["0", "1"]);
    expect(result).not.toBe(INVALID_MOVE);
  });
});

// Test 5: Phase guard — wrong phase returns INVALID_MOVE

describe("invasionFlow — phase guards", () => {
  it("contributeToGrandArmy returns INVALID_MOVE if phase is not 'contribute'", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ regiments: 4 }) }),
      buildPlayer("1"),
    ]);
    G.currentInvasion = buildInvasion(); // phase = "nominate"

    const { result } = callContribute(G, "0", 2, 0, ["0", "1"]);
    expect(result).toBe(INVALID_MOVE);
  });

  it("offerBuyoffGold returns INVALID_MOVE if phase is not 'buyoff'", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 5 }) }),
      buildPlayer("1"),
    ]);
    G.currentInvasion = { ...buildInvasion(), phase: "contribute" };

    const { result } = callBuyoff(G, "0", 3, ["0", "1"]);
    expect(result).toBe(INVALID_MOVE);
  });
});
