import type { PhaseStrategy, AIPersonality, AIMove, AIWeights } from "../types";
import type { MyGameState } from "../../types";
import type { Ctx } from "boardgame.io";
import { enumerateLegalMoves } from "../enumerate";
import { getNeighbors } from "../../helpers/mapUtils";
import { KINGDOM_LOCATION, MAP_WIDTH, MAP_HEIGHT } from "../../data/gameData";

/**
 * Discovery phase strategy: pick the best tile to reveal based on
 * positional heuristics and personality weights.
 *
 * Tiles are face-down, so we can't score by content — only by position
 * relative to the player's existing territory, opponents, and Faithdom.
 */
export class DiscoveryStrategy implements PhaseStrategy {
  selectMove(
    G: MyGameState,
    ctx: Ctx,
    playerID: string,
    personality: AIPersonality
  ): AIMove {
    const moves = enumerateLegalMoves(G, ctx, playerID);
    if (moves.length === 0) return { move: "pass", args: [] };

    const discoverMoves = moves.filter((m) => m.move === "discoverTile");
    const passMove = moves.find((m) => m.move === "pass") ?? { move: "pass", args: [] };

    // If no tiles to discover, pass
    if (discoverMoves.length === 0) return passMove;

    // Score each tile
    const w = personality.weights;
    const playerBuildings = this.getPlayerBuildingLocations(G, playerID);
    const opponentBuildings = this.getOpponentBuildingLocations(G, playerID);
    const opponentFleets = this.getOpponentFleetLocations(G, playerID);

    const scored = discoverMoves.map((m) => {
      const [x, y] = m.args[0] as [number, number];
      return { move: m, score: this.scoreTile(x, y, G, w, playerBuildings, opponentBuildings, opponentFleets) };
    });

    scored.sort((a, b) => b.score - a.score);

    // Should we pass instead of discovering?
    if (this.shouldPass(G, playerID, ctx, scored[0].score)) {
      return passMove;
    }

    return scored[0].move;
  }

  private scoreTile(
    x: number,
    y: number,
    G: MyGameState,
    w: AIWeights,
    playerBuildings: [number, number][],
    opponentBuildings: [number, number][],
    opponentFleets: [number, number][],
  ): number {
    let score = 0;

    // 1. Proximity to player's existing territory → expansion bonus
    if (playerBuildings.length > 0) {
      const minDistToOwn = Math.min(
        ...playerBuildings.map(([bx, by]) => this.hexDist(x, y, bx, by))
      );
      // Closer to own territory = better for expansion
      score += (1 / (1 + minDistToOwn)) * w.territory;
    }

    // 2. Proximity to Faithdom (home area [3,0],[4,0],[3,1],[4,1])
    // Tiles near Faithdom are easier to connect for trade routes
    const distToHome = this.hexDist(x, y, KINGDOM_LOCATION[0], KINGDOM_LOCATION[1]);
    score += (1 / (1 + distToHome)) * w.economy * 0.5;

    // 3. Distance from opponents — depends on personality
    if (opponentBuildings.length > 0) {
      const minDistToEnemy = Math.min(
        ...opponentBuildings.map(([bx, by]) => this.hexDist(x, y, bx, by))
      );

      if (w.military > w.economy) {
        // Aggressive: prefer tiles NEAR opponents (future conflict)
        score += (1 / (1 + minDistToEnemy)) * w.military * 0.3;
      } else {
        // Peaceful: prefer tiles FAR from opponents (low competition)
        score += (minDistToEnemy / (MAP_WIDTH + MAP_HEIGHT)) * w.territory * 0.3;
      }
    }

    // 4. Frontier bonus — tiles with more undiscovered neighbors are
    // at the frontier and open up more future discovery options
    const neighbors = getNeighbors(x, y, true);
    const undiscoveredNeighborCount = neighbors.filter(
      ([nx, ny]) => !G.mapState.discoveredTiles[ny]?.[nx]
    ).length;
    score += undiscoveredNeighborCount * 0.02 * w.positioning;

    // 5. Avoid tiles adjacent to opponent fleets (piracy/conflict risk)
    if (opponentFleets.length > 0) {
      const nearEnemyFleet = opponentFleets.some(
        ([fx, fy]) => this.hexDist(x, y, fx, fy) <= 1
      );
      if (nearEnemyFleet && w.threats > w.military) {
        score -= 0.1 * w.threats;
      }
    }

    // 6. Edge-of-map tiles are less valuable (fewer neighbors, harder to connect)
    const isEdge = x === 0 || x === MAP_WIDTH - 1 || y === 0 || y === MAP_HEIGHT - 1;
    if (isEdge) {
      score -= 0.02;
    }

    return score;
  }

  private shouldPass(
    G: MyGameState,
    playerID: string,
    _ctx: Ctx,
    bestTileScore: number,
  ): boolean {
    // If forced to continue (ocean/legend cascade), never pass
    if (G.mustContinueDiscovery) return false;

    // If best tile score is very low, pass
    if (bestTileScore < 0.01) return true;

    // Count how many players have already passed
    const players = Object.values(G.playerInfo);
    const passedCount = players.filter((p) => p.passed && p.id !== playerID).length;
    const totalOthers = players.length - 1;

    // If most players have passed, and we've already had a turn, consider passing
    if (passedCount >= totalOthers * 0.5 && bestTileScore < 0.05) {
      return true;
    }

    return false;
  }

  private hexDist(x1: number, y1: number, x2: number, y2: number): number {
    // Simple Manhattan-ish hex distance approximation
    const dx = Math.abs(x1 - x2);
    const dy = Math.abs(y1 - y2);
    return dx + dy;
  }

  private getPlayerBuildingLocations(G: MyGameState, playerID: string): [number, number][] {
    const locs: [number, number][] = [];
    G.mapState.buildings.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell.player?.id === playerID && cell.buildings) {
          locs.push([x, y]);
        }
      })
    );
    return locs;
  }

  private getOpponentBuildingLocations(G: MyGameState, playerID: string): [number, number][] {
    const locs: [number, number][] = [];
    G.mapState.buildings.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell.player && cell.player.id !== playerID && cell.buildings) {
          locs.push([x, y]);
        }
      })
    );
    return locs;
  }

  private getOpponentFleetLocations(G: MyGameState, playerID: string): [number, number][] {
    const locs: [number, number][] = [];
    for (const [id, player] of Object.entries(G.playerInfo)) {
      if (id === playerID) continue;
      for (const fleet of player.fleetInfo) {
        if (fleet.skyships > 0) {
          locs.push(fleet.location as [number, number]);
        }
      }
    }
    return locs;
  }
}
