import {
  Paper,
  TextField,
  Select,
  SelectChangeEvent,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  Button,
} from "@mui/material";
import { LobbyClient } from "boardgame.io/dist/types/packages/client";
import { useState } from "react";
import React from "react";
import background from "../boards_and_assets/box_image.png";

const createMatch = async (
  lobbyClient: LobbyClient,
  numPlayers: number,
  setMatchReady: React.Dispatch<React.SetStateAction<string | undefined>>
) => {
  const response = await lobbyClient.createMatch("empires-of-the-skies", {
    numPlayers: numPlayers,
  });

  if (!response.matchID) {
    alert("Failed to create match, please try again.");
    return;
  }

  const enquiry = await lobbyClient.getMatch(
    "empires-of-the-skies",
    response.matchID
  );

  console.log(enquiry);
  setMatchReady(response.matchID);
};

const HomePageComponent = (props: HomePageComponentProps) => {
  const [joinOrCreate, setJoinOrCreate] = useState<"join" | "create">("join");
  const [playerName, setName] = useState("");
  const [matchIDInput, setMatchIDInput] = useState("");

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        backgroundImage: `url(${background})`,
        backgroundSize: "cover", // Changed to cover to prevent white gaps
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        display: "flex",        // Added flex to center the child
        justifyContent: "center",
        alignItems: "center",   // Centers the modal vertically
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          gap: "20px"
        }}
      >
        <Paper
          elevation={6}
          sx={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            maxWidth: 400,
            padding: 4,
            backgroundColor: "rgba(255, 255, 255, 0.9)", // Subtle transparency
            borderRadius: 2,
            gap: 1.5, // Automatically spaces out children
          }}
        >
          <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#444' }}>
            Player Name
          </label>
          <TextField
            size="small"
            fullWidth
            placeholder="Enter username..."
            onChange={(e) => setName(e.target.value)}
          />

          <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#444' }}>
            Match ID
          </label>
          <TextField
            size="small"
            fullWidth
            disabled={joinOrCreate === "create"}
            placeholder={joinOrCreate === "create" ? "N/A (Creating New)" : "Enter ID..."}
            onChange={(e) => setMatchIDInput(e.target.value)}
          />

          <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#444' }}>
            Number of Players
          </label>
          <Select
            size="small"
            value={props.numPlayers}
            onChange={(event) => props.setNumPlayers(Number(event.target.value))}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <MenuItem key={n} value={n}>{n}</MenuItem>
            ))}
          </Select>

          <ToggleButtonGroup
            color="primary"
            value={joinOrCreate}
            exclusive
            fullWidth
            onChange={(_, value) => value && setJoinOrCreate(value)}
            sx={{ mt: 1 }}
          >
            <ToggleButton value="join">Join</ToggleButton>
            <ToggleButton value="create">Create</ToggleButton>
          </ToggleButtonGroup>

          <Button
            fullWidth
            size="large"
            color="success"
            variant="contained"
            sx={{ mt: 1, fontWeight: 'bold' }}
            onClick={() => {
              joinOrCreate === "create"
                ? createMatch(props.lobbyClient, props.numPlayers, props.setMatchReady)
                : window.open(`/match/${matchIDInput}/${playerName}`);
            }}
          >
            {joinOrCreate === "join" ? "JOIN" : "CREATE"} GAME
          </Button>
        </Paper>

        {props.matchReady && (
          <Paper sx={{ p: 3, maxWidth: 400, textAlign: 'center', border: '2px solid #2e7d32' }}>
            <strong>Match Created!</strong>
            <p style={{ margin: '10px 0' }}>ID: <code>{props.matchReady}</code></p>
            <Button 
              variant="outlined" 
              href={`/match/${props.matchReady}/${playerName}`}
              target="_blank"
            >
              Enter Lobby
            </Button>
          </Paper>
        )}
      </div>
    </div>
  );
};

interface HomePageComponentProps {
  startGame: boolean;
  setStartGame: React.Dispatch<React.SetStateAction<boolean>>;
  matchReady: string | undefined;
  setMatchReady: React.Dispatch<React.SetStateAction<string | undefined>>;
  numPlayers: number;
  setNumPlayers: React.Dispatch<React.SetStateAction<number>>;
  lobbyClient: LobbyClient;
}

export default HomePageComponent;
