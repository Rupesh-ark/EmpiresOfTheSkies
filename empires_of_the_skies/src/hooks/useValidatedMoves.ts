import { useMemo } from "react";
import { useToast } from "./useToast";
import { MOVE_VALIDATORS, MyGameState } from "@eots/game";

type BoardProps = {
  G: MyGameState;
  playerID: string | null;
  moves: Record<string, (...args: any[]) => void>;
};

/**
 * Wraps boardgame.io's `moves` proxy with client-side validation.
 *
 * For moves that have a validator in MOVE_VALIDATORS, the validator runs
 * first. If it returns an error, a toast is shown and the move is NOT sent.
 * For moves without a validator, the call passes through unchanged.
 *
 * Usage:
 *   const moves = useValidatedMoves(props);
 *   moves.recruitCounsellors(0); // validates, shows toast on error
 */
export const useValidatedMoves = (props: BoardProps) => {
  const { showToast } = useToast();
  const { G, playerID, moves } = props;

  return useMemo(() => {
    return new Proxy(moves, {
      get(target, moveName: string) {
        const originalMove = target[moveName];
        if (typeof originalMove !== "function") return originalMove;

        const validator = MOVE_VALIDATORS[moveName];
        if (!validator) return originalMove;

        return (...args: any[]) => {
          if (!playerID) return;

          const error = validator(G, playerID, ...args);
          if (error) {
            showToast(error.message, "error");
            return;
          }

          originalMove(...args);
        };
      },
    });
  }, [moves, G, playerID, showToast]);
};
