import { forwardRef, ReactNode } from "react";
import { Button, Tooltip } from "@mui/material";
import { SxProps } from "@mui/material/styles";
import { tokens } from "@/theme";

export interface GameButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  disabledReason?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  fullWidth?: boolean;
  sx?: SxProps;
}

const sizeMap = {
  sm: { height: 30, fontSize: tokens.fontSize.xs, px: `${tokens.spacing.sm + 2}px`, letterSpacing: "0.03em" },
  md: { height: 38, fontSize: tokens.fontSize.sm, px: `${tokens.spacing.md}px`, letterSpacing: "0.02em" },
  lg: { height: 46, fontSize: tokens.fontSize.base, px: `${tokens.spacing.lg}px`, letterSpacing: "0.01em" },
};

// Embossed brass plate — raised surface with light-catching bevel
const variantStyleMap = {
  primary: {
    background: `linear-gradient(180deg, ${tokens.ui.tealLight} 0%, ${tokens.ui.gold} 40%, #1F4F42 100%)`,
    color: "#EAF5F1",
    border: "none",
    borderTop: "1px solid rgba(180,230,210,0.30)",
    borderBottom: "2px solid #163B31",
    boxShadow: `0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.18)`,
    fontWeight: 700,
    "&:hover": {
      background: `linear-gradient(180deg, #4A8E7A 0%, ${tokens.ui.tealLight} 40%, ${tokens.ui.gold} 100%)`,
      boxShadow: `0 3px 10px rgba(0,0,0,0.4), 0 0 12px ${tokens.ui.gold}30, inset 0 1px 0 rgba(255,255,255,0.22)`,
      transform: "translateY(-1px)",
    },
    "&:active": {
      background: `linear-gradient(180deg, #1F4F42 0%, #193E34 40%, #132E28 100%)`,
      boxShadow: `0 1px 3px rgba(0,0,0,0.4), inset 0 2px 4px rgba(0,0,0,0.2)`,
      borderTop: "1px solid rgba(180,230,210,0.12)",
      transform: "translateY(0px)",
    },
  },
  secondary: {
    background: `linear-gradient(180deg, ${tokens.ui.surfaceRaised} 0%, ${tokens.ui.surface} 100%)`,
    color: tokens.ui.text,
    border: `1px solid ${tokens.ui.borderMedium}`,
    borderTop: `1px solid rgba(255,255,255,0.4)`,
    borderBottom: `2px solid rgba(0,0,0,0.10)`,
    boxShadow: `0 2px 4px rgba(80,60,30,0.12), inset 0 1px 0 rgba(255,255,255,0.3)`,
    fontWeight: 600,
    "&:hover": {
      background: `linear-gradient(180deg, ${tokens.ui.surfaceHover} 0%, ${tokens.ui.surface} 100%)`,
      borderColor: `${tokens.ui.gold}55`,
      boxShadow: `0 3px 8px rgba(80,60,30,0.18), inset 0 1px 0 rgba(255,255,255,0.3)`,
      transform: "translateY(-1px)",
    },
    "&:active": {
      background: `linear-gradient(180deg, ${tokens.ui.surface} 0%, ${tokens.ui.surfaceHover} 100%)`,
      boxShadow: `inset 0 2px 4px rgba(0,0,0,0.08)`,
      transform: "translateY(0px)",
    },
  },
  danger: {
    background: `linear-gradient(180deg, #F06050 0%, ${tokens.ui.danger} 40%, #B83828 100%)`,
    color: "#FFF5F0",
    border: "none",
    borderTop: "1px solid rgba(255,180,160,0.35)",
    borderBottom: "2px solid #7A2018",
    boxShadow: `0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)`,
    fontWeight: 700,
    "&:hover": {
      background: `linear-gradient(180deg, #FF7060 0%, #F06050 40%, #C84838 100%)`,
      boxShadow: `0 3px 10px rgba(0,0,0,0.4), 0 0 10px ${tokens.ui.danger}30, inset 0 1px 0 rgba(255,255,255,0.2)`,
      transform: "translateY(-1px)",
    },
    "&:active": {
      background: `linear-gradient(180deg, #B83020 0%, #A02818 40%, #881C10 100%)`,
      boxShadow: `0 1px 3px rgba(0,0,0,0.4), inset 0 2px 4px rgba(0,0,0,0.2)`,
      transform: "translateY(0px)",
    },
  },
  ghost: {
    background: "transparent",
    color: tokens.ui.textMuted,
    border: `1px solid ${tokens.ui.border}`,
    borderBottom: `1px solid ${tokens.ui.borderMedium}`,
    boxShadow: "none",
    fontWeight: 600,
    "&:hover": {
      background: tokens.ui.surfaceHover,
      color: tokens.ui.text,
      borderColor: `${tokens.ui.gold}44`,
      boxShadow: `0 2px 4px rgba(80,60,30,0.10)`,
    },
    "&:active": {
      background: tokens.ui.surface,
      boxShadow: `inset 0 1px 3px rgba(0,0,0,0.08)`,
    },
  },
};

const InnerButton = forwardRef<HTMLButtonElement, GameButtonProps>(
  (
    {
      children,
      onClick,
      disabled,
      variant = "secondary",
      size = "md",
      icon,
      fullWidth,
      sx,
    },
    ref
  ) => {
    const { height, fontSize, px, letterSpacing } = sizeMap[size];
    const variantStyles = variantStyleMap[variant];

    return (
      <Button
        ref={ref}
        onClick={onClick}
        disabled={disabled}
        fullWidth={fullWidth}
        disableRipple
        sx={{
          height,
          fontSize,
          px,
          letterSpacing,
          borderRadius: `${tokens.radius.sm + 1}px`,
          textTransform: "none",
          fontFamily: tokens.font.body,
          transition: `all ${tokens.transition.fast}`,
          display: "inline-flex",
          alignItems: "center",
          gap: icon ? `${tokens.spacing.xs + 1}px` : 0,
          minWidth: 0,
          cursor: disabled ? "not-allowed" : "pointer",
          ...variantStyles,
          // Disabled state — faded plate
          "&.Mui-disabled": {
            opacity: 0.4,
            cursor: "not-allowed",
            color: "inherit",
            background: variantStyles.background,
            boxShadow: "none",
            transform: "none",
            borderTop: variantStyles.borderTop,
          },
          ...sx,
        }}
      >
        {icon}
        {children}
      </Button>
    );
  }
);

InnerButton.displayName = "GameButton";

export const GameButton = (props: GameButtonProps) => {
  if (props.disabled && props.disabledReason) {
    return (
      <Tooltip title={props.disabledReason} placement="top" arrow>
        {/* span wrapper needed because Tooltip requires a non-disabled child to attach listeners */}
        <span style={{ display: props.fullWidth ? "block" : "inline-block" }}>
          <InnerButton {...props} />
        </span>
      </Tooltip>
    );
  }
  return <InnerButton {...props} />;
};
