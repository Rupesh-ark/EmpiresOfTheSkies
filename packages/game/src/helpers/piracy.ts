import { MyGameState } from "../types";
import { FAITHDOM_TILES, tileKey, bfsReachable, bfsWithDistance, buildPlayerNetwork } from "./mapUtils";
import { logEvent } from "./stateUtils";

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

        // BFS from outpost to get distance of each tile on the route
        const distFromOutpost = bfsWithDistance([[x, y]], network);

        // Collect all rival blocking fleets with their distance from the outpost
        const blockingPirates: { rivalID: string; distance: number }[] = [];

        Object.keys(G.playerInfo).forEach((rivalID) => {
          if (rivalID === playerID) return;

          G.playerInfo[rivalID].fleetInfo.forEach((rivalFleet) => {
            if (rivalFleet.skyships <= 0) return;

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
              blockingPirates.push({
                rivalID,
                distance: distFromOutpost.get(rivalKey) ?? Infinity,
              });
            }
          });
        });

        // GAP-INF2: Infidel Fleet piracy — active fleet on a bottleneck tile
        // sends gold to bank (deducted, no player receives it)
        if (G.infidelFleet?.active) {
          const fleetKey = tileKey(
            G.infidelFleet.location[0],
            G.infidelFleet.location[1]
          );
          if (
            network.has(fleetKey) &&
            !playerFleetTiles.has(fleetKey) // protected if player has fleet there
          ) {
            const reducedNetwork = new Set(network);
            reducedNetwork.delete(fleetKey);
            const reachableWithout = bfsReachable(
              FAITHDOM_TILES,
              reducedNetwork
            );
            if (!reachableWithout.has(outpostKey)) {
              const goldLost = Math.min(1, goldRemainingToLose);
              G.playerInfo[playerID].resources.gold -= goldLost;
              // Gold goes to bank — no player receives it
              goldRemainingToLose -= goldLost;
            }
          }
        }

        // v4.2: multiple pirates prioritized by nearest to Land source
        blockingPirates.sort((a, b) => a.distance - b.distance);

        blockingPirates.forEach(({ rivalID }) => {
          const hasSanctionedPiracy =
            G.playerInfo[rivalID].resources.advantageCard === "sanctioned_piracy";

          // Cut the Route: pirate without sanctioned_piracy on a low-value
          // route cuts a skyship instead of taxing (more strategic disruption).
          // Sanctioned piracy players always tax (gold + VP is too valuable).
          const shouldCut = !hasSanctionedPiracy && routeValue <= 1;

          if (shouldCut) {
            // Find route owner's nearest fleet on the route to cut from
            let bestFleet: (typeof G.playerInfo)[string]["fleetInfo"][number] | null = null;
            let bestDist = Infinity;
            for (const fleet of G.playerInfo[playerID].fleetInfo) {
              if (fleet.skyships <= 0) continue;
              const fk = tileKey(fleet.location[0], fleet.location[1]);
              if (!network.has(fk)) continue;
              const dist = distFromOutpost.get(fk) ?? Infinity;
              if (dist < bestDist) {
                bestDist = dist;
                bestFleet = fleet;
              }
            }

            if (bestFleet && bestFleet.skyships > 0) {
              bestFleet.skyships -= 1;
              G.playerInfo[playerID].resources.skyships += 1;
              logEvent(
                G,
                `Piracy: ${G.playerInfo[rivalID].kingdomName} cuts ${G.playerInfo[playerID].kingdomName}'s trade route — 1 skyship returned to kingdom`,
              );
            }
          } else {
            // Standard piracy: tax gold
            if (goldRemainingToLose <= 0) return;
            const goldLost = Math.min(1, goldRemainingToLose);
            G.playerInfo[playerID].resources.gold -= goldLost;
            G.playerInfo[rivalID].resources.gold += goldLost;
            goldRemainingToLose -= goldLost;

            if (hasSanctionedPiracy) {
              G.playerInfo[rivalID].resources.victoryPoints += 1;
            }
          }
        });
      });
    });
  });
};