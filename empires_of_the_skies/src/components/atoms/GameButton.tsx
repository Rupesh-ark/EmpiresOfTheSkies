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
  sm: { height: 32, fontSize: tokens.fontSize.xs, px: `${tokens.spacing.sm}px` },
  md: { height: 40, fontSize: tokens.fontSize.sm, px: `${tokens.spacing.md}px` },
  lg: { height: 48, fontSize: tokens.fontSize.base, px: `${tokens.spacing.lg}px` },
};

const variantStyleMap = {
  primary: {
    backgroundColor: tokens.ui.gold,
    color: tokens.ui.background,
    border: "none",
    "&:hover": { backgroundColor: "#e0c27a" },
    "&:active": { backgroundColor: "#c4a055" },
  },
  secondary: {
    backgroundColor: tokens.ui.surfaceRaised,
    color: tokens.ui.text,
    border: `1px solid ${tokens.ui.borderMedium}`,
    "&:hover": { backgroundColor: tokens.ui.surfaceHover },
    "&:active": { backgroundColor: tokens.ui.surface },
  },
  danger: {
    backgroundColor: tokens.ui.danger,
    color: tokens.ui.textBright,
    border: "none",
    "&:hover": { backgroundColor: "#f87171" },
    "&:active": { backgroundColor: "#dc2626" },
  },
  ghost: {
    backgroundColor: "transparent",
    color: tokens.ui.text,
    border: `1px solid ${tokens.ui.border}`,
    "&:hover": { backgroundColor: tokens.ui.surfaceHover },
    "&:active": { backgroundColor: tokens.ui.surface },
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
    const { height, fontSize, px } = sizeMap[size];
    const variantStyles = variantStyleMap[variant];

    return (
      <Button
        ref={ref}
        onClick={onClick}
        disabled={disabled}
        fullWidth={fullWidth}
        disableRipple={false}
        sx={{
          height,
          fontSize,
          px,
          borderRadius: `${tokens.radius.md}px`,
          textTransform: "none",
          fontFamily: tokens.font.body,
          transition: `all ${tokens.transition.fast}`,
          display: "inline-flex",
          alignItems: "center",
          gap: icon ? `${tokens.spacing.xs}px` : 0,
          minWidth: 0,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          ...variantStyles,
          // MUI overrides disabled styles — reapply manually
          "&.Mui-disabled": {
            opacity: 0.5,
            cursor: "not-allowed",
            color: "inherit",
            backgroundColor: variantStyles.backgroundColor,
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
