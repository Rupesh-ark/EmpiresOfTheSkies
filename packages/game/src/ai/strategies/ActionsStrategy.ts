import type { PhaseStrategy, AIPersonality, AIMove, AIWeights, ScoredAIMove } from "../types";
import type { MyGameState } from "../../types";
import type { Ctx } from "boardgame.io";
import { estimateMoveValue } from "../evaluate";
import { countActiveTradeRoutes } from "../../helpers/mapUtils";
import { getRepublicInfluence } from "../../helpers/republicUtils";

/**
 * Actions phase strategy: score each legal move using personality weights
 * plus strategic context (gold pressure, VP urgency, Republic access).
 *
 * Handles sub-stages: confirm_fow_draw, discard_fow, attack_or_pass.
 */
const FREE_ACTIONS = new Set(["garrisonTransfer", "transferBetweenFleets", "transferOutpost"]);

export class ActionsStrategy implements PhaseStrategy {
  // Track repeated free actions per round to apply decay penalty
  private freeActionCounts: Record<string, number> = {};
  private lastRound = -1;

  selectMove(
    G: MyGameState,
    ctx: Ctx,
    playerID: string,
    personality: AIPersonality,
    availableMoves?: AIMove[]
  ): ScoredAIMove {
    // ── Sub-stage handling ─────────────────────────────────────────────
    if (G.stage.sub === "confirm_fow_draw") {
      return { move: { move: "drawFoWCards", args: [] }, score: 0 };
    }

    if (G.stage.sub === "discard_fow") {
      return { move: this.discardWorstCard(G, playerID), score: 0 };
    }

    // ── Counsellor action already done this turn → end turn immediately ──
    // confirmAction calls endTurn() so we come back for another action next cycle.
    // Free actions (sendAgitators, convertMonarch) happen BEFORE the counsellor action.
    if (G.playerInfo[playerID].turnComplete) {
      return { move: { move: "confirmAction", args: [] }, score: 0 };
    }

    // ── Normal actions (G.stage === "actions") ────────────────────────
    const moves = availableMoves ?? [];
    if (moves.length === 0) return { move: { move: "pass", args: [] }, score: 0 };
    if (moves.length === 1) return { move: moves[0], score: 0 };

    const player = G.playerInfo[playerID];
    const w = personality.weights;

    // Should pass? (only pass/confirmAction available)
    const actionMoves = moves.filter(
      (m) => m.move !== "pass" && m.move !== "confirmAction"
    );
    if (actionMoves.length === 0) {
      return { move: { move: "pass", args: [] }, score: 0 };
    }

    // Score each move: base value + strategic context bonuses
    const allPlayers = Object.values(G.playerInfo);
    const leaderVP = Math.max(...allPlayers.map((p) => p.resources.victoryPoints ?? 0)) || 0;
    const myVP = player.resources.victoryPoints ?? 0;
    const vpGap = leaderVP - myVP;
    const amLeading = myVP >= leaderVP;
    const activeRoutes = countActiveTradeRoutes(G, playerID);
    const isFinalRound = G.round >= G.finalRound;

    // Reset free action counters each round
    if (G.round !== this.lastRound) {
      this.freeActionCounts = {};
      this.lastRound = G.round;
    }

    const scored = moves.map((m) => {
      let score = estimateMoveValue(G, playerID, m, w);
      score += this.contextBonus(m, G, playerID, w, vpGap, amLeading, activeRoutes, isFinalRound);
      // Decay penalty for repeated free actions (prevents oscillation loops)
      if (FREE_ACTIONS.has(m.move)) {
        const count = this.freeActionCounts[m.move] ?? 0;
        score -= count * 0.1; // each repeat lowers score by 0.1
      }
      return { move: m, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // Track chosen free action
    if (FREE_ACTIONS.has(scored[0]?.move.move)) {
      this.freeActionCounts[scored[0].move.move] = (this.freeActionCounts[scored[0].move.move] ?? 0) + 1;
    }

    // Diagnostic: disabled for performance — re-enable for debugging
    // console.log(`[ACT] P${playerID} R${G.round} | ${personality.name} | gold=${player.resources.gold} couns=${player.resources.counsellors} sky=${player.resources.skyships} regs=${player.resources.regiments}`);
    // for (const s of scored) {
    //   const argsStr = s.move.args.length > 0 ? ` ${JSON.stringify(s.move.args)}` : "";
    //   console.log(`  ${s.score.toFixed(3)} ${s.move.move}${argsStr}`);
    // }

    const topMoves = scored.slice(0, 5).map((s) => ({
      move: s.move.move,
      args: s.move.args,
      score: s.score,
    }));
    return { move: scored[0].move, score: scored[0].score, topMoves };
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
    const midGame = G.round >= 3 && G.round <= 4;
    const lateGame = gameProgress > 0.6;
    const allVPs = Object.values(G.playerInfo).map((p) => p.resources.victoryPoints ?? 0);
    const leaderVP = Math.max(...allVPs) || 0;

    // Weight-scaled archetype strength (0-1 range, how much this bot leans into each engine)
    // These replace the old boolean flags (isReligious, isMilitary, isEconomy)
    const relStr = Math.min(1, w.religion * 5);   // 0.20 → 1.0, 0.10 → 0.5
    const milStr = Math.min(1, w.military * 5);
    const ecoStr = Math.min(1, w.economy * 5);
    const terStr = Math.min(1, w.territory * 5);

    // ══════════════════════════════════════════════════════════════════════
    // R1: Foundation — everyone needs skyships and a first deploy.
    //   Military bots also recruit regiments. Religious bots can influence.
    //   Nobody should build buildings or factories yet.
    // ══════════════════════════════════════════════════════════════════════
    if (G.round === 1) {
      if (m.move === "purchaseSkyships" && player.resources.skyships < 4) bonus += 0.2;
      if (m.move === "recruitCounsellors" && player.resources.counsellors <= 5) bonus += 0.15;
      if (m.move === "deployFleet") bonus += 0.2;
      if (m.move === "recruitRegiments") bonus += 0.1 * milStr;
      if (m.move === "trainTroops") bonus += 0.08 * milStr;  // military bots invest in FoW cards early
      if (m.move === "influencePrelates") bonus += 0.05 * relStr - 0.1 * (1 - relStr); // religious yes, others no
      if (m.move === "sendAgitators") bonus -= 0.2;
      if (m.move === "foundBuildings") bonus -= 0.15;
      if (m.move === "foundFactory") bonus -= 0.15;
    }

    // ══════════════════════════════════════════════════════════════════════
    // R2: First engine online — divergence begins.
    //   Trade bots: 2nd deploy, factory if route exists
    //   Military bots: regiments, train troops, 2nd deploy
    //   Religious bots: first building, influence prelates
    //   Everyone: skyships if < 4
    // ══════════════════════════════════════════════════════════════════════
    if (G.round === 2) {
      if (m.move === "purchaseSkyships" && player.resources.skyships < 4) bonus += 0.15;
      if (m.move === "deployFleet") bonus += 0.15 + 0.05 * terStr;
      if (m.move === "recruitCounsellors" && player.resources.counsellors <= 5) bonus += 0.12;
      // Economy: factory is priority if routes support it
      if (m.move === "foundFactory" && player.factories < activeRoutes) bonus += 0.1 + 0.15 * ecoStr;
      // Military: troops and FoW cards
      if (m.move === "recruitRegiments") bonus += 0.12 * milStr;
      if (m.move === "trainTroops") bonus += 0.1 * milStr;
      // Religious: first building
      if (m.move === "foundBuildings") bonus += 0.15 * relStr - 0.1 * (1 - relStr);
      if (m.move === "influencePrelates") bonus += 0.05 * relStr - 0.05 * (1 - relStr);
      if (m.move === "sendAgitators") bonus -= 0.15;
    }

    // ══════════════════════════════════════════════════════════════════════
    // R3-4: Engine running — each archetype invests in their strength.
    //   Trade: more factories, more routes, sell goods
    //   Military: conquer, garrison, recruit
    //   Religious: buildings, prelate influence, election prep
    //   Territory: deploy, outposts, garrison
    // ══════════════════════════════════════════════════════════════════════
    if (midGame) {
      // Factory: economy bots prioritise, others only if clearly behind
      if (m.move === "foundFactory" && player.factories < activeRoutes) {
        bonus += 0.1 + 0.2 * ecoStr;
      }
      if (m.move === "deployFleet") bonus += 0.05 + 0.1 * terStr;
      if (m.move === "coloniseLand" || m.move === "constructOutpost") bonus += 0.1 + 0.1 * terStr;
      // Buildings scale with religion weight — religious bots build, others don't
      if (m.move === "foundBuildings") bonus += 0.2 * relStr - 0.05 * (1 - relStr);
      // Military: troops, FoW, garrison
      if (m.move === "recruitRegiments") bonus += 0.1 * milStr;
      if (m.move === "trainTroops") bonus += 0.08 * milStr;
      if (m.move === "garrisonTransfer") bonus += 0.1 * (w.threats + w.territory);
    }

    // ══════════════════════════════════════════════════════════════════════
    // R5+: VP acceleration — everyone scores, but through their engine.
    //   Religious: buildings for VP
    //   Military: conquests for VP
    //   Trade: protect routes, sell high
    //   Territory: garrison to hold
    // ══════════════════════════════════════════════════════════════════════
    if (lateGame) {
      if (m.move === "foundBuildings") bonus += 0.2 * relStr + 0.05; // small base for everyone late
      if (m.move === "coloniseLand") bonus += 0.1 + 0.1 * terStr;
      if (m.move === "constructOutpost") bonus += 0.08 + 0.07 * terStr;
      if (m.move === "garrisonTransfer") bonus += 0.1 * (w.threats + w.territory);
      if (m.move === "foundFactory" && player.factories < activeRoutes) bonus += 0.1 * ecoStr;
    }

    if (isFinalRound) {
      // Last chance to score VP — buildings and territory, not infrastructure
      if (m.move === "foundBuildings") bonus += 0.1 * relStr;
      if (m.move === "coloniseLand" || m.move === "constructOutpost") bonus += 0.1;
      if (m.move === "deployFleet") bonus -= 0.1;
      if (m.move === "purchaseSkyships") bonus -= 0.1;
    }

    // ══════════════════════════════════════════════════════════════════════
    // Personality-scaled move bonuses (apply every round)
    // ══════════════════════════════════════════════════════════════════════

    // Influence prelates: scales with religion, penalised for non-religious
    if (m.move === "influencePrelates") {
      const slot = m.args[0] as number;
      const isRepublicSlot = slot === 4 || slot === 5;
      if (isRepublicSlot) {
        bonus += 0.05 * w.republicAccess;
      } else {
        bonus += 0.1 * relStr - 0.1 * (1 - relStr);
      }
    }

    // Train troops: military bots invest in FoW hand for better combat
    if (m.move === "trainTroops") {
      bonus += 0.05 * milStr;
    }

    // ── Skyship saturation: don't overbuy ──
    if (m.move === "purchaseSkyships" && player.resources.skyships >= 6) {
      bonus -= 0.15 - 0.05 * w.positioning; // positioning bots tolerate more skyships
    }

    // ── Gold pressure: scale penalty with how broke you are ──
    const gold = player.resources.gold ?? 0;
    if (gold < 0) {
      const expensive = ["foundBuildings", "foundFactory", "deployFleet", "moveFleet",
        "purchaseSkyships", "convertMonarch", "sendAgitators"];
      if (expensive.includes(m.move)) {
        // Deeper in debt = stronger penalty, but economy bots tolerate debt better (investment)
        const debtPenalty = Math.min(0.3, Math.abs(gold) * 0.01) * (1 - ecoStr * 0.5);
        bonus -= debtPenalty;
      }
    }

    // ── No skyships: need fleet projection ──
    if (player.resources.skyships === 0 && G.round > 1) {
      if (m.move === "purchaseSkyships" || m.move === "buildSkyships") bonus += 0.15;
    }

    // ── Leading: play defensive — protect what you have ──
    if (amLeading) {
      if (m.move === "foundBuildings" && m.args[0] === 3) bonus += 0.1 * w.threats; // forts
      if (m.move === "garrisonTransfer") bonus += 0.05 * w.threats;
      if (m.move === "influencePrelates") {
        const slot = m.args[0] as number;
        if (slot === 4 || slot === 5) bonus += 0.08; // secure mercy
      }
    }

    // ── Trailing: be aggressive — catch up through military or mercy ──
    if (vpGap >= 6) {
      if (m.move === "influencePrelates") {
        const slot = m.args[0] as number;
        if (slot === 4 || slot === 5) {
          const republics = getRepublicInfluence(G, playerID);
          const republic = slot === 4 ? republics.zeeland : republics.venoa;
          const misaligned = republic.alignment !== player.hereticOrOrthodox && !republic.influenced;
          if (misaligned) bonus += 0.2 * Math.min(1, vpGap / 15);
          else bonus += 0.03;
        }
      }
      if (m.move === "deployFleet" || m.move === "moveFleet") bonus += 0.05;
      if (m.move === "attackOtherPlayersFleet" || m.move === "attackPlayersBuilding") {
        bonus += 0.15 * milStr;
      }
    }

    // ── Engaged Factories: never build unengaged ──
    if (m.move === "foundFactory" && player.factories >= activeRoutes) {
      bonus -= 0.3;
    }

    // ── Punish dissenters: scales with religion (heresy management) ──
    if (m.move === "punishDissenters" && player.freeDissenters > 0) {
      bonus += 0.1 * player.freeDissenters * relStr + 0.05 * player.freeDissenters;
    }

    // ── sendAgitators: suppress early, target leader ──
    if (m.move === "sendAgitators") {
      if (G.round <= 2) bonus -= 0.1;
      const targetID = m.args[0] as string;
      const targetVP = G.playerInfo[targetID]?.resources.victoryPoints ?? 0;
      if (targetVP === leaderVP && targetID !== playerID) bonus += 0.05 * milStr;
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
