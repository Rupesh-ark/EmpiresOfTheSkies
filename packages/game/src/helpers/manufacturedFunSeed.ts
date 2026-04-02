import {
  KingdomAdvantageCard,
  LegacyCardInfo,
  LegacyCardName,
  EventCardName,
} from "../types";

const KA_RIVALRY_GROUPS: [KingdomAdvantageCard, KingdomAdvantageCard][] = [
  ["licenced_smugglers", "sanctioned_piracy"],       // Group A — Economic
  ["elite_regiments", "improved_training"],           // Group B — Military
  ["patriarch_of_the_church", "more_prisons"],        // Group C — Religious
];

const KA_WILD_CARD: KingdomAdvantageCard = "more_efficient_taxation";

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

  const groups = shuffle([...KA_RIVALRY_GROUPS]);

  const removedSet = new Set<KingdomAdvantageCard>();
  let wildRemoved = false;

  if (targetSize % 2 === 0) {
    wildRemoved = true;
    removedSet.add(KA_WILD_CARD);
    const pairsToRemove = (7 - 1 - targetSize) / 2;
    for (let i = 0; i < pairsToRemove; i++) {
      removedSet.add(groups[i][0]);
      removedSet.add(groups[i][1]);
    }
  } else {
    const pairsToRemove = (7 - targetSize) / 2;
    for (let i = 0; i < pairsToRemove; i++) {
      removedSet.add(groups[i][0]);
      removedSet.add(groups[i][1]);
    }
  }

  const pool = allCards.filter((c) => !removedSet.has(c));

  if (wildRemoved) log.push(`KA seeding: removed wild card (${KA_WILD_CARD})`);
  for (const [a, b] of groups) {
    if (removedSet.has(a)) log.push(`KA seeding: removed rivalry pair [${a}, ${b}]`);
  }
  log.push(`KA seeding: ${pool.length} cards for ${numPlayers} players`);

  return { pool, log };
}

const POOL_ALPHA: LegacyCardName[] = ["the conqueror", "the navigator", "the merchant"];
const POOL_BETA: LegacyCardName[] = ["the pious", "the magnificent"];
const POOL_GAMMA: LegacyCardName[] = ["the great", "the builder", "the aviator", "the mighty"];

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

export function seedLegacyDeal(
  allCards: readonly LegacyCardInfo[],
  playerIDs: string[],
  playerKAs: Record<string, KingdomAdvantageCard | undefined>,
  shuffle: <T>(arr: T[]) => T[],
): { hands: Record<string, LegacyCardInfo[]>; remainder: LegacyCardInfo[]; log: string[] } {
  const log: string[] = [];

  const poolA = shuffle([...allCards].filter((c) => (POOL_ALPHA as string[]).includes(c.name)));
  const poolB = shuffle([...allCards].filter((c) => (POOL_BETA as string[]).includes(c.name)));
  const poolG = shuffle([...allCards].filter((c) => (POOL_GAMMA as string[]).includes(c.name)));

  log.push(`Legacy seeding: pools α=${poolA.length}, β=${poolB.length}, γ=${poolG.length}`);

  const hands: Record<string, LegacyCardInfo[]> = {};

  for (const id of playerIDs) {
    hands[id] = [];

    if (poolA.length > 0) {
      hands[id].push(poolA.pop()!);
    }

    if (poolB.length > 0) {
      hands[id].push(poolB.pop()!);
    } else if (poolG.length > 0) {
      hands[id].push(poolG.pop()!);
    }

    if (poolG.length > 0) {
      hands[id].push(poolG.pop()!);
    } else if (poolA.length > 0) {
      hands[id].push(poolA.pop()!);
    }

    while (hands[id].length < 3) {
      if (poolA.length > 0) hands[id].push(poolA.pop()!);
      else if (poolB.length > 0) hands[id].push(poolB.pop()!);
      else if (poolG.length > 0) hands[id].push(poolG.pop()!);
      else break;
    }
  }

  const remainder: LegacyCardInfo[] = [...poolA, ...poolB, ...poolG];

  const someoneElseHas = (name: string, excludeID: string): boolean =>
    playerIDs.some(
      (id) => id !== excludeID && hands[id].some((c) => c.name === name),
    );

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

  for (const id of playerIDs) {
    if (hands[id].some((c) => c.name === "the conqueror")) {
      if (!someoneElseHas("the navigator", id) && !someoneElseHas("the mighty", id)) {
        if (!trySwapIn("the navigator", id, 2)) {
          trySwapIn("the mighty", id, 2);
        }
      }
    }
  }

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

  for (const id of playerIDs) {
    const hand = hands[id];
    if (hand.length < 3) continue;

    const allSameColour = hand.every((c) => c.colour === hand[0].colour);
    if (!allSameColour) continue;

    const colour = hand[0].colour;
    const opposite = colour === "purple" ? "orange" : "purple";

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

  for (const id of playerIDs) {
    hands[id] = shuffle(hands[id]);
  }

  log.push(
    `Legacy seeding complete: ${playerIDs.length} hands dealt, ${remainder.length} cards in remainder`,
  );

  return { hands, remainder, log };
}

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

export function classifyEventDeck(
  allCards: readonly EventCardName[],
  numPlayers: number,
  shuffle: <T>(arr: T[]) => T[],
): { earlyDeck: EventCardName[]; lateDeck: EventCardName[]; log: string[] } {
  const log: string[] = [];

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
