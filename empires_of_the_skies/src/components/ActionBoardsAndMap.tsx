import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";

import { MyGameProps, EVENT_CARD_DEFS, PlayerInfo } from "@eots/game";
const ActionBoard = lazy(() => import("./ActionBoard/ActionBoard").then(m => ({ default: m.ActionBoard })));
const WorldMap = lazy(() => import("./WorldMap/WorldMap"));
const PlayerBoard = lazy(() => import("./PlayerBoard/PlayerBoard").then(m => ({ default: m.PlayerBoard })));
const Chat = lazy(() => import("./Chat/Chat"));
const Trade = lazy(() => import("./Trade/Trade"));

import { Box, ThemeProvider, Typography, Tooltip } from "@mui/material";
import { DialogRouter } from "./DialogRouter";
import { MapOverlay } from "./layout/MapOverlay";

import { useGameTheme, tokens } from "@/theme";
import GameLog from "./GameLog";
import { StatsPanel } from "./Stats/StatsPanel";
import { ToastProvider, useToast } from "@/hooks/useToast";
import { useValidatedMoves } from "@/hooks/useValidatedMoves";
import { ActionHoverProvider } from "./ActionBoard/ActionHoverContext";

import { GameLayout } from "./layout";
import type { PanelSlot, MapSize } from "./layout";

// ── Compact heresy tracker bar (below map, always visible) ──────────────

const HERESY_POSITIONS = Array.from({ length: 19 }, (_, i) => i - 9);

const HeresyBar = ({ playerInfo }: { playerInfo: Record<string, PlayerInfo> }) => {
  const players = Object.entries(playerInfo) as [string, PlayerInfo][];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      {/* Row 1: Track with labels */}
      <Box sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.sm}px` }}>
        {/* Orthodox label */}
        <Typography sx={{ fontSize: 9, fontFamily: tokens.font.body, fontWeight: 700, color: tokens.allegiance.orthodox, flexShrink: 0, letterSpacing: "0.04em", minWidth: 42 }}>
          Orthodox
        </Typography>

        {/* Track */}
        <Box
          sx={{
            display: "flex",
            flex: 1,
            borderRadius: "3px",
            overflow: "hidden",
            border: `1px solid ${tokens.ui.borderMedium}`,
            height: 18,
          }}
        >
          {HERESY_POSITIONS.map((pos) => {
            const isCenter = pos === 0;
            const isOrthodox = pos < 0;
            const playersHere = players.filter(([, p]) => p.heresyTracker === pos);

            return (
              <Tooltip
                key={pos}
                title={
                  playersHere.length > 0
                    ? playersHere.map(([, p]) => `${p.kingdomName} (${p.hereticOrOrthodox})`).join(", ")
                    : `Position ${pos > 0 ? "+" : ""}${pos}`
                }
                placement="top"
                arrow
              >
                <Box
                  sx={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isCenter
                      ? tokens.ui.surfaceHover
                      : isOrthodox
                        ? `${tokens.allegiance.orthodox}${Math.round(8 + Math.abs(pos) * 2).toString(16).padStart(2, "0")}`
                        : `${tokens.allegiance.heresy}${Math.round(8 + Math.abs(pos) * 2).toString(16).padStart(2, "0")}`,
                    borderRight: `1px solid ${tokens.ui.border}`,
                    "&:last-child": { borderRight: "none" },
                  }}
                >
                  {playersHere.map(([id, p], i) => (
                    <Box
                      key={id}
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        backgroundColor: p.colour,
                        border: "1.5px solid rgba(255,255,255,0.5)",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
                        flexShrink: 0,
                        ml: i > 0 ? "-4px" : 0,
                        zIndex: i,
                        position: "relative",
                      }}
                    />
                  ))}
                </Box>
              </Tooltip>
            );
          })}
        </Box>

        {/* Heretic label */}
        <Typography sx={{ fontSize: 9, fontFamily: tokens.font.body, fontWeight: 700, color: tokens.allegiance.heresy, flexShrink: 0, letterSpacing: "0.04em", minWidth: 36, textAlign: "right" }}>
          Heretic
        </Typography>
      </Box>

      {/* Row 2: VP scale labels */}
      <Box sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.sm}px` }}>
        <Box sx={{ minWidth: 42 }} />
        <Box sx={{ display: "flex", flex: 1 }}>
          {HERESY_POSITIONS.map((pos) => (
            <Box key={pos} sx={{ flex: 1, textAlign: "center" }}>
              <Typography sx={{ fontSize: 7, fontFamily: tokens.font.body, color: tokens.ui.textMuted, lineHeight: 1 }}>
                {pos === 0 ? "0" : pos < 0 ? `+${-pos}` : `+${pos}`}
              </Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ minWidth: 36 }} />
      </Box>

      {/* Row 3: Player legend */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: `${tokens.spacing.sm}px`, pl: "50px" }}>
        {players.map(([id, p]) => (
          <Box key={id} sx={{ display: "flex", alignItems: "center", gap: "3px" }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: p.colour,
                border: "1px solid rgba(0,0,0,0.15)",
                flexShrink: 0,
              }}
            />
            <Typography sx={{ fontSize: 9, fontFamily: tokens.font.body, color: tokens.ui.textMuted, lineHeight: 1 }}>
              {p.kingdomName}
            </Typography>
            <Typography sx={{ fontSize: 8, fontFamily: tokens.font.body, color: p.hereticOrOrthodox === "heretic" ? tokens.allegiance.heresy : tokens.allegiance.orthodox, lineHeight: 1, fontWeight: 600 }}>
              {p.hereticOrOrthodox === "heretic" ? "H" : "O"}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export const ActionBoardsAndMap = (props: MyGameProps) => {
  return (
    <ToastProvider>
      <ActionBoardsAndMapInner {...props} />
    </ToastProvider>
  );
};

const ActionBoardsAndMapInner = (props: MyGameProps) => {
  const validatedMoves = useValidatedMoves(props);
  const validatedProps = { ...props, moves: validatedMoves };
  const theme = useGameTheme(props.G.stage);
  const { showToast } = useToast();

  // ── Discovery toast: show tile flips + heresy changes ────────
  const prevLogLen = useRef(props.G.gameLog.length);
  useEffect(() => {
    const logLen = props.G.gameLog.length;
    const isDiscovery = props.ctx.phase === "discovery";
    const isMyTurn = props.ctx.currentPlayer === props.playerID;

    if (isDiscovery && logLen > prevLogLen.current) {
      const latest = props.G.gameLog[logLen - 1];
      if (latest) {
        const heresyAdvanced = latest.message.includes("heresy advances");
        if (heresyAdvanced) {
          // Show heresy summary to ALL players
          const summary = Object.values(props.G.playerInfo)
            .map(p => `${p.kingdomName}: ${p.heresyTracker}`)
            .join(" · ");
          showToast(`${latest.message}\nHeresy: ${summary}`, "warning");
        } else if (!isMyTurn) {
          // Normal tile flip — only show to non-active players
          showToast(latest.message, "info");
        }
      }
    }
    prevLogLen.current = logLen;
  }, [props.G.gameLog.length, props.ctx.phase, props.ctx.currentPlayer, props.playerID, props.G.playerInfo, showToast]);

  // ── Event toast: notify all players when an event card is resolved ──
  const prevResolvedEvent = useRef(props.G.eventState.resolvedEvent);
  useEffect(() => {
    const resolved = props.G.eventState.resolvedEvent;
    if (resolved && resolved !== prevResolvedEvent.current) {
      const def = EVENT_CARD_DEFS[resolved];
      if (def) {
        showToast(`Event: ${def.displayName} — ${def.description}`, "warning");
      }
    }
    prevResolvedEvent.current = resolved;
  }, [props.G.eventState.resolvedEvent, showToast]);

  const [mapDetailRequest, setMapDetailRequest] = useState<{
    location: number[];
    key: number;
  } | null>(null);

  const openMapAtLocation = useCallback((location: number[]) => {
    setMapDetailRequest((prev) => ({
      location: [...location],
      key: (prev?.key ?? 0) + 1,
    }));
  }, []);

  // ── Slot renderer — maps slot names to components ──────────────

  const renderSlot = useCallback((slot: PanelSlot): React.ReactNode => {
    switch (slot) {
      case "player-board":
        return (
          <Suspense fallback={null}>
            <PlayerBoard {...validatedProps} onOpenFleetLocation={openMapAtLocation} />
          </Suspense>
        );

      case "action-board":
        return (
          <Suspense fallback={null}>
            <ActionBoard {...validatedProps} />
          </Suspense>
        );

      case "game-log":
        return <GameLog {...validatedProps} />;

      case "stats":
        return <StatsPanel {...validatedProps} />;

      case "chat":
        return (
          <Suspense fallback={null}>
            <Chat {...validatedProps} />
          </Suspense>
        );

      case "trade":
        return (
          <Suspense fallback={null}>
            <Trade {...validatedProps} />
          </Suspense>
        );

      default:
        return null;
    }
  }, [validatedProps, openMapAtLocation]);

  // ── Map renderer ───────────────────────────────────────────────

  const renderMap = useCallback((_size: MapSize): React.ReactNode => {
    return (
      <>
        <Suspense fallback={null}>
          <WorldMap
            {...validatedProps}
            detailRequest={mapDetailRequest}
            onDetailRequestHandled={(requestKey) => {
              setMapDetailRequest((current) =>
                current?.key === requestKey ? null : current
              );
            }}
          />
        </Suspense>
        <MapOverlay {...validatedProps} />
      </>
    );
  }, [validatedProps, mapDetailRequest]);

  // ── Render ─────────────────────────────────────────────────────

  return (
    <ThemeProvider theme={theme}>
      <ActionHoverProvider>
        <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
          <GameLayout
            phase={props.ctx.phase ?? ""}
            stage={props.G.stage}
            isMyTurn={props.ctx.currentPlayer === props.playerID}
            renderSlot={renderSlot}
            renderMap={renderMap}
            heresyTracker={<HeresyBar playerInfo={props.G.playerInfo} />}
          >
            <DialogRouter {...validatedProps} />
          </GameLayout>
        </Box>
      </ActionHoverProvider>
    </ThemeProvider>
  );
};
