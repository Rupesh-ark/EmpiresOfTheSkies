/**
 * quietRoundResolution.test.ts (integration)
 *
 * Regression for the 2026-07-21 production soft-lock: a round whose
 * resolution phase finds NO interactive work before the election (no aerial
 * battles, no plunder, no ground battles, no conquests) must still reach the
 * election. Under beta.4, the walker's unguarded endTurn inside
 * resolution.onBegin invalidates the triggering action, rolling the game
 * back to end-of-actions — permanently, since every retry repeats the cycle.
 *
 * Unlike the other integration tests, this one runs the REAL boardgame.io
 * pipeline (Local() clients): the events-plugin legality contract IS the
 * thing under test, so stubbed events would prove nothing.
 *
 * Marked it.fails while the bug exists. When the resolution redesign fixes
 * phase entry, vitest will flag this test as "expected to fail but passed" —
 * flip it to a plain it() then.
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
const MAX_ITERATIONS = 1500;
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
  it.fails("enters the election when no battles/plunders/conquests exist", () => {
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
    let lastStateKey = "";
    let staleCount = 0;
    let lastSeen = "";

    try {
      for (let i = 0; i < MAX_ITERATIONS; i++) {
        const state = clients[0].getState();
        if (!state || state.ctx.gameover) break;

        const G = state.G as MyGameState;
        const ctx = state.ctx;
        lastSeen = `${ctx.phase}/${G.stage.phase}:${G.stage.sub}/t${ctx.turn}/P${ctx.currentPlayer}`;

        if (G.stage.phase === "resolution" && G.stage.sub === "election") {
          reachedElection = true;
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
  });
});
