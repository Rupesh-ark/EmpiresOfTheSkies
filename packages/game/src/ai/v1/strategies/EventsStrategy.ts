/** @deprecated v1 scoring system — kept for non-actions phases. See ../../evaluators/ for v2. */
import type { PhaseStrategy, AIPersonality, AIMove, AIWeights, ScoredAIMove } from "../../types";
import type { MyGameState, EventCardName } from "../../../types";
import type { Ctx } from "boardgame.io";

/**
 * Events phase strategy: choose the best event card to submit,
 * and resolve event choices based on personality and game position.
 */
export class EventsStrategy implements PhaseStrategy {
  selectMove(
    G: MyGameState,
    ctx: Ctx,
    playerID: string,
    personality: AIPersonality,
    availableMoves?: AIMove[]
  ): ScoredAIMove {
    const moves = availableMoves ?? [];
    if (moves.length === 0) return { move: { move: "pass", args: [] }, score: 0 };
    if (moves.length === 1) return { move: moves[0], score: 0 };

    // Card submission phase
    const cardMoves = moves.filter((m) => m.move === "chooseEventCard");
    if (cardMoves.length > 0) {
      return this.chooseCard(G, playerID, personality, cardMoves);
    }

    // Immediate election voting
    const voteMoves = moves.filter((m) => m.move === "immediateElectionVote");
    if (voteMoves.length > 0) {
      return { move: this.chooseVote(G, playerID, personality, voteMoves), score: 0 };
    }

    // Event resolution choices (accept/decline, binary options)
    const resolveMoves = moves.filter((m) => m.move === "resolveEventChoice");
    if (resolveMoves.length > 0) {
      return { move: this.chooseResolution(G, playerID, personality, resolveMoves), score: 0 };
    }

    // Fallback
    return { move: moves[0], score: 0 };
  }

  // Card Selection

  private chooseCard(
    G: MyGameState,
    playerID: string,
    personality: AIPersonality,
    cardMoves: AIMove[]
  ): ScoredAIMove {
    const w = personality.weights;
    const player = G.playerInfo[playerID];
    const allPlayers = Object.values(G.playerInfo);
    const leaderVP = Math.max(...allPlayers.map((p) => p.resources.victoryPoints));
    const myVP = player.resources.victoryPoints;
    const amLeading = myVP >= leaderVP;
    const vpGap = leaderVP - myVP;

    const scored = cardMoves.map((m) => {
      const card = m.args[0] as EventCardName;
      const score = this.scoreCard(card, G, playerID, w, amLeading, vpGap);
      return { move: m, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return { move: scored[0].move, score: scored[0].score };
  }

  private scoreCard(
    card: EventCardName,
    G: MyGameState,
    playerID: string,
    w: AIWeights,
    amLeading: boolean,
    vpGap: number,
  ): number {
    const player = G.playerInfo[playerID];
    const allPlayers = Object.values(G.playerInfo);
    const alignment = player.hereticOrOrthodox;

    switch (card) {
      case "zeeland_turns_heretic":
      case "venoa_turns_heretic": {
        const republic = card === "zeeland_turns_heretic" ? "Zeeland" : "Venoa";
        const alreadyHeretic = G.eventState.nprHeretic.includes(republic);
        if (alreadyHeretic) return -0.1;

        if (alignment === "heretic") {
          return amLeading ? 0.2 : 0.5 + Math.min(0.3, vpGap / 15);
        } else {
          return amLeading ? 0.1 : -0.4 - Math.min(0.3, vpGap / 15);
        }
      }

      case "guild_revolt": {
        const maxFactories = Math.max(...allPlayers.map((p) => p.factories));
        const myFactories = player.factories;
        if (myFactories >= maxFactories && maxFactories > 0) return -0.3;
        if (maxFactories > 0) return 0.2 * w.economy;
        return 0;
      }

      case "corruption_scandal": {
        const maxCath = Math.max(...allPlayers.map((p) => p.cathedrals));
        const myCath = player.cathedrals;
        if (myCath >= maxCath && maxCath > 0) return -0.3;
        if (maxCath > 0) return 0.15;
        return 0;
      }

      case "royal_patronage":
        return 0.2 * w.territory + (G.round <= 2 ? 0.15 : 0.05);

      case "race_to_discovery":
        return G.round <= 2 ? 0.3 * w.territory : 0.05;

      case "foreign_agitators":
        return alignment === "heretic" ? 0.15 * w.religion : -0.1 * w.religion;

      case "bumper_crops":
        return 0.3;

      case "crops_fail":
        return -0.2;

      case "peace_accord_reached":
        return w.economy > w.military ? 0.3 : -0.2;

      case "pretender_rebellion":
        return amLeading ? 0.15 : -0.3;

      case "peasant_rebellion":
        return this.hasHighestResource(player, allPlayers, (p) => p.resources.gold) ? -0.3 : 0.15;

      case "orthodox_rebellion":
        return alignment === "orthodox" ? -0.3 : 0.2;

      case "heretic_rebellion":
        return alignment === "heretic" ? -0.3 : 0.2;

      case "colonial_rebellion":
        return this.countBuildings(G, playerID, "colony") > 0 ? -0.2 : 0.1;

      case "faerie_uprising":
        return this.countBuildings(G, playerID, "colony") > 0 ? -0.2 : 0.1;

      case "prelacy_condemned":
        return alignment === "heretic" ? 0.3 * w.religion : -0.2 * w.religion;

      case "defence_of_the_faith":
        return alignment === "orthodox" ? 0.3 * w.religion : -0.2 * w.religion;

      case "schism":
        return alignment === "heretic" ? -0.3 : 0.2;

      case "a_kingdom_turns_heretic":
      case "return_to_orthodoxy":
        return 0.05;

      case "patrons_of_the_arts":
        return (player.cathedrals + player.palaces) * 0.1;

      case "the_great_fire":
        return this.hasHighestResource(player, allPlayers, (p) => p.cathedrals + p.palaces + p.shipyards) ? -0.3 : 0.1;

      case "allies_in_faerie":
        return this.countBuildings(G, playerID, "outpost") * 0.1 * w.military;

      case "colonial_prelates":
        return this.countBuildings(G, playerID, "colony") * 0.15 * w.religion;

      case "lenders_refuse_credit":
        return player.resources.gold < 0 ? -0.2 : 0.05;

      case "infidel_corsairs_raid":
        return this.hasHighestResource(player, allPlayers, (p) => p.resources.gold) ? -0.2 : 0.1;

      case "royal_succession":
        return amLeading ? -0.1 : 0.2;

      case "archprelate_dies":
        return player.isArchprelate ? -0.2 : 0.1;

      case "grand_infidel_dies":
        return 0.1;

      case "dynastic_marriage":
        return 0.05;

      case "treacherous_creatures":
      case "mysterious_disappearances":
      case "monsters_awake":
        return 0;

      case "headstrong_commander":
        return this.countBuildings(G, playerID, "outpost") > 0 ? -0.1 : 0.05;

      case "infidels_invade_faerie":
        return -0.1;

      default:
        return 0;
    }
  }

  // Event Resolution

  private chooseResolution(
    G: MyGameState,
    playerID: string,
    personality: AIPersonality,
    resolveMoves: AIMove[]
  ): AIMove {
    const pending = G.eventState.pendingChoice;
    if (!pending) return resolveMoves[0];

    if (pending.binaryOptions) {
      return this.resolveBinaryChoice(G, playerID, personality, resolveMoves, pending.binaryOptions);
    }

    if (pending.buildingOptions && pending.buildingOptions.length > 0) {
      return this.resolveFireChoice(G, playerID, personality, resolveMoves, pending.buildingOptions);
    }

    if (pending.allyOptions && pending.allyOptions.length > 0) {
      return this.resolveAllyChoice(G, playerID, personality, resolveMoves, pending.allyOptions);
    }

    if (pending.colonyOptions && pending.colonyOptions.length > 0) {
      return resolveMoves[0];
    }

    if (pending.legacyOptions && pending.legacyOptions.length > 0) {
      return resolveMoves[0];
    }

    const acceptMove = resolveMoves.find((m) => m.args[0] === "accept");
    return acceptMove ?? resolveMoves[0];
  }

  private resolveBinaryChoice(
    G: MyGameState,
    playerID: string,
    _personality: AIPersonality,
    resolveMoves: AIMove[],
    options: [string, string]
  ): AIMove {
    const player = G.playerInfo[playerID];

    const payOption = resolveMoves.find((m) =>
      String(m.args[0]).toLowerCase().includes("pay") ||
      String(m.args[0]).toLowerCase().includes("gold") ||
      m.args[0] === options[0]
    );
    const loseOption = resolveMoves.find((m) =>
      String(m.args[0]).toLowerCase().includes("lose") ||
      String(m.args[0]).toLowerCase().includes("building") ||
      m.args[0] === options[1]
    );

    if (payOption && player.resources.gold >= 6) return payOption;
    if (loseOption) return loseOption;
    return resolveMoves[0];
  }

  private resolveFireChoice(
    _G: MyGameState,
    playerID: string,
    personality: AIPersonality,
    resolveMoves: AIMove[],
    buildingOptions: string[]
  ): AIMove {
    const w = personality.weights;
    const buildingValue: Record<string, number> = {
      cathedral: w.religion,
      palace: w.religion,
      shipyard: w.economy + w.positioning,
    };

    let lowestValue = Infinity;
    let lowestMove = resolveMoves[0];
    for (const m of resolveMoves) {
      const type = m.args[0] as string;
      const val = buildingValue[type] ?? 0;
      if (val < lowestValue) {
        lowestValue = val;
        lowestMove = m;
      }
    }
    return lowestMove;
  }

  private resolveAllyChoice(
    G: MyGameState,
    _playerID: string,
    personality: AIPersonality,
    resolveMoves: AIMove[],
    allyOptions: string[]
  ): AIMove {
    const w = personality.weights;
    let bestScore = -Infinity;
    let bestMove = resolveMoves[0];

    for (const m of resolveMoves) {
      const allyID = m.args[0] as string;
      const ally = G.playerInfo[allyID];
      if (!ally) continue;

      let score = 0;
      const allyMil = ally.resources.regiments + ally.resources.skyships;
      const allyEcon = ally.resources.gold;
      score += (1 - w.military) * allyMil * 0.01;
      score += (1 - w.economy) * allyEcon * 0.01;

      if (score > bestScore) {
        bestScore = score;
        bestMove = m;
      }
    }
    return bestMove;
  }

  // Immediate Election Vote

  private chooseVote(
    G: MyGameState,
    playerID: string,
    _personality: AIPersonality,
    voteMoves: AIMove[]
  ): AIMove {
    const selfVote = voteMoves.find((m) => m.args[0] === playerID);
    if (selfVote) return selfVote;

    let minVP = Infinity;
    let bestMove = voteMoves[0];
    for (const m of voteMoves) {
      const targetID = m.args[0] as string;
      const vp = G.playerInfo[targetID]?.resources.victoryPoints ?? 0;
      if (vp < minVP) {
        minVP = vp;
        bestMove = m;
      }
    }
    return bestMove;
  }

  // Helpers

  private hasHighestResource(
    player: MyGameState["playerInfo"][string],
    allPlayers: MyGameState["playerInfo"][string][],
    getter: (p: MyGameState["playerInfo"][string]) => number
  ): boolean {
    const myVal = getter(player);
    return allPlayers.every((p) => getter(p) <= myVal);
  }

  private countBuildings(G: MyGameState, playerID: string, type: "outpost" | "colony"): number {
    let count = 0;
    G.mapState.buildings.forEach((row) =>
      row.forEach((cell) => {
        if (cell.player?.id === playerID && cell.buildings === type) count++;
      })
    );
    return count;
  }
}
