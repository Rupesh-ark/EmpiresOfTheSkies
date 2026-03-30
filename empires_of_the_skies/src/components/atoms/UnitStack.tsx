import { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { SxProps } from "@mui/material/styles";
import { GiChessKnight, GiChessPawn, GiAirBalloon, GiSwordWound } from "react-icons/gi";
import { tokens } from "@/theme";

export interface UnitStackProps {
  regiments?: number;
  levies?: number;
  skyships?: number;
  eliteRegiments?: number;
  colour?: string;
  size?: "sm" | "md" | "lg";
  direction?: "row" | "column";
  showZero?: boolean;
  showSwords?: boolean;
  sx?: SxProps;
}

const sizeMap = {
  sm: { iconPx: 16, fontSize: tokens.fontSize.xs },
  md: { iconPx: 22, fontSize: tokens.fontSize.sm },
  lg: { iconPx: 28, fontSize: tokens.fontSize.base },
};

interface UnitEntryProps {
  icon: ReactNode;
  count: number;
  iconPx: number;
  fontSize: number;
  iconColor: string;
}

const UnitEntry = ({ icon, count, iconPx, fontSize, iconColor }: UnitEntryProps) => (
  <Box sx={{ display: "inline-flex", alignItems: "center", gap: `${tokens.spacing.xs / 2}px` }}>
    <Box
      sx={{
        display: "inline-flex",
        "& svg": { fontSize: iconPx, color: iconColor },
      }}
    >
      {icon}
    </Box>
    <Typography
      component="span"
      sx={{
        fontSize,
        fontFamily: tokens.font.body,
        color: tokens.ui.text,
        lineHeight: 1,
      }}
    >
      {count}
    </Typography>
  </Box>
);

export const UnitStack = ({
  regiments,
  levies,
  skyships,
  eliteRegiments,
  colour,
  size = "md",
  direction = "row",
  showZero = false,
  showSwords = false,
  sx,
}: UnitStackProps) => {
  const { iconPx, fontSize } = sizeMap[size];
  const iconColor = colour ?? tokens.ui.text;
  const eliteColor = tokens.allegiance.orthodox;

  const shouldShow = (n: number | undefined): n is number =>
    n !== undefined && (showZero || n > 0);

  const swordTotal =
    (regiments ?? 0) * 2 +
    (levies ?? 0) * 1 +
    (eliteRegiments ?? 0) * 3 +
    (skyships ?? 0);

  return (
    <Box
      sx={{
        display: "inline-flex",
        flexDirection: direction,
        flexWrap: "wrap",
        alignItems: direction === "row" ? "center" : "flex-start",
        gap: `${tokens.spacing.sm}px`,
        ...sx,
      }}
    >
      {shouldShow(regiments) && (
        <UnitEntry
          icon={<GiChessKnight />}
          count={regiments}
          iconPx={iconPx}
          fontSize={fontSize}
          iconColor={iconColor}
        />
      )}

      {shouldShow(levies) && (
        <UnitEntry
          icon={<GiChessPawn />}
          count={levies}
          iconPx={iconPx}
          fontSize={fontSize}
          iconColor={iconColor}
        />
      )}

      {shouldShow(eliteRegiments) && (
        <UnitEntry
          icon={<GiChessKnight />}
          count={eliteRegiments}
          iconPx={iconPx}
          fontSize={fontSize}
          iconColor={eliteColor}
        />
      )}

      {shouldShow(skyships) && (
        <UnitEntry
          icon={<GiAirBalloon />}
          count={skyships}
          iconPx={iconPx}
          fontSize={fontSize}
          iconColor={iconColor}
        />
      )}

      {showSwords && (
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: `${tokens.spacing.xs / 2}px` }}>
          <Box sx={{ display: "inline-flex", "& svg": { fontSize: iconPx, color: tokens.ui.textMuted } }}>
            <GiSwordWound />
          </Box>
          <Typography
            component="span"
            sx={{
              fontSize,
              fontFamily: tokens.font.body,
              color: tokens.ui.textMuted,
              lineHeight: 1,
            }}
          >
            {swordTotal} Swords
          </Typography>
        </Box>
      )}
    </Box>
  );
};
