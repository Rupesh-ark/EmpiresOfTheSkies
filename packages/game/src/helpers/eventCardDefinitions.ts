import { EventCardName, MyGameState, LegacyCardInfo, DeferredEvent } from "../types";
import {
  advanceAllHeresyTrackers,
  retreatAllHeresyTrackers,
  increaseHeresyWithinMove,
  increaseOrthodoxyWithinMove,
  addVPAmount,
  removeVPAmount,
  addRegiments,
  HERESY_MIN,
} from "./stateUtils";
import { CARD_RESOLVERS, resolveCardWithAlignmentPenalty } from "./legacyCardDefinitions";

// ── Card metadata ────────────────────────────────────────────────────────────

export type EventCardDef = {
  displayName: string;
  description: string;
  isBattle: boolean;
};

export const EVENT_CARD_DEFS: Record<EventCardName, EventCardDef> = {
  zeeland_turns_heretic: {
    displayName: "Zeeland Turns Heretic",
    description: "Ruling Council Opts For Religious Reform",
    isBattle: false,
  },
  venoa_turns_heretic: {
    displayName: "Venoa Turns Heretic",
    description: "Ruling Council Opts For Religious Reform",
    isBattle: false,
  },
  treacherous_creatures: {
    displayName: "Treacherous Creatures",
    description: "Merfolk & Sea Elves Attack",
    isBattle: false,
  },
  the_great_fire: {
    displayName: "The Great Fire",
    description: "Colossal Conflagration Destroys Grand Building",
    isBattle: false,
  },
  the_faerie_plague: {
    displayName: "The Faerie Plague",
    description: "A New and Deadly Pestilence Strikes",
    isBattle: false,
  },
  schism: {
    displayName: "Schism",
    description: "Heretic Clergy Break with the Prelacy",
    isBattle: false,
  },
  royal_succession: {
    displayName: "Royal Succession",
    description: "Heir Apparent Takes The Throne",
    isBattle: false,
  },
  pretender_rebellion: {
    displayName: "Pretender REBELLION",
    description: "Scion Of A Rival Dynasty Raises Their Banner",
    isBattle: true,
  },
  prelacy_condemned: {
    displayName: "Prelacy Condemned",
    description: "Radical Cleric Publishes Critical Theses",
    isBattle: false,
  },
  peace_accord_reached: {
    displayName: "Peace Accord Reached",
    description: "Peace Of The Faith Extended To Whole Globe",
    isBattle: false,
  },
  peasant_rebellion: {
    displayName: "Peasant REBELLION",
    description: "Common People Rise Up Against Heavy Taxation",
    isBattle: true,
  },
  patrons_of_the_arts: {
    displayName: "Patrons Of The Arts",
    description: "Architecture, Music & Painting Flourish",
    isBattle: false,
  },
  orthodox_rebellion: {
    displayName: "Orthodox REBELLION",
    description: "Believers Rise Up Against A Heretic Monarch",
    isBattle: true,
  },
  mysterious_disappearances: {
    displayName: "Mysterious Disappearances",
    description: "Vanishings at City of Gold & Fountain of Youth",
    isBattle: false,
  },
  monsters_awake: {
    displayName: "Monsters Awake",
    description: "Dragons & Krakens Claim Victims",
    isBattle: false,
  },
  lenders_refuse_credit: {
    displayName: "Lenders Refuse Credit",
    description: "The Banking Guilds Stop Further Loans",
    isBattle: false,
  },
  infidels_invade_faerie: {
    displayName: "Infidels Invade Faerie",
    description: "An Infidel Host Attacks a Colony or Outpost",
    isBattle: true,
  },
  infidel_corsairs_raid: {
    displayName: "Infidel Corsairs Raid",
    description: "Aerial Pirates Descend on Faithdom",
    isBattle: false,
  },
  heretic_rebellion: {
    displayName: "Heretic REBELLION",
    description: "Heretics Rise Up Against An Orthodox Monarch",
    isBattle: true,
  },
  headstrong_commander: {
    displayName: "Headstrong Commander",
    description: "Ambitious Outpost Governor Attempts Conquest",
    isBattle: true,
  },
  grand_infidel_dies: {
    displayName: "Grand Infidel Dies",
    description: "Succession Struggle Delays Invasion Preparations",
    isBattle: false,
  },
  faerie_uprising: {
    displayName: "Faerie Uprising",
    description: "Faerie Folk Rise Up Against Colonial Oppression",
    isBattle: true,
  },
  dynastic_marriage: {
    displayName: "Dynastic Marriage",
    description: "Two Monarchies Make A Lasting Alliance",
    isBattle: false,
  },
  defence_of_the_faith: {
    displayName: "Defence of the Faith",
    description: "Devout Cleric Publishes Counter to Criticism",
    isBattle: false,
  },
  crops_fail: {
    displayName: "Crops Fail",
    description: "Poor Harvests Reduce Tax Take",
    isBattle: false,
  },
  colonial_rebellion: {
    displayName: "Colonial REBELLION",
    description: "Colonists Rise Up Against Royal Authority",
    isBattle: true,
  },
  colonial_prelates: {
    displayName: "Colonial Prelates",
    description: "The Church Expands to Minister to Faerie",
    isBattle: false,
  },
  bumper_crops: {
    displayName: "Bumper Crops",
    description: "Good Harvests Increase Tax Take",
    isBattle: false,
  },
  archprelate_dies: {
    displayName: "Archprelate Dies",
    description: "Council of Prelates Enters Emergency Session",
    isBattle: false,
  },
  allies_in_faerie: {
    displayName: "Allies in Faerie",
    description: "Outpost Governors Obtain Local Recruits",
    isBattle: false,
  },
  a_kingdom_turns_heretic: {
    displayName: "A Kingdom Turns Heretic",
    description: "Monarch Opts For Religious Reform",
    isBattle: false,
  },
};

export const ALL_EVENT_CARD_NAMES: EventCardName[] = Object.keys(
  EVENT_CARD_DEFS
) as EventCardName[];

// ── Legend tile groupings (for void checks & resolvers) ──────────────────────

const MERFOLK_SEA_ELVES = ["TheKingdomOfTheMerfolk", "SeaElves"];
const CITY_FOUNTAIN = ["TheLostCityOfGold", "TheFountainOfYouth"];
const DRAGONS_KRAKENS = ["HereBeDragons", "TheKraken"];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Find map coordinates of legend tiles by name */
const findLegendTileCoords = (
  G: MyGameState,
  tileNames: string[]
): [number, number][] => {
  const coords: [number, number][] = [];
  for (let y = 0; y < G.mapState.currentTileArray.length; y++) {
    for (let x = 0; x < G.mapState.currentTileArray[y].length; x++) {
      if (tileNames.includes(G.mapState.currentTileArray[y][x].name)) {
        coords.push([x, y]);
      }
    }
  }
  return coords;
};

/** Check if any player has fleets with skyships on the given tiles */
const hasPlayerFleetsOnTiles = (
  G: MyGameState,
  coords: [number, number][]
): boolean =>
  Object.values(G.playerInfo).some((player) =>
    player.fleetInfo.some(
      (fleet) =>
        fleet.skyships > 0 &&
        coords.some(
          ([x, y]) => fleet.location[0] === x && fleet.location[1] === y
        )
    )
  );

/** Check if any colony exists on the map */
const hasAnyColony = (G: MyGameState): boolean => {
  for (const row of G.mapState.buildings) {
    for (const tile of row) {
      if (tile.buildings === "colony") return true;
    }
  }
  return false;
};

/** Check if any outpost exists on the map */
const hasAnyOutpost = (G: MyGameState): boolean => {
  for (const row of G.mapState.buildings) {
    for (const tile of row) {
      if (tile.buildings === "outpost" && tile.player) return true;
    }
  }
  return false;
};

/** Check if any land tile has been discovered */
const hasDiscoveredLand = (G: MyGameState): boolean => {
  for (let y = 0; y < G.mapState.currentTileArray.length; y++) {
    for (let x = 0; x < G.mapState.currentTileArray[y].length; x++) {
      if (
        G.mapState.discoveredTiles[y][x] &&
        G.mapState.currentTileArray[y][x].type === "land"
      ) {
        return true;
      }
    }
  }
  return false;
};

const KINGDOM_X = 4;
const KINGDOM_Y = 0;

const ALL_PLAYER_KINGDOMS = [
  "Angland",
  "Gallois",
  "Castillia",
  "Nordmark",
  "Ostreich",
  "Constantium",
];

// ── Targeting helpers ────────────────────────────────────────────────────────

/** Player with fewest VPs; break ties IPO (first in turn order wins) */
const playerWithFewestVP = (
  G: MyGameState,
  turnOrder: string[]
): string => {
  let minVP = Infinity;
  let target = turnOrder[0];
  for (const id of turnOrder) {
    if (G.playerInfo[id].resources.victoryPoints < minVP) {
      minVP = G.playerInfo[id].resources.victoryPoints;
      target = id;
    }
  }
  return target;
};

/**
 * Run an immediate Archprelate election (no bribes, own kingdom votes only).
 * Mutates G: updates isArchprelate, awards VP, retreats heresy.
 */
const resolveImmediateElection = (
  G: MyGameState,
  turnOrder: string[]
): void => {
  const voteTotals: Record<string, number> = {};

  for (const id of turnOrder) {
    const player = G.playerInfo[id];
    // Schism-affected players cannot participate
    if (G.eventState.schismAffected.includes(id)) continue;

    let votes = player.cathedrals;

    // Patriarch KA bonus
    if (player.resources.advantageCard === "patriarch_of_the_church") {
      votes += 1;
    }

    // Colonial Prelates: +1 vote per colony owned
    if (G.eventState.colonialPrelatesActive) {
      for (const row of G.mapState.buildings) {
        for (const tile of row) {
          if (tile.player?.id === id && tile.buildings === "colony") {
            votes += 1;
          }
        }
      }
    }

    voteTotals[id] = votes;
  }

  // Find winner — ties go to incumbent (existing Archprelate)
  let maxVotes = 0;
  let winnerId = turnOrder[0];
  const incumbentId = turnOrder.find(
    (id) => G.playerInfo[id].isArchprelate
  );

  for (const id of turnOrder) {
    const v = voteTotals[id] ?? 0;
    if (v > maxVotes) {
      maxVotes = v;
      winnerId = id;
    } else if (v === maxVotes && id === incumbentId) {
      winnerId = id; // incumbent wins ties
    }
  }

  // Apply results
  for (const id of turnOrder) {
    G.playerInfo[id].isArchprelate = id === winnerId;
  }

  // Winner: heresy retreats 1, gains VP
  if (G.playerInfo[winnerId].heresyTracker > HERESY_MIN) {
    G.playerInfo[winnerId].heresyTracker -= 1;
  }
  let orthodoxRealms = 0;
  for (const id of turnOrder) {
    if (G.playerInfo[id].hereticOrOrthodox === "orthodox") orthodoxRealms++;
  }
  addVPAmount(G, winnerId, Math.min(6, Math.floor((2 * orthodoxRealms) / 3)));
};

// ── Void condition checks ────────────────────────────────────────────────────

/** Returns true if the card would have no effect and should be skipped */
export const isEventVoid = (
  card: EventCardName,
  G: MyGameState,
  turnOrder: string[]
): boolean => {
  switch (card) {
    case "the_faerie_plague":
      return !hasDiscoveredLand(G);

    case "schism":
    case "orthodox_rebellion":
      return !turnOrder.some(
        (id) => G.playerInfo[id].hereticOrOrthodox === "heretic"
      );

    case "heretic_rebellion":
      return !turnOrder.some(
        (id) => G.playerInfo[id].hereticOrOrthodox === "orthodox"
      );

    case "treacherous_creatures":
      return !hasPlayerFleetsOnTiles(G, findLegendTileCoords(G, MERFOLK_SEA_ELVES));

    case "mysterious_disappearances":
      return !hasPlayerFleetsOnTiles(G, findLegendTileCoords(G, CITY_FOUNTAIN));

    case "monsters_awake":
      return !hasPlayerFleetsOnTiles(G, findLegendTileCoords(G, DRAGONS_KRAKENS));

    case "infidel_corsairs_raid":
      // Void if ALL players have a defending fleet (skyships > 0 at Kingdom)
      return turnOrder.every((id) =>
        G.playerInfo[id].fleetInfo.some(
          (f) =>
            f.skyships > 0 &&
            f.location[0] === KINGDOM_X &&
            f.location[1] === KINGDOM_Y
        )
      );

    case "headstrong_commander":
      // Void if no outpost has garrisoned troops
      for (const row of G.mapState.buildings) {
        for (const tile of row) {
          if (
            tile.buildings === "outpost" &&
            tile.player &&
            (tile.garrisonedRegiments > 0 || tile.garrisonedLevies > 0)
          ) {
            return false;
          }
        }
      }
      return true;

    case "faerie_uprising":
    case "colonial_rebellion":
    case "colonial_prelates":
      return !hasAnyColony(G);

    case "dynastic_marriage":
      return turnOrder.length < 4;

    case "infidels_invade_faerie":
      return !hasAnyOutpost(G) && !hasAnyColony(G);

    case "allies_in_faerie":
      return !hasAnyOutpost(G);

    case "a_kingdom_turns_heretic": {
      const assignedKingdoms = new Set(
        Object.values(G.playerInfo).map((p) => p.kingdomName)
      );
      return !ALL_PLAYER_KINGDOMS.some(
        (k) =>
          !assignedKingdoms.has(k as any) &&
          !G.eventState.nprHeretic.includes(k)
      );
    }

    default:
      return false;
  }
};

// ── Card resolvers ───────────────────────────────────────────────────────────

/**
 * Resolves an event card's immediate effect.
 * Battle cards (isBattle: true) should NOT be passed here — they are
 * deferred to the Resolution phase.
 */
export const resolveEventCard = (
  card: EventCardName,
  G: MyGameState,
  turnOrder: string[]
): void => {
  switch (card) {
    // ── Heresy shifts ──────────────────────────────────────────────────────
    case "prelacy_condemned":
      for (let i = 0; i < 4; i++) advanceAllHeresyTrackers(G);
      break;

    case "defence_of_the_faith":
      for (let i = 0; i < 4; i++) retreatAllHeresyTrackers(G);
      break;

    // ── Tax modifiers (applied during taxes phase) ─────────────────────────
    case "crops_fail":
      G.eventState.taxModifier = -3;
      break;

    case "bumper_crops":
      G.eventState.taxModifier = 3;
      break;

    // ── VP awards ──────────────────────────────────────────────────────────
    case "patrons_of_the_arts":
      for (const id of turnOrder) {
        const p = G.playerInfo[id];
        addVPAmount(G, id, p.cathedrals + p.palaces);
      }
      break;

    // ── Disasters ──────────────────────────────────────────────────────────
    case "the_faerie_plague":
      // Lose half (rounded down) of all Regiments & Levies everywhere
      for (const id of turnOrder) {
        const p = G.playerInfo[id];
        p.resources.regiments -= Math.floor(p.resources.regiments / 2);
        p.resources.levies -= Math.floor(p.resources.levies / 2);
        for (const fleet of p.fleetInfo) {
          fleet.regiments -= Math.floor(fleet.regiments / 2);
          fleet.levies -= Math.floor(fleet.levies / 2);
        }
      }
      for (const row of G.mapState.buildings) {
        for (const tile of row) {
          tile.garrisonedRegiments -= Math.floor(
            tile.garrisonedRegiments / 2
          );
          tile.garrisonedLevies -= Math.floor(tile.garrisonedLevies / 2);
        }
      }
      break;

    case "the_great_fire": {
      // Player with most buildings in Kingdom loses one (highest-count type)
      let maxBuildings = 0;
      let target = turnOrder[0];
      for (const id of turnOrder) {
        const p = G.playerInfo[id];
        const total = p.cathedrals + p.palaces + p.shipyards;
        if (total > maxBuildings) {
          maxBuildings = total;
          target = id;
        }
      }
      const p = G.playerInfo[target];
      // Lose whichever there is most of — auto-pick highest count
      const counts = [
        { type: "cathedral" as const, count: p.cathedrals },
        { type: "palace" as const, count: p.palaces },
        { type: "shipyard" as const, count: p.shipyards },
      ].sort((a, b) => b.count - a.count);
      if (counts[0].count > 0) {
        if (counts[0].type === "cathedral") p.cathedrals--;
        else if (counts[0].type === "palace") p.palaces--;
        else p.shipyards--;
      }
      break;
    }

    case "infidel_corsairs_raid": {
      // Target: player with most Gold & no defending Fleet, break ties IPO
      let target: string | null = null;
      let maxGold = -Infinity;
      for (const id of turnOrder) {
        const p = G.playerInfo[id];
        const hasDefendingFleet = p.fleetInfo.some(
          (f) =>
            f.skyships > 0 &&
            f.location[0] === KINGDOM_X &&
            f.location[1] === KINGDOM_Y
        );
        if (!hasDefendingFleet && p.resources.gold > maxGold) {
          maxGold = p.resources.gold;
          target = id;
        }
      }
      if (target) {
        const gold = G.playerInfo[target].resources.gold;
        if (gold > 0) {
          G.playerInfo[target].resources.gold -= Math.ceil(gold / 2);
        } else {
          // No gold — lose a building (auto-pick)
          const p = G.playerInfo[target];
          if (p.cathedrals > 0) p.cathedrals--;
          else if (p.palaces > 0) p.palaces--;
          else if (p.shipyards > 0) p.shipyards--;
        }
      }
      break;
    }

    // ── Legend tile attacks ─────────────────────────────────────────────────
    case "treacherous_creatures":
    case "mysterious_disappearances":
    case "monsters_awake": {
      const tileNames =
        card === "treacherous_creatures"
          ? MERFOLK_SEA_ELVES
          : card === "mysterious_disappearances"
            ? CITY_FOUNTAIN
            : DRAGONS_KRAKENS;
      const coords = findLegendTileCoords(G, tileNames);
      // One Skyship from each Fleet lost (& any troop it was carrying)
      for (const player of Object.values(G.playerInfo)) {
        for (const fleet of player.fleetInfo) {
          if (
            fleet.skyships > 0 &&
            coords.some(
              ([x, y]) =>
                fleet.location[0] === x && fleet.location[1] === y
            )
          ) {
            fleet.skyships -= 1;
            if (fleet.regiments > 0) fleet.regiments -= 1;
            else if (fleet.levies > 0) fleet.levies -= 1;
          }
        }
      }
      break;
    }

    // ── NPR heretic markers ────────────────────────────────────────────────
    case "zeeland_turns_heretic":
      if (!G.eventState.nprHeretic.includes("Zeeland")) {
        G.eventState.nprHeretic.push("Zeeland");
      }
      break;

    case "venoa_turns_heretic":
      if (!G.eventState.nprHeretic.includes("Venoa")) {
        G.eventState.nprHeretic.push("Venoa");
      }
      break;

    case "a_kingdom_turns_heretic": {
      const assignedKingdoms = new Set(
        Object.values(G.playerInfo).map((p) => p.kingdomName)
      );
      const orthodoxNPR = ALL_PLAYER_KINGDOMS.filter(
        (k) =>
          !assignedKingdoms.has(k as any) &&
          !G.eventState.nprHeretic.includes(k)
      );
      if (orthodoxNPR.length > 0) {
        G.eventState.nprHeretic.push(orthodoxNPR[0]);
      }
      break;
    }

    // ── Persistent effects (set flag, enforcement in other phases) ────────
    case "peace_accord_reached":
      G.eventState.peaceAccordActive = true;
      break;

    case "schism":
      // Advance all Heretic players' heresy by 3; mark for election exclusion
      for (const id of turnOrder) {
        if (G.playerInfo[id].hereticOrOrthodox === "heretic") {
          for (let i = 0; i < 3; i++) increaseHeresyWithinMove(G, id);
          if (!G.eventState.schismAffected.includes(id)) {
            G.eventState.schismAffected.push(id);
          }
        }
      }
      // Schism annuls Colonial Prelates
      G.eventState.colonialPrelatesActive = false;
      break;

    case "lenders_refuse_credit":
      G.eventState.lendersRefuseCredit = turnOrder.filter(
        (id) => G.playerInfo[id].resources.gold < 0
      );
      break;

    case "colonial_prelates":
      G.eventState.colonialPrelatesActive = true;
      break;

    // ── Allies in Faerie — free regiments at outposts ──────────────────────
    case "allies_in_faerie":
      for (const id of turnOrder) {
        for (let y = 0; y < G.mapState.buildings.length; y++) {
          for (let x = 0; x < G.mapState.buildings[y].length; x++) {
            const tile = G.mapState.buildings[y][x];
            if (tile.player?.id === id && tile.buildings === "outpost") {
              const loot = G.mapState.currentTileArray[y][x].loot.outpost;
              const tradeGains =
                loot.mithril +
                loot.dragonScales +
                loot.krakenSkin +
                loot.magicDust +
                loot.stickyIchor +
                loot.pipeweed;
              addRegiments(G, id, tradeGains);
            }
          }
        }
      }
      break;

    // ── No-op (infidel invasion not implemented) ───────────────────────────
    case "grand_infidel_dies":
      console.log(
        "Grand Infidel Dies: invasion step skipped (not yet implemented)"
      );
      break;

    // ── Royal Succession ─────────────────────────────────────────────────
    case "royal_succession": {
      // Target: fewest VP player. Score their legacy card, reshuffle it
      // into legacy deck, draw 2 new cards, auto-pick the higher-value one.
      const rsTarget = playerWithFewestVP(G, turnOrder);
      const rsPlayer = G.playerInfo[rsTarget];
      const currentCard = rsPlayer.resources.legacyCard;
      if (currentCard) {
        // Score current legacy card
        resolveCardWithAlignmentPenalty(rsPlayer, G, currentCard);
        // Return it to the deck
        G.cardDecks.legacyDeck.push(currentCard);
        rsPlayer.resources.legacyCard = undefined;
      }
      // Draw 2 new cards (if available), auto-pick the one worth more VP
      if (G.cardDecks.legacyDeck.length > 0) {
        const drawn: LegacyCardInfo[] = [];
        for (let i = 0; i < 2 && G.cardDecks.legacyDeck.length > 0; i++) {
          const idx = Math.floor(
            Math.random() * G.cardDecks.legacyDeck.length
          );
          drawn.push(G.cardDecks.legacyDeck.splice(idx, 1)[0]);
        }
        // Auto-pick: evaluate which card would give more raw VP
        let bestCard = drawn[0];
        let bestVP = 0;
        for (const card of drawn) {
          const rawVP = CARD_RESOLVERS[card.name](rsPlayer, G);
          if (rawVP > bestVP) {
            bestVP = rawVP;
            bestCard = card;
          }
        }
        rsPlayer.resources.legacyCard = bestCard;
        // Return unpicked cards to deck
        for (const card of drawn) {
          if (card !== bestCard) G.cardDecks.legacyDeck.push(card);
        }
      }
      break;
    }

    // ── Archprelate Dies — immediate election without bribes ─────────────
    case "archprelate_dies":
      resolveImmediateElection(G, turnOrder);
      break;

    // ── Dynastic Marriage — auto-pick: fewest + second-fewest VP ─────────
    case "dynastic_marriage": {
      const dmTarget = playerWithFewestVP(G, turnOrder);
      // Pick ally: second-fewest VP player (excluding target)
      let minVP = Infinity;
      let ally = turnOrder.find((id) => id !== dmTarget) ?? dmTarget;
      for (const id of turnOrder) {
        if (id === dmTarget) continue;
        if (G.playerInfo[id].resources.victoryPoints < minVP) {
          minVP = G.playerInfo[id].resources.victoryPoints;
          ally = id;
        }
      }
      addVPAmount(G, dmTarget, 3);
      addVPAmount(G, ally, 3);
      G.eventState.dynasticMarriage = [dmTarget, ally];
      break;
    }

    // Battle/rebellion cards — should not reach here (deferred to Resolution)
    case "pretender_rebellion":
    case "peasant_rebellion":
    case "orthodox_rebellion":
    case "heretic_rebellion":
    case "colonial_rebellion":
    case "faerie_uprising":
    case "headstrong_commander":
    case "infidels_invade_faerie":
      console.log(
        `${card}: battle event deferred to Resolution (not yet implemented)`
      );
      break;
  }
};

// ── Battle event targeting ───────────────────────────────────────────────────

/**
 * Compute the target for a battle/rebellion event card.
 * Returns a DeferredEvent with target info, or null if the card
 * can't find a valid target (should have been caught by void check).
 */
export const getBattleEventTarget = (
  card: EventCardName,
  G: MyGameState,
  turnOrder: string[]
): DeferredEvent | null => {
  switch (card) {
    case "pretender_rebellion":
      return { card, targetPlayerID: playerWithFewestVP(G, turnOrder) };

    case "peasant_rebellion":
      // Target: last player in IPO (turn order)
      return { card, targetPlayerID: turnOrder[turnOrder.length - 1] };

    case "orthodox_rebellion": {
      // Target: heretic player with leftmost heresy (most heretical), IPO
      let maxHeresy = -Infinity;
      let target: string | null = null;
      for (const id of turnOrder) {
        if (
          G.playerInfo[id].hereticOrOrthodox === "heretic" &&
          G.playerInfo[id].heresyTracker > maxHeresy
        ) {
          maxHeresy = G.playerInfo[id].heresyTracker;
          target = id;
        }
      }
      return target ? { card, targetPlayerID: target } : null;
    }

    case "heretic_rebellion": {
      // Target: orthodox player with rightmost heresy (closest to heresy), IPO
      let maxHeresy = -Infinity;
      let target: string | null = null;
      for (const id of turnOrder) {
        if (
          G.playerInfo[id].hereticOrOrthodox === "orthodox" &&
          G.playerInfo[id].heresyTracker > maxHeresy
        ) {
          maxHeresy = G.playerInfo[id].heresyTracker;
          target = id;
        }
      }
      return target ? { card, targetPlayerID: target } : null;
    }

    case "colonial_rebellion": {
      // Target: fewest VP player chooses one of their own colonies
      // Auto-pick: weakest colony (lowest total trade goods)
      const targetID = playerWithFewestVP(G, turnOrder);
      let bestTile: [number, number] | null = null;
      let minValue = Infinity;
      for (let y = 0; y < G.mapState.buildings.length; y++) {
        for (let x = 0; x < G.mapState.buildings[y].length; x++) {
          const tile = G.mapState.buildings[y][x];
          if (tile.player?.id === targetID && tile.buildings === "colony") {
            const loot = G.mapState.currentTileArray[y][x].loot.colony;
            const value =
              loot.mithril + loot.dragonScales + loot.krakenSkin +
              loot.magicDust + loot.stickyIchor + loot.pipeweed;
            if (value < minValue) {
              minValue = value;
              bestTile = [x, y];
            }
          }
        }
      }
      return bestTile
        ? { card, targetPlayerID: targetID, targetTile: bestTile }
        : null;
    }

    // TODO: Implement targeting for these non-rebellion battle events
    case "faerie_uprising":
    case "headstrong_commander":
    case "infidels_invade_faerie":
      console.log(`${card}: targeting not yet implemented`);
      return null;

    default:
      return null;
  }
};
