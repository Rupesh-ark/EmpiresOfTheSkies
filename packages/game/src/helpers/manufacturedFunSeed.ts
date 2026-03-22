/**
 * Manufactured Fun Seeding — setup algorithms that guarantee balanced card
 * distribution so every game has natural rivalry and counter-play.
 *
 * Three systems:
 *  1. KA pool filtering     – preserves rivalry pairs when reducing pool size
 *  2. Legacy seeded deal     – pool-based deal with rivalry/synergy/colour checks
 *  3. Event deck epoch split – early-game vs late-game deck separation
 */

import {
  KingdomAdvantageCard,
  LegacyCardInfo,
  LegacyCardName,
  EventCardName,
} from "../types";

// ── KA Rivalry Groups ──────────────────────────────────────────────────────────

/** Each pair must be kept together or removed together. */
const KA_RIVALRY_GROUPS: [KingdomAdvantageCard, KingdomAdvantageCard][] = [
  ["licenced_smugglers", "sanctioned_piracy"],       // Group A — Economic
  ["elite_regiments", "improved_training"],           // Group B — Military
  ["patriarch_of_the_church", "more_prisons"],        // Group C — Religious
];

const KA_WILD_CARD: KingdomAdvantageCard = "more_efficient_taxation";

/**
 * Filter the KA pool by player count, ensuring no rivalry pair is broken.
 *
 * Target pool size = numPlayers + 1 (so the last drafter still has a choice).
 *
 * Removal strategy:
 *  - Even target size → remove wild card + enough full pairs
 *  - Odd target size  → keep wild card, remove full pairs only
 */
export function filterKAPool(
  allCards: readonly KingdomAdvantageCard[],
  numPlayers: number,
  shuffle: <T>(arr: T[]) => T[],
): { pool: KingdomAdvantageCard[]; log: string[] } {
  const log: string[] = [];
  const targetSize = Math.min(7, numPlayers + 1);

  if (targetSize >= 7) {
    log.push("KA seeding: all 7 cards available");
    return { pool: [...allCards], log };
  }

  // Randomly order groups so the removed pair(s) vary between games
  const groups = shuffle([...KA_RIVALRY_GROUPS]);

  const removedSet = new Set<KingdomAdvantageCard>();
  let wildRemoved = false;

  if (targetSize % 2 === 0) {
    // Even target: remove wild + pairs
    wildRemoved = true;
    removedSet.add(KA_WILD_CARD);
    const pairsToRemove = (7 - 1 - targetSize) / 2; // (currentSize after wild removal - target) / 2
    for (let i = 0; i < pairsToRemove; i++) {
      removedSet.add(groups[i][0]);
      removedSet.add(groups[i][1]);
    }
  } else {
    // Odd target: keep wild, remove pairs only
    const pairsToRemove = (7 - targetSize) / 2;
    for (let i = 0; i < pairsToRemove; i++) {
      removedSet.add(groups[i][0]);
      removedSet.add(groups[i][1]);
    }
  }

  const pool = allCards.filter((c) => !removedSet.has(c));

  // Logging
  if (wildRemoved) log.push(`KA seeding: removed wild card (${KA_WILD_CARD})`);
  for (const [a, b] of groups) {
    if (removedSet.has(a)) log.push(`KA seeding: removed rivalry pair [${a}, ${b}]`);
  }
  log.push(`KA seeding: ${pool.length} cards for ${numPlayers} players`);

  return { pool, log };
}

// ── Legacy Card Seeded Deal ────────────────────────────────────────────────────

const POOL_ALPHA: LegacyCardName[] = ["the conqueror", "the navigator", "the merchant"];
const POOL_BETA: LegacyCardName[] = ["the pious", "the magnificent"];
const POOL_GAMMA: LegacyCardName[] = ["the great", "the builder", "the aviator", "the mighty"];

/** Nuclear combos: if a player has this KA + this legacy, the counter must exist elsewhere. */
const NUCLEAR_COMBOS: {
  ka: KingdomAdvantageCard;
  legacy: LegacyCardName;
  counter: LegacyCardName;
}[] = [
  { ka: "licenced_smugglers", legacy: "the merchant", counter: "the mighty" },
  { ka: "improved_training", legacy: "the conqueror", counter: "the mighty" },
  { ka: "more_efficient_taxation", legacy: "the great", counter: "the navigator" },
  { ka: "patriarch_of_the_church", legacy: "the pious", counter: "the magnificent" },
];

/**
 * Seeded deal algorithm for legacy cards.
 *
 * 1. Sort 18 cards into pools α (colonial), β (religious), γ (generalist)
 * 2. Deal 1 from each pool per player (fallback if pool runs out)
 * 3. Rivalry presence checks — ensure counters exist at the table
 * 4. Cross-system synergy check — ensure nuclear combos have counters
 * 5. Soft colour balance — fix all-same-colour hands if possible
 * 6. Shuffle within each hand to hide pool origin
 */
export function seedLegacyDeal(
  allCards: readonly LegacyCardInfo[],
  playerIDs: string[],
  playerKAs: Record<string, KingdomAdvantageCard | undefined>,
  shuffle: <T>(arr: T[]) => T[],
): { hands: Record<string, LegacyCardInfo[]>; remainder: LegacyCardInfo[]; log: string[] } {
  const log: string[] = [];

  // STEP 1 — Sort into pools and shuffle each
  const poolA = shuffle([...allCards].filter((c) => (POOL_ALPHA as string[]).includes(c.name)));
  const poolB = shuffle([...allCards].filter((c) => (POOL_BETA as string[]).includes(c.name)));
  const poolG = shuffle([...allCards].filter((c) => (POOL_GAMMA as string[]).includes(c.name)));

  log.push(`Legacy seeding: pools α=${poolA.length}, β=${poolB.length}, γ=${poolG.length}`);

  // STEP 2 — Deal 1 from each pool per player
  const hands: Record<string, LegacyCardInfo[]> = {};

  for (const id of playerIDs) {
    hands[id] = [];

    // Colonial (Pool α)
    if (poolA.length > 0) {
      hands[id].push(poolA.pop()!);
    }

    // Religious (Pool β) — falls back to γ if β is empty (5–6 players)
    if (poolB.length > 0) {
      hands[id].push(poolB.pop()!);
    } else if (poolG.length > 0) {
      hands[id].push(poolG.pop()!);
    }

    // Generalist (Pool γ) — falls back to α if γ is empty
    if (poolG.length > 0) {
      hands[id].push(poolG.pop()!);
    } else if (poolA.length > 0) {
      hands[id].push(poolA.pop()!);
    }

    // Safety: if hand is still short, fill from any pool
    while (hands[id].length < 3) {
      if (poolA.length > 0) hands[id].push(poolA.pop()!);
      else if (poolB.length > 0) hands[id].push(poolB.pop()!);
      else if (poolG.length > 0) hands[id].push(poolG.pop()!);
      else break;
    }
  }

  // Leftover cards → remainder (used by Royal Succession event)
  const remainder: LegacyCardInfo[] = [...poolA, ...poolB, ...poolG];

  // ── Helpers for rivalry checks ──

  /** Does any player other than `excludeID` have a card with the given name? */
  const someoneElseHas = (name: string, excludeID: string): boolean =>
    playerIDs.some(
      (id) => id !== excludeID && hands[id].some((c) => c.name === name),
    );

  /**
   * Try to swap a card with `targetName` from the remainder into another
   * player's hand (not `excludeID`). Returns true if swap succeeded.
   */
  const trySwapIn = (targetName: string, excludeID: string, preferSlot: number): boolean => {
    const ri = remainder.findIndex((c) => c.name === targetName);
    if (ri === -1) return false;

    for (const id of playerIDs) {
      if (id === excludeID) continue;
      const slot = Math.min(preferSlot, hands[id].length - 1);
      if (slot < 0) continue;

      const swappedOut = hands[id][slot];
      hands[id][slot] = remainder[ri];
      remainder[ri] = swappedOut;
      log.push(
        `Legacy rivalry: swapped ${targetName} (${remainder[ri].colour}) into player ${id} hand, ` +
        `replaced ${swappedOut.name} (${swappedOut.colour})`,
      );
      return true;
    }
    return false;
  };

  // STEP 3 — Rivalry presence checks

  // 3a: Conqueror ↔ Navigator (or Mighty as secondary counter)
  for (const id of playerIDs) {
    if (hands[id].some((c) => c.name === "the conqueror")) {
      if (!someoneElseHas("the navigator", id) && !someoneElseHas("the mighty", id)) {
        if (!trySwapIn("the navigator", id, 2)) {
          trySwapIn("the mighty", id, 2);
        }
      }
    }
  }

  // 3b: Pious ↔ Magnificent
  for (const id of playerIDs) {
    if (hands[id].some((c) => c.name === "the pious")) {
      if (!someoneElseHas("the magnificent", id)) {
        trySwapIn("the magnificent", id, 1);
      }
    }
    if (hands[id].some((c) => c.name === "the magnificent")) {
      if (!someoneElseHas("the pious", id)) {
        trySwapIn("the pious", id, 1);
      }
    }
  }

  // 3c: Builder ↔ Great
  for (const id of playerIDs) {
    if (hands[id].some((c) => c.name === "the builder")) {
      if (!someoneElseHas("the great", id)) {
        trySwapIn("the great", id, 2);
      }
    }
    if (hands[id].some((c) => c.name === "the great")) {
      if (!someoneElseHas("the builder", id)) {
        trySwapIn("the builder", id, 2);
      }
    }
  }

  // STEP 4 — Cross-system synergy check (at most 1 swap)
  let synergySwaped = false;
  for (const combo of NUCLEAR_COMBOS) {
    if (synergySwaped) break;
    for (const id of playerIDs) {
      if (synergySwaped) break;
      if (
        playerKAs[id] === combo.ka &&
        hands[id].some((c) => c.name === combo.legacy)
      ) {
        if (!someoneElseHas(combo.counter, id)) {
          if (trySwapIn(combo.counter, id, 2)) {
            log.push(
              `Legacy synergy: ensured ${combo.counter} exists as counter to ` +
              `${combo.ka} + ${combo.legacy} (player ${id})`,
            );
            synergySwaped = true;
          }
        }
      }
    }
  }

  // STEP 5 — Soft colour balance
  for (const id of playerIDs) {
    const hand = hands[id];
    if (hand.length < 3) continue;

    const allSameColour = hand.every((c) => c.colour === hand[0].colour);
    if (!allSameColour) continue;

    const colour = hand[0].colour;
    const opposite = colour === "purple" ? "orange" : "purple";

    // Try swapping slot 2 (generalist) then slot 0 (colonial) for opposite colour of same name
    for (const slot of [2, 0]) {
      if (slot >= hand.length) continue;
      const card = hand[slot];
      const ri = remainder.findIndex((c) => c.name === card.name && c.colour === opposite);
      if (ri !== -1) {
        const old = hand[slot];
        hand[slot] = remainder[ri];
        remainder[ri] = old;
        log.push(
          `Legacy colour: fixed all-${colour} hand for player ${id} — ` +
          `swapped ${card.name} (${colour} → ${opposite})`,
        );
        break;
      }
    }
  }

  // STEP 6 — Shuffle within hands (hide pool origin)
  for (const id of playerIDs) {
    hands[id] = shuffle(hands[id]);
  }

  log.push(
    `Legacy seeding complete: ${playerIDs.length} hands dealt, ${remainder.length} cards in remainder`,
  );

  return { hands, remainder, log };
}

// ── Event Deck Epoch Split ─────────────────────────────────────────────────────

/** Events deferred to late deck (void at game start, or unfair tie-targeting in round 1) */
const LATE_GAME_EVENTS: ReadonlySet<EventCardName> = new Set<EventCardName>([
  "allies_in_faerie" as EventCardName,
  "colonial_prelates" as EventCardName,
  "colonial_rebellion" as EventCardName,
  "faerie_uprising" as EventCardName,
  "headstrong_commander" as EventCardName,
  "infidels_invade_faerie" as EventCardName,
  "monsters_awake" as EventCardName,
  "mysterious_disappearances" as EventCardName,
  "orthodox_rebellion" as EventCardName,
  "peasant_rebellion" as EventCardName,
  "pretender_rebellion" as EventCardName,
  "return_to_orthodoxy" as EventCardName,
  "royal_succession" as EventCardName,
  "schism" as EventCardName,
  "the_faerie_plague" as EventCardName,
  "treacherous_creatures" as EventCardName,
]);

/**
 * Split the event deck into early-game (viable from round 1) and late-game
 * (void at start, merged into the active deck at round 2).
 *
 * Conditional cards:
 *  - dynastic_marriage → late if < 4 players
 *  - a_kingdom_turns_heretic → late if 6 players (no NPR kingdoms)
 */
export function classifyEventDeck(
  allCards: readonly EventCardName[],
  numPlayers: number,
  shuffle: <T>(arr: T[]) => T[],
): { earlyDeck: EventCardName[]; lateDeck: EventCardName[]; log: string[] } {
  const log: string[] = [];

  // Build the set of late cards for this player count
  const lateSet = new Set<EventCardName>(LATE_GAME_EVENTS);
  if (numPlayers < 4) lateSet.add("dynastic_marriage" as EventCardName);
  if (numPlayers >= 6) lateSet.add("a_kingdom_turns_heretic" as EventCardName);

  const early: EventCardName[] = [];
  const late: EventCardName[] = [];

  for (const card of allCards) {
    if (lateSet.has(card)) late.push(card);
    else early.push(card);
  }

  log.push(
    `Event seeding: ${early.length} early-game cards, ${late.length} late-game cards`,
  );

  return {
    earlyDeck: shuffle(early),
    lateDeck: shuffle(late),
    log,
  };
}
