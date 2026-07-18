import { useMemo, useRef } from "react";
import { MyGameState } from "@eots/game";

type BoardProps = {
  G: MyGameState;
  ctx: {
    currentPlayer: string;
    phase: string | null;
    numMoves?: number;
    activePlayers?: Record<string, string> | null;
  };
  playerID: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  moves: Record<string, (...args: any[]) => void>;
};

/**
 * Wraps boardgame.io's `moves` proxy with a spectator guard.
 *
 * Validation is server-authoritative: moves are sent as-is and the move's
 * `validate` function runs once, inside the server-side move handler
 * (see packages/game/src/helpers/moveWrapper.ts). Rejections come back on
 * boardgame.io's action-error channel and are toasted centrally in
 * ActionBoardsAndMap.
 *
 * Usage:
 *   const moves = useValidatedMoves(props);
 *   moves.recruitCounsellors(0); // sent to the server; server decides
 */
export const useValidatedMoves = (props: BoardProps) => {
  const { G, ctx, playerID, moves } = props;

  // The proxy reads game state at CALL time via refs, so its identity does
  // not need to churn when G/ctx change every move. A stable proxy keeps
  // `validatedProps` (and everything it's spread into) memoizable.
  const stateRef = useRef({ G, ctx, playerID, moves });
  stateRef.current = { G, ctx, playerID, moves };

  return useMemo(() => {
    return new Proxy(moves, {
      get(_target, moveName: string) {
        const probe = stateRef.current.moves[moveName];
        if (typeof probe !== "function") return probe;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (...args: any[]) => {
          const { playerID, moves } = stateRef.current;
          const originalMove = moves[moveName];
          if (typeof originalMove !== "function") return;
          if (!playerID) return; // spectators can't move

          originalMove(...args);
        };
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
