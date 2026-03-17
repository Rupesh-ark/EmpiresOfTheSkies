import React, { lazy, ReactNode, Suspense, useState } from "react";

import { MyGameProps } from "@eots/game";

const ActionBoard    = lazy(() => import("./ActionBoard/ActionBoard").then(m => ({ default: m.ActionBoard })));
const WorldMap       = lazy(() => import("./WorldMap/WorldMap"));
const PlayerBoard    = lazy(() => import("./PlayerBoard/PlayerBoard").then(m => ({ default: m.PlayerBoard })));
const RulesReference = lazy(() => import("./RulesReference"));
const Chat           = lazy(() => import("./Chat/Chat"));

import {
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogTitle,
  ThemeProvider,
} from "@mui/material";
import ResourceTrackerBar from "./ResourceTrackerBar/ResourceTrackerBar";
import { DialogRouter } from "./DialogRouter";

import PlayerTable   from "./PlayerTable/PlayerTable";
import HeresyTracker from "./PlayerTable/HeresyTracker";
import { useGameTheme, tokens, getMood } from "@/theme";
import { Campaign, ChatBubble, Close } from "@mui/icons-material";
import NprKingdomTable from "./PlayerTable/NprKingdomTable";
import GameLog         from "./GameLog";
import LootValueTable  from "./PlayerTable/LootValueTable";

import { GameLayout }  from "./layout";
import { PanelSlot, MapSize } from "./layout";

export const ActionBoardsAndMap = (props: MyGameProps) => {
  const theme = useGameTheme(props.G.stage);
  const mood  = getMood(props.G.stage);

  const [mapDetailRequest, setMapDetailRequest] = useState<{
    location: number[];
    key: number;
  } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(true);
  const [chatOpen,   setChatOpen]   = useState(false);

  const isElectionTurn =
    props.ctx.phase === "election" && props.playerID === props.ctx.currentPlayer;

  const openMapAtLocation = (location: number[]) => {
    setMapDetailRequest(prev => ({
      location: [...location],
      key: (prev?.key ?? 0) + 1,
    }));
  };

  const renderSlot = (slot: PanelSlot): ReactNode => {
    switch (slot) {
      case "action-board":
        return (
          <Suspense fallback={null}>
            <ActionBoard {...props} />
          </Suspense>
        );

      case "player-board":
        return (
          <Suspense fallback={null}>
            <PlayerBoard {...props} onOpenFleetLocation={openMapAtLocation} />
          </Suspense>
        );

      case "game-log":
        return <GameLog {...props} />;

      case "stats":
        return (
          <Box
            sx={{
              display:        "flex",
              flexDirection:  "column",
              alignItems:     "center",
              width:          "100%",
              gap:            0,
              px:             2,
              pt:             1,
            }}
          >
            <Box sx={{ maxWidth: 1230, width: "100%", mb: 2 }}>
              <Box
                sx={{
                  display:      "inline-flex",
                  alignItems:   "center",
                  gap:          1,
                  background:   "linear-gradient(90deg, #1a0a14 0%, #0d0d0d 50%, #1a0a00 100%)",
                  px:           2,
                  py:           0.75,
                  borderRadius: 2,
                }}
              >
                <Campaign sx={{ color: "#E77B00", fontSize: 18 }} />
                <Box component="span" sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem" }}>
                  Round
                </Box>
                <Box component="span" sx={{ color: "white", fontWeight: 700, fontSize: "1rem" }}>
                  {props.G.round}
                </Box>
                <Box component="span" sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>
                  / {props.G.finalRound}
                </Box>
              </Box>
            </Box>
            <HeresyTracker   {...props} />
            <PlayerTable     {...props} />
            <NprKingdomTable {...props} />
            <LootValueTable  {...props} />
          </Box>
        );

      case "rules":
        return (
          <Suspense fallback={null}>
            <RulesReference />
          </Suspense>
        );

      case "map":
      case "empty":
      default:
        return null;
    }
  };

  const renderMap = (_size: MapSize): ReactNode => (
    <Suspense fallback={null}>
      <WorldMap
        {...props}
        detailRequest={mapDetailRequest}
        onDetailRequestHandled={(requestKey) => {
          setMapDetailRequest(curr =>
            curr?.key === requestKey ? null : curr
          );
        }}
      />
    </Suspense>
  );

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          display:         "flex",
          flexDirection:   "column",
          height:          "100vh",
          overflow:        "hidden",
          backgroundColor: tokens.ui.background,
        }}
      >
        {/* Row 1: Resource bar */}
        <ResourceTrackerBar {...props} />

        {/* Row 2+: Phase-aware layout engine */}
        <GameLayout
          mood={mood}
          renderSlot={renderSlot}
          renderMap={renderMap}
        >
          {/* Floating chat widget — bottom-right, unchanged */}
          <Box
            sx={{
              position:      "fixed",
              bottom:        0,
              right:         24,
              zIndex:        1300,
              width:         340,
              display:       "flex",
              flexDirection: "column",
            }}
          >
            {/* Messages panel — expands upward */}
            <Collapse in={chatOpen} unmountOnExit>
              <Box
                sx={{
                  height:       480,
                  display:      "flex",
                  flexDirection:"column",
                  overflow:     "hidden",
                  boxShadow:    "0 -4px 24px rgba(0,0,0,0.25)",
                  border:       "1px solid rgba(0,0,0,0.12)",
                  borderBottom: "none",
                }}
              >
                <Suspense fallback={null}>
                  <Chat {...props} />
                </Suspense>
              </Box>
            </Collapse>

            {/* Tab bar — always visible */}
            <Box
              onClick={() => setChatOpen(o => !o)}
              sx={{
                display:     "flex",
                alignItems:  "center",
                gap:         1,
                px:          2,
                py:          1.25,
                cursor:      "pointer",
                borderRadius: 0,
                background:  isElectionTurn
                  ? "linear-gradient(90deg, #A74383, #E77B00)"
                  : "linear-gradient(90deg, #1a0a14 0%, #0d0d0d 50%, #1a0a00 100%)",
                color:       "white",
                userSelect:  "none",
                animation:
                  isElectionTurn && !chatOpen
                    ? "pulse 1.6s ease-in-out infinite"
                    : "none",
                "@keyframes pulse": {
                  "0%, 100%": { boxShadow: "0 0 0 0 rgba(167,67,131,0.5)" },
                  "50%":      { boxShadow: "0 0 0 10px rgba(167,67,131,0)" },
                },
                "&:hover": { filter: "brightness(1.3)" },
              }}
            >
              {isElectionTurn
                ? <Campaign fontSize="small" />
                : <ChatBubble fontSize="small" />
              }
              <Box
                sx={{
                  flexGrow:      1,
                  fontWeight:    700,
                  fontSize:      "0.875rem",
                  letterSpacing: 0.5,
                }}
              >
                {isElectionTurn ? "Election — cast your vote!" : "Group Chat"}
              </Box>
              <Close
                sx={{
                  fontSize:   16,
                  opacity:    0.7,
                  transform:  chatOpen ? "rotate(0deg)" : "rotate(45deg)",
                  transition: "transform 0.2s",
                }}
              />
            </Box>
          </Box>

          {/* Dialog router — renders all game phase dialogs */}
          <DialogRouter {...props} />

          {/* Election notification dialog */}
          <Dialog open={isElectionTurn && dialogOpen}>
            <DialogTitle>
              It is your turn to vote, head to the election tab.
            </DialogTitle>
            <DialogActions>
              <Button
                variant="contained"
                color="error"
                onClick={() => setDialogOpen(false)}
              >
                Dismiss
              </Button>
            </DialogActions>
          </Dialog>
        </GameLayout>
      </Box>
    </ThemeProvider>
  );
};
