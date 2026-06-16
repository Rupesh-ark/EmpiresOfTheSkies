import { MOVE_DEFINITIONS } from "../moveDefinitions";
import type { MyGameState } from "../types";
import type { Ctx } from "boardgame.io";
import type { AIMove } from "./types";
import { getNeighbors, isValidRetreatDestination, tileKey, wouldPlacementConnectRoute } from "../helpers/mapUtils";
import { MAP_WIDTH, MAP_HEIGHT, KINGDOM_LOCATION, MAX_SKYSHIPS_PER_FLEET } from "../data/gameData";
import { findPossibleDestinations } from "../helpers/helpers";
import { isStage } from "../helpers/stageUtils";
import log from "../helpers/logger";

const enumLog = log.child({ mod: "enumerate" });

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
    case "setup": {
      if (G.stage.sub === "kingdom_advantage") {
        return G.cardDecks.kingdomAdvantagePool.map((cardName) => ({
          move: "pickKingdomAdvantageCard",
          args: [cardName],
        }));
      }
      if (G.stage.sub === "legacy_card") {
        return G.playerInfo[playerID].legacyCardOptions.map((cardInfo) => ({
          move: "pickLegacyCard",
          args: [cardInfo],
        }));
      }
      return [];
    }

    case "events": {
      const moves: AIMove[] = [];

      if (isStage(G, "events", "default")) {
        // Check if there's a pending event choice for this player
        // (G.stage stays "events/default" but the player needs to resolve a choice)
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
      } else if (G.stage.sub === "immediate_election") {
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

      if (ctx.numMoves && ctx.numMoves > 0) {
        // Cascade: must pick a tile adjacent to the most recently discovered tile
        const [lx, ly] = G.mapState.mostRecentlyDiscoveredTile;
        const cascadeNeighbors = getNeighbors(lx, ly, true);
        for (const [nx, ny] of cascadeNeighbors) {
          if (G.mapState.discoveredTiles[ny]?.[nx] === false) {
            moves.push({ move: "discoverTile", args: [[nx, ny]] });
          }
        }

        // Cascade fallback: if last tile has no hidden neighbors,
        // allow any tile adjacent to any discovered tile (rule)
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

      // Pass is only valid on the first flip, not during cascade
      if (!ctx.numMoves || ctx.numMoves === 0) {
        moves.push({ move: "pass", args: [] });
      }
      return moves;
    }

    case "taxes": {
      return [];
    }

    case "actions": {
      if (isStage(G, "actions", "confirm_fow_draw")) {
        return [{ move: "confirmAction", args: [] }];
      }

      if (isStage(G, "actions", "discard_fow")) {
        const hand = G.playerInfo[playerID].resources.fortuneCards;
        const discardMoves: AIMove[] = [];
        for (let i = 0; i < hand.length; i++) {
          discardMoves.push({ move: "discardFoWCard", args: [i] });
        }
        return discardMoves.length > 0 ? discardMoves : [{ move: "confirmAction", args: [] }];
      }

      const moves: AIMove[] = [];
      const failedValidations: string[] = [];

      // Slot-based moves
      for (const moveName of ["recruitCounsellors", "recruitRegiments"] as const) {
        for (const slotIndex of [0, 1, 2]) {
          if (tryValidate(moveName, G, playerID, slotIndex)) {
            moves.push({ move: moveName, args: [slotIndex] });
          } else {
            failedValidations.push(`${moveName}[${slotIndex}]`);
          }
        }
      }

      // Purchase Skyships from either republic
      for (const republic of ["zeeland", "venoa"] as const) {
        if (tryValidate("purchaseSkyships", G, playerID, republic)) {
          moves.push({ move: "purchaseSkyships", args: [republic] });
        } else {
          failedValidations.push(`purchaseSkyships[${republic}]`);
        }
      }

      // Building moves (try slots 0..3)
      for (const slotIndex of [0, 1, 2, 3]) {
        if (tryValidate("foundBuildings", G, playerID, slotIndex)) {
          moves.push({ move: "foundBuildings", args: [slotIndex] });
        } else {
          failedValidations.push(`foundBuildings[${slotIndex}]`);
        }
      }

      // Factory moves (try slots 0..3)
      for (const slotIndex of [0, 1, 2, 3]) {
        if (tryValidate("foundFactory", G, playerID, slotIndex)) {
          moves.push({ move: "foundFactory", args: [slotIndex] });
        } else {
          failedValidations.push(`foundFactory[${slotIndex}]`);
        }
      }

      // No-arg action moves
      for (const moveName of [
        "trainTroops",
        "drawFoWCards",
        "buildSkyships",
        "conscriptLevies",
        "issueHolyDecree",
      ] as const) {
        if (tryValidate(moveName, G, playerID)) {
          moves.push({ move: moveName, args: [] });
        } else {
          failedValidations.push(moveName);
        }
      }

      // Punish dissenters (slot + payment type + count)
      {
        const pInfo = G.playerInfo[playerID];
        const maxP = pInfo.resources.advantageCard === "more_prisons" ? 4 : 3;
        const capacity = maxP - pInfo.prisoners;
        for (let slotIndex = 0; slotIndex < ctx.numPlayers; slotIndex++) {
          if (capacity > 0) {
            for (const paymentType of ["gold", "counsellor"] as const) {
              for (let c = 1; c <= capacity; c++) {
                if (tryValidate("punishDissenters", G, playerID, slotIndex, paymentType, ctx.numPlayers, c)) {
                  moves.push({ move: "punishDissenters", args: [slotIndex, paymentType, c] });
                }
              }
            }
          }
          for (let c = 1; c <= pInfo.prisoners; c++) {
            if (tryValidate("punishDissenters", G, playerID, slotIndex, "execute", ctx.numPlayers, c)) {
              moves.push({ move: "punishDissenters", args: [slotIndex, "execute", c] });
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

      // sendAgitators — costs 2 gold, no counsellor cost; at most once per rival per round
      {
        const sentThisRound = G.playerInfo[playerID].agitatorsSentThisRound;
        for (const otherID of ctx.playOrder) {
          if (otherID !== playerID && !sentThisRound.includes(otherID)) {
            moves.push({ move: "sendAgitators", args: [otherID] });
          }
        }
      }

      // moveFleet — move deployed fleets to new tiles
      const player = G.playerInfo[playerID];
      if (player.actionsTakenThisRound < player.resources.counsellors) {
        for (let fi = 0; fi < player.fleetInfo.length; fi++) {
          const fleet = player.fleetInfo[fi];
          if (fleet.dispatchedThisRound) continue;
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
        player.actionsTakenThisRound < player.resources.counsellors &&
        player.resources.skyships >= 1
      ) {
        for (let fi = 0; fi < player.fleetInfo.length; fi++) {
          const fleet = player.fleetInfo[fi];
          if (fleet.dispatchedThisRound) continue;
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
          const safeRegs = res.regiments || 0;
          const safeLevies = res.levies || 0;
          const safeElites = res.eliteRegiments || 0;
          const hasTroops = safeRegs > 0 || safeLevies > 0 || safeElites > 0;
          if (hasTroops && maxSky > 0) {
            const [ladenDests] = findPossibleDestinations(G, KINGDOM_LOCATION, false);
            const troopCapacity = maxSky; // 1 troop per skyship
            const elites = Math.min(safeElites, troopCapacity);
            const regs = Math.min(safeRegs, troopCapacity - elites);
            const levs = Math.min(safeLevies, Math.max(0, troopCapacity - elites - regs));

            for (const dest of ladenDests.slice(0, 10)) {
              if (tryValidate("deployFleet", G, playerID, fi, dest, maxSky, regs, levs, elites)) {
                moves.push({ move: "deployFleet", args: [fi, dest, maxSky, regs, levs, elites] });
              }
            }

            // Balanced: 3 skyships, half troops
            if (maxSky >= 3) {
              const balSky = 3;
              const balCap = balSky;
              const balRegs = Math.min(safeRegs, Math.ceil(balCap / 2));
              const balLevs = Math.min(safeLevies, Math.max(0, balCap - balRegs));
              for (const dest of ladenDests.slice(0, 5)) {
                if (tryValidate("deployFleet", G, playerID, fi, dest, balSky, balRegs, balLevs, 0)) {
                  moves.push({ move: "deployFleet", args: [fi, dest, balSky, balRegs, balLevs, 0] });
                }
              }
            }
          }
        }
      }

      // garrisonTransfer — skipped for bots (causes infinite load/unload loops
      // and troops in garrisons don't contribute to bot VP strategy)

      // transferBetweenFleets — transfer troops between co-located fleets
      // Only enumerate si < ti to prevent infinite A→B / B→A loops
      for (let si = 0; si < player.fleetInfo.length; si++) {
        const src = player.fleetInfo[si];
        const srcAtHome =
          src.location[0] === KINGDOM_LOCATION[0] &&
          src.location[1] === KINGDOM_LOCATION[1];
        if (src.skyships === 0 || srcAtHome) continue;
        for (let ti = si + 1; ti < player.fleetInfo.length; ti++) {
          const tgt = player.fleetInfo[ti];
          if (
            src.location[0] !== tgt.location[0] ||
            src.location[1] !== tgt.location[1]
          ) continue;
          // Transfer all troops (no skyships) from src → tgt
          const hasTroops = src.regiments + src.levies + src.eliteRegiments > 0;
          if (hasTroops) {
            if (
              tryValidate(
                "transferBetweenFleets",
                G,
                playerID,
                si, ti, 0, src.regiments, src.levies, src.eliteRegiments
              )
            ) {
              moves.push({
                move: "transferBetweenFleets",
                args: [si, ti, 0, src.regiments, src.levies, src.eliteRegiments],
              });
            }
          }
        }
      }

      // declareSmugglerGood — pick which good to smuggle (licenced_smugglers KA)
      // Only enumerate if not already declared (the move is a one-time choice per round)
      if (
        player.resources.advantageCard === "licenced_smugglers" &&
        !player.resources.smugglerGoodChoice
      ) {
        const GOODS = [
          "mithril", "dragonScales", "krakenSkin", "magicDust", "stickyIchor", "pipeweed",
        ] as const;
        for (const good of GOODS) {
          moves.push({ move: "declareSmugglerGood", args: [good] });
        }
      }

      // checkAndPlaceFort — place fort at a valid location (after foundBuildings slot 3)
      if (G.validFortLocations.length > 0) {
        for (const coords of G.validFortLocations) {
          if (tryValidate("checkAndPlaceFort", G, playerID, coords)) {
            moves.push({ move: "checkAndPlaceFort", args: [coords] });
          }
        }
      }

      // transferOutpost — transfer own outpost/colony to a rival whose fleet is present
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          const cell = G.mapState.buildings[y]?.[x];
          if (!cell || cell.player?.id !== playerID) continue;
          if (cell.buildings !== "outpost" && cell.buildings !== "colony") continue;
          // Find rivals with a fleet at this tile
          for (const otherID of ctx.playOrder) {
            if (otherID === playerID) continue;
            const rivalHasFleet = G.playerInfo[otherID]?.fleetInfo.some(
              (f) => f.location[0] === x && f.location[1] === y && f.skyships > 0
            );
            if (rivalHasFleet) {
              if (tryValidate("transferOutpost", G, playerID, [x, y] as [number, number], otherID)) {
                moves.push({ move: "transferOutpost", args: [[x, y], otherID] });
              }
            }
          }
        }
      }


      moves.push({ move: "pass", args: [] });
      // confirmAction only valid after a counsellor action (turnComplete = true)
      if (G.playerInfo[playerID].turnComplete) {
        moves.push({ move: "confirmAction", args: [] });
      }

      return moves;
    }

    case "resolution": {
      const moves: AIMove[] = [];

      if (isStage(G, "resolution", "aerial_attack_or_pass")) {
        moves.push({ move: "doNotAttack", args: [] });
        // Read battleMap directly — G.possibleDefenders can be stale with Local() multiplayer
        const [bx, by] = G.mapState.currentBattle;
        const playersAtTile = G.mapState.battleMap[by]?.[bx] ?? [];
        for (const defenderID of playersAtTile) {
          if (defenderID !== playerID && tryValidate("attackOtherPlayersFleet", G, playerID, defenderID)) {
            moves.push({ move: "attackOtherPlayersFleet", args: [defenderID] });
          }
        }
        return moves;
      } else if (isStage(G, "resolution", "aerial_attack_or_evade")) {
        // The defender decides to evade or fight
        // Check battleState first; fall back to "if I'm not the attacker, I'm the defender"
        const isDefender = G.battleState?.defender?.id === playerID
          || (G.battleState?.attacker?.id !== playerID);
        if (isDefender) {
          moves.push({ move: "evadeAttackingFleet", args: [] });
          moves.push({ move: "retaliate", args: [] });
        }
        return moves;
      } else if (isStage(G, "resolution", "aerial_resolve")) {
        // Only enumerate for the player who hasn't committed a FoW card yet
        const bs = G.battleState;
        const needsCard =
          (bs?.attacker?.id === playerID && !bs.attacker.fowCard) ||
          (bs?.defender?.id === playerID && !bs.defender.fowCard);
        if (needsCard) {
          const cards = G.playerInfo[playerID].resources.fortuneCards;
          for (let i = 0; i < cards.length; i++) {
            moves.push({ move: "pickCard", args: [i] });
          }
          moves.push({ move: "drawCard", args: [] });
        }
        return moves;
      } else if (isStage(G, "resolution", "plunder_legends")) {
        return [
          { move: "plunder", args: [] },
          { move: "doNotPlunder", args: [] },
        ];
      } else if (isStage(G, "resolution", "ground_attack_or_pass")) {
        moves.push({ move: "doNotGroundAttack", args: [] });
        if (G.battleState) {
          const [gbx, gby] = G.mapState.currentBattle;
          const tileBuilding = G.mapState.buildings[gby]?.[gbx];
          if (tileBuilding?.player && tileBuilding.player.id !== playerID && tileBuilding.buildings) {
            moves.push({ move: "attackPlayersBuilding", args: [tileBuilding.player.id] });
          }
        }
        return moves;
      } else if (isStage(G, "resolution", "ground_defend_or_yield")) {
        // Only the defender decides to defend or yield
        if (G.battleState?.defender?.id === playerID) {
          moves.push({ move: "defendGroundAttack", args: [] });
          moves.push({ move: "yieldToAttacker", args: [] });
        }
        return moves;
      } else if (isStage(G, "resolution", "ground_resolve")) {
        // Only enumerate for the player who hasn't committed a FoW card yet
        const bs = G.battleState;
        const needsCard =
          (bs?.attacker?.id === playerID && !bs.attacker.fowCard) ||
          (bs?.defender?.id === playerID && !bs.defender.fowCard);
        if (needsCard) {
          const cards = G.playerInfo[playerID].resources.fortuneCards;
          for (let i = 0; i < cards.length; i++) {
            moves.push({ move: "pickCard", args: [i] });
          }
          moves.push({ move: "drawCard", args: [] });
        }
        return moves;
      } else if (isStage(G, "resolution", "ground_garrison")) {
        const avail = G.troopsAvailableForGarrison;
        // Defensive: validate avail is defined and has valid numbers
        if (!avail || 
            typeof avail.regiments !== 'number' || isNaN(avail.regiments) ||
            typeof avail.levies !== 'number' || isNaN(avail.levies) ||
            typeof avail.elites !== 'number' || isNaN(avail.elites)) {
          enumLog.warn({ avail }, "Invalid troopsAvailableForGarrison at ground_garrison");
          return moves;
        }
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
        return moves;
      } else if (isStage(G, "resolution", "conquest_draw_or_pick")) {
        const cards = G.playerInfo[playerID].resources.fortuneCards;
        for (let i = 0; i < cards.length; i++) {
          moves.push({ move: "pickCardConquest", args: [i] });
        }
        moves.push({ move: "drawCardConquest", args: [] });
        return moves;
      } else if (isStage(G, "resolution", "conquest_garrison")) {
        const avail = G.troopsAvailableForGarrison;
        // Defensive: validate avail is defined and has valid numbers
        if (!avail || 
            typeof avail.regiments !== 'number' || isNaN(avail.regiments) ||
            typeof avail.levies !== 'number' || isNaN(avail.levies) ||
            typeof avail.elites !== 'number' || isNaN(avail.elites)) {
          enumLog.warn({ avail }, "Invalid troopsAvailableForGarrison at conquest_garrison");
          return moves;
        }
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
      } else if (isStage(G, "resolution", "conquest")) {
        const conquestMoves: AIMove[] = [{ move: "doNothing", args: [] }];
        // Only offer coloniseLand if valid: no rival building, and not already failed here this round
        const [cx, cy] = G.mapState.currentBattle;
        const conquestBuilding = G.mapState.buildings[cy]?.[cx];
        const rivalOwns = conquestBuilding?.player && conquestBuilding.player.id !== playerID;
        const alreadyFailed = G.failedConquests?.some(
          (f) => f.playerId === playerID && f.tile[0] === cx && f.tile[1] === cy
        );
        if (!rivalOwns && !alreadyFailed) {
          conquestMoves.push({ move: "coloniseLand", args: [] });
        }
        const conquestPlayer = G.playerInfo[playerID];
        for (const fleet of conquestPlayer.fleetInfo) {
          const isAtHome =
            fleet.location[0] === KINGDOM_LOCATION[0] &&
            fleet.location[1] === KINGDOM_LOCATION[1];
          if (!isAtHome && fleet.skyships > 0) {
            conquestMoves.push({ move: "constructOutpost", args: [fleet.location] });
          }
        }
        return conquestMoves;
      } else if (isStage(G, "resolution", "election")) {
        return ctx.playOrder.map((targetID) => ({
          move: "vote",
          args: [targetID],
        }));
      } else if (isStage(G, "resolution", "relocate_loser")) {
        const battleState = G.battleState;
        if (battleState) {
          // Only the winner relocates the loser
          const isParticipant =
            battleState.attacker.id === playerID ||
            battleState.defender.id === playerID;
          if (isParticipant) {
            const defeatedPlayerID =
              battleState.attacker.id === playerID
                ? battleState.defender.id
                : battleState.attacker.id;
            const battleLoc = G.mapState.currentBattle as [number, number];
            for (const tile of G.validRelocationTiles) {
              if (isValidRetreatDestination(G, battleLoc, tile as [number, number], defeatedPlayerID)) {
                moves.push({ move: "relocateDefeatedFleet", args: [tile, defeatedPlayerID] });
              }
            }
            // Fallback: if no valid tiles survive validation, retreat home
            if (moves.length === 0) {
              moves.push({ move: "relocateDefeatedFleet", args: [[...KINGDOM_LOCATION], defeatedPlayerID] });
            }
          }
        }
        return moves;
      } else if (isStage(G, "resolution", "retrieve_fleets")) {
        const fleets = G.playerInfo[playerID].fleetInfo;
        const deployedIndices: number[] = [];
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
          // Option: retrieve ALL deployed fleets (plain)
          moves.push({ move: "retrieveFleets", args: [deployedIndices] });
          // Per-fleet options: placeAt vs trailFrom vs plain
          for (const idx of deployedIndices) {
            const fleet = fleets[idx];
            const fleetTile = tileKey(fleet.location[0], fleet.location[1]);
            if (wouldPlacementConnectRoute(G, playerID, fleetTile)) {
              // Place a route skyship here — repairs a broken route
              moves.push({ move: "retrieveFleets", args: [[idx], { placeAt: [idx] }] });
            } else if (fleet.skyships > 1) {
              // Leave a trail back to Faithdom
              moves.push({ move: "retrieveFleets", args: [[idx], { trailFrom: [idx] }] });
            }
            // Plain individual retrieve (always available if >1 fleet deployed)
            if (deployedIndices.length > 1) {
              moves.push({ move: "retrieveFleets", args: [[idx]] });
            }
          }
          // Retrieve all with route options where applicable
          const placeAtIndices = deployedIndices.filter(idx => {
            const f = fleets[idx];
            return wouldPlacementConnectRoute(G, playerID, tileKey(f.location[0], f.location[1]));
          });
          const trailIndices = deployedIndices.filter(idx => {
            const f = fleets[idx];
            return !wouldPlacementConnectRoute(G, playerID, tileKey(f.location[0], f.location[1])) && f.skyships > 1;
          });
          if (placeAtIndices.length > 0 || trailIndices.length > 0) {
            moves.push({ move: "retrieveFleets", args: [deployedIndices, {
              ...(placeAtIndices.length > 0 ? { placeAt: placeAtIndices } : {}),
              ...(trailIndices.length > 0 ? { trailFrom: trailIndices } : {}),
            }] });
          }
        }
        moves.push({ move: "pass", args: [] });
      } else if (isStage(G, "resolution", "infidel_fleet_combat")) {
        moves.push({ move: "respondToInfidelFleet", args: ["fight"] });
        moves.push({ move: "respondToInfidelFleet", args: ["evade"] });
      } else if (isStage(G, "resolution", "deferred_battle")) {
        // Only the target player commits a FoW card for a deferred battle
        const deferredBattle = G.currentDeferredBattle;
        if (deferredBattle && deferredBattle.event.targetPlayerID === playerID) {
          const cards = G.playerInfo[playerID].resources.fortuneCards;
          for (let i = 0; i < cards.length; i++) {
            moves.push({ move: "commitDeferredBattleCard", args: [i] });
          }
          // Draw from deck (no card index = undefined)
          moves.push({ move: "commitDeferredBattleCard", args: [] });
        }
      } else if (isStage(G, "resolution", "rebellion")) {
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
      } else if (isStage(G, "resolution", "rebellion_rival_support")) {
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
      } else if (G.stage.sub === "invasion_nominate") {
        // Only the Archprelate can nominate — others have no move
        if (!G.playerInfo[playerID].isArchprelate) {
          return [];
        }
        const eligible = G.currentInvasion?.eligibleCaptainGenerals ?? ctx.playOrder;
        for (const id of eligible) {
          moves.push({ move: "nominateCaptainGeneral", args: [id] });
        }
      } else if (G.stage.sub === "invasion_contribute") {
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
      } else if (G.stage.sub === "invasion_buyoff") {
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
      }

      // DEBUG: catch empty resolution moves
      if (moves.length === 0) {
        enumLog.info({ playerID, sub: G.stage?.sub, attacker: G.battleState?.attacker?.id, defender: G.battleState?.defender?.id }, "empty resolution moves");
      }
      return moves;
    }

    case "reset": {
      return [];
    }

    default: {
      return [];
    }
  }
}
