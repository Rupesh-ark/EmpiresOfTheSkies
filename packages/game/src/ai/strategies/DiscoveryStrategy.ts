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
      return { move: m, score: this.scoreTile(x, y, G, playerID, w, playerBuildings, opponentBuildings, opponentFleets) };
    });

    scored.sort((a, b) => b.score - a.score);

    // Should we pass instead of discovering?
    if (this.shouldPass(G, playerID, ctx, scored[0].score, w)) {
      return passMove;
    }

    return scored[0].move;
  }

  private scoreTile(
    x: number,
    y: number,
    G: MyGameState,
    playerID: string,
    w: AIWeights,
    playerBuildings: [number, number][],
    opponentBuildings: [number, number][],
    opponentFleets: [number, number][],
  ): number {
    let score = 0;
    const player = G.playerInfo[playerID];

    // 0. Heresy bonus: heretics gain from every discovery (heresy advances)
    if (player.hereticOrOrthodox === "heretic") {
      score += 0.03 * w.religion;
    }

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
    w: AIWeights,
  ): boolean {
    // If forced to continue (ocean/legend cascade), never pass
    if (G.mustContinueDiscovery) return false;

    const player = G.playerInfo[playerID];
    const allVPs = Object.values(G.playerInfo).map(p => p.resources.victoryPoints);
    const leaderVP = Math.max(...allVPs);
    const myVP = player.resources.victoryPoints;
    const amLeading = myVP >= leaderVP;
    const vpGap = leaderVP - myVP;

    // Count undiscovered tiles
    let undiscovered = 0;
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        if (!G.mapState.discoveredTiles[y]?.[x]) undiscovered++;
      }
    }

    // Base threshold (lowered from 0.05)
    let threshold = 0.02;

    // Alignment: heretics discover eagerly (heresy helps them),
    // orthodox are selective (heresy hurts, especially pious ones)
    if (player.hereticOrOrthodox === "heretic") {
      threshold *= 0.5;
    } else {
      threshold *= (1 + w.religion); // pious orthodox very selective
    }

    // VP position: leaders rush game clock, trailers stall
    if (amLeading) {
      threshold *= 0.5;
      if (undiscovered < 6) threshold *= 0.3; // finish it
    } else if (vpGap > 5) {
      threshold *= 1.5;
      if (undiscovered < 6) threshold *= 2.0; // stall hard
    }

    // Event awareness: Race to Discovery / Royal Patronage incentivise discovery
    const activeEvent = G.eventState.resolvedEvent;
    if (activeEvent === "race_to_discovery" || activeEvent === "royal_patronage") {
      threshold *= 0.3;
    }

    return bestTileScore < threshold;
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
