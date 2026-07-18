import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import type { MoveObserver, MyGameState } from "@eots/game";
import type { Ctx } from "boardgame.io";
import { GameRecorder, setMoveObserver, log } from "@eots/game";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ANALYTICS_DIR = path.resolve(__dirname, "../analytics");
fs.mkdirSync(ANALYTICS_DIR, { recursive: true });

const recorders = new Map<string, { rec: InstanceType<typeof GameRecorder>; lastMoveAt: number }>();

// Abandoned matches never reach gameover, so their recorders would otherwise
// accumulate for the server's lifetime. Evict after 6h of inactivity.
const IDLE_EVICT_MS = 6 * 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 30 * 60 * 1000;

setInterval(() => {
  const cutoff = Date.now() - IDLE_EVICT_MS;
  for (const [mid, entry] of recorders) {
    if (entry.lastMoveAt < cutoff) {
      recorders.delete(mid);
      log.info({ matchID: mid }, "Evicted idle game recorder (match abandoned)");
    }
  }
}, SWEEP_INTERVAL_MS).unref();

function getRecorder(matchID: string): InstanceType<typeof GameRecorder> {
  let entry = recorders.get(matchID);
  if (!entry) {
    entry = { rec: new GameRecorder(matchID), lastMoveAt: Date.now() };
    recorders.set(matchID, entry);
  }
  entry.lastMoveAt = Date.now();
  return entry.rec;
}

const observer: MoveObserver = {
  recordMove(name, playerID, args, G, ctx) {
    const mid = (G as MyGameState)._matchID;
    if (!mid) return;
    const rec = getRecorder(mid);
    rec.recordMove(name, playerID, args, G.round, ctx.turn, ctx.phase);

    if (ctx.gameover) {
      const gameover = ctx.gameover as {
        winner?: string;
        scores?: Record<string, number>;
        ranking?: string[];
      };
      const winnerPID = gameover.winner ?? "0";
      const winnerPersonality = (() => {
        const p = G.playerInfo[winnerPID];
        if (!p) return "unknown";
        const ka = p.resources.advantageCard ?? "none";
        const legacy = p.resources.legacyCard?.name ?? "none";
        return `${ka}+${legacy}`;
      })();
      rec.setResult({
        winner: winnerPID,
        winnerPersonality,
        scores: gameover.scores ?? {},
        rounds: G.round,
        rankings: (gameover.ranking ?? []).map((pid) => {
          const p = G.playerInfo[pid];
          const ka = p?.resources.advantageCard ?? "none";
          const legacy = p?.resources.legacyCard?.name ?? "none";
          return {
            playerID: pid,
            personality: `${ka}+${legacy}`,
            vp: gameover.scores?.[pid] ?? 0,
          };
        }),
      });
      const filePath = path.join(ANALYTICS_DIR, `game_${mid}.json`);
      fs.promises.writeFile(filePath, rec.toJSON()).catch((err) => {
        log.error({ err, filePath }, "Failed to write game recorder file");
      });
      recorders.delete(mid);
    }
  },
};

export function initGameRecorder(): void {
  setMoveObserver(observer);
}
