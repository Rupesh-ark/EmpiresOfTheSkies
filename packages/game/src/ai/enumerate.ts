import { MOVE_DEFINITIONS } from "../moveDefinitions";
import type { MyGameState } from "../types";
import type { Ctx } from "boardgame.io";
import type { AIMove } from "./types";
import { getNeighbors } from "../helpers/mapUtils";
import { MAP_WIDTH, MAP_HEIGHT, KINGDOM_LOCATION, MAX_SKYSHIPS_PER_FLEET } from "../data/gameData";
import { findPossibleDestinations } from "../helpers/helpers";

function tryValidate(moveName: string, G: MyGameState, playerID: string, ...args: any[]): boolean {
  try {
    const def = MOVE_DEFINITIONS[moveName];
    if (!def?.validate) return true; // no validate = assume legal
    return def.validate(G, playerID, ...args) === null;
  } catch {
    return false; // validate crashed = skip this move
  }
}

/**
 * Generate resolveEventChoice moves with the correct args for each event type.
 * Reads the valid options from pendingChoice fields.
 */
function enumerateEventChoice(pending: NonNullable<MyGameState["eventState"]["pendingChoice"]>): AIMove[] {
  const moves: AIMove[] = [];

  if (pending.binaryOptions) {
    // guild_revolt, corruption_scandal: two string options
    for (const opt of pending.binaryOptions) {
      moves.push({ move: "resolveEventChoice", args: [opt] });
    }
  } else if (pending.buildingOptions && pending.buildingOptions.length > 0) {
    // the_great_fire: choose building type to lose
    for (const building of pending.buildingOptions) {
      moves.push({ move: "resolveEventChoice", args: [building] });
    }
  } else if (pending.colonyOptions && pending.colonyOptions.length > 0) {
    // colonial_rebellion: choose which colony
    for (const tile of pending.colonyOptions) {
      moves.push({ move: "resolveEventChoice", args: [tile] });
    }
  } else if (pending.allyOptions && pending.allyOptions.length > 0) {
    // dynastic_marriage: choose an ally
    for (const ally of pending.allyOptions) {
      moves.push({ move: "resolveEventChoice", args: [ally] });
    }
  } else if (pending.legacyOptions && pending.legacyOptions.length > 0) {
    // royal_succession: choose a legacy card
    for (const card of pending.legacyOptions) {
      moves.push({ move: "resolveEventChoice", args: [card] });
    }
  }

  // Fallback if no specific options found
  if (moves.length === 0) {
    moves.push({ move: "resolveEventChoice", args: ["accept"] });
    moves.push({ move: "resolveEventChoice", args: ["decline"] });
  }

  return moves;
}

export function enumerateLegalMoves(G: MyGameState, ctx: Ctx, playerID: string): AIMove[] {
  const phase = ctx.phase;

  switch (phase) {
    case "kingdom_advantage": {
      return G.cardDecks.kingdomAdvantagePool.map((cardName) => ({
        move: "pickKingdomAdvantageCard",
        args: [cardName],
      }));
    }

    case "legacy_card": {
      return G.playerInfo[playerID].legacyCardOptions.map((cardInfo) => ({
        move: "pickLegacyCard",
        args: [cardInfo],
      }));
    }

    case "events": {
      const moves: AIMove[] = [];

      if (G.stage === "events") {
        // Check if there's a pending event choice for this player
        // (G.stage stays "events" but the player needs to resolve a choice)
        const pending = G.eventState.pendingChoice;
        if (pending && pending.targetPlayerID === playerID) {
          return enumerateEventChoice(pending);
        }

        // Already submitted or no cards in hand — nothing to do
        const alreadySubmitted = playerID in G.eventState.eventContributions;
        const hand = G.playerInfo[playerID].resources.eventCards;
        if (alreadySubmitted || hand.length === 0) {
          return []; // game loop will skip; turn advances when all players submit
        }
        for (const cardName of hand) {
          moves.push({ move: "chooseEventCard", args: [cardName] });
        }
      } else if (G.stage === "immediate_election" || G.stage.includes("election") || G.stage.includes("vote")) {
        for (const targetID of ctx.playOrder) {
          moves.push({ move: "immediateElectionVote", args: [targetID] });
        }
      } else {
        const pending = G.eventState.pendingChoice;
        if (pending && pending.targetPlayerID === playerID) {
          return enumerateEventChoice(pending);
        }
        // Fallback: generic accept/decline
        moves.push({ move: "resolveEventChoice", args: ["accept"] });
        moves.push({ move: "resolveEventChoice", args: ["decline"] });
      }

      return moves;
    }

    case "discovery": {
      // Player already passed — nothing to do
      if (G.playerInfo[playerID].passed) {
        return [{ move: "pass", args: [] }];
      }

      const moves: AIMove[] = [];

      if (ctx.numMoves > 0) {
        // Cascade: must pick a tile adjacent to the most recently discovered tile
        const [lx, ly] = G.mapState.mostRecentlyDiscoveredTile;
        const cascadeNeighbors = getNeighbors(lx, ly, true);
        for (const [nx, ny] of cascadeNeighbors) {
          if (G.mapState.discoveredTiles[ny]?.[nx] === false) {
            moves.push({ move: "discoverTile", args: [[nx, ny]] });
          }
        }

        // Cascade fallback: if last tile has no hidden neighbors,
        // allow any tile adjacent to any discovered tile (v4.2 rule)
        if (moves.length === 0) {
          for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
              if (G.mapState.discoveredTiles[y][x] === false) {
                const neighbors = getNeighbors(x, y, true);
                const hasDiscoveredNeighbor = neighbors.some(
                  ([nx, ny]) => G.mapState.discoveredTiles[ny]?.[nx]
                );
                if (hasDiscoveredNeighbor) {
                  moves.push({ move: "discoverTile", args: [[x, y]] });
                }
              }
            }
          }
        }
      } else {
        // First flip: any undiscovered tile adjacent to any discovered tile
        for (let y = 0; y < MAP_HEIGHT; y++) {
          for (let x = 0; x < MAP_WIDTH; x++) {
            if (G.mapState.discoveredTiles[y][x] === false) {
              const neighbors = getNeighbors(x, y, true);
              const hasDiscoveredNeighbor = neighbors.some(
                ([nx, ny]) => G.mapState.discoveredTiles[ny]?.[nx]
              );
              if (hasDiscoveredNeighbor) {
                moves.push({ move: "discoverTile", args: [[x, y]] });
              }
            }
          }
        }
      }

      moves.push({ move: "pass", args: [] });
      return moves;
    }

    case "taxes": {
      return [];
    }

    case "actions": {
      if (G.stage === "attack or pass") {
        return [{ move: "pass", args: [] }];
      }

      if (G.stage === "confirm_fow_draw") {
        return [{ move: "confirmAction", args: [] }];
      }

      if (G.stage === "discard_fow") {
        const hand = G.playerInfo[playerID].resources.fortuneCards;
        const discardMoves: AIMove[] = [];
        for (let i = 0; i < hand.length; i++) {
          discardMoves.push({ move: "discardFoWCard", args: [i] });
        }
        return discardMoves.length > 0 ? discardMoves : [{ move: "confirmAction", args: [] }];
      }

      const moves: AIMove[] = [];

      // Slot-based moves
      for (const moveName of ["recruitCounsellors", "recruitRegiments", "purchaseSkyships"] as const) {
        for (const slotIndex of [0, 1, 2]) {
          if (tryValidate(moveName, G, playerID, slotIndex)) {
            moves.push({ move: moveName, args: [slotIndex] });
          }
        }
      }

      // Building moves (try slots 0..3)
      for (const slotIndex of [0, 1, 2, 3]) {
        if (tryValidate("foundBuildings", G, playerID, slotIndex)) {
          moves.push({ move: "foundBuildings", args: [slotIndex] });
        }
      }

      // Factory moves (try slots 0..3)
      for (const slotIndex of [0, 1, 2, 3]) {
        if (tryValidate("foundFactory", G, playerID, slotIndex)) {
          moves.push({ move: "foundFactory", args: [slotIndex] });
        }
      }

      // No-arg action moves
      // NOTE: increaseHeresy/increaseOrthodoxy are NOT player actions —
      // they're side effects of other game events (discovery, buildings, decrees)
      for (const moveName of [
        "trainTroops",
        "drawFoWCards",
        "buildSkyships",
        "conscriptLevies",
        "issueHolyDecree",
      ] as const) {
        if (tryValidate(moveName, G, playerID)) {
          moves.push({ move: moveName, args: [] });
        }
      }

      // Punish dissenters (slot + payment type)
      if (G.playerInfo[playerID].freeDissenters > 0) {
        for (let slotIndex = 0; slotIndex < ctx.numPlayers; slotIndex++) {
          for (const paymentType of ["gold", "counsellor", "execute"] as const) {
            if (tryValidate("punishDissenters", G, playerID, slotIndex, paymentType, ctx.numPlayers)) {
              moves.push({ move: "punishDissenters", args: [slotIndex, paymentType] });
            }
          }
        }
      }

      // Convert monarch
      for (const dir of ["advance", "retreat"] as const) {
        if (tryValidate("convertMonarch", G, playerID, dir)) {
          moves.push({ move: "convertMonarch", args: [dir] });
        }
      }

      // Influence prelates
      for (let prelateIndex = 1; prelateIndex <= 8; prelateIndex++) {
        if (tryValidate("influencePrelates", G, playerID, prelateIndex)) {
          moves.push({ move: "influencePrelates", args: [prelateIndex, "advance"] });
        }
      }

      // Alter player order
      for (let position = 0; position <= 5; position++) {
        if (tryValidate("alterPlayerOrder", G, playerID, position, ctx.numPlayers)) {
          moves.push({ move: "alterPlayerOrder", args: [position, ctx.numPlayers] });
        }
      }

      // Sell moves
      if (tryValidate("sellSkyships", G, playerID)) {
        moves.push({ move: "sellSkyships", args: [] });
      }
      if (tryValidate("sellBuilding", G, playerID)) {
        moves.push({ move: "sellBuilding", args: [] });
      }

      // sendAgitators — costs 2 gold, no counsellor cost
      if (G.playerInfo[playerID].resources.gold >= 2) {
        for (const otherID of ctx.playOrder) {
          if (otherID !== playerID) {
            moves.push({ move: "sendAgitators", args: [otherID] });
          }
        }
      }

      // moveFleet — move deployed fleets to new tiles
      const player = G.playerInfo[playerID];
      if (
        player.resources.counsellors >= 1 &&
        player.resources.gold >= 1 &&
        !player.playerBoardCounsellorLocations.dispatchSkyshipFleet
      ) {
        for (let fi = 0; fi < player.fleetInfo.length; fi++) {
          const fleet = player.fleetInfo[fi];
          const isAtHome =
            fleet.location[0] === KINGDOM_LOCATION[0] &&
            fleet.location[1] === KINGDOM_LOCATION[1];
          if (fleet.skyships === 0 || isAtHome) continue;

          const unladen =
            fleet.regiments === 0 && fleet.levies === 0 && fleet.eliteRegiments === 0;
          const [validDests] = findPossibleDestinations(G, fleet.location, unladen);
          for (const dest of validDests) {
            if (tryValidate("moveFleet", G, playerID, fi, dest)) {
              moves.push({ move: "moveFleet", args: [fi, dest] });
            }
          }
        }
      }

      // deployFleet — deploy from home with sensible loadouts
      if (
        player.resources.counsellors >= 1 &&
        player.resources.gold >= 1 &&
        player.resources.skyships >= 1 &&
        !player.playerBoardCounsellorLocations.dispatchSkyshipFleet
      ) {
        for (let fi = 0; fi < player.fleetInfo.length; fi++) {
          const fleet = player.fleetInfo[fi];
          const isAtHome =
            fleet.location[0] === KINGDOM_LOCATION[0] &&
            fleet.location[1] === KINGDOM_LOCATION[1];
          if (!isAtHome || fleet.skyships > 0) continue; // must be at home AND empty

          const res = player.resources;
          const maxSky = Math.min(res.skyships, MAX_SKYSHIPS_PER_FLEET);

          // Scout loadout destinations (unladen)
          const [scoutDests] = findPossibleDestinations(G, KINGDOM_LOCATION, true);
          for (const dest of scoutDests.slice(0, 10)) {
            if (tryValidate("deployFleet", G, playerID, fi, dest, 1, 0, 0, 0)) {
              moves.push({ move: "deployFleet", args: [fi, dest, 1, 0, 0, 0] });
            }
          }

          // Assault loadout destinations (laden if troops exist)
          const hasTroops = res.regiments > 0 || res.levies > 0 || res.eliteRegiments > 0;
          if (hasTroops && maxSky > 0) {
            const [ladenDests] = findPossibleDestinations(G, KINGDOM_LOCATION, false);
            const troopCapacity = maxSky; // 1 troop per skyship
            const elites = Math.min(res.eliteRegiments, troopCapacity);
            const regs = Math.min(res.regiments, troopCapacity - elites);
            const levs = Math.min(res.levies, troopCapacity - elites - regs);

            for (const dest of ladenDests.slice(0, 10)) {
              if (tryValidate("deployFleet", G, playerID, fi, dest, maxSky, regs, levs, elites)) {
                moves.push({ move: "deployFleet", args: [fi, dest, maxSky, regs, levs, elites] });
              }
            }

            // Balanced: 3 skyships, half troops
            if (maxSky >= 3) {
              const balSky = 3;
              const balCap = balSky;
              const balRegs = Math.min(res.regiments, Math.ceil(balCap / 2));
              const balLevs = Math.min(res.levies, balCap - balRegs);
              for (const dest of ladenDests.slice(0, 5)) {
                if (tryValidate("deployFleet", G, playerID, fi, dest, balSky, balRegs, balLevs, 0)) {
                  moves.push({ move: "deployFleet", args: [fi, dest, balSky, balRegs, balLevs, 0] });
                }
              }
            }
          }
        }
      }

      // garrisonTransfer — transfer troops between fleet and garrison at outposts/colonies
      for (let fi = 0; fi < player.fleetInfo.length; fi++) {
        const fleet = player.fleetInfo[fi];
        const isAtHome =
          fleet.location[0] === KINGDOM_LOCATION[0] &&
          fleet.location[1] === KINGDOM_LOCATION[1];
        if (isAtHome || fleet.skyships === 0) continue;

        const [fx, fy] = fleet.location;
        const building = G.mapState.buildings[fy]?.[fx];
        if (
          !building ||
          (building.buildings !== "outpost" && building.buildings !== "colony") ||
          building.player?.id !== playerID
        ) continue;

        // Fleet → garrison (positive = fleet to garrison)
        const fleetTroops = fleet.regiments + fleet.levies + fleet.eliteRegiments;
        if (fleetTroops > 0) {
          moves.push({
            move: "garrisonTransfer",
            args: [fleet.fleetId, fleet.location, fleet.regiments, fleet.levies, fleet.eliteRegiments],
          });
        }

        // Garrison → fleet (negative values)
        const garrisonRegs = building.garrisonedRegiments ?? 0;
        const garrisonLevs = building.garrisonedLevies ?? 0;
        const garrisonElites = building.garrisonedEliteRegiments ?? 0;
        const garrisonTotal = garrisonRegs + garrisonLevs + garrisonElites;
        if (garrisonTotal > 0) {
          // Respect fleet capacity: troops on fleet after transfer must not exceed skyships
          const currentFleetTroops = fleet.regiments + fleet.levies + fleet.eliteRegiments;
          const freeCapacity = fleet.skyships - currentFleetTroops;
          if (freeCapacity > 0) {
            const xferElites = Math.min(garrisonElites, freeCapacity);
            const xferRegs = Math.min(garrisonRegs, freeCapacity - xferElites);
            const xferLevs = Math.min(garrisonLevs, freeCapacity - xferElites - xferRegs);
            if (xferElites + xferRegs + xferLevs > 0) {
              moves.push({
                move: "garrisonTransfer",
                args: [fleet.fleetId, fleet.location, -xferRegs, -xferLevs, -xferElites],
              });
            }
          }
        }
      }

      // TODO: enumerate transferBetweenFleets options (fleet-to-fleet transfers at same tile)
      // TODO: enumerate proposeDeal options (trade negotiations with other players)

      moves.push({ move: "pass", args: [] });
      moves.push({ move: "confirmAction", args: [] });

      return moves;
    }

    case "aerial_battle": {
      const moves: AIMove[] = [];

      if (G.stage === "attack or pass") {
        moves.push({ move: "doNotAttack", args: [] });
        for (const otherID of ctx.playOrder) {
          if (otherID !== playerID) {
            moves.push({ move: "attackOtherPlayersFleet", args: [otherID] });
          }
        }
      } else if (G.stage === "attack or evade") {
        moves.push({ move: "evadeAttackingFleet", args: [] });
        moves.push({ move: "drawCard", args: [] });
      } else if (G.stage === "resolve battle") {
        const cards = G.playerInfo[playerID].resources.fortuneCards;
        for (let i = 0; i < cards.length; i++) {
          moves.push({ move: "pickCard", args: [i] });
        }
        moves.push({ move: "drawCard", args: [] });
      } else if (G.stage === "relocate loser") {
        const battleState = G.battleState;
        if (battleState) {
          const defeatedPlayerID =
            battleState.attacker.id === playerID
              ? battleState.defender.id
              : battleState.attacker.id;
          for (const tile of G.validRelocationTiles) {
            moves.push({ move: "relocateDefeatedFleet", args: [tile, defeatedPlayerID] });
          }
        }
      } else if (G.stage === "conquest draw or pick card") {
        const cards = G.playerInfo[playerID].resources.fortuneCards;
        for (let i = 0; i < cards.length; i++) {
          moves.push({ move: "pickCard", args: [i] });
        }
        moves.push({ move: "drawCard", args: [] });
      } else {
        moves.push({ move: "doNotAttack", args: [] });
      }

      return moves;
    }

    case "plunder_legends": {
      return [
        { move: "plunder", args: [] },
        { move: "doNotPlunder", args: [] },
      ];
    }

    case "ground_battle": {
      const moves: AIMove[] = [];

      if (G.stage === "attack or pass") {
        moves.push({ move: "doNotGroundAttack", args: [] });
        for (const otherID of ctx.playOrder) {
          if (otherID !== playerID) {
            moves.push({ move: "attackPlayersBuilding", args: [otherID] });
          }
        }
      } else if (G.stage === "defend or yield" || G.stage.includes("defend")) {
        moves.push({ move: "defendGroundAttack", args: [] });
        moves.push({ move: "yieldToAttacker", args: [] });
      } else if (G.stage === "resolve battle") {
        const cards = G.playerInfo[playerID].resources.fortuneCards;
        for (let i = 0; i < cards.length; i++) {
          moves.push({ move: "pickCard", args: [i] });
        }
        moves.push({ move: "drawCard", args: [] });
      } else if (G.stage === "garrison troops") {
        const avail = G.troopsAvailableForGarrison;
        // All available troops
        moves.push({ move: "garrisonTroops", args: [[avail.regiments, avail.levies, avail.elites]] });
        // Half available troops
        moves.push({
          move: "garrisonTroops",
          args: [[
            Math.ceil(avail.regiments / 2),
            Math.ceil(avail.levies / 2),
            Math.ceil(avail.elites / 2),
          ]],
        });
        // Garrison none
        moves.push({ move: "garrisonTroops", args: [[0, 0, 0]] });
      } else if (G.stage === "relocate loser") {
        const battleState = G.battleState;
        if (battleState) {
          const defeatedPlayerID =
            battleState.attacker.id === playerID
              ? battleState.defender.id
              : battleState.attacker.id;
          for (const tile of G.validRelocationTiles) {
            moves.push({ move: "relocateDefeatedFleet", args: [tile, defeatedPlayerID] });
          }
        }
      } else if (G.stage.includes("pick card")) {
        const cards = G.playerInfo[playerID].resources.fortuneCards;
        for (let i = 0; i < cards.length; i++) {
          moves.push({ move: "pickCard", args: [i] });
        }
      } else {
        moves.push({ move: "doNotGroundAttack", args: [] });
      }

      return moves;
    }

    case "conquest": {
      if (G.stage === "conquest draw or pick card") {
        const moves: AIMove[] = [];
        const cards = G.playerInfo[playerID].resources.fortuneCards;
        for (let i = 0; i < cards.length; i++) {
          moves.push({ move: "pickCardConquest", args: [i] });
        }
        moves.push({ move: "drawCardConquest", args: [] });
        return moves;
      }

      if (G.stage === "garrison troops") {
        const avail = G.troopsAvailableForGarrison;
        return [
          { move: "garrisonTroops", args: [[avail.regiments, avail.levies, avail.elites]] },
          {
            move: "garrisonTroops",
            args: [[
              Math.ceil(avail.regiments / 2),
              Math.ceil(avail.levies / 2),
              Math.ceil(avail.elites / 2),
            ]],
          },
          { move: "garrisonTroops", args: [[0, 0, 0]] },
        ];
      }

      const moves: AIMove[] = [{ move: "doNothing", args: [] }];
      moves.push({ move: "coloniseLand", args: [] });

      const player = G.playerInfo[playerID];
      for (const fleet of player.fleetInfo) {
        const isAtHome =
          fleet.location[0] === KINGDOM_LOCATION[0] &&
          fleet.location[1] === KINGDOM_LOCATION[1];
        if (!isAtHome && fleet.skyships > 0) {
          moves.push({ move: "constructOutpost", args: [fleet.location] });
        }
      }

      return moves;
    }

    case "election": {
      return ctx.playOrder.map((targetID) => ({
        move: "vote",
        args: [targetID],
      }));
    }

    case "resolution": {
      const moves: AIMove[] = [];

      if (G.stage === "retrieve fleets") {
        const deployedIndices: number[] = [];
        const fleets = G.playerInfo[playerID].fleetInfo;
        for (let i = 0; i < fleets.length; i++) {
          const f = fleets[i];
          const isAtHome =
            f.location[0] === KINGDOM_LOCATION[0] &&
            f.location[1] === KINGDOM_LOCATION[1];
          if (f.skyships > 0 && !isAtHome) {
            deployedIndices.push(i);
          }
        }
        if (deployedIndices.length > 0) {
          moves.push({ move: "retrieveFleets", args: [deployedIndices] });
        }
        moves.push({ move: "pass", args: [] });
      } else if (G.stage === "infidel_fleet_combat") {
        moves.push({ move: "respondToInfidelFleet", args: ["fight"] });
        moves.push({ move: "respondToInfidelFleet", args: ["evade"] });
      } else if (G.stage === "deferred_battle") {
        // Pick or draw a FoW card for the deferred battle
        const cards = G.playerInfo[playerID].resources.fortuneCards;
        for (let i = 0; i < cards.length; i++) {
          moves.push({ move: "pickCard", args: [i] });
        }
        moves.push({ move: "drawCard", args: [] });
      } else if (G.stage === "rebellion") {
        const rebellion = G.currentRebellion;
        if (rebellion && rebellion.event.targetPlayerID === playerID) {
          // Target player commits troops: (regiments, levies, fowCardIndex?)
          const player = G.playerInfo[playerID];
          const regs = player.resources.regiments;
          const levs = player.resources.levies;
          // Commit all
          moves.push({ move: "commitRebellionTroops", args: [regs, levs] });
          // Commit half
          moves.push({ move: "commitRebellionTroops", args: [Math.ceil(regs / 2), Math.ceil(levs / 2)] });
          // Commit none
          moves.push({ move: "commitRebellionTroops", args: [0, 0] });
        }
        // Not the target → nothing to do (return empty moves)
      } else if (G.stage === "rebellion_rival_support") {
        // Rivals choose to support defender or rebels
        // contributeToRebellion(side, regiments, levies) — max 3 troops total
        const player = G.playerInfo[playerID];
        const regs = Math.min(player.resources.regiments, 3);
        // Stay out
        moves.push({ move: "contributeToRebellion", args: ["defender", 0, 0] });
        moves.push({ move: "contributeToRebellion", args: ["rebel", 0, 0] });
        // Commit troops (up to 3 max)
        if (regs > 0) {
          moves.push({ move: "contributeToRebellion", args: ["defender", regs, 0] });
          moves.push({ move: "contributeToRebellion", args: ["rebel", regs, 0] });
        }
      } else if (G.stage === "invasion_nominate") {
        // Only the Archprelate can nominate — others have nothing to do
        if (!G.playerInfo[playerID].isArchprelate) return moves;
        const eligible = G.currentInvasion?.eligibleCaptainGenerals ?? ctx.playOrder;
        for (const id of eligible) {
          moves.push({ move: "nominateCaptainGeneral", args: [id] });
        }
      } else if (G.stage === "invasion_contribute") {
        // Each player contributes troops to the Grand Army
        const player = G.playerInfo[playerID];
        const regs = player.resources.regiments;
        const levs = player.resources.levies;
        const sky = player.resources.skyships;
        // Contribute all
        moves.push({ move: "contributeToGrandArmy", args: [regs, levs, sky] });
        // Contribute half
        moves.push({ move: "contributeToGrandArmy", args: [Math.ceil(regs / 2), Math.ceil(levs / 2), 0] });
        // Contribute nothing
        moves.push({ move: "contributeToGrandArmy", args: [0, 0, 0] });
      } else if (G.stage === "invasion_buyoff") {
        // Each player offers gold toward the buy-off
        const player = G.playerInfo[playerID];
        const gold = Math.max(0, player.resources.gold);
        const buyoffCost = G.currentInvasion?.buyoffCost ?? 0;
        const fairShare = Math.ceil(buyoffCost / ctx.playOrder.length);
        // Offer fair share (or all gold if less)
        moves.push({ move: "offerBuyoffGold", args: [Math.min(gold, fairShare)] });
        // Offer all gold
        if (gold > fairShare) {
          moves.push({ move: "offerBuyoffGold", args: [gold] });
        }
        // Offer nothing
        moves.push({ move: "offerBuyoffGold", args: [0] });
      } else {
        moves.push({ move: "pass", args: [] });
      }

      return moves;
    }

    case "reset": {
      return [];
    }

    default: {
      return [{ move: "pass", args: [] }];
    }
  }
}
