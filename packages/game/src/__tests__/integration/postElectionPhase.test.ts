import { describe, expect, it, vi } from "vitest";
import electionPhase from "../../phases/election.js";
import postElectionPhase from "../../phases/postElection.js";
import type { EventsAPI, MyGameState } from "../../types.js";
import { buildCtx, buildInitialG, buildPlayer } from "../testHelpers.js";

const buildThreePlayerG = () => buildInitialG(
  [buildPlayer("0"), buildPlayer("1"), buildPlayer("2")],
  { turnOrder: ["2", "0", "1"] }
);

describe("election phase", () => {
  it("resets election state and sets the legacy stage on begin", () => {
    const G = buildThreePlayerG();
    G.electionResults = { "0": 4 };
    G.hasVoted = ["0"];
    G.voteSubmitted = { "0": "1" };

    electionPhase.onBegin!({ G, ctx: buildCtx("2", 3) } as any);

    expect(G.electionResults).toEqual({});
    expect(G.hasVoted).toEqual([]);
    expect(G.voteSubmitted).toEqual({});
    expect(G.stage).toEqual({ phase: "resolution", sub: "election" });
  });
});

describe("post-election phase", () => {
  const firstPlayerPosition = (G: MyGameState) => {
    const order = postElectionPhase.turn!.order!;
    return order.first({ G } as any);
  };

  it.each([
    {
      sub: "infidel_fleet_combat" as const,
      expected: 2,
      setup: (G: MyGameState) => { G.infidelFleetCombat = { targetPlayerID: "1", fleetIndex: 0 }; },
    },
    {
      sub: "deferred_battle" as const,
      expected: 1,
      setup: (G: MyGameState) => {
        G.currentDeferredBattle = {
          event: { card: "treacherous_creatures", targetPlayerID: "0" },
          description: "Deferred battle",
        };
      },
    },
    {
      sub: "rebellion" as const,
      expected: 2,
      setup: (G: MyGameState) => {
        G.currentRebellion = {
          event: { card: "peasant_rebellion", targetPlayerID: "1" },
          counterSwords: 1,
        };
      },
    },
    {
      sub: "invasion_nominate" as const,
      expected: 1,
      setup: (G: MyGameState) => { G.playerInfo["0"].isArchprelate = true; },
    },
    {
      sub: "rebellion_rival_support" as const,
      expected: 0,
      setup: (_G: MyGameState) => {},
    },
  ])("starts $sub with the expected actor", ({ sub, expected, setup }) => {
    const G = buildThreePlayerG();
    G.stage = { phase: "resolution", sub };
    setup(G);

    expect(firstPlayerPosition(G)).toBe(expected);
  });

  it("ends immediately when there is no post-election work", () => {
    const G = buildThreePlayerG();
    const endPhase = vi.fn();
    const events = { endPhase, endTurn: vi.fn() } as unknown as EventsAPI;

    postElectionPhase.onBegin!({ G, ctx: buildCtx("2", 3), events } as any);

    expect(endPhase).toHaveBeenCalledOnce();
  });
});
