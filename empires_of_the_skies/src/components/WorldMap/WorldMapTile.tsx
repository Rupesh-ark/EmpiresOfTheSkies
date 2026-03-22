import React, { useState, useRef, useCallback, useEffect } from "react";
import { keyframes } from "@emotion/react";

import ReactCardFlip from "react-card-flip";
import { useLongPress } from "use-long-press";
import { MyGameProps } from "@eots/game";
import { Box, Button, Dialog, DialogContent, DialogTitle, IconButton, Typography } from "@mui/material";
import { Close } from "@mui/icons-material";
import { ThemeProvider } from "@mui/material/styles";
import { baseTheme, backgrounds } from "@/theme";
import FortIcon from "../Icons/FortIcon";
import FleetIcon from "../Icons/FleetIcon";
import ColonyIcon from "../Icons/ColonyIcon";
import OutpostIcon from "../Icons/OutpostIcon";
import svgNameToElementMap from "./nameToElementMap";
import { getLocationPresentation } from "@/utils/locationLabels";

//Method for displaying a flippable tile which contains a world map tile image
export const WorldMapTile = (props: worldMapTileProps) => {
  const xPosition = useRef(0);
  const yPosition = useRef(0);
  const longPressCallback = useCallback(() => {}, []);
  const [xLocation, yLocation] = props.location;
  const fort = props.G.mapState.buildings[yLocation][xLocation].fort;

  const fortColour =
    props.G.mapState.buildings[yLocation][xLocation].player?.colour;

  const building = () => {
    const currentRegion = props.G.mapState.buildings[yLocation][xLocation];
    const currentBuilding = currentRegion.buildings;
    let icon;
    if (currentBuilding === "colony") {
      icon = (
        <ColonyIcon
          colour={
            fortColour ?? props.G.playerInfo[props.ctx.currentPlayer].colour
          }
          regiments={currentRegion.garrisonedRegiments}
          levies={currentRegion.garrisonedLevies}
        />
      );
    } else if (currentBuilding === "outpost") {
      icon = (
        <OutpostIcon
          colour={
            fortColour ?? props.G.playerInfo[props.ctx.currentPlayer].colour
          }
          regiments={currentRegion.garrisonedRegiments}
          levies={currentRegion.garrisonedLevies}
        />
      );
    }

    return icon;
  };

  let fleets: JSX.Element[] = [];

  Object.entries(props.G.playerInfo).forEach(([playerId, playerInfo]) => {
    playerInfo.fleetInfo.forEach((fleet) => {
      if (fleet.location[0] === xLocation && fleet.location[1] === yLocation) {
        fleets.push(
          <FleetIcon
            colour={playerInfo.colour}
            skyships={fleet.skyships}
            regiments={fleet.regiments}
            levies={fleet.levies}
          />
        );
      }
    });
  });

  const currentTile = props.G.mapState.currentTileArray[yLocation][xLocation];
  const lootNameMap: Record<string, string> = {
    gold: "Gold",
    mithril: "Mithril",
    dragonScales: "Dragon Scales",
    krakenSkin: "Kraken Skin",
    magicDust: "Magic Dust",
    stickyIchor: "Sticky Ichor",
    pipeweed: "Pipeweed",
    victoryPoints: "Victory Points",
  };
  const outpostLoot = () => {
    let text = "";
    Object.entries(currentTile.loot.outpost).forEach(([key, value]) => {
      if (value > 0) {
        text += `\t\t${lootNameMap[key]}: ${value}\n`;
      }
    });
    return text;
  };

  const colonyLoot = () => {
    let text = "";
    Object.entries(currentTile.loot.colony).forEach(([key, value]) => {
      if (value > 0) {
        text += `\t\t${lootNameMap[key]}: ${value}\n`;
      }
    });
    return text;
  };
  let tooltipText = `Attack: ${currentTile.sword}\n
Defence: ${currentTile.shield}\n
Loot:
\t Outpost:\n ${outpostLoot()}
\t Colony:\n ${colonyLoot()}`;

  const longPressEvent = useLongPress(longPressCallback, {
    cancelOnMovement: true,
    cancelOutsideElement: true,
    threshold: 150,
    onStart: useCallback((event: any) => {
      xPosition.current = event.clientX;
      yPosition.current = event.clientY;
    }, []),
  });

  const bind = longPressEvent("test context");

  const [flip, setFlip] = useState(
    props.G.mapState.discoveredTiles[yLocation][xLocation]
  );
  useEffect(() => {
    setFlip(props.G.mapState.discoveredTiles[yLocation][xLocation]);
  }, [props.G.mapState.discoveredTiles[yLocation][xLocation]]);
  const [detailOpen, setDetailOpen] = useState(false);
  const locationPresentation = getLocationPresentation(props.G.mapState.currentTileArray, [
    xLocation,
    yLocation,
  ]);

  const canShowDetail = flip;

  const altOnClick = () => {
    if (props.alternateOnClick) {
      props.alternateOnClick([xLocation, yLocation]);
    }
  };

  useEffect(() => {
    if (props.detailRequestKey !== undefined && flip) {
      setDetailOpen(true);
      props.onDetailRequestHandled?.(props.detailRequestKey);
    }
  }, [flip, props.detailRequestKey, props.onDetailRequestHandled]);

  return (
    <ReactCardFlip isFlipped={flip} key={props.location.toString()}>
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
          border: "1px solid rgba(80,110,140,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          transition: "all 0.3s ease",
          // Soft drifting fog — large blurred blobs
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
          // Second fog layer — slower, offset
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
            border: "1px solid rgba(232,184,75,0.3)",
            "&::before, &::after": {
              opacity: 0.5,
            },
          },
        }}
        onClick={
          !props.alternateOnClick
            ? (event) => {
                if (
                  Math.abs(event.clientX - xPosition.current) < 10 &&
                  Math.abs(event.clientY - yPosition.current) < 10
                ) {
                  props.moves.discoverTile([xLocation, yLocation]);
                }
              }
            : () => {}
        }
        {...bind}
      >
        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: "rgba(140,160,180,0.25)",
            boxShadow: "0 0 8px rgba(140,160,180,0.15)",
          }}
        />
      </Button>
      <ThemeProvider theme={baseTheme}>
        <Button
          className="front"
          sx={{
            backgroundImage: `url(${svgNameToElementMap[currentTile.name]})`,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            width: "100%",
            aspectRatio: "1",
            border: props.selectable
              ? "5px solid #ffe066"
              : props.battleHighlight
                ? "3px solid #ef4444"
                : "0px",
            borderRadius: 0,
            ...(props.battleHighlight && {
              boxShadow: "0 0 12px rgba(239,68,68,0.5)",
              "@keyframes battlePulse": {
                "0%, 100%": { boxShadow: "0 0 8px rgba(239,68,68,0.3)" },
                "50%": { boxShadow: "0 0 20px rgba(239,68,68,0.6)" },
              },
              animation: "battlePulse 2s ease-in-out infinite",
            }),
          }}
          onClick={props.selectable ? altOnClick : canShowDetail ? () => setDetailOpen(true) : undefined}
        >
          {building()}
          {fort ? <FortIcon colour={fortColour ?? "white"}></FortIcon> : null}
          {xLocation !== 4 || yLocation !== 0 ? fleets : null}
        </Button>
        <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              pb: 0,
            }}
          >
            <Box sx={{ pr: 1 }}>
              <Typography sx={{ fontWeight: 800 }}>
                {locationPresentation.name}
              </Typography>
              <Typography sx={{ fontSize: "0.82rem", color: "rgba(0,0,0,0.62)" }}>
                {locationPresentation.reference}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setDetailOpen(false)}><Close /></IconButton>
          </DialogTitle>
          <DialogContent>
            <Box
              sx={{
                width: "100%",
                height: 300,
                backgroundImage: `url(${svgNameToElementMap[currentTile.name]})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                borderRadius: 1,
                mb: 2,
              }}
            />
            <Typography>⚔️ Attack: {currentTile.sword}</Typography>
            <Typography>🛡️ Defence: {currentTile.shield}</Typography>
            <Typography sx={{ mt: 1 }}>🏕️ Outpost loot:</Typography>
            <Typography sx={{ whiteSpace: "pre-line", pl: 2 }}>{outpostLoot() || "  None"}</Typography>
            <Typography sx={{ mt: 1 }}>🏰 Colony loot:</Typography>
            <Typography sx={{ whiteSpace: "pre-line", pl: 2 }}>{colonyLoot() || "  None"}</Typography>
          </DialogContent>
        </Dialog>
      </ThemeProvider>
    </ReactCardFlip>
  );
};

interface worldMapTileProps extends MyGameProps {
  location: number[];
  alternateOnClick?: (coords: number[]) => void;
  selectable?: boolean;
  battleHighlight?: boolean;
  detailRequestKey?: number;
  onDetailRequestHandled?: (requestKey: number) => void;
}
