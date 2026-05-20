import type { Ctx } from "boardgame.io";
import type { MyGameState } from "./types";

export interface MoveObserver {
  recordMove(
    name: string,
    playerID: string,
    args: unknown[],
    G: MyGameState,
    ctx: Ctx
  ): void;
}

let observer: MoveObserver | null = null;

export function setMoveObserver(o: MoveObserver | null): void {
  observer = o;
}

export function getMoveObserver(): MoveObserver | null {
  return observer;
}
