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
const getNeighbors = (x: number, y: number): [number, number][] => {
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
  const visited = new Set<string>();
  const queue: [number, number][] = [];
  starts.forEach(([x, y]) => {
    const k = tileKey(x, y);
    if (network.has(k)) {
      visited.add(k);
      queue.push([x, y]);
    }
  });
  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    for (const [nx, ny] of getNeighbors(cx, cy)) {
      const k = tileKey(nx, ny);
      if (network.has(k) && !visited.has(k)) {
        visited.add(k);
        queue.push([nx, ny]);
      }
    }
  }
  return visited;
};

// All tiles where a player has skyships, plus Faithdom as free waypoints
const buildPlayerNetwork = (G: MyGameState, playerID: string): Set<string> => {
  const network = new Set<string>();
  FAITHDOM_TILES.forEach(([x, y]) => network.add(tileKey(x, y)));
  G.playerInfo[playerID].fleetInfo.forEach((fleet) => {
    if (fleet.skyships > 0) {
      network.add(tileKey(fleet.location[0], fleet.location[1]));
    }
  });
  return network;
};

// Gold value of a route: tile loot goods × current price markers + flat gold
const getTileRouteValue = (
  G: MyGameState,
  x: number,
  y: number,
  buildingType: "outpost" | "colony"
): number => {
  const loot = G.mapState.currentTileArray[y][x].loot[buildingType];
  const markers = G.mapState.goodsPriceMarkers;
  return (
    loot.gold +
    loot.mithril * markers.mithril +
    loot.dragonScales * markers.dragonScales +
    loot.krakenSkin * markers.krakenSkin +
    loot.magicDust * markers.magicDust +
    loot.stickyIchor * markers.stickyIchor +
    loot.pipeweed * markers.pipeweed
  );
};

/**
 * B7: Piracy resolution.
 *
 * For each player's valid trade route (outpost/colony connected to Faithdom via
 * their skyship chain), check if any rival fleet occupies a bottleneck tile on
 * that route (i.e., removing it would disconnect the route). If so, the route
 * owner pays 1 Gold to the rival per blocking fleet, capped at the route's
 * total goods value. If the rival holds the `sanctioned_piracy` Kingdom
 * Advantage, they also gain +1 VP per act of piracy.
 *
 * Protection: if the route owner also has a fleet at the rival's tile, that
 * tile is automatically protected and cannot be pirated.
 */
export const enactPiracy = (G: MyGameState): void => {
  Object.keys(G.playerInfo).forEach((playerID) => {
    const playerNetwork = buildPlayerNetwork(G, playerID);

    const playerFleetTiles = new Set<string>();
    G.playerInfo[playerID].fleetInfo.forEach((fleet) => {
      if (fleet.skyships > 0) {
        playerFleetTiles.add(tileKey(fleet.location[0], fleet.location[1]));
      }
    });

    G.mapState.buildings.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell.player?.id !== playerID || !cell.buildings) return;

        const outpostKey = tileKey(x, y);
        const network = new Set(playerNetwork);
        network.add(outpostKey);

        // Only routes connected to Faithdom are vulnerable to piracy
        const reachable = bfsReachable(FAITHDOM_TILES, network);
        if (!reachable.has(outpostKey)) return;

        const routeValue = getTileRouteValue(G, x, y, cell.buildings);
        let goldRemainingToLose = routeValue;

        Object.keys(G.playerInfo).forEach((rivalID) => {
          if (rivalID === playerID || goldRemainingToLose <= 0) return;

          G.playerInfo[rivalID].fleetInfo.forEach((rivalFleet) => {
            if (rivalFleet.skyships <= 0 || goldRemainingToLose <= 0) return;

            const rivalKey = tileKey(
              rivalFleet.location[0],
              rivalFleet.location[1]
            );

            // Player's own fleet at this tile = protected, no piracy
            if (playerFleetTiles.has(rivalKey)) return;

            // Rival must be on a tile in the player's network to block
            if (!network.has(rivalKey)) return;

            // Bottleneck check: does removing this tile disconnect the route?
            const reducedNetwork = new Set(network);
            reducedNetwork.delete(rivalKey);
            const reachableWithout = bfsReachable(
              FAITHDOM_TILES,
              reducedNetwork
            );
            if (!reachableWithout.has(outpostKey)) {
              const goldLost = Math.min(1, goldRemainingToLose);
              G.playerInfo[playerID].resources.gold -= goldLost;
              G.playerInfo[rivalID].resources.gold += goldLost;
              goldRemainingToLose -= goldLost;

              if (
                G.playerInfo[rivalID].resources.advantageCard ===
                "sanctioned_piracy"
              ) {
                G.playerInfo[rivalID].resources.victoryPoints += 1;
              }
            }
          });
        });
      });
    });
  });
};