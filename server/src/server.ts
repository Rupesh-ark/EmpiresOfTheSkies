import "dotenv/config";
import { Server } from "boardgame.io/server";
import cors from "@koa/cors";
import { MyGame } from "@eots/game";

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
});

server.app.use(
  cors({
    origin: (ctx: any) => allowOrigin(ctx.request.header.origin),
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

server.run(PORT, () => console.log(`Server running on port ${PORT}`));