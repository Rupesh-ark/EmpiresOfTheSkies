import "dotenv/config";
import { Server } from "boardgame.io/server";
import cors from "@koa/pcors";
import { MyGame } from "@eots/game";

const PORT = Number(process.env.PORT) || 8000;

const allowOrigin = (origin?: string) => {
  if (!origin) return ""; // no CORS header
  if (origin === "http://localhost:5173") return origin;
  //if (origin.endsWith(".vercel.app")) return origin; // previews + prod on vercel
  if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return origin;
  return ""; // blocked
};

const server = Server({ games: [MyGame] });

// Add CORS before routes
server.app.use(
  cors({
    origin: (ctx) => allowOrigin(ctx.request.header.origin),
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  })
);

server.run(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});