import { createTheme } from "@mui/material/styles";

export const generalTheme = createTheme({
  typography: {
    fontFamily: "dauphinn",
    fontSize: 20,
    button: {
      textTransform: "none",
      border: "1px solid black",
      color: "#000000",
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
          fontSize: 18,
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
        textPrimary: "#000000",
      },
    },
    MuiTab: {
      styleOverrides: { root: { border: "0px" } },
    },
    MuiTableCell: {
      styleOverrides: { root: { fontSize: 18.5 } },
    },
  },
});

export const influencePrelatesTheme = createTheme({
  typography: {
    fontSize: 18,
    fontFamily: "dauphinn",

    button: {
      textTransform: "none",

      border: "1px solid black",
      width: "fit-content",
      justifyContent: "center",
    },
  },
});
