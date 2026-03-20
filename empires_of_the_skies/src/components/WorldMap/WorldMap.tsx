import { ReactElement } from "react";

import { Box, Grid } from "@mui/material";
import { WorldMapTile } from "./WorldMapTile";
import { MyGameProps } from "@eots/game";
import { tokens } from "@/theme";

const BATTLE_PHASES = new Set([
  "aerial_battle", "ground_battle", "plunder_legends", "conquest",
]);

const WorldMap = (props: WorldMapProps) => {
  const GridItems = (props: WorldMapProps) => {
    const currentMap = props.G.mapState.currentTileArray;
    const battleCoords = props.G.mapState.currentBattle;
    const isBattlePhase = BATTLE_PHASES.has(props.ctx.phase ?? "");
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
            key={`World Map Tile at (${x.toString()}, ${y.toString()})`}
          >
            <WorldMapTile
              {...tileProps}
              alternateOnClick={
                props.alternateOnClick ? props.alternateOnClick : undefined
              }
              selectable={selectable}
              battleHighlight={!!isBattleTile}
              detailRequestKey={detailRequestKey}
              onDetailRequestHandled={props.onDetailRequestHandled}
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
        overflowX: "auto",
        overflowY: "auto",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        width: "100%",
        height: "100%",
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          maxWidth: 1600,
          my: "auto",
          mx: "auto",
        }}
      >
        <Grid
          container
          spacing={0}
          columns={8}
          sx={{ width: "100%" }}
        >
          <GridItems {...props} />
        </Grid>

        {/* Cloud edge overlay — softens map boundaries */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            boxShadow: `
              inset 0 0 30px 15px ${tokens.ui.background},
              inset 0 0 60px 30px ${tokens.ui.background}88
            `,
            zIndex: 2,
          }}
        />
      </Box>
    </div>
  );
};

interface WorldMapProps extends MyGameProps {
  alternateOnClick?: (coords: number[]) => void;
  selectableTiles?: number[][];
  detailRequest?: { location: number[]; key: number } | null;
  onDetailRequestHandled?: (requestKey: number) => void;
}

export default WorldMap;
