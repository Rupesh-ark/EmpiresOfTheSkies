import React, { lazy, Suspense, useCallback, useState } from "react";

import { MyGameProps } from "@eots/game";
const ActionBoard = lazy(() => import("./ActionBoard/ActionBoard").then(m => ({ default: m.ActionBoard })));
const WorldMap = lazy(() => import("./WorldMap/WorldMap"));
const PlayerBoard = lazy(() => import("./PlayerBoard/PlayerBoard").then(m => ({ default: m.PlayerBoard })));
const RulesReference = lazy(() => import("./RulesReference"));
const Chat = lazy(() => import("./Chat/Chat"));
const Trade = lazy(() => import("./Trade/Trade"));

import { Box, ThemeProvider } from "@mui/material";
import ResourceTrackerBar from "./ResourceTrackerBar/ResourceTrackerBar";
import { DialogRouter } from "./DialogRouter";

import PlayerTable from "./PlayerTable/PlayerTable";
import HeresyTracker from "./PlayerTable/HeresyTracker";
import { useGameTheme } from "@/theme";
import { Campaign } from "@mui/icons-material";
import NprKingdomTable from "./PlayerTable/NprKingdomTable";
import GameLog from "./GameLog";
import LootValueTable from "./PlayerTable/LootValueTable";
import { ToastProvider } from "@/hooks/useToast";
import { useValidatedMoves } from "@/hooks/useValidatedMoves";

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

      case "game-log":
        return <GameLog {...validatedProps} />;

      case "stats":
        return (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", gap: 0, px: 2, pt: 1 }}>
            <Box sx={{ maxWidth: 1230, width: "100%", mb: 2 }}>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1,
                  background: "linear-gradient(90deg, #1a0a14 0%, #0d0d0d 50%, #1a0a00 100%)",
                  px: 2,
                  py: 0.75,
                  borderRadius: 2,
                }}
              >
                <Campaign sx={{ color: "#E77B00", fontSize: 18 }} />
                <Box component="span" sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem" }}>Round</Box>
                <Box component="span" sx={{ color: "white", fontWeight: 700, fontSize: "1rem" }}>{props.G.round}</Box>
                <Box component="span" sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>/ {props.G.finalRound}</Box>
              </Box>
            </Box>
            <HeresyTracker {...validatedProps} />
            <PlayerTable {...validatedProps} />
            <NprKingdomTable {...validatedProps} />
            <LootValueTable {...validatedProps} />
          </Box>
        );

      case "rules":
        return (
          <Suspense fallback={null}>
            <RulesReference />
          </Suspense>
        );

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
  }, [validatedProps, openMapAtLocation, props.G.round, props.G.finalRound]);

  // ── Map renderer ───────────────────────────────────────────────

  const renderMap = useCallback((_size: MapSize): React.ReactNode => {
    return (
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
    );
  }, [validatedProps, mapDetailRequest]);

  // ── Render ─────────────────────────────────────────────────────

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <ResourceTrackerBar {...validatedProps} />
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
    </ThemeProvider>
  );
};
