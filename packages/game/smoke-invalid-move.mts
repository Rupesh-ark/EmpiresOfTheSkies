// E2E guard for the two tarball-only failure classes we shipped on 2026-07-18:
// 1. transport-level crashes in the packed ESM server build (PQueue),
// 2. cross-bundle identity bugs (Invalid() symbol from /core not recognized
//    by the reducer in /server, corrupting G).
// Run against a locally started `node server/dist/server.js`:
//   npx tsx smoke-invalid-move.mts [http://localhost:8000]
import { Client, LobbyClient } from "boardgame.io/client";
import { SocketIO } from "boardgame.io/multiplayer";
import { MyGame } from "./src/Game.js";

const server = process.argv[2] ?? "http://localhost:8000";
const GAME_NAME = "empires-of-the-skies";

const fail = (msg: string): never => {
  console.error("FAIL:", msg);
  process.exit(1);
};

const lobby = new LobbyClient({ server });
const { matchID } = await lobby.createMatch(GAME_NAME, { numPlayers: 3 });
// Setup phase runs in reversed player order, so player "2" acts first.
const { playerCredentials } = await lobby.joinMatch(GAME_NAME, matchID, {
  playerName: "smoke",
  playerID: "2",
});

const client = Client({
  game: MyGame,
  multiplayer: SocketIO({ server }),
  matchID,
  playerID: "2",
  credentials: playerCredentials,
});

let sawError: any = null;
let synced = false;
client.subscribe((state, error) => {
  if (error) sawError = error;
  if (state) synced = true;
});
client.start();

// Wait for sync, then make a move the server-side validator must reject.
await new Promise<void>((resolve, reject) => {
  const t0 = Date.now();
  const poll = setInterval(() => {
    if (synced) { clearInterval(poll); resolve(); }
    if (Date.now() - t0 > 15000) { clearInterval(poll); reject(new Error("no sync")); }
  }, 100);
}).catch((e) => fail(e.message));

client.moves.pickKingdomAdvantageCard("no-such-card");

await new Promise((r) => setTimeout(r, 3000));

const state = client.getState();
if (!state) fail("client lost state after invalid move");

// G corruption check: a broken symbol brand would replace G wholesale
// with { payload: {...} }.
if (!state!.G || !("cardDecks" in (state!.G as object))) {
  fail(`G was corrupted by the invalid move: ${JSON.stringify(state!.G).slice(0, 200)}`);
}

if (!sawError) fail("no actionError reached the client");
if (!sawError.payload?.message) fail(`actionError lacks payload: ${JSON.stringify(sawError)}`);

console.log("PASS: invalid move rejected server-side, G intact, error delivered:");
console.log("  ", JSON.stringify(sawError));
client.stop();
process.exit(0);
