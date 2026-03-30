/**
 * Placeholder for now — will support:
 * - Config A vs Config B comparison
 * - Run N games with progress bar
 * - Win rate charts, personality breakdown
 * - Card combo heatmap
 */
import { Box, Typography, Paper, Button } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import HomeIcon from "@mui/icons-material/Home";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

import { baseTheme } from "../theme/baseTheme";
import { tokens } from "../theme/tokens";

export default function AITournamentPage() {
  const navigate = useNavigate();

  return (
    <ThemeProvider theme={baseTheme}>
      <Box
        sx={{
          height: "100vh",
          bgcolor: "background.default",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tooltip title="Back to home">
            <IconButton onClick={() => navigate("/")}>
              <HomeIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="h4" sx={{ fontFamily: tokens.font.display }}>
            Tournament Lab
          </Typography>
        </Box>

        <Paper sx={{ p: 4, textAlign: "center", maxWidth: 500 }}>
          <Typography variant="body1" gutterBottom>
            Coming after Single Bot Tuner is complete.
          </Typography>
          <Typography variant="body2" sx={{ color: tokens.ui.textMuted, mb: 2 }}>
            This page will run N-game tournaments, compare weight configs A vs B,
            show win rates by personality, and visualize card combo balance.
          </Typography>
          <Button variant="outlined" onClick={() => navigate("/ai-tuner")}>
            Go to Single Bot Tuner
          </Button>
        </Paper>
      </Box>
    </ThemeProvider>
  );
}
