import { useEffect } from "react";
import { Snackbar, Alert } from "@mui/material";
import { MoveError } from "@eots/game";

interface MoveErrorSnackbarProps {
  error: MoveError | null;
  onClose: () => void;
  autoHideDuration?: number;
}

/**
 * Displays a move validation error as a Snackbar toast.
 *
 * Appears at the bottom-center of the screen when `error` is non-null.
 * Auto-dismisses after `autoHideDuration` ms (default 4 seconds).
 * Can also be dismissed manually by clicking the X.
 *
 * Usage:
 *   const { actions, lastError, clearError } = useGameActions(props);
 *   <MoveErrorSnackbar error={lastError} onClose={clearError} />
 */
export default function MoveErrorSnackbar({
  error,
  onClose,
  autoHideDuration = 4000,
}: MoveErrorSnackbarProps) {
  // When a new error arrives, ensure the snackbar is visible.
  // When error becomes null, the snackbar closes.
  useEffect(() => {
    if (!error) return;

    // Auto-clear after the timeout (backup — Snackbar's own onClose handles most cases)
    const timer = setTimeout(onClose, autoHideDuration);
    return () => clearTimeout(timer);
  }, [error, onClose, autoHideDuration]);

  return (
    <Snackbar
      open={error !== null}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        onClose={onClose}
        severity="warning"
        variant="filled"
        sx={{ width: "100%", fontSize: "0.95rem" }}
      >
        {error?.message}
      </Alert>
    </Snackbar>
  );
}
