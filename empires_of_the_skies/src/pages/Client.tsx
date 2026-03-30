/**
 * ClientComponent — Pure game board.
 *
 * Reads session from localStorage (saved by LobbyPage after joining).
 * If no session found, redirects back to home.
 */
import { Client } from "boardgame.io/react";
import { SocketIO } from "boardgame.io/multiplayer";
import { useMemo, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MyGame, createLogger } from "@eots/game";
import { ActionBoardsAndMap } from "../components/ActionBoardsAndMap";
import { setupBotClients } from "../ai/setupBotClients";

const log = createLogger("client");

const storageKey = (matchID: string, playerName: string) =>
  `eots_${matchID}_${playerName}`;

const loadSession = (matchID: string, playerName: string): { playerID: string; credentials: string } | null => {
  const raw = localStorage.getItem(storageKey(matchID, playerName));
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  log.info("session loaded", parsed);
  return parsed;
};

const ClientComponent = ({ server }: { server: string }) => {
  const { matchID, playerName } = useParams();
  const navigate = useNavigate();

  const session = matchID && playerName ? loadSession(matchID, playerName) : null;

  const botInfoRaw = matchID ? localStorage.getItem(`eots_bots_${matchID}`) : null;
  const botCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!botInfoRaw || botCleanupRef.current) return;

    const { botPlayerIDs, botCredentials } = JSON.parse(botInfoRaw);
    const { stop } = setupBotClients(
      server,
      matchID!,
      botPlayerIDs,
      botCredentials,
    );
    botCleanupRef.current = stop;

    return () => {
      botCleanupRef.current?.();
      botCleanupRef.current = null;
    };
  }, [botInfoRaw, server, matchID]);

  const EmpiresOfTheSkiesClient = useMemo(
    () =>
      Client({
        game: MyGame,
        board: ActionBoardsAndMap,
        multiplayer: SocketIO({ server }),
        debug: false,
      }),
    [server]
  );

  if (!session) {
    // No session — redirect to home (shouldn't normally happen)
    log.warn("no session found, redirecting");
    navigate("/");
    return null;
  }

  return (
    <EmpiresOfTheSkiesClient
      playerID={session.playerID}
      matchID={matchID}
      credentials={session.credentials}
    />
  );
};

export default ClientComponent;
