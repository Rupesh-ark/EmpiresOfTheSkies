import React from "react";
import "./App.css";
import { Client, Lobby } from "boardgame.io/react";
import { Local, SocketIO } from "boardgame.io/multiplayer";
import { ActionBoardsAndMap } from "./components/ActionBoardsAndMap";
import { MyGame } from "./Game";
import { P2P } from "@boardgame.io/p2p";
// import { Server, Origins } from "boardgame.io/server";

const EmpiresOfTheSkiesHostClient = Client({
  game: MyGame,
  board: ActionBoardsAndMap,
  numPlayers: 6,
  multiplayer: SocketIO({ server: "http://localhost:8000" }),
  // debug: false,
});
const EmpiresOfTheSkiesClient = Client({
  game: MyGame,
  board: ActionBoardsAndMap,
  numPlayers: 6,
  multiplayer: SocketIO({ server: "http://localhost:8000" }),
  debug: false,
});

const App = () => {
  return (
    <div>
      <EmpiresOfTheSkiesClient playerID="0" matchID="test" />
      <EmpiresOfTheSkiesClient playerID="1" matchID="test" />
      <EmpiresOfTheSkiesClient playerID="2" matchID="test" />
      <EmpiresOfTheSkiesClient playerID="3" matchID="test" />
      <EmpiresOfTheSkiesClient playerID="4" matchID="test" />
      <EmpiresOfTheSkiesClient playerID="5" matchID="test" />
    </div>
  );
};

export default App;
