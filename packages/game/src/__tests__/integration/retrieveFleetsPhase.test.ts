import { describe, expect, it, vi } from "vitest";
import retrieveFleetsPhase, { hasRetrievableFleet } from "../../phases/retrieveFleets.js";
import type { EventsAPI } from "../../types.js";
import { buildCtx, buildFleet, buildInitialG, buildPlayer } from "../testHelpers.js";

describe("retrieveFleets phase", () => {
  it("starts with the first retrievable fleet holder in G.turnOrder", () => {
    const G = buildInitialG(
      [
        buildPlayer("0", { fleetInfo: [buildFleet(0, { location: [2, 1], skyships: 2 })] }),
        buildPlayer("1", { fleetInfo: [buildFleet(0, { location: [3, 1], skyships: 1 })] }),
        buildPlayer("2", { fleetInfo: [buildFleet(0, { location: [4, 0], skyships: 3 })] }),
      ],
      { turnOrder: ["2", "0", "1"] }
    );
    const order = retrieveFleetsPhase.turn!.order!;

    expect(order.playOrder!({ G } as any)).toEqual(["2", "0", "1"]);
    expect(order.first({ G } as any)).toBe(1);
  });

  it("resets passed flags, sets the legacy stage, and skips an empty phase", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        passed: true,
        fleetInfo: [buildFleet(0, { location: [4, 0], skyships: 3 })],
      }),
      buildPlayer("1", {
        passed: true,
        fleetInfo: [buildFleet(0, { location: [3, 1], skyships: 0 })],
      }),
    ]);
    const endPhase = vi.fn();
    const events = { endPhase, endTurn: vi.fn() } as unknown as EventsAPI;

    retrieveFleetsPhase.onBegin!({ G, ctx: buildCtx("0"), events } as any);

    expect(Object.values(G.playerInfo).map((player) => player.passed)).toEqual([false, false]);
    expect(G.step).toBe("retrieve_fleets");
    expect(endPhase).toHaveBeenCalledOnce();
  });

  it.each([
    { location: [4, 0] as [number, number], skyships: 3, expected: false },
    { location: [3, 0] as [number, number], skyships: 1, expected: true },
    { location: [3, 0] as [number, number], skyships: 0, expected: false },
  ])("classifies fleet at $location with $skyships skyships", ({ location, skyships, expected }) => {
    const player = buildPlayer("0", {
      fleetInfo: [buildFleet(0, { location, skyships })],
    });

    expect(hasRetrievableFleet(player)).toBe(expected);
  });
});
