/**
 * Lightweight state simulator for MCTS rollouts.
 *
 * Clones game state and applies moves directly without boardgame.io.
 * Handles: actions, discovery (sampled), simplified resolution (with FoW), taxes.
 * Skips: events (approximated with expected-value swing).
 */
import type { MyGameState, TileInfoProps, TileLoot } from "../../types";
import type { AIMove } from "../types";
import type { BotPersonality } from "../evaluators/types";
import { getNeighbors, FAITHDOM_TILES, tileKey, buildPlayerNetwork, bfsReachable, wouldPlacementConnectRoute, bfsShortestPath } from "../../helpers/mapUtils";
import { getTradeRoutes } from "./RouteCache";
import {
  BUILDING_BASE_COST, CATHEDRAL_VP, PALACE_VP_HERETIC,
  PALACE_VP_ORTHODOX, RECRUIT_REGIMENTS_REWARD, BASE_GOLD_INCOME,
  KINGDOM_LOCATION, HERESY_MIN, HERESY_MAX,
  DEBT_PENALTY_DIVISOR, TRADE_VP_SCHEDULE,
  MAP_WIDTH, MAP_HEIGHT,
} from "../../data/gameData";
import { evaluatePosition } from "./StateEvaluator";

// BattleMap helpers

function removeBattleMapPresence(G: MyGameState, playerID: string, x: number, y: number): void {
  const row = G.mapState.battleMap[y];
  if (!row) return;
  const cell = row[x];
  if (!cell) return;
  const idx = cell.indexOf(playerID);
  if (idx >= 0) cell.splice(idx, 1);
}

function addBattleMapPresence(G: MyGameState, playerID: string, x: number, y: number): void {
  if (!G.mapState.battleMap[y]) G.mapState.battleMap[y] = [];
  if (!G.mapState.battleMap[y][x]) G.mapState.battleMap[y][x] = [];
  if (!G.mapState.battleMap[y][x].includes(playerID)) {
    G.mapState.battleMap[y][x].push(playerID);
  }
}

// Cached trade route counting (single BFS per player per state)

function computeAllTradeRoutesCached(G: MyGameState): Record<string, number> {
  return getTradeRoutes(G, Object.keys(G.playerInfo));
}

// Apply a single move to a cloned state

export function applyMove(G: MyGameState, playerID: string, move: AIMove): void {
  const player = G.playerInfo[playerID];

  switch (move.move) {
    case "deployFleet": {
      const fleetIdx = move.args[0] as number;
      const dest = move.args[1] as [number, number];
      const sky = (move.args[2] as number) ?? 0;
      const regs = (move.args[3] as number) ?? 0;
      const levs = (move.args[4] as number) ?? 0;
      const elites = (move.args[5] as number) ?? 0;
      player.resources.skyships -= sky;
      player.resources.regiments -= regs;
      player.resources.levies -= levs;
      player.resources.eliteRegiments -= elites;
      player.resources.gold -= 1; // approximate 1-3g
      player.actionsTakenThisRound += 1;
      const fleet = player.fleetInfo[fleetIdx];
      if (fleet) {
        // Remove from old battle map position
        const [oldX, oldY] = fleet.location;
        removeBattleMapPresence(G, playerID, oldX, oldY);
        fleet.skyships = sky;
        fleet.regiments = regs;
        fleet.levies = levs;
        fleet.eliteRegiments = elites;
        fleet.location = dest;
        // Add to new battle map position
        addBattleMapPresence(G, playerID, dest[0], dest[1]);
      }
      break;
    }

    case "moveFleet": {
      const fleetIdx = move.args[0] as number;
      const dest = move.args[1] as [number, number];
      player.resources.gold -= 1;
      player.actionsTakenThisRound += 1;
      const fleet = player.fleetInfo[fleetIdx];
      if (fleet) {
        const [oldX, oldY] = fleet.location;
        removeBattleMapPresence(G, playerID, oldX, oldY);
        fleet.location = dest;
        addBattleMapPresence(G, playerID, dest[0], dest[1]);
      }
      break;
    }

    case "foundBuildings": {
      const slot = move.args[0] as number;
      const boardSlot = (slot + 1) as 1 | 2 | 3 | 4;
      const occupants = G.boardState.foundBuildings[boardSlot]?.length ?? 0;
      const typeMap: Record<number, keyof typeof BUILDING_BASE_COST> = {
        0: "cathedral", 1: "palace", 2: "shipyard", 3: "fort",
      };
      const buildingType = typeMap[slot] ?? "cathedral";
      const cost = BUILDING_BASE_COST[buildingType] + occupants + 1;
      player.resources.gold -= cost;
      player.actionsTakenThisRound += 1;

      // Track action board slot
      const arr = G.boardState.foundBuildings[boardSlot];
      if (Array.isArray(arr)) arr.push(playerID);

      if (slot === 0) {
        player.cathedrals += 1;
        player.resources.victoryPoints += CATHEDRAL_VP;
        // Cathedral: move toward orthodoxy
        player.heresyTracker = Math.max(HERESY_MIN, player.heresyTracker - 1);
      }
      if (slot === 1) {
        player.palaces += 1;
        player.resources.victoryPoints += player.hereticOrOrthodox === "heretic" ? PALACE_VP_HERETIC : PALACE_VP_ORTHODOX;
        // Palace: heretic moves further heretic, orthodox moves toward orthodoxy
        if (player.hereticOrOrthodox === "heretic") {
          player.heresyTracker = Math.min(HERESY_MAX, player.heresyTracker + 1);
        } else {
          player.heresyTracker = Math.max(HERESY_MIN, player.heresyTracker - 1);
        }
      }
      if (slot === 2) player.shipyards += 1;
      break;
    }

    case "foundFactory": {
      const ffLen = G.boardState.foundFactories.length;
      player.resources.gold -= (ffLen + 2);
      player.actionsTakenThisRound += 1;
      player.factories += 1;
      G.boardState.foundFactories.push(playerID);
      break;
    }

    case "recruitCounsellors": {
      const rcLen = G.boardState.recruitCounsellors.length;
      player.resources.gold -= (1 + rcLen);
      player.actionsTakenThisRound += 1;
      player.resources.counsellors += 1;
      G.boardState.recruitCounsellors.push(playerID);
      break;
    }

    case "recruitRegiments": {
      const rrLen = G.boardState.recruitRegiments.length;
      player.resources.gold -= (2 + rrLen);
      player.resources.regiments += RECRUIT_REGIMENTS_REWARD;
      player.actionsTakenThisRound += 1;
      G.boardState.recruitRegiments.push(playerID);
      break;
    }

    case "purchaseSkyships": {
      const psLen =
        move.args[0] === "zeeland"
          ? G.boardState.purchaseSkyshipsZeeland.length
          : G.boardState.purchaseSkyshipsVenoa.length;
      player.resources.gold -= (3 + psLen);
      player.resources.skyships += 2;
      player.actionsTakenThisRound += 1;
      if (move.args[0] === "zeeland") {
        G.boardState.purchaseSkyshipsZeeland.push(playerID);
      } else {
        G.boardState.purchaseSkyshipsVenoa.push(playerID);
      }
      break;
    }

    case "trainTroops": {
      // Draw 2 FoW cards with randomised values
      const randSword1 = Math.floor(Math.random() * 7);
      const randShield1 = Math.floor(Math.random() * 7);
      const randSword2 = Math.floor(Math.random() * 7);
      const randShield2 = Math.floor(Math.random() * 7);
      player.resources.fortuneCards.push(
        { sword: randSword1, shield: randShield1, flipped: true } as any,
        { sword: randSword2, shield: randShield2, flipped: true } as any,
      );
      // Trim to hand limit of 4
      while (player.resources.fortuneCards.length > 4) {
        let worstIdx = 0;
        let worstVal = Infinity;
        for (let i = 0; i < player.resources.fortuneCards.length; i++) {
          const v = player.resources.fortuneCards[i].sword + player.resources.fortuneCards[i].shield;
          if (v < worstVal) { worstVal = v; worstIdx = i; }
        }
        player.resources.fortuneCards.splice(worstIdx, 1);
      }
      break;
    }

    case "buildSkyships": {
      const cost = player.shipyards;
      player.resources.gold -= cost;
      player.resources.skyships += player.shipyards;
      break;
    }

    case "conscriptLevies": {
      player.resources.levies += 3;
      break;
    }

    case "influencePrelates": {
      // Cost: 0g for own kingdom slot, target's cathedrals for others
      const prelateSlot = move.args[0] as number;
      const prelateAction = move.args[1] as string;
      if (prelateAction === "advance") {
        // Approximate: own kingdom costs 0, others cost 1-3g
        const targetPID = String(prelateSlot);
        if (targetPID !== playerID && G.playerInfo[targetPID]) {
          player.resources.gold -= G.playerInfo[targetPID].cathedrals || 1;
        }
      }
      player.actionsTakenThisRound += 1;
      break;
    }

    case "punishDissenters": {
      const paymentType = move.args[1] as string;
      const count = (move.args[2] as number) ?? 1;
      if (paymentType === "gold") player.resources.gold -= 2;
      else if (paymentType === "counsellor") player.resources.counsellors -= 1;
      if (paymentType === "execute") {
        player.resources.victoryPoints -= count;
        player.prisoners -= count;
      } else {
        player.prisoners += count;
        player.freeDissenters = Math.max(0, player.freeDissenters - count);
      }
      player.actionsTakenThisRound += 1;
      G.boardState.punishDissenters.push(playerID);
      break;
    }

    case "sendAgitators": {
      player.resources.gold -= 2;
      const targetID = move.args[0] as string;
      if (G.playerInfo[targetID]) {
        G.playerInfo[targetID].freeDissenters += 1;
      }
      break;
    }

    case "convertMonarch": {
      player.resources.gold -= 2;
      player.resources.victoryPoints -= 5;
      player.hereticOrOrthodox = player.hereticOrOrthodox === "orthodox" ? "heretic" : "orthodox";
      break;
    }

    case "sellSkyships": {
      if (player.resources.skyships > 0) {
        player.resources.skyships -= 1;
        player.resources.gold += 1;
      }
      break;
    }

    case "sellBuilding": {
      player.resources.gold += 3;
      break;
    }

    case "garrisonTransfer": {
      // Troop movement between fleet and garrison — approximate as no-op
      break;
    }

    case "transferBetweenFleets": {
      // Troop movement between fleets — no gold cost
      break;
    }

    case "declareSmugglerGood": {
      // Sets smuggler good choice — no immediate cost
      break;
    }

    case "alterPlayerOrder": {
      player.actionsTakenThisRound += 1;
      break;
    }

    case "issueHolyDecree": {
      player.resources.gold -= 2;
      break;
    }

    case "constructOutpost": {
      const loc = move.args[0] as [number, number];
      if (loc) {
        const building = G.mapState.buildings[loc[1]]?.[loc[0]];
        if (building && !building.player) {
          building.buildings = "outpost";
          building.player = { id: playerID } as any;
        }
      }
      player.resources.victoryPoints += 1;
      // Heresy advances on conquest
      if (player.hereticOrOrthodox === "heretic") {
        player.heresyTracker = Math.min(HERESY_MAX, player.heresyTracker + 1);
      } else {
        player.heresyTracker = Math.max(HERESY_MIN, player.heresyTracker - 1);
      }
      break;
    }

    case "coloniseLand": {
      const [cx, cy] = G.mapState.currentBattle ?? [0, 0];
      const building = G.mapState.buildings[cy]?.[cx];
      if (building) {
        building.buildings = "colony";
        if (!building.player) building.player = { id: playerID } as any;
      }
      player.resources.victoryPoints += 1;
      break;
    }

    case "checkAndPlaceFort": {
      const coords = move.args[0] as [number, number];
      if (coords) {
        const cell = G.mapState.buildings[coords[1]]?.[coords[0]];
        if (cell && !cell.fort.includes(playerID)) {
          cell.fort.push(playerID);
        }
      }
      break;
    }

    case "transferOutpost": {
      break;
    }

    // Resolution moves
    case "attackOtherPlayersFleet":
    case "retaliate":
    case "evadeAttackingFleet":
    case "doNotAttack":
    case "defendGroundAttack":
    case "yieldToAttacker":
    case "doNotGroundAttack":
    case "attackPlayersBuilding":
      break;

    case "plunder": {
      // Read actual tile loot from the fleet's current position
      for (const fleet of player.fleetInfo) {
        if (fleet.skyships <= 0) continue;
        const [fx, fy] = fleet.location;
        const tile = G.mapState.currentTileArray[fy]?.[fx];
        if (tile?.type === "legend" && tile.loot?.colony) {
          player.resources.gold += tile.loot.colony.gold ?? 0;
          player.resources.victoryPoints += tile.loot.colony.victoryPoints ?? 0;
          // Heresy advances on plunder
          if (player.hereticOrOrthodox === "heretic") {
            player.heresyTracker = Math.min(HERESY_MAX, player.heresyTracker + 1);
          } else {
            player.heresyTracker = Math.max(HERESY_MIN, player.heresyTracker - 1);
          }
          break;
        }
      }
      break;
    }

    case "garrisonTroops": {
      const [gRegs, gLevs, gElites] = (move.args[0] as [number, number, number]) ?? [0, 0, 0];
      const battleLoc = G.mapState.currentBattle;
      if (battleLoc) {
        const [bx, by] = battleLoc;
        const bldg = G.mapState.buildings[by]?.[bx];
        if (bldg) {
          bldg.garrisonedRegiments = (bldg.garrisonedRegiments ?? 0) + gRegs;
          bldg.garrisonedLevies = (bldg.garrisonedLevies ?? 0) + gLevs;
          bldg.garrisonedEliteRegiments = (bldg.garrisonedEliteRegiments ?? 0) + gElites;
          if (!bldg.player) bldg.player = { id: playerID } as any;
          // Deduct from fleet at battle location
          for (const fleet of player.fleetInfo) {
            if (fleet.location[0] === bx && fleet.location[1] === by && fleet.skyships > 0) {
              fleet.regiments = Math.max(0, fleet.regiments - gRegs);
              fleet.levies = Math.max(0, fleet.levies - gLevs);
              fleet.eliteRegiments = Math.max(0, fleet.eliteRegiments - gElites);
              break;
            }
          }
        }
      }
      break;
    }

    case "doNotPlunder":
    case "doNothing":
    case "pass":
    case "confirmAction":
    case "drawFoWCards":
    case "discardFoWCard":
    case "vote":
    case "retrieveFleets":
    case "contributeToGrandArmy":
    case "contributeToRebellion":
    case "commitRebellionTroops":
    case "nominateCaptainGeneral":
    case "offerBuyoffGold":
    case "respondToInfidelFleet":
    case "commitDeferredBattleCard":
    case "relocateDefeatedFleet":
    case "drawCard":
    case "pickCard":
    case "drawCardConquest":
    case "pickCardConquest":
    case "resolveEventChoice":
    case "chooseEventCard":
    case "immediateElectionVote":
    case "acknowledgeRoundSummary":
      break;
  }
}

// Simplified battle resolution with FoW cards

function resolveAerialBattles(G: MyGameState): void {
  const battleTiles = new Map<string, string[]>();

  for (const [pid, player] of Object.entries(G.playerInfo)) {
    for (const fleet of player.fleetInfo) {
      if (fleet.skyships <= 0) continue;
      const isHome = fleet.location[0] === KINGDOM_LOCATION[0] && fleet.location[1] === KINGDOM_LOCATION[1];
      if (isHome) continue;
      const key = `${fleet.location[0]},${fleet.location[1]}`;
      const existing = battleTiles.get(key) ?? [];
      if (!existing.includes(pid)) existing.push(pid);
      battleTiles.set(key, existing);
    }
  }

  for (const [, players] of battleTiles) {
    if (players.length < 2) continue;

    let bestPlayer = players[0];
    let bestStrength = 0;

    for (const pid of players) {
      const player = G.playerInfo[pid];
      let strength = 0;
      for (const fleet of player.fleetInfo) {
        strength += fleet.skyships + fleet.regiments * 2 + fleet.eliteRegiments * 3;
      }
      const cards = player.resources.fortuneCards;
      if (cards.length > 0) {
        const bestCard = cards.reduce((best, c) =>
          (c.sword + c.shield) > (best.sword + best.shield) ? c : best
        );
        strength += bestCard.sword;
      }

      if (strength > bestStrength) {
        bestStrength = strength;
        bestPlayer = pid;
      }
    }

    for (const pid of players) {
      if (pid === bestPlayer) continue;
      const player = G.playerInfo[pid];
      for (const fleet of player.fleetInfo) {
        if (fleet.skyships > 0) {
          fleet.skyships = Math.max(0, fleet.skyships - 1);
          break;
        }
      }
    }
  }
}

// Simplified ground battle resolution

function resolveGroundBattles(G: MyGameState): void {
  for (let y = 0; y < G.mapState.battleMap.length; y++) {
    const row = G.mapState.battleMap[y];
    if (!row) continue;
    for (let x = 0; x < row.length; x++) {
      const occupants = row[x];
      if (!occupants || occupants.length === 0) continue;

      const building = G.mapState.buildings[y]?.[x];
      if (!building || !building.buildings || !building.player) continue;

      const defenderID = building.player.id;

      for (const attackerID of occupants) {
        if (attackerID === defenderID) continue;

        const attacker = G.playerInfo[attackerID];
        const defender = G.playerInfo[defenderID];
        if (!attacker || !defender) continue;

        // Attacker strength: best regiment count from fleet at this tile + best FoW sword
        let attackStrength = 0;
        for (const fleet of attacker.fleetInfo) {
          if (fleet.location[0] === x && fleet.location[1] === y && fleet.skyships > 0) {
            attackStrength += fleet.regiments * 2 + fleet.eliteRegiments * 3;
          }
        }
        const attackCards = attacker.resources.fortuneCards;
        if (attackCards.length > 0) {
          attackStrength += Math.max(...attackCards.map(c => c.sword));
        }

        // Defender strength: garrison + best FoW shield + fort bonus
        let defenseStrength =
          building.garrisonedRegiments * 2 +
          building.garrisonedEliteRegiments * 3;
        const defenseCards = defender.resources.fortuneCards;
        if (defenseCards.length > 0) {
          defenseStrength += Math.max(...defenseCards.map(c => c.shield));
        }
        if (building.fort.includes(defenderID)) {
          defenseStrength += 3;
        }

        if (attackStrength > defenseStrength) {
          building.buildings = undefined;
          building.player = undefined;
        }
      }
    }
  }
}

function resolveConquest(G: MyGameState): void {
  for (const [pid, player] of Object.entries(G.playerInfo)) {
    for (const fleet of player.fleetInfo) {
      if (fleet.skyships <= 0) continue;
      const [fx, fy] = fleet.location;
      const isHome = fx === KINGDOM_LOCATION[0] && fy === KINGDOM_LOCATION[1];
      if (isHome) continue;

      const building = G.mapState.buildings[fy]?.[fx];
      if (!building || building.buildings) continue;

      const tile = G.mapState.currentTileArray[fy]?.[fx];
      if (!tile || tile.type !== "land") continue;

      let sole = true;
      for (const [otherID, otherPlayer] of Object.entries(G.playerInfo)) {
        if (otherID === pid) continue;
        for (const otherFleet of otherPlayer.fleetInfo) {
          if (otherFleet.skyships > 0 &&
              otherFleet.location[0] === fx && otherFleet.location[1] === fy) {
            sole = false;
            break;
          }
        }
        if (!sole) break;
      }

      if (sole && fleet.regiments + fleet.eliteRegiments > 0) {
        building.buildings = "outpost";
        building.player = { id: pid } as any;
      }
    }
  }
}

function resolveElection(G: MyGameState): void {
  let bestPlayer = "0";
  let bestCathedrals = 0;
  for (const [pid, player] of Object.entries(G.playerInfo)) {
    if (player.cathedrals > bestCathedrals) {
      bestCathedrals = player.cathedrals;
      bestPlayer = pid;
    }
  }
  if (bestCathedrals > 0) {
    G.playerInfo[bestPlayer].resources.victoryPoints += 2;
  }
}

// Fleet retrieval

function retrieveFleets(G: MyGameState): void {
  for (const [pid, player] of Object.entries(G.playerInfo)) {
    for (const fleet of player.fleetInfo) {
      if (fleet.skyships <= 0) continue;
      const [fx, fy] = fleet.location;
      const isHome = fx === KINGDOM_LOCATION[0] && fy === KINGDOM_LOCATION[1];
      if (isHome) continue;

      // Check if player owns a building at fleet location
      const building = G.mapState.buildings[fy]?.[fx];
      const ownsBuilding = building?.player?.id === pid && !!building.buildings;
      if (ownsBuilding) continue;

      // Route skyship placement before retrieval
      const fleetKey = tileKey(fx, fy);
      const isFaithdom = FAITHDOM_TILES.some(([tx, ty]) => tx === fx && ty === fy);
      if (!isFaithdom && fleet.skyships > 0) {
        if (wouldPlacementConnectRoute(G, pid, fleetKey)) {
          // Place a single route skyship here to repair a broken route
          const existing = G.mapState.routeSkyships[fleetKey] ?? [];
          if (!existing.includes(pid)) {
            existing.push(pid);
            G.mapState.routeSkyships[fleetKey] = existing;
            fleet.skyships -= 1;
          }
        } else if (fleet.skyships > 1) {
          // Leave a trail back to Faithdom
          const path = bfsShortestPath([fx, fy], FAITHDOM_TILES, G.mapState.currentTileArray);
          for (const [px, py] of path) {
            if (fleet.skyships <= 0) break;
            const pk = tileKey(px, py);
            const ex = G.mapState.routeSkyships[pk] ?? [];
            if (!ex.includes(pid)) {
              ex.push(pid);
              G.mapState.routeSkyships[pk] = ex;
              fleet.skyships -= 1;
            }
          }
        }
      }

      // Retrieve fleet to home
      player.resources.skyships += fleet.skyships;
      player.resources.regiments += fleet.regiments;
      player.resources.levies += fleet.levies;
      player.resources.eliteRegiments += fleet.eliteRegiments;
      removeBattleMapPresence(G, pid, fx, fy);
      fleet.skyships = 0;
      fleet.regiments = 0;
      fleet.levies = 0;
      fleet.eliteRegiments = 0;
      fleet.location = [...KINGDOM_LOCATION];
      fleet.travelHistory = [];
    }
  }
}

// Trade VP scoring

function applyTradeGains(G: MyGameState, allRoutes: Record<string, number>): void {
  // Determine VP schedule for current round (highest threshold <= round)
  const thresholds = Object.keys(TRADE_VP_SCHEDULE).map(Number).sort((a, b) => b - a);
  let vpAmounts: [number, number, number] = TRADE_VP_SCHEDULE[thresholds[thresholds.length - 1]];
  for (const t of thresholds) {
    if (G.round >= t) { vpAmounts = TRADE_VP_SCHEDULE[t]; break; }
  }

  // Rank players by active trade routes (pre-computed)
  const routeCounts: { pid: string; routes: number }[] = [];
  for (const pid of Object.keys(G.playerInfo)) {
    routeCounts.push({ pid, routes: allRoutes[pid] ?? 0 });
  }
  routeCounts.sort((a, b) => b.routes - a.routes);

  if (routeCounts.length === 0 || routeCounts[0].routes === 0) return;

  const first = routeCounts[0];
  const second = routeCounts[1];
  const third = routeCounts[2];

  if (first && first.routes > 0) {
    G.playerInfo[first.pid].resources.victoryPoints += vpAmounts[0];
  }
  if (second && second.routes > 0 && second.routes < first.routes) {
    G.playerInfo[second.pid].resources.victoryPoints += vpAmounts[1];
  }
  if (third && third.routes > 0 && third && second && third.routes < second.routes) {
    G.playerInfo[third.pid].resources.victoryPoints += vpAmounts[2];
  }
}

// Heresy VP scoring (applied every round)

function applyHeresyScoring(G: MyGameState): void {
  // Track is [-9, +9]. VP = h if heretic, VP = -h if orthodox.
  // Both score 0 at h=0. Positive h favours heretics, negative favours orthodox.
  for (const player of Object.values(G.playerInfo)) {
    const h = player.heresyTracker;
    const vp = player.hereticOrOrthodox === "orthodox" ? -h : h;
    player.resources.victoryPoints += vp;
  }
}

// Debt penalty

function applyDebtPenalty(G: MyGameState): void {
  for (const player of Object.values(G.playerInfo)) {
    if (player.resources.gold < 0) {
      const penalty = Math.floor(Math.abs(player.resources.gold) / DEBT_PENALTY_DIVISOR);
      player.resources.victoryPoints -= penalty;
    }
  }
}

// Action board reset

// Palace bonus (most palaces, non-tied)

function applyPalaceBonus(G: MyGameState): void {
  let bestPID = "";
  let bestCount = 0;
  let secondCount = 0;
  let tied = false;

  for (const [pid, player] of Object.entries(G.playerInfo)) {
    if (player.palaces > bestCount) {
      secondCount = bestCount;
      bestCount = player.palaces;
      bestPID = pid;
      tied = false;
    } else if (player.palaces === bestCount) {
      tied = true;
    } else if (player.palaces > secondCount) {
      secondCount = player.palaces;
    }
  }

  if (bestCount > 0 && !tied) {
    G.playerInfo[bestPID].resources.victoryPoints += (bestCount - secondCount);
  }
}

// Free dissenters heresy

function applyDissenterHeresy(G: MyGameState): void {
  for (const player of Object.values(G.playerInfo)) {
    if (player.freeDissenters > 0) {
      if (player.hereticOrOrthodox === "heretic") {
        player.heresyTracker = Math.min(HERESY_MAX, player.heresyTracker + player.freeDissenters);
      } else {
        player.heresyTracker = Math.max(HERESY_MIN, player.heresyTracker - player.freeDissenters);
      }
    }
  }
}

// Final round: gold → VP

function applyFinalGoldBonus(G: MyGameState): void {
  for (const player of Object.values(G.playerInfo)) {
    if (player.resources.gold > 0) {
      player.resources.victoryPoints += Math.floor(player.resources.gold / 5);
    }
  }
}

// Action board reset

function resetActionBoard(G: MyGameState): void {
  for (const key of [1, 2, 3, 4] as const) {
    G.boardState.foundBuildings[key] = [];
  }
  G.boardState.foundFactories = [];
}

function applyTaxes(G: MyGameState, allRoutes: Record<string, number>): void {
  for (const [pid, player] of Object.entries(G.playerInfo)) {
    const routes = allRoutes[pid] ?? 0;
    const engaged = Math.min(player.factories, routes);
    const income = BASE_GOLD_INCOME + engaged * 2;
    player.resources.gold += income;
  }
}

// Tile pool: total counts from tileDefinitions
// 32 tiles total: 18 land, 6 legend, 8 ocean (from tileDefinitions.ts)
const TOTAL_TILE_COUNTS = { land: 18, legend: 6, ocean: 8 } as const;

const EMPTY_LOOT: TileLoot = {
  gold: 0, mithril: 0, dragonScales: 0, krakenSkin: 0,
  magicDust: 0, stickyIchor: 0, pipeweed: 0, victoryPoints: 0,
};

// Average loot per land tile (approx from tileDefinitions)
const AVG_LAND_LOOT: TileLoot = {
  gold: 1, mithril: 0, dragonScales: 0, krakenSkin: 0,
  magicDust: 0, stickyIchor: 0, pipeweed: 0, victoryPoints: 0,
};

// Average loot per legend tile (approx from tileDefinitions)
const AVG_LEGEND_LOOT: TileLoot = {
  gold: 2, mithril: 0, dragonScales: 0, krakenSkin: 0,
  magicDust: 0, stickyIchor: 0, pipeweed: 0, victoryPoints: 1,
};

function sampleTileType(remaining: { land: number; legend: number; ocean: number }): "land" | "legend" | "ocean" {
  const total = remaining.land + remaining.legend + remaining.ocean;
  if (total <= 0) return "ocean";
  const roll = Math.random() * total;
  if (roll < remaining.land) return "land";
  if (roll < remaining.land + remaining.legend) return "legend";
  return "ocean";
}

function makePlaceholderTile(type: "land" | "legend" | "ocean"): TileInfoProps {
  const loot = type === "land"
    ? { outpost: { ...AVG_LAND_LOOT }, colony: { ...AVG_LAND_LOOT } }
    : type === "legend"
    ? { outpost: { ...AVG_LEGEND_LOOT }, colony: { ...AVG_LEGEND_LOOT } }
    : { outpost: { ...EMPTY_LOOT }, colony: { ...EMPTY_LOOT } };
  return {
    name: `sim_${type}`,
    blocked: [],
    sword: type === "legend" ? 8 : 5,
    shield: type === "legend" ? 8 : 5,
    type,
    loot,
  };
}

// Simulated discovery phase

function simulateDiscovery(G: MyGameState): void {
  // Count already-discovered tiles by type
  const discovered = { land: 0, legend: 0, ocean: 0 };
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (!G.mapState.discoveredTiles[y]?.[x]) continue;
      const tile = G.mapState.currentTileArray[y]?.[x];
      if (!tile) continue;
      if (tile.type === "land") discovered.land++;
      else if (tile.type === "legend") discovered.legend++;
      else if (tile.type === "ocean") discovered.ocean++;
    }
  }

  // Remaining pool
  const remaining = {
    land: Math.max(0, TOTAL_TILE_COUNTS.land - discovered.land),
    legend: Math.max(0, TOTAL_TILE_COUNTS.legend - discovered.legend),
    ocean: Math.max(0, TOTAL_TILE_COUNTS.ocean - discovered.ocean),
  };

  if (remaining.land + remaining.legend + remaining.ocean === 0) return;

  // Find hidden tiles adjacent to any discovered tile
  const candidates: [number, number][] = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (G.mapState.discoveredTiles[y]?.[x]) continue; // already discovered
      const neighbors = getNeighbors(x, y);
      const hasDiscoveredNeighbor = neighbors.some(
        ([nx, ny]) => G.mapState.discoveredTiles[ny]?.[nx],
      );
      if (hasDiscoveredNeighbor) candidates.push([x, y]);
    }
  }

  if (candidates.length === 0) return;

  // Flip 2-3 tiles (typical discovery round)
  const flipCount = Math.min(candidates.length, 2 + (Math.random() < 0.5 ? 1 : 0));
  for (let i = 0; i < flipCount; i++) {
    const idx = Math.floor(Math.random() * candidates.length);
    const [x, y] = candidates[idx];
    candidates.splice(idx, 1);

    const type = sampleTileType(remaining);
    remaining[type] = Math.max(0, remaining[type] - 1);

    const tile = makePlaceholderTile(type);
    G.mapState.currentTileArray[y][x] = tile;
    G.mapState.discoveredTiles[y][x] = true;

    // Initialize building slot if needed
    if (!G.mapState.buildings[y]) G.mapState.buildings[y] = [] as any;
    if (!G.mapState.buildings[y][x]) {
      G.mapState.buildings[y][x] = {
        buildings: undefined,
        player: undefined,
        fort: [],
        garrisonedRegiments: 0,
        garrisonedLevies: 0,
        garrisonedEliteRegiments: 0,
      } as any;
    }
  }
}

// Simulated events phase (expected-value noise)

function simulateEvents(G: MyGameState): void {
  for (const player of Object.values(G.playerInfo)) {
    // VP swing: ±1, slight negative bias (events are slightly harmful on average)
    const vpSwing = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
    player.resources.victoryPoints += vpSwing;

    // Gold swing: ±2, slight negative bias
    const goldSwing = Math.floor(Math.random() * 5) - 2; // -2, -1, 0, +1, or +2
    player.resources.gold += goldSwing;

    // Heresy swing: ±1
    const heresySwing = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
    player.heresyTracker = Math.max(HERESY_MIN,
      Math.min(HERESY_MAX, player.heresyTracker + heresySwing));
  }
}

// Simulate one round

const ROLLOUT_ACTIONS: AIMove[] = [
  { move: "foundBuildings", args: [0] },
  { move: "recruitRegiments", args: [0] },
  { move: "purchaseSkyships", args: ["zeeland"] },
  { move: "recruitCounsellors", args: [0] },
  { move: "foundFactory", args: [0] },
];

function simulateActions(G: MyGameState, _personalities: Record<string, BotPersonality>): void {
  for (const [pid, player] of Object.entries(G.playerInfo)) {
    for (const action of ROLLOUT_ACTIONS) {
      if (player.actionsTakenThisRound >= player.resources.counsellors) break;
      applyMove(G, pid, action);
    }
  }
}

/**
 * Simulate one round, mutating G in place.
 * Caller is responsible for cloning if needed (MCTSSearch clones per simulation).
 */
export function simulateRound(
  G: MyGameState,
  personalities: Record<string, BotPersonality>,
): void {
  // Discovery phase (sampled from remaining tile pool)
  simulateDiscovery(G);

  // Actions phase
  simulateActions(G, personalities);

  // Events phase (expected-value noise — uncontrollable, so approximate)
  simulateEvents(G);

  // Simplified resolution
  resolveAerialBattles(G);
  resolveGroundBattles(G);
  resolveConquest(G);
  resolveElection(G);
  retrieveFleets(G);
  // Compute trade routes once, reuse for both trade VP and tax income
  const allRoutes = computeAllTradeRoutesCached(G);
  applyTradeGains(G, allRoutes);
  applyPalaceBonus(G);
  applyDissenterHeresy(G);
  applyHeresyScoring(G);
  applyTaxes(G, allRoutes);
  resetActionBoard(G);

  // Reset action counters for next round
  for (const player of Object.values(G.playerInfo)) {
    player.actionsTakenThisRound = 0;
  }

  // Final round bonuses and penalties
  if (G.round >= G.finalRound) {
    applyFinalGoldBonus(G);
    applyDebtPenalty(G);
  }

  // Advance round
  G.round += 1;
}

// Rollout: simulate N rounds from current state

/**
 * Rollout: simulate N rounds from current state, mutating G in place.
 * Caller is responsible for cloning (MCTSSearch clones per simulation).
 */
export function rollout(
  G: MyGameState,
  playerID: string,
  personalities: Record<string, BotPersonality>,
  depth: number,
): number {
  for (let i = 0; i < depth; i++) {
    if (G.round > G.finalRound) break;
    simulateRound(G, personalities);
  }

  return evaluatePosition(G, playerID);
}
