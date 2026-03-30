/**
 * legacyCardIntegration.test.ts
 *
 * Integration test: verifies that ALL 6 players receive a legacy card during
 * the setup phase when running a real boardgame.io Client (not stubs).
 *
 * Background: there was a bug where only P0 got a legacy card because the
 * setup phase's turn order `next()` returned `undefined` after P0's pick,
 * causing boardgame.io to auto-end the phase before the other 5 players had
 * a chance to pick. The fix changed `next()` to use modulo wrapping so it
 * always returns a valid playOrderPos.
 *
 * This test exercises the real boardgame.io Client + Local() transport +
 * EmpiresBot so that any regression in the turn-order wrapping will surface
 * as a failing assertion rather than a silent state corruption.
 */

import { describe, it, expect, afterEach } from "vitest";
import { Client } from "boardgame.io/client";
import { Local } from "boardgame.io/multiplayer";
import { MyGame } from "../../Game";
import type { MyGameState } from "../../types";
import { EmpiresBot } from "../../ai/EmpiresBot";

// Safety limit: setup phase for 6 players should never need more than 100
// iterations (12 picks: 6 KA + 6 legacy). 100 gives a large buffer while
// still catching any infinite-loop regression immediately.
const SETUP_ITERATION_LIMIT = 100;

describe("setup phase — legacy card distribution", () => {
  // Hold references so afterEach can always stop clients even on failure
  let clients: ReturnType<typeof Client>[] = [];

  afterEach(() => {
    for (const c of clients) {
      try { c.stop(); } catch { /* ignore */ }
    }
    clients = [];
  });

  it(
    "all 6 players receive a legacy card and setup phase terminates",
    () => {
      // ── Build 6 clients sharing one local match ──────────────────────────
      // All six must be created from the SAME Local() transport instance so
      // that moves from one client are visible to all others.
      const transport = Local();

      const bots: EmpiresBot[] = [];
      clients = [];

      for (let p = 0; p < 6; p++) {
        const playerID = String(p);
        bots.push(new EmpiresBot({ playerID }));

        const client = Client({
          game: MyGame,
          numPlayers: 6,
          multiplayer: transport,
          playerID,
        });
        client.start();
        clients.push(client);
      }

      // ── Drive the setup phase with bot moves ─────────────────────────────
      // On each iteration:
      //   1. Read state from clients[0] (all clients share the same state)
      //   2. If phase has advanced past "setup", we are done
      //   3. If activePlayers is set, let each active player act
      //   4. Otherwise let the sequential current player act
      let iterations = 0;
      let phaseDone = false;

      while (iterations < SETUP_ITERATION_LIMIT) {
        const state = clients[0].getState();
        if (!state) { iterations++; continue; }

        const ctx = state.ctx;

        if (ctx.phase !== "setup") {
          phaseDone = true;
          break;
        }

        if (ctx.activePlayers) {
          // Simultaneous stage — let every active player act
          for (const [pid] of Object.entries(ctx.activePlayers)) {
            const pIdx = parseInt(pid);
            const botState = clients[pIdx].getState();
            if (!botState) continue;

            const move = bots[pIdx].chooseMove(
              botState.G as MyGameState,
              botState.ctx,
              pid
            );
            if (move) {
              (clients[pIdx] as any).moves[move.move]?.(...move.args);
            }
          }
        } else {
          // Sequential turn — let the current player act
          const currentPlayer = ctx.currentPlayer;
          const pIdx = parseInt(currentPlayer);
          const botState = clients[pIdx].getState();

          if (botState) {
            const move = bots[pIdx].chooseMove(
              botState.G as MyGameState,
              botState.ctx,
              currentPlayer
            );
            if (move) {
              (clients[pIdx] as any).moves[move.move]?.(...move.args);
            }
          }
        }

        iterations++;
      }

      // ── Assertions ────────────────────────────────────────────────────────

      // 1. The setup phase must have ended — not timed out.
      //    If phaseDone is false, the phase looped for all 100 iterations
      //    without advancing, which is the exact symptom of the original bug
      //    (or a new infinite-loop regression).
      expect(phaseDone).toBe(true);

      // 2. Every player must have a legacy card.
      //    Before the fix, only P0 ended up with one; the rest were undefined.
      const finalState = clients[0].getState();
      expect(finalState).not.toBeNull();

      const G = finalState!.G as MyGameState;
      for (let p = 0; p < 6; p++) {
        const player = G.playerInfo[String(p)];
        expect(
          player?.resources.legacyCard,
          `Player ${p} should have received a legacy card but resources.legacyCard is undefined`
        ).toBeDefined();
      }
    },
    30_000 // generous 30 s timeout — real boardgame.io transport is synchronous but card dealing + phase transitions add up
  );
});
