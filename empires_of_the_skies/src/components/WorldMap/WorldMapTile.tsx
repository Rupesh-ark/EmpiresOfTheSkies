import React, { useState, useRef, useCallback } from "react";

import ReactCardFlip from "react-card-flip";
import { useLongPress } from "use-long-press";
import { MyGameProps } from "../../types";
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
          backgroundColor: "#298932",
          fontSize: "30px",
          height: "100%",
          width: "150px",
          maxWidth: "100%",
          minHeight: "150px",
          minWidth: "150px",
          fontFamily: "dauphinn",
          color: "black",
          justifyContent: "center",
          borderRadius: 0,
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
        ?
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
