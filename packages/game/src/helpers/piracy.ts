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
        const reachable = bfsReachable(FAITHDOM_TILES, network, G.mapState.currentTileArray);
        if (!reachable.has(outpostKey)) return;

        const routeValue = getTileRouteValue(G, x, y, cell.buildings);
        let goldRemainingToLose = routeValue;

        // BFS from outpost to get distance of each tile on the route
        const distFromOutpost = bfsWithDistance([[x, y]], network, G.mapState.currentTileArray);

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
              reducedNetwork,
              G.mapState.currentTileArray
            );
            if (!reachableWithout.has(outpostKey)) {
              blockingPirates.push({
                rivalID,
                distance: distFromOutpost.get(rivalKey) ?? Infinity,
              });
            }
          });
        });

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
              reducedNetwork,
              G.mapState.currentTileArray
            );
            if (!reachableWithout.has(outpostKey)) {
              const goldLost = Math.min(1, goldRemainingToLose);
              G.playerInfo[playerID].resources.gold -= goldLost;
              // Gold goes to bank — no player receives it
              goldRemainingToLose -= goldLost;
            }
          }
        }

        // multiple pirates prioritized by nearest to Land source
        blockingPirates.sort((a, b) => a.distance - b.distance);

        blockingPirates.forEach(({ rivalID }) => {
          const hasSanctionedPiracy =
            G.playerInfo[rivalID].resources.advantageCard === "sanctioned_piracy";

          // Cut the Route: pirate declared "cut" intent during actions phase
          const shouldCut = G.playerInfo[rivalID].piracyIntent === "cut";

          if (shouldCut) {
            // amendment: remove one route skyship from the pirate's tile,
            // return it to the route owner's reserve.
            // Find which tile this rival's blocking fleet is on:
            let cutKey: string | null = null;
            for (const rf of G.playerInfo[rivalID].fleetInfo) {
              if (rf.skyships <= 0) continue;
              const fk = tileKey(rf.location[0], rf.location[1]);
              if (network.has(fk)) { cutKey = fk; break; }
            }
            const routeShips = cutKey ? G.mapState.routeSkyships[cutKey] : undefined;
            if (cutKey && routeShips?.includes(playerID)) {
              routeShips.splice(routeShips.indexOf(playerID), 1);
              if (routeShips.length === 0) delete G.mapState.routeSkyships[cutKey];
              G.playerInfo[playerID].resources.skyships += 1;
              logEvent(
                G,
                `Piracy: ${G.playerInfo[rivalID].kingdomName} cuts ${G.playerInfo[playerID].kingdomName}'s trade route at ${cutKey}`,
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