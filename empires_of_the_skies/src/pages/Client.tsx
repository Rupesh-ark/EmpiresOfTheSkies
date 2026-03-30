import { Client } from "boardgame.io/react";
import { SocketIO } from "boardgame.io/multiplayer";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { MyGame } from "@eots/game";
import { ActionBoardsAndMap } from "../components/ActionBoardsAndMap";
// import { joinMatch } from "./HomePage";
import React from "react";
import { LobbyClient } from "boardgame.io/client";

const joinMatch = async (
  lobbyClient: LobbyClient,
  matchID: string,
  name: string,
  setStartGame: React.Dispatch<React.SetStateAction<boolean>>,
  setPlayerID: React.Dispatch<React.SetStateAction<string | undefined>>
) => {
  const enquiry = await lobbyClient.getMatch("empires-of-the-skies", matchID);
  let playerID = 10;
  Object.values(enquiry.players).forEach((player) => {
    // if (player.name === name) {
    //   alert("This name is already in use, please try another");
    //   return;
    // } else
    if (player.isConnected !== true && playerID === 10) {
      playerID = player.id;
      setPlayerID(player.id.toString());
    }
  });

  if (playerID === 10) {
    alert("Game is already full");
  }
  console.log(enquiry);
  //   try {
  //     const response = await lobbyClient.joinMatch(
  //       "empires-of-the-skies",
  //       matchID,
  //       { playerName: name, playerID: playerID.toString() }
  //     );
  //     if (!response.playerID) {
  //       alert(
  //         "Failed to join match, please try again, perhaps also try a different username"
  //       );
  //     }
  //     console.log("is set playerId being called");
  //     setPlayerID(response.playerID);
  //     console.log("seems to be");
  //     setStartGame(true);
  //   } catch (e) {}
};

const ClientComponent = (props: ClientComponentProps) => {
  const { matchID, playerName } = useParams();
  const [playerID, setPlayerID] = useState<string | undefined>(undefined);
  const server = props.server;
  if (playerID === undefined) {
    joinMatch(
      props.lobbyClient,
      matchID ?? "",
      playerName ?? "nobody",
      props.setStartGame,
      setPlayerID
    );
  }
  console.log(`Player ID: ${playerID}`);
  console.log(`Match ID: ${matchID}`);
  console.log(`Player Name: ${playerName}`);

  if (playerID !== undefined) {
    const EmpiresOfTheSkiesClient = Client({
      game: MyGame,
      board: ActionBoardsAndMap,
      // numPlayers: numPlayers,
      multiplayer: SocketIO({ server: server }),
      debug: false,
    });
    return (
      <EmpiresOfTheSkiesClient
        playerID={playerID}
        matchID={matchID}
      ></EmpiresOfTheSkiesClient>
    );
  } else return <>Loading...</>;
};
interface ClientComponentProps {
  lobbyClient: LobbyClient;
  server: string;
  setStartGame: React.Dispatch<React.SetStateAction<boolean>>;
  matchReady: string | undefined;
}

export default ClientComponent;
