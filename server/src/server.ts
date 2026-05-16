import "dotenv/config";
import { Server } from "boardgame.io/server";
import { PostgresStore } from "bgio-postgres";
import cors from "@koa/cors";
import * as fs from "fs";
import * as path from "path";
import { MyGame, createLogger } from "@eots/game";

const log = createLogger("server");

const PORT = Number(process.env.PORT) || 8000;
const BOT_SECRET = process.env.BOT_SECRET || "";
const BOT_LOGGING = process.env.BOT_LOGGING === "true";
const MAX_BODY_SIZE = 10 * 1024;
const MAX_LOG_STREAMS = 50;
const MATCH_ID_REGEX = /^[A-Za-z0-9_-]{1,64}$/;

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ...(process.env.ADDITIONAL_ORIGINS ? process.env.ADDITIONAL_ORIGINS.split(",") : []),
];

const allowOrigin = (origin?: string): string => {
  if (!origin) return "";
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  if (process.env.VERCEL_URL && origin.endsWith(process.env.VERCEL_URL)) return origin;
  return "";
};

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");
const db = new PostgresStore(DATABASE_URL);

const server = Server({
  games: [MyGame],
  origins: (origin: string | undefined) => !!allowOrigin(origin || undefined),
  db,
});

server.app.use(
  cors({
    origin: (ctx: any) => allowOrigin(ctx.request.header.origin) || "",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

server.app.use(async (ctx: any, next: any) => {
  ctx.set("X-Content-Type-Options", "nosniff");
  ctx.set("X-Frame-Options", "DENY");
  ctx.set("Referrer-Policy", "strict-origin-when-cross-origin");
  await next();
});

server.app.use(async (ctx: any, next: any) => {
  if (ctx.path === "/" && ctx.method === "GET") {
    ctx.body = "Empires of the Skies server is running. See /games/empires-of-the-skies";
    return;
  }
  if (ctx.path === "/health" && ctx.method === "GET") {
    ctx.body = { status: "ok", timestamp: new Date().toISOString() };
    return;
  }
  await next();
});

const BOT_LOGS_DIR = path.resolve(process.env.BOT_LOG_DIR || path.join(__dirname, "../../bot-logs"));
if (!fs.existsSync(BOT_LOGS_DIR)) fs.mkdirSync(BOT_LOGS_DIR, { recursive: true });

const logStreams: Map<string, fs.WriteStream> = new Map();

function getLogStream(matchID: string): fs.WriteStream {
  let stream = logStreams.get(matchID);
  if (!stream) {
    if (logStreams.size >= MAX_LOG_STREAMS) {
      const oldestKey = logStreams.keys().next().value as string | undefined;
      if (oldestKey) {
        const oldStream = logStreams.get(oldestKey);
        if (oldStream) oldStream.end();
        logStreams.delete(oldestKey);
      }
    }
    const filePath = path.join(BOT_LOGS_DIR, `game-${matchID}.txt`);
    stream = fs.createWriteStream(filePath, { flags: "a" });
    logStreams.set(matchID, stream);
  }
  return stream;
}

server.app.use(async (ctx: any, next: any) => {
  if (ctx.method === "POST" && ctx.path === "/api/bot-log") {
    if (!BOT_LOGGING) {
      ctx.status = 404;
      return;
    }
    try {
      const body = await parseBody(ctx);
      const { matchID, line } = body;
      if (typeof matchID !== "string" || !MATCH_ID_REGEX.test(matchID)) {
        ctx.status = 400;
        ctx.body = { error: "Invalid matchID format" };
        return;
      }
      if (BOT_SECRET && ctx.request.header["x-bot-secret"] !== BOT_SECRET) {
        ctx.status = 401;
        ctx.body = { error: "Unauthorized" };
        return;
      }
      if (typeof line !== "string" || line.length > 1000) {
        ctx.status = 400;
        ctx.body = { error: "Invalid line" };
        return;
      }
      const stream = getLogStream(matchID);
      stream.write(line + "\n");
      ctx.status = 200;
      ctx.body = "ok";
    } catch (err) {
      log.error("bot-log endpoint error", { error: String(err) });
      ctx.status = 500;
      ctx.body = { error: "Internal error" };
    }
    return;
  }
  await next();
});

async function parseBody(ctx: any, maxSize: number = MAX_BODY_SIZE): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = "";
    let size = 0;
    ctx.req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxSize) {
        ctx.req.destroy();
        reject(new Error("Body too large"));
        return;
      }
      data += chunk;
    });
    ctx.req.on("end", () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        log.warn("Invalid JSON in request body", { path: ctx.path });
        resolve({});
      }
    });
    ctx.req.on("error", reject);
  });
}

const shutdown = () => {
  log.info("Shutting down...");
  for (const stream of logStreams.values()) {
    stream.end();
  }
  logStreams.clear();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

server.run(PORT, () => log.info(`Server running on port ${PORT}`));