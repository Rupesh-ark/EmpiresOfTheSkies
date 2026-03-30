import { useMemo } from "react";
import { useToast } from "./useToast";
import { MOVE_DEFINITIONS, MyGameState } from "@eots/game";

type BoardProps = {
  G: MyGameState;
  ctx: { currentPlayer: string; phase: string | null };
  playerID: string | null;
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

        return (...args: any[]) => {
          if (!playerID) return;

          const isActionMove = moveName in MOVE_DEFINITIONS;

          if (isActionMove) {
            if (ctx.currentPlayer !== playerID) {
              showToast("It's not your turn", "warning");
              return;
            }

            if (ctx.phase !== "actions") {
              showToast("You can't do that in this phase", "warning");
              return;
            }

            const def = MOVE_DEFINITIONS[moveName];
            if (def?.validate) {
              const error = def.validate(G, playerID, ...args);
              if (error) {
                // TURN_COMPLETE is suppressed client-side because every action
                // button calls clearMoves() (undo) before making a new move.
                // The undo resets turnComplete on the server, but the client's
                // G closure still has the old state during the same click event.
                // This causes a false positive — validation rejects the move
                // even though the undo will have cleared turnComplete by the
                // time the move reaches the server.
                //
                // Server-side validation in moveWrapper.ts still blocks actual
                // double actions if someone bypasses the UI.
                //
                // If TURN_COMPLETE toasts start appearing again in a context
                // where clearMoves is NOT called first, this suppression is
                // hiding a real bug — investigate the calling button's onClick.
                if (error.code === "TURN_COMPLETE") {
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
