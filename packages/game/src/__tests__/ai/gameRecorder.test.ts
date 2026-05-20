import { describe, it, expect } from "vitest";
import { setMoveObserver } from "../../recorder";
import type { MoveObserver } from "../../recorder";
import { GameRecorder } from "../../ai/GameRecorder";
import { buildInitialG, buildCtx, buildEvents } from "../testHelpers";
import type { Ctx } from "boardgame.io";
import { wrapMove } from "../../helpers/moveWrapper";
import passMove from "../../moves/pass";

describe("_matchID", () => {
  it("is present in game state", () => {
    const G = buildInitialG();
    expect(G._matchID).toBeDefined();
    expect(G._matchID).toMatch(/^game_\d+_/);
  });
});

describe("moveWrapper → MoveObserver pipeline", () => {
  it("observer receives call when wrapped move succeeds", () => {
    const records: { name: string; playerID: string; args: unknown[] }[] = [];
    const observer: MoveObserver = {
      recordMove(name, playerID, args) {
        records.push({ name, playerID, args });
      },
    };
    setMoveObserver(observer);

    const G = buildInitialG();
    const ctx = buildCtx("0") as Ctx;
    const events = buildEvents();
    const wrapped = wrapMove("pass", passMove);

    wrapped({ G, playerID: "0", ctx, events, random: {} });

    expect(records.length).toBe(1);
    expect(records[0].name).toBe("pass");
    expect(records[0].playerID).toBe("0");

    setMoveObserver(null);
  });

  it("does not throw when no observer is set", () => {
    setMoveObserver(null);

    const G = buildInitialG();
    const ctx = buildCtx("0") as Ctx;
    const events = buildEvents();
    const wrapped = wrapMove("pass", passMove);

    expect(() =>
      wrapped({ G, playerID: "0", ctx, events, random: {} })
    ).not.toThrow();
  });
});

describe("GameRecorder.recordMove", () => {
  it("stores moves with round, turn, phase, and timestamp", () => {
    const recorder = new GameRecorder("test-game");
    recorder.recordMove("deployFleet", "3", [0, [2, 1], 2, 2, 0], 2, 107, "actions");
    recorder.recordMove("pass", "3", [], 2, 108, "actions");

    const record = recorder.getRecord();
    expect(record.moves).toHaveLength(2);

    const first = record.moves[0];
    expect(first.moveName).toBe("deployFleet");
    expect(first.playerID).toBe("3");
    expect(first.args).toEqual([0, [2, 1], 2, 2, 0]);
    expect(first.round).toBe(2);
    expect(first.turn).toBe(107);
    expect(first.phase).toBe("actions");
    expect(first.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("toJSON includes moves and result", () => {
    const recorder = new GameRecorder("test-game");
    recorder.recordMove("pass", "0", [], 1, 1, "actions");
    recorder.setResult({
      winner: "0",
      winnerPersonality: "SeaElves",
      scores: { "0": 100, "1": 50 },
      rounds: 5,
      rankings: [
        { playerID: "0", personality: "SeaElves", vp: 100 },
        { playerID: "1", personality: "Orcs", vp: 50 },
      ],
    });

    const parsed = JSON.parse(recorder.toJSON());
    expect(parsed.gameId).toBe("test-game");
    expect(parsed.moves).toHaveLength(1);
    expect(parsed.result.winner).toBe("0");
    expect(parsed.result.winnerPersonality).toBe("SeaElves");
  });
});
