import { Client } from "boardgame.io/client";
import { SocketIO } from "boardgame.io/multiplayer";
import { MyGame, EmpiresBot } from "@eots/game";

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
      debug: false,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    botClient.subscribe((state: any) => {
      if (!state) return;

      const isMyTurn = state.ctx.currentPlayer === playerID;
      const isActivePlayer = state.ctx.activePlayers?.[playerID];

      if (isMyTurn || isActivePlayer) {
        if (bot.isThinking()) return;
        bot.setThinking(true);

        const delay = 1500 + Math.random() * 1000;
        setTimeout(() => {
          const move = bot.chooseMove(state.G, state.ctx, playerID);
          if (move) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
