import { createTheme } from "@mui/material/styles";
import { colors, fonts, sizes } from "../designTokens";

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
      styleOverrides: {
        tooltip: {
          whiteSpace: "pre",
          fontSize: sizes.fontSize.tooltip,
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
});
