import React from "react";
import { Lobby } from "boardgame.io/react";
import { MyGame } from "./Game";
import { ActionBoardsAndMap } from "./components/ActionBoardsAndMap";

export const LobbyComp = () => {
  return (
    <Lobby
      gameServer={`https://${window.location.hostname}:8000`}
      gameComponents={[{ game: MyGame, board: ActionBoardsAndMap }]}
    />
  );
};
