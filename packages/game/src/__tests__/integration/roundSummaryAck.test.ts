import { describe, expect, it, vi } from "vitest";
import { CreateGameReducer, InitializeGame } from "boardgame.io/internal";
import type { State } from "boardgame.io";
import type { EventsAPI } from "../../types.js";
import { MyGame } from "../../Game.js";
import { MOVE_DEFINITIONS } from "../../moveDefinitions.js";
import { enumerateLegalMoves } from "../../ai/enumerate.js";
import type { MyGameState } from "../../types.js";
import { buildCtx, buildInitialG } from "../testHelpers.js";

type TestState = State<MyGameState>;

function gameEvent(type: string, playerID: string, args: unknown[] = []) {
  return { type: "GAME_EVENT" as const, payload: { type, args, playerID } };
}

function makeMove(type: string, playerID: string, args: unknown[] = []) {
  return { type: "MAKE_MOVE" as const, payload: { type, args, playerID } };
}

function enterResetPhase(): { reducer: ReturnType<typeof CreateGameReducer>; state: TestState } {
  const reducer = CreateGameReducer({ game: MyGame as any });
  let state = InitializeGame({ game: MyGame as any, numPlayers: 2 }) as TestState;
  state = reducer(state, gameEvent("setPhase", state.ctx.currentPlayer, ["reset"])) as TestState;
  return { reducer, state };
}

describe("round summary acknowledgement gate", () => {
  it("enters reset:round_summary after resolution and does not advance to events immediately", () => {
    const { state } = enterResetPhase();

    expect(state.ctx.phase).toBe("reset");
    expect(state.G.stage).toEqual({ phase: "reset", sub: "round_summary" });
    expect(state.G.roundSummaryAck).toEqual([]);
    expect(state.ctx.activePlayers).toEqual({ "0": "ack_summary", "1": "ack_summary" });
  });

  it("waits for every distinct player acknowledgement before advancing", () => {
    const { reducer, state: resetState } = enterResetPhase();

    const afterFirstAck = reducer(
      resetState,
      makeMove("acknowledgeRoundSummary", "0"),
    ) as TestState;
    expect(afterFirstAck.ctx.phase).toBe("reset");
    expect(afterFirstAck.G.roundSummaryAck).toEqual(["0"]);
    expect(afterFirstAck.ctx.activePlayers).toEqual({ "1": "ack_summary" });

    const afterSecondAck = reducer(
      afterFirstAck,
      makeMove("acknowledgeRoundSummary", "1"),
    ) as TestState;
    expect(afterSecondAck.ctx.phase).toBe("events");
    expect(afterSecondAck.ctx.activePlayers).toBeNull();
    expect(afterSecondAck.G.stage).toEqual({ phase: "events", sub: "default" });
    expect(afterSecondAck.G.roundSummaryAck).toEqual(["0", "1"]);

    const afterEvents = reducer(
      afterSecondAck,
      gameEvent("endPhase", afterSecondAck.ctx.currentPlayer),
    ) as TestState;
    expect(afterEvents.ctx.phase).toBe("discovery");
    expect(afterEvents.G.round).toBe(resetState.G.round + 1);
  });

  it("does not double-count duplicate acknowledgements", () => {
    const G = buildInitialG(undefined, {
      stage: { phase: "reset", sub: "round_summary" },
      roundSummaryAck: ["0"],
    });
    const ctx = {
      ...buildCtx("0", 2),
      phase: "reset",
      playOrder: ["0", "1"],
    };
    const events = {
      endStage: vi.fn(),
      endPhase: vi.fn(),
    } as unknown as EventsAPI;

    MOVE_DEFINITIONS.acknowledgeRoundSummary.fn({ G, ctx, playerID: "0", events });

    expect(G.roundSummaryAck).toEqual(["0"]);
    expect(events.endStage).toHaveBeenCalledTimes(1);
    expect(events.endPhase).not.toHaveBeenCalled();
  });

  it("enumerates the ack move only for players who have not acknowledged", () => {
    const G = buildInitialG(undefined, {
      stage: { phase: "reset", sub: "round_summary" },
      roundSummaryAck: ["1"],
    });
    const ctx = {
      ...buildCtx("0", 2),
      phase: "reset",
      playOrder: ["0", "1"],
    };

    expect(enumerateLegalMoves(G, ctx, "0")).toEqual([
      { move: "acknowledgeRoundSummary", args: [] },
    ]);
    expect(enumerateLegalMoves(G, ctx, "1")).toEqual([]);
  });
});
