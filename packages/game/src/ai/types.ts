import type { MyGameState } from "../types";
import type { Ctx } from "boardgame.io";

export type AIWeights = {
  territory: number;
  economy: number;
  military: number;
  religion: number;
  legacy: number;
  positioning: number;
  threats: number;
  republicAccess: number;
};

export type AIPersonality = {
  name: string;
  weights: AIWeights;
  description: string;
  tacticalPreferences: {
    aggressionLevel: number;   // 0-1
    tradePreference: number;   // 0-1
    expansionPreference: number; // 0-1
  };
};

export type AIMove = {
  move: string;
  args: any[];
};

export type ScoredAIMove = {
  move: AIMove;
  score: number;
  topMoves?: { move: string; args: any[]; score: number }[];
};

export interface PhaseStrategy {
  selectMove(
    G: MyGameState,
    ctx: Ctx,
    playerID: string,
    personality: AIPersonality,
    availableMoves?: AIMove[]
  ): ScoredAIMove;
}

export type WeightOverrideMode = "none" | "full_override" | "modifier";

export type BotConfig = {
  playerID: string;
  weightOverride?: AIWeights;
  weightOverrideMode?: WeightOverrideMode;
  tacticalOverride?: Partial<AIPersonality["tacticalPreferences"]>;
  nameOverride?: string;
};
