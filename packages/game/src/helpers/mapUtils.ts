import { MyGameState, TileInfoProps } from "../types";
import { MAP_WIDTH, MAP_HEIGHT } from "../data/gameData";

export const FAITHDOM_TILES: [number, number][] = [
  [3, 0],
  [4, 0],
  [3, 1],
  [4, 1],
];


export const tileKey = (x: number, y: number): string => `${x},${y}`;

// ── Direction helpers for mountain blocking ──────────────────────────────

/** Maps a (dx, dy) offset to its compass direction string. */
const offsetToDir = (dx: number, dy: number): string => {
  // dy is inverted: -1 = north (row above), +1 = south (row below)
  const ns = dy < 0 ? "N" : dy > 0 ? "S" : "";
  const ew = dx < 0 ? "W" : dx > 0 ? "E" : "";
  return ns + ew;
};


/**
 * Check if movement from (x,y) to (nx,ny) is blocked by mountains.
 * Mountains are printed on the SOURCE tile's edge — they only block
 * movement away from that tile, not approaches from the other side.
 */
const isEdgeBlocked = (
  x: number, y: number,
  nx: number, ny: number,
  tileArray: TileInfoProps[][],
): boolean => {
  // Compute the raw dx accounting for east-west wrap
  let dx = nx - x;
  if (dx > MAP_WIDTH / 2) dx -= MAP_WIDTH;
  if (dx < -MAP_WIDTH / 2) dx += MAP_WIDTH;
  const dy = ny - y;

  const dir = offsetToDir(dx, dy);
  const srcTile = tileArray[y]?.[x];
  return srcTile?.blocked.includes(dir) ?? false;
};

// ── Adjacency ────────────────────────────────────────────────────────────

// Adjacency with east-west wrap. edgesOnly=true gives 4 cardinal directions only.
export const getNeighbors = (x: number, y: number, edgesOnly = false): [number, number][] => {
  const result: [number, number][] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (edgesOnly && dx !== 0 && dy !== 0) continue;
      const ny = y + dy;
      const nx = ((x + dx + MAP_WIDTH) % MAP_WIDTH);
      if (ny >= 0 && ny < MAP_HEIGHT) result.push([nx, ny]);
    }
  }
  return result;
};

/**
 * Like getNeighbors, but filters out tiles blocked by mountain edges.
 * Pass the tile array so both source and destination blocked edges are checked.
 */
export const getPassableNeighbors = (
  x: number, y: number,
  tileArray: TileInfoProps[][],
  edgesOnly = false,
): [number, number][] => {
  return getNeighbors(x, y, edgesOnly).filter(
    ([nx, ny]) => !isEdgeBlocked(x, y, nx, ny, tileArray)
  );
};

// ── BFS ──────────────────────────────────────────────────────────────────

// BFS from start tiles through a network of allowed tiles.
// When tileArray is provided, mountain edges are respected.
export const bfsReachable = (
  starts: [number, number][],
  network: Set<string>,
  tileArray?: TileInfoProps[][],
): Set<string> => {
  return new Set(bfsWithDistance(starts, network, tileArray).keys());
};

// BFS returning a map of tileKey → distance from nearest start tile.
// When tileArray is provided, mountain edges are respected.
export const bfsWithDistance = (
  starts: [number, number][],
  network: Set<string>,
  tileArray?: TileInfoProps[][],
): Map<string, number> => {
  const visited = new Map<string, number>();
  const queue: [number, number, number][] = [];
  starts.forEach(([x, y]) => {
    const k = tileKey(x, y);
    if (network.has(k)) {
      visited.set(k, 0);
      queue.push([x, y, 0]);
    }
  });
  while (queue.length > 0) {
    const [cx, cy, dist] = queue.shift()!;
    const neighbors = tileArray
      ? getPassableNeighbors(cx, cy, tileArray)
      : getNeighbors(cx, cy);
    for (const [nx, ny] of neighbors) {
      const k = tileKey(nx, ny);
      if (network.has(k) && !visited.has(k)) {
        visited.set(k, dist + 1);
        queue.push([nx, ny, dist + 1]);
      }
    }
  }
  return visited;
};

/**
 * Validates a retreat/evasion destination.
 * v4.2 rules: destination must be discovered, adjacent (or same tile or Faithdom),
 * and free of unfriendly fleets (Faithdom is always safe).
 */
export const isValidRetreatDestination = (
  G: MyGameState,
  battleLocation: [number, number],
  destination: [number, number],
  retreatingPlayerID: string
): boolean => {
  const [dx, dy] = destination;
  const [bx, by] = battleLocation;

  // Same tile is always valid (staying put)
  if (dx === bx && dy === by) return true;

  // Faithdom tiles are always valid (safe haven)
  if (FAITHDOM_TILES.some(([fx, fy]) => fx === dx && fy === dy)) return true;

  // Must be discovered
  if (!G.mapState.discoveredTiles[dy]?.[dx]) return false;

  // Must be adjacent to battle location and not blocked by mountains
  const neighbors = getPassableNeighbors(bx, by, G.mapState.currentTileArray);
  const isAdjacent = neighbors.some(([nx, ny]) => nx === dx && ny === dy);
  if (!isAdjacent) return false;

  // Must not contain unfriendly fleets
  const playersAtDestination = G.mapState.battleMap[dy]?.[dx] ?? [];
  const hasUnfriendlyFleet = playersAtDestination.some(
    (pid) => pid !== retreatingPlayerID
  );
  if (hasUnfriendlyFleet) return false;

  return true;
};

// All tiles where a player has skyships, plus Faithdom as free waypoints
export const buildPlayerNetwork = (G: MyGameState, playerID: string): Set<string> => {
  const network = new Set<string>();
  FAITHDOM_TILES.forEach(([x, y]) => network.add(tileKey(x, y)));
  G.playerInfo[playerID].fleetInfo.forEach((fleet) => {
    if (fleet.skyships > 0) {
      network.add(tileKey(fleet.location[0], fleet.location[1]));
    }
  });
  return network;
};

/**
 * Count how many of a player's outposts/colonies are connected to Faithdom
 * via their skyship chain. Used by Engaged Factories rule to cap factory income.
 */
export const countActiveTradeRoutes = (G: MyGameState, playerID: string): number => {
  const playerNetwork = buildPlayerNetwork(G, playerID);
  let count = 0;

  for (let y = 0; y < G.mapState.buildings.length; y++) {
    for (let x = 0; x < G.mapState.buildings[y].length; x++) {
      const building = G.mapState.buildings[y][x];
      if (building.player?.id !== playerID || !building.buildings) continue;
      if (building.buildings !== "outpost" && building.buildings !== "colony") continue;

      const network = new Set(playerNetwork);
      network.add(tileKey(x, y));
      const reachable = bfsReachable(FAITHDOM_TILES, network, G.mapState.currentTileArray);
      if (reachable.has(tileKey(x, y))) count++;
    }
  }

  return count;
};
