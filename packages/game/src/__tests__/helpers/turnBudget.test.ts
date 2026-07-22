import { describe, expect, it, vi } from "vitest";
import { getTurnEndingCount, MyGame, resetTurnEndingBudget } from "../../Game.js";
import { buildCtx, buildInitialG } from "../testHelpers.js";

type TurnBudgetPlugin = {
  fnWrap: (
    fn: (context: unknown) => unknown,
    methodType: string,
  ) => (context: unknown) => unknown;
};

describe("turn budget plugin", () => {
  it("wraps a persistent events object only once", () => {
    const G = buildInitialG(undefined, { _matchID: "turn-budget-wrapper-test" });
    resetTurnEndingBudget(G, 1);

    const originalEndTurn = vi.fn();
    const context = {
      G,
      ctx: buildCtx("0"),
      events: { endTurn: originalEndTurn, endPhase: vi.fn() },
    };
    const plugin = MyGame.plugins?.[0] as unknown as TurnBudgetPlugin;
    const wrappedFn = plugin.fnWrap(() => undefined, "test");

    wrappedFn(context);
    wrappedFn(context);
    wrappedFn(context);
    wrappedFn(context);
    context.events.endTurn();

    expect(getTurnEndingCount(G)).toBe(1);
    expect(originalEndTurn).toHaveBeenCalledOnce();
  });
});
