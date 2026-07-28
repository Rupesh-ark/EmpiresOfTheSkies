import { FleetInfo, MyGameState, TileInfoProps } from "../types.js";
import { MAP_WIDTH, MAP_HEIGHT } from "../data/gameData.js";

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
  // When given, the path may only traverse discovered tiles — required when
  // the path stands in for a route a fleet legally flew.
  discoveredTiles?: boolean[][],
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
      if (discoveredTiles && !discoveredTiles[ny]?.[nx]) continue;
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
 * Computes the legal destinations for a retreating or evading fleet.
 *
 * The fleet may stay at the battle, use an adjacent Faithdom tile, or move to
 * an adjacent discovered tile without rival fleets. If no such normal
 * adjacent tile exists, the nearest BFS ring with discovered empty tiles is
 * offered instead.
 */
export const computeRetreatDestinations = (
  G: MyGameState,
  battleLocation: [number, number],
  retreatingPlayerID: string,
): [number, number][] => {
  const [bx, by] = battleLocation;
  const destinations: [number, number][] = [];
  const destinationKeys = new Set<string>();
  const faithdomKeys = new Set(
    FAITHDOM_TILES.map(([x, y]) => tileKey(x, y))
  );

  const addDestination = (tile: [number, number]): void => {
    const key = tileKey(tile[0], tile[1]);
    if (!destinationKeys.has(key)) {
      destinationKeys.add(key);
      destinations.push(tile);
    }
  };

  const isLaden = G.playerInfo[retreatingPlayerID]?.fleetInfo.some(
    (fleet) =>
      fleet.location[0] === bx &&
      fleet.location[1] === by &&
      fleet.regiments + fleet.levies + fleet.eliteRegiments > 0
  ) ?? false;
  const neighborsOf = (x: number, y: number): [number, number][] =>
    isLaden
      ? getPassableNeighbors(x, y, G.mapState.currentTileArray)
      : getNeighbors(x, y);

  addDestination([bx, by]);

  const adjacentTiles = neighborsOf(bx, by);
  for (const tile of adjacentTiles) {
    if (faithdomKeys.has(tileKey(tile[0], tile[1]))) {
      addDestination(tile);
    }
  }

  const adjacentRetreatTiles = adjacentTiles.filter(([x, y]) => {
    if (!G.mapState.discoveredTiles[y]?.[x]) return false;
    return !(G.mapState.battleMap[y]?.[x] ?? []).some(
      (playerID) => playerID !== retreatingPlayerID
    );
  });
  adjacentRetreatTiles.forEach(addDestination);

  if (adjacentRetreatTiles.length === 0) {
    const visited = new Set<string>([tileKey(bx, by)]);
    let ring: [number, number][] = [[bx, by]];

    while (ring.length > 0) {
      const nextRing: [number, number][] = [];
      for (const [x, y] of ring) {
        for (const tile of neighborsOf(x, y)) {
          const [tx, ty] = tile;
          const key = tileKey(tx, ty);
          if (visited.has(key)) continue;
          visited.add(key);
          if (
            faithdomKeys.has(key) ||
            !G.mapState.discoveredTiles[ty]?.[tx]
          ) {
            continue;
          }
          nextRing.push(tile);
        }
      }

      const emptyTiles = nextRing.filter(
        ([x, y]) => (G.mapState.battleMap[y]?.[x] ?? []).length === 0
      );
      if (emptyTiles.length > 0) {
        emptyTiles.forEach(addDestination);
        break;
      }
      ring = nextRing;
    }
  }

  return destinations;
};

// All tiles in a player's trade network: placed route skyship discs, plus
// Faithdom as free waypoints. Per the ruleset a Trade Route is "a line of one
// or more INDIVIDUAL Skyships" — deployed Fleets are not route links (they
// return home before trade resolves, so counting them promised connections
// that evaporated by the time goods were granted).
export const buildPlayerNetwork = (G: MyGameState, playerID: string): Set<string> => {
  const network = new Set<string>();
  FAITHDOM_TILES.forEach(([x, y]) => network.add(tileKey(x, y)));
  // Route skyship discs on map
  for (const [key, players] of Object.entries(G.mapState.routeSkyships)) {
    if (players.includes(playerID)) {
      network.add(key);
    }
  }
  return network;
};

/** All tiles holding this player's outposts or colonies. */
export const getPlayerBuildings = (
  G: MyGameState,
  playerID: string,
): [number, number][] => {
  const result: [number, number][] = [];
  for (let y = 0; y < G.mapState.buildings.length; y++) {
    for (let x = 0; x < G.mapState.buildings[y].length; x++) {
      const building = G.mapState.buildings[y][x];
      if (
        building.player?.id === playerID &&
        (building.buildings === "outpost" || building.buildings === "colony")
      ) {
        result.push([x, y]);
      }
    }
  }
  return result;
};

/**
 * Whether a building tile is connected to the Faithdom-reachable part of a
 * player's route network. A building is always a chain ENDPOINT (its
 * ownership skyship is the first link), so "add it to the network and
 * re-BFS" reduces to: does it have a passable edge into the reachable set?
 * This lets one BFS per player serve every building.
 */
export const isBuildingConnected = (
  x: number,
  y: number,
  reachable: Set<string>,
  tileArray: TileInfoProps[][],
): boolean => {
  if (reachable.has(tileKey(x, y))) return true;
  return getPassableNeighbors(x, y, tileArray).some(([nx, ny]) =>
    reachable.has(tileKey(nx, ny))
  );
};

/**
 * Count how many of a player's outposts/colonies are connected to Faithdom
 * via their skyship chain. Used by Engaged Factories rule to cap factory income.
 */
export const countActiveTradeRoutes = (G: MyGameState, playerID: string): number => {
  const network = buildPlayerNetwork(G, playerID);
  const reachable = bfsReachable(FAITHDOM_TILES, network, G.mapState.currentTileArray);
  return getPlayerBuildings(G, playerID).filter(([x, y]) =>
    isBuildingConnected(x, y, reachable, G.mapState.currentTileArray)
  ).length;
};

/**
 * What a prospective set of route placements would achieve, so the UI can
 * state the outcome instead of a skyship count. A partial chain is legal and
 * not wasted — "Skyships already so placed can be counted as part or all of
 * the new chain" (eots42) — so the useful answer is how many claims go from
 * disconnected to connected, not merely how many ships get left behind.
 */
export const claimsConnectedAfterPlacement = (
  G: MyGameState,
  playerID: string,
  extraTiles: [number, number][],
): { before: number; after: number; total: number } => {
  const tileArray = G.mapState.currentTileArray;
  const claims = getPlayerBuildings(G, playerID);

  const base = buildPlayerNetwork(G, playerID);
  const baseReachable = bfsReachable(FAITHDOM_TILES, base, tileArray);

  const extended = new Set(base);
  extraTiles.forEach(([x, y]) => extended.add(tileKey(x, y)));
  const extendedReachable = bfsReachable(FAITHDOM_TILES, extended, tileArray);

  return {
    before: claims.filter(([x, y]) => isBuildingConnected(x, y, baseReachable, tileArray)).length,
    after: claims.filter(([x, y]) => isBuildingConnected(x, y, extendedReachable, tileArray)).length,
    total: claims.length,
  };
};

/**
 * Would placing a route skyship at the given tile connect any currently
 * disconnected outpost/colony to Faithdom for this player?
 */
export const wouldPlacementConnectRoute = (
  G: MyGameState, playerID: string, tile: string,
): boolean => {
  const tileArray = G.mapState.currentTileArray;
  const baseNetwork = buildPlayerNetwork(G, playerID);
  const baseReachable = bfsReachable(FAITHDOM_TILES, baseNetwork, tileArray);

  const extendedNetwork = new Set(baseNetwork);
  extendedNetwork.add(tile);
  const extendedReachable = bfsReachable(FAITHDOM_TILES, extendedNetwork, tileArray);

  for (const [x, y] of getPlayerBuildings(G, playerID)) {
    if (isBuildingConnected(x, y, baseReachable, tileArray)) continue; // already connected
    if (isBuildingConnected(x, y, extendedReachable, tileArray)) return true;
  }
  return false;
};

/**
 * Tiles that would receive a route skyship when this fleet is retrieved with
 * the given route option. Single source of truth for the retrieveFleets move
 * AND the RetrieveFleetsDialog cost display — any drift between the two shows
 * players a wrong skyship cost.
 *
 * Skips Faithdom tiles, tiles that already hold one of the player's route
 * skyships (including earlier in the same trail), and — for trails — the
 * player's own building tiles. Capped at the fleet's skyship count; a
 * non-finite skyship value places nothing.
 */
export const getRoutePlacementTiles = (
  G: MyGameState,
  playerID: string,
  fleet: FleetInfo,
  mode: "placeAt" | "trail",
): [number, number][] => {
  const budget = Number.isFinite(fleet.skyships) ? fleet.skyships : 0;
  const candidates: [number, number][] =
    mode === "placeAt"
      ? [[fleet.location[0], fleet.location[1]]]
      : fleet.travelHistory;
  const placed: [number, number][] = [];
  const claimed = new Set<string>();

  for (const [x, y] of candidates) {
    if (placed.length >= budget) break;
    if (FAITHDOM_TILES.some(([fx, fy]) => fx === x && fy === y)) continue;
    const key = tileKey(x, y);
    if (claimed.has(key)) continue;
    if (mode === "trail") {
      const building = G.mapState.buildings[y]?.[x];
      if (building?.player?.id === playerID && building?.buildings) continue;
    }
    if ((G.mapState.routeSkyships[key] ?? []).includes(playerID)) continue;
    claimed.add(key);
    placed.push([x, y]);
  }
  return placed;
};
