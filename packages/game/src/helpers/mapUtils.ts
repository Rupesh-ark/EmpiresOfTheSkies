import { MyGameState, TileInfoProps } from "../types";
import { MAP_WIDTH, MAP_HEIGHT } from "../data/gameData";

export const FAITHDOM_TILES: [number, number][] = [
  [3, 0],
  [4, 0],
  [3, 1],
  [4, 1],
];


export const tileKey = (x: number, y: number): string => `${x},${y}`;

// Direction helpers for mountain blocking

/** Maps a (dx, dy) offset to its compass direction string. */
const offsetToDir = (dx: number, dy: number): string => {
  // dy is inverted: -1 = north (row above), +1 = south (row below)
  const ns = dy < 0 ? "N" : dy > 0 ? "S" : "";
  const ew = dx < 0 ? "W" : dx > 0 ? "E" : "";
  return ns + ew;
};


/**
 * Check if movement from (x,y) to (nx,ny) is blocked by mountains.
 * Mountains block movement in BOTH directions — check the source tile's
 * outgoing direction AND the destination tile's reverse (incoming) direction.
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
  const reverseDir = offsetToDir(-dx, -dy);

  const srcTile = tileArray[y]?.[x];
  const dstTile = tileArray[ny]?.[nx];

  return (srcTile?.blocked.includes(dir) ?? false) ||
         (dstTile?.blocked.includes(reverseDir) ?? false);
};

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
 * BFS shortest path from a single source to any target tile.
 * Traverses ALL passable neighbors (not limited to a player network).
 * Returns intermediate tiles only (excludes start and target).
 * Returns [] if start IS a target or no path exists.
 */
export function bfsShortestPath(
  start: [number, number],
  targets: [number, number][],
  tileArray: TileInfoProps[][],
): [number, number][] {
  const startKey = tileKey(start[0], start[1]);
  const targetSet = new Set(targets.map(([x, y]) => tileKey(x, y)));
  if (targetSet.has(startKey)) return [];

  const visited = new Map<string, string | null>(); // key → parent key
  const queue: [number, number][] = [start];
  visited.set(startKey, null);

  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    const curKey = tileKey(cx, cy);
    for (const [nx, ny] of getPassableNeighbors(cx, cy, tileArray)) {
      const nk = tileKey(nx, ny);
      if (visited.has(nk)) continue;
      visited.set(nk, curKey);
      if (targetSet.has(nk)) {
        // Backtrack to build path (exclude start and target)
        const path: [number, number][] = [];
        let cur: string | null = curKey; // parent of target
        while (cur !== null && cur !== startKey) {
          const [px, py] = cur.split(",").map(Number) as [number, number];
          path.unshift([px, py]);
          cur = visited.get(cur)!;
        }
        return path;
      }
      queue.push([nx, ny]);
    }
  }
  return []; // no path found
}

/**
 * Validates a retreat/evasion destination.
 * rules: destination must be discovered, adjacent (or same tile or Faithdom),
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

// All tiles where a player has skyships (fleet or route disc), plus Faithdom as free waypoints
export const buildPlayerNetwork = (G: MyGameState, playerID: string): Set<string> => {
  const network = new Set<string>();
  FAITHDOM_TILES.forEach(([x, y]) => network.add(tileKey(x, y)));
  // Fleet positions
  G.playerInfo[playerID].fleetInfo.forEach((fleet) => {
    if (fleet.skyships > 0) {
      network.add(tileKey(fleet.location[0], fleet.location[1]));
    }
  });
  // Route skyship discs on map
  for (const [key, players] of Object.entries(G.mapState.routeSkyships)) {
    if (players.includes(playerID)) {
      network.add(key);
    }
  }
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

/**
 * Would placing a route skyship at the given tile connect any currently
 * disconnected outpost/colony to Faithdom for this player?
 */
export const wouldPlacementConnectRoute = (
  G: MyGameState, playerID: string, tile: string,
): boolean => {
  const baseNetwork = buildPlayerNetwork(G, playerID);
  const extendedNetwork = new Set(baseNetwork);
  extendedNetwork.add(tile);

  for (let y = 0; y < G.mapState.buildings.length; y++) {
    for (let x = 0; x < G.mapState.buildings[y].length; x++) {
      const building = G.mapState.buildings[y][x];
      if (building.player?.id !== playerID || !building.buildings) continue;
      if (building.buildings !== "outpost" && building.buildings !== "colony") continue;

      const bk = tileKey(x, y);
      // Check if already connected WITHOUT the new tile
      const oldNet = new Set(baseNetwork);
      oldNet.add(bk);
      const oldReachable = bfsReachable(FAITHDOM_TILES, oldNet, G.mapState.currentTileArray);
      if (oldReachable.has(bk)) continue; // already connected, skip

      // Check if connected WITH the new tile
      const newNet = new Set(extendedNetwork);
      newNet.add(bk);
      const newReachable = bfsReachable(FAITHDOM_TILES, newNet, G.mapState.currentTileArray);
      if (newReachable.has(bk)) return true; // this placement makes a difference
    }
  }
  return false;
};
