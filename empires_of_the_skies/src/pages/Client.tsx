import { Client } from "boardgame.io/react";
import { SocketIO } from "boardgame.io/multiplayer";
import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { MyGame } from "@eots/game";
import { ActionBoardsAndMap } from "../components/ActionBoardsAndMap";
import React from "react";
import { LobbyClient } from "boardgame.io/client";

const storageKey = (matchID: string, playerName: string) =>
  `eots_${matchID}_${playerName}`;

const saveSession = (matchID: string, playerName: string, playerID: string, credentials: string) => {
  localStorage.setItem(storageKey(matchID, playerName), JSON.stringify({ playerID, credentials }));
  console.log("[Client] Session saved to localStorage", { matchID, playerName, playerID });
};

const loadSession = (matchID: string, playerName: string): { playerID: string; credentials: string } | null => {
  const raw = localStorage.getItem(storageKey(matchID, playerName));
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  console.log("[Client] Session loaded from localStorage", parsed);
  return parsed;
};

const ClientComponent = (props: ClientComponentProps) => {
  const { matchID, playerName } = useParams();
  const [playerID, setPlayerID] = useState<string | undefined>(undefined);
  const [playerCredentials, setPlayerCredentials] = useState<string | undefined>(undefined);
  const hasJoined = useRef(false);
  const server = props.server;

  useEffect(() => {
    console.log("[Client] useEffect triggered", { matchID, playerName, hasJoined: hasJoined.current });

    if (hasJoined.current || !matchID || !playerName) {
      console.log("[Client] Skipping join — already joined or missing params");
      return;
    }
    hasJoined.current = true;

    const join = async () => {
      try {
        // Check localStorage first — covers page refresh case
        const existingSession = loadSession(matchID, playerName);
        if (existingSession) {
          console.log("[Client] Reconnecting with existing session", existingSession);
          setPlayerID(existingSession.playerID);
          setPlayerCredentials(existingSession.credentials);
          props.setStartGame(true);
          return;
        }

        console.log("[Client] No existing session — fetching match info for matchID:", matchID);
        const enquiry = await props.lobbyClient.getMatch("empires-of-the-skies", matchID);
        console.log("[Client] Match info received:", enquiry);

        // Check if this playerName already has a slot (localStorage was cleared but server still has them)
        for (const player of Object.values(enquiry.players)) {
          console.log(`[Client] Player slot ${player.id} — isConnected: ${player.isConnected}, name: ${player.name}`);
          if (player.name === playerName) {
            console.warn("[Client] Player name already registered but no local credentials — cannot reconnect securely");
            alert("You are already registered in this match but your session was lost. Please rejoin with a different name or ask the host to restart the match.");
            return;
          }
        }

        // Find a free slot
        let freeSlotID: number | undefined;
        for (const player of Object.values(enquiry.players)) {
          if (!player.name && freeSlotID === undefined) {
            freeSlotID = player.id;
          }
        }

        console.log("[Client] Free slot found:", freeSlotID);

        if (freeSlotID === undefined) {
          console.warn("[Client] No free slots available — game is full");
          alert("Game is already full");
          return;
        }

        console.log("[Client] Joining match as:", { playerName, freeSlotID });
        const response = await props.lobbyClient.joinMatch(
          "empires-of-the-skies",
          matchID,
          { playerName, playerID: freeSlotID.toString() }
        );
        console.log("[Client] Joined successfully:", response);

        saveSession(matchID, playerName, response.playerID, response.playerCredentials);
        setPlayerID(response.playerID);
        setPlayerCredentials(response.playerCredentials);
        props.setStartGame(true);
      } catch (e) {
        console.error("[Client] Failed to join match:", e);
        alert("Failed to join match, please try again");
      }
    };

    join();
  }, [matchID, playerName]);

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

  if (playerID !== undefined) {
    return (
      <EmpiresOfTheSkiesClient
        playerID={playerID}
        matchID={matchID}
        credentials={playerCredentials}
      />
    );
  }

  return <>Loading...</>;
};

interface ClientComponentProps {
  lobbyClient: LobbyClient;
  server: string;
  setStartGame: React.Dispatch<React.SetStateAction<boolean>>;
  matchReady: string | undefined;
}

export default ClientComponent;