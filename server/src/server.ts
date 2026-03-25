import "dotenv/config";
import { Server, FlatFile } from "boardgame.io/server";
import cors from "@koa/cors";
import * as fs from "fs";
import * as path from "path";
import { MyGame, createLogger } from "@eots/game";

const log = createLogger("server");

const PORT = Number(process.env.PORT) || 8000;

const allowOrigin = (origin?: string) => {
  if (!origin) return "";
  if (origin === "http://localhost:5173") return origin;
  if (origin.endsWith(".vercel.app")) return origin;
  if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return origin;
  return "";
};

const server = Server({
  games: [MyGame],
  origins: (origin) => !!allowOrigin(origin),
  db: new FlatFile({ dir: "./storage" }),
});

server.app.use(
  cors({
    origin: (ctx: any) => allowOrigin(ctx.request.header.origin),
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Bot log endpoint: POST /api/bot-log ──────────────────────────────────
const BOT_LOGS_DIR = path.resolve(__dirname, "../../bot-logs");
if (!fs.existsSync(BOT_LOGS_DIR)) fs.mkdirSync(BOT_LOGS_DIR, { recursive: true });

// Active log streams per match
const logStreams: Map<string, fs.WriteStream> = new Map();

function getLogStream(matchID: string): fs.WriteStream {
  let stream = logStreams.get(matchID);
  if (!stream) {
    const filePath = path.join(BOT_LOGS_DIR, `game-${matchID}.txt`);
    stream = fs.createWriteStream(filePath, { flags: "a" });
    logStreams.set(matchID, stream);
  }
  return stream;
}

server.app.use(async (ctx: any, next: any) => {
  if (ctx.method === "POST" && ctx.path === "/api/bot-log") {
    const body = await parseBody(ctx);
    const { matchID, line } = body;
    if (matchID && line) {
      const stream = getLogStream(matchID);
      stream.write(line + "\n");
    }
    ctx.status = 200;
    ctx.body = "ok";
    return;
  }
  await next();
});

async function parseBody(ctx: any): Promise<any> {
  return new Promise((resolve) => {
    let data = "";
    ctx.req.on("data", (chunk: Buffer) => { data += chunk; });
    ctx.req.on("end", () => {
      try { resolve(JSON.parse(data)); }
      catch { resolve({}); }
    });
  });
}

server.run(PORT, () => log.info(`Server running on port ${PORT}`));