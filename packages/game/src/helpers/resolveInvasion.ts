/**
 * resolveInvasion.ts
 *
 * Handles the "Check for Infidel Invasion" step each round during Resolution.
 * Draws Host counters, triggers invasion when an up-arrow counter appears,
 * and auto-resolves the Grand Army battle.
 *
 * TODO: Replace auto-resolution with interactive sub-phases where:
 * - Archprelate nominates Captain-General
 * - Each player chooses troop/fleet contributions
 * - Infidel Fleet aerial combat is resolved interactively
 * - Buy-off gold offers are made per player
 * - Infidel Fleet targeting/movement each round (strongest player's fleet)
 */

import { MyGameState, InfidelHostCounter } from "../types";
import {
  addVPAmount,
  removeVPAmount,
  increaseHeresyWithinMove,
  increaseOrthodoxyWithinMove,
  logEvent,
} from "./stateUtils";
import { drawFortuneOfWarCard } from "./helpers";
import {
  INFIDEL_EMPIRE_LOCATION,
  CAPTAIN_GENERAL_VP,
  LARGEST_FORCE_VP,
  SECOND_LARGEST_VP,
  TIED_LARGEST_VP,
  TOTAL_KINGDOMS,
} from "../codifiedGameInfo";

// ── Host counter draw ────────────────────────────────────────────────────────

/**
 * Called each round during Resolution. Draws 1 Host counter, checks for
 * invasion trigger, and resolves if needed.
 */
export const checkForInvasion = (G: MyGameState): void => {
  // Grand Infidel Dies event: skip this round's draw
  if (G.eventState.grandInfidelDies) {
    G.eventState.grandInfidelDies = false;
    console.log("Infidel Invasion step skipped (Grand Infidel Dies)");
    return;
  }

  if (G.infidelHostPool.length === 0) {
    console.log("No Infidel Host counters left to draw");
    return;
  }

  // Draw 1 counter
  const drawn = G.infidelHostPool.pop()!;

  if (drawn.isFleet) {
    G.infidelFleet = {
      counter: drawn,
      location: [...INFIDEL_EMPIRE_LOCATION] as [number, number],
      active: true,
    };
    logEvent(G, "Infidel Fleet drawn \u2014 placed at Infidel Empire");
    G.accumulatedHosts.push(drawn);
  } else {
    logEvent(G, `Infidel Host drawn: ${drawn.swords} Swords`);
    G.accumulatedHosts.push(drawn);
  }

  if (drawn.isInvasionTrigger) {
    logEvent(G, "INVASION TRIGGERED! Grand Army of the Faith is raised!");
    resolveGrandArmyBattle(G);
  }
};

// ── Grand Army battle ────────────────────────────────────────────────────────

type PlayerContribution = {
  playerID: string;
  regiments: number;
  levies: number;
  totalSwords: number;
};

/**
 * Auto-resolve the Grand Army vs accumulated Infidel Hosts.
 *
 * TODO: Interactive sub-phase for Captain-General nomination, troop choices,
 * Infidel Fleet aerial combat, and buy-off offers.
 */
const resolveGrandArmyBattle = (G: MyGameState): void => {
  const turnOrder = G.turnOrder;

  // ── 1. Auto-pick Captain-General (must be Orthodox if possible) ──
  let captainGeneral = turnOrder[0];
  for (const id of turnOrder) {
    if (G.playerInfo[id].hereticOrOrthodox === "orthodox") {
      captainGeneral = id;
      break;
    }
  }

  // ── 2. Auto-commit all Kingdom troops per player ──
  const contributions: PlayerContribution[] = [];
  for (const id of turnOrder) {
    const p = G.playerInfo[id];
    const regiments = p.resources.regiments;
    const levies = p.resources.levies;
    contributions.push({
      playerID: id,
      regiments,
      levies,
      totalSwords: regiments * 2 + levies,
    });
    // Troops are committed (removed from kingdom for the battle)
    // They'll be returned after the battle
  }

  // ── 3. Draw Contingent counters as NPR Grand Army (1 per kingdom) ──
  let contingentSwords = 0;
  const contingentsDrawn: number[] = [];
  for (let i = 0; i < TOTAL_KINGDOMS && G.contingentPool.length > 0; i++) {
    const counter = G.contingentPool.pop()!;
    contingentSwords += counter;
    contingentsDrawn.push(counter);
  }

  // ── 4. Note force rankings before combat ──
  const sorted = [...contributions].sort(
    (a, b) => b.totalSwords - a.totalSwords
  );

  // ── 5. Calculate battle ──
  // Grand Army: player troops + contingent counters
  const grandArmySwords =
    contributions.reduce((sum, c) => sum + c.totalSwords, 0) +
    contingentSwords;

  // Infidel: all accumulated non-Fleet Host swords
  // (Fleet fights aerially first — stubbed, so we include it in ground total for now)
  const infidelSwords = G.accumulatedHosts.reduce(
    (sum, h) => sum + h.swords,
    0
  );
  const infidelShields = G.accumulatedHosts.reduce(
    (sum, h) => sum + h.shields,
    0
  );

  // Simulate FoW draws
  const fowArmy = drawFortuneOfWarCard(G);
  const fowInfidel = drawFortuneOfWarCard(G);

  const hitsOnInfidel = Math.max(
    0,
    grandArmySwords + fowArmy.sword - infidelShields - fowInfidel.shield
  );
  const hitsOnArmy = Math.max(
    0,
    infidelSwords + fowInfidel.sword - fowArmy.shield
  );

  const grandArmyWins = hitsOnInfidel >= infidelSwords;

  // ── 6. Apply outcomes ──
  const captainKingdom = G.playerInfo[captainGeneral].kingdomName;
  logEvent(G, `Captain-General: ${captainKingdom} | Grand Army: ${grandArmySwords}S vs Infidel: ${infidelSwords}S`);

  if (grandArmyWins) {
    logEvent(G, "Grand Army of the Faith is victorious!");
    applyVictoryRewards(G, captainGeneral, sorted, turnOrder);
  } else {
    const remainingHostStrength = infidelSwords - hitsOnInfidel;
    logEvent(G, `Grand Army defeated! Buy-off cost: ${remainingHostStrength} Gold`);
    applyDefeatPenalties(
      G,
      captainGeneral,
      sorted,
      turnOrder,
      remainingHostStrength
    );
  }

  // ── 7. Heresy shame — non-contributors ──
  for (const c of contributions) {
    if (c.totalSwords === 0) {
      if (G.playerInfo[c.playerID].hereticOrOrthodox === "orthodox") {
        increaseHeresyWithinMove(G, c.playerID);
      } else {
        increaseOrthodoxyWithinMove(G, c.playerID);
      }
    }
  }

  // ── 8. Return all Host counters to pool ──
  for (const host of G.accumulatedHosts) {
    G.infidelHostPool.push(host);
  }
  G.accumulatedHosts = [];

  // Infidel Fleet retreats to Infidel Empire (if not destroyed)
  // TODO: Track Fleet destruction properly via aerial combat
  if (G.infidelFleet) {
    G.infidelFleet.location = [...INFIDEL_EMPIRE_LOCATION] as [number, number];
  }

  // Return contingent counters to pool
  for (const c of contingentsDrawn) {
    G.contingentPool.push(c);
  }
};

// ── VP reward/penalty helpers ────────────────────────────────────────────────

/** Grand Army wins: Captain-General +3, largest +5, 2nd +2 (tied: +4 each) */
const applyVictoryRewards = (
  G: MyGameState,
  captainGeneral: string,
  sorted: PlayerContribution[],
  turnOrder: string[]
): void => {
  addVPAmount(G, captainGeneral, CAPTAIN_GENERAL_VP);

  if (sorted.length === 0) return;

  // Largest contributor(s)
  const largestSwords = sorted[0].totalSwords;
  const largestGroup = sorted.filter((c) => c.totalSwords === largestSwords);

  if (largestGroup.length > 1) {
    // Tied for largest: +4 VP each
    for (const c of largestGroup) {
      addVPAmount(G, c.playerID, TIED_LARGEST_VP);
    }
  } else {
    addVPAmount(G, largestGroup[0].playerID, LARGEST_FORCE_VP);
    // 2nd largest
    const remaining = sorted.filter((c) => c.totalSwords < largestSwords);
    if (remaining.length > 0) {
      const secondSwords = remaining[0].totalSwords;
      const secondGroup = remaining.filter(
        (c) => c.totalSwords === secondSwords
      );
      if (secondGroup.length > 1) {
        for (const c of secondGroup) {
          addVPAmount(G, c.playerID, TIED_LARGEST_VP);
        }
      } else {
        addVPAmount(G, secondGroup[0].playerID, SECOND_LARGEST_VP);
      }
    }
  }
};

/**
 * Grand Army loses: attempt buy-off, then apply VP penalties.
 * Buy-off cost = remaining Host strength.
 * Captain-General -3, smallest -5, 2nd smallest -2 (tied: -4 each).
 * If buy-off fails: -1 VP per player from least contributed until covered.
 */
const applyDefeatPenalties = (
  G: MyGameState,
  captainGeneral: string,
  sorted: PlayerContribution[],
  turnOrder: string[],
  buyoffCost: number
): void => {
  // ── Buy-off: auto-distribute gold proportionally IPO ──
  let totalGoldOffered = 0;
  const goldOffered: Record<string, number> = {};

  for (const id of turnOrder) {
    const available = Math.max(0, G.playerInfo[id].resources.gold);
    // Auto-offer: proportional share, capped at what they have
    const share = Math.min(
      available,
      Math.ceil(buyoffCost / turnOrder.length)
    );
    goldOffered[id] = share;
    totalGoldOffered += share;
  }

  // If we overshot, reduce from last contributors
  let excess = totalGoldOffered - buyoffCost;
  if (excess > 0 && buyoffCost > 0) {
    for (let i = turnOrder.length - 1; i >= 0 && excess > 0; i--) {
      const reduce = Math.min(excess, goldOffered[turnOrder[i]]);
      goldOffered[turnOrder[i]] -= reduce;
      excess -= reduce;
    }
  }

  // Deduct gold
  const actualTotal = Object.values(goldOffered).reduce((a, b) => a + b, 0);
  for (const id of turnOrder) {
    G.playerInfo[id].resources.gold -= goldOffered[id];
  }

  // ── VP penalties ──
  removeVPAmount(G, captainGeneral, CAPTAIN_GENERAL_VP);

  // Smallest contributor(s) — sorted ascending
  const ascending = [...sorted].sort(
    (a, b) => a.totalSwords - b.totalSwords
  );

  if (ascending.length > 0) {
    const smallestSwords = ascending[0].totalSwords;
    const smallestGroup = ascending.filter(
      (c) => c.totalSwords === smallestSwords
    );

    if (smallestGroup.length > 1) {
      for (const c of smallestGroup) {
        removeVPAmount(G, c.playerID, TIED_LARGEST_VP);
      }
    } else {
      removeVPAmount(G, smallestGroup[0].playerID, LARGEST_FORCE_VP);
      // 2nd smallest
      const remaining = ascending.filter(
        (c) => c.totalSwords > smallestSwords
      );
      if (remaining.length > 0) {
        const secondSwords = remaining[0].totalSwords;
        const secondGroup = remaining.filter(
          (c) => c.totalSwords === secondSwords
        );
        if (secondGroup.length > 1) {
          for (const c of secondGroup) {
            removeVPAmount(G, c.playerID, TIED_LARGEST_VP);
          }
        } else {
          removeVPAmount(G, secondGroup[0].playerID, SECOND_LARGEST_VP);
        }
      }
    }
  }

  // ── If buy-off failed: additional VP losses ──
  const shortfall = buyoffCost - actualTotal;
  if (shortfall > 0) {
    // -1 VP per player from least to most contributed until covered
    let remaining = shortfall;
    const byGold = [...turnOrder].sort(
      (a, b) => (goldOffered[a] ?? 0) - (goldOffered[b] ?? 0)
    );
    for (const id of byGold) {
      if (remaining <= 0) break;
      if (G.playerInfo[id].resources.victoryPoints > 0) {
        removeVPAmount(G, id, 1);
        remaining--;
      }
    }
    // If still short, loop again until all at 0 or covered
    while (remaining > 0) {
      let anyDeducted = false;
      for (const id of byGold) {
        if (remaining <= 0) break;
        if (G.playerInfo[id].resources.victoryPoints > 0) {
          removeVPAmount(G, id, 1);
          remaining--;
          anyDeducted = true;
        }
      }
      if (!anyDeducted) break; // all at 0
    }
  }
};
