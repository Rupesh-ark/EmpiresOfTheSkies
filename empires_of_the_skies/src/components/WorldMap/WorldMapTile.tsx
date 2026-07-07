import { memo, useState, useRef, useCallback, useEffect } from "react";
import { keyframes } from "@emotion/react";

import ReactCardFlip from "react-card-flip";
import { useLongPress } from "use-long-press";
import { useDroppable } from "@dnd-kit/core";
import { MyGameProps } from "@eots/game";
import { Box, Button, Dialog, DialogContent, DialogTitle, IconButton, Tooltip, Typography } from "@mui/material";
import { Close } from "@mui/icons-material";
import { ThemeProvider } from "@mui/material/styles";
import { baseTheme, backgrounds } from "@/theme";
import ColonyIcon from "../Icons/ColonyIcon";
import OutpostIcon from "../Icons/OutpostIcon";
import FortIcon from "../Icons/FortIcon";
import FleetIcon from "../Icons/FleetIcon";
import svgNameToElementMap from "./nameToElementMap";
import { getLocationPresentation } from "@/utils/locationLabels";
import FleetTransferDialog from "./FleetTransferDialog";
import { GiCrossedSwords, GiZeppelin } from "react-icons/gi";
import { TileDetailContent, DraggableFleetIcon } from "./tiles";

// Kingdom fleet positions on Home Waters tile
const KINGDOM_POSITIONS: Record<string, { top: string; left: string }[]> = {
  Angland:     [{ top: "8%",  left: "14%" }, { top: "8%",  left: "28%" }, { top: "22%", left: "14%" }],
  Gallois:     [{ top: "36%", left: "14%" }, { top: "36%", left: "28%" }, { top: "50%", left: "14%" }],
  Castillia:   [{ top: "64%", left: "10%" }, { top: "64%", left: "24%" }, { top: "78%", left: "10%" }],
  Normark:    [{ top: "8%",  left: "68%" }, { top: "8%",  left: "82%" }, { top: "22%", left: "68%" }],
  Ostreich:    [{ top: "36%", left: "72%" }, { top: "36%", left: "86%" }, { top: "50%", left: "72%" }],
  Constantium: [{ top: "64%", left: "68%" }, { top: "64%", left: "82%" }, { top: "78%", left: "68%" }],
};

const TILE_SLOTS = [
  { top: "35%", left: "35%" }, { top: "35%", left: "55%" }, { top: "55%", left: "35%" },
  { top: "55%", left: "55%" }, { top: "25%", left: "45%" }, { top: "65%", left: "45%" },
  { top: "45%", left: "20%" }, { top: "45%", left: "70%" }, { top: "15%", left: "30%" },
  { top: "15%", left: "60%" }, { top: "75%", left: "30%" }, { top: "75%", left: "60%" },
  { top: "25%", left: "15%" }, { top: "25%", left: "75%" }, { top: "65%", left: "15%" },
  { top: "65%", left: "75%" }, { top: "45%", left: "45%" }, { top: "10%", left: "45%" },
];

// Type definitions
interface PositionedFleet {
  key: string;
  position: { top: string; left: string };
  element: JSX.Element;
}

interface worldMapTileProps extends MyGameProps {
  location: number[];
  alternateOnClick?: (coords: number[]) => void;
  selectable?: boolean;
  /** Tile currently chosen in map-selection mode */
  selectionHighlight?: boolean;
  battleHighlight?: boolean;
  detailRequestKey?: number;
  onDetailRequestHandled?: (requestKey: number) => void;
  fleetDragState?: {
    sourceLocation: [number, number];
    fleetId: number;
    validDestinations: [number, number][];
    costMap: Map<string, number>;
  } | null;
  onFleetDragAttempt?: (reason: string) => void;
}

// Main component
export const WorldMapTile = memo((props: worldMapTileProps) => {
  const xPosition = useRef(0);
  const yPosition = useRef(0);
  const longPressCallback = useCallback(() => {}, []);
  const [xLocation, yLocation] = props.location;
  const fort = props.G.mapState.buildings[yLocation][xLocation].fort;
  const fortColour = props.G.mapState.buildings[yLocation][xLocation].player?.colour;

  const building = () => {
    const currentRegion = props.G.mapState.buildings[yLocation][xLocation];
    const currentBuilding = currentRegion.buildings;
    let icon;
    if (currentBuilding === "colony") {
      icon = (
        <ColonyIcon
          colour={fortColour ?? props.G.playerInfo[props.ctx.currentPlayer].colour}
          regiments={currentRegion.garrisonedRegiments}
          levies={currentRegion.garrisonedLevies}
        />
      );
    } else if (currentBuilding === "outpost") {
      icon = (
        <OutpostIcon
          colour={fortColour ?? props.G.playerInfo[props.ctx.currentPlayer].colour}
          regiments={currentRegion.garrisonedRegiments}
          levies={currentRegion.garrisonedLevies}
        />
      );
    }
    return icon;
  };

  const myPlayerID = props.playerID ?? props.ctx.currentPlayer;
  const myPlayerInfo = props.G.playerInfo[myPlayerID];
  const isActionsPhase = props.G.stage.phase === "actions";
  const isMyTurn = props.ctx.currentPlayer === myPlayerID;
  const isHomeWaters = xLocation === 4 && yLocation === 0;

  // Position fleets on tile
  const positionedFleets: PositionedFleet[] = [];
  let slotIdx = 0;

  Object.entries(props.G.playerInfo).forEach(([playerId, playerInfo]) => {
    const playerFleetsHere = playerInfo.fleetInfo.filter(
      (f) => f.location[0] === xLocation && f.location[1] === yLocation && f.skyships > 0
    );
    if (playerFleetsHere.length === 0) return;

    const isMyFleet = playerId === myPlayerID;
    const kingdomName = playerInfo.kingdomName;
    const kingdomSlots = isHomeWaters && kingdomName ? KINGDOM_POSITIONS[kingdomName] : null;

    playerFleetsHere.forEach((fleet, fleetIdx) => {
      const draggableId = `map-fleet-${playerId}-${fleet.fleetId}`;
      const position = kingdomSlots
        ? kingdomSlots[fleetIdx % kingdomSlots.length]
        : TILE_SLOTS[slotIdx % TILE_SLOTS.length];
      if (!kingdomSlots) slotIdx++;

      const canDrag =
        isActionsPhase &&
        isMyTurn &&
        isMyFleet &&
        fleet.skyships > 0 &&
        !fleet.dispatchedThisRound;

      let element: JSX.Element;
      if (isMyFleet && !canDrag) {
        const getReason = (): string => {
          if (!isActionsPhase) return "Can only deploy during the Actions phase";
          if (!isMyTurn) return "It's not your turn";
          if (fleet.dispatchedThisRound) return "This fleet has already been dispatched this round";
          if (fleet.skyships === 0) return "Fleet has no skyships";
          return "Cannot deploy right now";
        };
        element = (
          <Box onClick={(e) => { e.stopPropagation(); props.onFleetDragAttempt?.(getReason()); }} sx={{ cursor: "not-allowed" }}>
            <FleetIcon colour={playerInfo.colour} skyships={fleet.skyships} regiments={fleet.regiments} levies={fleet.levies} compact={isHomeWaters} />
          </Box>
        );
      } else if (canDrag) {
        element = (
          <DraggableFleetIcon
            draggableId={draggableId}
            colour={playerInfo.colour}
            skyships={fleet.skyships}
            regiments={fleet.regiments}
            levies={fleet.levies}
            compact={isHomeWaters}
          />
        );
      } else {
        element = (
          <FleetIcon colour={playerInfo.colour} skyships={fleet.skyships} regiments={fleet.regiments} levies={fleet.levies} compact={isHomeWaters} />
        );
      }

      positionedFleets.push({ key: draggableId, position, element });
    });
  });

  // Tile data
  const currentTile = props.G.mapState.currentTileArray[yLocation][xLocation];

  // Event handlers
  const longPressEvent = useLongPress(longPressCallback, {
    cancelOnMovement: true,
    cancelOutsideElement: true,
    threshold: 150,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onStart: useCallback((event: any) => {
      xPosition.current = event.clientX;
      yPosition.current = event.clientY;
    }, []),
  });
  const bind = longPressEvent("test context");

  const discoveredTile = props.G.mapState.discoveredTiles[yLocation][xLocation];
  const [flip, setFlip] = useState(discoveredTile);
  useEffect(() => {
    setFlip(discoveredTile);
  }, [discoveredTile]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [fleetTransferOpen, setFleetTransferOpen] = useState(false);

  const myFleetsHere = myPlayerInfo
    ? myPlayerInfo.fleetInfo.filter((f) => f.location[0] === xLocation && f.location[1] === yLocation)
    : [];
  const isKingdomTile = xLocation === 4 && yLocation === 0;
  const buildingHere = props.G.mapState.buildings[yLocation]?.[xLocation];
  const myBuildingHere = buildingHere?.player?.id === myPlayerID && (buildingHere.buildings === "outpost" || buildingHere.buildings === "colony");
  const showManageFleets = myFleetsHere.length >= 2 || (myFleetsHere.length >= 1 && (isKingdomTile || myBuildingHere));

  // Droppable zone
  const droppableId = `map-tile-${xLocation}-${yLocation}`;
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: droppableId });

  const isDragActive = !!props.fleetDragState;
  const isSourceTile = isDragActive &&
    props.fleetDragState!.sourceLocation[0] === xLocation &&
    props.fleetDragState!.sourceLocation[1] === yLocation;
  const isValidDest = isDragActive && !isSourceTile &&
    props.fleetDragState!.validDestinations.some(([x, y]) => x === xLocation && y === yLocation);
  const tileKey = `${xLocation},${yLocation}`;
  const tileCost = isDragActive ? props.fleetDragState!.costMap.get(tileKey) : undefined;
  const isInvalidTile = isDragActive && !isSourceTile && !isValidDest && flip;

  const locationPresentation = getLocationPresentation(props.G.mapState.currentTileArray, [xLocation, yLocation]);
  const canShowDetail = flip;

  const altOnClick = () => {
    if (props.alternateOnClick) {
      props.alternateOnClick([xLocation, yLocation]);
    }
  };

  const { detailRequestKey, onDetailRequestHandled } = props;
  useEffect(() => {
    if (detailRequestKey !== undefined && flip) {
      setDetailOpen(true);
      onDetailRequestHandled?.(detailRequestKey);
    }
  }, [flip, detailRequestKey, onDetailRequestHandled]);

  // Render
  return (
    <ReactCardFlip isFlipped={flip} key={props.location.toString()}>
      {/* Back (fog tile) */}
      <Button
        value={currentTile.name}
        sx={{
          background: `
            radial-gradient(ellipse 55% 50% at 35% 55%, rgba(160,140,100,0.2) 0%, transparent 100%),
            radial-gradient(ellipse 40% 45% at 65% 40%, rgba(140,125,90,0.15) 0%, transparent 100%),
            linear-gradient(180deg, rgba(46,85,112,0.4) 0%, rgba(58,112,144,0.35) 40%, rgba(45,101,133,0.4) 70%, rgba(40,85,117,0.45) 100%),
            ${backgrounds.mapFog}
          `,
          width: "100%",
          aspectRatio: "1",
          borderRadius: 0,
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          transition: "all 0.3s ease",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: "-30%",
            background: `
              radial-gradient(ellipse 40% 35% at 25% 45%, rgba(160,180,200,0.18) 0%, transparent 100%),
              radial-gradient(ellipse 35% 30% at 70% 55%, rgba(160,180,200,0.14) 0%, transparent 100%),
              radial-gradient(ellipse 45% 25% at 50% 75%, rgba(160,180,200,0.12) 0%, transparent 100%)
            `,
            filter: "blur(8px)",
            animation: `${keyframes`
              0%   { transform: translateX(-5%) translateY(0); }
              50%  { transform: translateX(5%) translateY(-3%); }
              100% { transform: translateX(-5%) translateY(0); }
            `} 10s ease-in-out infinite`,
          },
          "&::after": {
            content: '""',
            position: "absolute",
            inset: "-30%",
            background: `
              radial-gradient(ellipse 35% 40% at 60% 35%, rgba(160,180,200,0.12) 0%, transparent 100%),
              radial-gradient(ellipse 40% 30% at 30% 65%, rgba(160,180,200,0.10) 0%, transparent 100%)
            `,
            filter: "blur(10px)",
            animation: `${keyframes`
              0%   { transform: translateX(4%) translateY(-2%); }
              50%  { transform: translateX(-4%) translateY(2%); }
              100% { transform: translateX(4%) translateY(-2%); }
            `} 14s ease-in-out infinite`,
          },
          "&:hover": {
            outline: "2px solid rgba(232,184,75,0.9)",
            outlineOffset: "-2px",
            boxShadow: "inset 0 0 18px rgba(232,184,75,0.35), 0 0 10px rgba(232,184,75,0.45)",
            "&::before, &::after": { animationPlayState: "paused", opacity: 0.25 },
          },
        }}
        onClick={
          !props.alternateOnClick
            ? (event) => {
                if (Math.abs(event.clientX - xPosition.current) < 10 && Math.abs(event.clientY - yPosition.current) < 10) {
                  props.moves.discoverTile([xLocation, yLocation]);
                }
              }
            : () => {}
        }
        {...bind}
      >
        <Box sx={{ position: "relative", zIndex: 1, width: 6, height: 6, borderRadius: "50%", backgroundColor: "rgba(140,160,180,0.25)", boxShadow: "0 0 8px rgba(140,160,180,0.15)" }} />
      </Button>

      {/* Front (revealed tile) */}
      <ThemeProvider theme={baseTheme}>
        <Button
          ref={setDroppableRef}
          className="front"
          sx={{
            backgroundColor: currentTile.type === "ocean" ? "#009EE3" : currentTile.type === "legend" ? "#2a1a4a" : "#3a7a4a",
            backgroundImage: `url(${svgNameToElementMap[currentTile.name]})`,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            width: "100%",
            aspectRatio: "1",
            border: props.selectionHighlight ? "5px solid #4ade80" : props.selectable ? "5px solid #ffe066" : props.battleHighlight ? "3px solid #ef4444" : isDragActive && isValidDest ? `3px solid rgba(232,184,75,${isOver ? 1 : 0.7})` : "0px",
            borderRadius: 0,
            ...(props.selectionHighlight && {
              boxShadow: "0 0 16px rgba(74,222,128,0.7), inset 0 0 12px rgba(74,222,128,0.3)",
            }),
            ...(props.battleHighlight && {
              boxShadow: "0 0 12px rgba(239,68,68,0.5)",
              "@keyframes battlePulse": { "0%, 100%": { boxShadow: "0 0 8px rgba(239,68,68,0.3)" }, "50%": { boxShadow: "0 0 20px rgba(239,68,68,0.6)" } },
              animation: "battlePulse 2s ease-in-out infinite",
            }),
            ...(isDragActive && isValidDest && {
              boxShadow: isOver ? "0 0 20px rgba(232,184,75,0.8)" : "0 0 10px rgba(232,184,75,0.4)",
            }),
          }}
          onClick={props.selectable ? altOnClick : canShowDetail ? () => setDetailOpen(true) : undefined}
        >
          {building()}
          {fort.length > 0 ? <Box sx={{ position: "absolute", bottom: 2, right: 2, width: 16, height: 8, zIndex: 10 }}><FortIcon colour={fortColour ?? "white"} /></Box> : null}

          {/* Infidel Fleet icon */}
          {props.G.infidelFleet?.active && !props.G.infidelFleet.destroyed &&
            props.G.infidelFleet.location[0] === xLocation && props.G.infidelFleet.location[1] === yLocation && (
              <Tooltip title={`Infidel Fleet — ${props.G.infidelFleet.counter.swords}⚔ ${props.G.infidelFleet.counter.shields}🛡`}>
                <Box sx={{
                  position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                  width: 24, height: 24, borderRadius: "50%",
                  backgroundColor: "rgba(139,0,0,0.9)",
                  border: "2px solid rgba(255,100,100,0.8)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  zIndex: 99, boxShadow: "0 0 8px rgba(139,0,0,0.5)",
                  "@keyframes infidelPulse": { "0%, 100%": { boxShadow: "0 0 6px rgba(139,0,0,0.4)" }, "50%": { boxShadow: "0 0 14px rgba(139,0,0,0.7)" } },
                  animation: "infidelPulse 2s ease-in-out infinite",
                }}>
                  <GiCrossedSwords size={12} style={{ color: "#fff" }} />
                </Box>
              </Tooltip>
            )
          }

          {/* Positioned fleets */}
          {positionedFleets.map((pf) => (
            <Box key={pf.key} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} sx={{
              position: "absolute", top: pf.position.top, left: pf.position.left,
              zIndex: 100, transform: "translate(-50%, -50%)",
            }}>
              {pf.element}
            </Box>
          ))}

          {/* Route skyship markers */}
          {(() => {
            const routePlayers = props.G.mapState.routeSkyships[tileKey] ?? [];
            if (routePlayers.length === 0) return null;
            return routePlayers.map((pid, i) => {
              const colour = props.G.playerInfo[pid]?.colour ?? "#888";
              return (
                <Tooltip
                  key={`route-${pid}`}
                  title={`Trade Route skyship — ${props.G.playerInfo[pid]?.kingdomName}. Links this square in a chain from a Land back to Faithdom.`}
                >
                  <Box sx={{
                    position: "absolute",
                    bottom: 3 + i * 18,
                    left: 3,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    backgroundColor: colour,
                    border: "1.5px solid rgba(255,255,255,0.9)",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 90,
                    pointerEvents: "auto",
                  }}>
                    <GiZeppelin size={11} style={{ color: "#fff" }} />
                  </Box>
                </Tooltip>
              );
            });
          })()}

          {/* Invalid tile overlay */}
          {isInvalidTile && <Box sx={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.3)", zIndex: 5, pointerEvents: "none" }} />}

          {/* Cost badge */}
          {isDragActive && isValidDest && tileCost !== undefined && (
            <Box sx={{
              position: "absolute", top: 4, right: 4, px: "6px", py: "2px",
              borderRadius: "8px", backgroundColor: "rgba(232,184,75,0.9)",
              fontSize: 10, fontWeight: 800, color: "#2a1a00",
              zIndex: 10, pointerEvents: "none", lineHeight: 1.4,
            }}>
              {tileCost}g
            </Box>
          )}

          {/* Infidel host gathering badge */}
          {xLocation === 4 && yLocation === 1 && props.G.accumulatedHosts.length > 0 && (
            <Box sx={{
              position: "absolute", bottom: 4, left: 4, display: "flex", alignItems: "center", gap: "3px",
              px: "5px", py: "2px", borderRadius: "4px",
              backgroundColor: "rgba(139,0,0,0.85)",
              border: "1px solid rgba(255,100,100,0.4)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.5)", pointerEvents: "none",
            }}>
              <Typography sx={{ fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
                ⚔ {props.G.accumulatedHosts.reduce((sum, h) => sum + h.swords, 0)}
              </Typography>
              <Typography sx={{ fontFamily: "Inter, sans-serif", fontSize: 9, color: "rgba(255,200,200,0.8)", lineHeight: 1 }}>
                ({props.G.accumulatedHosts.length})
              </Typography>
            </Box>
          )}
        </Button>

        {/* Detail Dialog */}
        <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm">
          <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 0 }}>
            <Box sx={{ pr: 1 }}>
              <Typography sx={{ fontWeight: 800 }}>{locationPresentation.name}</Typography>
              <Typography sx={{ fontSize: "0.82rem", color: "rgba(0,0,0,0.62)" }}>{locationPresentation.reference}</Typography>
            </Box>
            <IconButton size="small" onClick={() => setDetailOpen(false)}><Close /></IconButton>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Box sx={{ width: 240, height: 240, flexShrink: 0, borderRadius: 1, backgroundColor: "rgba(0,0,0,0.03)", overflow: "hidden" }}>
                <Box component="img" src={svgNameToElementMap[currentTile.name]} alt={locationPresentation.name} sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <TileDetailContent tile={currentTile} G={props.G} location={[xLocation, yLocation]} />
                {showManageFleets && (
                  <Box sx={{ mt: 1.5 }}>
                    <Button variant="outlined" size="small" startIcon={<GiZeppelin size={16} />} onClick={() => setFleetTransferOpen(true)} sx={{ fontSize: "0.82rem", textTransform: "none" }}>
                      Manage Fleets
                    </Button>
                  </Box>
                )}
              </Box>
            </Box>
          </DialogContent>
        </Dialog>

        {/* Fleet Transfer Dialog */}
        {showManageFleets && myPlayerInfo && (
          <FleetTransferDialog
            open={fleetTransferOpen}
            onClose={() => setFleetTransferOpen(false)}
            location={[xLocation, yLocation]}
            fleets={myFleetsHere}
            reserves={myPlayerInfo.resources}
            isKingdom={isKingdomTile}
            garrison={myBuildingHere ? {
              buildingType: buildingHere.buildings as "outpost" | "colony",
              regiments: buildingHere.garrisonedRegiments,
              levies: buildingHere.garrisonedLevies,
              eliteRegiments: buildingHere.garrisonedEliteRegiments,
            } : null}
            tileArray={props.G.mapState.currentTileArray}
            moves={props.moves}
          />
        )}
      </ThemeProvider>
    </ReactCardFlip>
  );
});
