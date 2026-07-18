import "dotenv/config";
import { Server } from "boardgame.io/server";
import { PostgresStore } from "bgio-postgres";
import cors from "@koa/cors";
import { MyGame, log as rootLog } from "@eots/game";
import { initGameRecorder } from "./gameRecorder.js";

const log = rootLog.child({ mod: "server" });

const PORT = Number(process.env.PORT) || 8000;

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ...(process.env.ADDITIONAL_ORIGINS ? process.env.ADDITIONAL_ORIGINS.split(",") : []),
  ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
];

const allowOrigin = (origin?: string): string => {
  if (!origin) return "";
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  return "";
};

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");
const db = new PostgresStore(DATABASE_URL, { logging: false });

// Static origin list (not a validator function): the array form is accepted by
// both boardgame.io 0.50.2 and the @lean-poker fork's 0.50.4, whose SocketIO
// CORS moved to the `cors` package callback signature.
const server = Server({
  games: [MyGame],
  origins: ALLOWED_ORIGINS,
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
      await (db as any).sequelize.query("SELECT 1");
      dbStatus = "connected";
    } catch {
      dbStatus = "disconnected";
    }
    ctx.body = { status: "ok", db: dbStatus, timestamp: new Date().toISOString() };
    return;
  }
  await next();
});

let runningServers: { apiServer?: { close: (cb?: () => void) => void }; appServer?: { close: (cb?: () => void) => void } } | null = null;

const shutdown = () => {
  log.info("Shutting down gracefully...");
  // Force-exit fallback in case a socket refuses to drain
  const fallback = setTimeout(() => process.exit(0), 2000);
  fallback.unref();

  const closeDbAndExit = async () => {
    try {
      await (db as any).sequelize?.close();
    } catch (err) {
      log.warn({ err }, "Error closing database pool");
    }
    log.info("Shutdown complete");
    process.exit(0);
  };

  try {
    runningServers?.apiServer?.close();
    if (runningServers?.appServer) {
      runningServers.appServer.close(() => void closeDbAndExit());
    } else {
      void closeDbAndExit();
    }
  } catch (err) {
    log.warn({ err }, "Error during shutdown cleanup");
    void closeDbAndExit();
  }
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

server
  .run(PORT, () => log.info(`Server running on port ${PORT}`))
  .then((servers) => {
    runningServers = servers;
  });