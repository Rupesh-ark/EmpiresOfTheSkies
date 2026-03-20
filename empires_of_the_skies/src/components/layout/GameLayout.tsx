import { ReactNode, useEffect, useState } from "react";
import { Box, Collapse, IconButton, Tab, Tabs, Tooltip } from "@mui/material";
import { CloseFullscreen, OpenInFull } from "@mui/icons-material";
import { tokens } from "@/theme";
import { getMood } from "@/theme";
import { PanelSlot, getPhaseLayout, MapSize } from "./phaseLayouts";

/** Parchment background tints per mood */
const MOOD_BACKGROUNDS: Record<string, string> = {
  peacetime:  "#E8DEC8",
  discovery:  "#E0DECC",
  battle:     "#EDDCCC",
  election:   "#E8D8D8",
  crisis:     "#EDE0C8",
};

interface GameLayoutProps {
  /** ctx.phase — authoritative for phase identity (checked first) */
  phase: string;
  /** G.stage — sub-phase granularity (checked second) */
  stage: string;
  /** Whether it's this player's turn */
  isMyTurn: boolean;
  /** Render function for named panel slots */
  renderSlot: (slot: PanelSlot) => ReactNode;
  /** Render function for the center map area */
  renderMap: (size: MapSize) => ReactNode;
  /** Floating children (dialogs, overlays) */
  children?: ReactNode;
}

const SLOT_LABELS: Record<PanelSlot, string> = {
  "action-board": "Actions",
  "game-log":     "Log",
  "stats":        "Stats",
  "rules":        "Rules",
  "player-board": "Kingdom",
  "chat":         "Chat",
  "trade":        "Trade",
  "map":          "Map",
  "empty":        "",
};

export const GameLayout = ({
  phase,
  stage,
  isMyTurn,
  renderSlot,
  renderMap,
  children,
}: GameLayoutProps) => {
  const config = getPhaseLayout(phase, stage, isMyTurn);
  const mood = getMood(stage);
  const moodBg = MOOD_BACKGROUNDS[mood] ?? MOOD_BACKGROUNDS.peacetime;
  const [mapExpanded, setMapExpanded] = useState(false);
  const [extraTab, setExtraTab] = useState<PanelSlot | null>(null);

  // Reset tab selection when phase changes or selected tab is no longer available
  useEffect(() => {
    if (extraTab !== null && !config.tabExtras.includes(extraTab)) {
      setExtraTab(null);
    }
  }, [config.tabExtras, extraTab]);

  const hasLeft = config.left.length > 0;
  const hasRight = config.right.length > 0;
  const hasBottom = config.bottom !== "empty";
  const hasExtras = config.tabExtras.length > 0;
  const resolvedMapSize: MapSize = mapExpanded ? "large" : config.mapSize;

  // Left panel width from config (phase-dependent), collapsed when map is expanded
  const leftWidth = mapExpanded ? "0px" : config.leftWidth;
  const leftMinWidth = mapExpanded ? 0 : undefined;
  const rightWidth = (hasRight && !mapExpanded) ? "300px" : "0px";

  return (
    <Box
      sx={{
        display: "flex",
        flex: 1,
        overflow: "hidden",
        minHeight: 0,
        height: "100%",
        backgroundColor: moodBg,
        transition: `background-color ${tokens.transition.slow}`,
      }}
    >
      {/* ── Left panel (full height — spans map + bottom + tabs) ── */}
      {hasLeft && (
        <Box
          sx={{
            width: leftWidth,
            minWidth: leftMinWidth,
            flexShrink: 0,
            overflowY: "auto",
            overflowX: "hidden",
            borderRight: `1px solid ${tokens.ui.border}`,
            backgroundColor: tokens.ui.surface,
            transition: `width ${tokens.transition.slow}, min-width ${tokens.transition.slow}`,
          }}
        >
          {config.left.map((slot, i) => (
            <Box key={`left-${i}`}>{renderSlot(slot)}</Box>
          ))}
        </Box>
      )}

      {/* ── Right column: map + bottom + tabs ──────────────────── */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {/* Map + right panel row */}
        <Box
          sx={{
            display: "flex",
            flex: hasBottom ? "1 1 55%" : "1 1 100%",
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          {/* Center — map (always visible) */}
          <Box
            sx={{
              flex: 1,
              position: "relative",
              overflow: "auto",
              backgroundColor: tokens.ui.background,
              minWidth: 0,
            }}
          >
            {renderMap(resolvedMapSize)}

            {/* Enlarge / restore toggle */}
            <Tooltip title={mapExpanded ? "Restore layout" : "Enlarge map"}>
              <IconButton
                size="small"
                onClick={() => setMapExpanded(v => !v)}
                sx={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  zIndex: 10,
                  backgroundColor: "rgba(0,0,0,0.55)",
                  color: tokens.ui.textBright,
                  border: `1px solid ${tokens.ui.borderMedium}`,
                  "&:hover": {
                    backgroundColor: "rgba(0,0,0,0.75)",
                  },
                }}
              >
                {mapExpanded ? <CloseFullscreen fontSize="small" /> : <OpenInFull fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>

          {/* Right panel */}
          {hasRight && (
            <Box
              sx={{
                width: rightWidth,
                minWidth: mapExpanded ? 0 : 240,
                maxWidth: mapExpanded ? 0 : 380,
                flexShrink: 0,
                overflowY: "auto",
                overflowX: "hidden",
                borderLeft: `1px solid ${tokens.ui.border}`,
                backgroundColor: tokens.ui.surface,
                transition: `width ${tokens.transition.slow}, min-width ${tokens.transition.slow}, max-width ${tokens.transition.slow}`,
              }}
            >
              {config.right.map((slot, i) => (
                <Box key={`right-${i}`}>{renderSlot(slot)}</Box>
              ))}
            </Box>
          )}
        </Box>

        {/* ── Bottom panel (pinned, e.g. action board during actions) ── */}
        {hasBottom && (
          <Box
            sx={{
              height: config.bottomHeight,
              minHeight: "200px",
              flexShrink: 0,
              overflowY: "auto",
              borderTop: `1px solid ${tokens.ui.border}`,
              backgroundColor: tokens.ui.surface,
            }}
          >
            {renderSlot(config.bottom)}
          </Box>
        )}

        {/* ── Tab extras strip (bottom edge) ─────────────────────── */}
        {hasExtras && (
          <Box sx={{ flexShrink: 0 }}>
            {/* Expanded drawer */}
            <Collapse in={extraTab !== null} unmountOnExit>
              <Box
                sx={{
                  height: "35vh",
                  overflowY: "auto",
                  borderTop: `1px solid ${tokens.ui.border}`,
                  backgroundColor: tokens.ui.surface,
                }}
              >
                {extraTab !== null && renderSlot(extraTab)}
              </Box>
            </Collapse>

            {/* Tab strip */}
            <Box
              sx={{
                borderTop: `1px solid ${tokens.ui.border}`,
                backgroundColor: tokens.ui.surfaceRaised,
              }}
            >
              <Tabs
                value={extraTab ?? false}
                onChange={() => {}}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  minHeight: 32,
                  "& .MuiTabs-indicator": {
                    backgroundColor: tokens.ui.gold,
                    height: 2,
                  },
                  "& .MuiTab-root": {
                    minHeight: 32,
                    fontFamily: tokens.font.body,
                    fontSize: tokens.fontSize.sm,
                    textTransform: "none",
                    color: tokens.ui.textMuted,
                    padding: "4px 16px",
                    "&.Mui-selected": {
                      color: tokens.ui.gold,
                    },
                  },
                }}
              >
                {config.tabExtras
                  .filter(slot => slot !== "empty")
                  .map(slot => (
                    <Tab
                      key={slot}
                      label={SLOT_LABELS[slot]}
                      value={slot}
                      onClick={() => setExtraTab(prev => (prev === slot ? null : slot))}
                    />
                  ))}
              </Tabs>
            </Box>
          </Box>
        )}
      </Box>

      {/* Floating / dialog children */}
      {children}
    </Box>
  );
};
