// Dump the game log and battle-relevant state for a prod match (spectator).
import { Client } from "boardgame.io/client";
import { SocketIO } from "boardgame.io/multiplayer";
import { MyGame } from "./src/Game.js";

const server = "https://eots.rupeshpandey.dev";
const matchID = process.argv[2] ?? "VjUXAlOC49P";

const client = Client({
  game: MyGame,
  multiplayer: SocketIO({ server }),
  matchID,
  playerID: null,
});

client.subscribe((state) => {
  if (!state) return;
  const G: any = state.G;
  console.log(JSON.stringify({
    phase: state.ctx.phase,
    turn: state.ctx.turn,
    currentPlayer: state.ctx.currentPlayer,
    round: G.round,
    stage: G.stage,
    battleMap: G.mapState?.battleMap
      ? Object.entries(G.mapState.battleMap).filter(([, v]: any) => v && (v.attackers?.length || v.defenders?.length || Object.keys(v).length)).slice(0, 10)
      : null,
    currentBattle: G.mapState?.currentBattle,
    players: Object.fromEntries(Object.entries(G.playerInfo ?? {}).map(([id, p]: any) => [id, { kingdom: p.kingdomName, skyships: p.resources?.skyships, regiments: p.resources?.regiments, vp: p.resources?.victoryPoints, fleets: (p.fleetInfo ?? []).map((f: any) => ({ at: f.location, s: f.skyships, r: f.regiments, l: f.levies })) }])),
    log: (G.gameLog ?? []).map((e: any) => (typeof e === "string" ? e : e.message)),
  }, null, 1));
  client.stop();
  process.exit(0);
});
client.start();
setTimeout(() => { console.error("no sync"); process.exit(1); }, 15000);
