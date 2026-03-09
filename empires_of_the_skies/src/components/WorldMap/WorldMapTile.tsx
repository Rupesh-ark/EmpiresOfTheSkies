import React, { useState, useRef, useCallback } from "react";
import { keyframes } from "@emotion/react";

import ReactCardFlip from "react-card-flip";
import { useLongPress } from "use-long-press";
import { MyGameProps } from "@eots/game";
import { Button, Tooltip } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { generalTheme } from "../themes";
import FortIcon from "../Icons/FortIcon";
import FleetIcon from "../Icons/FleetIcon";
import ColonyIcon from "../Icons/ColonyIcon";
import OutpostIcon from "../Icons/OutpostIcon";
import svgNameToElementMap from "./nameToElementMap";

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

  const altOnClick = () => {
    if (props.alternateOnClick) {
      props.alternateOnClick([xLocation, yLocation]);
    }
  };

  return (
    <ReactCardFlip isFlipped={flip} key={props.location.toString()}>
      <Button
        value={currentTile.name}
        sx={{
          background: "linear-gradient(135deg, #005a82 0%, #007ab5 35%, #009ee3 65%, #005a82 100%)",
          backgroundSize: "400% 400%",
          animation: `${keyframes`
            0%   { background-position: 0% 50%; }
            50%  { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          `} 6s ease infinite`,
          height: "100%",
          width: "150px",
          maxWidth: "100%",
          minHeight: "150px",
          minWidth: "150px",
          borderRadius: 0,
          border: "1px solid rgba(0,122,181,0.25)",
          boxShadow: "inset 0 0 20px rgba(0,158,227,0.3), inset 0 0 5px rgba(0,200,255,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "filter 0.2s ease",
          "&:hover": {
            filter: "brightness(1.4) saturate(1.4)",
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
        <span
          style={{
            fontSize: "40px",
            opacity: 0.4,
            userSelect: "none",
            lineHeight: 1,
            filter: "drop-shadow(0 0 6px rgba(0,200,255,0.8))",
          }}
        >
          🔍
        </span>
      </Button>
      <ThemeProvider theme={generalTheme}>
        <Tooltip
          title={tooltipText}
          arrow
          disableFocusListener={
            !flip ||
            currentTile.type === "ocean" ||
            (xLocation === 4 && yLocation === 0)
          }
          placement="right-start"
          sx={{ whiteSpace: "pre-line", fontSize: "20px" }}
          disableHoverListener={
            (xLocation === 4 && yLocation === 0) || currentTile.type === "ocean"
          }
        >
          <Button
            className="front"
            sx={{
              backgroundImage: `url(${svgNameToElementMap[currentTile.name]})`,
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              height: "100%",
              width: "150px",
              maxWidth: "100%",
              minHeight: "150px",
              minWidth: "150px",
              border: props.selectable ? "5px solid yellow" : "0px ",
              borderRadius: 0,
            }}
            onClick={props.selectable ? altOnClick : undefined}
          >
            {building()}
            {fort ? <FortIcon colour={fortColour ?? "white"}></FortIcon> : null}
            {xLocation !== 4 || yLocation !== 0 ? fleets : null}
          </Button>
        </Tooltip>
      </ThemeProvider>
    </ReactCardFlip>
  );
};

interface worldMapTileProps extends MyGameProps {
  location: number[];
  alternateOnClick?: (coords: number[]) => void;
  selectable?: boolean;
}
