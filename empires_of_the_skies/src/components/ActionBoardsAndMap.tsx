import React, { lazy, Suspense, useState } from "react";

import { MyGameProps } from "@eots/game";
const ActionBoard = lazy(() => import("./ActionBoard/ActionBoard").then(m => ({ default: m.ActionBoard })));
const WorldMap = lazy(() => import("./WorldMap/WorldMap"));
const PlayerBoard = lazy(() => import("./PlayerBoard/PlayerBoard").then(m => ({ default: m.PlayerBoard })));
const RulesReference = lazy(() => import("./RulesReference"));
const Chat = lazy(() => import("./Chat/Chat"));

import {
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogTitle,
  Tab,
  Tabs,
  ThemeProvider,
} from "@mui/material";
import ResourceTrackerBar from "./ResourceTrackerBar/ResourceTrackerBar";
import { DialogRouter } from "./DialogRouter";

import PlayerTable from "./PlayerTable/PlayerTable";
import HeresyTracker from "./PlayerTable/HeresyTracker";
import { useGameTheme } from "@/theme";
import { tokens } from "@/theme";
import { Campaign, ChatBubble, Close, Timeline } from "@mui/icons-material";
import NprKingdomTable from "./PlayerTable/NprKingdomTable";
import GameLog from "./GameLog";
import LootValueTable from "./PlayerTable/LootValueTable";

const contextTabs = [
  { key: "actions", label: "Actions" },
  { key: "fleet",   label: "Fleet" },
  { key: "stats",   label: "Stats" },
  { key: "rules",   label: "Rules" },
];

export const ActionBoardsAndMap = (props: MyGameProps) => {
  const theme = useGameTheme(props.G.stage);
  const [contextTab, setContextTab] = useState("actions");
  const [logOpen, setLogOpen] = useState(false);
  const [mapDetailRequest, setMapDetailRequest] = useState<{
    location: number[];
    key: number;
  } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  const isElectionTurn =
    props.ctx.phase === "election" && props.playerID === props.ctx.currentPlayer;

  const openMapAtLocation = (location: number[]) => {
    setMapDetailRequest((previousRequest) => ({
      location: [...location],
      key: (previousRequest?.key ?? 0) + 1,
    }));
    // Map is always visible — no tab switch needed
  };

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          height: "100vh",
          overflow: "hidden",
          backgroundColor: tokens.ui.background,
        }}
      >
        {/* Row 1: Resource bar */}
        <ResourceTrackerBar {...props} />

        {/* Row 2: Main content — map on left, context panel on right */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr 340px",
              lg: "1fr 440px",
              xl: "1fr 520px",
            },
            overflow: "hidden",
          }}
        >
          {/* Left: World Map — always visible */}
          <Box
            sx={{
              overflow: "auto",
              borderRight: `1px solid ${tokens.ui.border}`,
              backgroundColor: tokens.ui.background,
            }}
          >
            <Suspense fallback={null}>
              <WorldMap
                {...props}
                detailRequest={mapDetailRequest}
                onDetailRequestHandled={(requestKey) => {
                  setMapDetailRequest((currentRequest) =>
                    currentRequest?.key === requestKey ? null : currentRequest
                  );
                }}
              />
            </Suspense>
          </Box>

          {/* Right: Context Panel */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              backgroundColor: tokens.ui.surface,
              borderLeft: `1px solid ${tokens.ui.border}`,
            }}
          >
            {/* Mini tab bar */}
            <Tabs
              value={contextTab}
              onChange={(_: React.SyntheticEvent, v: string) => setContextTab(v)}
              variant="fullWidth"
              sx={{
                minHeight: 36,
                backgroundColor: tokens.ui.surfaceRaised,
                borderBottom: `1px solid ${tokens.ui.border}`,
                "& .MuiTabs-indicator": {
                  backgroundColor: tokens.ui.gold,
                  height: 2,
                },
                "& .MuiTab-root": {
                  minHeight: 36,
                  fontFamily: tokens.font.body,
                  fontSize: tokens.fontSize.sm,
                  textTransform: "none",
                  color: tokens.ui.textMuted,
                  padding: "0 8px",
                  "&.Mui-selected": {
                    color: tokens.ui.gold,
                  },
                },
              }}
            >
              {contextTabs.map((t) => (
                <Tab key={t.key} label={t.label} value={t.key} />
              ))}
            </Tabs>

            {/* Tab content */}
            <Box sx={{ flexGrow: 1, overflow: "auto" }}>
              <Suspense fallback={null}>
                {contextTab === "actions" && <ActionBoard {...props} />}
                {contextTab === "fleet" && (
                  <PlayerBoard {...props} onOpenFleetLocation={openMapAtLocation} />
                )}
                {contextTab === "stats" && (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      width: "100%",
                      gap: 0,
                      px: 2,
                      pt: 1,
                    }}
                  >
                    <Box sx={{ maxWidth: 1230, width: "100%", mb: 2 }}>
                      <Box
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 1,
                          background:
                            "linear-gradient(90deg, #1a0a14 0%, #0d0d0d 50%, #1a0a00 100%)",
                          px: 2,
                          py: 0.75,
                          borderRadius: 2,
                        }}
                      >
                        <Campaign sx={{ color: "#E77B00", fontSize: 18 }} />
                        <Box
                          component="span"
                          sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem" }}
                        >
                          Round
                        </Box>
                        <Box
                          component="span"
                          sx={{ color: "white", fontWeight: 700, fontSize: "1rem" }}
                        >
                          {props.G.round}
                        </Box>
                        <Box
                          component="span"
                          sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}
                        >
                          / {props.G.finalRound}
                        </Box>
                      </Box>
                    </Box>
                    <HeresyTracker {...props} />
                    <PlayerTable {...props} />
                    <NprKingdomTable {...props} />
                    <LootValueTable {...props} />
                  </Box>
                )}
                {contextTab === "rules" && <RulesReference />}
              </Suspense>
            </Box>
          </Box>
        </Box>

        {/* Row 3: Bottom dock — collapsible Game Log */}
        <Box
          sx={{
            borderTop: `1px solid ${tokens.ui.border}`,
            backgroundColor: tokens.ui.surface,
            flexShrink: 0,
          }}
        >
          {/* Clickable header bar */}
          <Box
            onClick={() => setLogOpen((o) => !o)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 2,
              py: 0.75,
              cursor: "pointer",
              userSelect: "none",
              color: tokens.ui.textMuted,
              fontSize: tokens.fontSize.sm,
              fontFamily: tokens.font.body,
              "&:hover": {
                backgroundColor: tokens.ui.surfaceHover,
                color: tokens.ui.text,
              },
            }}
          >
            <Timeline fontSize="small" />
            <Box sx={{ flexGrow: 1, fontWeight: 600 }}>Game Log</Box>
            <Box sx={{ fontSize: 10 }}>{logOpen ? "▼" : "▲"}</Box>
          </Box>
          <Collapse in={logOpen}>
            <Box
              sx={{
                height: 200,
                overflowY: "auto",
                borderTop: `1px solid ${tokens.ui.border}`,
              }}
            >
              <GameLog {...props} />
            </Box>
          </Collapse>
        </Box>
      </Box>

      {/* Floating chat widget — bottom-right, unchanged */}
      <Box
        sx={{
          position: "fixed",
          bottom: 0,
          right: 24,
          zIndex: 1300,
          width: 340,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Messages panel — expands upward */}
        <Collapse in={chatOpen} unmountOnExit>
          <Box
            sx={{
              height: 480,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 -4px 24px rgba(0,0,0,0.25)",
              border: "1px solid rgba(0,0,0,0.12)",
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
          onClick={() => setChatOpen((o) => !o)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 2,
            py: 1.25,
            cursor: "pointer",
            borderRadius: 0,
            background: isElectionTurn
              ? "linear-gradient(90deg, #A74383, #E77B00)"
              : "linear-gradient(90deg, #1a0a14 0%, #0d0d0d 50%, #1a0a00 100%)",
            color: "white",
            userSelect: "none",
            animation:
              isElectionTurn && !chatOpen ? "pulse 1.6s ease-in-out infinite" : "none",
            "@keyframes pulse": {
              "0%, 100%": { boxShadow: "0 0 0 0 rgba(167,67,131,0.5)" },
              "50%": { boxShadow: "0 0 0 10px rgba(167,67,131,0)" },
            },
            "&:hover": { filter: "brightness(1.3)" },
          }}
        >
          {isElectionTurn ? (
            <Campaign fontSize="small" />
          ) : (
            <ChatBubble fontSize="small" />
          )}
          <Box
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              fontSize: "0.875rem",
              letterSpacing: 0.5,
            }}
          >
            {isElectionTurn ? "Election — cast your vote!" : "Group Chat"}
          </Box>
          <Close
            sx={{
              fontSize: 16,
              opacity: 0.7,
              transform: chatOpen ? "rotate(0deg)" : "rotate(45deg)",
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

    </ThemeProvider>
  );
};
