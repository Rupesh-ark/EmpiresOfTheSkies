/**
 * resolveInvasion.ts
 *
 * Handles the "Check for Infidel Invasion" step each round during Resolution.
 * Draws Host counters, triggers invasion when an up-arrow counter appears,
 * and resolves the Grand Army battle. Interactive sub-phases (nomination,
 * contribution, buyoff) are handled by moves in moves/events/.
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
} from "../data/gameData";

// ── Host counter draw ────────────────────────────────────────────────────────

/**
 * Called each round during Resolution. Draws 1 Host counter and checks
 * for invasion trigger. Returns true if invasion was triggered (caller
 * should set up the interactive invasion flow).
 */
export const checkForInvasion = (G: MyGameState): boolean => {
  // Grand Infidel Dies event: skip this round's draw
  if (G.eventState.grandInfidelDies) {
    G.eventState.grandInfidelDies = false;
    logEvent(G, "Infidel Invasion step skipped (Grand Infidel Dies)");
    return false;
  }

  if (G.infidelHostPool.length === 0) {
    return false;
  }

  // Draw 1 counter
  const drawn = G.infidelHostPool.pop()!;

  if (drawn.isFleet) {
    G.infidelFleet = {
      counter: drawn,
      location: [...INFIDEL_EMPIRE_LOCATION] as [number, number],
      active: true,
      destroyed: false,
    };
    logEvent(G, "Infidel Fleet drawn \u2014 placed at Infidel Empire");
    G.accumulatedHosts.push(drawn);
  } else {
    logEvent(G, `Infidel Host drawn: ${drawn.swords} Swords`);
    G.accumulatedHosts.push(drawn);
  }

  if (drawn.isInvasionTrigger) {
    logEvent(G, "INVASION TRIGGERED! Grand Army of the Faith is raised!");
    const totalHostSwords = G.accumulatedHosts.reduce(
      (sum, h) => sum + h.swords, 0
    );
    G.currentInvasion = {
      totalHostSwords,
      contributions: {},
      phase: "nominate",
    };
    return true;
  }

  return false;
};

/**
 * Setup the interactive invasion: find the Archprelate to nominate.
 * Returns the Archprelate's player ID.
 */
export const getArchprelateForNomination = (G: MyGameState): string | null => {
  const archprelate = Object.values(G.playerInfo).find(
    (p) => p.isArchprelate
  );
  return archprelate?.id ?? null;
};

// ── Grand Army battle ────────────────────────────────────────────────────────

type PlayerContribution = {
  playerID: string;
  regiments: number;
  levies: number;
  skyships: number;
  totalSwords: number;
  totalShields: number;
};

/**
 * Resolve the Grand Army battle using contributions from currentInvasion
 * and the Captain-General from PlayerInfo.isCaptainGeneral.
 *
 * Returns the buy-off cost if the army lost (> 0), or 0 if won.
 */
export const resolveGrandArmyBattle = (G: MyGameState, shuffle: <T>(arr: T[]) => T[]): number => {
  const turnOrder = G.turnOrder;
  const invasion = G.currentInvasion;
  if (!invasion) return;

  // Find Captain-General from PlayerInfo
  const captainGeneral = turnOrder.find(
    (id) => G.playerInfo[id].isCaptainGeneral
  ) ?? turnOrder[0];

  // Build contributions from currentInvasion
  const contributions: PlayerContribution[] = turnOrder.map((id) => {
    const c = invasion.contributions[id] ?? { regiments: 0, levies: 0, skyships: 0 };
    return {
      playerID: id,
      regiments: c.regiments,
      levies: c.levies,
      skyships: c.skyships,
      totalSwords: c.regiments * 2 + c.levies + c.skyships,
      totalShields: c.skyships, // each skyship contributes 1 shield
    };
  });

  // ── Draw Contingent counters as NPR Grand Army (1 per kingdom) ──
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
  // Grand Army: player troops + skyship shields + contingent counters
  const grandArmySwords =
    contributions.reduce((sum, c) => sum + c.totalSwords, 0) +
    contingentSwords;
  const grandArmyShields =
    contributions.reduce((sum, c) => sum + c.totalShields, 0);

  // Infidel: all accumulated non-Fleet Host swords
  const infidelSwords = G.accumulatedHosts.reduce(
    (sum, h) => sum + h.swords,
    0
  );
  const infidelShields = G.accumulatedHosts.reduce(
    (sum, h) => sum + h.shields,
    0
  );

  // Simulate FoW draws
  const fowArmy = drawFortuneOfWarCard(G, shuffle);
  const fowInfidel = drawFortuneOfWarCard(G, shuffle);

  const hitsOnInfidel = Math.max(
    0,
    grandArmySwords + fowArmy.sword - infidelShields - fowInfidel.shield
  );
  const hitsOnArmy = Math.max(
    0,
    infidelSwords + fowInfidel.sword - grandArmyShields - fowArmy.shield
  );

  const grandArmyWins = hitsOnInfidel >= infidelSwords;

  // ── 6. Apply outcomes ──
  const captainKingdom = G.playerInfo[captainGeneral].kingdomName;
  logEvent(G, `Captain-General: ${captainKingdom} | Grand Army: ${grandArmySwords}S vs Infidel: ${infidelSwords}S`);

  let buyoffCost = 0;

  if (grandArmyWins) {
    logEvent(G, "Grand Army of the Faith is victorious!");
    applyVictoryRewards(G, captainGeneral, sorted, turnOrder);
  } else {
    buyoffCost = infidelSwords - hitsOnInfidel;
    logEvent(G, `Grand Army defeated! Buy-off cost: ${buyoffCost} Gold`);
    // VP penalties applied now; buy-off gold handled interactively by caller
    applyDefeatVPPenalties(G, captainGeneral, sorted);
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
  if (G.infidelFleet && !G.infidelFleet.destroyed) {
    G.infidelFleet.location = [...INFIDEL_EMPIRE_LOCATION] as [number, number];
  }

  // Return contingent counters to pool
  for (const c of contingentsDrawn) {
    G.contingentPool.push(c);
  }

  // Clear invasion state (Captain-General persists until next nomination)
  // Don't clear if buy-off is needed — caller will set phase to "buyoff"
  if (buyoffCost === 0) {
    G.currentInvasion = null;
  }

  return buyoffCost;
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

/** Apply VP penalties for defeat (Captain-General -3, smallest -5, 2nd smallest -2) */
const applyDefeatVPPenalties = (
  G: MyGameState,
  captainGeneral: string,
  sorted: PlayerContribution[]
): void => {
  removeVPAmount(G, captainGeneral, CAPTAIN_GENERAL_VP);

  const ascending = [...sorted].sort((a, b) => a.totalSwords - b.totalSwords);
  if (ascending.length === 0) return;

  const smallestSwords = ascending[0].totalSwords;
  const smallestGroup = ascending.filter((c) => c.totalSwords === smallestSwords);

  if (smallestGroup.length > 1) {
    for (const c of smallestGroup) removeVPAmount(G, c.playerID, TIED_LARGEST_VP);
  } else {
    removeVPAmount(G, smallestGroup[0].playerID, LARGEST_FORCE_VP);
    const remaining = ascending.filter((c) => c.totalSwords > smallestSwords);
    if (remaining.length > 0) {
      const secondSwords = remaining[0].totalSwords;
      const secondGroup = remaining.filter((c) => c.totalSwords === secondSwords);
      if (secondGroup.length > 1) {
        for (const c of secondGroup) removeVPAmount(G, c.playerID, TIED_LARGEST_VP);
      } else {
        removeVPAmount(G, secondGroup[0].playerID, SECOND_LARGEST_VP);
      }
    }
  }
};

/**
 * Apply the buy-off gold and shortfall VP penalties.
 * Called from the offerBuyoffGold move after all players have offered.
 */
export const applyBuyoff = (G: MyGameState): void => {
  const invasion = G.currentInvasion;
  if (!invasion?.buyoffCost || !invasion.buyoffOffered) return;

  const turnOrder = G.turnOrder;
  const offered = invasion.buyoffOffered;

  // Deduct gold
  for (const id of turnOrder) {
    G.playerInfo[id].resources.gold -= offered[id] ?? 0;
  }

  const totalOffered = Object.values(offered).reduce((a, b) => a + b, 0);
  const shortfall = invasion.buyoffCost - totalOffered;

  logEvent(G, `Buy-off: ${totalOffered} Gold offered of ${invasion.buyoffCost} required`);

  if (shortfall > 0) {
    logEvent(G, `Shortfall: ${shortfall} Gold \u2014 VP penalties applied`);
    let remaining = shortfall;
    const byGold = [...turnOrder].sort(
      (a, b) => (offered[a] ?? 0) - (offered[b] ?? 0)
    );
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
      if (!anyDeducted) break;
    }
  }

  // Clear invasion state
  G.currentInvasion = null;
};
