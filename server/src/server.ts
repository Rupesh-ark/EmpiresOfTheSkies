import "dotenv/config";
import { Server } from "boardgame.io/server";
import { PostgresStore } from "bgio-postgres";
import cors from "@koa/cors";
import { MyGame, log as rootLog } from "@eots/game";
import { initGameRecorder } from "./gameRecorder";

const log = rootLog.child({ mod: "server" });

const PORT = Number(process.env.PORT) || 8000;

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ...(process.env.ADDITIONAL_ORIGINS ? process.env.ADDITIONAL_ORIGINS.split(",") : []),
];

const allowOrigin = (origin?: string): string => {
  if (!origin) return "";
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  if (process.env.VERCEL_URL && new URL(origin).hostname === process.env.VERCEL_URL) return origin;
  return "";
};

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");
const db = new PostgresStore(DATABASE_URL, { logging: false });

const server = Server({
  games: [MyGame],
  origins: (origin: string | undefined) => !!allowOrigin(origin || undefined),
  db,
});

initGameRecorder();

// Error handler — must be first to catch errors from all subsequent middleware
server.app.use(async (ctx: any, next: any) => {
  try {
    await next();
  } catch (err: any) {
    log.error({ err: err?.message || err, status: err?.status || 500, path: ctx.path }, "Unhandled request error");
    ctx.status = err.status || 500;
    ctx.body = "Internal Server Error";
  }
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
  ctx.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  ctx.set("X-XSS-Protection", "1; mode=block");
  await next();
});

server.app.use(async (ctx: any, next: any) => {
  if (ctx.path === "/" && ctx.method === "GET") {
    ctx.body = "Empires of the Skies server is running. See /games/empires-of-the-skies";
    return;
  }
  if (ctx.path === "/health" && ctx.method === "GET") {
    let dbStatus = "unknown";
    try {
      await (db as any).client.query("SELECT 1");
      dbStatus = "connected";
    } catch {
      dbStatus = "disconnected";
    }
    ctx.body = { status: "ok", db: dbStatus, timestamp: new Date().toISOString() };
    return;
  }
  await next();
});

const shutdown = () => {
  log.info("Shutting down gracefully...");
  const exit = () => {
    log.info("Shutdown complete");
    process.exit(0);
  };
  try {
    server.app.removeAllListeners();
  } catch {
    // Ignore cleanup errors during shutdown
  }
  setTimeout(exit, 2000);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
process.on("unhandledRejection", (reason) => {
  log.error({ err: reason }, "Unhandled promise rejection");
});
process.on("uncaughtException", (err) => {
  log.error({ err }, "Uncaught exception — shutting down");
  process.exit(1);
});

server.run(PORT, () => log.info(`Server running on port ${PORT}`));