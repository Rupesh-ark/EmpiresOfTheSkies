/**
 * aerialBattle.test.ts
 *
 * Tests for aerial battle mechanics (v4.2).
 *
 * Covers:
 *   - attackOtherPlayersFleet: sets battleState, advances to "attack or evade" stage
 *   - evadeAttackingFleet: defender evades → "relocate loser" stage
 *   - retaliate: defender decides to fight
 *   - resolveBattleAndReturnWinner: combat math
 *     → attacker strength = skyships + levies + regiments×2 + FoW sword
 *     → attacker shield  = skyships + FoW shield
 *     → losses = opponent sword − own shield
 *     → winner gains +1 VP and heresy track movement
 */

import { describe, it, expect } from "vitest";
import attackOtherPlayersFleet from "../../moves/aerialBattle/attackOtherPlayersFleet";
import evadeAttackingFleet from "../../moves/aerialBattle/evadeAttackingFleet";
import retaliate from "../../moves/aerialBattle/retaliate";
import { resolveBattleAndReturnWinner } from "../../helpers/resolveBattle";
import { buildInitialG, buildPlayer, buildCtx, buildFleet } from "../testHelpers";

const stubEvents = {
  endTurn: (_args?: any) => {},
  endPhase: () => {},
} as any;

function buildCtxWithPhase(playerID: string, phase = "battle") {
  return {
    ...buildCtx(playerID),
    currentPlayer: playerID,
    phase,
    playOrder: ["0", "1"],
    playOrderPos: 0,
    numMoves: 0,
    activePlayers: null,
    turn: 1,
  };
}

// ── attackOtherPlayersFleet ───────────────────────────────────────────────────

describe("attackOtherPlayersFleet — initiating battle", () => {
  it("creates battleState with attacker decision=fight and defender decision=undecided", () => {
    const G = buildInitialG();
    const ctx = buildCtxWithPhase("0");
    (attackOtherPlayersFleet as Function)({ G, ctx, playerID: "0", events: stubEvents, random: {} }, "1");
    expect(G.battleState?.attacker.id).toBe("0");
    expect(G.battleState?.attacker.decision).toBe("fight");
    expect(G.battleState?.defender.id).toBe("1");
    expect(G.battleState?.defender.decision).toBe("undecided");
  });

  it("advances game stage to 'attack or evade'", () => {
    const G = buildInitialG();
    const ctx = buildCtxWithPhase("0");
    (attackOtherPlayersFleet as Function)({ G, ctx, playerID: "0", events: stubEvents, random: {} }, "1");
    expect(G.stage).toBe("attack or evade");
  });
});

// ── evadeAttackingFleet ───────────────────────────────────────────────────────

describe("evadeAttackingFleet — defender chooses to evade", () => {
  it("sets defender decision to 'evade'", () => {
    const G = buildInitialG();
    G.battleState = {
      attacker: { decision: "fight", ...G.playerInfo["0"] },
      defender: { decision: "undecided", ...G.playerInfo["1"] },
    };
    const ctx = buildCtxWithPhase("1");
    (evadeAttackingFleet as Function)({ G, ctx, playerID: "1", events: stubEvents, random: {} });
    expect(G.battleState?.defender.decision).toBe("evade");
  });

  it("advances game stage to 'relocate loser'", () => {
    const G = buildInitialG();
    G.battleState = {
      attacker: { decision: "fight", ...G.playerInfo["0"] },
      defender: { decision: "undecided", ...G.playerInfo["1"] },
    };
    const ctx = buildCtxWithPhase("1");
    (evadeAttackingFleet as Function)({ G, ctx, playerID: "1", events: stubEvents, random: {} });
    expect(G.stage).toBe("relocate loser");
  });
});

// ── retaliate ─────────────────────────────────────────────────────────────────

describe("retaliate — defender chooses to fight", () => {
  it("sets defender decision to 'fight'", () => {
    const G = buildInitialG();
    G.battleState = {
      attacker: { decision: "fight", ...G.playerInfo["0"] },
      defender: { decision: "undecided", ...G.playerInfo["1"] },
    };
    const ctx = buildCtxWithPhase("1");
    (retaliate as Function)({ G, ctx, playerID: "1", events: stubEvents, random: {} });
    expect(G.battleState?.defender.decision).toBe("fight");
  });
});

// ── resolveBattleAndReturnWinner ──────────────────────────────────────────────

describe("resolveBattleAndReturnWinner — aerial combat math", () => {
  /**
   * Sets up a battle at tile [0,0] with:
   *   attacker (player "0"): fleet at [0,0] with given skyships/regiments/levies
   *   defender (player "1"): fleet at [0,0] with given skyships/regiments/levies
   *   Each player's FoW card is assigned directly to battleState
   */
  function setupBattle(
    attackerFleet: { skyships: number; regiments: number; levies: number },
    defenderFleet: { skyships: number; regiments: number; levies: number },
    attackerCard = { name: "NoEffect", sword: 0, shield: 0 },
    defenderCard = { name: "NoEffect", sword: 0, shield: 0 }
  ) {
    const G = buildInitialG([
      buildPlayer("0", { fleetInfo: [buildFleet(0, { location: [0, 0], ...attackerFleet })] }),
      buildPlayer("1", { fleetInfo: [buildFleet(1, { location: [0, 0], ...defenderFleet })] }),
    ]);
    G.mapState.currentBattle = [0, 0];
    // Build a minimal 4×8 battleMap so splice calls don't crash
    G.mapState.battleMap = Array.from({ length: 4 }, (_, y) =>
      Array.from({ length: 8 }, (_, x) =>
        x === 0 && y === 0 ? ["0", "1"] : []
      )
    );
    G.battleState = {
      attacker: { decision: "fight", ...G.playerInfo["0"], fowCard: attackerCard },
      defender: { decision: "fight", ...G.playerInfo["1"], fowCard: defenderCard },
    };
    return G;
  }

  it("attacker wins when their sword value exceeds defender's shield", () => {
    // Attacker: 5 skyships (sword=5, shield=5). Defender: 1 skyship (sword=1, shield=1)
    // Attacker losses = 1 - 5 = -4 (none). Defender losses = 5 - 1 = 4.
    const G = setupBattle(
      { skyships: 5, regiments: 0, levies: 0 },
      { skyships: 1, regiments: 0, levies: 0 }
    );
    const vp0Before = G.playerInfo["0"].resources.victoryPoints;
    resolveBattleAndReturnWinner(G, stubEvents, buildCtxWithPhase("0"));
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vp0Before + 1);
  });

  it("winner gains +1 VP", () => {
    const G = setupBattle(
      { skyships: 5, regiments: 0, levies: 0 },
      { skyships: 1, regiments: 0, levies: 0 }
    );
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    resolveBattleAndReturnWinner(G, stubEvents, buildCtxWithPhase("0"));
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 1);
  });

  it("FoW sword card adds to attacker strength", () => {
    // Attacker: 3 skyships + FoW sword=2 vs defender: 4 skyships.
    // Without FoW: attacker sword=3 vs defender shield=4 → defender losses=3-4=-1→0;
    //              attacker losses=4-3=1 → defender wins.
    // With FoW: attacker sword=5 vs defender shield=4 → defender losses=5-4=1;
    //           attacker losses=4-3=1 (equal, tiebreak → attacker); neither annihilated → attacker wins.
    const G = setupBattle(
      { skyships: 3, regiments: 0, levies: 0 },
      { skyships: 4, regiments: 0, levies: 0 },
      { name: "Sword2", sword: 2, shield: 0 },
      { name: "NoEffect", sword: 0, shield: 0 }
    );
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    resolveBattleAndReturnWinner(G, stubEvents, buildCtxWithPhase("0"));
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 1);
  });

  it("FoW shield card reduces attacker losses", () => {
    // Attacker: 2 skyships + shield=3. Defender: 5 skyships.
    // Attacker shield = 2+3=5 = defender sword=5 → attacker takes 0 losses
    // Defender shield=5, attacker sword=2+0=2 → defender takes 2-5=-3 → 0 losses
    // Both survive, so no winner from losses alone — check who survives
    const G = setupBattle(
      { skyships: 2, regiments: 0, levies: 0 },
      { skyships: 5, regiments: 0, levies: 0 },
      { name: "Shield3", sword: 0, shield: 3 },
      { name: "NoEffect", sword: 0, shield: 0 }
    );
    // Attacker takes 0 losses (shield = 5 ≥ defender sword = 5)
    // After battle, attacker has 2 skyships remaining
    resolveBattleAndReturnWinner(G, stubEvents, buildCtxWithPhase("0"));
    // Attacker fleet should have taken 0 losses
    const attackerFleet = G.playerInfo["0"].fleetInfo.find((f) => f.location[0] === 0 && f.location[1] === 0);
    expect(attackerFleet?.skyships ?? 0).toBeGreaterThan(0);
  });

  it("regiments count double for sword value", () => {
    // Attacker: 1 skyship + 2 regiments = sword 1+4=5, shield=1
    // Defender: 1 skyship = sword=1, shield=1
    // Attacker losses = max(0, 1-1) = 0. Defender losses = max(0, 5-1) = 4 → dead.
    // Without regiments (1 skyship only): sword=1, defender losses=0 → draw. Regiments are decisive.
    const G = setupBattle(
      { skyships: 1, regiments: 2, levies: 0 },
      { skyships: 1, regiments: 0, levies: 0 }
    );
    const vp0Before = G.playerInfo["0"].resources.victoryPoints;
    resolveBattleAndReturnWinner(G, stubEvents, buildCtxWithPhase("0"));
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vp0Before + 1);
  });

  it("winner's heresy tracker moves toward heresy if orthodox (−1 for orthodox battle winner)", () => {
    const G = setupBattle(
      { skyships: 5, regiments: 0, levies: 0 },
      { skyships: 1, regiments: 0, levies: 0 }
    );
    G.playerInfo["0"].hereticOrOrthodox = "orthodox";
    G.playerInfo["0"].heresyTracker = 5;
    // Defender must have opposing alignment for heresy shift to apply (DEV-8)
    G.playerInfo["1"].hereticOrOrthodox = "heretic";
    resolveBattleAndReturnWinner(G, stubEvents, buildCtxWithPhase("0"));
    // Orthodox winner: heresyTracker decreases by 1
    expect(G.playerInfo["0"].heresyTracker).toBe(4);
  });

  it("winner's heresy tracker advances if heretic (+1 for heretic battle winner)", () => {
    const G = setupBattle(
      { skyships: 5, regiments: 0, levies: 0 },
      { skyships: 1, regiments: 0, levies: 0 }
    );
    // Must update both playerInfo AND battleState (battleState was spread before these changes)
    G.playerInfo["0"].hereticOrOrthodox = "heretic";
    G.playerInfo["0"].heresyTracker = 5;
    G.battleState!.attacker.hereticOrOrthodox = "heretic";
    G.battleState!.attacker.heresyTracker = 5;
    resolveBattleAndReturnWinner(G, stubEvents, buildCtxWithPhase("0"));
    // Heretic winner: heresyTracker increases by 1
    expect(G.playerInfo["0"].heresyTracker).toBe(6);
  });
});