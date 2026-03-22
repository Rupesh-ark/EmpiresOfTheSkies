/**
 * LobbyPage — Full-viewport waiting room.
 *
 * Two-column layout over the background art:
 *   Left:  World lore & game guide (frosted dark panel)
 *   Right: Lobby controls (frosted dark panel)
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
} from "@mui/material";
import { ContentCopy, CheckCircle, RadioButtonUnchecked } from "@mui/icons-material";
import { LobbyClient } from "boardgame.io/client";
import { createLogger } from "@eots/game";
import { BG_DESKTOP as bgDesktop, BG_TABLET as bgTablet, BG_MOBILE as bgMobile } from "../assets/homePage";
import { tokens } from "@/theme";

const log = createLogger("lobby");
const colors = { home: tokens.home } as const;
const fonts = { accent: tokens.font.accent, primary: tokens.font.display, system: tokens.font.body } as const;

const storageKey = (matchID: string, playerName: string) =>
  `eots_${matchID}_${playerName}`;

const saveSession = (matchID: string, playerName: string, playerID: string, credentials: string) => {
  localStorage.setItem(storageKey(matchID, playerName), JSON.stringify({ playerID, credentials }));
  log.info("session saved", { matchID, playerName, playerID });
};

const loadSession = (matchID: string, playerName: string): { playerID: string; credentials: string } | null => {
  const raw = localStorage.getItem(storageKey(matchID, playerName));
  if (!raw) return null;
  return JSON.parse(raw);
};

interface PlayerSlot {
  id: number;
  name?: string;
  isConnected?: boolean;
}

// ── Styling constants ───────────────────────────────────────────
const CREAM = "#F5ECD8";
const CREAM_DIM = "rgba(245,236,216,0.65)";
const GOLD = "#E8C860";
const PANEL_BG = "rgba(20,16,10,0.75)";
const PANEL_BORDER = "rgba(200,170,120,0.25)";
const DIVIDER = "rgba(200,170,120,0.18)";

const GUIDE_ITEMS = [
  ["Kingdom Advantage", "Pick a unique ability card that shapes your strategy — elite troops, smuggling networks, extra prisons, or church influence."],
  ["Event Cards", "Each round begins with events — rebellions, plagues, invasions, marriages, or bumper crops. You choose which to play from your hand."],
  ["Discovery", "Flip map tiles to reveal oceans, new races, and legendary places. Discoveries spread heresy as they challenge Church doctrine."],
  ["Actions", "Place counsellors on the action board to recruit troops, buy skyships, build cathedrals, found factories, or influence the Church."],
  ["Battles", "Send fleets across the map. Aerial battles use skyships and Fortune of War cards. Ground battles follow to conquer territories."],
  ["Elections", "Elect an Archprelate who can bless or curse kingdoms. Control the Church, or turn heretic and defy it."],
  ["Legacy", "Earn permanent titles like 'The Great' or 'The Conqueror' that score Victory Points at game end."],
] as const;

const LobbyPage = ({ lobbyClient }: { lobbyClient: LobbyClient }) => {
  const { matchID, playerName } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<PlayerSlot[]>([]);
  const [totalSlots, setTotalSlots] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const hasJoinAttempted = useRef(false);

  // ── Join the match on mount ───────────────────────────────────
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
        log.info("joined match", { playerID: response.playerID });
      } catch (e) {
        log.error("join failed", { error: String(e) });
        setError("Failed to join match. Check the Match ID and try again.");
      }
    };

    joinMatch();
  }, [matchID, playerName, lobbyClient]);

  const pollMatch = useCallback(async () => {
    if (!matchID) return;
    try {
      const match = await lobbyClient.getMatch("empires-of-the-skies", matchID);
      setPlayers(match.players);
      setTotalSlots(match.players.length);
    } catch {
      /* polling failure is non-fatal */
    }
  }, [matchID, lobbyClient]);

  useEffect(() => {
    pollMatch();
    const interval = setInterval(pollMatch, 2000);
    return () => clearInterval(interval);
  }, [pollMatch]);

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
        {/* Title */}
        <Typography
          sx={{
            fontFamily: fonts.accent,
            fontSize: "clamp(1.6rem, 2.5vw, 2.2rem)",
            fontWeight: 800,
            color: GOLD,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            mb: 2.5,
          }}
        >
          Empires of the Sky
        </Typography>

        {/* World lore */}
        <Typography
          sx={{
            fontFamily: fonts.accent,
            fontSize: "clamp(0.9rem, 1.2vw, 1.1rem)",
            fontWeight: 700,
            color: CREAM,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            mb: 1,
          }}
        >
          The World of Faithdom
        </Typography>
        <Typography
          sx={{
            fontFamily: fonts.system,
            fontSize: "clamp(0.85rem, 1.05vw, 1rem)",
            lineHeight: 1.7,
            color: CREAM_DIM,
            mb: 2.5,
          }}
        >
          You are the Monarch of a kingdom in Faithdom — a land hemmed in by icy wastes,
          mountains, the hostile Infidel Empire, and the stormy Ocean Sea. Alchemists have
          discovered the secret of flight, and bold aviators are venturing beyond in skyships
          to discover new lands filled with strange beings and fabulous wealth. Purchase skyships,
          send fleets to claim outposts, conquer distant lands, and use their riches to build
          the greatest empire.
        </Typography>

        {/* Divider */}
        <Box sx={{ height: "1px", background: DIVIDER, mb: 2 }} />

        {/* What to expect */}
        <Typography
          sx={{
            fontFamily: fonts.accent,
            fontSize: "clamp(0.9rem, 1.2vw, 1.1rem)",
            fontWeight: 700,
            color: CREAM,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            mb: 1.5,
          }}
        >
          What to Expect
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
            gap: { xs: "8px", lg: "10px 32px" },
            mb: 2.5,
          }}
        >
          {GUIDE_ITEMS.map(([title, desc]) => (
            <Typography
              key={title}
              sx={{
                fontFamily: fonts.system,
                fontSize: "clamp(0.8rem, 1vw, 0.92rem)",
                lineHeight: 1.6,
                color: CREAM_DIM,
              }}
            >
              <Box component="span" sx={{ color: GOLD, fontWeight: 700 }}>{title}:</Box>{" "}
              {desc}
            </Typography>
          ))}
        </Box>

        {/* Win condition */}
        <Box sx={{ height: "1px", background: DIVIDER, mb: 1.5 }} />
        <Typography
          sx={{
            fontFamily: fonts.system,
            fontSize: "clamp(0.8rem, 1vw, 0.92rem)",
            lineHeight: 1.6,
            color: CREAM_DIM,
            fontStyle: "italic",
          }}
        >
          The game lasts 8 rounds. The player with the most Victory Points — from buildings,
          conquests, legacy cards, trade, and church influence — wins.
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
