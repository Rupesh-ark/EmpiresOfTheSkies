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
import { createLogger } from "@eots/game";

const log = createLogger("lobby");
import { useNavigate } from "react-router-dom";
import { BG_DESKTOP as bgDesktop, BG_TABLET as bgTablet, BG_MOBILE as bgMobile } from "../assets/homePage";
import { BG_PARCHMENT_PANEL } from "../assets/backgrounds";
import { tokens } from "@/theme";

const colors = { home: tokens.home } as const;
const fonts = { accent: tokens.font.accent, primary: tokens.font.display, system: tokens.font.body } as const;

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
  log.info("match created", { matchID: enquiry.matchID });
  setMatchReady(response.matchID);
};

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

const TAGLINES = [
  ["An Age of Faith turns into an Age of ", "Discovery", "#5A9E72", "..."],
  ["An Age of Scarcity to an Age of ", "Wealth", "#5A9E72", "..."],
  ["An Age of Peace to an Age of ", "War!", "#C04040", ""],
] as const;

const HomePageComponent = (props: HomePageComponentProps) => {
  const [joinOrCreate, setJoinOrCreate] = useState<"join" | "create">("join");
  const [playerName, setName] = useState("");
  const [matchIDInput, setMatchIDInput] = useState("");
  const navigate = useNavigate();

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
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        px: { xs: "clamp(12px, 3vw, 24px)", md: "clamp(40px, 5vw, 80px)" },
        py: { xs: "clamp(16px, 4vh, 40px)", md: "clamp(24px, 4vh, 64px)" },
        pb: {
          xs: "calc(env(safe-area-inset-bottom) + 32px)",
          md: "clamp(24px, 10vh, 64px)",
        },
        boxSizing: "border-box",
      }}
    >
      {/* ── Centered content column ──────────────────────────────── */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: { xs: 1.5, md: 2 },
          width: "100%",
          maxWidth: 520,
          maxHeight: "100%",
          zIndex: 2,
        }}
      >
        {/* Form panel — contains title, taglines, and form */}
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            p: { xs: 2.5, md: 3 },
            position: "relative",
            background: "transparent",
            backdropFilter: "blur(4px)",
            border: "none",
            boxShadow: "inset 0 0 20px rgba(80, 50, 10, 0.1), 0 8px 32px rgba(0,0,0,0.25)",
            borderRadius: "6px",
            gap: 1.5,
            overflow: "visible",
            // Parchment texture
            "&::before": {
              content: '""',
              position: "absolute",
              inset: 0,
              background: `${colors.home.parchmentBg}`,
              backgroundImage: `url(${BG_PARCHMENT_PANEL})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundBlendMode: "multiply",
              opacity: 0.82,
              pointerEvents: "none",
              zIndex: 0,
              borderRadius: "inherit",
            },
            // Wire border — pulsing green glow using token colors
            "@keyframes wirePulse": {
              "0%, 100%": {
                boxShadow: `
                  inset 0 0 0 1px ${colors.home.border}40,
                  0 0 0 1px ${colors.home.border}50,
                  0 0 0 3px ${colors.home.gradientBottom}18,
                  0 0 0 4px ${colors.home.border}40,
                  0 0 0 6px ${colors.home.gradientBottom}10,
                  0 0 0 7px ${colors.home.darkBrown}30,
                  0 0 12px ${colors.home.gradientBottom}00
                `,
                borderColor: `${colors.home.border}80`,
              },
              "50%": {
                boxShadow: `
                  inset 0 0 0 1px ${colors.home.gradientTop}40,
                  0 0 0 1px ${colors.home.gradientTop}70,
                  0 0 0 3px ${colors.home.gradientTop}30,
                  0 0 0 4px ${colors.home.gradientBottom}50,
                  0 0 0 6px ${colors.home.gradientTop}20,
                  0 0 0 7px ${colors.home.gradientBottom}35,
                  0 0 16px ${colors.home.gradientTop}25
                `,
                borderColor: `${colors.home.gradientTop}90`,
              },
            },
            "&::after": {
              content: '""',
              position: "absolute",
              inset: -3,
              borderRadius: "8px",
              border: `2px solid ${colors.home.border}80`,
              animation: "wirePulse 3s ease-in-out infinite",
              pointerEvents: "none",
              zIndex: 3,
            },
            "& > *": { position: "relative", zIndex: 1 },
          }}
        >
          {/* Game title */}
          <Typography
            sx={{
              fontFamily: fonts.accent,
              fontSize: { xs: "1.5rem", sm: "1.8rem", md: "2rem" },
              fontWeight: 800,
              color: colors.home.text,
              textAlign: "center",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              lineHeight: 1.2,
              userSelect: "none",
            }}
          >
            Empires of the Sky
          </Typography>

          {/* Taglines */}
          <Box sx={{ textAlign: "center", mb: 0.5 }}>
            {TAGLINES.map(([prefix, highlight, highlightColor, suffix]) => (
              <Typography
                key={highlight}
                sx={{
                  fontFamily: fonts.accent,
                  fontSize: { xs: "0.75rem", sm: "0.82rem", md: "0.88rem" },
                  lineHeight: 1.8,
                  fontStyle: "italic",
                  color: colors.home.text,
                  opacity: 0.75,
                }}
              >
                {prefix}
                <Box component="span" sx={{ color: highlightColor, fontWeight: 700, opacity: 1 }}>
                  {highlight}
                </Box>
                {suffix}
              </Typography>
            ))}
          </Box>


          <ToggleButtonGroup
            color="secondary"
            value={joinOrCreate}
            exclusive
            onChange={(_, value) => value && setJoinOrCreate(value)}
            sx={{
              alignSelf: "center",
              "& .MuiToggleButton-root": {
                fontFamily: fonts.accent,
                fontSize: "0.8rem",
                letterSpacing: "0.06em",
                px: 3,
                py: 0.5,
                color: colors.home.text,
                border: `1px solid ${colors.home.border}`,
                backgroundColor: "transparent",
                "&.Mui-selected": {
                  backgroundColor: `${colors.home.border}`,
                  color: "rgba(255, 255, 255, 0.9)",
                  "&:hover": { backgroundColor: "#b89062" },
                },
                "&:hover": { backgroundColor: `${colors.home.border}22` },
              },
            }}
          >
            <ToggleButton value="join">Join</ToggleButton>
            <ToggleButton value="create">Create</ToggleButton>
          </ToggleButtonGroup>

          <Typography sx={{ ...labelSx, mt: 1 }}>Player Name</Typography>
          <TextField
            size="small"
            fullWidth
            placeholder="Enter username..."
            value={playerName}
            onChange={(e) => setName(e.target.value)}
            sx={textFieldSx}
          />

          {joinOrCreate === "join" && (
            <>
              <Typography sx={labelSx}>Match ID</Typography>
              <TextField
                size="small"
                fullWidth
                placeholder="Enter ID..."
                value={matchIDInput}
                onChange={(e) => setMatchIDInput(e.target.value)}
                sx={textFieldSx}
              />
            </>
          )}

          {joinOrCreate === "create" && (
            <>
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
            </>
          )}

          <Button
            fullWidth
            size="large"
            color="success"
            variant="contained"
            disabled={
              joinOrCreate === "join"
                ? playerName.trim() === "" || matchIDInput.trim() === ""
                : playerName.trim() === ""
            }
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
              "&.Mui-disabled": {
                background: `linear-gradient(to bottom, ${colors.home.gradientTop}, ${colors.home.gradientBottom})`,
                opacity: 0.45,
                color: "rgba(255, 255, 255, 0.6)",
                border: `2px solid ${colors.home.darkBrown}`,
              },
            }}
            onClick={() => {
              if (joinOrCreate === "create") {
                createMatch(props.lobbyClient, props.numPlayers, props.setMatchReady);
              } else {
                navigate(`/match/${matchIDInput}/${playerName}`);
              }
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
              backgroundImage: `url(${BG_PARCHMENT_PANEL})`,
              backgroundSize: "cover",
              backgroundColor: colors.home.parchmentBg,
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
              onClick={() => navigate(`/match/${props.matchReady}/${playerName}`)}
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

      {/* Copyright */}
      <Typography
        sx={{
          position: "absolute",
          bottom: { xs: 8, md: 12 },
          left: { xs: "50%", md: 20 },
          transform: { xs: "translateX(-50%)", md: "none" },
          fontFamily: fonts.accent,
          fontSize: "0.95rem",
          fontWeight: 600,
          color: "rgba(255, 245, 230, 0.9)",
          textShadow: "0 1px 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)",
          letterSpacing: "0.05em",
          zIndex: 1,
          userSelect: "none",
          whiteSpace: "nowrap",
        }}
      >
        &copy; NF MacCormack 2023
      </Typography>
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
