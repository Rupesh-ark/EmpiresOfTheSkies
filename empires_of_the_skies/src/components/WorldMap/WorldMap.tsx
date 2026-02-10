import React, { ReactElement } from "react";

import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Grid } from "@mui/material";
import { WorldMapTile } from "./WorldMapTile";
import { MyGameProps } from "../../types";

const WorldMap = (props: WorldMapProps) => {
  const GridItems = (props: WorldMapProps) => {
    const currentMap = props.G.mapState.currentTileArray;
    let tiles: ReactElement[][] = [[], [], [], []];
    for (let y = 0; y < currentMap.length; y++) {
      for (let x = 0; x < currentMap[y].length; x++) {
        const tileProps = {
          location: [x, y],
          ...props,
        };
        let selectable = false;
        props.selectableTiles?.forEach((coord) => {
          if (coord[0] === x && coord[1] === y) {
            selectable = true;
          }
        });
        tiles[y].push(
          <Grid
            item
            lg={1}
            maxWidth={150}
            minWidth={150}
            key={`World Map Tile at (${x.toString()}, ${y.toString()})`}
          >
            <WorldMapTile
              {...tileProps}
              alternateOnClick={
                props.alternateOnClick ? props.alternateOnClick : undefined
              }
              selectable={selectable}
            />
          </Grid>
        );
      }
    }
    return <>{tiles}</>;
  };

  return (
    <div
      style={{
        overflow: "scroll",
        overflowY: "hidden",
        overflowX: "auto",
        display: "flex",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <TransformWrapper>
        <TransformComponent>
          <Grid
            container
            spacing={0}
            columns={8}
            maxWidth={1220}
            minWidth={1220}
          >
            <GridItems {...props} />
          </Grid>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
};

interface WorldMapProps extends MyGameProps {
  alternateOnClick?: (coords: number[]) => void;
  selectableTiles?: number[][];
}

export default WorldMap;
