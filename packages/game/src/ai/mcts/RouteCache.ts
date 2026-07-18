/**
 * Trade Route Cache
 * 
 * Caches trade route calculations to avoid redundant BFS calls.
 * Trade routes only depend on: building positions, fleet positions, and round number.
 */
import type { MyGameState } from "../../types.js";
import { tileKey, buildPlayerNetwork, bfsReachable, getNeighbors, FAITHDOM_TILES } from "../../helpers/mapUtils.js";

interface CacheEntry {
  routes: Record<string, number>;
  round: number;
  buildingKey: string;
  fleetKey: string;
}

const routeCache = new Map<string, CacheEntry>();
const MAX_CACHE_SIZE = 500;

function getBuildingKey(G: MyGameState): string {
  const parts: string[] = [];
  const buildings = G.mapState.buildings;
  for (let y = 0; y < buildings.length; y++) {
    const row = buildings[y];
    if (!row) continue;
    for (let x = 0; x < row.length; x++) {
      const cell = row[x];
      if (cell?.buildings && cell.player) {
        parts.push(`${tileKey(x,y)}:${cell.player.id}:${cell.buildings}`);
      }
    }
  }
  return parts.join(',');
}

function getFleetKey(G: MyGameState): string {
  const parts: string[] = [];
  for (const [pid, player] of Object.entries(G.playerInfo)) {
    for (const fleet of player.fleetInfo) {
      if (fleet.skyships > 0) {
        parts.push(`${pid}:${fleet.fleetId}:${fleet.location.join(',')}`);
      }
    }
  }
  return parts.join(';');
}

function computeRoutesForPlayer(G: MyGameState, playerID: string): number {
  const network = buildPlayerNetwork(G, playerID);
  const reachable = bfsReachable(FAITHDOM_TILES, network, G.mapState.currentTileArray);

  let count = 0;
  for (let y = 0; y < G.mapState.buildings.length; y++) {
    for (let x = 0; x < G.mapState.buildings[y].length; x++) {
      const building = G.mapState.buildings[y][x];
      if (building.player?.id !== playerID || !building.buildings) continue;
      if (building.buildings !== "outpost" && building.buildings !== "colony") continue;

      const key = tileKey(x, y);
      if (reachable.has(key)) {
        count++;
        continue;
      }
      const neighbors = getNeighbors(x, y);
      if (neighbors.some(([nx, ny]) => reachable.has(tileKey(nx, ny)))) {
        count++;
      }
    }
  }
  return count;
}

export function getTradeRoutes(G: MyGameState, playerIDs: string[]): Record<string, number> {
  const buildingKey = getBuildingKey(G);
  const fleetKey = getFleetKey(G);
  const round = G.round;

  const cacheKey = `${round}:${buildingKey}:${fleetKey}`;
  const cached = routeCache.get(cacheKey);

  if (cached && cached.round === round && cached.buildingKey === buildingKey && cached.fleetKey === fleetKey) {
    return cached.routes;
  }

  const routes: Record<string, number> = {};
  for (const pid of playerIDs) {
    routes[pid] = computeRoutesForPlayer(G, pid);
  }

  if (routeCache.size >= MAX_CACHE_SIZE) {
    const firstKey = routeCache.keys().next().value;
    routeCache.delete(firstKey);
  }

  routeCache.set(cacheKey, { routes, round, buildingKey, fleetKey });
  return routes;
}

export function invalidateRouteCache(): void {
  routeCache.clear();
}
