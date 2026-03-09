import { TileInfoProps, MapBuildingInfo } from "../types";
import {
  unknownWorldTiles,
  oceanTiles,
  legendTiles,
  knownWorldTiles,
} from "../codifiedGameInfo";

export const getRandomisedMapTileArray = (): TileInfoProps[][] => {
  let randomTiles = oceanTiles.concat(unknownWorldTiles, legendTiles);

  let currentIndex = 28;
  let randomIndex = 0;
  while (currentIndex > 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [randomTiles[currentIndex], randomTiles[randomIndex]] = [
      randomTiles[randomIndex],
      randomTiles[currentIndex],
    ];
  }
  randomTiles.splice(3, 0, knownWorldTiles[0]);
  randomTiles.splice(4, 0, knownWorldTiles[1]);
  randomTiles.splice(11, 0, knownWorldTiles[2]);
  randomTiles.splice(12, 0, knownWorldTiles[3]);

  return [
    randomTiles.slice(0, 8),
    randomTiles.slice(8, 16),
    randomTiles.slice(16, 24),
    randomTiles.slice(24, 32),
  ];
};

export const getInitialDiscoveredTiles = (): boolean[][] => {
  const eightFalses = [false, false, false, false, false, false, false, false];
  const grid: boolean[][] = [
    [...eightFalses],
    [...eightFalses],
    [...eightFalses],
    [...eightFalses],
  ];
  grid[0][3] = true;
  grid[0][4] = true;
  grid[1][3] = true;
  grid[1][4] = true;
  return grid;
};

export const getInitialOutpostsAndColoniesInfo = (): MapBuildingInfo[][] => {
  const emptyBuilding: MapBuildingInfo = {
    garrisonedLevies: 0,
    garrisonedRegiments: 0,
    fort: false,
  };
  const emptyRow: MapBuildingInfo[] = Array(8).fill(emptyBuilding);
  return [
    [...emptyRow],
    [...emptyRow],
    [...emptyRow],
    [...emptyRow],
  ];
};