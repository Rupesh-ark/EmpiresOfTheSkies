import {
  Paper,
  TextField,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  Button,
  Typography,
} from "@mui/material";
import { LobbyClient } from "boardgame.io/dist/types/packages/client";
import { useState } from "react";
import React from "react";
import background from "../boards_and_assets/box_art.png";
// Ensure you provide this image or point to your existing parchment texture
import parchmentTexture from "../boards_and_assets/parchment_texture.png";

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

  // Define some standard colors for the theme
  const fontColorAgedInk = "#3e2723";
  const bronzeBorderColor = "#a67c52";
  const agedGreenGradient = "linear-gradient(to bottom, #2c6e49, #1b4d3e)";
  const thematicFont = "'Cinzel', serif"; // Assumes Google Font 'Cinzel' is loaded

  return (
   <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        
        backgroundImage: `url(${background})`,
        backgroundSize: "90%",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "center",
        padding: "0 13vw 15vh 13vw", 
        
  
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          width: "100%",
          gap: "20px",
        }}
      >
        <Paper
          elevation={4}
          sx={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            maxWidth: 300,
            padding: 4,
            backgroundImage: `url(${parchmentTexture})`, 
            backgroundSize: "cover",
            backgroundColor: "rgba(240, 230, 210, 0.85)", 
            backgroundBlendMode: "overlay",
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

          {/* CHANGE: THEMATIC LABELS */}
          <label
            style={{
              fontSize: "0.95rem",
              fontWeight: "bold",
              fontFamily: thematicFont, // Thematic font
              color: fontColorAgedInk, // Aged ink color
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
            // CHANGE: THEMATIC INPUTS
            sx={{
              "& .MuiInputBase-root": {
                fontFamily: thematicFont,
                color: fontColorAgedInk,
                backgroundColor: "rgba(255, 255, 255, 0.6)", // Warmer tinted background
                borderRadius: "2px",
                border: `1px solid ${bronzeBorderColor}`, // Metallic border
                "&:hover": {
                  borderColor: "#d2b48c", // Lighter brass on hover
                },
              },
              "& .MuiOutlinedInput-notchedOutline": {
                border: "none", // Replace standard MUI outline with our custom styles
              },
            }}
          />

          <label
            style={{
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
            // CHANGE: THEMATIC INPUTS
            sx={{
              "& .MuiInputBase-root": {
                fontFamily: thematicFont,
                color: fontColorAgedInk,
                backgroundColor: "rgba(255, 255, 255, 0.6)", // Tinted warmer background
                borderRadius: "2px",
                border: `1px solid ${bronzeBorderColor}`,
                "&.Mui-disabled": {
                  backgroundColor: "rgba(0, 0, 0, 0.05)", // Grayish on disabled
                  borderColor: "rgba(0, 0, 0, 0.2)",
                  color: "rgba(0, 0, 0, 0.5)",
                },
              },
              "& .MuiOutlinedInput-notchedOutline": {
                border: "none",
              },
            }}
          />

          <label
            style={{
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
            // CHANGE: THEMATIC SELECT Input
            sx={{
              fontFamily: thematicFont,
              color: fontColorAgedInk,
              backgroundColor: "rgba(255, 255, 255, 0.6)", // Tinted background
              borderRadius: "2px",
              border: `1px solid ${bronzeBorderColor}`, // Metallic border
              "&:hover": {
                borderColor: "#d2b48c",
              },
              "& .MuiSelect-select": {
                color: fontColorAgedInk,
              },
              "& .MuiOutlinedInput-notchedOutline": {
                border: "none",
              },
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <MenuItem key={n} value={n}>
                {n}
              </MenuItem>
            ))}
          </Select>

          {/* CHANGE: THEMATIC Toggle Button Group */}
          <ToggleButtonGroup
            color="secondary" // Use secondary for thematic unselected state
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
                  // Aged metal for selected button
                  backgroundColor: "#a67c52", // Copper color
                  backgroundImage: "none",
                  color: "rgba(255, 255, 255, 0.9)",
                  "&:hover": {
                    backgroundColor: "#b89062", // Brighter copper on hover
                  },
                },
                "&:hover": {
                    backgroundColor: "rgba(250, 245, 235, 1)",
                }
              },
            }}
          >
            <ToggleButton value="join">Join</ToggleButton>
            <ToggleButton value="create">Create</ToggleButton>
          </ToggleButtonGroup>

          {/* CHANGE: THEMATIC ACTION Button */}
          <Button
            fullWidth
            size="large"
            color="success"
            variant="contained"
            sx={{
              mt: 1,
              fontFamily: thematicFont, // Regal font
              letterSpacing: "0.1em",
              fontWeight: "700",
              textTransform: "uppercase",
              // CHANGE: Green/Bronze etched metal plaque effect
              background: agedGreenGradient, // Deep green gradient background
              border: `2px solid #5c4033`, // Dark brass/bronze edge frame
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)", // Button shadow
              color: "rgba(255, 255, 255, 0.9)", // White text
              "&:hover": {
                background: "linear-gradient(to bottom, #1b5e20, #134e35)", // Darker on hover
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
              p: 3,
              maxWidth: 400,
              textAlign: "center",
              // CHANGE: Thematic style for "Match Created" box to match main form
              backgroundImage: `url(${parchmentTexture})`,
              backgroundColor: "rgba(240, 230, 210, 0.9)", // Sepia parchment
              backgroundBlendMode: "overlay",
              border: `2px solid ${bronzeBorderColor}`, // Aged metal edge
              borderRadius: 1,
              fontFamily: thematicFont,
              color: fontColorAgedInk, // Aged ink color
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
              // CHANGE: Thematic style for outlined button to match frame
              sx={{
                fontFamily: thematicFont,
                color: fontColorAgedInk,
                borderColor: bronzeBorderColor, // Copper border
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