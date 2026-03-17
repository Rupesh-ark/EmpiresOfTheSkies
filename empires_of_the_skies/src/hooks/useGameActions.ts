import { useCallback, useState } from "react";
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
} from "@eots/game";

type MoveResult = { success: true } | { success: false; error: MoveError };

/**
 * Wraps boardgame.io moves with client-side validation.
 *
 * Each action runs its validator first. If it fails, the move is NOT dispatched
 * and the error is stored in `lastError` (drives the error Snackbar).
 * If validation passes, the move is dispatched to the server.
 *
 * Usage:
 *   const { actions, lastError, clearError } = useGameActions(props);
 *   actions.trainTroops();  // validates, dispatches, or sets lastError
 */
export function useGameActions(
  G: MyGameState,
  playerID: string,
  moves: Record<string, (...args: any[]) => void>,
  numPlayers: number
) {
  const [lastError, setLastError] = useState<MoveError | null>(null);

  const clearError = useCallback(() => setLastError(null), []);

  /**
   * Helper: validate then dispatch. Returns MoveResult so callers can
   * also react inline if they want (e.g., shake a button).
   */
  const attempt = useCallback(
    (
      validator: () => MoveError | null,
      moveFn: () => void
    ): MoveResult => {
      const error = validator();
      if (error) {
        setLastError(error);
        return { success: false, error };
      }
      setLastError(null);
      moveFn();
      return { success: true };
    },
    []
  );

  // ── Action phase moves ──────────────────────────────────────────────────

  const actions = {
    trainTroops: (): MoveResult =>
      attempt(
        () => validateTrainTroops(G, playerID),
        () => moves.trainTroops()
      ),

    buildSkyships: (perShipyard: number): MoveResult =>
      attempt(
        () => validateBuildSkyships(G, playerID, perShipyard),
        () => moves.buildSkyships(perShipyard)
      ),

    conscriptLevies: (levyAmount: number): MoveResult =>
      attempt(
        () => validateConscriptLevies(G, playerID, levyAmount),
        () => moves.conscriptLevies(levyAmount)
      ),

    deployFleet: (
      fleetIndex: number,
      destination: [number, number],
      skyships: number,
      regiments: number,
      levies: number
    ): MoveResult =>
      attempt(
        () => validateDeployFleet(G, playerID, fleetIndex, destination, skyships, regiments, levies),
        () => moves.deployFleet(fleetIndex, destination, skyships, regiments, levies)
      ),

    passFleetInfoToPlayerInfo: (
      fleetId: number,
      skyships: number,
      regiments: number,
      levies: number,
      eliteRegiments: number
    ): MoveResult =>
      attempt(
        () => validatePassFleetInfo(G, playerID, fleetId, skyships, regiments, levies, eliteRegiments),
        () => moves.passFleetInfoToPlayerInfo(fleetId, skyships, regiments, levies, eliteRegiments)
      ),

    purchaseSkyships: (slotIndex: number, republic: "zeeland" | "venoa"): MoveResult =>
      attempt(
        () => validatePurchaseSkyships(G, playerID, slotIndex, republic),
        () => moves.purchaseSkyships(slotIndex, republic)
      ),

    recruitCounsellors: (slotIndex: number): MoveResult =>
      attempt(
        () => validateRecruitCounsellors(G, playerID, slotIndex),
        () => moves.recruitCounsellors(slotIndex)
      ),

    recruitRegiments: (slotIndex: number): MoveResult =>
      attempt(
        () => validateRecruitRegiments(G, playerID, slotIndex),
        () => moves.recruitRegiments(slotIndex)
      ),

    foundBuildings: (slotIndex: number, heresyDirection?: "advance" | "retreat"): MoveResult =>
      attempt(
        () => validateFoundBuildings(G, playerID, slotIndex, heresyDirection),
        () => moves.foundBuildings(slotIndex, heresyDirection)
      ),

    foundFactory: (slotIndex: number): MoveResult =>
      attempt(
        () => validateFoundFactory(G, playerID, slotIndex),
        () => moves.foundFactory(slotIndex)
      ),

    influencePrelates: (slotIndex: number): MoveResult =>
      attempt(
        () => validateInfluencePrelates(G, playerID, slotIndex),
        () => moves.influencePrelates(slotIndex)
      ),

    punishDissenters: (slotIndex: number, paymentType: "gold" | "counsellor" | "execute"): MoveResult =>
      attempt(
        () => validatePunishDissenters(G, playerID, slotIndex, paymentType, numPlayers),
        () => moves.punishDissenters(slotIndex, paymentType)
      ),

    alterPlayerOrder: (newPosition: number): MoveResult =>
      attempt(
        () => validateAlterPlayerOrder(G, playerID, newPosition, numPlayers),
        () => moves.alterPlayerOrder(newPosition)
      ),

    convertMonarch: (slotIndex: number): MoveResult =>
      attempt(
        () => validateConvertMonarch(G, playerID, slotIndex, numPlayers),
        () => moves.convertMonarch(slotIndex)
      ),
  };

  return { actions, lastError, clearError };
}
