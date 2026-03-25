import type { PhaseStrategy, AIPersonality, AIMove } from "../types";
import type { MyGameState } from "../../types";
import type { Ctx } from "boardgame.io";
import { enumerateLegalMoves } from "../enumerate";
import { KINGDOM_LOCATION } from "../../data/gameData";

/**
 * Resolution phase strategy: handles 8 distinct sub-stages.
 * Each sub-stage has completely different legal moves and logic.
 */
export class ResolutionStrategy implements PhaseStrategy {
  selectMove(
    G: MyGameState,
    ctx: Ctx,
    playerID: string,
    personality: AIPersonality
  ): AIMove {
    const moves = enumerateLegalMoves(G, ctx, playerID);
    if (moves.length === 0) return { move: "pass", args: [] };
    if (moves.length === 1) return moves[0];

    switch (G.stage) {
      case "retrieve fleets":
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

    // Should we retrieve? Check if fleets have purpose where they are
    const player = G.playerInfo[playerID];
    const deployedFleets = player.fleetInfo.filter((f) => {
      const isHome = f.location[0] === KINGDOM_LOCATION[0] && f.location[1] === KINGDOM_LOCATION[1];
      return f.skyships > 0 && !isHome;
    });

    if (deployedFleets.length === 0) return passMove ?? moves[0];

    // Territory-focused bots keep fleets deployed (maintaining presence)
    const w = personality.weights;
    if (w.territory > 0.18 || w.positioning > 0.15) {
      // Check if fleets are at our own buildings (guarding them)
      const guarding = deployedFleets.filter((f) => {
        const building = G.mapState.buildings[f.location[1]]?.[f.location[0]];
        return building?.player?.id === playerID && building?.buildings;
      });
      if (guarding.length > 0) {
        return passMove ?? moves[0]; // keep guarding fleets deployed
      }
    }

    // Default: retrieve (get troops back for next round)
    return retrieveMove;
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

    const fleetStrength = fleet.skyships * 1.5 + fleet.regiments + fleet.levies * 0.5 + fleet.eliteRegiments * 1.5;
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
