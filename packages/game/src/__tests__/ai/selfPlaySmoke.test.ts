import { describe, it, expect } from "vitest";
import { runSingleGame } from "../../ai/selfPlay";

describe("self-play smoke test", () => {
  it("completes a full game without stalling", () => {
    const record = runSingleGame(1);
    // runSingleGame always returns a GameRecord; result is null if game didn't complete
    expect(record).not.toBeNull();
    expect(record.result).toBeDefined();
    if (record.result) {
      expect(record.result.winner).toBeDefined();
      expect(Object.keys(record.result.scores)).toHaveLength(6);
      console.log(`Winner: P${record.result.winner} (${record.result.winnerPersonality})`);
      console.log(`Scores:`, record.result.scores);
      console.log(`Rounds: ${record.result.rounds}`);
      console.log(`Players:`, Object.fromEntries(
        Object.entries(record.players).map(([pid, p]) => [pid, p.personality])
      ));
    }
  }, 300000);
});
