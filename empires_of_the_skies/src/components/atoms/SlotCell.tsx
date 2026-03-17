import { ReactNode } from "react";
import { Box, Tooltip } from "@mui/material";
import { SxProps } from "@mui/material/styles";
import { BiSolidCylinder } from "react-icons/bi";
import { tokens } from "@/theme";

export interface SlotCellProps {
  onClick?: () => void;
  occupant?: string;
  occupantColour?: string;
  disabled?: boolean;
  disabledReason?: string;
  backgroundImage?: string;
  width?: string | number;
  height?: string | number;
  children?: ReactNode;
  sx?: SxProps;
}

const SlotCellInner = ({
  onClick,
  occupant,
  occupantColour,
  disabled,
  backgroundImage,
  width = tokens.size.slotButton.width,
  height = tokens.size.slotButton.height,
  children,
  sx,
}: SlotCellProps) => {
  const isClickable = !!onClick && !disabled;
  const isEmpty = !occupant;

  return (
    <Box
      onClick={isClickable ? onClick : undefined}
      sx={{
        position: "relative",
        width,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: `${tokens.radius.sm}px`,
        border: isEmpty
          ? `1px dashed ${tokens.ui.borderMedium}`
          : `1px solid ${tokens.ui.border}`,
        background: backgroundImage
          ? `url(${backgroundImage}) center / cover no-repeat`
          : tokens.ui.surface,
        opacity: disabled ? 0.4 : 1,
        cursor: isClickable ? "pointer" : "default",
        transition: `all ${tokens.transition.fast}`,
        overflow: "hidden",
        ...(isClickable && {
          "&:hover": {
            border: `1px solid ${tokens.ui.borderFocus}`,
            transform: "scale(1.02)",
          },
        }),
        ...sx,
      }}
    >
      {occupant && occupantColour && (
        <BiSolidCylinder
          style={{
            color: occupantColour,
            fontSize: tokens.size.iconMd,
          }}
        />
      )}
      {children}
    </Box>
  );
};

export const SlotCell = (props: SlotCellProps) => {
  if (props.disabled && props.disabledReason) {
    return (
      <Tooltip title={props.disabledReason} placement="top" arrow>
        <span>
          <SlotCellInner {...props} />
        </span>
      </Tooltip>
    );
  }
  return <SlotCellInner {...props} />;
};
