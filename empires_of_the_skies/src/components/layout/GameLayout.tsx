import { ReactNode, useState } from "react";
import { Box, Collapse, IconButton, Tab, Tabs, Tooltip } from "@mui/material";
import { CloseFullscreen, OpenInFull } from "@mui/icons-material";
import { tokens } from "@/theme";
import { GameMood } from "@/theme";
import { PanelSlot, getPhaseLayout, MapSize } from "./phaseLayouts";

interface GameLayoutProps {
  mood: GameMood;
  renderSlot: (slot: PanelSlot) => ReactNode;
  renderMap: (size: MapSize) => ReactNode;
  children?: ReactNode;
}

const SLOT_LABELS: Record<PanelSlot, string> = {
  "action-board": "Actions",
  "game-log":     "Log",
  "stats":        "Stats",
  "rules":        "Rules",
  "player-board": "Kingdom",
  "map":          "Map",
  "empty":        "",
};

export const GameLayout = ({
  mood,
  renderSlot,
  renderMap,
  children,
}: GameLayoutProps) => {
  const config = getPhaseLayout(mood);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [extraTab, setExtraTab] = useState<PanelSlot | null>(null);

  const hasLeft = config.left.length > 0;
  const hasRight = config.right.length > 0;
  const hasBottom = config.bottom !== "empty";
  const hasExtras = config.tabExtras.length > 0;
  const resolvedMapSize: MapSize = mapExpanded ? "large" : config.mapSize;

  const handleExtraTab = (_: React.SyntheticEvent, slot: PanelSlot) => {
    setExtraTab(prev => (prev === slot ? null : slot));
  };

  // Left panel width based on screen (using CSS clamp for fluid sizing)
  const leftWidth = mapExpanded ? "0px" : "280px";
  const rightWidth = (hasRight && !mapExpanded) ? "300px" : "0px";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        overflow: "hidden",
        minHeight: 0,
      }}
    >
      {/* ── Top row: left sidebar + map + right sidebar ──────────── */}
      <Box
        sx={{
          display: "flex",
          flex: hasBottom ? "1 1 55%" : "1 1 100%",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* Left sidebar */}
        {hasLeft && (
          <Box
            sx={{
              width: leftWidth,
              minWidth: mapExpanded ? 0 : 240,
              maxWidth: mapExpanded ? 0 : 360,
              flexShrink: 0,
              overflowY: "auto",
              overflowX: "hidden",
              borderRight: `1px solid ${tokens.ui.border}`,
              backgroundColor: tokens.ui.surface,
              transition: `width ${tokens.transition.slow}, min-width ${tokens.transition.slow}, max-width ${tokens.transition.slow}`,
            }}
          >
            {config.left.map((slot, i) => (
              <Box key={`left-${i}`}>{renderSlot(slot)}</Box>
            ))}
          </Box>
        )}

        {/* Center — map */}
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

        {/* Right sidebar */}
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

      {/* ── Bottom panel (e.g., action board) ────────────────────── */}
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

      {/* ── Tab extras strip ─────────────────────────────────────── */}
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
              onChange={handleExtraTab}
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
                  <Tab key={slot} label={SLOT_LABELS[slot]} value={slot} />
                ))}
            </Tabs>
          </Box>
        </Box>
      )}

      {/* Floating / dialog children */}
      {children}
    </Box>
  );
};
