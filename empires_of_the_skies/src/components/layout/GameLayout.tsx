import { ReactNode, useEffect, useRef, useState } from "react";
import React from "react";
import { Box, Collapse, IconButton, Tooltip } from "@mui/material";
import { CloseFullscreen, OpenInFull } from "@mui/icons-material";
import { tokens, backgrounds } from "@/theme";
import { getMood } from "@/theme";
import { PanelSlot, getPhaseLayout, MapSize } from "./phaseLayouts";
import { useActionHover } from "@/components/ActionBoard/ActionHoverContext";
import {
  GiInfo, GiScrollUnfurled, GiBarracks, GiSwapBag, GiConversation,
} from "react-icons/gi";
import { MdQueryStats } from "react-icons/md";

/**
 * Parchment background tints per mood — derived from tokens so they
 * respect the active preset. Each mood blends its accent into the base.
 */
const MOOD_BACKGROUNDS: Record<string, string> = {
  peacetime:  tokens.ui.background,
  discovery:  tokens.mood.discovery.bg,
  battle:     tokens.mood.battle.bg,
  election:   tokens.mood.election.bg,
  crisis:     tokens.mood.crisis.bg,
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
  "player-board": "Kingdom",
  "chat":         "Chat",
  "trade":        "Trade",
  "action-info":  "Info",
  "map":          "Map",
  "empty":        "",
};

const SLOT_ICONS: Partial<Record<PanelSlot, React.ComponentType<{ size?: number }>>> = {
  "action-info":  GiInfo,
  "game-log":     GiScrollUnfurled,
  "stats":        MdQueryStats as React.ComponentType<{ size?: number }>,
  "trade":        GiSwapBag,
  "chat":         GiConversation,
  "action-board": GiBarracks,
};

/** Compact icon tab strip */
const IconTabStrip = ({
  tabs,
  activeTab,
  onTabClick,
}: {
  tabs: PanelSlot[];
  activeTab: PanelSlot | null;
  onTabClick: (slot: PanelSlot) => void;
}) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "2px",
      px: 1,
      py: "3px",
      borderBottom: `1px solid ${tokens.ui.border}`,
      backgroundColor: tokens.ui.surfaceRaised,
    }}
  >
    {tabs
      .filter(slot => slot !== "empty")
      .map(slot => {
        const Icon = SLOT_ICONS[slot];
        const isActive = activeTab === slot;
        return (
          <Tooltip key={slot} title={SLOT_LABELS[slot]} placement="top" arrow>
            <Box
              onClick={() => onTabClick(slot)}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 28,
                borderRadius: `${tokens.radius.sm}px`,
                cursor: "pointer",
                color: isActive ? tokens.ui.gold : tokens.ui.textMuted,
                backgroundColor: isActive ? `${tokens.ui.gold}15` : "transparent",
                borderBottom: isActive ? `2px solid ${tokens.ui.gold}` : "2px solid transparent",
                transition: `all ${tokens.transition.fast}`,
                "&:hover": {
                  color: isActive ? tokens.ui.gold : tokens.ui.text,
                  backgroundColor: `${tokens.ui.gold}10`,
                },
              }}
            >
              {Icon ? <Icon size={16} /> : <span style={{ fontSize: 10 }}>{SLOT_LABELS[slot]?.[0]}</span>}
            </Box>
          </Tooltip>
        );
      })}
  </Box>
);

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
  const { hoveredAction } = useActionHover();
  const tabBeforeHover = useRef<PanelSlot | null>(null);

  // Auto-switch to Info tab when hovering an action button
  useEffect(() => {
    if (hoveredAction && config.tabExtras.includes("action-info")) {
      // Save current tab before switching
      if (tabBeforeHover.current === null) {
        tabBeforeHover.current = extraTab;
      }
      setExtraTab("action-info");
    } else if (!hoveredAction && tabBeforeHover.current !== undefined) {
      // Restore previous tab when hover ends
      setExtraTab(tabBeforeHover.current);
      tabBeforeHover.current = null;
    }
  }, [hoveredAction, config.tabExtras]);

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
      className="game-layout-root"
      sx={{
        display: "flex",
        flex: 1,
        overflow: "hidden",
        minHeight: 0,
        height: "100%",
        backgroundColor: moodBg,
        backgroundImage: `${backgrounds.riverTexture}`.replace("center / cover no-repeat", "center / cover"),
        backgroundBlendMode: "soft-light",
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
            background: backgrounds.parchmentPanelTinted,
            backgroundColor: moodBg,
            transition: `width ${tokens.transition.slow}, min-width ${tokens.transition.slow}, background-color ${tokens.transition.slow}`,
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
              backgroundColor: `${tokens.ui.background}`,
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
                background: backgrounds.parchmentPanelTinted,
                transition: `width ${tokens.transition.slow}, min-width ${tokens.transition.slow}, max-width ${tokens.transition.slow}`,
              }}
            >
              {config.right.map((slot, i) => (
                <Box key={`right-${i}`}>{renderSlot(slot)}</Box>
              ))}
            </Box>
          )}
        </Box>

        {/* ── Bottom panel: split (action board + tabs) or tabs-only ── */}
        {hasBottom && hasExtras ? (
          /* Split bottom: 60% action board, 40% tabbed panel */
          <Box
            sx={{
              display: "flex",
              height: config.bottomHeight,
              minHeight: "200px",
              flexShrink: 0,
              borderTop: `1px solid ${tokens.ui.border}`,
            }}
          >
            {/* Left: Action board (60%) */}
            <Box
              sx={{
                flex: "0 0 60%",
                overflowY: "auto",
                background: backgrounds.parchmentPanelTinted,
              }}
            >
              {renderSlot(config.bottom)}
            </Box>

            {/* Right: Tabbed panel (40%) */}
            <Box
              sx={{
                flex: "0 0 40%",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                backgroundColor: tokens.ui.surfaceRaised,
              }}
            >
              {/* Tab strip header */}
              <IconTabStrip
                tabs={config.tabExtras}
                activeTab={extraTab}
                onTabClick={(slot) => setExtraTab(prev => (prev === slot ? null : slot))}
              />

              {/* Tab content */}
              <Box
                sx={{
                  flex: 1,
                  overflowY: "auto",
                  minHeight: 0,
                }}
              >
                {extraTab !== null && renderSlot(extraTab)}
              </Box>
            </Box>
          </Box>
        ) : (
          <>
            {/* Bottom panel only (no tabs alongside) */}
            {hasBottom && (
              <Box
                sx={{
                  height: config.bottomHeight,
                  minHeight: "200px",
                  flexShrink: 0,
                  overflowY: "auto",
                  borderTop: `1px solid ${tokens.ui.border}`,
                  background: backgrounds.parchmentPanelTinted,
                }}
              >
                {renderSlot(config.bottom)}
              </Box>
            )}

            {/* Tab extras strip (collapse drawer — non-actions phases) */}
            {hasExtras && (
              <Box sx={{ flexShrink: 0 }}>
                <Collapse in={extraTab !== null} unmountOnExit>
                  <Box
                    sx={{
                      height: "35vh",
                      overflowY: "auto",
                      borderTop: `1px solid ${tokens.ui.border}`,
                      background: backgrounds.parchmentPanelTinted,
                    }}
                  >
                    {extraTab !== null && renderSlot(extraTab)}
                  </Box>
                </Collapse>

                <IconTabStrip
                  tabs={config.tabExtras}
                  activeTab={extraTab}
                  onTabClick={(slot) => setExtraTab(prev => (prev === slot ? null : slot))}
                />
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Floating / dialog children */}
      {children}
    </Box>
  );
};
