import { describe, it } from "vitest";
import { Client } from "boardgame.io/client";
import { Local } from "boardgame.io/multiplayer";
import { MyGame } from "../../Game";
import type { MyGameState } from "../../types";
import { EmpiresBot } from "../../ai/EmpiresBot";

/**
 * Runs N games, tallies every move each bot makes, and prints
 * a distribution table — useful for validating weight tuning.
 */
describe("move distribution", () => {
  it("collects move counts across 5 games", () => {
    const NUM_GAMES = 5;
    const globalCounts: Record<string, number> = {};
    // phase:move → count (e.g. "actions:pass", "election:vote")
    const phaseMoveCounts: Record<string, number> = {};
    const perGameCounts: Record<string, number>[] = [];
    const nullMoves: Record<string, number> = {};

    for (let g = 0; g < NUM_GAMES; g++) {
      const clients: ReturnType<typeof Client>[] = [];
      const bots: EmpiresBot[] = [];
      const gameCounts: Record<string, number> = {};

      for (let p = 0; p < 6; p++) {
        const playerID = String(p);
        bots.push(new EmpiresBot({ playerID }));
        const client = Client({
          game: MyGame,
          numPlayers: 6,
          multiplayer: Local(),
          playerID,
        });
        client.start();
        clients.push(client);
      }

      let consecutiveNulls = 0;
      for (let i = 0; i < 50000; i++) {
        const state = clients[0].getState();
        if (!state || state.ctx.gameover) break;
        // Escape stalls: if 100+ consecutive null moves, game is stuck
        if (consecutiveNulls > 100) {
          const sG = state.G as MyGameState;
          console.log(`[STALL-EXIT] Game ${g+1} iter=${i} R${sG.round} ${state.ctx.phase}/${sG.stage} P${state.ctx.currentPlayer}`);
          break;
        }

        const ctx = state.ctx;
        const G = state.G as MyGameState;
        const phase = ctx.phase ?? "?";
        const stage = G.stage ?? "?";

        const recordMove = (moveName: string) => {
          gameCounts[moveName] = (gameCounts[moveName] ?? 0) + 1;
          globalCounts[moveName] = (globalCounts[moveName] ?? 0) + 1;
          const key = `${phase}/${stage}:${moveName}`;
          phaseMoveCounts[key] = (phaseMoveCounts[key] ?? 0) + 1;
        };

        // Track null moves (game bugs where a player has the turn but no valid move)
        const logNull = (pid: string, bG: MyGameState, bCtx: any) => {
          const key = `${bCtx.phase}/${bG.stage}`;
          if (!nullMoves[key]) nullMoves[key] = 0;
          nullMoves[key]++;
          if (nullMoves[key] <= 3) { // log first 3 occurrences per phase/stage
            const bs = bG.battleState;
            console.log(`[NULL-MOVE] P${pid} R${bG.round} ${key} turn=${bCtx.turn} battle=${bs ? `att=${bs.attacker?.id} def=${bs.defender?.id}` : "none"}`);
          }
        };

        if (ctx.activePlayers) {
          for (const [pid] of Object.entries(ctx.activePlayers)) {
            const pIdx = parseInt(pid);
            const botState = clients[pIdx].getState();
            if (!botState) continue;
            const move = bots[pIdx].chooseMove(botState.G as MyGameState, botState.ctx, pid);
            if (move) {
              recordMove(move.move);
              (clients[pIdx] as any).moves[move.move]?.(...move.args);
              consecutiveNulls = 0;
            } else {
              logNull(pid, botState.G as MyGameState, botState.ctx);
              consecutiveNulls++;
            }
          }
        } else {
          const cp = ctx.currentPlayer;
          const pIdx = parseInt(cp);
          const botState = clients[pIdx].getState();
          if (!botState) continue;
          const move = bots[pIdx].chooseMove(botState.G as MyGameState, botState.ctx, cp);
          if (move) {
            recordMove(move.move);
            (clients[pIdx] as any).moves[move.move]?.(...move.args);
            consecutiveNulls = 0;
          } else {
            if (botState) logNull(cp, botState.G as MyGameState, botState.ctx);
            consecutiveNulls++;
          }
        }
      }

      for (const c of clients) c.stop();
      perGameCounts.push(gameCounts);

      const G = clients[0].getState()?.G as MyGameState | undefined;
      console.log(`Game ${g + 1}: ${G?.round ?? "?"} rounds`);
    }

    // Print summary
    console.log("\n" + "═".repeat(50));
    console.log("  MOVE DISTRIBUTION (total across 5 games)");
    console.log("═".repeat(50));

    const sorted = Object.entries(globalCounts).sort((a, b) => b[1] - a[1]);
    for (const [move, count] of sorted) {
      const avg = (count / NUM_GAMES).toFixed(1);
      console.log(`  ${move.padEnd(30)} ${String(count).padStart(5)} (avg ${avg}/game)`);
    }

    console.log("═".repeat(50));

    // Phase breakdown
    console.log("\n" + "═".repeat(60));
    console.log("  MOVES BY PHASE/STAGE (total across 5 games)");
    console.log("═".repeat(60));

    const phaseSorted = Object.entries(phaseMoveCounts).sort((a, b) => b[1] - a[1]);
    for (const [key, count] of phaseSorted) {
      const avg = (count / NUM_GAMES).toFixed(1);
      console.log(`  ${key.padEnd(45)} ${String(count).padStart(5)} (avg ${avg})`);
    }

    console.log("═".repeat(60));

    // Null-move summary (game bugs where player gets turn with no valid moves)
    const nullEntries = Object.entries(nullMoves).sort((a, b) => b[1] - a[1]);
    if (nullEntries.length > 0) {
      console.log("\n" + "═".repeat(60));
      console.log("  NULL MOVES — GAME BUGS (player has turn, no valid move)");
      console.log("═".repeat(60));
      for (const [key, count] of nullEntries) {
        console.log(`  ${key.padEnd(45)} ${String(count).padStart(5)} occurrences`);
      }
      console.log("═".repeat(60));
    }
  }, 300000);
});
