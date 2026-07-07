import { useMemo } from "react";
import { useToast } from "./useToast";
import { MOVE_DEFINITIONS, MyGameState } from "@eots/game";

type BoardProps = {
  G: MyGameState;
  ctx: { currentPlayer: string; phase: string | null; numMoves?: number };
  playerID: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  moves: Record<string, (...args: any[]) => void>;
};

/**
 * Wraps boardgame.io's `moves` proxy with client-side validation.
 *
 * For moves that have a validate function in MOVE_DEFINITIONS, it runs
 * first. If it returns an error, a toast is shown and the move is NOT sent.
 * For moves without a validator, the call passes through unchanged.
 *
 * Usage:
 *   const moves = useValidatedMoves(props);
 *   moves.recruitCounsellors(0); // validates, shows toast on error
 */
export const useValidatedMoves = (props: BoardProps) => {
  const { showToast } = useToast();
  const { G, ctx, playerID, moves } = props;

  return useMemo(() => {
    return new Proxy(moves, {
      get(target, moveName: string) {
        const originalMove = target[moveName];
        if (typeof originalMove !== "function") return originalMove;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (...args: any[]) => {
          if (!playerID) return;

          const isActionMove = moveName in MOVE_DEFINITIONS;

          if (isActionMove) {
            if (ctx.currentPlayer !== playerID) {
              showToast("It's not your turn", "warning");
              return;
            }

            const def = MOVE_DEFINITIONS[moveName];
            if (def?.validate) {
              const error = def.validate(G, playerID, ...args);
              if (error) {
                // TURN_COMPLETE is a false positive when the click just ran
                // clearMoves() (undo) — the stale G closure still says
                // turnComplete until the undo round-trips. That case always
                // has undoable moves this turn, so only suppress then; with
                // no moves to undo the rejection is genuine and must toast.
                if (error.code === "TURN_COMPLETE" && (ctx.numMoves ?? 0) > 0) {
                  originalMove(...args);
                  return;
                }
                showToast(error.message, "error");
                return;
              }
            }
          }

          originalMove(...args);
        };
      },
    });
  }, [moves, G, ctx, playerID, showToast]);
};
