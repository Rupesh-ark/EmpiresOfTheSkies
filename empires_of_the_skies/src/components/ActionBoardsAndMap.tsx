import React, { lazy, Suspense, useCallback, useState } from "react";

import { MyGameProps } from "@eots/game";
const ActionBoard = lazy(() => import("./ActionBoard/ActionBoard").then(m => ({ default: m.ActionBoard })));
const WorldMap = lazy(() => import("./WorldMap/WorldMap"));
const PlayerBoard = lazy(() => import("./PlayerBoard/PlayerBoard").then(m => ({ default: m.PlayerBoard })));
const Chat = lazy(() => import("./Chat/Chat"));
const Trade = lazy(() => import("./Trade/Trade"));

import { Box, ThemeProvider } from "@mui/material";
import { DialogRouter } from "./DialogRouter";
import { MapOverlay } from "./layout/MapOverlay";

import { useGameTheme } from "@/theme";
import GameLog from "./GameLog";
import { StatsPanel } from "./Stats/StatsPanel";
import { ToastProvider } from "@/hooks/useToast";
import { useValidatedMoves } from "@/hooks/useValidatedMoves";
import { ActionHoverProvider } from "./ActionBoard/ActionHoverContext";
import { ActionInfoPanel } from "./ActionBoard/ActionInfoPanel";

import { GameLayout } from "./layout";
import type { PanelSlot, MapSize } from "./layout";

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

      case "action-info":
        return <ActionInfoPanel />;

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
          >
            <DialogRouter {...validatedProps} />
          </GameLayout>
        </Box>
      </ActionHoverProvider>
    </ThemeProvider>
  );
};
