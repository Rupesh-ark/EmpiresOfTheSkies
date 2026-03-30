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
import { BG_DESKTOP as bgDesktop, BG_TABLET as bgTablet, BG_MOBILE as bgMobile, LOGO as logo } from "../assets/homePage";
import { colors, fonts } from "../designTokens";

const createMatch = async (
  lobbyClient: LobbyClient,
  numPlayers: number,
  setMatchReady: React.Dispatch<React.SetStateAction<string | undefined>>
) => {
  const response = await lobbyClient.createMatch("empires-of-the-skies", {
    numPlayers,
  });

  if (!response.matchID) {
    alert("Failed to create match, please try again.");
    return;
  }

  const enquiry = await lobbyClient.getMatch("empires-of-the-skies", response.matchID);
  console.log(enquiry);
  setMatchReady(response.matchID);
};

// Shared sx objects defined outside the component to avoid recreation on every render

const labelSx = {
  fontFamily: fonts.accent,
  fontWeight: "bold",
  fontSize: "0.95rem",
  color: colors.home.text,
  letterSpacing: "0.05em",
} as const;

const textFieldSx = {
  "& .MuiInputBase-root": {
    fontFamily: fonts.accent,
    color: colors.home.text,
    backgroundColor: colors.home.textFieldBg,
    borderRadius: "2px",
    border: `1px solid ${colors.home.border}`,
    "&:hover": { borderColor: colors.home.hoverBronze },
    "&.Mui-disabled": {
      backgroundColor: colors.home.disabledBg,
      borderColor: colors.home.disabledBorder,
      color: colors.home.disabledText,
    },
  },
  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
} as const;

const HomePageComponent = (props: HomePageComponentProps) => {
  const [joinOrCreate, setJoinOrCreate] = useState<"join" | "create">("join");
  const [playerName, setName] = useState("");
  const [matchIDInput, setMatchIDInput] = useState("");

  return (
    <Box
      sx={{
        position: "relative",
        minHeight: "100dvh",
        width: "100%",
        overflowY: "auto",
        backgroundImage: {
          xs: `url(${bgMobile})`,
          sm: `url(${bgTablet})`,
          md: `url(${bgDesktop})`,
        },
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: { xs: "scroll", md: "fixed" },
        display: "flex",
        alignItems: { xs: "flex-end", md: "center" },
        justifyContent: { xs: "center", md: "flex-end" },
        px: { xs: "clamp(12px, 3vw, 24px)", md: "clamp(60px, 7vw, 140px)" },
        py: { xs: "clamp(16px, 4vh, 40px)", md: "clamp(24px, 4vh, 64px)" },
        pb: {
          xs: "calc(env(safe-area-inset-bottom) + 32px)",
          md: "clamp(24px, 10vh, 64px)",
        },
        boxSizing: "border-box",
      }}
    >
  
      <Box
        sx={{
          position: "absolute",
          top: { xs: 12, md: 24 },
          left: { xs: "50%", md: 36 },
          transform: { xs: "translateX(-50%)", md: "none" },
          width: { xs: 150, sm: 190, md: 240 },
          height: { xs: 150, sm: 190, md: 240 },
          borderRadius: "50%",
          overflow: "hidden",
          boxShadow: "0 0 18px 6px rgba(200, 160, 60, 0.55)",
          pointerEvents: "none",
          zIndex: 1,
          userSelect: "none",
          flexShrink: 0,
        }}
      >
        <Box
          component="img"
          src={logo}
          alt="Empires of the Sky"
          sx={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }}
        />
      </Box>

      <Box
        sx={{
          position: "absolute",
          bottom: { sm: 28, md: 36 },
          left: { sm: 28, md: 44 },
          maxWidth: { sm: 320, md: 400 },
          display: { xs: "none", sm: "block" },
          zIndex: 1,
          pointerEvents: "none",
        }}
      >
        {(
          [
            ["An Age of Faith turns into an Age of ", "Discovery", "#7ecfa0", "..."],
            ["An Age of Scarcity to an Age of ", "Wealth", "#7ecfa0", "..."],
            ["An Age of Peace to an Age of ", "War!", "#e05555", ""],
          ] as const
        ).map(([prefix, highlight, highlightColor, suffix]) => (
          <Typography
            key={highlight}
            sx={{
              fontFamily: fonts.accent,
              fontSize: { sm: "1rem", md: "1.1rem" },
              lineHeight: 2,
              fontStyle: "italic",
              color: "rgba(235, 215, 170, 1)",
              textShadow: "0 0 8px rgba(0,0,0,1), 1px 1px 3px rgba(0,0,0,1)",
            }}
          >
            {prefix}
            <Box component="span" sx={{ color: highlightColor }}>
              {highlight}
            </Box>
            {suffix}
          </Typography>
        ))}
      </Box>


      <Box
        sx={{
          width: "100%",
          maxWidth: 520,
          display: "flex",
          flexDirection: "column",
          alignItems: { xs: "stretch", md: "flex-start" },
          gap: { xs: 2, md: 2.5 },
          zIndex: 2,
        }}
      >
        <Box sx={{ display: { xs: "block", sm: "none" }, textAlign: "center" }}>
          {(
            [
              ["An Age of Faith turns into an Age of ", "Discovery", "#7ecfa0", "..."],
              ["An Age of Scarcity to an Age of ", "Wealth", "#7ecfa0", "..."],
              ["An Age of Peace to an Age of ", "War!", "#e05555", ""],
            ] as const
          ).map(([prefix, highlight, highlightColor, suffix]) => (
            <Typography
              key={highlight}
              sx={{
                fontFamily: fonts.accent,
                fontSize: "0.95rem",
                lineHeight: 2,
                fontStyle: "italic",
                color: "rgba(235, 215, 170, 1)",
                textShadow: "0 0 8px rgba(0,0,0,1), 1px 1px 3px rgba(0,0,0,1)",
              }}
            >
              {prefix}
              <Box component="span" sx={{ color: highlightColor }}>
                {highlight}
              </Box>
              {suffix}
            </Typography>
          ))}
        </Box>

        <Paper
          elevation={6}
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            p: { xs: 3, md: 4 },
            backgroundColor: colors.home.parchmentBg,
            backgroundBlendMode: "lighten",
            border: `2px solid ${colors.home.border}`,
            boxShadow: "inset 0 0 10px rgba(0, 0, 0, 0.3)",
            borderRadius: 1,
            gap: 1.5,
          }}
        >
          <Typography
            sx={{
              fontFamily: fonts.accent,
              fontWeight: 700,
              fontSize: { xs: "1.2rem", md: "1.5rem" },
              color: colors.home.text,
              textAlign: "center",
              letterSpacing: "0.1em",
              mb: 1,
            }}
          >
            COMMAND CENTER
          </Typography>

          <Typography sx={labelSx}>Player Name</Typography>
          <TextField
            size="small"
            fullWidth
            placeholder="Enter username..."
            onChange={(e) => setName(e.target.value)}
            sx={textFieldSx}
          />

          <Typography sx={labelSx}>Match ID</Typography>
          <TextField
            size="small"
            fullWidth
            disabled={joinOrCreate === "create"}
            placeholder={joinOrCreate === "create" ? "N/A (Creating New)" : "Enter ID..."}
            onChange={(e) => setMatchIDInput(e.target.value)}
            sx={textFieldSx}
          />

          <Typography sx={labelSx}>Number of Players</Typography>
          <Select
            size="small"
            fullWidth
            value={props.numPlayers}
            onChange={(event) => props.setNumPlayers(Number(event.target.value))}
            sx={{
              fontFamily: fonts.accent,
              color: colors.home.text,
              backgroundColor: colors.home.textFieldBg,
              borderRadius: "2px",
              border: `1px solid ${colors.home.border}`,
              "&:hover": { borderColor: colors.home.hoverBronze },
              "& .MuiSelect-select": { color: colors.home.text },
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
                fontFamily: fonts.accent,
                color: colors.home.text,
                border: `1px solid ${colors.home.border}`,
                backgroundColor: colors.home.creamButton,
                "&.Mui-selected": {
                  backgroundColor: colors.home.border,
                  backgroundImage: "none",
                  color: "rgba(255, 255, 255, 0.9)",
                  "&:hover": { backgroundColor: "#b89062" },
                },
                "&:hover": { backgroundColor: colors.home.creamButtonSolid },
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
              fontFamily: fonts.accent,
              letterSpacing: "0.1em",
              fontWeight: 700,
              textTransform: "uppercase",
              background: `linear-gradient(to bottom, ${colors.home.gradientTop}, ${colors.home.gradientBottom})`,
              border: `2px solid ${colors.home.darkBrown}`,
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
              color: "rgba(255, 255, 255, 0.9)",
              "&:hover": {
                background: `linear-gradient(to bottom, ${colors.home.gradientTopHover}, ${colors.home.gradientBottomHover})`,
                borderColor: colors.home.darkerBrown,
              },
            }}
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
          <Paper
            sx={{
              width: "100%",
              p: { xs: 2.5, sm: 3, md: 4 },
              textAlign: "center",
              backgroundColor: "rgba(240, 230, 210, 0.9)",
              backgroundBlendMode: "overlay",
              border: `2px solid ${colors.home.border}`,
              borderRadius: 1,
              fontFamily: fonts.accent,
              color: colors.home.text,
            }}
          >
            <Typography variant="h6" sx={{ fontFamily: fonts.accent }}>
              <strong>Match Created!</strong>
            </Typography>
            <Typography sx={{ my: 1.5, fontFamily: fonts.accent, fontSize: "0.95rem" }}>
              ID: <code>{props.matchReady}</code>
            </Typography>
            <Button
              variant="outlined"
              href={`/match/${props.matchReady}/${playerName}`}
              target="_blank"
              sx={{
                fontFamily: fonts.accent,
                color: colors.home.text,
                borderColor: colors.home.border,
                "&:hover": {
                  borderColor: colors.home.hoverBronze,
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