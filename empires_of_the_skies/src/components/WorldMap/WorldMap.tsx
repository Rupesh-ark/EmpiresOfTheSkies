import { ReactElement, useState, useEffect, useRef, useCallback } from "react";

import { Box, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Typography } from "@mui/material";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { WorldMapTile } from "./WorldMapTile";
import { TradeRouteOverlay } from "./TradeRouteOverlay";
import svgNameToElementMap from "./nameToElementMap";
import { MyGameProps, findPossibleDestinations, phaseGroup } from "@eots/game";
import { tokens } from "@/theme";
import mapFogImg from "@/boards_and_assets/textures/map_fog.webp";
import FleetIcon from "@/components/Icons/FleetIcon";
import { useToast } from "@/hooks/useToast";
import { getLocationPresentation } from "@/utils/locationLabels";
import { GameButton } from "@/components/atoms/GameButton";
import { useMapSelection } from "@/contexts/MapSelectionContext";
import { buildMovementCostMap } from "@/utils/gameHelpers";
import type { FleetDragState } from "./fleetDragTypes";

const BATTLE_RESOLUTION_SUBS = new Set([
  "aerial_attack_or_pass", "aerial_attack_or_evade", "aerial_resolve",
  "ground_attack_or_pass", "ground_defend_or_yield", "ground_resolve",
  "plunder_legends", "conquest", "conquest_draw_or_pick", "conquest_garrison",
  "relocate_loser",
]);

/** Ghost GameButtons are styled for parchment; the floating pill is dark. */
const ZOOM_BUTTON_SX = {
  minWidth: 22,
  color: "#E8C860",
  borderColor: "transparent",
  "&:hover": { color: "#F5ECD8", borderColor: "rgba(232,200,96,0.5)" },
} as const;

interface PendingDeploy {
  fleetIndex: number;
  destination: number[];
  cost: number;
}

/** Scroll offset that centres `centerPx` (grid coords) in the viewport,
 *  accounting for the grid being auto-margin-centred when it fits. */
const clampScrollCenter = (
  scrollSize: number,
  clientSize: number,
  gridSize: number,
  centerPx: number
): number => {
  const gridStart = Math.max(0, (scrollSize - gridSize) / 2);
  return Math.max(0, Math.min(scrollSize - clientSize, gridStart + centerPx - clientSize / 2));
};

const WorldMap = (props: WorldMapProps) => {
  const currentMap = props.G.mapState.currentTileArray;
  const battleCoords = props.G.mapState.currentBattle;
  const isBattlePhase = phaseGroup(props.ctx.phase!) === "resolution" &&
    BATTLE_RESOLUTION_SUBS.has(props.G.step);
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

  const [zoomLevel, setZoomLevel] = useState(75);
  const [showHint, setShowHint] = useState(true);

  // Controls hint fades out after a few seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  // Tile art is kept off undiscovered tiles (it leaked the board), so warm the
  // whole set here instead — the set carries no positional information.
  useEffect(() => {
    for (const src of Object.values(svgNameToElementMap)) {
      const img = new Image();
      img.src = src;
    }
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Fit the camera to the discovered portion of the map once, on mount.
  // After that the camera belongs to the player — zoom and scroll are
  // never changed automatically (no resets on phase/turn changes).
  const didInitialFit = useRef(false);
  useEffect(() => {
    if (didInitialFit.current) return;
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    didInitialFit.current = true;

    const discovered = props.G.mapState.discoveredTiles;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let y = 0; y < discovered.length; y++) {
      for (let x = 0; x < discovered[y].length; x++) {
        if (!discovered[y][x]) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    if (!isFinite(minX)) return;

    const cols = discovered[0].length;
    const rows = discovered.length;
    const boxCols = maxX - minX + 1;
    const boxRows = maxY - minY + 1;
    // Largest square tile edge that fits the discovered box in the viewport
    // (with a 10% margin), expressed back as the `${zoom}%` grid width.
    const tileEdge = Math.min(
      (el.clientWidth * 0.9) / boxCols,
      (el.clientHeight * 0.9) / boxRows
    );
    const zoom = Math.max(50, Math.min(200, Math.round((tileEdge * cols * 100) / el.clientWidth)));
    setZoomLevel(zoom);

    // Center the discovered box after the new grid width has laid out.
    requestAnimationFrame(() => {
      const tile = (zoom / 100) * el.clientWidth / cols;
      el.scrollLeft = clampScrollCenter(el.scrollWidth, el.clientWidth, tile * cols, ((minX + maxX + 1) / 2) * tile);
      el.scrollTop = clampScrollCenter(el.scrollHeight, el.clientHeight, tile * rows, ((minY + maxY + 1) / 2) * tile);
    });
  }, [props.G.mapState.discoveredTiles]);

  // Zoom is a share of the CONTAINER, so the grid rescales itself whenever the
  // frame changes the map's box. All this does is keep the camera pointed at
  // the same place across that resize — the player's zoom is never touched.
  const camera = useRef({ fx: 0.5, fy: 0.5 });
  const rememberCamera = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.scrollWidth === 0 || el.scrollHeight === 0) return;
    camera.current = {
      fx: (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth,
      fy: (el.scrollTop + el.clientHeight / 2) / el.scrollHeight,
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const { fx, fy } = camera.current;
        el.scrollLeft = Math.max(0, fx * el.scrollWidth - el.clientWidth / 2);
        el.scrollTop = Math.max(0, fy * el.scrollHeight - el.clientHeight / 2);
      });
    });
    observer.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  // Pan the camera to the battle tile whenever a battle sequence begins, so
  // the non-modal combat prompts always have their subject on screen. One
  // smooth pan per battle location — the camera is the player's afterwards.
  const zoomRef = useRef(zoomLevel);
  zoomRef.current = zoomLevel;
  const battleKey =
    isBattlePhase && battleCoords?.length === 2 ? `${battleCoords[0]},${battleCoords[1]}` : null;
  useEffect(() => {
    if (!battleKey) return;
    const el = scrollRef.current;
    if (!el) return;
    const [bx, by] = battleKey.split(",").map(Number);
    const cols = props.G.mapState.discoveredTiles[0].length;
    const rows = props.G.mapState.discoveredTiles.length;
    // Container-relative, matching the grid's own sizing — window width
    // overshoots now that the rail and action column take a third of it.
    const tile = (zoomRef.current / 100) * el.clientWidth / cols;
    el.scrollTo({
      left: clampScrollCenter(el.scrollWidth, el.clientWidth, tile * cols, (bx + 0.5) * tile),
      top: clampScrollCenter(el.scrollHeight, el.clientHeight, tile * rows, (by + 0.5) * tile),
      behavior: "smooth",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pan once per battle location
  }, [battleKey]);

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
    const destinationGroups = findPossibleDestinations(
      props.G,
      fleet.location,
      !isLaden
    );
    const allDests = destinationGroups[0];
    const costMap = buildMovementCostMap(destinationGroups);

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
      {/* Zoom — floats over the map. Height is the map's scarce axis, so map
          controls live on the map, not in a band above it. */}
      <Box
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 15,
          display: "flex",
          alignItems: "center",
          gap: "2px",
          px: "6px",
          py: "2px",
          borderRadius: `${tokens.radius.md}px`,
          backgroundColor: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          border: "1px solid rgba(200,170,120,0.35)",
        }}
      >
        <GameButton variant="ghost" size="sm" onClick={() => setZoomLevel((z) => Math.max(50, z - 25))} sx={ZOOM_BUTTON_SX}>
          −
        </GameButton>
        <Typography sx={{ fontSize: 12, color: "#F5ECD8", minWidth: 38, textAlign: "center", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {zoomLevel}%
        </Typography>
        <GameButton variant="ghost" size="sm" onClick={() => setZoomLevel((z) => Math.min(300, z + 25))} sx={ZOOM_BUTTON_SX}>
          +
        </GameButton>
      </Box>
      <div
        ref={scrollRef}
        onScroll={rememberCamera}
        onMouseDown={onPanMouseDown}
        onMouseMove={onPanMouseMove}
        onMouseUp={onPanMouseUp}
        onMouseLeave={onPanMouseUp}
        style={{
          overflowX: "auto",
          overflowY: "auto",
          display: "flex",
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
            width: `${zoomLevel}%`,
            // Auto margins centre the grid when it fits the viewport and keep
            // every edge scroll-reachable when it overflows (flex justify-content
            // centring would clip the left edge).
            m: "auto",
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

          {/* Trade routes, drawn over the terrain but under fleets and badges */}
          <TradeRouteOverlay
            G={props.G}
            playerID={props.playerID}
            cols={currentMap[0].length}
            rows={currentMap.length}
            preview={mapSelection.preview}
          />

          {/* Pan overlay — blocks tile clicks while Space is held */}
          {isPanningState && (
            <Box sx={{ position: "absolute", inset: 0, zIndex: 10, cursor: "grab" }} />
          )}

        </Box>
      </div>

      {/* Map hint — fades out after a few seconds */}
      {(
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
          <Typography sx={{ fontSize: 12, color: "#fff", fontWeight: 500, whiteSpace: "nowrap", letterSpacing: "0.03em" }}>
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
  detailRequest?: { location: number[]; key: number } | null;
  onDetailRequestHandled?: (requestKey: number) => void;
}

export default WorldMap;
