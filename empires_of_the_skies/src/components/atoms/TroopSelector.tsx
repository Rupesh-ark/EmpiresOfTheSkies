import { ReactNode } from "react";
import { Box, Slider, Typography } from "@mui/material";
import { SxProps } from "@mui/material/styles";
import { tokens } from "@/theme";

export interface TroopSelectorProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
  icon?: ReactNode;
  colour?: string;
  disabled?: boolean;
  showSwords?: boolean;
  swordsPerUnit?: number;
  sx?: SxProps;
}

export const TroopSelector = ({
  label,
  value,
  onChange,
  min = 0,
  max,
  icon,
  colour,
  disabled = false,
  showSwords = false,
  swordsPerUnit = 1,
  sx,
}: TroopSelectorProps) => {
  const sliderColor = colour ?? tokens.ui.gold;
  const swordValue = value * swordsPerUnit;

  return (
    <Box
      sx={{
        background: tokens.ui.surface,
        borderRadius: `${tokens.radius.md}px`,
        border: `1px solid ${tokens.ui.border}`,
        padding: `${tokens.spacing.sm}px`,
        opacity: disabled ? 0.5 : 1,
        ...sx,
      }}
    >
      {/* Label row */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: `${tokens.spacing.xs}px`,
          mb: `${tokens.spacing.xs}px`,
        }}
      >
        {icon && (
          <Box
            sx={{
              display: "inline-flex",
              "& svg": { fontSize: 18, color: sliderColor },
            }}
          >
            {icon}
          </Box>
        )}
        <Typography
          component="span"
          sx={{
            fontFamily: tokens.font.body,
            fontSize: tokens.fontSize.sm,
            color: tokens.ui.text,
            flex: 1,
            lineHeight: 1,
          }}
        >
          {label}
        </Typography>
        <Typography
          component="span"
          sx={{
            fontFamily: tokens.font.body,
            fontSize: tokens.fontSize.sm,
            color: tokens.ui.textMuted,
            lineHeight: 1,
          }}
        >
          {value} / {max}
        </Typography>
      </Box>

      {/* Slider */}
      <Slider
        value={value}
        onChange={(_, v) => onChange(v as number)}
        min={min}
        max={max}
        step={1}
        marks
        valueLabelDisplay="auto"
        disabled={disabled || max === 0}
        sx={{
          color: sliderColor,
          "& .MuiSlider-thumb": {
            width: 14,
            height: 14,
          },
          "& .MuiSlider-mark": {
            backgroundColor: tokens.ui.borderMedium,
          },
          "& .MuiSlider-markActive": {
            backgroundColor: sliderColor,
          },
          py: `${tokens.spacing.xs}px`,
        }}
      />

      {/* Sword calculation */}
      {showSwords && swordsPerUnit > 0 && (
        <Typography
          sx={{
            fontFamily: tokens.font.body,
            fontSize: tokens.fontSize.xs,
            color: tokens.ui.textMuted,
            mt: `${tokens.spacing.xs / 2}px`,
            lineHeight: 1,
          }}
        >
          ({value} × {swordsPerUnit}) = {swordValue} Sword{swordValue !== 1 ? "s" : ""}
        </Typography>
      )}
    </Box>
  );
};
