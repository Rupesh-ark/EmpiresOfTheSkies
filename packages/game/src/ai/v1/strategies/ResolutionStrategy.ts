import type { PhaseStrategy, AIPersonality, AIMove, AIWeights, ScoredAIMove } from "../../types";
import type { MyGameState, FleetInfo } from "../../../types";
import type { Ctx } from "boardgame.io";
import { KINGDOM_LOCATION } from "../../../data/gameData";
import { calculateFleetStrength } from "../../../helpers/fleetUtils";
import { countActiveTradeRoutes } from "../../../helpers/mapUtils";

/**
 * Resolution phase strategy: handles 8 distinct sub-stages.
 * Each sub-stage has completely different legal moves and logic.
 */
export class ResolutionStrategy implements PhaseStrategy {
  selectMove(
    G: MyGameState,
    ctx: Ctx,
    playerID: string,
    personality: AIPersonality,
    availableMoves?: AIMove[]
  ): ScoredAIMove {
    const moves = availableMoves ?? [];
    if (moves.length === 0) return { move: { move: "pass", args: [] }, score: 0 };
    if (moves.length === 1) return { move: moves[0], score: 0 };

    const chosen = (() => {
      switch (G.stage.sub) {
        case "retrieve_fleets":
          return this.retrieveFleets(G, playerID, personality, moves);
        case "infidel_fleet_combat":
          return this.infidelFleetCombat(G, playerID, personality, moves);
        case "deferred_battle":
          return this.deferredBattle(G, playerID, moves);
        case "rebellion":
          return this.rebellion(G, playerID, personality, moves);
        case "rebellion_rival_support":
          return this.rebellionRivalSupport(G, playerID, personality, moves);
        case "invasion_nominate":
          return this.invasionNominate(G, playerID, moves);
        case "invasion_contribute":
          return this.invasionContribute(G, playerID, personality, moves);
        case "invasion_buyoff":
          return this.invasionBuyoff(G, playerID, personality, moves);
        default:
          return moves[0];
      }
    })();

    return { move: chosen, score: 0 };
  }

  // ── Retrieve Fleets ─────────────────────────────────────────────────────

  private retrieveFleets(
    G: MyGameState,
    playerID: string,
    personality: AIPersonality,
    moves: AIMove[]
  ): AIMove {
    const retrieveMove = moves.find((m) => m.move === "retrieveFleets");
    const passMove = moves.find((m) => m.move === "pass");

    if (!retrieveMove) return passMove ?? moves[0];

    const player = G.playerInfo[playerID];
    const w = personality.weights;
    const deployedFleets = player.fleetInfo.filter((f) => {
      const isHome = f.location[0] === KINGDOM_LOCATION[0] && f.location[1] === KINGDOM_LOCATION[1];
      return f.skyships > 0 && !isHome;
    });

    if (deployedFleets.length === 0) return passMove ?? moves[0];

    // Score each fleet: is it generating value where it is?
    // Threshold: roughly "is this fleet worth more than the 1-2 gold to redeploy?"
    const idleIndices: number[] = [];
    for (const fleet of deployedFleets) {
      const score = this.scoreFleetPosition(G, playerID, fleet, w);
      if (score < 0.01) {
        // Fleet is idle — retrieve it
        idleIndices.push(fleet.fleetId);
      }
    }

    if (idleIndices.length === 0) {
      // All fleets are useful — keep them all deployed
      return passMove ?? moves[0];
    }

    if (idleIndices.length === deployedFleets.length) {
      // All fleets are idle — retrieve all
      return retrieveMove;
    }

    // Selective retrieval: find the move that retrieves only idle fleets
    const selectiveMove = moves.find((m) => {
      if (m.move !== "retrieveFleets") return false;
      const indices = m.args[0] as number[];
      return indices.length === idleIndices.length &&
        indices.every((idx) => idleIndices.includes(idx));
    });

    return selectiveMove ?? retrieveMove;
  }

  /**
   * Score a deployed fleet's position: is it generating value where it is?
   * Returns 0 for idle fleets, higher values for fleets doing useful work.
   *
   * Reasons to keep deployed (from strategic guide):
   * 1. Trade route protection — fleet prevents piracy on your route
   * 2. Garrison reinforcement — fleet on colony deters ground attacks
   * 3. Piracy positioning — fleet on rival route generates income
   * 4. Blocking rival from sole occupation (preventing conquest)
   *
   * Retrieve when: empty ocean, no rival routes, no land to guard.
   */
  private scoreFleetPosition(
    G: MyGameState,
    playerID: string,
    fleet: FleetInfo,
    w: AIWeights
  ): number {
    const [fx, fy] = fleet.location;
    let score = 0;

    const building = G.mapState.buildings[fy]?.[fx];
    const tile = G.mapState.currentTileArray[fy]?.[fx];
    const playersOnTile = G.mapState.battleMap[fy]?.[fx] ?? [];

    // 1. Guarding own building — strongest reason to stay
    if (building?.player?.id === playerID && building?.buildings) {
      const isColony = building.buildings === "colony";
      score += isColony ? 0.08 : 0.04; // colonies more valuable
      score += 0.02; // base deterrent value
      if (fleet.regiments + fleet.eliteRegiments > 0) {
        score += 0.03; // armed fleet is better deterrent
      }
    }

    // 2. Trade route contribution — fleet skyships form part of the chain
    // Check if this player has active trade routes passing through this tile
    const routesBefore = countActiveTradeRoutes(G, playerID);
    if (routesBefore > 0 && tile && tile.type === "land") {
      // If this fleet is on a land tile and we have routes, it likely helps
      score += 0.04;
    }

    // 3. Piracy positioning — rival fleet/building on same tile
    const rivalsOnTile = playersOnTile.filter((id: string) => id !== playerID);
    if (rivalsOnTile.length > 0) {
      // Piracy opportunity or blocking rival
      score += 0.04;
      // Blocking rival from conquest (they can't conquer while we're here)
      if (rivalsOnTile.some((rid: string) => {
        const rBuilding = G.mapState.buildings[fy]?.[fx];
        return rBuilding?.player?.id === rid;
      })) {
        score += 0.02; // we're contesting their territory
      }
    }

    // 4. Fleet on empty ocean/undiscovered tile doing nothing
    if (tile?.type === "ocean" && rivalsOnTile.length === 0 && !building?.player) {
      score -= 0.02; // actively penalise idle ocean fleets
    }

    // 5. Positioning value — fleet presence on the map has inherent strategic value
    score += 0.01;

    return score;
  }

  // ── Infidel Fleet Combat ────────────────────────────────────────────────

  private infidelFleetCombat(
    G: MyGameState,
    playerID: string,
    personality: AIPersonality,
    moves: AIMove[]
  ): AIMove {
    const fightMove = moves.find((m) => m.args[0] === "fight");
    const evadeMove = moves.find((m) => m.args[0] === "evade");

    if (!fightMove || !evadeMove) return moves[0];

    // Check fleet strength at the combat location
    const combat = G.infidelFleetCombat;
    if (!combat) return evadeMove;

    const player = G.playerInfo[playerID];
    const fleet = player.fleetInfo[combat.fleetIndex];
    if (!fleet) return evadeMove;

    const fleetStrength = calculateFleetStrength(fleet);
    const aggression = personality.tacticalPreferences.aggressionLevel;

    // Fight if strong enough (infidel fleet has ~3-5 swords typically)
    const fightThreshold = 4 - aggression * 2; // 2-4 strength needed
    return fleetStrength >= fightThreshold ? fightMove : evadeMove;
  }

  // ── Deferred Battle ─────────────────────────────────────────────────────

  private deferredBattle(
    G: MyGameState,
    playerID: string,
    moves: AIMove[]
  ): AIMove {
    // Commit best FoW card from hand
    const commitMoves = moves.filter((m) => m.move === "commitDeferredBattleCard");
    if (commitMoves.length === 0) return moves[0];

    const hand = G.playerInfo[playerID].resources.fortuneCards;
    let bestIdx = 0;
    let bestSword = -1;

    for (const m of commitMoves) {
      const cardIdx = m.args[0] as number;
      const card = hand[cardIdx];
      if (card && card.sword > bestSword) {
        bestSword = card.sword;
        bestIdx = commitMoves.indexOf(m);
      }
    }

    return commitMoves[bestIdx] ?? moves[0];
  }

  // ── Rebellion ───────────────────────────────────────────────────────────

  private rebellion(
    G: MyGameState,
    playerID: string,
    personality: AIPersonality,
    moves: AIMove[]
  ): AIMove {
    const commitMoves = moves.filter((m) => m.move === "commitRebellionTroops");
    if (commitMoves.length === 0) return moves[0];

    const player = G.playerInfo[playerID];
    const rebellion = G.currentRebellion;
    if (!rebellion) return commitMoves[0];

    // How many swords does the rebellion have?
    const rebelSwords = rebellion.counterSwords;
    const aggression = personality.tacticalPreferences.aggressionLevel;

    // Commit enough troops to likely win
    // Each regiment ≈ 1 sword equivalent + FoW card bonus
    const available = player.resources.regiments;
    const targetCommit = Math.ceil(rebelSwords * (1.2 - aggression * 0.2));
    const commit = Math.min(available, Math.max(0, targetCommit));

    // Find the move closest to our target
    let bestMove = commitMoves[0];
    let bestDiff = Infinity;
    for (const m of commitMoves) {
      const amount = m.args[0] as number;
      const diff = Math.abs(amount - commit);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestMove = m;
      }
    }

    return bestMove;
  }

  // ── Rebellion Rival Support ─────────────────────────────────────────────

  private rebellionRivalSupport(
    G: MyGameState,
    playerID: string,
    personality: AIPersonality,
    moves: AIMove[]
  ): AIMove {
    // Decide: support the defender or the rebels?
    // Aggressive bots against the leader support rebels
    // Others support defenders (stability)
    const rebellion = G.currentRebellion;
    if (!rebellion) return moves[0];

    const targetID = rebellion.event.targetPlayerID;
    const allPlayers = Object.values(G.playerInfo);
    const leaderVP = Math.max(...allPlayers.map((p) => p.resources.victoryPoints));
    const targetVP = G.playerInfo[targetID]?.resources.victoryPoints ?? 0;
    const targetIsLeader = targetVP === leaderVP;
    const aggression = personality.tacticalPreferences.aggressionLevel;

    // If target is the leader and we're aggressive, support rebels
    if (targetIsLeader && aggression > 0.5 && targetID !== playerID) {
      // Find rebel support moves (contribute troops to rebel side)
      const rebelMoves = moves.filter((m) =>
        String(m.args?.[0]).includes("rebel") || m.args?.[1] === "rebel"
      );
      if (rebelMoves.length > 0) return rebelMoves[0];
    }

    // Default: minimal contribution or support defender
    // Find the move that commits the least troops
    let minCommit = Infinity;
    let bestMove = moves[0];
    for (const m of moves) {
      const amount = typeof m.args[0] === "number" ? m.args[0] : 0;
      if (amount < minCommit) {
        minCommit = amount;
        bestMove = m;
      }
    }

    return bestMove;
  }

  // ── Invasion: Nominate Captain General ───────────────────────────────────

  private invasionNominate(
    G: MyGameState,
    playerID: string,
    moves: AIMove[]
  ): AIMove {
    const nominateMoves = moves.filter((m) => m.move === "nominateCaptainGeneral");
    if (nominateMoves.length === 0) return moves[0];

    const eligible = G.currentInvasion?.eligibleCaptainGenerals ?? [];

    // Nominate the weakest military player (least regiments + skyships)
    // Unless that's us — then nominate second weakest
    let bestTarget: string | null = null;
    let lowestMil = Infinity;

    for (const id of eligible) {
      const p = G.playerInfo[id];
      if (!p) continue;
      const mil = p.resources.regiments + p.resources.skyships +
        p.fleetInfo.reduce((s, f) => s + f.regiments + f.skyships, 0);
      if (mil < lowestMil && id !== playerID) {
        lowestMil = mil;
        bestTarget = id;
      }
    }

    // If we're the only option, nominate self
    if (!bestTarget) bestTarget = playerID;

    const targetMove = nominateMoves.find((m) => m.args[0] === bestTarget);
    return targetMove ?? nominateMoves[0];
  }

  // ── Invasion: Contribute ────────────────────────────────────────────────

  private invasionContribute(
    G: MyGameState,
    playerID: string,
    personality: AIPersonality,
    moves: AIMove[]
  ): AIMove {
    const contributeMoves = moves.filter((m) => m.move === "contributeToGrandArmy");
    if (contributeMoves.length === 0) return moves[0];

    // Contribute proportional to military weight and available troops
    const player = G.playerInfo[playerID];
    const invasion = G.currentInvasion;
    if (!invasion) return contributeMoves[0];

    const totalHostSwords = invasion.totalHostSwords;
    const numPlayers = Object.keys(G.playerInfo).length;
    const fairShare = Math.ceil(totalHostSwords / numPlayers);

    // Military bots contribute more, economic bots contribute minimum
    const w = personality.weights;
    const willingness = 0.5 + w.military * 0.5; // 0.5 to 1.0
    const targetContrib = Math.ceil(fairShare * willingness);
    const available = player.resources.regiments;
    const commit = Math.min(available, targetContrib);

    let bestMove = contributeMoves[0];
    let bestDiff = Infinity;
    for (const m of contributeMoves) {
      const amount = m.args[0] as number;
      const diff = Math.abs(amount - commit);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestMove = m;
      }
    }

    return bestMove;
  }

  // ── Invasion: Buyoff ────────────────────────────────────────────────────

  private invasionBuyoff(
    G: MyGameState,
    playerID: string,
    personality: AIPersonality,
    moves: AIMove[]
  ): AIMove {
    const buyoffMoves = moves.filter((m) => m.move === "offerBuyoffGold");
    if (buyoffMoves.length === 0) return moves[0];

    const player = G.playerInfo[playerID];
    const buyoffCost = G.currentInvasion?.buyoffCost ?? 0;
    const w = personality.weights;

    // Economic bots prefer paying gold over losing troops
    // Military bots prefer fighting
    if (w.economy > w.military && player.resources.gold >= buyoffCost) {
      // Find the move that pays the buyoff
      const payMove = buyoffMoves.find((m) => (m.args[0] as number) >= buyoffCost);
      if (payMove) return payMove;
    }

    // Default: offer minimum
    let minOffer = Infinity;
    let bestMove = buyoffMoves[0];
    for (const m of buyoffMoves) {
      const amount = m.args[0] as number;
      if (amount < minOffer) {
        minOffer = amount;
        bestMove = m;
      }
    }

    return bestMove;
  }
}
