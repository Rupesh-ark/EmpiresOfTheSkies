import { describe, expect, it } from "vitest";
import { MyGame } from "../../Game.js";
import { RESOLUTION_SEQUENCE } from "../../data/resolutionSequence.js";

describe("rulebook phase order", () => {
  // North-star conformance test; flip to it() when the resolution carve-out is complete.
  it.fails("matches the Resolution Sequence between actions and reset", () => {
    const phases = MyGame.phases!;
    const chain: string[] = [];
    const visited = new Set<string>();
    let phase = "events";

    while (!visited.has(phase)) {
      visited.add(phase);
      chain.push(phase);
      if (phase === "reset") break;

      const next = phases[phase]?.next;
      if (typeof next !== "string") {
        throw new Error(`Expected ${phase}.next to be a phase name`);
      }
      phase = next;
    }

    const segment = chain.slice(chain.indexOf("actions") + 1, chain.indexOf("reset"));
    expect(segment).toEqual([...RESOLUTION_SEQUENCE]);
  });
});
