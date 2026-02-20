import { useState } from 'react';
import { Client } from 'boardgame.io/react';
import { SocketIO } from 'boardgame.io/multiplayer';
import { SimpleGame } from './game/SimpleGame';
import { Game } from './components/Game';
import './App.css';

const GameClient = Client({
  game: SimpleGame,
  board: Game,
  multiplayer: SocketIO({ server: 'http://localhost:8000' }),
  debug: true,
});

export default function App() {
  const [matchID, setMatchID] = useState('');
  const [playerID, setPlayerID] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const createGame = () => {
    const newMatchID = Math.random().toString(36).substring(2, 8);
    setMatchID(newMatchID);
    setPlayerID('0');
    setIsCreating(true);
  };

  const joinGame = () => {
    if (!matchID) return;
    setPlayerID('1');
  };

  if (matchID && playerID) {
    return (
      <div className="app">
        <div className="match-info">
          Match ID: {matchID}
        </div>
        <GameClient matchID={matchID} playerID={playerID} />
      </div>
    );
  }

  return (
    <div className="lobby">
      <div className="create-game">
        <h2>Simple Multiplayer Game</h2>
        <button onClick={createGame}>Create New Game</button>
      </div>

      {isCreating && (
        <div className="match-id-display">
          <h3>Game Created!</h3>
          <div className="match-id">
            Match ID: <span>{matchID}</span>
          </div>
          <p>Share this ID with the other player</p>
        </div>
      )}

      <div className="join-game">
        <h3>Join Existing Game</h3>
        <div className="join-controls">
          <input
            type="text"
            value={matchID}
            onChange={(e) => setMatchID(e.target.value)}
            placeholder="Enter Match ID"
          />
          <button onClick={joinGame} disabled={!matchID}>Join Game</button>
        </div>
      </div>
    </div>
  );
} 