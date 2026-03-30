import { ReactNode } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { SxProps } from "@mui/material/styles";
import { tokens } from "@/theme";
import type { GameMood } from "@/theme";
import { GameButton } from "./GameButton";

export interface DialogShellProps {
  open: boolean;
  title: string;
  subtitle?: string;
  mood?: GameMood;
  size?: "xs" | "sm" | "md" | "lg";

  children: ReactNode;

  // Action buttons
  confirmLabel?: string;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
  confirmColor?: "primary" | "error" | "success";

  cancelLabel?: string;
  onCancel?: () => void;
  cancelColor?: "primary" | "error";

  // Extra actions rendered before confirm/cancel
  extraActions?: ReactNode;

  hideActions?: boolean;

  sx?: SxProps;
}

// Map DialogShell size → MUI maxWidth
const sizeMap = {
  xs: "xs",
  sm: "sm",
  md: "md",
  lg: "lg",
} as const;

// Map confirmColor → GameButton variant
const confirmVariantMap: Record<
  NonNullable<DialogShellProps["confirmColor"]>,
  "primary" | "danger"
> = {
  primary: "primary",
  error: "danger",
  success: "primary", // no dedicated success variant in GameButton — use primary
};

// Map cancelColor → GameButton variant
const cancelVariantMap: Record<
  NonNullable<DialogShellProps["cancelColor"]>,
  "ghost" | "danger"
> = {
  primary: "ghost",
  error: "danger",
};

export const DialogShell = ({
  open,
  title,
  subtitle,
  mood,
  size = "sm",
  children,
  confirmLabel,
  onConfirm,
  confirmDisabled,
  confirmColor = "primary",
  cancelLabel,
  onCancel,
  cancelColor = "primary",
  extraActions,
  hideActions = false,
  sx,
}: DialogShellProps) => {
  const moodAccent = mood ? tokens.mood[mood].accent : undefined;

  return (
    <Dialog
      open={open}
      maxWidth={sizeMap[size]}
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: tokens.ui.surfaceRaised,
          border: `1px solid ${tokens.ui.borderMedium}`,
          borderRadius: `${tokens.radius.lg}px`,
          // Mood accent: 3px solid top border
          ...(moodAccent && { borderTop: `3px solid ${moodAccent}` }),
          boxShadow: tokens.shadow.lg,
          ...sx,
        },
      }}
    >
      <DialogTitle
        sx={{
          fontFamily: tokens.font.display,
          fontSize: tokens.fontSize.lg,
          // Tint title color to mood accent when set, otherwise plain text
          color: moodAccent ?? tokens.ui.text,
          pb: subtitle ? `${tokens.spacing.xs}px` : `${tokens.spacing.md}px`,
        }}
      >
        {title}
        {subtitle && (
          <Typography
            component="div"
            sx={{
              fontFamily: tokens.font.body,
              fontSize: tokens.fontSize.sm,
              color: tokens.ui.textMuted,
              lineHeight: 1.4,
              mt: 0.5,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent
        sx={{
          px: `${tokens.spacing.lg}px`,
          pb: `${tokens.spacing.lg}px`,
          color: tokens.ui.text,
        }}
      >
        {children}
      </DialogContent>

      {!hideActions && (confirmLabel || cancelLabel || extraActions) && (
        <DialogActions
          sx={{
            px: `${tokens.spacing.lg}px`,
            pb: `${tokens.spacing.lg}px`,
            gap: `${tokens.spacing.sm}px`,
          }}
        >
          {extraActions}
          {cancelLabel && (
            <GameButton
              variant={cancelVariantMap[cancelColor]}
              onClick={onCancel}
            >
              {cancelLabel}
            </GameButton>
          )}
          {confirmLabel && (
            <GameButton
              variant={confirmVariantMap[confirmColor]}
              onClick={onConfirm}
              disabled={confirmDisabled}
            >
              {confirmLabel}
            </GameButton>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
};
