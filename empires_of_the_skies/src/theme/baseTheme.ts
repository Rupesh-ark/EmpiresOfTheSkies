import { createTheme } from "@mui/material/styles";
import { tokens } from "./tokens";

export const baseTheme = createTheme({
  palette: {
    mode: "light",
    background: {
      default: tokens.ui.background,
      paper:   tokens.ui.surface,
    },
    text: {
      primary:   tokens.ui.text,
      secondary: tokens.ui.textMuted,
    },
    primary: {
      main: tokens.ui.gold,
    },
    error: {
      main: tokens.ui.danger,
    },
    warning: {
      main: tokens.ui.warning,
    },
    success: {
      main: tokens.ui.success,
    },
    info: {
      main: tokens.ui.info,
    },
  },

  typography: {
    fontFamily: tokens.font.body,
    fontSize:   tokens.fontSize.base,
    h1: { fontFamily: tokens.font.display },
    h2: { fontFamily: tokens.font.display },
    h3: { fontFamily: tokens.font.display },
    h4: { fontFamily: tokens.font.display },
    h5: { fontFamily: tokens.font.display },
    h6: { fontFamily: tokens.font.display },
    button: {
      textTransform: "none",
      border:        `1px solid ${tokens.ui.black}`,
      color:         tokens.ui.black,
      textOverflow:  "ellipsis",
      width:         "fit-content",
      whiteSpace:    "pre",
      justifyContent: "flex-start",
      overflow:       "auto",
    },
  },

  shape: {
    borderRadius: tokens.radius.md,
  },

  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          color:  tokens.ui.text,
          border: `1px solid ${tokens.ui.border}`,
        },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: tokens.ui.surfaceRaised,
          border:          `1px solid ${tokens.ui.borderMedium}`,
        },
      },
    },

    MuiTooltip: {
      defaultProps: {
        arrow: true,
      },
      styleOverrides: {
        tooltip: {
          whiteSpace:      "pre-line",
          fontFamily:      tokens.font.body,
          fontSize:        tokens.fontSize.tooltip,
          lineHeight:      1.35,
          maxWidth:        280,
          padding:         "8px 12px",
          borderRadius:    tokens.radius.md,
          backgroundColor: tokens.ui.surfaceRaised,
          color:           tokens.ui.text,
          border:          `1px solid ${tokens.ui.borderMedium}`,
          boxShadow:       tokens.shadow.lg,
        },
        arrow: {
          color: tokens.ui.surfaceRaised,
        },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          border: "0px",
          color:  tokens.ui.textMuted,
          "&.Mui-selected": {
            color: tokens.ui.text,
          },
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: tokens.fontSize.md,
          border:   `1px solid ${tokens.ui.border}`,
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: tokens.ui.surface,
        },
      },
    },

    MuiSlider: {
      styleOverrides: {
        root: {
          color: tokens.ui.gold,
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: tokens.ui.surfaceHover,
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
  },
});
