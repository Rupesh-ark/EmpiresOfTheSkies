import { Client } from "boardgame.io/client";
import { SocketIO } from "boardgame.io/multiplayer";
import { MyGame, EmpiresBot } from "@eots/game";

// TODO: Bot credentials integration
// The lobby flow (HomePageComponent.tsx → LobbyPage.tsx) currently joins players one at a time
// via lobbyClient.joinMatch(). For bots, the match creation flow needs to:
// 1. Create the match with numPlayers slots
// 2. Join the human player normally
// 3. For each bot slot: call lobbyClient.joinMatch() with a bot name (e.g. "Bot 1")
//    and store the returned credentials
// 4. Pass those credentials to setupBotClients()
//
// Until this lobby integration is done, credentials must be obtained externally
// (e.g. via the boardgame.io REST API: POST /games/empires-of-the-skies/:matchID/join)

export type BotClientHandle = {
  client: ReturnType<typeof Client>;
  bot: EmpiresBot;
  playerID: string;
};

export function setupBotClients(
  server: string,
  matchID: string,
  botPlayerIDs: string[],
  botCredentials: Record<string, string>,
): { bots: BotClientHandle[]; stop: () => void } {
  const bots: BotClientHandle[] = [];

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
        const delay = 200 + Math.random() * 600;
        setTimeout(() => {
          const move = bot.chooseMove(state.G, state.ctx, playerID);
          if (move) {
            (botClient as any).moves[move.move]?.(...move.args);
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
