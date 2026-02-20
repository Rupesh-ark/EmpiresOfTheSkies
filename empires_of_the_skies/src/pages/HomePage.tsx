import React, { useState } from "react";

import { BrowserRouter, Routes, Route } from "react-router-dom";

import { LobbyClient } from "boardgame.io/client";
import ClientComponent from "./Client";
import HomePageComponent from "./HomePageComponent";

const HomePage = () => {
  const [startGame, setStartGame] = useState(false);
  const [matchReady, setMatchReady] = useState<string | undefined>(undefined);
  const [numPlayers, setNumPlayers] = useState(2);
  const server = "http://localhost:8000";
  const lobbyClient = new LobbyClient({ server: server });

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/">
          <Route
            index
            element={
              <HomePageComponent
                startGame={startGame}
                setStartGame={setStartGame}
                matchReady={matchReady}
                setMatchReady={setMatchReady}
                numPlayers={numPlayers}
                setNumPlayers={setNumPlayers}
                lobbyClient={lobbyClient}
              />
            }
          />
          <Route
            path="/match/:matchID/:playerName"
            element={
              <ClientComponent
                lobbyClient={lobbyClient}
                setStartGame={setStartGame}
                matchReady={matchReady}
                server={server}
              />
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default HomePage;
