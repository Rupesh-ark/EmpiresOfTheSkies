import {
  Paper,
  TextField,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  Button,
  Typography,
  Box, 
} from "@mui/material";
import { LobbyClient } from "boardgame.io/dist/types/packages/client";
import { useState } from "react";
import React from "react";
import background from "../boards_and_assets/box_art.png";

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

  // Define thematic colors and fonts
  const fontColorAgedInk = "#3e2723";
  const bronzeBorderColor = "#a67c52";
  const agedGreenGradient = "linear-gradient(to bottom, #2c6e49, #1b4d3e)";
  const thematicFont = "'Cinzel', serif"; 

  return (
    <Box
        sx={{
          minHeight: "100dvh",
          width: "100%",
          overflowY: "auto",
          backgroundImage: `url(${background})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: { xs: "scroll", md: "fixed" },

          display: "flex",
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: { xs: "center", md: "flex-start" },

          px: { xs: "clamp(12px, 3vw, 24px)", md: "clamp(24px, 4vw, 96px)" },
          py: { xs: "clamp(16px, 4vh, 40px)", md: "clamp(24px, 4vh, 64px)" },
          pb: { xs: "calc(env(safe-area-inset-bottom) + 16px)", md: "clamp(24px, 10vh, 64px)" },

          boxSizing: "border-box",
        }}
      >
      <Box
            sx={{
              width: "100%",
              maxWidth: { xs: 520, md: 520 }, 
              display: "flex",
              flexDirection: "column",
              alignItems: { xs: "stretch", md: "flex-start" },
              gap: { xs: 2, md: 2.5 },
            }}
          >
        <Paper
          elevation={6}
          sx={{
            display: "flex",
            flexDirection: "column",
            
            width: "100%",
            maxWidth: "420px",
            p: { xs: 2.5, sm: 3, md: 4 },
            padding: { xs: 3, md: 4 }, 
            backgroundSize: "cover",
            backgroundColor: "rgba(240, 230, 210, 0.75)", 
            backgroundBlendMode: "lighten",
            border: `2px solid ${bronzeBorderColor}`, 
            boxShadow: "inset 0 0 10px rgba(0, 0, 0, 0.3)", 
            borderRadius: 1, 
            gap: 1.5,
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontFamily: thematicFont,
              fontWeight: "700",
              color: fontColorAgedInk,
              textAlign: "center",
              letterSpacing: "0.1em",
              mb: 1,
            }}
          >
            COMMAND CENTER
          </Typography>

          <label
            style={{
              width: "100%",       
              textAlign: "left",   
              fontSize: "0.95rem",
              fontWeight: "bold",
              fontFamily: thematicFont,
              color: fontColorAgedInk,
              letterSpacing: "0.05em",
            }}
          >
            Player Name
          </label>
          <TextField
            size="small"
            fullWidth
            placeholder="Enter username..."
            onChange={(e) => setName(e.target.value)}
            sx={{
              "& .MuiInputBase-root": {
                fontFamily: thematicFont,
                color: fontColorAgedInk,
                backgroundColor: "rgba(255, 255, 255, 0.6)",
                borderRadius: "2px",
                border: `1px solid ${bronzeBorderColor}`,
                "&:hover": { borderColor: "#d2b48c" },
              },
              "& .MuiOutlinedInput-notchedOutline": { border: "none" },
            }}
          />

          <label
           style={{
              width: "100%",       
              textAlign: "left", 
              fontSize: "0.95rem",
              fontWeight: "bold",
              fontFamily: thematicFont,
              color: fontColorAgedInk,
              letterSpacing: "0.05em",
            }}
          >
            Match ID
          </label>
          <TextField
            size="small"
            fullWidth
            disabled={joinOrCreate === "create"}
            placeholder={
              joinOrCreate === "create" ? "N/A (Creating New)" : "Enter ID..."
            }
            onChange={(e) => setMatchIDInput(e.target.value)}
            sx={{
              "& .MuiInputBase-root": {
                fontFamily: thematicFont,
                color: fontColorAgedInk,
                backgroundColor: "rgba(255, 255, 255, 0.6)",
                borderRadius: "2px",
                border: `1px solid ${bronzeBorderColor}`,
                "&.Mui-disabled": {
                  backgroundColor: "rgba(0, 0, 0, 0.05)",
                  borderColor: "rgba(0, 0, 0, 0.2)",
                  color: "rgba(0, 0, 0, 0.5)",
                },
              },
              "& .MuiOutlinedInput-notchedOutline": { border: "none" },
            }}
          />

          <label
            style={{
              width: "100%",       
              textAlign: "left",   
              fontSize: "0.95rem",
              fontWeight: "bold",
              fontFamily: thematicFont,
              color: fontColorAgedInk,
              letterSpacing: "0.05em",
            }}
          >
            Number of Players
          </label>
          <Select
            size="small"
            value={props.numPlayers}
            onChange={(event) => props.setNumPlayers(Number(event.target.value))}
            sx={{
              fontFamily: thematicFont,
              color: fontColorAgedInk,
              backgroundColor: "rgba(255, 255, 255, 0.6)",
              borderRadius: "2px",
              border: `1px solid ${bronzeBorderColor}`,
              "&:hover": { borderColor: "#d2b48c" },
              "& .MuiSelect-select": { color: fontColorAgedInk },
              "& .MuiOutlinedInput-notchedOutline": { border: "none" },
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <MenuItem key={n} value={n}>
                {n}
              </MenuItem>
            ))}
          </Select>

          <ToggleButtonGroup
            color="secondary"
            value={joinOrCreate}
            exclusive
            fullWidth
            onChange={(_, value) => value && setJoinOrCreate(value)}
            sx={{
              mt: 1,
              "& .MuiToggleButton-root": {
                fontFamily: thematicFont,
                color: fontColorAgedInk,
                border: `1px solid ${bronzeBorderColor}`,
                backgroundColor: "rgba(250, 245, 235, 0.9)",
                "&.Mui-selected": {
                  backgroundColor: "#a67c52",
                  backgroundImage: "none",
                  color: "rgba(255, 255, 255, 0.9)",
                  "&:hover": { backgroundColor: "#b89062" },
                },
                "&:hover": { backgroundColor: "rgba(250, 245, 235, 1)" },
              },
            }}
          >
            <ToggleButton value="join">Join</ToggleButton>
            <ToggleButton value="create">Create</ToggleButton>
          </ToggleButtonGroup>

          <Button
            fullWidth
            size="large"
            color="success"
            variant="contained"
            sx={{
              mt: 1,
              fontFamily: thematicFont,
              letterSpacing: "0.1em",
              fontWeight: "700",
              textTransform: "uppercase",
              background: agedGreenGradient,
              border: `2px solid #5c4033`,
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
              color: "rgba(255, 255, 255, 0.9)",
              "&:hover": {
                background: "linear-gradient(to bottom, #1b5e20, #134e35)",
                borderColor: "#4d3122",
              },
            }}
            onClick={() => {
              joinOrCreate === "create"
                ? createMatch(
                    props.lobbyClient,
                    props.numPlayers,
                    props.setMatchReady
                  )
                : window.open(`/match/${matchIDInput}/${playerName}`);
            }}
          >
            {joinOrCreate === "join" ? "JOIN" : "CREATE"} GAME
          </Button>
        </Paper>

        {props.matchReady && (
          <Paper
            sx={{
              width: "100%",
              maxWidth: "420px",
              p: { xs: 2.5, sm: 3, md: 4 },
              textAlign: "center",
              backgroundColor: "rgba(240, 230, 210, 0.9)",
              backgroundBlendMode: "overlay",
              border: `2px solid ${bronzeBorderColor}`,
              borderRadius: 1,
              fontFamily: thematicFont,
              color: fontColorAgedInk,
            }}
          >
            <Typography variant="h6" sx={{ fontFamily: thematicFont }}>
              <strong>Match Created!</strong>
            </Typography>
            <p style={{ margin: "10px 0" }}>
              ID: <code>{props.matchReady}</code>
            </p>
            <Button
              variant="outlined"
              href={`/match/${props.matchReady}/${playerName}`}
              target="_blank"
              sx={{
                fontFamily: thematicFont,
                color: fontColorAgedInk,
                borderColor: bronzeBorderColor,
                "&:hover": {
                  borderColor: "#b89062",
                  backgroundColor: "rgba(0, 0, 0, 0.02)",
                },
              }}
            >
              Enter Lobby
            </Button>
          </Paper>
        )}
      </Box>
    </Box>
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