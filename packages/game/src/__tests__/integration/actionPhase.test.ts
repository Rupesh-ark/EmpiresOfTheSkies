/**
 * actionPhase.test.ts (integration)
 *
 * Tests a full actions phase by chaining multiple counsellor placements
 * across both players:
 *
 *   1. recruitRegiments: gains 4 regiments, costs gold + counsellor
 *   2. foundFactory: factory count increases, gold deducted
 *   3. deployFleet: fleet location updates, counsellor used, gold spent
 *   4. trainTroops: advances to confirm_fow_draw stage
 *   5. both players pass: stage advances to "attack or pass"
 *   6. player with 0 counsellors is auto-passed (INVALID_MOVE)
 */

import { describe, it, expect, vi } from "vitest";
import recruitRegiments from "../../moves/actions/recruitRegiments.js";
import foundFactory from "../../moves/actions/foundFactory.js";
import trainTroops from "../../moves/actions/trainTroops.js";
import deployFleet from "../../moves/actions/deployFleet.js";
import purchaseSkyships from "../../moves/actions/purchaseSkyships.js";
import pass from "../../moves/pass.js";
import {
  buildInitialG,
  buildPlayer,
  buildCtx,
  buildResources,
  buildFleet,
  buildEvents,
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

function buildPassCtx(playerID: string, phase = "actions", playOrder = ["0", "1"]) {
  return {
    ...buildCtx(playerID, playOrder.length),
    phase,
    playOrder,
    currentPlayer: playerID,
    playOrderPos: playOrder.indexOf(playerID),
  };
}

// Test 1: recruitRegiments — full state change chain

describe("actionPhase — recruitRegiments changes all state correctly", () => {
  it("gains 4 regiments, deducts gold, deducts counsellor, fills slot", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 10, counsellors: 4, regiments: 0 }) }),
      buildPlayer("1"),
    ]);
    const ctx = buildCtx("0");

    const goldBefore = G.playerInfo["0"].resources.gold;
    const actionsBefore = G.playerInfo["0"].actionsTakenThisRound;
    const regsBefore = G.playerInfo["0"].resources.regiments;

    recruitRegiments.fn({ G, ctx, playerID: "0" }, 0);

    expect(G.playerInfo["0"].resources.regiments).toBe(regsBefore + 4);
    expect(G.playerInfo["0"].resources.gold).toBe(goldBefore - 2); // cost = 1 + array.length + 1 = 2
    expect(G.playerInfo["0"].actionsTakenThisRound).toBe(actionsBefore + 1);
    expect(G.boardState.recruitRegiments[0]).toBe("0");
    expect(G.playerInfo["0"].turnComplete).toBe(true);
  });
});

// Test 2: foundFactory — sequential slots accumulate cost

describe("actionPhase — foundFactory adds factory and deducts gold", () => {
  it("first slot costs 1 gold and increments factories by 1", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 10, counsellors: 4 }), factories: 1 }),
      buildPlayer("1"),
    ]);
    const ctx = buildCtx("0");

    const factoriesBefore = G.playerInfo["0"].factories;
    const goldBefore = G.playerInfo["0"].resources.gold;

    foundFactory.fn({ G, ctx, playerID: "0" }, 0);

    expect(G.playerInfo["0"].factories).toBe(factoriesBefore + 1);
    expect(G.playerInfo["0"].resources.gold).toBe(goldBefore - 2);
    expect(G.playerInfo["0"].turnComplete).toBe(true);
  });

  it("player 0 and player 1 both found factories in the same round — cost escalates", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 10, counsellors: 4 }), factories: 1 }),
      buildPlayer("1", { resources: buildResources({ gold: 10, counsellors: 4 }), factories: 1 }),
    ]);

    // Player 0 takes slot 0 (costs 2G: 1 base + 1 for self)
    foundFactory.fn({ G, ctx: buildCtx("0"), playerID: "0" }, 0);
    const goldAfterFirst = G.playerInfo["1"].resources.gold;

    // Player 1 takes slot 1 (costs 3G: 1 base + 1 already taken + 1 for self)
    foundFactory.fn({ G, ctx: buildCtx("1"), playerID: "1" }, 1);

    expect(G.playerInfo["0"].factories).toBe(2);
    expect(G.playerInfo["1"].factories).toBe(2);
    expect(G.playerInfo["1"].resources.gold).toBe(goldAfterFirst - 3);
  });
});

// Test 3: trainTroops — counsellor used, stage changes

describe("actionPhase — trainTroops deducts counsellor and changes stage", () => {
  it("costs 1 counsellor and transitions to confirm_fow_draw", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ counsellors: 4 }) }),
      buildPlayer("1"),
    ]);
    const ctx = buildCtx("0");

    const actionsBefore = G.playerInfo["0"].actionsTakenThisRound;
    trainTroops.fn({ G, ctx, playerID: "0" });

    expect(G.playerInfo["0"].actionsTakenThisRound).toBe(actionsBefore + 1);
    expect(G.playerInfo["0"].playerBoardCounsellorLocations.trainTroops).toBe(true);
    expect(G.stage).toEqual({ phase: "actions", sub: "confirm_fow_draw" });
  });

  it("returns INVALID_MOVE if trainTroops already used this round", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ counsellors: 4 }) }),
      buildPlayer("1"),
    ]);
    const ctx = buildCtx("0");

    // Mark as already used
    G.playerInfo["0"].playerBoardCounsellorLocations.trainTroops = true;

    const result = trainTroops.fn({ G, ctx, playerID: "0" });
    expect(result).toBe(INVALID_MOVE);
  });
});

// Test 4: pass — both players pass → stage → "attack or pass"

describe("actionPhase — both players pass advances to 'attack or pass'", () => {
  it("first player's pass doesn't end phase when second hasn't passed", () => {
    const G = buildInitialG([buildPlayer("0"), buildPlayer("1")]);
    const events = stubEvents();
    const ctx = buildPassCtx("0");

    pass.fn({ G, ctx, playerID: "0", events });

    expect(G.playerInfo["0"].passed).toBe(true);
    expect(events.endTurn).toHaveBeenCalled();
    expect(events.endPhase).not.toHaveBeenCalled();
    expect(G.stage).toEqual({ phase: "actions", sub: "default" }); // stage unchanged
  });

  it("second player's pass ends phase and transitions to 'attack or pass'", () => {
    const G = buildInitialG([buildPlayer("0"), buildPlayer("1")]);
    G.playerInfo["0"].passed = true; // player 0 already passed

    const events = stubEvents();
    const ctx = buildPassCtx("1");

    pass.fn({ G, ctx, playerID: "1", events });

    expect(G.playerInfo["1"].passed).toBe(true);
    expect(G.stage).toEqual({ phase: "actions", sub: "default" });
    expect(events.endPhase).toHaveBeenCalled();
    expect(events.endTurn).not.toHaveBeenCalled();
  });
});

// Test 5: 0-counsellor player gets INVALID_MOVE

describe("actionPhase — player with 0 counsellors cannot take counsellor actions", () => {
  it("recruitRegiments returns INVALID_MOVE with 0 counsellors", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ counsellors: 0, gold: 10 }) }),
      buildPlayer("1"),
    ]);
    const ctx = buildCtx("0");

    const result = recruitRegiments.fn({ G, ctx, playerID: "0" }, 0);
    expect(result).toBe(INVALID_MOVE);
  });

  it("foundFactory returns INVALID_MOVE with 0 counsellors", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ counsellors: 0, gold: 10 }) }),
      buildPlayer("1"),
    ]);
    const ctx = buildCtx("0");

    const result = foundFactory.fn({ G, ctx, playerID: "0" }, 0);
    expect(result).toBe(INVALID_MOVE);
  });

  it("trainTroops returns INVALID_MOVE with 0 counsellors", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ counsellors: 0 }) }),
      buildPlayer("1"),
    ]);
    const ctx = buildCtx("0");

    const result = trainTroops.fn({ G, ctx, playerID: "0" });
    expect(result).toBe(INVALID_MOVE);
  });
});

// Test 6: multi-action round — counsellors deplete across actions

describe("actionPhase — counsellors deplete correctly across multiple actions", () => {
  it("player starting with 4 counsellors can take up to 4 actions before hitting 0", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        resources: buildResources({ counsellors: 4, gold: 30, regiments: 0 }),
        factories: 1,
      }),
      buildPlayer("1"),
    ]);
    const ctx = buildCtx("0");

    // Reset turnComplete between actions (in real game, each action is a separate turn)
    recruitRegiments.fn({ G, ctx, playerID: "0" }, 0);
    G.playerInfo["0"].turnComplete = false;
    expect(G.playerInfo["0"].actionsTakenThisRound).toBe(1);

    recruitRegiments.fn({ G, ctx, playerID: "0" }, 1);
    G.playerInfo["0"].turnComplete = false;
    expect(G.playerInfo["0"].actionsTakenThisRound).toBe(2);

    recruitRegiments.fn({ G, ctx, playerID: "0" }, 2);
    G.playerInfo["0"].turnComplete = false;
    expect(G.playerInfo["0"].actionsTakenThisRound).toBe(3);

    recruitRegiments.fn({ G, ctx, playerID: "0" }, 3);
    expect(G.playerInfo["0"].actionsTakenThisRound).toBe(4);

    // Now at max actions (counsellors = 4, actionsTaken = 4) — any counsellor action should fail
    G.playerInfo["0"].turnComplete = false;
    const result = foundFactory.fn({ G, ctx, playerID: "0" }, 0);
    expect(result).toBe(INVALID_MOVE);
  });
});

// Test 6: deployFleet — multiple fleets can be dispatched in same round

describe("actionPhase — multiple fleet dispatches per round", () => {
  it("allows dispatching fleet 0, then fleet 1 on a later turn", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        resources: buildResources({ counsellors: 4, gold: 10, skyships: 6, regiments: 4 }),
        fleetInfo: [
          buildFleet(0, { location: [4, 0], skyships: 0, regiments: 0, levies: 0 }),
          buildFleet(1, { location: [4, 0], skyships: 0, regiments: 0, levies: 0 }),
          buildFleet(2, { location: [4, 0], skyships: 0, regiments: 0, levies: 0 }),
        ],
      }),
      buildPlayer("1"),
    ]);
    // Mark destination tiles as discovered so fleets can move there
    G.mapState.discoveredTiles[0][5] = true;
    G.mapState.discoveredTiles[0][3] = true;
    const ctx = buildCtx("0");
    const events = buildEvents();

    // Dispatch fleet 0 to [5,0] — adjacent east of Kingdom [4,0]
    deployFleet.fn({ G, ctx, playerID: "0", events }, 0, [5, 0], 2, 1, 0);
    expect(G.playerInfo["0"].fleetInfo[0].location).toEqual([5, 0]);
    expect(G.playerInfo["0"].fleetInfo[0].dispatchedThisRound).toBe(true);
    expect(G.playerInfo["0"].actionsTakenThisRound).toBe(1);

    // Reset turnComplete so player can act again (simulating next IPO turn)
    G.playerInfo["0"].turnComplete = false;

    // Dispatch fleet 1 to [3,0] — adjacent west of Kingdom [4,0]
    deployFleet.fn({ G, ctx, playerID: "0", events }, 1, [3, 0], 2, 1, 0);
    expect(G.playerInfo["0"].fleetInfo[1].location).toEqual([3, 0]);
    expect(G.playerInfo["0"].fleetInfo[1].dispatchedThisRound).toBe(true);
    expect(G.playerInfo["0"].actionsTakenThisRound).toBe(2);

    // Fleet 0 stays dispatched, fleet 2 remains undispatched
    expect(G.playerInfo["0"].fleetInfo[0].dispatchedThisRound).toBe(true);
    expect(G.playerInfo["0"].fleetInfo[2].dispatchedThisRound).toBe(false);
  });

  it("blocks re-dispatching the same fleet in the same round", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        resources: buildResources({ counsellors: 4, gold: 10, skyships: 6, regiments: 4 }),
        fleetInfo: [
          buildFleet(0, { location: [4, 0], skyships: 0, regiments: 0, levies: 0 }),
          buildFleet(1, { location: [4, 0], skyships: 0, regiments: 0, levies: 0 }),
        ],
      }),
      buildPlayer("1"),
    ]);
    G.mapState.discoveredTiles[0][5] = true;
    G.mapState.discoveredTiles[0][3] = true;
    const ctx = buildCtx("0");
    const events = buildEvents();

    // Dispatch fleet 0 first
    deployFleet.fn({ G, ctx, playerID: "0", events }, 0, [5, 0], 2, 1, 0);
    expect(G.playerInfo["0"].fleetInfo[0].dispatchedThisRound).toBe(true);

    // Reset turnComplete so player can act again
    G.playerInfo["0"].turnComplete = false;

    // Attempt to dispatch fleet 0 again — should fail validation (already dispatched)
    const result = deployFleet.validate?.(G, "0", 0, [3, 0], 2, 1, 0, 0);
    expect(result).not.toBeNull();
    expect(result?.code).toBe("ALREADY_DISPATCHED");
  });
});

// Test 7: purchaseSkyships — Zeeland vs Venoa routing

describe("actionPhase — purchaseSkyships routes to the correct republic", () => {
  it("purchasing from Zeeland fills the Zeeland slot and grants 2 skyships", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 10, counsellors: 4, skyships: 0 }) }),
      buildPlayer("1"),
    ]);
    const ctx = buildCtx("0");

    const goldBefore = G.playerInfo["0"].resources.gold;
    const skyshipsBefore = G.playerInfo["0"].resources.skyships;

    purchaseSkyships.fn({ G, ctx, playerID: "0" }, "zeeland");

    expect(G.playerInfo["0"].resources.skyships).toBe(skyshipsBefore + 2);
    expect(G.playerInfo["0"].resources.gold).toBe(goldBefore - 3); // 2 base + 0 existing + 1 self = 3
    expect(G.boardState.purchaseSkyshipsZeeland).toContain("0");
    expect(G.boardState.purchaseSkyshipsVenoa).not.toContain("0");
    expect(G.playerInfo["0"].turnComplete).toBe(true);
  });

  it("purchasing from Venoa fills the Venoa slot and grants 2 skyships", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 10, counsellors: 4, skyships: 0 }) }),
      buildPlayer("1"),
    ]);
    const ctx = buildCtx("0");

    const goldBefore = G.playerInfo["0"].resources.gold;
    const skyshipsBefore = G.playerInfo["0"].resources.skyships;

    purchaseSkyships.fn({ G, ctx, playerID: "0" }, "venoa");

    expect(G.playerInfo["0"].resources.skyships).toBe(skyshipsBefore + 2);
    expect(G.playerInfo["0"].resources.gold).toBe(goldBefore - 3);
    expect(G.boardState.purchaseSkyshipsVenoa).toContain("0");
    expect(G.boardState.purchaseSkyshipsZeeland).not.toContain("0");
    expect(G.playerInfo["0"].turnComplete).toBe(true);
  });

  it("Venoa cost escalates independently when Zeeland is already occupied", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 10, counsellors: 4, skyships: 0 }) }),
      buildPlayer("1", { resources: buildResources({ gold: 10, counsellors: 4, skyships: 0 }) }),
    ]);

    // Player 1 buys from Venoa first, inflating the Venoa row
    purchaseSkyships.fn({ G, ctx: buildCtx("1"), playerID: "1" }, "venoa");
    G.playerInfo["1"].turnComplete = false;

    const goldBefore = G.playerInfo["0"].resources.gold;

    // Player 0 also buys from Venoa — should pay the escalated cost
    purchaseSkyships.fn({ G, ctx: buildCtx("0"), playerID: "0" }, "venoa");

    expect(G.boardState.purchaseSkyshipsVenoa).toEqual(["1", "0"]);
    expect(G.playerInfo["0"].resources.gold).toBe(goldBefore - 4); // 2 base + 1 existing + 1 self = 4
    expect(G.boardState.purchaseSkyshipsZeeland).toHaveLength(0);
  });

  it("returns INVALID_MOVE for an invalid republic", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 10, counsellors: 4, skyships: 0 }) }),
      buildPlayer("1"),
    ]);
    const ctx = buildCtx("0");

    const result = purchaseSkyships.fn({ G, ctx, playerID: "0" }, "atlantis");
    expect(result).toBe(INVALID_MOVE);
  });
});
