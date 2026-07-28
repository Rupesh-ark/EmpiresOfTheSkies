import { describe, expect, it, vi } from "vitest";
import type { EventsAPI } from "../../types.js";
import { MOVE_DEFINITIONS } from "../../moveDefinitions.js";
import { enumerateLegalMoves } from "../../ai/enumerate.js";
import { scoringPhaseEffects } from "../../helpers/resolveRound.js";
import {
  buildCtx,
  buildEvents,
  buildInitialG,
  buildPlayer,
  buildResources,
  callMoveDef,
} from "../testHelpers.js";

describe("Issue Holy Decree rulebook conformance", () => {
  it("uses the standard one-Counsellor action pipeline", () => {
    const G = buildInitialG([
      buildPlayer("0", { isArchprelate: true }),
      buildPlayer("1"),
    ]);

    const { result } = callMoveDef(
      MOVE_DEFINITIONS.issueHolyDecree,
      G,
      "0",
      "reform dogma"
    );

    // eots42:161,203,227 — Issue Holy Decree is an Action Board action.
    expect(result).not.toBe("INVALID_MOVE");
    expect(G.playerInfo["0"].actionsTakenThisRound).toBe(1);
    expect(G.playerInfo["0"].turnComplete).toBe(true);
    expect(
      MOVE_DEFINITIONS.issueHolyDecree.validate?.(
        G,
        "0",
        "confirm dogma"
      )
    ).toMatchObject({ code: "TURN_COMPLETE" });
  });

  it("charges two available Gold for an Inquisition and permits no debt", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        isArchprelate: true,
        resources: buildResources({ gold: 2 }),
      }),
      buildPlayer("1", { prisoners: 2 }),
    ]);

    callMoveDef(
      MOVE_DEFINITIONS.issueHolyDecree,
      G,
      "0",
      "inquisition",
      "1"
    );

    // eots42_amendments:209 — pay 2 Gold to the bank.
    expect(G.playerInfo["0"].resources.gold).toBe(0);
    expect(G.playerInfo["1"].prisoners).toBe(0);

    // eots42:183 — action costs may run into debt: 1 gold minus 2 = -1.
    const poorG = buildInitialG([
      buildPlayer("0", {
        isArchprelate: true,
        resources: buildResources({ gold: 1, counsellors: 2 }),
      }),
      buildPlayer("1", { prisoners: 1 }),
    ]);
    callMoveDef(
      MOVE_DEFINITIONS.issueHolyDecree,
      poorG,
      "0",
      "inquisition",
      "1"
    );
    expect(poorG.playerInfo["0"].resources.gold).toBe(-1);
    expect(poorG.playerInfo["1"].prisoners).toBe(0);
  });

  it("rejects targeting the Archprelate's own Kingdom", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        isArchprelate: true,
        prisoners: 1,
        resources: buildResources({ gold: 2 }),
      }),
      buildPlayer("1"),
    ]);

    // eots42_amendments:209 — a player may not Inquisition their own Kingdom.
    expect(
      MOVE_DEFINITIONS.issueHolyDecree.validate?.(
        G,
        "0",
        "inquisition",
        "0"
      )
    ).toMatchObject({ code: "SELF_TARGET" });
  });
});

describe("paid counsellor actions", () => {
  it("charges a second Counsellor when execution is the chosen outcome", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        prisoners: 2,
        resources: buildResources({
          counsellors: 3,
          victoryPoints: 2,
        }),
      }),
      buildPlayer("1"),
    ]);

    const { result } = callMoveDef(
      MOVE_DEFINITIONS.punishDissenters,
      G,
      "0",
      0,
      "execute",
      1
    );

    // eots42:254,260 — execution still performs the paid Punish action.
    expect(result).not.toBe("INVALID_MOVE");
    expect(G.playerInfo["0"].resources.counsellors).toBe(2);
    expect(G.playerInfo["0"].actionsTakenThisRound).toBe(1);
    expect(G.playerInfo["0"].prisoners).toBe(1);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(1);
  });

  it("requires two available Counsellors for placement plus payment", () => {
    const buildOneCounsellorG = (prisoners = 0) =>
      buildInitialG([
        buildPlayer("0", {
          prisoners,
          resources: buildResources({ counsellors: 1 }),
        }),
        buildPlayer("1"),
      ]);

    // eots42:254,286 — one Counsellor is placed and a second is returned.
    expect(
      MOVE_DEFINITIONS.convertMonarch.validate?.(
        buildOneCounsellorG(),
        "0"
      )
    ).toMatchObject({ code: "NO_EXTRA_COUNSELLOR" });
    expect(
      MOVE_DEFINITIONS.punishDissenters.validate?.(
        buildOneCounsellorG(),
        "0",
        0,
        "counsellor",
        1
      )
    ).toMatchObject({ code: "NO_EXTRA_COUNSELLOR" });
    expect(
      MOVE_DEFINITIONS.punishDissenters.validate?.(
        buildOneCounsellorG(1),
        "0",
        0,
        "execute",
        1
      )
    ).toMatchObject({ code: "NO_EXTRA_COUNSELLOR" });
  });
});

describe("discovery chain pass", () => {
  it("allows and enumerates pass during a chain flip, then clears the cascade", () => {
    const G = buildInitialG();
    G.mustContinueDiscovery = true;
    const ctx = {
      ...buildCtx("0"),
      phase: "discovery",
      numMoves: 1,
    };
    const events = {
      endTurn: vi.fn(),
      endPhase: vi.fn(),
    } as unknown as EventsAPI;

    // eots42:124 — the player may choose not to flip another tile.
    expect(MOVE_DEFINITIONS.pass.validate?.(G, "0")).toBeNull();
    expect(enumerateLegalMoves(G, ctx, "0")).toContainEqual({
      move: "pass",
      args: [],
    });

    MOVE_DEFINITIONS.pass.fn({ G, ctx, playerID: "0", events });
    expect(G.mustContinueDiscovery).toBe(false);
    expect(G.playerInfo["0"].passed).toBe(true);
  });
});

describe("Trade Gains from Legends", () => {
  it("adds plundered Legend Gold to the round's Trade Gains", () => {
    const G = buildInitialG();
    G.mapState.currentBattle = [1, 0];
    G.mapState.currentTileArray[0][1] = {
      name: "Golden Legend",
      type: "legend",
      blocked: [],
      sword: 0,
      shield: 0,
      loot: {
        outpost: {
          gold: 0,
          mithril: 0,
          dragonScales: 0,
          krakenSkin: 0,
          magicDust: 0,
          stickyIchor: 0,
          pipeweed: 0,
          victoryPoints: 0,
        },
        colony: {
          gold: 3,
          mithril: 0,
          dragonScales: 0,
          krakenSkin: 0,
          magicDust: 0,
          stickyIchor: 0,
          pipeweed: 0,
          victoryPoints: 0,
        },
      },
    };

    MOVE_DEFINITIONS.plunder.fn({
      G,
      playerID: "0",
      events: buildEvents(),
    });

    // eots42:474,1268 — Legend Gold is explicitly part of Trade Gains.
    expect(G.tradeGainsThisRound).toEqual({ "0": 3 });
  });
});

describe("VP floor", () => {
  it("clamps a negative Heresy score at zero VP", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        heresyTracker: 5,
        resources: buildResources({ victoryPoints: 2 }),
      }),
      buildPlayer("1", { heresyTracker: 0 }),
    ]);

    scoringPhaseEffects(
      G,
      { endGame: vi.fn() } as unknown as EventsAPI
    );

    // eots42:614 — scoring can never reduce total VP below zero.
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(0);
  });

  it("does not turn final-round debt into a negative Gold bonus", () => {
    const G = buildInitialG(
      [
        buildPlayer("0", {
          heresyTracker: 0,
          resources: buildResources({ victoryPoints: 4, gold: -1 }),
        }),
        buildPlayer("1", { heresyTracker: 0 }),
      ],
      { round: 6, finalRound: 6 }
    );

    scoringPhaseEffects(
      G,
      { endGame: vi.fn() } as unknown as EventsAPI
    );

    // eots42:620 — only remaining (non-debt) Gold earns the final bonus.
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(4);
  });
});
