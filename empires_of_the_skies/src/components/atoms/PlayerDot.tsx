import { Box, Tooltip, Typography } from "@mui/material";
import { SxProps } from "@mui/material/styles";
import { tokens } from "@/theme";

export interface PlayerDotProps {
  colour: string;
  initial?: string;
  size?: "sm" | "md" | "lg";
  tooltip?: string;
  active?: boolean;
  sx?: SxProps;
}

const sizeMap = {
  sm: { diameter: 16, fontSize: tokens.fontSize.xs },
  md: { diameter: 24, fontSize: tokens.fontSize.sm },
  lg: { diameter: 32, fontSize: tokens.fontSize.base },
};

const DotInner = ({ colour, initial, size = "md", active = false, sx }: PlayerDotProps) => {
  const { diameter, fontSize } = sizeMap[size];

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: diameter,
        height: diameter,
        borderRadius: "50%",
        backgroundColor: colour,
        flexShrink: 0,
        boxShadow: active
          ? `0 0 0 2px ${colour}, 0 0 0 4px ${tokens.ui.background}`
          : "none",
        ...sx,
      }}
    >
      {initial && (
        <Typography
          component="span"
          sx={{
            fontFamily: tokens.font.accent,
            fontSize,
            color: tokens.ui.textBright,
            lineHeight: 1,
            userSelect: "none",
            // Darken text for light-colored kingdoms (e.g. nordmark yellow, ostreich cream)
            textShadow: "0 1px 2px rgba(0,0,0,0.6)",
          }}
        >
          {initial}
        </Typography>
      )}
    </Box>
  );
};

export const PlayerDot = (props: PlayerDotProps) => {
  if (props.tooltip) {
    return (
      <Tooltip title={props.tooltip} placement="top" arrow>
        {/* span wrapper needed because Tooltip requires a focusable/hoverable child */}
        <span style={{ display: "inline-flex" }}>
          <DotInner {...props} />
        </span>
      </Tooltip>
    );
  }
  return <DotInner {...props} />;
};
