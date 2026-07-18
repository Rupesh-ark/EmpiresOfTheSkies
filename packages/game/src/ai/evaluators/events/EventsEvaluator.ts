/**
 * V2 Events Phase Evaluator
 *
 * Moves: chooseEventCard, immediateElectionVote, resolveEventChoice
 * Event cards are submitted simultaneously — each player picks one from hand.
 */
import type { MyGameState } from "../../../types.js";
import type { AIMove } from "../../types.js";
import type { MoveEval, BotPersonality } from "../types.js";
import { V2_CONFIG } from "../config.js";

function evaluateChooseEventCard(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  _personality: BotPersonality,
): MoveEval {
  // Each event card has different effects. Without deep event analysis,
  // give all cards a viable score and let MCTS explore.
  return {
    move,
    viable: true,
    quality: V2_CONFIG.events.cardBase,
    reason: `event card: ${move.args[0]}`,
  };
}

function evaluateImmediateElectionVote(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  _personality: BotPersonality,
): MoveEval {
  const targetID = move.args[0] as string;
  const player = G.playerInfo[playerID];
  let quality = V2_CONFIG.events.voteBase;
  const reasons: string[] = [];

  // Vote for self if you have cathedrals (vote power = cathedral count)
  if (targetID === playerID) {
    if (player.cathedrals >= 2) {
      quality += V2_CONFIG.events.cathedralVoteBonus;
      reasons.push("vote self (have cathedrals)");
    } else {
      quality += V2_CONFIG.events.selfVoteBonus;
      reasons.push("vote self");
    }
  }

  return {
    move,
    viable: quality >= V2_CONFIG.qualityThreshold,
    quality,
    reason: `vote for P${targetID}. ${reasons.join(", ")}`,
  };
}

function evaluateResolveEventChoice(
  _G: MyGameState,
  _playerID: string,
  move: AIMove,
  _personality: BotPersonality,
): MoveEval {
  // Binary or multi-choice event resolution.
  // Without deep event logic, all choices are viable.
  const choice = move.args[0];
  return {
    move,
    viable: true,
    quality: V2_CONFIG.events.resolutionChoiceBase,
    reason: `event choice: ${choice}`,
  };
}

export function evaluateEvents(
  G: MyGameState,
  playerID: string,
  moves: AIMove[],
  personality: BotPersonality,
): { viable: MoveEval[]; filtered: MoveEval[] } {
  const viable: MoveEval[] = [];
  const filtered: MoveEval[] = [];

  for (const move of moves) {
    let result: MoveEval;
    if (move.move === "chooseEventCard") {
      result = evaluateChooseEventCard(G, playerID, move, personality);
    } else if (move.move === "immediateElectionVote") {
      result = evaluateImmediateElectionVote(G, playerID, move, personality);
    } else if (move.move === "resolveEventChoice") {
      result = evaluateResolveEventChoice(G, playerID, move, personality);
    } else {
      result = { move, viable: true, quality: V2_CONFIG.events.cardBase, reason: `events: ${move.move}` };
    }

    if (result.viable && result.quality >= V2_CONFIG.qualityThreshold) {
      viable.push(result);
    } else {
      filtered.push({ ...result, viable: false });
    }
  }

  return { viable, filtered };
}

export function pickEventsMove(viable: MoveEval[]): MoveEval | null {
  if (viable.length === 0) return null;
  const idx = Math.floor(Math.random() * viable.length);
  return viable[idx];
}
