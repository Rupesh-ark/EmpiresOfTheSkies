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
import { LobbyClient } from "boardgame.io/client";
import { useEffect, useState } from "react";
import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BG_DESKTOP as bgDesktop, BG_TABLET as bgTablet, BG_MOBILE as bgMobile } from "../assets/homePage";
import { BG_PARCHMENT_PANEL } from "../assets/backgrounds";
import { tokens } from "@/theme";

const colors = { home: tokens.home } as const;
const fonts = { accent: tokens.font.accent, primary: tokens.font.display, system: tokens.font.body } as const;

const GAME_NAME = "empires-of-the-skies";
const PLAYER_NAME_KEY = "eots_player_name";

const createMatch = async (
  lobbyClient: LobbyClient,
  numHumans: number,
  numBots: number,
  setMatchReady: React.Dispatch<React.SetStateAction<string | undefined>>,
  setError: (message: string) => void,
  botNames: string[] = [],
) => {
  try {
    const totalPlayers = numHumans + numBots;
    const response = await lobbyClient.createMatch(GAME_NAME, {
      numPlayers: totalPlayers,
    });

    if (!response.matchID) {
      setError("Failed to create match — please try again.");
      return;
    }

    // Auto-join bots into the last N slots
    if (numBots > 0) {
      const botCredentials: Record<string, string> = {};
      const botPlayerIDs: string[] = [];
      for (let i = 0; i < numBots; i++) {
        const botName = botNames[i] ?? `Bot ${i + 1}`;
        const botResponse = await lobbyClient.joinMatch(
          GAME_NAME,
          response.matchID,
          { playerName: botName, playerID: String(i) }
        );
        botCredentials[String(i)] = botResponse.playerCredentials;
        botPlayerIDs.push(String(i));
      }
      localStorage.setItem(`eots_bots_${response.matchID}`, JSON.stringify({
        botPlayerIDs,
        botCredentials,
      }));
    }

    setMatchReady(response.matchID);
  } catch {
    setError("Failed to create match — check your connection and try again.");
  }
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

const errorTextSx = {
  fontFamily: fonts.system,
  fontSize: "0.8rem",
  color: "#8f2f2f",
  lineHeight: 1.4,
} as const;

const TAGLINES = [
  ["An Age of Faith turns into an Age of ", "Discovery", "#33684a", "..."],
  ["An Age of Scarcity to an Age of ", "Wealth", "#33684a", "..."],
  ["An Age of Peace to an Age of ", "War!", "#9c3030", ""],
] as const;

const HomePageComponent = (props: HomePageComponentProps) => {
  const [searchParams] = useSearchParams();
  const invitedMatchID = searchParams.get("match") ?? "";

  const [joinOrCreate, setJoinOrCreate] = useState<"join" | "create">("join");
  const [playerName, setName] = useState(
    () => localStorage.getItem(PLAYER_NAME_KEY) ?? ""
  );
  const [matchIDInput, setMatchIDInput] = useState(invitedMatchID);
  const [numBots, setNumBots] = useState(0);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const navigate = useNavigate();

  // An invite link (/?match=xyz) lands directly on the Join tab with the
  // ID filled in — the invitee only types their name.
  useEffect(() => {
    if (invitedMatchID) setJoinOrCreate("join");
  }, [invitedMatchID]);

  const BOT_NAMES = ["Aldric", "Isolde", "Theron", "Seraphina", "Cassius", "Elara"];
  const pickBotNames = (count: number) => {
    const shuffled = [...BOT_NAMES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  };

  const missingField =
    playerName.trim() === ""
      ? "Enter your name to continue"
      : joinOrCreate === "join" && matchIDInput.trim() === ""
        ? "Enter the Match ID you were given"
        : "";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (missingField || busy) return;

    const name = playerName.trim();
    localStorage.setItem(PLAYER_NAME_KEY, name);
    setFormError("");
    setBusy(true);

    if (joinOrCreate === "create") {
      await createMatch(
        props.lobbyClient,
        props.numPlayers,
        numBots,
        props.setMatchReady,
        setFormError,
        pickBotNames(numBots),
      );
      setBusy(false);
      return;
    }

    // Verify the match exists (and has room) before navigating, so a
    // typo'd ID fails here at the field instead of somewhere downstream.
    const matchID = matchIDInput.trim();
    try {
      const match = await props.lobbyClient.getMatch(GAME_NAME, matchID);
      const hasOpenSeat = match.players.some((p) => !p.name);
      if (!hasOpenSeat) {
        setFormError("That match is already full.");
        setBusy(false);
        return;
      }
    } catch {
      setFormError("Match not found — check the ID and try again.");
      setBusy(false);
      return;
    }

    navigate(`/match/${matchID}/${name}`);
  };

  const copyInviteLink = async (matchID: string) => {
    const link = `${window.location.origin}/?match=${matchID}`;
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — leave the ID visible.
    }
  };

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
      {/* Centered content column */}
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
          component="form"
          onSubmit={handleSubmit}
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
              opacity: 0.9,
              pointerEvents: "none",
              zIndex: 0,
              borderRadius: "inherit",
            },
            // Quiet double border, echoing the illustrated frame of the
            // artwork. Deliberately static: the only thing on this page
            // that should ask for attention is the submit button.
            "&::after": {
              content: '""',
              position: "absolute",
              inset: -3,
              borderRadius: "8px",
              border: `1px solid ${colors.home.border}`,
              boxShadow: `inset 0 0 0 3px transparent, 0 0 0 4px ${colors.home.darkBrown}30`,
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
                  opacity: 0.9,
                }}
              >
                {prefix}
                <Box component="span" sx={{ color: highlightColor, fontWeight: 700 }}>
                  {highlight}
                </Box>
                {suffix}
              </Typography>
            ))}
          </Box>

          {/* Game description */}
          <Box
            sx={{
              textAlign: "center",
              px: { xs: 1, md: 2 },
              py: 1.5,
              borderTop: `1px solid ${colors.home.border}40`,
              borderBottom: `1px solid ${colors.home.border}40`,
            }}
          >
            <Typography
              sx={{
                fontFamily: fonts.system,
                fontSize: { xs: "0.78rem", md: "0.84rem" },
                lineHeight: 1.65,
                color: colors.home.text,
              }}
            >
              Command a kingdom of skyships through discovery, religious politics, and
              war — 2&ndash;6 players, the most Victory Points after six rounds wins.
            </Typography>
          </Box>

          <Button
            size="small"
            variant="text"
            onClick={() => navigate("/rules")}
            sx={{
              alignSelf: "center",
              fontFamily: fonts.accent,
              fontSize: "0.82rem",
              letterSpacing: "0.06em",
              color: colors.home.text,
              opacity: 0.8,
              textDecoration: "underline",
              textUnderlineOffset: "3px",
              "&:hover": { opacity: 1, backgroundColor: "transparent" },
            }}
          >
            How to Play &rarr;
          </Button>

          <ToggleButtonGroup
            color="secondary"
            value={joinOrCreate}
            exclusive
            onChange={(_, value) => {
              if (!value) return;
              setJoinOrCreate(value);
              setFormError("");
            }}
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
            autoFocus
            placeholder="e.g. Aldric of Angland"
            value={playerName}
            onChange={(e) => {
              setName(e.target.value);
              setFormError("");
            }}
            sx={textFieldSx}
          />

          {joinOrCreate === "join" && (
            <>
              <Typography sx={labelSx}>Match ID</Typography>
              <TextField
                size="small"
                fullWidth
                placeholder="Paste the ID from your host"
                value={matchIDInput}
                onChange={(e) => {
                  setMatchIDInput(e.target.value);
                  setFormError("");
                }}
                sx={textFieldSx}
              />
            </>
          )}

          {joinOrCreate === "create" && (
            <>
              <Typography sx={labelSx}>Human Players</Typography>
              <Select
                size="small"
                fullWidth
                value={props.numPlayers}
                onChange={(event) => {
                  const humans = Number(event.target.value);
                  props.setNumPlayers(humans);
                  if (humans + numBots > 6) setNumBots(6 - humans);
                }}
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
                  <MenuItem key={n} value={n} disabled={n + numBots > 6}>
                    {n}
                  </MenuItem>
                ))}
              </Select>

              <Typography sx={labelSx}>AI Bots</Typography>
              <Select
                size="small"
                fullWidth
                value={numBots}
                onChange={(event) => setNumBots(Number(event.target.value))}
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
                {Array.from({ length: 7 - props.numPlayers }, (_, i) => i).map((n) => (
                  <MenuItem key={n} value={n}>
                    {n === 0 ? "0 (humans only)" : n}
                  </MenuItem>
                ))}
              </Select>

              <Typography sx={{ fontFamily: fonts.system, fontSize: "0.78rem", color: colors.home.text, opacity: 0.6, textAlign: "center" }}>
                Total: {props.numPlayers + numBots} players ({props.numPlayers} human, {numBots} bot{numBots !== 1 ? "s" : ""})
              </Typography>
            </>
          )}

          {formError && (
            <Typography role="alert" sx={{ ...errorTextSx, textAlign: "center" }}>
              {formError}
            </Typography>
          )}

          <Button
            fullWidth
            size="large"
            type="submit"
            color="success"
            variant="contained"
            disabled={Boolean(missingField) || busy}
            sx={{
              mt: 1,
              fontFamily: fonts.accent,
              letterSpacing: "0.1em",
              fontWeight: 700,
              textTransform: "uppercase",
              background: `linear-gradient(to bottom, ${colors.home.gradientTop}, ${colors.home.gradientBottom})`,
              border: `2px solid ${colors.home.darkBrown}`,
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
              color: "rgba(255, 255, 255, 0.95)",
              "&:hover": {
                background: `linear-gradient(to bottom, ${colors.home.gradientTopHover}, ${colors.home.gradientBottomHover})`,
                borderColor: colors.home.darkerBrown,
              },
              // Unmistakably inert: flat and desaturated rather than a
              // washed-out version of the enabled gradient.
              "&.Mui-disabled": {
                background: colors.home.disabledBg,
                color: colors.home.disabledText,
                border: `2px solid ${colors.home.disabledBorder}`,
                boxShadow: "none",
              },
            }}
          >
            {busy
              ? joinOrCreate === "join" ? "Checking match..." : "Creating..."
              : `${joinOrCreate} game`}
          </Button>

          {missingField && (
            <Typography
              sx={{
                fontFamily: fonts.system,
                fontSize: "0.78rem",
                color: colors.home.text,
                opacity: 0.65,
                textAlign: "center",
              }}
            >
              {missingField}
            </Typography>
          )}
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
            <Box sx={{ display: "flex", gap: 1.5, justifyContent: "center", flexWrap: "wrap" }}>
              <Button
                variant="outlined"
                onClick={() => copyInviteLink(props.matchReady!)}
                sx={{
                  fontFamily: fonts.accent,
                  color: colors.home.text,
                  borderColor: colors.home.border,
                  minWidth: 150,
                  "&:hover": {
                    borderColor: colors.home.hoverBronze,
                    backgroundColor: "rgba(0, 0, 0, 0.02)",
                  },
                }}
              >
                {linkCopied ? "Link copied ✓" : "Copy invite link"}
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={() => navigate(`/match/${props.matchReady}/${playerName.trim()}`)}
                sx={{
                  fontFamily: fonts.accent,
                  fontWeight: 700,
                  background: `linear-gradient(to bottom, ${colors.home.gradientTop}, ${colors.home.gradientBottom})`,
                  border: `2px solid ${colors.home.darkBrown}`,
                  color: "rgba(255, 255, 255, 0.95)",
                  "&:hover": {
                    background: `linear-gradient(to bottom, ${colors.home.gradientTopHover}, ${colors.home.gradientBottomHover})`,
                  },
                }}
              >
                Enter Lobby
              </Button>
            </Box>
            <Typography
              sx={{
                mt: 1.5,
                fontFamily: fonts.system,
                fontSize: "0.78rem",
                color: colors.home.text,
                opacity: 0.65,
              }}
            >
              Send the invite link to your players — it opens with the Match ID filled in.
            </Typography>
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
