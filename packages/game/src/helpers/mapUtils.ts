import { MyGameState } from "../types";

export const FAITHDOM_TILES: [number, number][] = [
  [3, 0],
  [4, 0],
  [3, 1],
  [4, 1],
];

const MAP_WIDTH = 8;
const MAP_HEIGHT = 4;

export const tileKey = (x: number, y: number): string => `${x},${y}`;

// 8-directional adjacency with east-west wrap
export const getNeighbors = (x: number, y: number): [number, number][] => {
  const result: [number, number][] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const ny = y + dy;
      const nx = ((x + dx + MAP_WIDTH) % MAP_WIDTH);
      if (ny >= 0 && ny < MAP_HEIGHT) result.push([nx, ny]);
    }
  }
  return result;
};

// BFS from start tiles through a network of allowed tiles
export const bfsReachable = (
  starts: [number, number][],
  network: Set<string>
): Set<string> => {
  return new Set(bfsWithDistance(starts, network).keys());
};

// BFS returning a map of tileKey → distance from nearest start tile
export const bfsWithDistance = (
  starts: [number, number][],
  network: Set<string>
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
    for (const [nx, ny] of getNeighbors(cx, cy)) {
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

  // Must be adjacent to battle location
  const neighbors = getNeighbors(bx, by);
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
