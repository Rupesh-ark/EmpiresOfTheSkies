import { ReactElement, useState, useEffect, useRef, useCallback } from "react";

import { Box, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Typography } from "@mui/material";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { WorldMapTile } from "./WorldMapTile";
import { MyGameProps, findPossibleDestinations } from "@eots/game";
import { tokens } from "@/theme";
import mapFogImg from "@/boards_and_assets/textures/map_fog.webp";
import FleetIcon from "@/components/Icons/FleetIcon";
import { useToast } from "@/hooks/useToast";
import { getLocationPresentation } from "@/utils/locationLabels";
import { GameButton } from "@/components/atoms/GameButton";
import { useMapSelection } from "@/contexts/MapSelectionContext";
import type { FleetDragState } from "./fleetDragTypes";

const BATTLE_RESOLUTION_SUBS = new Set([
  "aerial_attack_or_pass", "aerial_attack_or_evade", "aerial_resolve",
  "ground_attack_or_pass", "ground_defend_or_yield", "ground_resolve",
  "plunder_legends", "conquest", "conquest_draw_or_pick", "conquest_garrison",
  "relocate_loser",
]);

interface PendingDeploy {
  fleetIndex: number;
  destination: number[];
  cost: number;
}

const WorldMap = (props: WorldMapProps) => {
  const currentMap = props.G.mapState.currentTileArray;
  const battleCoords = props.G.mapState.currentBattle;
  const isBattlePhase = props.G.stage.phase === "resolution" &&
    BATTLE_RESOLUTION_SUBS.has(props.G.stage.sub);
  const { showToast } = useToast();
  const mapSelection = useMapSelection();

  // Tile-selection mode: explicit props (embedded maps) win; otherwise an
  // active MapSelection request drives which tiles are selectable.
  const selectionTiles =
    props.selectableTiles ?? mapSelection.selection?.tiles;
  const selectionOnClick =
    props.alternateOnClick ??
    (mapSelection.selection ? mapSelection.selectTile : undefined);

  const [fleetDragState, setFleetDragState] = useState<FleetDragState | null>(null);
  const [pendingDeploy, setPendingDeploy] = useState<PendingDeploy | null>(null);
  const isMyTurn = props.playerID === props.ctx.currentPlayer;

  function defaultZoom(phase: string, myTurn: boolean) {
    if (phase === "discoveries") return 50;
    if (phase === "actions" && myTurn) return 150;
    return 75;
  }

  const [zoomLevel, setZoomLevel] = useState(defaultZoom(props.G.stage.phase, isMyTurn));
  const [showHint, setShowHint] = useState(false);

  const prevPhaseRef = useRef(props.G.stage.phase);
  const prevTurnRef = useRef(isMyTurn);
  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    const prevTurn = prevTurnRef.current;
    const currPhase = props.G.stage.phase;
    prevPhaseRef.current = currPhase;
    prevTurnRef.current = isMyTurn;
    if (prevPhase !== currPhase || prevTurn !== isMyTurn) {
      setZoomLevel(defaultZoom(currPhase, isMyTurn));
    }
  }, [props.G.stage.phase, isMyTurn]);

  // Show hint when map expands, auto-hide after 4s
  useEffect(() => {
    if (props.expanded) {
      setShowHint(true);
      const timer = setTimeout(() => setShowHint(false), 4000);
      return () => clearTimeout(timer);
    } else {
      setShowHint(false);
    }
  }, [props.expanded]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const [isPanningState, setIsPanningState] = useState(false);
  const panStart = useRef<{ x: number; y: number; scrollX: number; scrollY: number } | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        isPanningRef.current = true;
        setIsPanningState(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isPanningRef.current = false;
        setIsPanningState(false);
        panStart.current = null;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); };
  }, []);

  const onPanMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isPanningRef.current || !scrollRef.current) return;
    e.preventDefault();
    panStart.current = { x: e.clientX, y: e.clientY, scrollX: scrollRef.current.scrollLeft, scrollY: scrollRef.current.scrollTop };
  }, []);

  const onPanMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanningRef.current || !panStart.current || !scrollRef.current) return;
    e.preventDefault();
    scrollRef.current.scrollLeft = panStart.current.scrollX - (e.clientX - panStart.current.x);
    scrollRef.current.scrollTop = panStart.current.scrollY - (e.clientY - panStart.current.y);
  }, []);

  const onPanMouseUp = useCallback(() => { panStart.current = null; }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    // Format: map-fleet-{playerId}-{fleetId}
    const match = id.match(/^map-fleet-(.+)-(\d+)$/);
    if (!match) return;

    const playerId = match[1];
    const fleetId = parseInt(match[2], 10);

    const playerInfo = props.G.playerInfo[playerId];
    if (!playerInfo) return;

    const fleetIndex = playerInfo.fleetInfo.findIndex((f) => f.fleetId === fleetId);
    if (fleetIndex === -1) return;

    const fleet = playerInfo.fleetInfo[fleetIndex];
    const isLaden = fleet.regiments > 0 || fleet.levies > 0 || fleet.eliteRegiments > 0;
    const [allDests, within1, within2, within3] = findPossibleDestinations(
      props.G,
      fleet.location,
      !isLaden
    );

    const costMap = new Map<string, number>();
    for (const [x, y] of within3) costMap.set(`${x},${y}`, 3);
    for (const [x, y] of within2) costMap.set(`${x},${y}`, 2);
    for (const [x, y] of within1) costMap.set(`${x},${y}`, 1);

    setFleetDragState({
      fleetId,
      playerId,
      fleetIndex,
      sourceLocation: [fleet.location[0], fleet.location[1]] as [number, number],
      validDestinations: allDests,
      costMap,
      isLaden,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { over } = event;
    const state = fleetDragState;
    setFleetDragState(null);

    if (!state || !over) return;

    const tileId = over.id as string;
    const tileMatch = tileId.match(/^map-tile-(\d+)-(\d+)$/);
    if (!tileMatch) return;

    const destX = parseInt(tileMatch[1], 10);
    const destY = parseInt(tileMatch[2], 10);
    const destination = [destX, destY];

    const isValid = state.validDestinations.some(
      ([x, y]) => x === destX && y === destY
    );

    if (!isValid) return;

    const cost = state.costMap.get(`${destX},${destY}`) ?? 1;
    setPendingDeploy({ fleetIndex: state.fleetIndex, destination, cost });
  };

  const myPlayerID = props.playerID ?? props.ctx.currentPlayer;
  const playerInfo = props.G.playerInfo[myPlayerID];

  const handleConfirmDeploy = () => {
    if (!pendingDeploy || !playerInfo) {
      setPendingDeploy(null);
      return;
    }
    const fleet = playerInfo.fleetInfo[pendingDeploy.fleetIndex];
    if (!fleet) {
      setPendingDeploy(null);
      return;
    }

    props.moves.moveFleet(
      pendingDeploy.fleetIndex,
      pendingDeploy.destination
    );
    setPendingDeploy(null);
  };
  const pendingFleet = pendingDeploy
    ? playerInfo?.fleetInfo[pendingDeploy.fleetIndex]
    : null;

  const pendingDestName = pendingDeploy
    ? getLocationPresentation(
        props.G.mapState.currentTileArray,
        pendingDeploy.destination
      )
    : null;

  const tiles: ReactElement[][] = [[], [], [], []];
  for (let y = 0; y < currentMap.length; y++) {
    for (let x = 0; x < currentMap[y].length; x++) {
      const selectable = selectionTiles?.some(
        (coord) => coord[0] === x && coord[1] === y
      ) ?? false;

      const isSelected =
        !props.alternateOnClick &&
        mapSelection.selected?.[0] === x &&
        mapSelection.selected?.[1] === y;

      const isBattleTile = isBattlePhase &&
        battleCoords &&
        battleCoords[0] === x &&
        battleCoords[1] === y;

      const detailRequestKey =
        props.detailRequest &&
        props.detailRequest.location[0] === x &&
        props.detailRequest.location[1] === y
          ? props.detailRequest.key
          : undefined;

      tiles[y].push(
        <Grid
          size={{ lg: 1 }}
          key={`World Map Tile at (${x}, ${y})`}
        >
          <WorldMapTile
            location={[x, y]}
            {...props}
            alternateOnClick={selectionOnClick}
            selectable={selectable}
            selectionHighlight={!!isSelected}
            battleHighlight={!!isBattleTile}
            detailRequestKey={detailRequestKey}
            onDetailRequestHandled={props.onDetailRequestHandled}
            fleetDragState={fleetDragState}
            onFleetDragAttempt={(reason) => showToast(reason, "warning")}
          />
        </Grid>
      );
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Zoom control — only in expanded mode, above the map */}
      {props.expanded && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.5,
            px: 1,
            py: 0,
          }}
        >
          <Typography sx={{ fontSize: 11, color: tokens.ui.textMuted, fontWeight: 600 }}>
            Zoom
          </Typography>
          <GameButton variant="ghost" size="sm" onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}>
            −
          </GameButton>
          <Typography sx={{ fontSize: 11, color: tokens.ui.text, minWidth: 36, textAlign: "center" }}>
            {zoomLevel}%
          </Typography>
          <GameButton variant="ghost" size="sm" onClick={() => setZoomLevel((z) => Math.min(300, z + 25))}>
            +
          </GameButton>
        </Box>
      )}
      <div
        ref={scrollRef}
        onMouseDown={onPanMouseDown}
        onMouseMove={onPanMouseMove}
        onMouseUp={onPanMouseUp}
        onMouseLeave={onPanMouseUp}
        style={{
          overflowX: "auto",
          overflowY: "auto",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          width: "100%",
          height: "100%",
          backgroundImage: `url(${mapFogImg})`,
          backgroundSize: "250px 250px",
          backgroundRepeat: "repeat",
          cursor: isPanningState ? "grab" : "default",
          userSelect: isPanningState ? "none" : "auto",
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: props.expanded ? `${zoomLevel}vw` : "100%",
            maxWidth: props.expanded ? "none" : 1600,
            my: "auto",
            mx: props.expanded ? 0 : "auto",
            flexShrink: 0,
          }}
        >
          <Grid
            container
            spacing={0}
            columns={8}
            sx={{
              width: "100%",
              border: `2px solid rgba(80,60,30,0.4)`,
              borderRadius: "4px",
              overflow: "hidden",
              boxShadow: "0 0 20px rgba(0,0,0,0.2)",
            }}
          >
            {tiles}
          </Grid>

          {/* Pan overlay — blocks tile clicks while Space is held */}
          {isPanningState && (
            <Box sx={{ position: "absolute", inset: 0, zIndex: 10, cursor: "grab" }} />
          )}

        </Box>
      </div>

      {/* Map hint — fades in when expanded, auto-hides */}
      {props.expanded && (
        <Box
          sx={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            px: 2,
            py: 0.75,
            borderRadius: `${tokens.radius.md}px`,
            backgroundColor: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(4px)",
            pointerEvents: "none",
            zIndex: 20,
            opacity: showHint ? 1 : 0,
            transition: "opacity 0.6s ease",
          }}
        >
          <Typography sx={{ fontSize: 11, color: "#fff", fontWeight: 500, whiteSpace: "nowrap", letterSpacing: "0.03em" }}>
            Hold Space + drag to pan &nbsp;·&nbsp; Scroll to navigate &nbsp;·&nbsp; Drag fleet to deploy
          </Typography>
        </Box>
      )}

      {/* DragOverlay — ghost icon while dragging */}
      <DragOverlay>
        {fleetDragState ? (() => {
          const dragPlayer = props.G.playerInfo[fleetDragState.playerId];
          const dragFleet = dragPlayer?.fleetInfo[fleetDragState.fleetIndex];
          if (!dragPlayer || !dragFleet) return null;
          return (
            <Box sx={{ opacity: 0.85, transform: "scale(1.15)", pointerEvents: "none" }}>
              <FleetIcon
                colour={dragPlayer.colour}
                skyships={dragFleet.skyships}
                regiments={dragFleet.regiments}
                levies={dragFleet.levies}
              />
            </Box>
          );
        })() : null}
      </DragOverlay>

      {/* Deploy confirmation dialog */}
      {pendingDeploy && (
        <Dialog
          open
          onClose={() => setPendingDeploy(null)}
          PaperProps={{
            sx: {
              backgroundColor: tokens.ui.surface,
              border: `1px solid ${tokens.ui.borderMedium}`,
              borderRadius: `${tokens.radius.lg}px`,
            },
          }}
        >
          <DialogTitle
            sx={{
              fontFamily: tokens.font.display,
              color: tokens.ui.gold,
              pb: 1,
            }}
          >
            Deploy Fleet?
          </DialogTitle>
          <DialogContent>
            <Typography
              sx={{
                fontFamily: tokens.font.body,
                color: tokens.ui.text,
                fontSize: tokens.fontSize.sm,
              }}
            >
              Deploy Fleet {pendingFleet ? pendingFleet.fleetId + 1 : "?"} to{" "}
              <Box component="span" sx={{ color: tokens.ui.gold, fontWeight: 600 }}>
                {pendingDestName?.fullLabel ?? "unknown"}
              </Box>
              .
            </Typography>
            <Typography
              sx={{
                fontFamily: tokens.font.body,
                color: tokens.ui.textMuted,
                fontSize: tokens.fontSize.sm,
                mt: 0.5,
              }}
            >
              Cost: {pendingDeploy.cost} Gold + 1 Counsellor
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
            <GameButton variant="ghost" onClick={() => setPendingDeploy(null)}>
              Cancel
            </GameButton>
            <GameButton variant="primary" onClick={handleConfirmDeploy}>
              Deploy
            </GameButton>
          </DialogActions>
        </Dialog>
      )}
    </DndContext>
  );
};

interface WorldMapProps extends MyGameProps {
  alternateOnClick?: (coords: number[]) => void;
  selectableTiles?: number[][];
  expanded?: boolean;
  detailRequest?: { location: number[]; key: number } | null;
  onDetailRequestHandled?: (requestKey: number) => void;
}

export default WorldMap;
