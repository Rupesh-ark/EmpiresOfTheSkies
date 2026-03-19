/**
 * enableDispatchButtons.test.ts
 *
 * Tests for the enableDispatchButtons move.
 *
 * Source logic:
 *   - Returns INVALID_MOVE if dispatchSkyshipFleet is already true
 *     (player has already dispatched a fleet this phase)
 *   - Otherwise no-op (the actual enabling is handled by the UI/frontend)
 */

import { describe, it, expect } from "vitest";
import enableDispatchButtons from "../../moves/actions/enableDispatchButtons";
import { buildInitialG, buildPlayer, buildPlayerBoard, callMoveDef } from "../testHelpers";

describe("enableDispatchButtons — INVALID_MOVE guard", () => {
  it("returns INVALID_MOVE when dispatchSkyshipFleet is already true", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        playerBoardCounsellorLocations: buildPlayerBoard({ dispatchSkyshipFleet: true }),
      }),
    ]);

    const { result } = callMoveDef(enableDispatchButtons, G, "0");

    expect(result).toBe("INVALID_MOVE");
  });

  it("returns undefined (no-op) when dispatchSkyshipFleet is false", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        playerBoardCounsellorLocations: buildPlayerBoard({ dispatchSkyshipFleet: false }),
      }),
    ]);

    const { result } = callMoveDef(enableDispatchButtons, G, "0");

    expect(result).toBeUndefined();
  });
});
