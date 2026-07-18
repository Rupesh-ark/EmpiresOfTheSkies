// Reproduce the "connecting..." hang: connect to the production server
// exactly like the browser client does and wait for the initial sync.
import { Client } from "boardgame.io/client";
import { SocketIO } from "boardgame.io/multiplayer";
import { MyGame } from "./src/Game.js";

const server = process.argv[2] ?? "https://eots.rupeshpandey.dev";
const matchID = process.argv[3] ?? "5yw0jg5_bGK";

const client = Client({
  game: MyGame,
  multiplayer: SocketIO({ server }),
  matchID,
  playerID: null, // spectator — sync requires no credentials
});

let synced = false;
client.subscribe((state) => {
  if (state && !synced) {
    synced = true;
    console.log("SYNC OK — phase:", state.ctx.phase, "turn:", state.ctx.turn);
    client.stop();
    process.exit(0);
  }
});

client.start();
console.log("connecting to", server, "match", matchID, "...");

setTimeout(() => {
  console.error("FAIL: no sync within 15s — connection state:", client.getState() === null ? "null state" : "state present");
  process.exit(1);
}, 15000);
