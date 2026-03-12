import { createTheme } from "@mui/material/styles";
import { colors, fonts, sizes } from "../designTokens";

const tooltipStyle = {
  whiteSpace: "pre-line" as const,
  fontFamily: fonts.system,
  fontSize: sizes.fontSize.small,
  lineHeight: 1.35,
  maxWidth: 280,
  padding: "8px 12px",
  borderRadius: "8px",
  backgroundColor: "rgba(18, 18, 18, 0.95)",
  color: colors.white,
  border: "1px solid rgba(255,255,255,0.2)",
  boxShadow: "0 8px 20px rgba(0, 0, 0, 0.35)",
};

export const generalTheme = createTheme({
  typography: {
    fontFamily: fonts.primary,
    fontSize: sizes.fontSize.base,
    button: {
      textTransform: "none",
      border: `1px solid ${colors.black}`,
      color: colors.black,
      textOverflow: "ellipsis",
      width: "fit-content",
      whiteSpace: "pre",
      justifyContent: "flex-start",
      overflow: "auto",
    },
  },
  components: {
    MuiTooltip: {
      defaultProps: {
        arrow: true,
      },
      styleOverrides: {
        tooltip: tooltipStyle,
        arrow: {
          color: "rgba(18, 18, 18, 0.95)",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          whiteSpace: "pre",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        textPrimary: colors.black,
      },
    },
    MuiTab: {
      styleOverrides: { root: { border: "0px" } },
    },
    MuiTableCell: {
      styleOverrides: { root: { fontSize: sizes.fontSize.tableCell } },
    },
  },
});

export const influencePrelatesTheme = createTheme({
  typography: {
    fontSize: sizes.fontSize.small,
    fontFamily: fonts.primary,
    button: {
      textTransform: "none",
      border: `1px solid ${colors.black}`,
      width: "fit-content",
      justifyContent: "center",
    },
  },
  components: {
    MuiTooltip: {
      defaultProps: {
        arrow: true,
      },
      styleOverrides: {
        tooltip: tooltipStyle,
        arrow: {
          color: "rgba(18, 18, 18, 0.95)",
        },
      },
    },
  },
});
