import { Client } from "boardgame.io/client";
import { SocketIO } from "boardgame.io/multiplayer";
import { MyGame, EmpiresBot } from "@eots/game";

export type BotClientHandle = {
  client: ReturnType<typeof Client>;
  bot: EmpiresBot;
  playerID: string;
};

// Bot log collection
const botLogLines: string[] = [];
let currentMatchID = "";
let logServer = "";

/** Send a log line to the server (fire-and-forget) */
function sendLogLine(line: string): void {
  botLogLines.push(line);
  if (logServer && currentMatchID) {
    fetch(`${logServer}/api/bot-log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchID: currentMatchID, line }),
    }).catch(() => { /* silently fail if server is unreachable */ });
  }
}


export function setupBotClients(
  server: string,
  matchID: string,
  botPlayerIDs: string[],
  botCredentials: Record<string, string>,
): { bots: BotClientHandle[]; stop: () => void } {
  const bots: BotClientHandle[] = [];
  currentMatchID = matchID;
  logServer = server;
  botLogLines.length = 0; // clear logs from previous game

  botPlayerIDs.forEach((playerID) => {
    const bot = new EmpiresBot({
      playerID,
    });

    const botClient = Client({
      game: MyGame,
      multiplayer: SocketIO({ server }),
      playerID,
      matchID,
      credentials: botCredentials[playerID],
      debug: false,
    });

    botClient.subscribe((state: any) => {
      if (!state) return;

      const isMyTurn = state.ctx.currentPlayer === playerID;
      const isActivePlayer = state.ctx.activePlayers?.[playerID];

      if (isMyTurn || isActivePlayer) {
        // Re-entrancy guard: prevent overlapping chooseMove calls
        // during sub-stage transitions (e.g. trainTroops → confirm_fow_draw)
        if (bot.isThinking()) return;
        bot.setThinking(true);

        // Small delay for natural pacing (200-800ms)
        const delay = 1500 + Math.random() * 1000;
        setTimeout(() => {
          const move = bot.chooseMove(state.G, state.ctx, playerID);
          if (move) {
            const pers = bot.getPersonality();
            const personality = pers ? `${pers.kaCard}+${pers.legacyCard}` : "?";
            const line = `[R${state.G.round}] P${playerID} (${personality}) ${state.G.stage.phase}/${state.G.stage.sub} → ${move.move}(${JSON.stringify(move.args)})`;
            sendLogLine(line);
            (botClient as any).moves[move.move]?.(...move.args);
          } else {
            const line = `[R${state.G.round}] P${playerID} ${state.G.stage.phase}/${state.G.stage.sub} → NO MOVE`;
            sendLogLine(line);
          }
          bot.setThinking(false);
        }, delay);
      }
    });

    botClient.start();
    bots.push({ client: botClient, bot, playerID });
  });

  return {
    bots,
    stop: () => bots.forEach((b) => b.client.stop()),
  };
}
