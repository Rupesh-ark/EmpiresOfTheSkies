import "dotenv/config";
import { Server } from "boardgame.io/server";
import { MyGame } from "../../src/Game";

const PORT = Number(process.env.PORT) || 8000;

const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, "http://localhost:5173"]
  : ["http://localhost:5173"];

const server = Server({
  games: [MyGame],
  origins: allowedOrigins,
});

server.run(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});