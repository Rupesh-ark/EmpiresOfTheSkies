/**
 * LobbyPage — Full-viewport waiting room.
 *
 * Two-column layout over the background art:
 *   Left:  World lore & game guide (frosted dark panel)
 *   Right: Lobby controls (frosted dark panel)
 */
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
} from "@mui/material";
import { ContentCopy, CheckCircle, RadioButtonUnchecked } from "@mui/icons-material";
import {
  GiCastle,
  GiLightningStorm,
  GiCompass,
  GiScrollUnfurled,
  GiCrossedSwords,
  GiChurch,
  GiLaurelsTrophy,
} from "react-icons/gi";
import { LobbyClient } from "boardgame.io/client";
import { BG_DESKTOP as bgDesktop, BG_TABLET as bgTablet, BG_MOBILE as bgMobile } from "../assets/homePage";
import { tokens } from "@/theme";
const colors = { home: tokens.home } as const;
const fonts = { accent: tokens.font.accent, primary: tokens.font.display, system: tokens.font.body } as const;

const storageKey = (matchID: string, playerName: string) =>
  `eots_${matchID}_${playerName}`;

const saveSession = (matchID: string, playerName: string, playerID: string, credentials: string) => {
  localStorage.setItem(storageKey(matchID, playerName), JSON.stringify({ playerID, credentials }));
};

const loadSession = (matchID: string, playerName: string): { playerID: string; credentials: string } | null => {
  try {
    const raw = localStorage.getItem(storageKey(matchID, playerName));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

interface PlayerSlot {
  id: number;
  name?: string;
  isConnected?: boolean;
}

// Styling constants
const CREAM = "#F5ECD8";
const CREAM_DIM = "rgba(245,236,216,0.78)";
const GOLD = "#E8C860";
const PANEL_BG = "rgba(20,16,10,0.92)";
const PANEL_BORDER = "rgba(200,170,120,0.18)";
const DIVIDER = "rgba(200,170,120,0.18)";

const GUIDE_ITEMS: { icon: React.ComponentType<{ size?: number }>; title: string; desc: string }[] = [
  { icon: GiCastle,          title: "Kingdom Advantage", desc: "Pick a unique ability card at setup — elite troops, smuggling, extra prisons, or church influence." },
  { icon: GiLightningStorm,  title: "Events",            desc: "Each round starts with a random event — rebellions, plagues, invasions, or bumper crops. You choose which card to submit." },
  { icon: GiCompass,         title: "Discovery",         desc: "Flip map tiles to reveal new lands, races, and legendary places. Discoveries push heresy upward." },
  { icon: GiScrollUnfurled,  title: "Actions",           desc: "Place counsellors to recruit troops, buy skyships, build cathedrals, found factories, or influence the Church." },
  { icon: GiCrossedSwords,   title: "Battles",           desc: "Send fleets across the map. Aerial battles use skyships; ground battles conquer territories." },
  { icon: GiChurch,          title: "Elections",          desc: "Elect an Archprelate who can bless or curse kingdoms. Control the Church, or turn heretic and defy it." },
  { icon: GiLaurelsTrophy,   title: "Legacy",            desc: "Earn titles like 'The Conqueror' or 'The Pious' — secret goals that score Victory Points at game end." },
];

const ROUND_PHASES = ["Events", "Discovery", "Taxes", "Actions", "Resolution", "Scoring", "Reset"];

const LobbyPage = ({ lobbyClient }: { lobbyClient: LobbyClient }) => {
  const { matchID, playerName } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<PlayerSlot[]>([]);
  const [totalSlots, setTotalSlots] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const hasJoinAttempted = useRef(false);

  // Join the match on mount
  useEffect(() => {
    if (hasJoinAttempted.current || !matchID || !playerName) return;
    hasJoinAttempted.current = true;

    const joinMatch = async () => {
      try {
        const existing = loadSession(matchID, playerName);
        if (existing) {
          setJoined(true);
          return;
        }

        const match = await lobbyClient.getMatch("empires-of-the-skies", matchID);

        for (const player of match.players) {
          if (player.name === playerName) {
            setError("This name is already taken in this match. Go back and use a different name.");
            return;
          }
        }

        const freeSlot = match.players.find((p) => !p.name);
        if (!freeSlot) {
          setError("Game is full — no available slots.");
          return;
        }

        const response = await lobbyClient.joinMatch(
          "empires-of-the-skies",
          matchID,
          { playerName, playerID: freeSlot.id.toString() }
        );

        saveSession(matchID, playerName, response.playerID, response.playerCredentials);
        setJoined(true);
      } catch {
        setError("Failed to join match. Check the Match ID and try again.");
      }
    };

    joinMatch();
  }, [matchID, playerName, lobbyClient]);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      if (!matchID) return;
      try {
        const match = await lobbyClient.getMatch("empires-of-the-skies", matchID);
        if (!cancelled) {
          setPlayers(match.players);
          setTotalSlots(match.players.length);
        }
      } catch {
        /* polling failure is non-fatal */
      }
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [matchID, lobbyClient]);

  const joinedCount = players.filter((p) => p.name).length;
  const allJoined = joinedCount === totalSlots && totalSlots > 0;

  const copyMatchID = () => {
    if (matchID) {
      navigator.clipboard.writeText(matchID);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Box
      sx={{
        height: "100dvh",
        width: "100%",
        overflow: "hidden",
        backgroundImage: {
          xs: `url(${bgMobile})`,
          sm: `url(${bgTablet})`,
          md: `url(${bgDesktop})`,
        },
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        gap: { xs: 1, md: 2 },
        p: { xs: 1, md: 2 },
        boxSizing: "border-box",
      }}
    >
      {/* ════════════════════════════════════════════════════════════
           LEFT — World lore & game guide
         ════════════════════════════════════════════════════════════ */}
      <Box
        sx={{
          flex: "1 1 60%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          p: { xs: 2.5, md: 3, lg: 4 },
          background: PANEL_BG,
          backdropFilter: "blur(12px)",
          borderRadius: "8px",
          border: `1px solid ${PANEL_BORDER}`,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
      >
        <Typography
          sx={{
            fontFamily: fonts.accent,
            fontSize: "clamp(1.6rem, 2.5vw, 2.2rem)",
            fontWeight: 800,
            color: GOLD,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            mb: 1,
          }}
        >
          Empires of the Sky
        </Typography>
        <Typography
          sx={{
            fontFamily: fonts.system,
            fontSize: "clamp(0.95rem, 1.15vw, 1.08rem)",
            lineHeight: 1.7,
            color: CREAM_DIM,
            mb: 2,
          }}
        >
          You are the Monarch of a kingdom. Purchase skyships, send fleets to discover and
          conquer new lands, control the Church, and build the greatest empire. The player with
          the most Victory Points after 6–8 rounds wins.
        </Typography>

        <Box sx={{ height: "1px", background: DIVIDER, mb: 2 }} />

        <Typography
          sx={{
            fontFamily: fonts.accent,
            fontSize: "clamp(0.95rem, 1.15vw, 1.05rem)",
            fontWeight: 700,
            color: CREAM,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            mb: 1,
          }}
        >
          Each Round
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            mb: 2.5,
          }}
        >
          {ROUND_PHASES.map((phase, i) => (
            <Box
              key={phase}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                px: 1.5,
                py: 0.6,
                borderRadius: "14px",
                backgroundColor: "rgba(232,200,96,0.08)",
                border: `1px solid rgba(232,200,96,0.2)`,
              }}
            >
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  backgroundColor: "rgba(232,200,96,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: fonts.accent,
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  color: GOLD,
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </Box>
              <Typography
                sx={{
                  fontFamily: fonts.system,
                  fontSize: "clamp(0.85rem, 1vw, 0.95rem)",
                  color: CREAM_DIM,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
              >
                {phase}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ height: "1px", background: DIVIDER, mb: 2 }} />

        <Typography
          sx={{
            fontFamily: fonts.accent,
            fontSize: "clamp(0.95rem, 1.15vw, 1.05rem)",
            fontWeight: 700,
            color: CREAM,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            mb: 1.5,
          }}
        >
          Key Concepts
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            mb: 2,
            overflowY: "auto",
            flex: 1,
            minHeight: 0,
          }}
        >
          {GUIDE_ITEMS.map(({ icon: Icon, title, desc }) => (
            <Box key={title} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
              <Box
                sx={{
                  flexShrink: 0,
                  width: 32,
                  height: 32,
                  borderRadius: "6px",
                  backgroundColor: "rgba(232,200,96,0.08)",
                  border: `1px solid rgba(232,200,96,0.15)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: GOLD,
                  mt: "2px",
                }}
              >
                <Icon size={17} />
              </Box>
              <Box>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: fonts.accent,
                    fontSize: "clamp(0.92rem, 1.1vw, 1.02rem)",
                    fontWeight: 700,
                    color: GOLD,
                    mr: 0.75,
                  }}
                >
                  {title}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: fonts.system,
                    fontSize: "clamp(0.92rem, 1.1vw, 1.02rem)",
                    lineHeight: 1.7,
                    color: CREAM_DIM,
                  }}
                >
                  {desc}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>

        <Box sx={{ height: "1px", background: DIVIDER, mb: 1.5, flexShrink: 0 }} />
        <Typography
          component="a"
          href="/rules"
          target="_blank"
          rel="noopener"
          sx={{
            flexShrink: 0,
            fontFamily: fonts.accent,
            fontSize: "clamp(0.92rem, 1.1vw, 1rem)",
            fontWeight: 700,
            color: GOLD,
            cursor: "pointer",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
            "&:hover": { color: CREAM },
          }}
        >
          Read Full Rules &rarr;
        </Typography>
      </Box>

      {/* ════════════════════════════════════════════════════════════
           RIGHT — Lobby controls
         ════════════════════════════════════════════════════════════ */}
      <Box
        sx={{
          flex: "0 0 clamp(260px, 32%, 380px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          p: { xs: 2, md: 2.5 },
          gap: 2,
          background: PANEL_BG,
          backdropFilter: "blur(12px)",
          borderRadius: "8px",
          border: `1px solid ${PANEL_BORDER}`,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        {/* Lobby title */}
        <Typography
          sx={{
            fontFamily: fonts.accent,
            fontSize: "clamp(1.2rem, 1.6vw, 1.5rem)",
            fontWeight: 800,
            color: GOLD,
            textAlign: "center",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Game Lobby
        </Typography>

        <Box sx={{ height: "1px", background: DIVIDER }} />

        {/* Match ID */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            py: 1,
            px: 1.5,
            borderRadius: "6px",
            backgroundColor: "rgba(255,255,255,0.06)",
            border: `1px solid ${PANEL_BORDER}`,
          }}
        >
          <Typography sx={{ fontFamily: fonts.accent, fontSize: "0.88rem", color: CREAM_DIM }}>
            Match ID:
          </Typography>
          <Typography sx={{ fontFamily: "monospace", fontSize: "1rem", fontWeight: 700, color: CREAM, letterSpacing: "0.05em" }}>
            {matchID}
          </Typography>
          <Tooltip title={copied ? "Copied!" : "Copy to clipboard"}>
            <IconButton size="small" onClick={copyMatchID} sx={{ color: GOLD, p: 0.5 }}>
              <ContentCopy sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>

        <Typography sx={{ fontFamily: fonts.system, fontSize: "0.85rem", color: CREAM_DIM, textAlign: "center" }}>
          Share the Match ID with other players so they can join.
        </Typography>

        {/* Player list */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          <Typography sx={{ fontFamily: fonts.accent, fontSize: "0.95rem", fontWeight: 700, color: CREAM, letterSpacing: "0.05em" }}>
            Players ({joinedCount}/{totalSlots})
          </Typography>

          {players.map((player) => (
            <Box
              key={player.id}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                py: 0.75,
                px: 1.5,
                borderRadius: "6px",
                backgroundColor: player.name ? "rgba(46,125,50,0.12)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${player.name ? "rgba(46,125,50,0.35)" : PANEL_BORDER}`,
              }}
            >
              {player.name ? (
                <CheckCircle sx={{ fontSize: 16, color: "#5CB85C" }} />
              ) : (
                <RadioButtonUnchecked sx={{ fontSize: 16, color: CREAM_DIM, opacity: 0.4 }} />
              )}
              <Typography
                sx={{
                  fontFamily: fonts.system,
                  fontSize: "0.92rem",
                  color: player.name ? CREAM : CREAM_DIM,
                  fontWeight: player.name ? 600 : 400,
                  opacity: player.name ? 1 : 0.5,
                  fontStyle: player.name ? "normal" : "italic",
                }}
              >
                {player.name
                  ? `${player.name}${player.name === playerName ? " (you)" : ""}`
                  : `Slot ${player.id + 1} — waiting...`}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Status messages */}
        {!joined && !error && (
          <Typography sx={{ fontFamily: fonts.system, fontSize: "0.9rem", color: GOLD, textAlign: "center", fontStyle: "italic" }}>
            Joining match...
          </Typography>
        )}

        {error && (
          <Box sx={{ textAlign: "center" }}>
            <Typography sx={{ fontFamily: fonts.system, fontSize: "0.88rem", color: "#F06050", mb: 1 }}>
              {error}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate("/")}
              sx={{ fontFamily: fonts.accent, fontSize: "0.88rem", color: CREAM, borderColor: PANEL_BORDER, "&:hover": { borderColor: GOLD } }}
            >
              Back to Home
            </Button>
          </Box>
        )}

        {/* Enter button — pushed to bottom */}
        <Box sx={{ mt: "auto", pt: 1 }}>
          <Box sx={{ height: "1px", background: DIVIDER, mb: 1.5 }} />
          {!allJoined && joined && (
            <Typography sx={{ fontFamily: fonts.system, fontSize: "0.88rem", color: CREAM_DIM, textAlign: "center", fontStyle: "italic", mb: 1 }}>
              Waiting for all players to join...
            </Typography>
          )}
          <Button
            fullWidth
            size="large"
            variant="contained"
            disabled={!allJoined}
            sx={{
              fontFamily: fonts.accent,
              letterSpacing: "0.1em",
              fontWeight: 700,
              fontSize: "1rem",
              textTransform: "uppercase",
              background: `linear-gradient(to bottom, ${colors.home.gradientTop}, ${colors.home.gradientBottom})`,
              border: `2px solid ${colors.home.darkBrown}`,
              boxShadow: `0 2px 4px rgba(0,0,0,0.3), 0 0 12px ${colors.home.gradientBottom}40`,
              color: "rgba(255, 255, 255, 0.95)",
              "&:hover": {
                background: `linear-gradient(to bottom, ${colors.home.gradientTopHover}, ${colors.home.gradientBottomHover})`,
                borderColor: colors.home.darkerBrown,
                boxShadow: `0 4px 8px rgba(0,0,0,0.4), 0 0 20px ${colors.home.gradientBottom}50`,
              },
              "&.Mui-disabled": {
                background: "rgba(60,50,40,0.6)",
                opacity: 0.6,
                color: "rgba(255, 255, 255, 0.35)",
                border: `2px solid rgba(100,80,50,0.3)`,
                boxShadow: "none",
              },
            }}
            onClick={() => navigate(`/game/${matchID}/${playerName}`)}
          >
            Enter Game
          </Button>
        </Box>
      </Box>

      {/* Copyright */}
      <Typography
        sx={{
          position: "absolute",
          bottom: 8,
          left: 16,
          fontFamily: fonts.accent,
          fontSize: "0.8rem",
          fontWeight: 600,
          color: "rgba(245,236,216,0.7)",
          textShadow: "0 1px 4px rgba(0,0,0,0.8)",
          letterSpacing: "0.05em",
          zIndex: 10,
          userSelect: "none",
        }}
      >
        &copy; NF MacCormack 2023
      </Typography>
    </Box>
  );
};

export default LobbyPage;
