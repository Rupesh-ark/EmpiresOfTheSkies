/**
 * quietRoundResolution.test.ts (integration)
 *
 * Guards the fix for the 2026-07-21 production soft-lock: a round whose
 * resolution phase finds NO interactive work before the election (no aerial
 * battles, no plunder, no ground battles, no conquests) must reach the
 * election and complete the round loop.
 *
 * Unlike the other integration tests, this one runs the REAL boardgame.io
 * pipeline (Local() clients): the events-plugin legality contract IS the
 * thing under test, so stubbed events would prove nothing.
 *
 */

import { describe, it, expect } from "vitest";
import { Client } from "boardgame.io/client";
import { Local } from "boardgame.io/multiplayer";
import { MyGame } from "../../Game.js";
import { enumerateLegalMoves } from "../../ai/enumerate.js";
import type { MyGameState } from "../../types.js";
import type { AIMove } from "../../ai/types.js";
import type { Ctx } from "boardgame.io";

const NUM_PLAYERS = 3;
const MAX_ITERATIONS = 3000;
const STALL_LIMIT = 60;

/**
 * Pacifist policy: pass whenever legal, decline optional choices, otherwise
 * take the first enumerated move. Never deploys a fleet — so resolution has
 * no combat work, which is the exact trigger condition for the soft-lock.
 */
function choosePacifistMove(G: MyGameState, ctx: Ctx, playerID: string): AIMove | null {
  const moves = enumerateLegalMoves(G, ctx, playerID);
  if (moves.length === 0) return null;
  const pass = moves.find((m) => m.move === "pass");
  if (pass) return pass;
  const decline = moves.find((m) => m.args?.[0] === "decline");
  if (decline) return decline;
  return moves[0];
}

describe("quiet round — resolution with no combat work", () => {
  it("enters the election and completes the round loop with no combat work", () => {
    // One shared game object: Local() keys its in-memory master by game
    // object identity — per-client spreads would create 3 separate games.
    const game = { ...MyGame, seed: "quiet-round-regression" } as typeof MyGame;
    const clients = Array.from({ length: NUM_PLAYERS }, (_, i) =>
      Client({
        game,
        numPlayers: NUM_PLAYERS,
        multiplayer: Local(),
        playerID: String(i),
      })
    );
    clients.forEach((c) => c.start());

    let reachedElection = false;
    let reachedRoundTwoEvents = false;
    let lastStateKey = "";
    let staleCount = 0;
    let lastSeen = "";
    let lastRound = 0;
    let lastPhase = "";

    try {
      for (let i = 0; i < MAX_ITERATIONS; i++) {
        const state = clients[0].getState();
        if (!state || state.ctx.gameover) break;

        const G = state.G as MyGameState;
        const ctx = state.ctx;
        lastRound = G.round;
        lastPhase = ctx.phase ?? "";
        lastSeen = `${ctx.phase}:${G.step}/t${ctx.turn}/P${ctx.currentPlayer}`;

        if (G.step === "election") {
          reachedElection = true;
        }
        if (G.round === 2 && ctx.phase === "events") {
          reachedRoundTwoEvents = true;
          break;
        }

        // Stall detection: the soft-lock manifests as the same state key
        // surviving every dispatch because rejected actions roll back.
        if (lastSeen === lastStateKey) {
          staleCount++;
          if (staleCount >= STALL_LIMIT) break;
        } else {
          staleCount = 0;
          lastStateKey = lastSeen;
        }

        const actors = ctx.activePlayers
          ? Object.keys(ctx.activePlayers)
          : [ctx.currentPlayer];
        for (const pid of actors) {
          const pState = clients[parseInt(pid)].getState();
          if (!pState) continue;
          const move = choosePacifistMove(pState.G as MyGameState, pState.ctx, pid);
          if (move) {
            (clients[parseInt(pid)] as any).moves[move.move]?.(...move.args);
          }
        }
      }
    } finally {
      clients.forEach((c) => c.stop());
    }

    expect(reachedElection, `never reached election; stuck at ${lastSeen}`).toBe(true);
    expect(
      { reachedRoundTwoEvents, round: lastRound, phase: lastPhase },
      `did not complete the round loop; stuck at ${lastSeen}`
    ).toEqual({ reachedRoundTwoEvents: true, round: 2, phase: "events" });
  });
});
