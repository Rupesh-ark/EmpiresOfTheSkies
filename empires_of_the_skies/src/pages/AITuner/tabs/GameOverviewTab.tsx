import { Box, Paper, Typography } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import { tokens } from "../../../theme/tokens";
import type { GameRecord } from "@eots/game";
import {
  PLAYER_COLORS,
  getVPProgression,
  getEconomyCurves,
  getBuildingCurves,
  getMilitaryCurves,
} from "../aiTunerHelpers";

interface GameOverviewTabProps {
  gameRecord: GameRecord;
  selectedPlayer: string;
}

export default function GameOverviewTab({ gameRecord, selectedPlayer }: GameOverviewTabProps) {
  const vpProgressionData = getVPProgression(gameRecord);
  const economyCurveData = getEconomyCurves(gameRecord, selectedPlayer);
  const buildingCurveData = getBuildingCurves(gameRecord, selectedPlayer);
  const militaryCurveData = getMilitaryCurves(gameRecord, selectedPlayer);

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          VP Progression
        </Typography>
        {vpProgressionData.rounds.length > 0 ? (
          <LineChart
            xAxis={[{ data: vpProgressionData.rounds, label: "Round" }]}
            series={vpProgressionData.series}
            height={300}
            colors={PLAYER_COLORS}
          />
        ) : (
          <Typography color="textSecondary">No data</Typography>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Economy
          {selectedPlayer !== "all" ? ` (P${selectedPlayer})` : " (P0)"}
        </Typography>
        {economyCurveData.rounds.length > 0 ? (
          <LineChart
            xAxis={[{ data: economyCurveData.rounds, label: "Round" }]}
            series={economyCurveData.series}
            height={300}
            colors={[tokens.ui.gold, tokens.ui.success, tokens.ui.info]}
          />
        ) : (
          <Typography color="textSecondary">No data</Typography>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Territory & Buildings
          {selectedPlayer !== "all" ? ` (P${selectedPlayer})` : " (P0)"}
        </Typography>
        {buildingCurveData.rounds.length > 0 ? (
          <LineChart
            xAxis={[{ data: buildingCurveData.rounds, label: "Round" }]}
            series={buildingCurveData.series}
            height={300}
            colors={["#5B8ECC", "#27AE60", "#E67E22", "#8E44AD", "#C0392B"]}
          />
        ) : (
          <Typography color="textSecondary">No data</Typography>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Military & Heresy
          {selectedPlayer !== "all" ? ` (P${selectedPlayer})` : " (P0)"}
        </Typography>
        {militaryCurveData.rounds.length > 0 ? (
          <LineChart
            xAxis={[{ data: militaryCurveData.rounds, label: "Round" }]}
            series={militaryCurveData.series}
            height={300}
            colors={[tokens.ui.danger, tokens.ui.warning, tokens.ui.info, "#7B68A0"]}
          />
        ) : (
          <Typography color="textSecondary">No data</Typography>
        )}
      </Paper>
    </Box>
  );
}
