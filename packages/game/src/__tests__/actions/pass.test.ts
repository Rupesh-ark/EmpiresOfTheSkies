/**
 * pass.test.ts
 *
 * Tests for the pass move.
 *
 * Source logic:
 *   - Always sets G.playerInfo[playerID].passed = true
 *   - In "discovery" phase: sets firstTurnOfRound=false, ends phase (with stage="actions")
 *     if last player in order, otherwise ends turn
 *   - In "actions" phase: ends phase (with stage="attack or pass") if all players have
 *     passed, otherwise ends turn
 */

import { describe, it, expect, vi } from "vitest";
import pass from "../../moves/pass";
import { buildInitialG, buildPlayer, buildCtx } from "../testHelpers";

function buildPassCtx(
  playerID: string,
  phase: string,
  playOrderPos: number,
  numPlayers = 2
) {
  return {
    ...buildCtx(playerID, numPlayers),
    phase,
    playOrderPos,
    numPlayers,
  };
}

function buildEvents() {
  return {
    endTurn: vi.fn(),
    endPhase: vi.fn(),
  };
}

// ── discovery phase ────────────────────────────────────────────────────────────

describe("pass — discovery phase", () => {
  it("sets passed=true and firstTurnOfRound=false", () => {
    const G = buildInitialG();
    G.firstTurnOfRound = true;
    const ctx = buildPassCtx("0", "discovery", 0);
    const events = buildEvents();

    pass.fn({ G, ctx, playerID: "0", events });

    expect(G.playerInfo["0"].passed).toBe(true);
    expect(G.firstTurnOfRound).toBe(false);
  });

  it("calls endTurn when not the last player", () => {
    const G = buildInitialG();
    const ctx = buildPassCtx("0", "discovery", 0, 2); // pos 0 of 2 — not last
    const events = buildEvents();

    pass.fn({ G, ctx, playerID: "0", events });

    expect(events.endTurn).toHaveBeenCalled();
    expect(events.endPhase).not.toHaveBeenCalled();
    expect(G.stage).toBe("actions"); // stage unchanged from default? No — only set on endPhase branch
  });

  it("sets stage='actions' and calls endPhase when all players have passed", () => {
    const G = buildInitialG([buildPlayer("0"), buildPlayer("1")]);
    G.playerInfo["1"].passed = true; // player "1" already passed
    const ctx = buildPassCtx("0", "discovery", 1, 2);
    const events = buildEvents();

    pass.fn({ G, ctx, playerID: "0", events });

    expect(G.stage).toBe("actions");
    expect(events.endPhase).toHaveBeenCalled();
    expect(events.endTurn).not.toHaveBeenCalled();
  });
});

// ── actions phase ──────────────────────────────────────────────────────────────

describe("pass — actions phase", () => {
  it("calls endTurn when not all players have passed", () => {
    const G = buildInitialG([buildPlayer("0"), buildPlayer("1")]);
    // player "1" has not passed
    const ctx = buildPassCtx("0", "actions", 0);
    const events = buildEvents();

    pass.fn({ G, ctx, playerID: "0", events });

    expect(G.playerInfo["0"].passed).toBe(true);
    expect(events.endTurn).toHaveBeenCalled();
    expect(events.endPhase).not.toHaveBeenCalled();
  });

  it("sets stage='attack or pass' and calls endPhase when all players have passed", () => {
    const G = buildInitialG([buildPlayer("0"), buildPlayer("1")]);
    G.playerInfo["1"].passed = true; // player "1" already passed
    const ctx = buildPassCtx("0", "actions", 0);
    const events = buildEvents();

    pass.fn({ G, ctx, playerID: "0", events });

    expect(G.playerInfo["0"].passed).toBe(true);
    expect(G.stage).toBe("attack or pass");
    expect(events.endPhase).toHaveBeenCalled();
    expect(events.endTurn).not.toHaveBeenCalled();
  });
});