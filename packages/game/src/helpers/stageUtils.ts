import { MyGameState, GameStage, StagePhase } from "../types";

export const setStage = <P extends StagePhase>(
  G: MyGameState,
  phase: P,
  sub: Extract<GameStage, { phase: P }>["sub"]
): void => {
  G.stage = { phase, sub } as GameStage;
};

/** Type-safe stage checker — phase only or phase+sub */
export const isStage = <P extends StagePhase>(
  G: MyGameState,
  phase: P,
  sub?: Extract<GameStage, { phase: P }>["sub"]
): boolean => {
  if (G.stage.phase !== phase) return false;
  if (sub !== undefined) return G.stage.sub === sub;
  return true;
};
