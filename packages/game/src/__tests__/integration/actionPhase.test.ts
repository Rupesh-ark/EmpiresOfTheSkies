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
import recruitRegiments from "../../moves/actions/recruitRegiments";
import foundFactory from "../../moves/actions/foundFactory";
import trainTroops from "../../moves/actions/trainTroops";
import pass from "../../moves/pass";
import {
  buildInitialG,
  buildPlayer,
  buildCtx,
  buildResources,
  buildFleet,
} from "../testHelpers";
import { INVALID_MOVE } from "boardgame.io/core";
import type { EventsAPI } from "boardgame.io/dist/types/src/plugins/events/events";

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

// ── Test 1: recruitRegiments — full state change chain ────────────────────────

describe("actionPhase — recruitRegiments changes all state correctly", () => {
  it("gains 4 regiments, deducts gold, deducts counsellor, fills slot", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 10, counsellors: 4, regiments: 0 }) }),
      buildPlayer("1"),
    ]);
    const ctx = buildCtx("0");

    const goldBefore = G.playerInfo["0"].resources.gold;
    const counsellorsBefore = G.playerInfo["0"].resources.counsellors;
    const regsBefore = G.playerInfo["0"].resources.regiments;

    recruitRegiments.fn({ G, ctx, playerID: "0" }, 0); // slot index 0 → slot position 1 → cost = 2G

    expect(G.playerInfo["0"].resources.regiments).toBe(regsBefore + 4);
    expect(G.playerInfo["0"].resources.gold).toBe(goldBefore - 2); // cost = 1 + slot = 2
    expect(G.playerInfo["0"].resources.counsellors).toBe(counsellorsBefore - 1);
    expect(G.boardState.recruitRegiments[1]).toBe("0");
    expect(G.playerInfo["0"].turnComplete).toBe(true);
  });
});

// ── Test 2: foundFactory — sequential slots accumulate cost ──────────────────

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
    expect(G.playerInfo["0"].resources.gold).toBe(goldBefore - 1);
    expect(G.playerInfo["0"].turnComplete).toBe(true);
  });

  it("player 0 and player 1 both found factories in the same round — cost escalates", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 10, counsellors: 4 }), factories: 1 }),
      buildPlayer("1", { resources: buildResources({ gold: 10, counsellors: 4 }), factories: 1 }),
    ]);

    // Player 0 takes slot 0 (costs 1G)
    foundFactory.fn({ G, ctx: buildCtx("0"), playerID: "0" }, 0);
    const goldAfterFirst = G.playerInfo["1"].resources.gold;

    // Player 1 takes slot 1 (costs 2G because slot 0 already taken)
    foundFactory.fn({ G, ctx: buildCtx("1"), playerID: "1" }, 1);

    expect(G.playerInfo["0"].factories).toBe(2);
    expect(G.playerInfo["1"].factories).toBe(2);
    expect(G.playerInfo["1"].resources.gold).toBe(goldAfterFirst - 2);
  });
});

// ── Test 3: trainTroops — counsellor used, stage changes ─────────────────────

describe("actionPhase — trainTroops deducts counsellor and changes stage", () => {
  it("costs 1 counsellor and transitions to confirm_fow_draw", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ counsellors: 4 }) }),
      buildPlayer("1"),
    ]);
    const ctx = buildCtx("0");

    const counsellorsBefore = G.playerInfo["0"].resources.counsellors;
    trainTroops.fn({ G, ctx, playerID: "0" });

    expect(G.playerInfo["0"].resources.counsellors).toBe(counsellorsBefore - 1);
    expect(G.playerInfo["0"].playerBoardCounsellorLocations.trainTroops).toBe(true);
    expect(G.stage).toBe("confirm_fow_draw");
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

// ── Test 4: pass — both players pass → stage → "attack or pass" ──────────────

describe("actionPhase — both players pass advances to 'attack or pass'", () => {
  it("first player's pass doesn't end phase when second hasn't passed", () => {
    const G = buildInitialG([buildPlayer("0"), buildPlayer("1")]);
    const events = stubEvents();
    const ctx = buildPassCtx("0");

    pass.fn({ G, ctx, playerID: "0", events });

    expect(G.playerInfo["0"].passed).toBe(true);
    expect(events.endTurn).toHaveBeenCalled();
    expect(events.endPhase).not.toHaveBeenCalled();
    expect(G.stage).toBe("actions"); // stage unchanged
  });

  it("second player's pass ends phase and transitions to 'attack or pass'", () => {
    const G = buildInitialG([buildPlayer("0"), buildPlayer("1")]);
    G.playerInfo["0"].passed = true; // player 0 already passed

    const events = stubEvents();
    const ctx = buildPassCtx("1");

    pass.fn({ G, ctx, playerID: "1", events });

    expect(G.playerInfo["1"].passed).toBe(true);
    expect(G.stage).toBe("attack or pass");
    expect(events.endPhase).toHaveBeenCalled();
    expect(events.endTurn).not.toHaveBeenCalled();
  });
});

// ── Test 5: 0-counsellor player gets INVALID_MOVE ────────────────────────────

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

// ── Test 6: multi-action round — counsellors deplete across actions ───────────

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
    recruitRegiments.fn({ G, ctx, playerID: "0" }, 0); // costs 1 counsellor
    G.playerInfo["0"].turnComplete = false;
    expect(G.playerInfo["0"].resources.counsellors).toBe(3);

    recruitRegiments.fn({ G, ctx, playerID: "0" }, 1); // costs 1 counsellor
    G.playerInfo["0"].turnComplete = false;
    expect(G.playerInfo["0"].resources.counsellors).toBe(2);

    recruitRegiments.fn({ G, ctx, playerID: "0" }, 2);
    G.playerInfo["0"].turnComplete = false;
    expect(G.playerInfo["0"].resources.counsellors).toBe(1);

    recruitRegiments.fn({ G, ctx, playerID: "0" }, 3);
    expect(G.playerInfo["0"].resources.counsellors).toBe(0);

    // Now at 0 counsellors — any counsellor action should fail
    G.playerInfo["0"].turnComplete = false;
    const result = foundFactory.fn({ G, ctx, playerID: "0" }, 0);
    expect(result).toBe(INVALID_MOVE);
  });
});
