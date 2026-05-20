import * as fs from "fs";
import * as path from "path";
import type { MoveObserver, MyGameState } from "@eots/game";
import type { Ctx } from "boardgame.io";

const eots = require("@eots/game") as typeof import("@eots/game");
const { GameRecorder, setMoveObserver, log } = eots;

const ANALYTICS_DIR = path.resolve(__dirname, "../analytics");
fs.mkdirSync(ANALYTICS_DIR, { recursive: true });

const recorders = new Map<string, InstanceType<typeof GameRecorder>>();

function getRecorder(matchID: string): InstanceType<typeof GameRecorder> {
  let rec = recorders.get(matchID);
  if (!rec) {
    rec = new GameRecorder(matchID);
    recorders.set(matchID, rec);
  }
  return rec;
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
