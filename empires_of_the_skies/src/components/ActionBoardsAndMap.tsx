import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";

import { MyGameProps, EVENT_CARD_DEFS, phaseGroup } from "@eots/game";
const ActionBoard = lazy(() => import("./ActionBoard/ActionBoard").then(m => ({ default: m.ActionBoard })));
const WorldMap = lazy(() => import("./WorldMap/WorldMap"));
const PlayerDock = lazy(() => import("./PlayerBoard/PlayerDock").then(m => ({ default: m.PlayerDock })));
const Chat = lazy(() => import("./Chat/Chat"));
const Trade = lazy(() => import("./Trade/Trade"));

import { Box, ThemeProvider } from "@mui/material";
import { DialogRouter } from "./DialogRouter";
import { DecisionRouter } from "./DecisionRouter";

import { useGameTheme } from "@/theme";
import GameLog from "./GameLog";
import { StatsPanel } from "./Stats/StatsPanel";
import { ToastProvider, useToast } from "@/hooks/useToast";
import { DialogQueueProvider } from "./atoms/DialogQueue";
import { MapSelectionProvider } from "@/contexts/MapSelectionContext";
import { ActionHoverProvider } from "./ActionBoard/ActionHoverContext";
import { PiracyIntentProvider } from "@/contexts/PiracyIntentContext";

import { GameLayout, TopStrip, PromptBar, OpponentRail } from "./layout";
import type { PanelSlot } from "./layout";

export const ActionBoardsAndMap = (props: MyGameProps) => {
  return (
    <ToastProvider>
      <DialogQueueProvider>
        <MapSelectionProvider>
          <ActionBoardsAndMapInner {...props} />
        </MapSelectionProvider>
      </DialogQueueProvider>
    </ToastProvider>
  );
};

const ActionBoardsAndMapInner = (props: MyGameProps) => {
  const group = phaseGroup(props.ctx.phase!);
  const theme = useGameTheme(group, props.G.step);
  const { showToast } = useToast();

  // Toast the reason whenever one of our actions is rejected.
  const prevActionError = useRef(props.lastActionError);
  useEffect(() => {
    const error = props.lastActionError;
    if (error && error !== prevActionError.current) {
      const message =
        (error.payload as { message?: string } | undefined)?.message ??
        "You can't do that right now";
      showToast(message, "error");
    }
    prevActionError.current = error;
  }, [props.lastActionError, showToast]);

  // Discovery toast: show tile flips + heresy changes
  const prevLogLen = useRef(props.G.gameLog.length);
  useEffect(() => {
    const logLen = props.G.gameLog.length;
    const isDiscovery = phaseGroup(props.ctx.phase!) === "discovery";
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
  }, [props.G.gameLog, props.ctx.phase, props.ctx.currentPlayer, props.playerID, props.G.playerInfo, showToast]);

  // Event toast: notify all players when an event card is resolved
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

  // Rail selection: whose board the dock shows. Null = self.
  const [viewPlayerID, setViewPlayerID] = useState<string | null>(null);
  const dockPlayerID = viewPlayerID ?? props.playerID ?? props.ctx.currentPlayer;
  const handleSelectPlayer = useCallback(
    (id: string) => {
      // Your own chip — or re-clicking the viewed opponent — returns to your board.
      setViewPlayerID((prev) => (id === props.playerID || prev === id ? null : id));
    },
    [props.playerID]
  );

  const renderPanel = useCallback((slot: PanelSlot): React.ReactNode => {
    switch (slot) {
      case "game-log":
        return <GameLog {...props} />;
      case "stats":
        return <StatsPanel {...props} />;
      case "chat":
        return (
          <Suspense fallback={null}>
            <Chat {...props} />
          </Suspense>
        );
      case "trade":
        return (
          <Suspense fallback={null}>
            <Trade {...props} />
          </Suspense>
        );
      default:
        return null;
    }
  }, [props]);

  const renderActionBoard = useCallback((): React.ReactNode => (
    <Suspense fallback={null}>
      <ActionBoard {...props} />
    </Suspense>
  ), [props]);

  const renderMap = useCallback((): React.ReactNode => (
    <Suspense fallback={null}>
      <WorldMap
        {...props}
        detailRequest={mapDetailRequest}
        onDetailRequestHandled={(requestKey) => {
          setMapDetailRequest((current) =>
            current?.key === requestKey ? null : current
          );
        }}
      />
    </Suspense>
  ), [props, mapDetailRequest]);

  const isMyTurn = props.ctx.currentPlayer === props.playerID;
  const actionOverlayActive = group === "actions" && isMyTurn;

  return (
    <ThemeProvider theme={theme}>
      <ActionHoverProvider>
        <PiracyIntentProvider round={props.G.round}>
        <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
          {!props.isConnected && (
            <Box
              sx={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                zIndex: 9999,
                py: 0.5,
                textAlign: "center",
                bgcolor: "#b71c1c",
                color: "#fff",
                fontFamily: "monospace",
                fontSize: "0.8rem",
              }}
            >
              Connection lost — reconnecting...
            </Box>
          )}
          <GameLayout
            group={group}
            step={props.G.step}
            topStrip={<TopStrip {...props} />}
            opponentRail={
              <OpponentRail
                {...props}
                viewPlayerID={dockPlayerID}
                onSelectPlayer={handleSelectPlayer}
              />
            }
            promptBar={<PromptBar {...props} />}
            dock={
              <Suspense fallback={null}>
                <PlayerDock
                  {...props}
                  viewPlayerID={dockPlayerID}
                  onOpenFleetLocation={openMapAtLocation}
                />
              </Suspense>
            }
            actionOverlayActive={actionOverlayActive}
            renderPanel={renderPanel}
            renderActionBoard={renderActionBoard}
            renderMap={renderMap}
            decisionPanel={<DecisionRouter {...props} />}
          >
            <DialogRouter {...props} />
          </GameLayout>
        </Box>
        </PiracyIntentProvider>
      </ActionHoverProvider>
    </ThemeProvider>
  );
};
