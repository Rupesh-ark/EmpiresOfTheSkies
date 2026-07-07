import { useState } from "react";

import { BrowserRouter, Routes, Route } from "react-router-dom";

import { lazy, Suspense } from "react";
import { LobbyClient } from "boardgame.io/client";
import HomePageComponent from "./HomePageComponent";
import LobbyPage from "./LobbyPage";

// Lazy: Client pulls in the whole game engine + bot AI — keep it out of the
// initial home-page chunk.
const ClientComponent = lazy(() => import("./Client"));
const RulesPage = lazy(() => import("./RulesPage"));
const AITunerPage = lazy(() => import("./AITuner"));
const AITournamentPage = lazy(() => import("./AITournamentPage"));

const HomePage = () => {
  const [startGame, setStartGame] = useState(false);
  const [matchReady, setMatchReady] = useState<string | undefined>(undefined);
  const [numPlayers, setNumPlayers] = useState(2);
  const server = import.meta.env.VITE_SERVER_URL as string;
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
            element={<LobbyPage lobbyClient={lobbyClient} />}
          />
          <Route
            path="/game/:matchID/:playerName"
            element={<Suspense fallback={<div>Loading game...</div>}><ClientComponent server={server} /></Suspense>}
          />
          <Route
            path="/rules"
            element={<Suspense fallback={<div>Loading Rules...</div>}><RulesPage /></Suspense>}
          />
          <Route
            path="/ai-tuner"
            element={<Suspense fallback={<div>Loading AI Tuner...</div>}><AITunerPage /></Suspense>}
          />
          <Route
            path="/ai-tournament"
            element={<Suspense fallback={<div>Loading Tournament Lab...</div>}><AITournamentPage /></Suspense>}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default HomePage;
