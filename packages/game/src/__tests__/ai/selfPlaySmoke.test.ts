import { describe, it, expect } from "vitest";
import { runSingleGame } from "../../ai/selfPlay";

describe("self-play smoke test", () => {
  it("completes a full game without stalling", () => {
    const result = runSingleGame(1);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.winner).toBeDefined();
      expect(Object.keys(result.scores)).toHaveLength(6);
      console.log(`Winner: P${result.winner} (${result.winnerPersonality})`);
      console.log(`Scores:`, result.scores);
      console.log(`Rounds: ${result.rounds}`);
      console.log(`Personalities:`, result.personalities);
    }
  }, 300000);
});
