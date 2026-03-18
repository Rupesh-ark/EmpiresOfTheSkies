import { useMemo, useCallback, useState } from "react";
import {
  MyGameState,
  MoveError,
  validateTrainTroops,
  validateBuildSkyships,
  validateConscriptLevies,
  validateDeployFleet,
  validatePassFleetInfo,
  validatePurchaseSkyships,
  validateRecruitCounsellors,
  validateRecruitRegiments,
  validateFoundBuildings,
  validateFoundFactory,
  validateInfluencePrelates,
  validatePunishDissenters,
  validateAlterPlayerOrder,
  validateConvertMonarch,
  createLogger,
} from "@eots/game";

const log = createLogger("actions");

// ── Validators for moves that have specific preconditions ────────────────────
// Moves not listed here still get the "is it my turn?" guard.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VALIDATORS: Record<string, (G: MyGameState, playerID: string, numPlayers: number, ...args: any[]) => MoveError | null> = {
  trainTroops: (G, pid) => validateTrainTroops(G, pid),
  buildSkyships: (G, pid, _n, perShipyard) => validateBuildSkyships(G, pid, perShipyard),
  conscriptLevies: (G, pid, _n, levyAmount) => validateConscriptLevies(G, pid, levyAmount),
  deployFleet: (G, pid, _n, fleetIndex, dest, sky, reg, lev) =>
    validateDeployFleet(G, pid, fleetIndex, dest, sky, reg, lev),
  passFleetInfoToPlayerInfo: (G, pid, _n, fid, sky, reg, lev, elite) =>
    validatePassFleetInfo(G, pid, fid, sky, reg, lev, elite),
  purchaseSkyships: (G, pid, _n, slotIndex, republic) =>
    validatePurchaseSkyships(G, pid, slotIndex, republic),
  recruitCounsellors: (G, pid, _n, slotIndex) => validateRecruitCounsellors(G, pid, slotIndex),
  recruitRegiments: (G, pid, _n, slotIndex) => validateRecruitRegiments(G, pid, slotIndex),
  foundBuildings: (G, pid, _n, slotIndex, dir) => validateFoundBuildings(G, pid, slotIndex, dir),
  foundFactory: (G, pid, _n, slotIndex) => validateFoundFactory(G, pid, slotIndex),
  influencePrelates: (G, pid, _n, slotIndex) => validateInfluencePrelates(G, pid, slotIndex),
  punishDissenters: (G, pid, n, slotIndex, paymentType) =>
    validatePunishDissenters(G, pid, slotIndex, paymentType, n),
  alterPlayerOrder: (G, pid, n, newPosition) => validateAlterPlayerOrder(G, pid, newPosition, n),
  convertMonarch: (G, pid, n, slotIndex) => validateConvertMonarch(G, pid, slotIndex, n),
};

/**
 * Wraps ALL boardgame.io moves with:
 * 1. "Is it my turn?" guard — blocks moves when it's not this player's turn
 * 2. Client-side validation — for moves with a registered validator
 * 3. Error feedback — stores the last error in `lastError` (drives toast snackbar)
 *
 * Usage:
 *   const { moves, lastError, clearError } = useGameActions(G, playerID, props.moves, ...);
 *   // pass `moves` as props.moves — every move is now guarded
 */
export function useGameActions(
  G: MyGameState,
  playerID: string,
  moves: Record<string, (...args: any[]) => void>,
  numPlayers: number,
  currentPlayer?: string,
  activePlayers?: Record<string, string> | null
) {
  const [lastError, setLastError] = useState<MoveError | null>(null);

  const clearError = useCallback(() => setLastError(null), []);

  const isMyTurn =
    currentPlayer === playerID ||
    (activePlayers != null && playerID in activePlayers);

  const wrappedMoves = useMemo(() => {
    const result: Record<string, (...args: any[]) => void> = {};
    for (const name of Object.keys(moves)) {
      result[name] = (...args: any[]) => {
        if (!isMyTurn) {
          const error: MoveError = { code: "NOT_YOUR_TURN", message: "Wait for your turn" };
          log.warn(`${name} blocked`, { code: error.code });
          setLastError(error);
          return;
        }
        const validator = VALIDATORS[name];
        if (validator) {
          const error = validator(G, playerID, numPlayers, ...args);
          if (error) {
            log.warn(`${name} blocked`, { code: error.code, message: error.message });
            setLastError(error);
            return;
          }
        }
        setLastError(null);
        moves[name](...args);
      };
    }
    return result;
  }, [G, playerID, moves, numPlayers, isMyTurn]);

  return { moves: wrappedMoves, lastError, clearError };
}
