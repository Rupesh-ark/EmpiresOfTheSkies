import { useState } from "react";
import { Box, Tabs, Tab, Typography } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { baseTheme } from "../../theme/baseTheme";
import { tokens } from "../../theme/tokens";
import type { GameRecord } from "@eots/game";
import AITunerSidebar from "./AITunerSidebar";
import GameOverviewTab from "./tabs/GameOverviewTab";
import DecisionsTab from "./tabs/DecisionsTab";
import HeuristicsTab from "./tabs/HeuristicsTab";
import MCTSPatternsTab from "./tabs/MCTSPatternsTab";

export default function AITunerPage() {
  const [gameRecord, setGameRecord] = useState<GameRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("all");
  const [resultTab, setResultTab] = useState(0);

  const loadRecord = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const record = JSON.parse(e.target?.result as string) as GameRecord;
        setGameRecord(record);
        setError(null);
        if (record.result) setSelectedPlayer(record.result.winner);
      } catch {
        setError("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  const exportRecord = () => {
    if (!gameRecord) return;
    const blob = new Blob([JSON.stringify(gameRecord, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${gameRecord.gameId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ThemeProvider theme={baseTheme}>
      <Box sx={{ display: "flex", height: "100vh", bgcolor: "background.default" }}>
        <AITunerSidebar
          gameRecord={gameRecord}
          error={error}
          selectedPlayer={selectedPlayer}
          onPlayerChange={setSelectedPlayer}
          onLoadRecord={loadRecord}
          onExportRecord={exportRecord}
        />

        <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
          {!gameRecord ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: tokens.ui.textMuted,
              }}
            >
              <Typography variant="h5" sx={{ fontFamily: tokens.font.display }}>
                Import a game_record.json to start analyzing
              </Typography>
            </Box>
          ) : (
            <>
              <Tabs value={resultTab} onChange={(_, v) => setResultTab(v)} sx={{ mb: 2 }}>
                <Tab label="Game Overview" />
                <Tab label="Decisions" />
                <Tab label="Heuristics" />
                <Tab label="MCTS & Patterns" />
              </Tabs>

              {resultTab === 0 && (
                <GameOverviewTab gameRecord={gameRecord} selectedPlayer={selectedPlayer} />
              )}
              {resultTab === 1 && (
                <DecisionsTab
                  gameRecord={gameRecord}
                  selectedPlayer={selectedPlayer}
                  onPlayerChange={setSelectedPlayer}
                />
              )}
              {resultTab === 2 && (
                <HeuristicsTab gameRecord={gameRecord} selectedPlayer={selectedPlayer} />
              )}
              {resultTab === 3 && (
                <MCTSPatternsTab gameRecord={gameRecord} selectedPlayer={selectedPlayer} />
              )}
            </>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
