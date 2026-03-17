import { Client } from "boardgame.io/react";
import { SocketIO } from "boardgame.io/multiplayer";
import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { MyGame, createLogger } from "@eots/game";
import { ActionBoardsAndMap } from "../components/ActionBoardsAndMap";
import React from "react";
import { LobbyClient } from "boardgame.io/client";

const log = createLogger("client");

const storageKey = (matchID: string, playerName: string) =>
  `eots_${matchID}_${playerName}`;

const saveSession = (matchID: string, playerName: string, playerID: string, credentials: string) => {
  localStorage.setItem(storageKey(matchID, playerName), JSON.stringify({ playerID, credentials }));
  log.info("session saved", { matchID, playerName, playerID });
};

const loadSession = (matchID: string, playerName: string): { playerID: string; credentials: string } | null => {
  const raw = localStorage.getItem(storageKey(matchID, playerName));
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  log.info("session loaded", parsed);
  return parsed;
};

const ClientComponent = (props: ClientComponentProps) => {
  const { matchID, playerName } = useParams();
  const [playerID, setPlayerID] = useState<string | undefined>(undefined);
  const [playerCredentials, setPlayerCredentials] = useState<string | undefined>(undefined);
  const hasJoined = useRef(false);
  const server = props.server;

  useEffect(() => {
    log.debug("join effect", { matchID, playerName, hasJoined: hasJoined.current });

    if (hasJoined.current || !matchID || !playerName) {
      log.debug("join skipped");
      return;
    }
    hasJoined.current = true;

    const join = async () => {
      try {
        // Check localStorage first — covers page refresh case
        const existingSession = loadSession(matchID, playerName);
        if (existingSession) {
          log.info("reconnecting", existingSession);
          setPlayerID(existingSession.playerID);
          setPlayerCredentials(existingSession.credentials);
          props.setStartGame(true);
          return;
        }

        log.info("fetching match", { matchID });
        const enquiry = await props.lobbyClient.getMatch("empires-of-the-skies", matchID);
        log.info("match info", { matchID, players: enquiry.players.length });

        // Check if this playerName already has a slot (localStorage was cleared but server still has them)
        for (const player of Object.values(enquiry.players)) {
          log.debug("player slot", { id: player.id, isConnected: player.isConnected, name: player.name });
          if (player.name === playerName) {
            log.warn("name collision", { playerName });
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

        log.info("free slot", { freeSlotID });

        if (freeSlotID === undefined) {
          log.warn("game full");
          alert("Game is already full");
          return;
        }

        log.info("joining", { playerName, freeSlotID });
        const response = await props.lobbyClient.joinMatch(
          "empires-of-the-skies",
          matchID,
          { playerName, playerID: freeSlotID.toString() }
        );
        log.info("joined", { playerID: response.playerID });

        saveSession(matchID, playerName, response.playerID, response.playerCredentials);
        setPlayerID(response.playerID);
        setPlayerCredentials(response.playerCredentials);
        props.setStartGame(true);
      } catch (e) {
        log.error("join failed", { error: String(e) });
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