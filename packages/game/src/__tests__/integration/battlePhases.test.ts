import { describe, expect, it, vi } from "vitest";
import aerialBattlesPhase from "../../phases/aerialBattles.js";
import plunderPhase from "../../phases/plunder.js";
import groundBattlesPhase from "../../phases/groundBattles.js";
import conquestsPhase from "../../phases/conquests.js";
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

const beginPhase = (
  phase: typeof aerialBattlesPhase,
  G: MyGameState,
  events: EventsAPI
) => {
  phase.onBegin!({ G, ctx: buildCtx("0"), events } as any);
};

describe("battle phase entry", () => {
  it("aerialBattles selects a contested fleet tile and skips no phase", () => {
    const G = buildInitialG();
    G.mapState.battleMap[TARGET[1]][TARGET[0]] = ["1", "0"];
    G.battleState = {} as MyGameState["battleState"];
    const events = stubEvents();

    beginPhase(aerialBattlesPhase, G, events);

    expect(G.mapState.currentBattle).toEqual(TARGET);
    expect(G.step).toBe("aerial_attack_or_pass");
    expect(G.possibleDefenders).toEqual(["1"]);
    expect(G.battleState).toBeUndefined();
    expect(events.endTurn).not.toHaveBeenCalled();
    expect(events.endPhase).not.toHaveBeenCalled();
  });

  it("aerialBattles ends an empty phase from onBegin", () => {
    const G = buildInitialG();
    const events = stubEvents();

    beginPhase(aerialBattlesPhase, G, events);

    expect(events.endPhase).toHaveBeenCalledOnce();
  });

  it("plunder selects a legend occupied by one fleet and skips no phase", () => {
    const G = buildInitialG();
    G.mapState.currentTileArray[TARGET[1]][TARGET[0]].type = "legend";
    G.mapState.battleMap[TARGET[1]][TARGET[0]] = ["1"];
    const events = stubEvents();

    beginPhase(plunderPhase, G, events);

    expect(G.mapState.currentBattle).toEqual(TARGET);
    expect(G.step).toBe("plunder_legends");
    expect(events.endTurn).not.toHaveBeenCalled();
    expect(events.endPhase).not.toHaveBeenCalled();
  });

  it("plunder ends an empty phase from onBegin", () => {
    const G = buildInitialG();
    const events = stubEvents();

    beginPhase(plunderPhase, G, events);

    expect(events.endPhase).toHaveBeenCalledOnce();
  });

  it("groundBattles selects a rival building occupied by one fleet and skips no phase", () => {
    const G = buildInitialG();
    G.mapState.currentTileArray[TARGET[1]][TARGET[0]].type = "land";
    G.mapState.battleMap[TARGET[1]][TARGET[0]] = ["0"];
    G.mapState.buildings[TARGET[1]][TARGET[0]].player = G.playerInfo["1"];
    const events = stubEvents();

    beginPhase(groundBattlesPhase, G, events);

    expect(G.mapState.currentBattle).toEqual(TARGET);
    expect(G.step).toBe("ground_attack_or_pass");
    expect(events.endTurn).not.toHaveBeenCalled();
    expect(events.endPhase).not.toHaveBeenCalled();
  });

  it("groundBattles ends an empty phase from onBegin", () => {
    const G = buildInitialG();
    const events = stubEvents();

    beginPhase(groundBattlesPhase, G, events);

    expect(events.endPhase).toHaveBeenCalledOnce();
  });

  it("conquests selects an unowned land occupied by one fleet and skips no phase", () => {
    const G = buildInitialG();
    G.mapState.currentTileArray[TARGET[1]][TARGET[0]].type = "land";
    G.mapState.battleMap[TARGET[1]][TARGET[0]] = ["1"];
    const events = stubEvents();

    beginPhase(conquestsPhase, G, events);

    expect(G.mapState.currentBattle).toEqual(TARGET);
    expect(G.step).toBe("conquest");
    expect(events.endTurn).not.toHaveBeenCalled();
    expect(events.endPhase).not.toHaveBeenCalled();
  });

  it("conquests ends an empty phase from onBegin", () => {
    const G = buildInitialG();
    const events = stubEvents();

    beginPhase(conquestsPhase, G, events);

    expect(events.endPhase).toHaveBeenCalledOnce();
  });
});

describe("battle phase first actor", () => {
  it("aerialBattles starts with the contested tile's IPO-sorted attacker", () => {
    const G = buildInitialG(
      [buildPlayer("0"), buildPlayer("1"), buildPlayer("2")],
      { turnOrder: ["2", "0", "1"] }
    );
    G.mapState.battleMap[TARGET[1]][TARGET[0]] = ["1", "0"];
    beginPhase(aerialBattlesPhase, G, stubEvents());

    const order = aerialBattlesPhase.turn!.order!;
    expect(order.first({ G } as any)).toBe(1);
  });

  it("conquests starts with the fleet owner", () => {
    const G = buildInitialG(
      [buildPlayer("0"), buildPlayer("1")],
      { turnOrder: ["1", "0"] }
    );
    G.mapState.currentTileArray[TARGET[1]][TARGET[0]].type = "land";
    G.mapState.battleMap[TARGET[1]][TARGET[0]] = ["0"];
    beginPhase(conquestsPhase, G, stubEvents());

    const order = conquestsPhase.turn!.order!;
    expect(order.first({ G } as any)).toBe(1);
  });
});
