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
        // Check if player already submitted: look at eventContributions
        const alreadySubmitted = playerID in G.eventState.eventContributions;
        if (!alreadySubmitted) {
          for (const cardName of G.playerInfo[playerID].resources.eventCards) {
            moves.push({ move: "chooseEventCard", args: [cardName] });
          }
        }
      } else if (G.stage === "immediate_election" || G.stage.includes("election") || G.stage.includes("vote")) {
        for (const targetID of ctx.playOrder) {
          moves.push({ move: "immediateElectionVote", args: [targetID] });
        }
      } else {
        moves.push({ move: "resolveEventChoice", args: ["accept"] });
        moves.push({ move: "resolveEventChoice", args: ["decline"] });
      }

      return moves;
    }

    case "discovery": {
      const moves: AIMove[] = [];

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

      moves.push({ move: "pass", args: [] });
      return moves;
    }

    case "taxes": {
      return [];
    }

    case "actions": {
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

      // No-arg action moves
      for (const moveName of [
        "trainTroops",
        "drawFoWCards",
        "buildSkyships",
        "conscriptLevies",
        "increaseHeresy",
        "increaseOrthodoxy",
        "issueHolyDecree",
      ] as const) {
        if (tryValidate(moveName, G, playerID)) {
          moves.push({ move: moveName, args: [] });
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
            moves.push({ move: "moveFleet", args: [fi, dest] });
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
            moves.push({ move: "deployFleet", args: [fi, dest, 1, 0, 0, 0] });
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
              moves.push({ move: "deployFleet", args: [fi, dest, maxSky, regs, levs, elites] });
            }

            // Balanced: 3 skyships, half troops
            if (maxSky >= 3) {
              const balSky = 3;
              const balCap = balSky;
              const balRegs = Math.min(res.regiments, Math.ceil(balCap / 2));
              const balLevs = Math.min(res.levies, balCap - balRegs);
              for (const dest of ladenDests.slice(0, 5)) {
                moves.push({ move: "deployFleet", args: [fi, dest, balSky, balRegs, balLevs, 0] });
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
      } else if (G.stage === "conquest draw or pick card") {
        const cards = G.playerInfo[playerID].resources.fortuneCards;
        for (let i = 0; i < cards.length; i++) {
          moves.push({ move: "pickCard", args: [i] });
        }
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
      } else if (G.stage === "rebellion" || G.stage.includes("rebellion")) {
        moves.push({ move: "commitRebellionTroops", args: [0] });
        moves.push({
          move: "commitRebellionTroops",
          args: [G.playerInfo[playerID].resources.regiments],
        });
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
