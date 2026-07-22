import { describe, expect, it, vi } from "vitest";
import groundBattlesPhase from "../../phases/groundBattles.js";
import rebellionsPhase from "../../phases/rebellions.js";
import type { EventsAPI, MyGameState } from "../../types.js";
import { buildCtx, buildInitialG, buildPlayer } from "../testHelpers.js";

const TARGET: [number, number] = [1, 0];

const stubEvents = () => ({
  endTurn: vi.fn(),
  endPhase: vi.fn(),
} as unknown as EventsAPI & {
  endTurn: ReturnType<typeof vi.fn>;
  endPhase: ReturnType<typeof vi.fn>;
});

const buildThreePlayerG = () => buildInitialG(
  [buildPlayer("0"), buildPlayer("1"), buildPlayer("2")],
  { turnOrder: ["2", "0", "1"] }
);

const addMapGroundBattle = (G: MyGameState) => {
  G.mapState.currentTileArray[TARGET[1]][TARGET[0]].type = "land";
  G.mapState.battleMap[TARGET[1]][TARGET[0]] = ["0"];
  G.mapState.buildings[TARGET[1]][TARGET[0]].player = G.playerInfo["1"];
};

describe("rebellions phase", () => {
  it("sets up a queued rebellion and starts with its target", () => {
    const G = buildThreePlayerG();
    G.eventState.deferredEvents = [
      { card: "peasant_rebellion", targetPlayerID: "1" },
    ];
    const events = stubEvents();

    rebellionsPhase.onBegin!({ G, ctx: buildCtx("2", 3), events } as any);

    expect(G.currentRebellion?.event).toEqual({
      card: "peasant_rebellion",
      targetPlayerID: "1",
    });
    expect(G.step).toBe("rebellion");
    expect(rebellionsPhase.turn!.order!.first({ G } as any)).toBe(2);
    expect(events.endPhase).not.toHaveBeenCalled();
  });

  it("ends immediately when no rebellion events are queued", () => {
    const G = buildThreePlayerG();
    const events = stubEvents();

    rebellionsPhase.onBegin!({ G, ctx: buildCtx("2", 3), events } as any);

    expect(events.endPhase).toHaveBeenCalledOnce();
  });
});

describe("ground battles deferred-event ordering", () => {
  it("selects deferred battles before map battles and falls through when exhausted", () => {
    const deferredG = buildThreePlayerG();
    addMapGroundBattle(deferredG);
    deferredG.eventState.deferredEvents = [
      { card: "treacherous_creatures", targetPlayerID: "1", targetTile: TARGET },
    ];

    groundBattlesPhase.onBegin!({
      G: deferredG,
      ctx: buildCtx("2", 3),
      events: stubEvents(),
    } as any);

    expect(deferredG.currentDeferredBattle?.event.card).toBe("treacherous_creatures");
    expect(deferredG.step).toBe("deferred_battle");
    expect(deferredG.mapState.currentBattle).toEqual([0, 0]);
    expect(groundBattlesPhase.turn!.order!.first({ G: deferredG } as any)).toBe(2);

    const mapG = buildThreePlayerG();
    addMapGroundBattle(mapG);

    groundBattlesPhase.onBegin!({
      G: mapG,
      ctx: buildCtx("2", 3),
      events: stubEvents(),
    } as any);

    expect(mapG.currentDeferredBattle).toBeNull();
    expect(mapG.mapState.currentBattle).toEqual(TARGET);
    expect(mapG.step).toBe("ground_attack_or_pass");
  });
});
