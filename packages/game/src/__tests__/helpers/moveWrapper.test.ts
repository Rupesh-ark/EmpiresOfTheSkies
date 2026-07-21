import { describe, expect, it } from "vitest";
import { INVALID_MOVE, isInvalidMoveResult } from "boardgame.io/core";
import { wrapMove } from "../../helpers/moveWrapper.js";
import type { MoveDefinition, MoveError } from "../../types.js";
import { buildCtx, buildInitialG } from "../testHelpers.js";

describe("wrapMove", () => {
  it("attaches the move's fallback message to a bare INVALID_MOVE", () => {
    const definition: MoveDefinition = {
      fn: () => INVALID_MOVE,
      errorMessage: "That move is not available",
    };

    const result = wrapMove("testMove", definition)({
      G: buildInitialG(),
      ctx: buildCtx("0"),
      playerID: "0",
    });

    expect(isInvalidMoveResult(result)).toBe(true);
    expect(result).not.toBe(INVALID_MOVE);
    expect((result as { payload: MoveError }).payload).toEqual({
      code: "INVALID_MOVE",
      message: "That move is not available",
    });
  });
});
