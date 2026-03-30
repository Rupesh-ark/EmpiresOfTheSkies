import type { FleetInfo, MyGameState, PlayerInfo } from "../types";

export interface FleetTroopCounts {
  skyships: number;
  regiments: number;
  levies: number;
  eliteRegiments: number;
}

export function calculateFleetStrength(fleet: FleetTroopCounts | FleetInfo): number {
  return (
    fleet.skyships * 1.5 +
    fleet.regiments +
    fleet.levies * 0.5 +
    fleet.eliteRegiments * 1.5
  );
}

export function calculateFleetCombatPower(fleet: FleetInfo): number {
  return fleet.skyships + fleet.regiments + fleet.eliteRegiments;
}

export function fleetHasUnits(fleet: FleetInfo): boolean {
  return fleet.skyships > 0 || fleet.regiments > 0 || fleet.levies > 0 || fleet.eliteRegiments > 0;
}

export function getFleetUnitCount(fleet: FleetInfo): number {
  return fleet.skyships + fleet.regiments + fleet.levies + fleet.eliteRegiments;
}

/**
 * Calculate sword value for a fleet using the canonical battle formula.
 * skyships + levies + regiments*2 + eliteRegiments*3
 */
export function calculateFleetSwords(fleet: FleetTroopCounts | FleetInfo): number {
  return fleet.skyships + fleet.levies + fleet.regiments * 2 + fleet.eliteRegiments * 3;
}

/**
 * Total sword value of all a player's fleets at a given tile.
 */
export function playerSwordsAtTile(player: PlayerInfo, x: number, y: number): number {
  let swords = 0;
  for (const fleet of player.fleetInfo) {
    if (fleet.location[0] === x && fleet.location[1] === y && fleet.skyships > 0) {
      swords += calculateFleetSwords(fleet);
    }
  }
  return swords;
}

/**
 * Check if a player has troops (regiments or elites) at a tile — needed for garrison.
 */
export function hasTroopsAtTile(player: PlayerInfo, x: number, y: number): boolean {
  return player.fleetInfo.some(
    (f) => f.location[0] === x && f.location[1] === y && f.skyships > 0 &&
      (f.regiments > 0 || f.eliteRegiments > 0)
  );
}

/**
 * Best sword value from the player's FoW hand. Returns 0 if hand is empty.
 */
export function bestHandSwords(player: PlayerInfo): number {
  if (player.resources.fortuneCards.length === 0) return 0;
  return Math.max(...player.resources.fortuneCards.map((c) => c.sword));
}

/**
 * Estimate colonise confidence: ratio of expected attack power vs tile defence.
 * >1.5 = comfortable win, 1.0-1.5 = risky, <1.0 = likely loss.
 *
 * Includes: fleet swords at tile + garrisoned troops + best FoW card (or avg deck draw).
 * Does NOT include the tile's FoW card (unknown).
 */
export function coloniseConfidence(
  G: MyGameState,
  playerID: string,
  tileX: number,
  tileY: number
): number {
  const player = G.playerInfo[playerID];
  const tile = G.mapState.currentTileArray[tileY]?.[tileX];
  if (!tile) return 0;

  const tileSwords = tile.sword ?? 0;
  if (tileSwords === 0) return Infinity; // undefended land

  // Our swords at this tile (fleets)
  let attackSwords = playerSwordsAtTile(player, tileX, tileY);

  // Add garrison troops already on the building (if we have an outpost here)
  const building = G.mapState.buildings[tileY]?.[tileX];
  if (building?.player?.id === playerID) {
    attackSwords += (building.garrisonedRegiments ?? 0) * 2;
    attackSwords += (building.garrisonedLevies ?? 0);
    attackSwords += (building.garrisonedEliteRegiments ?? 0) * 3;
  }

  // FoW card: use best from hand, or expected deck draw (~2 avg)
  const handBest = bestHandSwords(player);
  const fowBonus = handBest > 0 ? handBest : 2;
  attackSwords += fowBonus;

  // Tile also draws a FoW card — expected ~2.5 swords on average
  const tileExpectedTotal = tileSwords + 2.5;

  return attackSwords / tileExpectedTotal;
}
