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

const BOTTOM_HEIGHT_TRANSITION = `height ${tokens.transition.slow}, min-height ${tokens.transition.slow}`;
const COLUMNS_TRANSITION        = `grid-template-columns ${tokens.transition.slow}`;

export const GameLayout = ({
  mood,
  renderSlot,
  renderMap,
  children,
}: GameLayoutProps) => {
  const config = getPhaseLayout(mood);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [extraTab, setExtraTab]       = useState<PanelSlot | null>(null);

  // When map is expanded, collapse side panels to give map all space
  const gridColumns = mapExpanded
    ? { xs: "0px 1fr 0px", lg: "0px 1fr 0px", xl: "0px 1fr 0px" }
    : {
        xs: config.gridColumns.laptop,
        lg: config.gridColumns.desktop,
        xl: config.gridColumns.wide,
      };

  const resolvedMapSize: MapSize = mapExpanded ? "large" : config.mapSize;

  const mapMaxHeight =
    resolvedMapSize === "compact" ? "40vh"
    : resolvedMapSize === "medium"  ? "55vh"
    : "100%";

  const hasRight  = config.right.length > 0;
  const hasBottom = config.bottom !== "empty";
  const hasExtras = config.tabExtras.length > 0;

  const handleExtraTab = (_: React.SyntheticEvent, slot: PanelSlot) => {
    setExtraTab(prev => (prev === slot ? null : slot));
  };

  return (
    <Box
      sx={{
        display:        "flex",
        flexDirection:  "column",
        flex:           1,
        overflow:       "hidden",
        minHeight:      0,
      }}
    >
      {/* ── Main 3-column content row ─────────────────────────────────── */}
      <Box
        sx={{
          display:               "grid",
          gridTemplateColumns:   gridColumns,
          flex:                  1,
          overflow:              "hidden",
          minHeight:             0,
          transition:            COLUMNS_TRANSITION,
        }}
      >
        {/* Left sidebar */}
        <Box
          sx={{
            overflow:    "hidden auto",
            borderRight: `1px solid ${tokens.ui.border}`,
            backgroundColor: tokens.ui.surface,
            display: mapExpanded ? "none" : "block",
          }}
        >
          {config.left.map((slot, i) => (
            <Box key={`left-${i}`}>{renderSlot(slot)}</Box>
          ))}
        </Box>

        {/* Center — map */}
        <Box
          sx={{
            position:        "relative",
            overflow:        "hidden",
            backgroundColor: tokens.ui.background,
            display:         "flex",
            flexDirection:   "column",
          }}
        >
          <Box
            sx={{
              flex:      1,
              overflow:  "hidden",
              maxHeight: resolvedMapSize === "large" ? "100%" : mapMaxHeight,
              transition: `max-height ${tokens.transition.slow}`,
            }}
          >
            {renderMap(resolvedMapSize)}
          </Box>

          {/* Enlarge / restore toggle */}
          <Tooltip title={mapExpanded ? "Restore layout" : "Enlarge map"}>
            <IconButton
              size="small"
              onClick={() => setMapExpanded(v => !v)}
              sx={{
                position:        "absolute",
                top:             8,
                right:           8,
                zIndex:          10,
                backgroundColor: "rgba(0,0,0,0.45)",
                color:           tokens.ui.textMuted,
                "&:hover": {
                  backgroundColor: "rgba(0,0,0,0.65)",
                  color:           tokens.ui.text,
                },
              }}
            >
              {mapExpanded ? <CloseFullscreen fontSize="small" /> : <OpenInFull fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Right sidebar — only rendered when config.right has entries */}
        {hasRight && (
          <Box
            sx={{
              overflow:     "hidden auto",
              borderLeft:   `1px solid ${tokens.ui.border}`,
              backgroundColor: tokens.ui.surface,
              display: mapExpanded ? "none" : "block",
            }}
          >
            {config.right.map((slot, i) => (
              <Box key={`right-${i}`}>{renderSlot(slot)}</Box>
            ))}
          </Box>
        )}
        {/* Placeholder column when right is "0px" but we still need the grid column */}
        {!hasRight && (
          <Box sx={{ overflow: "hidden", width: 0 }} />
        )}
      </Box>

      {/* ── Bottom panel ─────────────────────────────────────────────── */}
      {hasBottom && (
        <Collapse in={!mapExpanded}>
          <Box
            sx={{
              height:          config.bottomHeight,
              overflowY:       "auto",
              borderTop:       `1px solid ${tokens.ui.border}`,
              backgroundColor: tokens.ui.surface,
              flexShrink:      0,
              transition:      BOTTOM_HEIGHT_TRANSITION,
            }}
          >
            {renderSlot(config.bottom)}
          </Box>
        </Collapse>
      )}

      {/* ── Tab extras bar ───────────────────────────────────────────── */}
      {hasExtras && (
        <Box sx={{ flexShrink: 0 }}>
          {/* Expanded drawer */}
          <Collapse in={extraTab !== null} unmountOnExit>
            <Box
              sx={{
                height:          "280px",
                overflowY:       "auto",
                borderTop:       `1px solid ${tokens.ui.border}`,
                backgroundColor: tokens.ui.surface,
              }}
            >
              {extraTab !== null && renderSlot(extraTab)}
            </Box>
          </Collapse>

          {/* Tab strip */}
          <Box
            sx={{
              borderTop:       `1px solid ${tokens.ui.border}`,
              backgroundColor: tokens.ui.surfaceRaised,
            }}
          >
            <Tabs
              value={extraTab ?? false}
              onChange={handleExtraTab}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 28,
                "& .MuiTabs-indicator": {
                  backgroundColor: tokens.ui.gold,
                  height:          2,
                },
                "& .MuiTab-root": {
                  minHeight:     28,
                  fontFamily:    tokens.font.body,
                  fontSize:      tokens.fontSize.xs,
                  textTransform: "none",
                  color:         tokens.ui.textMuted,
                  padding:       "0 12px",
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
