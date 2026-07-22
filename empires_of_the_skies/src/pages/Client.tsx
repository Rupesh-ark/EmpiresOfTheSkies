/**
 * ClientComponent — Pure game board.
 *
 * Reads session from localStorage (saved by LobbyPage after joining).
 * If no session found, redirects back to home.
 */
import { Client } from "boardgame.io/react";
import { SocketIO } from "boardgame.io/multiplayer";
import { useMemo, useEffect, useRef, type ComponentType } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MyGame } from "@eots/game";
import { ActionBoardsAndMap } from "../components/ActionBoardsAndMap";
import { setupBotClients } from "../ai/setupBotClients";

const storageKey = (matchID: string, playerName: string) =>
  `eots_${matchID}_${playerName}`;

const loadSession = (matchID: string, playerName: string): { playerID: string; credentials: string } | null => {
  try {
    const raw = localStorage.getItem(storageKey(matchID, playerName));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const ClientComponent = ({ server }: { server: string }) => {
  const { matchID, playerName } = useParams();
  const navigate = useNavigate();

  const session = matchID && playerName ? loadSession(matchID, playerName) : null;

  const botInfoRaw = matchID ? localStorage.getItem(`eots_bots_${matchID}`) : null;
  const botCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!botInfoRaw || botCleanupRef.current) return;

    let botData: { botPlayerIDs: string[]; botCredentials: Record<string, string> } | null = null;
    try {
      botData = JSON.parse(botInfoRaw);
    } catch {
      return;
    }
    if (!botData) return;

    const { botPlayerIDs, botCredentials } = botData;
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
      // beta.4's declaration emit loses the wrapper class's React.Component
      // heritage ("refs" missing), so React 18 JSX rejects it without the cast
      Client({
        game: MyGame,
        board: ActionBoardsAndMap,
        multiplayer: SocketIO({ server }),
        debug: false,
      }) as unknown as ComponentType<{
        playerID?: string;
        matchID?: string;
        credentials?: string;
      }>,
    [server]
  );

  if (!session) {
    // No session — redirect to home (shouldn't normally happen)
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
