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
        background: `url(${background}) no-repeat`,
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          maxWidth: "100%",
          margin: 2,
          justifyContent: "center",
          alignContent: "center",
          alignItems: "center",
          justifyItems: "center",
        }}
      >
        <Paper
          sx={{
            display: "flex",
            flexDirection: "column",
            maxWidth: 500,
            margin: 2,
            padding: 5,
          }}
        >
          Please enter your name/username
          <TextField
            sx={{ paddingBottom: 2 }}
            onChange={(event) => {
              setName(event.target.value);
            }}
          ></TextField>
          Please enter your matchID
          <TextField
            sx={{ paddingBottom: 2 }}
            disabled={joinOrCreate === "create"}
            onChange={(event) => {
              setMatchIDInput(event.target.value);
            }}
          ></TextField>
          Please select the number of players
          <Select
            defaultValue={2}
            sx={{ marginBottom: 2 }}
            onChange={(event: SelectChangeEvent<number>) => {
              props.setNumPlayers(event.target.value as number);
            }}
          >
            <MenuItem value={1}>1</MenuItem>
            <MenuItem value={2}>2</MenuItem>
            <MenuItem value={3}>3</MenuItem>
            <MenuItem value={4}>4</MenuItem>
            <MenuItem value={5}>5</MenuItem>
            <MenuItem value={6}>6</MenuItem>
          </Select>
          <ToggleButtonGroup
            sx={{ marginBottom: 2 }}
            value={joinOrCreate}
            exclusive
            onChange={(event, value) => {
              setJoinOrCreate(value);
            }}
          >
            <ToggleButton value="join">Join</ToggleButton>
            <ToggleButton value="create">Create</ToggleButton>
          </ToggleButtonGroup>
          <Button
            color="success"
            variant="contained"
            onClick={(event) => {
              joinOrCreate === "create"
                ? createMatch(
                    props.lobbyClient,
                    props.numPlayers,
                    props.setMatchReady
                  )
                : window.open(`/match/${matchIDInput}/${playerName}`);
            }}
          >
            {joinOrCreate === "join" ? "join" : "create"} game
          </Button>
        </Paper>

        {props.matchReady && (
          <Paper
            sx={{
              display: "flex",
              flexDirection: "column",
              maxWidth: 500,
              margin: 2,
              padding: 5,
            }}
          >
            Your match ID is {props.matchReady} share it with the other players
            so that they can join your game.
            <a
              target="_blank"
              style={{ display: "inline" }}
              href={`/match/${props.matchReady}/${playerName}`}
            >
              Click here to join the match.
            </a>{" "}
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
