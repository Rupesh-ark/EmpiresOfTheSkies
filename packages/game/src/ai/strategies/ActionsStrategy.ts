import type { PhaseStrategy, AIPersonality, AIMove, AIWeights } from "../types";
import type { MyGameState } from "../../types";
import type { Ctx } from "boardgame.io";
import { enumerateLegalMoves } from "../enumerate";
import { estimateMoveValue } from "../evaluate";
import { countActiveTradeRoutes } from "../../helpers/mapUtils";

/**
 * Actions phase strategy: score each legal move using personality weights
 * plus strategic context (gold pressure, VP urgency, Republic access).
 *
 * Handles sub-stages: confirm_fow_draw, discard_fow, attack_or_pass.
 */
export class ActionsStrategy implements PhaseStrategy {
  selectMove(
    G: MyGameState,
    ctx: Ctx,
    playerID: string,
    personality: AIPersonality
  ): AIMove {
    // ── Sub-stage handling ─────────────────────────────────────────────
    if (G.stage.sub === "confirm_fow_draw") {
      return { move: "drawFoWCards", args: [] };
    }

    if (G.stage.sub === "discard_fow") {
      return this.discardWorstCard(G, playerID);
    }

    if (G.stage.sub === "aerial_attack_or_pass") {
      return { move: "pass", args: [] };
    }

    // ── Counsellor action already done this turn → end turn immediately ──
    // confirmAction calls endTurn() so we come back for another action next cycle.
    // Free actions (sendAgitators, convertMonarch) happen BEFORE the counsellor action.
    if (G.playerInfo[playerID].turnComplete) {
      return { move: "confirmAction", args: [] };
    }

    // ── Normal actions (G.stage === "actions") ────────────────────────
    const moves = enumerateLegalMoves(G, ctx, playerID);
    if (moves.length === 0) return { move: "pass", args: [] };
    if (moves.length === 1) return moves[0];

    const player = G.playerInfo[playerID];
    const w = personality.weights;

    // Should pass? (only pass/confirmAction available)
    const actionMoves = moves.filter(
      (m) => m.move !== "pass" && m.move !== "confirmAction"
    );
    if (actionMoves.length === 0) {
      return { move: "pass", args: [] };
    }

    // Score each move: base value + strategic context bonuses
    const allPlayers = Object.values(G.playerInfo);
    const leaderVP = Math.max(...allPlayers.map((p) => p.resources.victoryPoints));
    const myVP = player.resources.victoryPoints;
    const vpGap = leaderVP - myVP;
    const amLeading = myVP >= leaderVP;
    const activeRoutes = countActiveTradeRoutes(G, playerID);
    const isFinalRound = G.round >= G.finalRound;

    const scored = moves.map((m) => {
      let score = estimateMoveValue(G, playerID, m, w);
      score += this.contextBonus(m, G, playerID, w, vpGap, amLeading, activeRoutes, isFinalRound);
      return { move: m, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // Diagnostic: disabled for performance — re-enable for debugging
    // console.log(`[ACT] P${playerID} R${G.round} | ${personality.name} | gold=${player.resources.gold} couns=${player.resources.counsellors} sky=${player.resources.skyships} regs=${player.resources.regiments}`);
    // for (const s of scored) {
    //   const argsStr = s.move.args.length > 0 ? ` ${JSON.stringify(s.move.args)}` : "";
    //   console.log(`  ${s.score.toFixed(3)} ${s.move.move}${argsStr}`);
    // }

    return scored[0].move;
  }

  // ── Strategic context bonuses ───────────────────────────────────────────

  private contextBonus(
    m: AIMove,
    G: MyGameState,
    playerID: string,
    w: AIWeights,
    vpGap: number,
    amLeading: boolean,
    activeRoutes: number,
    isFinalRound: boolean,
  ): number {
    let bonus = 0;
    const player = G.playerInfo[playerID];
    const gameProgress = Math.min(1, (G.round - 1) / Math.max(1, G.finalRound - 1));
    const earlyGame = G.round <= 2;
    const allVPs = Object.values(G.playerInfo).map((p) => p.resources.victoryPoints);
    const leaderVP = Math.max(...allVPs);

    // ═══════════════════════════════════════════════════════════════════
    // ROUND-AWARE INVESTMENT BONUSES
    // Early game: buy skyships, recruit counsellors, deploy fleets
    // Mid game: factories, buildings, regiments
    // Late game: direct VP moves
    // ═══════════════════════════════════════════════════════════════════

    if (earlyGame) {
      // R1-2: skyships + counsellors are critical investments
      if (m.move === "purchaseSkyships") bonus += 0.15;
      if (m.move === "buildSkyships") bonus += 0.12;
      if (m.move === "recruitCounsellors") bonus += 0.1;
      if (m.move === "deployFleet") bonus += 0.1;
      // Avoid wasting gold on agitators early
      if (m.move === "sendAgitators") bonus -= 0.1;
      // Penalise expensive buildings early (cathedrals/palaces cost 5g)
      if (m.move === "foundBuildings" && (m.args[0] === 0 || m.args[0] === 1)) {
        bonus -= 0.1;
      }
    }

    // Mid game: factories become valuable when routes exist
    if (G.round >= 2 && G.round <= 4 && m.move === "foundFactory" && player.factories < activeRoutes) {
      bonus += 0.1;
    }

    // Personality-scaled investment: scales down as game progresses
    const investmentBonus = 0.08 * (1 - gameProgress);
    if (m.move === "recruitRegiments" || m.move === "trainTroops") {
      bonus += investmentBonus * w.military * 2;
    }
    if (m.move === "foundBuildings" && m.args[0] === 2) { // shipyard
      bonus += investmentBonus * w.military * 2;
    }

    // ═══════════════════════════════════════════════════════════════════
    // EXISTING CONTEXT BONUSES (refined)
    // ═══════════════════════════════════════════════════════════════════

    // ── Gold pressure: avoid spending when broke ──
    if (player.resources.gold < 3) {
      const expensiveMoves = [
        "foundBuildings", "foundFactory", "deployFleet", "moveFleet",
        "purchaseSkyships", "convertMonarch", "sendAgitators",
      ];
      if (expensiveMoves.includes(m.move)) {
        bonus -= 0.15;
      }
    }

    // ── No skyships after round 1: need fleet projection ──
    if (player.resources.skyships === 0 && G.round > 1) {
      if (m.move === "purchaseSkyships" || m.move === "buildSkyships") {
        bonus += 0.1;
      }
    }

    // ── Final round: prioritize direct VP ──
    if (isFinalRound) {
      if (m.move === "foundBuildings") {
        bonus += 0.15; // cathedrals/palaces give VP
      }
      if (m.move === "coloniseLand" || m.move === "constructOutpost") {
        bonus += 0.1;
      }
    }

    // ── Late game: direct VP moves ──
    if (gameProgress > 0.6) {
      if (m.move === "foundBuildings") bonus += 0.1;
      if (m.move === "coloniseLand") bonus += 0.1;
    }

    // ── Leading: play defensive ──
    if (amLeading) {
      if (m.move === "foundBuildings" && m.args[0] === 3) {
        bonus += 0.1 * w.threats; // fort
      }
      if (m.move === "garrisonTransfer") {
        bonus += 0.05 * w.threats;
      }
      // Block Republic Influence to deny rivals' Mercy
      if (m.move === "influencePrelates") {
        const slot = m.args[0] as number;
        if (slot === 4 || slot === 5) {
          bonus += 0.1; // blocking value
        }
      }
    }

    // ── Trailing: play aggressive + secure Mercy ──
    if (vpGap >= 6) {
      if (m.move === "influencePrelates") {
        const slot = m.args[0] as number;
        if (slot === 4 || slot === 5) {
          const republic = slot === 4 ? "Zeeland" : "Venoa";
          const repHeretic = G.eventState.nprHeretic.includes(republic);
          const repAlignment = repHeretic ? "heretic" : "orthodox";
          const misaligned = repAlignment !== player.hereticOrOrthodox;
          if (misaligned) {
            bonus += 0.3 * Math.min(1, vpGap / 15);
          } else {
            bonus += 0.05;
          }
        }
      }
      if (m.move === "deployFleet" || m.move === "moveFleet") {
        bonus += 0.05;
      }
      if (m.move === "attackOtherPlayersFleet" || m.move === "attackPlayersBuilding") {
        bonus += 0.1 * w.military;
      }
    }

    // ── Engaged Factories: don't build unengaged factories ──
    if (m.move === "foundFactory") {
      if (player.factories >= activeRoutes) {
        bonus -= 0.3;
      }
    }

    // ── Punish dissenters: handle agitators before round-end ──
    if (m.move === "punishDissenters" && player.freeDissenters > 0) {
      bonus += 0.15 * player.freeDissenters;
    }

    // ── sendAgitators: only target leader, suppress in early game ──
    if (m.move === "sendAgitators") {
      const targetID = m.args[0] as string;
      const targetVP = G.playerInfo[targetID]?.resources.victoryPoints ?? 0;
      if (targetVP === leaderVP && targetID !== playerID) {
        bonus += 0.03;
      }
    }

    return bonus;
  }

  // ── Sub-stage: discard worst FoW card ─────────────────────────────────

  private discardWorstCard(G: MyGameState, playerID: string): AIMove {
    const hand = G.playerInfo[playerID].resources.fortuneCards;
    if (hand.length === 0) return { move: "confirmAction", args: [] };

    // Find the card with lowest combined sword + shield value
    let worstIndex = 0;
    let worstValue = Infinity;

    for (let i = 0; i < hand.length; i++) {
      const card = hand[i];
      const value = card.sword + card.shield;
      if (value < worstValue) {
        worstValue = value;
        worstIndex = i;
      }
    }

    return { move: "discardFoWCard", args: [worstIndex] };
  }
}
