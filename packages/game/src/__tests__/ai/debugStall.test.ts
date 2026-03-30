import { describe, it } from "vitest";
import { Client } from "boardgame.io/client";
import { Local } from "boardgame.io/multiplayer";
import { MyGame } from "../../Game";
import type { MyGameState } from "../../types";
import { EmpiresBot } from "../../ai/EmpiresBot";
import { enumerateLegalMoves } from "../../ai/enumerate";

describe("debug stall v3", () => {
  it("verbose game loop with full stall diagnostics", () => {
    const clients: ReturnType<typeof Client>[] = [];
    const bots: EmpiresBot[] = [];

    for (let p = 0; p < 6; p++) {
      const playerID = String(p);
      const bot = new EmpiresBot({ playerID });
      bots.push(bot);
      const client = Client({
        game: MyGame,
        numPlayers: 6,
        multiplayer: Local(),
        playerID,
      });
      client.start();
      clients.push(client);
    }

    let lastPhase = "";
    let lastStage = "";
    let lastPlayer = "";
    let stuckCount = 0;
    let nullCount = 0;

    for (let i = 0; i < 2000; i++) {
      const state = clients[0].getState();
      if (!state || state.ctx.gameover) {
        console.log(`[DONE] iter=${i} gameover`);
        break;
      }

      const ctx = state.ctx;
      const G = state.G as MyGameState;
      const phase = ctx.phase ?? "?";
      const stage = G.stage ? `${G.stage.phase}/${G.stage.sub}` : "?";
      const cp = ctx.currentPlayer;

      // Detect phase/stage transitions
      if (phase !== lastPhase || stage !== lastStage) {
        console.log(`[PHASE] iter=${i} R${G.round} ${phase}/${stage} turn=${ctx.turn} P${cp}`);
        lastPhase = phase;
        lastStage = stage;
        lastPlayer = cp;
        stuckCount = 0;
        nullCount = 0;
      } else if (cp !== lastPlayer) {
        // Same phase/stage but different player — not stuck
        lastPlayer = cp;
        stuckCount = 0;
        nullCount = 0;
      } else {
        stuckCount++;
        if (stuckCount > 50) {
          // STALL DETECTED — dump full state
          console.log(`\n${"═".repeat(60)}`);
          console.log(`[STUCK] iter=${i} R${G.round} ${phase}/${stage} turn=${ctx.turn} P${cp}`);
          console.log(`${"═".repeat(60)}`);

          const player = G.playerInfo[cp];
          console.log(`  Player: gold=${player.resources.gold} couns=${player.resources.counsellors} sky=${player.resources.skyships} regs=${player.resources.regiments} levies=${player.resources.levies}`);
          console.log(`  passed=${player.passed} turnComplete=${player.turnComplete}`);

          // Fleet state
          player.fleetInfo.forEach((f, fi) => {
            if (f.skyships > 0 || (f.location[0] !== 4 || f.location[1] !== 0)) {
              console.log(`  Fleet${fi}: [${f.location}] sky=${f.skyships} reg=${f.regiments} lev=${f.levies} elite=${f.eliteRegiments}`);
            }
          });

          // Battle state
          const bs = G.battleState;
          if (bs) {
            console.log(`  BattleState: att=${bs.attacker?.id}(vic=${bs.attacker?.victorious},dec=${bs.attacker?.decision}) def=${bs.defender?.id}(vic=${bs.defender?.victorious},dec=${bs.defender?.decision})`);
            console.log(`  att.fowCard=${!!bs.attacker?.fowCard} def.fowCard=${!!bs.defender?.fowCard}`);
          } else {
            console.log(`  BattleState: undefined`);
          }

          // Battle map at current battle tile
          const [bx, by] = G.mapState.currentBattle;
          console.log(`  currentBattle=[${bx},${by}] battleMap=${JSON.stringify(G.mapState.battleMap[by]?.[bx])}`);
          console.log(`  validRelocationTiles=${G.validRelocationTiles.length} tiles`);
          console.log(`  possibleDefenders=${JSON.stringify(G.possibleDefenders)}`);

          // Enumerate what moves are available
          const legalMoves = enumerateLegalMoves(G, ctx, cp);
          console.log(`  Enumerated moves (${legalMoves.length}):`);
          for (const m of legalMoves.slice(0, 10)) {
            console.log(`    ${m.move} ${JSON.stringify(m.args)}`);
          }
          if (legalMoves.length > 10) console.log(`    ... and ${legalMoves.length - 10} more`);

          // Bot decision
          const botState = clients[parseInt(cp)].getState();
          if (botState) {
            const move = bots[parseInt(cp)].chooseMove(botState.G as MyGameState, botState.ctx, cp);
            console.log(`  Bot chose: ${move ? `${move.move} ${JSON.stringify(move.args)}` : "NULL"}`);
          }

          // All players' passed flags
          const passedFlags = Object.entries(G.playerInfo).map(([id, p]) => `${id}:${p.passed}`).join(" ");
          console.log(`  passedFlags: ${passedFlags}`);

          // Active players
          if (ctx.activePlayers) {
            console.log(`  activePlayers: ${JSON.stringify(ctx.activePlayers)}`);
          }

          console.log(`${"═".repeat(60)}\n`);
          break;
        }
      }

      // Execute moves
      if (ctx.activePlayers) {
        for (const [pid] of Object.entries(ctx.activePlayers)) {
          const pIdx = parseInt(pid);
          const botState = clients[pIdx].getState();
          if (!botState) continue;
          const move = bots[pIdx].chooseMove(botState.G as MyGameState, botState.ctx, pid);
          if (move) {
            (clients[pIdx] as any).moves[move.move]?.(...move.args);
          } else {
            nullCount++;
          }
        }
      } else {
        const pIdx = parseInt(cp);
        const botState = clients[pIdx].getState();
        if (!botState) continue;
        const move = bots[pIdx].chooseMove(botState.G as MyGameState, botState.ctx, cp);
        if (move) {
          (clients[pIdx] as any).moves[move.move]?.(...move.args);
        } else {
          nullCount++;
        }
      }
    }

    for (const c of clients) c.stop();
  }, 60000);
});
